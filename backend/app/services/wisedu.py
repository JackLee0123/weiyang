"""金智教育（Wisedu）jwapp 教务系统适配器。

登录走「统一身份认证平台」（CAS），密码用 AES-CBC 加密；验证码与登录均位于认证服务器
（默认 https://authserver.xjzfu.edu.cn）。仅做一次性登录与课表抓取，不保存任何学校账号密码。
可通过环境变量覆盖：
  WISEDU_BASE_URL        课表站点根地址（默认 https://jwxt.xjzfu.edu.cn）
  WISEDU_AUTH_URL        统一身份认证服务器（默认 https://authserver.xjzfu.edu.cn）
  WISEDU_CAPTCHA_PATH    验证码地址（默认 /authserver/getCaptcha.htl）
  WISEDU_LOGIN_PATH      登录地址（默认 /authserver/login）
  WISEDU_TIMETABLE_PATH  课表接口（默认 /jwapp/sys/homeapp/api/home/student/getMyScheduleDetail.do）
  WISEDU_PROXY           显式代理（默认空：直连；教务系统只在校园网内可达）
"""

from __future__ import annotations

import base64
import os
import random
import re
import time
import uuid
from typing import Optional
from urllib.parse import quote_plus, urlparse

import httpx
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

from .timetable import infer_term


class WiseduError(Exception):
    pass


def _env(name: str, default: str) -> str:
    value = os.environ.get(name, "").strip()
    return value or default


def _normalize_origin(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme and parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}"
    return url.rstrip("/")


def _connect_error_message(exc: httpx.HTTPError, host: str, action: str) -> str:
    """把底层网络异常翻译成用户能据以排查的提示。"""
    if isinstance(exc, httpx.TimeoutException):
        return f"{action}超时（{host}），请确认已连接校园网"
    reason = " ".join(str(exc).split())[:140]
    lowered = reason.lower()
    if isinstance(exc, httpx.ConnectError) and any(
        kw in lowered for kw in ("getaddrinfo", "name or service not known", "nodename nor servname", "no address associated")
    ):
        return f"无法解析学校服务器地址（{host}），请检查网址是否正确、是否已连上校园网"
    if "ssl" in lowered or "certificate" in lowered or "tls" in lowered:
        return f"与学校服务器（{host}）的安全连接失败，请稍后重试或改用「文件导入」"
    return f"{action}失败（{host}）：{reason}"


def _build_client() -> httpx.Client:
    """构造访问教务/认证系统的 HTTP 客户端。

    这些站点通常只在校园网内可达，必须直连。httpx 默认（trust_env=True）会读取系统代理：
    在 Windows 上 urllib 会回退到注册表里的 IE 代理，于是本机一旦开着 Clash / 加速器 /
    VPN 之类的全局代理，请求就会被转发到代理服务器上，从而报
    「SSL: UNEXPECTED_EOF_WHILE_READING」这类连接错误。
    因此这里固定直连，只有显式配置 WISEDU_PROXY 时才走代理。
    """
    proxy = _env("WISEDU_PROXY", "")
    kwargs: dict = {
        "timeout": 20,
        "follow_redirects": True,
        # 学校自签证书较常见，这里不校验证书链，避免直接连不上。
        "verify": False,
        "trust_env": False,
    }
    if proxy:
        kwargs["proxy"] = proxy
    return httpx.Client(**kwargs)


# 与教务前端一致：登录密码先用 64 位随机前缀拼接，再以 pwdEncryptSalt 作 AES 密钥 CBC 加密。
AES_CHARS = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678"


def _random_string(n: int) -> str:
    return "".join(random.choice(AES_CHARS) for _ in range(n))


def aes_encrypt_password(password: str, salt: str) -> str:
    """复刻教务前端 encryptPassword：AES-128-CBC/PKCS7，输出 base64。"""
    key = salt.encode("utf-8")
    iv = _random_string(16).encode("utf-8")
    plaintext = (_random_string(64) + password).encode("utf-8")
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return base64.b64encode(cipher.encrypt(pad(plaintext, AES.block_size))).decode("ascii")


def _extract_hidden(html: str, name: str) -> str:
    m = re.search(
        r'<input[^>]*id=["\']' + re.escape(name) + r'["\'][^>]*value=["\']([^"\']*)["\']',
        html,
    )
    if not m:
        m = re.search(r'<input[^>]*name=["\']' + re.escape(name) + r'["\'][^>]*value=["\']([^"\']*)["\']', html)
    return m.group(1) if m else ""


