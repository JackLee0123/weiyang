// 高德开放平台 Web 端 JS API key 与安全密钥。
// 只从构建期环境变量读取（.env / CI Secrets），源码里不留任何兜底值：
// 仓库是公开的，写死的 key 会被第三方拿去刷额度。部署时请在服务器上的
// apps/frontend/.env 里配置这两项（deploy 脚本不会覆盖 .env）。
const ENV_KEY = (import.meta.env.VITE_AMAP_KEY as string | undefined)?.trim() ?? ''
const ENV_SECURITY = (import.meta.env.VITE_AMAP_SECURITY as string | undefined)?.trim() ?? ''

export const AMAP_KEY = ENV_KEY
export const AMAP_SECURITY = ENV_SECURITY

// 测试环境不加载高德，保证单测确定性；没有配置 key 时回落到离线 SVG 地图。
export const AMAP_AVAILABLE = AMAP_KEY !== '' && import.meta.env.MODE !== 'test'
