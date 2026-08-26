# 未央 · Everlong（本地任务计划客户端 MVP）

一个可离线运行的本地应用，用于**提前排期（计划）**与**每日记录（实际做了什么）**。前端负责交互，后端提供 REST API，数据存储于 MySQL/MariaDB（默认开发用 SQLite 便于零配置启动）。

## 技术栈

- 前端：React 18 + TypeScript + Vite + Tailwind CSS + TanStack Query + date-fns
- 后端：Python 3.12 + FastAPI + SQLAlchemy 2 + Alembic + PyMySQL
- 数据库：MySQL 5.7+ / MariaDB（开发可用 SQLite 兜底）
- 桌面：Electron + electron-builder（Windows 安装包）
- 测试：pytest（后端）、Vitest + Testing Library（前端）、Playwright（端到端）

## 目录结构

```
apps/
  frontend/            React 前端（三视图）
  desktop/             Electron 桌面壳 + electron-builder 配置
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
- MySQL 5.7+ / MariaDB（生产与桌面客户端；开发可不用）

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

## 打包桌面客户端（Electron）

1. 构建前端：

   ```powershell
   pnpm build:frontend
   ```

2. 用 PyInstaller 生成 `backend.exe`：

   ```powershell
   cd backend
   uv run pyinstaller --noconfirm --clean backend.spec
   Copy-Item dist\backend.exe ..\apps\desktop\resources\backend\backend.exe
   cd ..
   ```

3. 将可移植 MariaDB 放到 `apps/desktop/resources/mariadb`（保持 `bin/mariadbd.exe` 结构）。若未放置，主进程会回退到外部 MySQL，读取环境变量 `DATABASE_URL`。

4. 打包：

   ```powershell
   pnpm build:desktop
   ```

   安装包输出在 `apps/desktop/release/`。

## API 一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| POST | `/api/auth/send-code` | 发送邮箱验证码（未配置 SMTP 时返回开发模式验证码） |
| POST | `/api/auth/register` | 邮箱验证码注册，返回访问令牌 |
| POST | `/api/auth/login` | 邮箱密码登录，返回访问令牌 |
| POST | `/api/auth/forgot-password` | 发送重置密码验证码到邮箱 |
| POST | `/api/auth/reset-password` | 使用邮箱验证码重置密码 |
| POST | `/api/auth/logout` | 吊销当前访问令牌 |
| GET/POST | `/api/plans` | 查询（支持 `start/end/status/category/q`）/ 新建计划 |
| PATCH/DELETE | `/api/plans/:id` | 更新 / 删除计划 |
| GET/POST | `/api/records` | 查询 / 新建记录 |
| PATCH/DELETE | `/api/records/:id` | 更新 / 删除记录 |
| GET | `/api/stats/overview?start=&end=` | 完成率、类别分布、连续记录天数 |
| GET | `/api/stats/heatmap?start=&end=` | 按天聚合的活跃度（完成计划数 + 记录数） |
| POST | `/api/backup/export` / `/api/backup/import` | 导出 / 导入备份 |

除 `health` 与 `auth` 外，其余接口都需要在请求头携带 `Authorization: Bearer <token>`，
数据按登录账号隔离，每个账号只能看到自己的计划与记录。

界面提供 **今日 / 日历 / 活跃度 / 全部** 四个视图：今日用于当天计划勾选与补记，日历按月份浏览，活跃度展示过去 12 个月的 GitHub 风格热力图，全部用于搜索和按状态/分类筛选。
