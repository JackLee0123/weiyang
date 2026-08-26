from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # 开发默认使用 SQLite（零配置）；桌面客户端通过环境变量切到 MySQL/MariaDB。
    database_url: str = "sqlite:///./data/planner.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    # 是否在启动时自动建表（开发便利；生产走 Alembic 迁移）
    auto_create_tables: bool = True

    # 开发模式：SMTP 未配置时允许把验证码随接口返回，方便本地联调。
    # 生产必须为 false，绝不能在响应里回显验证码。
    dev_mode: bool = False

    # 若部署在反向代理（nginx / Cloudflare）之后，需要信任 X-Forwarded-For
    # 以拿到真实客户端 IP，用于限流。开启前请确保只有受信任的代理能直连后端。
    trust_proxy_headers: bool = False

    # 邮件验证码（注册）：配置 SMTP 后才会真实发送；未配置时走“开发模式”，
    # 接口会把验证码原样返回，便于本地联调。
    smtp_host: str = ""
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_from_name: str = "未央 · Everlong"
    smtp_use_ssl: bool = True
    smtp_starttls: bool = False
    # 问题反馈收件邮箱；留空时回退到 SMTP_USER（即发件邮箱）。
    feedback_to_email: str = ""
    verify_code_ttl_seconds: int = 600
    verify_code_cooldown_seconds: int = 60
    auth_token_ttl_seconds: int = 2592000
    # 超级管理员：启动时把指定邮箱的用户提升为管理员；
    # 若该邮箱尚未注册，则用配置的密码创建管理员账号（仅作首次引导，请设置强密码）。
    super_admin_email: str = ""
    super_admin_password: str = ""

    # 品牌信息（邮件、API 标题等处使用）
    app_name: str = "未央 · Everlong"
    app_tagline: str = "提前排期，每日记录"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
