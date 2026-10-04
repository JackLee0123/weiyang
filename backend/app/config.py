from pydantic_settings import BaseSettings, SettingsConfigDict


# 应用版本号：main.py 的 OpenAPI 与 /api/health 都读这里，避免多处各写一份
APP_VERSION = "0.8.2"


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
    # 验证码发送的第二层限流：除单个邮箱冷却外，再按来源 IP、邮箱和邮箱域名限制。
    # 这些限制默认偏保守，生产环境可按实际邮件量调整；限流器本身应在多实例部署时替换为 Redis。
    verify_code_ip_limit_per_hour: int = 10
    verify_code_email_limit_per_hour: int = 3
    verify_code_domain_limit_per_hour: int = 30
    auth_token_ttl_seconds: int = 2592000
    # 超级管理员：启动时把指定邮箱的用户提升为管理员；
    # 若该邮箱尚未注册，则用配置的密码创建管理员账号（仅作首次引导，请设置强密码）。
    super_admin_email: str = ""
    super_admin_password: str = ""

    # Web Push：使用 VAPID 签名向订阅端点发送通知。
    # 生产环境必须配置这三项；私钥绝不进入前端，仅后端使用。
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    # VAPID 主体，必须是 mailto: 邮箱或 https 网址（用于标识推送服务提供方）。
    vapid_subject: str = ""
    # 任务提醒调度器：启用后在后台定期检查哪些提醒到点并推送。
    push_scheduler_enabled: bool = True
    push_scheduler_interval_seconds: float = 30.0
    # 允许多久内的“迟到”通知仍被补发（防止调度错过时过于滞后）。
    push_scheduler_grace_seconds: float = 300.0

    # 品牌信息（邮件、API 标题等处使用）
    app_name: str = "未央 · Everlong"
    app_tagline: str = "提前排期，每日记录"

    # 手环快应用打包：手环 10 的快应用不能联网，课表要随安装包带进去。
    # 开启后，登录用户在「设备连接」里点一下就能拿到属于自己课表的 rpk。
    # watchapp_dir 留空时自动找仓库里的 watchapp/ 目录。
    watchapp_build_enabled: bool = True
    watchapp_dir: str = ""
    watchapp_node: str = "node"
    watchapp_build_timeout_seconds: int = 240
    # 打包比较吃 CPU，限一下频率：默认 10 分钟内最多 3 次。
    watchapp_build_limit: int = 3
    watchapp_build_window_seconds: int = 600

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def vapid_configured(self) -> bool:
        return bool(self.vapid_public_key and self.vapid_private_key and self.vapid_subject)


settings = Settings()
