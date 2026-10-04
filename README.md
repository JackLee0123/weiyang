# 未央 · Everlong（本地任务计划客户端 MVP）

一个可离线运行的本地应用，用于**提前排期（计划）**与**每日记录（实际做了什么）**。前端负责交互，后端提供 REST API，数据存储于 MySQL/MariaDB（默认开发用 SQLite 便于零配置启动）。

## 技术栈

- 前端：React 18 + TypeScript + Vite + Tailwind CSS + TanStack Query + date-fns
- 后端：Python 3.12 + FastAPI + SQLAlchemy 2 + Alembic + PyMySQL
- 数据库：MySQL 5.7+ / MariaDB（开发可用 SQLite 兜底）
- 测试：pytest（后端）、Vitest + Testing Library（前端）、Playwright（端到端）

## 目录结构

```
apps/
  frontend/            React 前端（三视图）
backend/               FastAPI 后端 + Alembic 迁移 + 测试
  app/
    routers/           plans / records / stats / backup / health
    models.py          SQLAlchemy 模型
    schemas.py         Pydantic 请求/响应模型
    repository.py      数据访问层
  alembic/             数据库迁移
```

## 环境要求

- Node.js 20+（本项目于 Node 24 验证）
- pnpm 9+
- Python 3.12+
- uv（后端依赖管理）
- MySQL 5.7+ / MariaDB（生产环境；开发可不用）

## 快速开始（开发模式）

1. 安装 Node 依赖：

   ```powershell
   pnpm install
   ```

2. 安装后端依赖：

   ```powershell
   cd backend
   uv sync
   cd ..
   ```

3. 启动前后端：

   ```powershell
   pnpm dev
   ```

   后端运行在 `http://127.0.0.1:8000`，前端运行在 `http://127.0.0.1:5173`（已代理 `/api` 到后端）。
   浏览器打开 `http://127.0.0.1:5173` 即可使用。

> 开发默认使用 SQLite（数据文件在 `backend/data/planner.db`），无需配置数据库即可跑起来。

## 切换为 MySQL / MariaDB

复制 `.env.example` 为 `backend/.env`，把 `DATABASE_URL` 改成 MySQL 连接串，并确保数据库存在：

```powershell
CREATE DATABASE planner_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

示例：

```text
DATABASE_URL=mysql+pymysql://root:123456@127.0.0.1:3306/planner_db?charset=utf8mb4
```

迁移表结构：

```powershell
cd backend
$env:DATABASE_URL="mysql+pymysql://root:123456@127.0.0.1:3306/planner_db?charset=utf8mb4"
uv run alembic upgrade head
cd ..
```

## 测试

```powershell
pnpm test:backend   # 后端 pytest（内存数据库）
pnpm test:frontend  # 前端 Vitest
```

端到端冒烟（需先运行 `pnpm dev`）：

```powershell
python .build/e2e.py
```

## 网页端安装为应用（PWA）

网页端像 YouTube / GitHub 那样支持“点击即安装成应用”：
浏览器打开 `http://127.0.0.1:5173` 后（Chrome/Edge 等），地址栏会出现「安装」图标，
侧边栏也会在可安装时出现「安装应用」按钮，点击即弹出安装确认，装好后会在开始菜单/桌面生成
应用入口，并支持离线打开外壳界面。

- 需要满足 PWA 可安装条件：本地用 `localhost` 或 `127.0.0.1`（Chrome 视为安全源）；
  正式部署必须走 HTTPS。
- 配套文件：`apps/frontend/public/manifest.webmanifest`（应用名、图标、主题色）与
  `apps/frontend/public/sw.js`（离线缓存外壳；`/api` 请求始终走网络，不写入缓存）。
- 图标取自品牌图标，构建前端时(`pnpm build:frontend`)会一并打包，无需额外配置。

## 手环端（Xiaomi Vela 快应用，离线快照）

小米手环端见 `watchapp/`。**手环 10 的快应用拿不到联网能力**——官方支持表里
`system.fetch`、`system.request`、`system.uploadtask`、`system.network` 一律
「不支持」，只有 Xiaomi Watch S3/S4/S5、REDMI Watch 5/6、小米 S1 Pro 这类手表支持。
因此手环端不做运行期联网，改成「打包时注入 + 本机记录」：

- **课表 / 学期设置**：由同步脚本从后端拉一次，写进安装包，随包推进手环；
- **专注计时**：只记在手环本地（`@system.storage`），不上传，也不与网页端合并。

更新数据（学期初或课表变动后跑一次）：

**最省事的方式**：登录网页端 → 侧栏「设备连接」→「生成并下载 rpk」，服务端会用你
当前的课表打好一个包直接给你下载，然后 AstroBox 推送到手环即可（需要服务端装了
Node、watchapp 依赖和固定签名，见 `deploy.sh`）。

