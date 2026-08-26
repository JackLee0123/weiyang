from contextlib import asynccontextmanager
import mimetypes
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, SessionLocal, engine
from . import repository
from .services.security import hash_password
from .routers import admin, auth, backup, captcha, feedback, health, plans, records, reports, stats


def _bootstrap_super_admin() -> None:
    """启动时按配置把指定邮箱的用户提升为管理员；若未注册则创建（需配置密码）。"""
    email = (settings.super_admin_email or "").strip()
    if not email:
        return
    db = SessionLocal()
    try:
        user = repository.get_user_by_email(db, email)
        if user is None:
            if not settings.super_admin_password:
                return
            user = repository.create_user(db, "管理员", email, hash_password(settings.super_admin_password))
        if not user.is_admin or not user.is_active:
            repository.update_user(db, user, {"is_admin": True, "is_active": True})
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.auto_create_tables:
        Base.metadata.create_all(bind=engine)
    _bootstrap_super_admin()
    yield


app = FastAPI(title="未央 · Everlong API", version="0.4.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (
    health.router,
    captcha.router,
    auth.router,
    plans.router,
    records.router,
    stats.router,
    reports.router,
    backup.router,
    feedback.router,
    admin.router,
):
    app.include_router(router)


# 若前端已构建，则由后端静态托管（桌面客户端生产模式）。
# 打包后通过 FRONTEND_DIST 环境变量指定前端资源目录。
frontend_dist = os.environ.get("FRONTEND_DIST")
if not frontend_dist:
    frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "apps", "frontend", "dist"))
if os.path.isdir(frontend_dist):
    # PWA 清单需要标准 MIME，否则浏览器会拒绝其作为 Web App Manifest。
    mimetypes.add_type("application/manifest+json", ".webmanifest")
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