def _extract_login_error(html: str) -> Optional[str]:
    m = re.search(r'id=["\']showErrorTip["\'][^>]*>(.*?)</(?:span|div)>', html, re.S)
    if m:
        tip = re.sub(r"<[^>]+>", "", m.group(1)).strip()
        if tip:
            return tip
    # 退而求其次：在整页里找常见错误文案，尽量把服务端真实原因展示给用户
    for kw in (
        "您提供的用户名或者密码有误",
        "用户名或密码",
        "密码有误",
        "验证码错误",
        "验证码",
        "账号已锁定",
        "锁定",
        "操作频繁",
        "稍后再试",
        "已停用",
        "不存在",
    ):
        idx = html.find(kw)
        if idx >= 0:
            seg = re.sub(r"<[^>]+>", "", html[max(0, idx - 40) : idx + 60]).strip()
            return seg[:120]
    return None


class WiseduAdapter:
    def __init__(self, base_url: Optional[str] = None) -> None:
        self.base_url = _normalize_origin(base_url) if base_url else _env("WISEDU_BASE_URL", "https://jwxt.xjzfu.edu.cn").rstrip("/")
        self.auth_url = _env("WISEDU_AUTH_URL", "https://authserver.xjzfu.edu.cn").rstrip("/")
        self.captcha_path = _env("WISEDU_CAPTCHA_PATH", "/authserver/getCaptcha.htl")
        self.login_path = _env("WISEDU_LOGIN_PATH", "/authserver/login")
        self.timetable_path = _env(
            "WISEDU_TIMETABLE_PATH",
            "/jwapp/sys/homeapp/api/home/student/getMyScheduleDetail.do",
        )
        self.init_path = _env("WISEDU_INIT_PATH", "/jwapp/sys/homeapp/api/home/config/global.do")
        self.xnxq_path = _env("WISEDU_XNXQ_PATH", "/jwapp/sys/homeapp/api/home/kb/xnxq.do")
        self.service = self.base_url + "/jwapp/sys/homeapp/home/index.html"
        self._client = _build_client()
        self._execution = ""
        self._lt = ""
        self._pwd_salt = ""

    def open_session(self) -> None:
        """访问统一身份认证登录页，建立会话并解析隐藏字段。"""
        try:
            url = self.auth_url + self.login_path + "?service=" + quote_plus(self.service)
            resp = self._client.get(url)
        except httpx.HTTPError as exc:
            raise WiseduError(_connect_error_message(exc, urlparse(self.auth_url).netloc, "连接学校认证服务器")) from exc
        if resp.status_code != 200:
            raise WiseduError(f"学校认证服务器返回异常（HTTP {resp.status_code}），请稍后重试")
        self._execution = _extract_hidden(resp.text, "execution") or "e1s1"
        self._lt = _extract_hidden(resp.text, "lt")
        self._pwd_salt = _extract_hidden(resp.text, "pwdEncryptSalt")

    def get_captcha(self) -> tuple[str, str]:
        self.open_session()
        token = uuid.uuid4().hex
        image_bytes = b""
        reason = ""
        try:
            ts = int(time.time() * 1000)
            resp = self._client.get(self.auth_url + self.captcha_path + "?" + str(ts))
            if resp.status_code == 200 and resp.headers.get("content-type", "").startswith("image"):
                image_bytes = resp.content
            else:
                reason = f"验证码接口返回 HTTP {resp.status_code}"
        except httpx.HTTPError as exc:
            reason = _connect_error_message(exc, urlparse(self.auth_url).netloc, "获取登录验证码")
        if not image_bytes:
            raise WiseduError(f"{reason or '无法获取登录验证码'}，可稍后重试或改用「文件导入」")
        _CAPTCHA_SESSIONS[token] = {
            "cookies": dict(self._client.cookies),
            "expires": time.time() + 600,
            "base_url": self.base_url,
            "execution": self._execution,
            "lt": self._lt,
            "pwd_salt": self._pwd_salt,
        }
        return token, base64.b64encode(image_bytes).decode("ascii")

    def login(self, username: str, password: str, captcha_code: Optional[str] = None) -> None:
        if not self._pwd_salt:
            self.open_session()
        need_captcha = self.need_captcha(username)
        form = {
            "username": username,
            "password": aes_encrypt_password(password, self._pwd_salt),
            "execution": self._execution,
            "_eventId": "submit",
            "dllt": "generalLogin",
            "cllt": "userNameLogin",
            "lt": self._lt,
            "rememberMe": "true",
        }
        if need_captcha:
            if not captcha_code:
                raise WiseduError("当前需要输入验证码，请填写后再试")
            form["captcha"] = captcha_code
        try:
            url = self.auth_url + self.login_path + "?service=" + quote_plus(self.service)
            resp = self._client.post(url, data=form)
        except httpx.HTTPError as exc:
            raise WiseduError(_connect_error_message(exc, urlparse(self.auth_url).netloc, "提交登录请求")) from exc
        final_host = urlparse(str(resp.url)).netloc
        auth_host = urlparse(self.auth_url).netloc
        if final_host == auth_host:
            msg = _extract_login_error(resp.text)
            raise WiseduError(msg or "登录失败，请检查学号、密码与验证码")

    def need_captcha(self, username: str) -> bool:
        """查询该账号本次登录是否需要输入图形验证码。"""
        try:
            resp = self._client.post(
                self.auth_url + "/authserver/checkNeedCaptcha.htl",
                data={"username": username},
            )
            return bool(resp.json().get("isNeed"))
        except Exception:
            return False

    def get_current_term(self) -> str:
        """从学期接口取当前（selected）学年学期编码。"""
        try:
            resp = self._client.post(self.base_url + self.xnxq_path)
            datas = resp.json().get("datas") or []
            for item in datas:
                if item.get("selected"):
                    return item.get("itemCode") or infer_term()
            if datas:
                return datas[0].get("itemCode") or infer_term()
        except Exception:
            pass
        return infer_term()

    def fetch_timetable(self, term: Optional[str] = None) -> tuple[list[dict], str]:
        if not term:
            term = self.get_current_term()
        # 消费登录票据并建立应用会话，否则课表接口会要求重新登录
        try:
            self._client.post(self.base_url + self.init_path, timeout=15)
        except httpx.HTTPError:
            pass
        try:
            resp = self._client.post(self.base_url + self.timetable_path, data={"termCode": term})
        except httpx.HTTPError as exc:
            raise WiseduError(_connect_error_message(exc, urlparse(self.base_url).netloc, "拉取课表")) from exc
        try:
            payload = resp.json()
        except ValueError as exc:
            raise WiseduError("课表接口返回异常，可能登录已失效") from exc
        datas = payload.get("datas") or {}
        rows = datas.get("arrangedList") or datas.get("rows") or []
        if not rows:
            raise WiseduError("未获取到课表数据，请确认已登录并选择正确的学年学期")
        return rows, term

    def close(self) -> None:
        self._client.close()


