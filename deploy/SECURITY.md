# 未央 · Everlong 上线安全清单

公开之前，按下述顺序逐项确认。代码层面的安全修复已包含在本次提交中（验证码 dev 模式隔离 + 登录/注册/发码限流）。

## 1. 邮件验证码（最重要）

- 生产必须配置 `SMTP_HOST`、`SMTP_USER`、`SMTP_PASSWORD`（后端 `.env`）。
- 生产必须保持 `DEV_MODE=false`（默认值）。开启后，未配置 SMTP 时接口会把验证码回显给请求者，账号可被接管。
- 检查发件人名称与品牌一致：`.env` 里 `SMTP_FROM_NAME` 现在为“计划表”，建议改成“未央 · Everlong”。

## 2. HTTPS / 域名

- 裸 IP 走 HTTP，邮箱 + 密码 + 登录令牌均为明文。公开后务必启用 HTTPS。
- 最简方案：购买域名，用 certbot 申请 Let's Encrypt 证书，套用 `deploy/nginx-everlong.conf`。
- 域名解析完成后：`sudo certbot --nginx -d your-domain.com`，然后 `sudo nginx -s reload`。
- 套 nginx 反代后，在 `.env` 里把 `TRUST_PROXY_HEADERS=true`，才能让限流拿到真实客户端 IP。

## 3. 公网暴露面

- 只开放 80 / 443 端口；数据库绑定在 `127.0.0.1`，不要对外暴露。
- 后端请用 `uvicorn 127.0.0.1:8000` 启动（仅本机监听），由 nginx 对外转发。
- `SUPER_ADMIN_EMAIL` 填你的邮箱，并设置强 `SUPER_ADMIN_PASSWORD`。

## 4. 上线后

- 用管理员账号确认后台可用。
- 注册一个新邮箱测注册、登录、忘记密码三条链路都能收到真实邮件。
- 观察 `/api/auth/login` 是否出现异常高频访问（限流已生效）。
