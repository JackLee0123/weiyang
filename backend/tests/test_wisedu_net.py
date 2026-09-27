"""教务系统抓取的网络层回归测试。

背景：httpx 默认会走系统代理（Windows 上取自注册表的 IE 代理），一旦本机开着
Clash / 加速器之类的全局代理，访问只在校园网内可达的教务系统就会失败，
前端看到的提示是「无法连接学校认证服务器，请检查网址与网络」。
这里锁定行为：教务系统请求必须直连，只有显式配置 WISEDU_PROXY 时才走代理。
"""

from __future__ import annotations

import httpx
import pytest

from app.services import wisedu as w

FAKE_SYSTEM_PROXY = {"http": "http://127.0.0.1:10090", "https": "http://127.0.0.1:10090", "no": ""}


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    for name in ("WISEDU_PROXY", "WISEDU_BASE_URL", "WISEDU_AUTH_URL"):
        monkeypatch.delenv(name, raising=False)


def test_client_bypasses_system_proxy(monkeypatch):
    # httpx 通过 urllib.request.getproxies 读取系统代理，这里模拟“本机开着全局代理”。
    monkeypatch.setattr("httpx._utils.getproxies", lambda: dict(FAKE_SYSTEM_PROXY))
    adapter = w.WiseduAdapter()
    try:
        assert adapter._client.trust_env is False
        # 没有创建任何代理挂载，请求会直连学校服务器
        assert adapter._client._mounts == {}
    finally:
        adapter.close()


def test_explicit_proxy_is_opt_in(monkeypatch):
    monkeypatch.setenv("WISEDU_PROXY", "http://127.0.0.1:10090")
    adapter = w.WiseduAdapter()
    try:
        assert len(adapter._client._mounts) == 1
    finally:
        adapter.close()


def test_connect_error_messages_are_actionable():
    host = "authserver.xjzfu.edu.cn"

    timeout = w._connect_error_message(httpx.ConnectTimeout("timed out"), host, "连接学校认证服务器")
    assert "超时" in timeout and "校园网" in timeout

    dns = w._connect_error_message(
        httpx.ConnectError("[Errno 11001] getaddrinfo failed"), host, "连接学校认证服务器"
    )
    assert "无法解析" in dns and host in dns

    tls = w._connect_error_message(
        httpx.ConnectError("[SSL: UNEXPECTED_EOF_WHILE_READING] EOF occurred in violation of protocol"),
        host,
        "连接学校认证服务器",
    )
    assert "安全连接失败" in tls

    other = w._connect_error_message(httpx.ConnectError("connection refused"), host, "拉取课表")
    assert other.startswith("拉取课表失败") and host in other