_CAPTCHA_SESSIONS: dict[str, dict] = {}


def _prune_sessions() -> None:
    now = time.time()
    for token in list(_CAPTCHA_SESSIONS):
        if _CAPTCHA_SESSIONS[token]["expires"] < now:
            _CAPTCHA_SESSIONS.pop(token, None)


def create_captcha(base_url: Optional[str] = None) -> tuple[str, str]:
    _prune_sessions()
    adapter = WiseduAdapter(base_url)
    try:
        return adapter.get_captcha()
    finally:
        adapter.close()


def fetch_timetable_with_login(
    username: str,
    password: str,
    captcha_token: str,
    captcha_code: str,
    term: Optional[str] = None,
    base_url: Optional[str] = None,
) -> tuple[list[dict], str]:
    _prune_sessions()
    session = _CAPTCHA_SESSIONS.get(captcha_token)
    if not session or session["expires"] < time.time():
        raise WiseduError("登录会话已过期，请重新获取验证码")
    requested_origin = _normalize_origin(base_url) if base_url else None
    if requested_origin and requested_origin != session["base_url"]:
        raise WiseduError("学校网址与验证码不匹配，请重新获取验证码")
    adapter = WiseduAdapter(session["base_url"])
    adapter._client.cookies.update(session["cookies"])
    adapter._execution = session.get("execution", "")
    adapter._lt = session.get("lt", "")
    adapter._pwd_salt = session.get("pwd_salt", "")
    try:
        adapter.login(username, password, captcha_code)
        return adapter.fetch_timetable(term)
    finally:
        adapter.close()
        _CAPTCHA_SESSIONS.pop(captcha_token, None)
