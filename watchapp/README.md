# 未央 · 手环端（Xiaomi Vela 快应用，离线版）

面向 **小米手环 10 / 10 Pro**（Xiaomi Vela OS 快应用）的「未央 Everlong」companion 应用。
两块屏形态不同（10 Pro 为矩形 336×480，10 为胶囊形 212×520），页面样式用媒体查询
按屏幕形状与 dp 宽度分别适配——`@media (shape: pill-shaped)` 针对胶囊屏放大字号，
`@media (max-width: 190)` 覆盖所有手环。

功能：

- **当日专注**：手环上的专注计时，结束后记在本机；统计页只汇总手环本地记录
- **课表**：按周次过滤的每日课程列表、左右切换星期、当前课程高亮、节次时间显示

## 为什么是离线的

手环上的快应用**没有联网能力**，这是平台限制不是配置问题。官方文档
[数据请求 fetch](https://iot.mi.com/vela/quickapp/zh/features/network/fetch.html)
的设备支持表写得很清楚：

| 接口 | 小米手环 10 | 支持的手表 |
| --- | --- | --- |
| `system.fetch` 数据请求 | 不支持 | Watch S3 / S4 / S5、REDMI Watch 5 / 6、S1 Pro |
| `system.request` 下载 | 不支持 | 同上 |
| `system.uploadtask` 上传 | 不支持 | 同上 |
| `system.network` 网络信息 | 不支持 | 同上 |

所以「手环扫码连接账号 → 直接调后端接口」那一版（v1.0.x）在真机上必然失败：请求
在蓝牙那一跳就断了，界面显示 `生成失败：网络错误 (6)`。**模拟器里能跑通是因为它跑在
电脑上、用的是电脑的网络**，这一点很容易骗过自己。

官方唯一开给「手环 ↔ 手机」的通道是 `system.interconnect`，但要自己写一个包名和签名
都与快应用一致的安卓 App，而且手环 10 是否支持 interconnect 官方没给支持表。
综合考虑后，手环端改成**离线快照**：数据在打包时注入，运行期完全不联网。

## 目录结构

```
watchapp/
├── package.json                  # build / release / sync 脚本
├── scripts/
│   └── sync.mjs                  # 从后端拉课表，写进 src/common/data/sync.js
├── src/
│   ├── app.ux                    # 应用入口（加载本地配置）
│   ├── manifest.json             # 快应用配置（包名/路由/features）
│   ├── common/
│   │   ├── data/
│   │   │   └── sync.js           # 同步生成的数据快照（课表 + 学期设置）
│   │   ├── images/logo.png       # 应用图标（取自 brand/final-512.png）
│   │   └── scripts/
│   │       ├── store.js          # 主题偏好 + 底层存储读写
│   │       ├── records.js        # 本机专注记录（读取、追加、裁剪）
│   │       ├── syncdata.js       # 读取打包时注入的离线数据
│   │       ├── focus.js          # 当日专注统计（移植自 web lib/focus.ts）
│   │       ├── timetable.js      # 周次/课程工具（移植自 web lib/timetable.ts）
│   │       └── device.js         # 屏幕形状与尺寸（胶囊屏/矩形屏分流）
│   └── pages/
│       ├── index/                # 首页（两个入口 + 今日概览）
│       ├── focus/                # 当日专注（本机统计 + 计时）
│       ├── timetable/            # 课表（今日课程，左右切换星期）
│       └── settings/             # 离线数据状态 / 亮色模式
└── sign/                         # 打包签名（在 AIoT-IDE 中生成，不提交）
```

## 更新数据（学期初 / 课表变动后）

最省事的方式是**在网页端点一下**：登录 → 侧栏「设备连接」→「生成并下载 rpk」。
服务端会用你当前的课表打一个包给你下载，电脑上什么都不用装（前提是部署方已经
装好 Node、跑过 `npm install` 并配置了签名，见仓库根的 `deploy.sh`）。

想自己改样式或离线构建，就本地来：

```bash
cd watchapp
npm run sync      # 拉课表 → 写 src/common/data/sync.js
npm run build     # 产出 dist/cn.everlong.watch.debug.<版本>.rpk
```

然后用 **AstroBox** 把 `dist/` 里的 rpk 推到手环（本项目实测就是这条安装路径）。

> 签名要固定：`sign/debug/{private.pem,certificate.pem}` 一旦定下来，本机打包和
> 服务端打包必须用**同一套**，否则手环会把它们当成两个应用。这两个文件不进 Git，
> 本机放 `watchapp/sign/debug/`，服务器放 `/opt/everlong/watchapp/sign/debug/`
> （部署脚本已经排除该目录，不会被 `rsync --delete` 删掉）。

首次跑 `npm run sync` 会**自动用默认浏览器打开一个带连接码的页面**，在网页端
「设备连接」里点一下「连接」就完成授权（浏览器没自动打开，就手动访问终端里打印的
链接，或者复制那 6 位连接码手输）。令牌缓存在 `watchapp/.sync-token.json`（默认 30 天，
已 gitignore；也可以用 `EVERLONG_TOKEN=... npm run sync` 直接给令牌）。
跟以前手环自己扫码是同一条后端链路，只是这次由电脑上的脚本扮演设备。

`sync.js` 里写入同步时间、账号、课程列表与学期设置（`week1_date`、`period_times`、
`active_term`），手环端只读这份快照。**课表变了要重新 sync + build + 推送**，
手环不会自己更新。

## 给其他用户：从零到装上（通用流程）

同一套代码，任何有 Everlong 账号的人都能量身做一个。**每个人的课表不同，所以不能
共用一个 rpk**——必须各自跑一次「拉数据 → 打包 → 推送」。

需要准备：一台电脑（Windows / macOS 都行）、[Node.js](https://nodejs.org/) 18 或更高、
[AstroBox](https://astrobox.online/)，以及一个 Everlong 账号。

```bash
# 1) 拿到代码（仓库里的 watchapp/ 目录，或者别人打包给你的压缩包）
cd watchapp

# 2) 装依赖（只需第一次）
npm install

# 3) 拉自己的课表 → 写进 src/common/data/sync.js
npm run sync

# 4) 打包
npm run build      # 产出 dist/cn.everlong.watch.debug.<版本>.rpk

# 5) 用 AstroBox 把 rpk 推送到手环（手环连电脑蓝牙）
```

第 3 步会**自动打开一个带连接码的页面**（形如 `https://everlong.net.cn/?code=123456`）：
在网页端「设备连接」里点一下「连接」就完成授权，不用抄码。浏览器没自动打开的话，
手动访问终端里打印的链接即可，也可以直接输入那 6 位连接码。脚本随即拿到令牌
（存在 `watchapp/.sync-token.json`，默认 30 天），之后 `npm run sync` 直接可用。
想省一步就用 `npm run make`（= sync + build）。

Windows 用户也可以直接跑封装脚本，它会自动装依赖、同步、打包，并打印 rpk 路径：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-with-sync.ps1
```

**自建部署**：默认连的是 `https://everlong.net.cn`，换自己的服务器加个环境变量即可——
macOS/Linux 用 `EVERLONG_BASE_URL=https://你的域名 npm run sync`，PowerShell 用
`$env:EVERLONG_BASE_URL='https://你的域名'; npm run sync`。

**常见问题**

| 现象 | 处理 |
| --- | --- |
| 手环上「课表」空白并提示没有数据 | 没跑过 `npm run sync`，或者跑完没重新 build / 推送 |
| 手环上记完专注，网页端看不到 | 设计如此：手环离线运行，本机记录不上传 |
| `npm run sync` 报 401 | 缓存令牌过期或被解绑：删掉 `.sync-token.json` 再跑一次重新配对 |
| AstroBox 推不上去 | 确认手环连着电脑、开发者模式已开；装不上时先卸载旧包再装 |
| 手环上还是老课表 | 数据是静态快照，课表改了要重跑 sync + build + 推送 |

## 本机专注记录

计时结束后记录写进 `@system.storage` 的 `focusRecords`（最多保留最近 80 条），
结构 `{ date, title, duration_minutes, linked_plan_id }`，统计页按天汇总。
这些记录**不会上传**，网页端看不到；网页端的专注数据也不会出现在手环上，
两边各记各的。

## 开发调试（AIoT-IDE）

1. 安装小米 AIoT-IDE（Windows/macOS/Ubuntu）。
2. 打开本目录（`watchapp/`）作为项目。
3. 选小米手环 10 Pro 模拟器调试，或打包 rpk 安装到真机
   （需手环开启开发者模式，签名文件由 IDE 生成到 `sign/`）。

> 模拟器有网络、真机没有。任何「模拟器里能联网」的结论都不能外推到真机——
> 这是 v1.0.x 踩过的坑。

## 已知限制

- **不能联网**（见上）：连接账户、拉取当天数据、上传记录都不做了。
- **课表要重新推送**：数据是静态快照，改了课表得重跑 sync + build + 安装。
- **记录不互通**：手环本地记录不会进网页端，网页端数据也不会进手环。
- **息屏计时**：手环息屏后快应用可能被挂起，计时暂停；亮屏后继续。长时间专注
  建议以结束时保存的时长为准。