不想用在线打包、或者要自己改样式，就在本地跑：

```bash
cd watchapp
npm run sync     # 首次会自动打开确认链接，在网页端「设备连接」里点一下「连接」
npm run build    # 产出 dist/cn.everlong.watch.debug.<版本>.rpk
# 用 AstroBox 把这个 rpk 推到手环
```

同步脚本复用的还是原来的设备配对链路，令牌缓存在 `watchapp/.sync-token.json`
（默认 30 天，已 gitignore）。网页端「设备连接」面板现在主要就是给同步脚本配对
和解绑用的；解绑后缓存令牌立即失效，重跑 `npm run sync` 会自动重新配对。

其他用户（或你自己的另一台手环）怎么从头装一遍，见 `watchapp/README.md`
的「给其他用户：从零到装上」一节：装 Node.js + AstroBox → `npm run sync`
（网页端点一次「连接」）→ `npm run build` → 用 AstroBox 推送 rpk。

相关接口（完整清单见文末 API 一览）：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/devices/handshake` | 手环端发起（无需登录），返回 6 位短码 + 轮询凭据 |
| GET | `/api/devices/handshake/:code` | 手机端扫码后查看设备名与状态 |
| POST | `/api/devices/handshake/:code/approve` | 手机端确认，把设备绑定到当前账号 |
| POST | `/api/devices/handshake/:code/poll` | 手环端轮询，确认后一次性领取访问令牌 |
| GET / DELETE | `/api/devices` / `/api/devices/:id` | 已连接设备列表 / 解绑设备 |

## 手机通知（Web Push）

支持 Android Chrome / Edge、iPhone Safari 与 iOS/iPadOS PWA：用户把网站安装到主屏幕后，
即使不打开网页也能收到系统推送通知。

**开启方式**：登录后侧边栏「接收通知」（或首次进入顶部提示条）→ 授权通知权限 →
后端保存你的订阅。iPhone 须先把网站「添加到主屏幕」后再开启。

**VAPID 配置**：生成密钥对（私钥绝对不要放进前端或提交 Git）：

```powershell
cd backend
uv run python -c "import base64; from cryptography.hazmat.primitives.asymmetric import ec; p=ec.generate_private_key(ec.SECP256R1()); print('VAPID_PUBLIC_KEY='+base64.urlsafe_b64encode(b'\x04'+p.public_key().public_numbers().x.to_bytes(32,'big')+p.public_key().public_numbers().y.to_bytes(32,'big')).rstrip(b'=').decode()); print('VAPID_PRIVATE_KEY='+base64.urlsafe_b64encode(p.private_numbers().private_value.to_bytes(32,'big')).rstrip(b'=').decode())"
```

把结果写入 `backend/.env`（或系统环境变量）：

```text
VAPID_PUBLIC_KEY=<生成的公钥>
VAPID_PRIVATE_KEY=<生成的私钥>
VAPID_SUBJECT=mailto:you@example.com
```

**数据库**：新增 `push_subscriptions` 表（`user_id / endpoint / p256dh / auth / user_agent / created_at / updated_at`），
一个用户可对应多台设备。迁移：

```powershell
cd backend
uv run alembic upgrade head
```

**接口**（除 `config` 外均需 `Authorization: Bearer <token>`）：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/push/config` | 返回 VAPID 公钥与服务端是否已配置（无需登录） |
| GET | `/api/push/status` | 当前用户的订阅数量与服务端配置 |
| POST | `/api/push/subscribe` | 保存/更新当前用户的订阅 |
| POST | `/api/push/unsubscribe` | 删除当前用户的指定订阅 |
| POST | `/api/push/test` | 给当前用户发送一条测试通知（开发/自助联调） |
| POST | `/api/push/send` | 管理员向指定 `user_id` 发送通知 |
| GET | `/api/push/schedule` | 读取当前用户的任务提醒规则与下次提醒时间 |
| PUT | `/api/push/schedule` | 保存/更新当前用户的任务提醒规则 |

`/api/push/send` 请求体示例：

```json
{ "user_id": 123, "title": "新消息", "body": "你有一条新的通知", "url": "/notifications" }
```

**任务提醒（定时推送）**：侧边栏「任务提醒」可设置多个每日时间点、提前“批量天数”、
以及按周（选星期）/按月（选日期）/按年（选月+日）重复，到点由后端调度器把当天/本周期
的任务摘要推送给订阅设备。后端启动一个异步调度任务（默认每 30 秒扫描一次），通过
`PUSH_SCHEDULER_ENABLED` / `PUSH_SCHEDULER_INTERVAL_SECONDS` / `PUSH_SCHEDULER_GRACE_SECONDS` 控制。

