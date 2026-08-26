import os
import tempfile

import pytest


_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_db.name}"
os.environ["AUTO_CREATE_TABLES"] = "true"
os.environ["SMTP_HOST"] = ""
os.environ["SMTP_USER"] = ""
os.environ["SMTP_PASSWORD"] = ""
os.environ["SMTP_FROM"] = ""
os.environ["FEEDBACK_TO_EMAIL"] = "feedback@example.com"
os.environ["DEV_MODE"] = "true"

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.database import Base, get_db  # noqa: E402
from app import main as main_module  # noqa: E402
from app.services.captcha import reset as reset_captcha  # noqa: E402
from app.services.ratelimit import rate_limiter  # noqa: E402
from app.services.verification import reset as reset_verification  # noqa: E402


@pytest.fixture(autouse=True)
def _clean_verification_codes():
    reset_verification()
    rate_limiter.reset()
    reset_captcha()
    yield
    reset_verification()
    rate_limiter.reset()
    reset_captcha()


def _captcha_token(client):
    """开发模式下取得一个已验证的拼图凭证（target_x 仅在 DEV_MODE 下返回）。"""
    captcha = client.post("/api/captcha").json()
    verify = client.post(
        "/api/captcha/verify",
        json={"captcha_id": captcha["captcha_id"], "x": captcha["target_x"]},
    )
    return verify.json()["captcha_token"]


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    main_module.app.dependency_overrides[get_db] = override_get_db
    with TestClient(main_module.app) as c:
        yield c
    main_module.app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers(client):
    email = "owner@example.com"
    code = client.post("/api/auth/send-code", json={"email": email}).json()["dev_code"]
    captcha_token = _captcha_token(client)
    session = client.post(
        "/api/auth/register",
        json={"name": "主人", "email": email, "password": "Secret1!", "code": code, "captcha_token": captcha_token},
    ).json()
    return {"Authorization": f"Bearer {session['token']}"}


@pytest.fixture()
def register_user(client):
    def _register(email: str):
        code = client.post("/api/auth/send-code", json={"email": email}).json()["dev_code"]
        captcha_token = _captcha_token(client)
        session = client.post(
            "/api/auth/register",
            json={"name": email.split("@")[0], "email": email, "password": "Secret1!", "code": code, "captcha_token": captcha_token},
        ).json()
        return {"Authorization": f"Bearer {session['token']}"}

    return _register


@pytest.fixture()
def captcha_ok(client):
    return lambda: _captcha_token(client)
