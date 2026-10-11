# Everlong Sync（Obsidian 插件）

把 Obsidian 笔记同步到 **未央 · Everlong** 网站，网页端以**富文本**展示（不是 Markdown 原文）。

## 工作原理

- 你在 Obsidian 里保存 / 新建 / 重命名 / 删除 `.md` 笔记时，插件把 Markdown 原文推送到网站后端；
- 后端用白名单把 Markdown 渲染成安全 HTML 存库；
- 网站「笔记」页直接按富文本展示，支持标题、列表、表格、代码块、任务列表、引用等。

## 安装（手动）

1. 在本目录执行 `pnpm install && pnpm build`（产出 `main.js`）。
2. 把 `main.js` 和 `manifest.json` 复制到你的库的
   `.obsidian/plugins/everlong-sync/` 目录。
3. 在 Obsidian「设置 → 第三方插件」里启用 **Everlong Sync**。

## 配置

| 设置 | 说明 |
| --- | --- |
| 服务器地址 | 网站根地址，如 `https://plan.example.com`（本地开发 `http://127.0.0.1:8000`），不要带 `/api` |
| API 密钥 | 在网站「笔记 → 同步设置 → 生成密钥」生成，以 `obsk_` 开头，只显示一次 |
| 同步目录 | 只同步该目录（含子目录）；留空 = 整个库 |
| 自动同步 | 保存后 2 秒自动推送（防抖）；关闭则只能手动同步 |

## 命令 / 入口

- 左侧云朵图标：**立即全量同步**（内容没变的笔记服务端会跳过）；
- 命令面板：`Everlong: 全量同步所有笔记到网站`、`Everlong: 同步当前笔记到网站`；
- 状态栏显示同步状态；
- 设置页有「测试连接」按钮验证密钥。

## 安全

- 密钥在服务端只存 SHA-256 哈希，传输用 HTTP 头 `X-Obsidian-Key`；
- 建议网站开 HTTPS；
- 重新生成密钥后旧密钥立即失效。