**本地 HTTPS 测试**：通知接口需要安全上下文，建议用 `mkcert` 生成本地证书（命令：`mkcert -install`，
再 `mkcert 127.0.0.1` 生成证书），或用已配置 HTTPS 的暂存域名。`localhost` / `127.0.0.1`
在 Chrome/Edge 会被当作安全源，可直接在浏览器里开着页面点击「发送测试通知」验证。

**Android 测试**：Chrome/Edge 打开站点 → 侧边栏「安装应用」，装上后从主屏幕打开 →
「接收通知」开启 → 「发送测试通知」，等待推送到达通知栏。点击通知应跳转 `/notifications`。

**iPhone 测试**：Safari 打开站点 → 分享 →「添加到主屏幕」→ 从主屏幕打开 →
「接收通知」开启（首次会弹出系统授权）→「发送测试通知」。若没看到开启入口，按页面提示先安装。

**生产注意**：必须 HTTPS；确认 `CORS_ORIGINS` 与 `TRUST_PROXY_HEADERS`；VAPID 私钥只放后端环境变量；
通知内容不要写入敏感信息；订阅失效（404/410）时后端会自动清理对应记录。

## 管理员批量导入日程（.xlsx）

侧边栏「用户管理」（仅管理员可见）底部有「批量导入日程」：上传一份 .xlsx 日程表，
先把解析结果预览一遍，确认后可以一次性写进你自己和勾选用户的每日日程（计划）里。

表格格式：一行 = 一条日程。**列名不用改**——系统会按单元格内容自动识别哪一列是日期、
哪一列是日程内容（表头写成「上课时间 / 课程名称」这类可以，没有表头也能认），
解析后会告诉你按哪两列识别的。表头若写成下面这些写法，会优先按名字匹配：

| 列 | 必填 | 说明 |
| --- | --- | --- |
| 日期 | 是 | `2026-10-05`、`2026/10/5`、`2026年10月5日`、`10月5日`、Excel 日期单元格都可以 |
| 标题 | 是 | 日程名称（对应计划标题） |
| 开始时间 / 结束时间 | 否 | `09:00`，也可以只写一列「时间」用 `08:00-09:30` 表示 |
| 备注 | 否 | 写进计划的描述 |
| 分类 | 否 | 默认「日程」 |
| 优先级 | 否 | 高 / 中 / 低（默认中） |
| 状态 | 否 | 待办 / 进行中 / 已完成 / 已取消（默认待办） |
| 重复 | 否 | 每天 / 工作日 / 每周X；留空表示只导入这一天 |
| 重复至 | 否 | 配合「重复」使用，限定展开到哪一天 |

多个工作表时，会取第一个能解析出日程的表（前面放「说明」页也没关系）。「用户管理」里的
「下载模板」会给出一份带示例行的 xlsx，照着填即可。导入时：

**另一种常见排布（横向按周）也支持**：第一行写星期几或日期、下面每一行的格子里写当天的安排，
例如学习计划表里「词汇课 / 阅读课1 / 写作课2 / 复习」这种。导入时会把日期行当作日期列，
每个格子里的内容作为当天的一条日程；格子里写了多行、「08:00 早读」这类时间前缀也都会识别。
过去的日期不会写入；已存在的相同日程（同一天、同一标题、同一开始时间）会自动跳过；
导入完成后会显示每个人写入的条数，并可以一键「撤销本次导入」（只删除这次导入生成的日程）。

## 计划完成 → 记录同步

在「今日」页把一条计划勾选完成后，当天的「记录」里会自动多出一条对应的记录，并标上「来自计划」：

- 记录跟随计划：日期、标题、分类、备注（计划描述）、用时（由计划的开始 / 结束时间算出）。
- 取消勾选（或改成进行中 / 取消）时，这条自动记录会一起移除；再次勾选会重新生成，不会重复。
- 计划删除时，自动记录一并删除；手写记录只解除关联，不会被删。
- 只有自动生成的那条（`records.source = 'plan'`）跟着计划走，自己「记一笔」的记录不受影响，
  也不能在记录编辑框里直接删除——要移除就去取消计划的勾选。
- 统计口径：完成率不会把「计划 + 它自动生成的记录」重复算两遍；「记录数 / 记录用时」照实统计，
  所以完成一条带时间的计划后，这两项都会变化。
- 「当日专注」也会把当天完成的计划算进去：计划写了开始 / 结束时间的，直接进时长分布；
  没写时间的会列在下面并标注「未填用时」，只计次数、不计时长——点一下那一行就能打开对应记录补用时，
  填完立刻进分布图。在记录里手工填的用时不会被计划同步冲掉；计划一旦补上正式开始 / 结束时间，就改以计划为准。

