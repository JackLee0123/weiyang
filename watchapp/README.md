# 未央 · 手环端（Xiaomi Vela 快应用）

面向 **小米手环 10 Pro**（Xiaomi Vela OS 快应用）的「未央 Everlong」 companion 应用，
复用现有 FastAPI 后端，在手腕上实现两大功能：

- **当日专注**：今日专注次数/总时长/项目分布（与 Web 端同一统计口径）、手环专注计时器（结束后自动写入记录）
- **课表**：按周次过滤的每日课程列表、上下节切换、当前课程高亮、节次时间显示

## 目录结构

```
watchapp/
├── package.json
├── src/
│   ├── app.ux                    # 应用入口（加载本地配置）
│   ├── manifest.json             # 快应用配置（包名/路由/features）
│   ├── common/
│   │   ├── images/logo.png       # 应用图标（取自 brand/final-512.png）
│   │   └── scripts/
│   │       ├── store.js          # 配置存取（@system.storage）
│   │       ├── api.js            # 后端 REST 封装（@system.fetch）
│   │       ├── focus.js          # 当日专注统计（移植自 web lib/focus.ts）
│   │       ├── timetable.js      # 周次/课程工具（移植自 web lib/timetable.ts）
│   │       └── demo.js           # 演示模式数据
│   └── pages/
│       ├── index/                # 首页（两功能入口 + 今日概览）
│       ├── focus/                # 当日专注（统计 + 计时）
│       ├── timetable/            # 课表（今日课程，左右切换星期）
│       └── settings/             # 服务器 / 令牌 / 演示模式
└── sign/                         # 打包签名（在 AIoT-IDE 中生成）
```

## 工作原理

手环端不实现注册/登录（滑块拼图 + 邮箱验证码在手表上不可用），
而是通过 **令牌直连** 复用 Web 端账号数据：

| 手环端 | 后端接口 | 说明 |
| --- | --- | --- |
| 当日专注统计 | `GET /api/records?start=&end=` | 与 Web 端 `focus.ts` 相同口径 |
| 专注分布标签 | `GET /api/plans?start=&end=` | 取计划标题做分片标签 |
| 保存专注 | `POST /api/records` | 标题 `专注 · N 分钟`，同 Web 端「专注航班」 |
| 课表 | `GET /api/timetable/courses` | 返回课程 + 学期设置（week1_date、节次时间） |
| 令牌校验 | `GET /api/auth/me` | 设置页「测试连接」 |

## 配置方法（首次使用）

1. 电脑上登录未央网页端。
2. F12 打开开发者工具 → 应用（Application）→ 本地存储（Local Storage），
   复制 `planner-token` 的值。
3. 手环上打开本应用 → 设置 → 填入：
   - **服务器地址**：后端地址，例如 `http://192.168.1.10:8000`（局域网 IP，手机与电脑同一网络）
   - **访问令牌**：上一步复制的 token
4. 点「保存」→「测试连接」，显示「连接成功：<你的名字>」即完成。

> 令牌有过期时间，失效后重新从网页端复制即可。

## 演示模式

设置页开启「演示模式」后使用内置示例数据，无需服务器，便于先预览界面。

## 开发调试（AIoT-IDE）

1. 安装小米 AIoT-IDE（支持 Windows/macOS/Ubuntu）。
2. 打开本目录（`watchapp/`）作为项目。
3. 选择小米手环 10 Pro 模拟器运行调试；或打包生成 rpk 安装到手环
   （需手环开启开发者模式，签名文件在打包时由 IDE 生成到 `sign/`）。

## 已知限制

- **息屏计时**：手环息屏后快应用可能被挂起，计时暂停；恢复亮屏后继续。
  长时间专注建议以「结束保存」写入的时长为准，或配合 Web 端使用。
- **token 过期**：后端 `auth_tokens` 有过期时间，失效后需重新复制。
- 课表编辑、专注航班动画等复杂功能保留在 Web 端，手环端只做查看与计时。
