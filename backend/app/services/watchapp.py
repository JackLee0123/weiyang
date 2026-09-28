"""按用户打包手环快应用（离线快照版）。

小米手环 10 的快应用拿不到联网能力（官方支持表里 ``system.fetch`` /
``system.network`` 一律「不支持」），所以课表要随安装包带进去。这里把打包搬到
服务端：登录用户在「设备连接」里点一下，就用他自己的课表生成一个 rpk 下载。

打包过程：

1. 把 ``watchapp/`` 源码复制到 ``watchapp/.build/`` 下的临时目录
   （放在源码树里，Node 会自然向上找到共享的 ``node_modules``，不用软链接）；
2. 用当前账号的课表覆盖 ``src/common/data/sync.js``；
3. 调 ``aiot build`` 出包；
4. 返回 rpk 的临时路径，响应发完后由调用方整体删除该目录。

签名用 ``watchapp/sign/debug`` 下固定的密钥，保证多次打包、以及本机打包与
服务端打包出来的包是同一个应用身份（否则手环会当成两个应用）。
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import threading
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from .. import repository, schemas
from ..config import settings
from ..models import User
from . import timetable as timetable_service

# aiot build 吃 CPU，单机同时只跑一个更稳。
_build_lock = threading.Lock()

# 复制源码时跳过的东西：依赖/产物/签名/本地缓存都不该进临时项目。
_COPY_IGNORE = shutil.ignore_patterns(
    "node_modules",
    "dist",
    "build",
    ".build",
    ".temp_*",
    "sign",
    "*.log",
    ".sync-token.json",
    ".vscode",
)

_SYNC_BANNER = (
    "/**\n"
    " * 本文件由服务端打包时生成，请勿手改。\n"
    " *\n"
    " * 小米手环 10 的快应用不支持联网（官方支持表：system.fetch / system.request /\n"
    " * system.network 一律「不支持」），所以课表和学期设置在打包前拉取一次，\n"
    " * 作为静态数据随安装包带进手环。\n"
    " */\n"
)


class WatchAppBuildError(RuntimeError):
    """打包失败。message 会直接展示给用户。"""


def source_dir() -> Path:
    """watchapp 源码目录；配置留空时用仓库里的 watchapp/。"""
    if settings.watchapp_dir:
        return Path(settings.watchapp_dir).expanduser()
    repo_root = Path(__file__).resolve().parents[3]
    return repo_root / "watchapp"


def _node_path() -> str | None:
    return shutil.which(settings.watchapp_node)


def toolchain_status() -> tuple[bool, str]:
    """返回 (是否可用, 不可用原因)；前端据此决定要不要显示按钮。"""
    if not settings.watchapp_build_enabled:
        return False, "服务端没有开启手环打包"

    root = source_dir()
    if not (root / "package.json").exists():
        return False, "服务端找不到 watchapp 源码"
    if not (root / "node_modules" / ".bin").exists():
        return False, "服务端还没安装 watchapp 依赖（npm install）"
    if not (root / "sign" / "debug" / "private.pem").exists():
        return False, "服务端还没配置打包签名（watchapp/sign/debug）"
    if _node_path() is None:
        return False, "服务端没有可用的 Node.js"
    return True, ""


def download_name(user: User) -> str:
    return f"everlong-watch-{datetime.now().strftime('%Y%m%d')}.rpk"


def cleanup(rpk_path: Path) -> None:
    """删除某个包所在的临时目录（作为响应结束后的 BackgroundTask 调用）。"""
    shutil.rmtree(Path(rpk_path).parent, ignore_errors=True)


def build_for_user(db: Session, user: User) -> Path:
    """用这个账号的课表打一个包，返回 rpk 的临时路径。"""
    available, reason = toolchain_status()
    if not available:
        raise WatchAppBuildError(reason)

    root = source_dir()
    payload = _payload(db, user)

    if not _build_lock.acquire(timeout=60):
        raise WatchAppBuildError("服务端正在打另一个包，请稍后重试")
    workdir: Path | None = None
    try:
        build_root = root / ".build"
        build_root.mkdir(parents=True, exist_ok=True)
        workdir = Path(tempfile.mkdtemp(prefix="user-", dir=build_root))
        project = workdir / "project"
        shutil.copytree(root, project, ignore=_COPY_IGNORE)
        shutil.copytree(root / "sign", project / "sign")

        data_file = project / "src" / "common" / "data" / "sync.js"
        data_file.parent.mkdir(parents=True, exist_ok=True)
        data_file.write_text(_sync_js(payload), encoding="utf-8")

        _run_build(project, root)

        rpks = sorted((project / "dist").glob("*.rpk"), key=lambda p: p.stat().st_mtime)
        if not rpks:
            raise WatchAppBuildError("打包没有产出 rpk 文件")
        out = workdir / rpks[-1].name
        shutil.move(str(rpks[-1]), str(out))
        return out
    except WatchAppBuildError:
        if workdir is not None:
            shutil.rmtree(workdir, ignore_errors=True)
        raise
    except Exception as exc:  # noqa: BLE001 - 任何异常都要变成可展示的提示
        if workdir is not None:
            shutil.rmtree(workdir, ignore_errors=True)
        raise WatchAppBuildError(f"打包失败：{exc}") from exc
    finally:
        _build_lock.release()


def _run_build(project: Path, source: Path) -> None:
    """在临时项目里跑 aiot build。

    ``source`` 是真正的 watchapp 目录：依赖装在它的 node_modules 里，
    临时项目放在它的子目录下，Node 向上查找就能复用这些依赖。
    """
    node = _node_path()
    bin_dir = str(source / "node_modules" / ".bin")
    aiot = shutil.which("aiot", path=bin_dir)
    if aiot:
        command = [aiot, "build", "--enable-custom-component"]
    else:
        npm = shutil.which("npm") or "npm"
        command = [npm, "run", "build"]

    env = dict(os.environ)
    if node:
        env["PATH"] = str(Path(node).parent) + os.pathsep + env.get("PATH", "")
    env.setdefault("CI", "1")

    try:
        proc = subprocess.run(
            command,
            cwd=str(project),
            env=env,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=settings.watchapp_build_timeout_seconds,
        )
    except subprocess.TimeoutExpired as exc:
        raise WatchAppBuildError("打包超时，请稍后再试") from exc

    if proc.returncode != 0:
        output = (proc.stderr or "") + (proc.stdout or "")
        tail = [line for line in output.strip().splitlines() if line.strip()][-4:]
        raise WatchAppBuildError("打包失败：" + " / ".join(tail) if tail else "打包失败")


def _payload(db: Session, user: User) -> dict:
    """与 GET /api/timetable/courses 返回的结构保持一致，手环端直接读。"""
    courses = repository.list_courses(db, user.id, None)
    row = repository.get_timetable_settings(db, user.id)
    period_times = (row.period_times if row and row.period_times else None) or timetable_service.default_period_times()
    return {
        "synced_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S+08:00"),
        "account": user.name or user.email,
        "timetable": {
            "settings": {
                "active_term": (row.active_term if row else "") or "",
                "week1_date": (row.week1_date if row else None),
                "period_times": period_times,
            },
            "courses": [schemas.CourseOut.model_validate(c).model_dump(mode="json") for c in courses],
        },
    }


def _sync_js(payload: dict) -> str:
    return _SYNC_BANNER + "export default " + json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