## API 一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| POST | `/api/captcha` | 生成拼图验证（背景图 + 拼块，缺口位置仅存服务端） |
| POST | `/api/captcha/verify` | 校验拼图滑动位置，通过后返回一次性凭证 |
| POST | `/api/auth/send-code` | 拼图验证后发送邮箱验证码（未配置 SMTP 时返回开发模式验证码） |
| POST | `/api/auth/register` | 邮箱验证码 + 拼图凭证注册，返回访问令牌 |
| POST | `/api/auth/login` | 邮箱密码 + 拼图凭证登录，返回访问令牌 |
| POST | `/api/auth/forgot-password` | 邮箱 + 拼图凭证发送重置密码验证码 |
| POST | `/api/auth/reset-password` | 拼图验证 + 邮箱验证码重置密码 |
| POST | `/api/auth/logout` | 吊销当前访问令牌 |
| GET/POST | `/api/plans` | 查询（支持 `start/end/status/category/q`）/ 新建计划 |
| PATCH/DELETE | `/api/plans/:id` | 更新 / 删除计划 |
| GET/POST | `/api/records` | 查询 / 新建记录 |
| PATCH/DELETE | `/api/records/:id` | 更新 / 删除记录 |
| GET | `/api/stats/overview?start=&end=` | 完成率、类别分布、连续记录天数 |
| POST | `/api/backup/export` / `/api/backup/import` | 导出 / 导入备份 |
| GET | `/api/admin/users` | 用户列表（管理员） |
| PATCH/DELETE | `/api/admin/users/:id` | 修改 / 删除用户（管理员） |
| POST | `/api/admin/schedule/preview` | 解析上传的 .xlsx 日程表，返回预览（管理员，不落库） |
| POST | `/api/admin/schedule/import` | 把日程批量导入自己 / 指定用户 / 全部用户（管理员） |
| POST | `/api/admin/schedule/rollback` | 撤销某次批量导入生成的日程（管理员） |
| GET | `/api/admin/schedule/template` | 下载日程导入模板 xlsx（管理员） |
| POST | `/api/timetable/parse` | 解析上传的 Excel / HTML / ICS 或粘贴文本，返回课表预览（不保存） |
| POST | `/api/timetable/wisedu/captcha` | 获取金智教务登录验证码（一次性会话） |
| POST | `/api/timetable/wisedu/fetch` | 临时登录金智教务并抓取课表（不保存账号密码） |
| POST | `/api/timetable/courses` | 保存某学期课表并更新设置（默认替换该学期） |
| GET/DELETE | `/api/timetable/courses` / `/api/timetable/courses/:id` | 查询 / 删除课表课程 |
| GET/PATCH | `/api/timetable/settings` | 读写学期、开学第 1 周、各节次时间 |
| POST | `/api/timetable/generate-plans` | 把某周课程批量生成到日历计划 |
| POST | `/api/devices/handshake` | 设备端发起连接（手环同步脚本用它配对），生成一次性短码（无需登录） |
| GET | `/api/devices/handshake/:code` | 查看待确认的手环连接 |
| POST | `/api/devices/handshake/:code/approve` | 确认把手机扫到的手环绑定到当前账号 |
| POST | `/api/devices/handshake/:code/poll` | 手环轮询领取访问令牌 |
| GET | `/api/devices` | 已连接设备列表（手环 + 浏览器登录） |
| DELETE | `/api/devices/:id` | 解绑设备 |
| GET | `/api/devices/watchapp/status` | 服务端是否具备打手环安装包的条件 |
| POST | `/api/devices/watchapp/build` | 用当前账号的课表打包，直接下载 rpk |

除 `health`、`auth` 与手环连接的 `handshake` / `poll`（手环端尚未登录，凭一次性
`poll_token` 领取令牌）之外，其余接口都需要在请求头携带 `Authorization: Bearer <token>`，
数据按登录账号隔离，每个账号只能看到自己的计划与记录。

界面提供 **今日 / 未央 / 回忆 / 日历 / 课表 / 活跃度 / 全部** 等视图：今日用于当天计划勾选与补记，日历按月份浏览，课表以周网格展示课程并可一键生成课程计划，活跃度展示过去 12 个月的 GitHub 风格热力图，全部用于搜索和按状态/分类筛选。

金智教务抓取默认针对新疆政法学院教务系统（课表站 `jwxt.xjzfu.edu.cn` + 统一身份认证
`authserver.xjzfu.edu.cn`），可通过环境变量覆盖：
`WISEDU_BASE_URL`、`WISEDU_AUTH_URL`、`WISEDU_CAPTCHA_PATH`、`WISEDU_LOGIN_PATH`、`WISEDU_TIMETABLE_PATH`。
