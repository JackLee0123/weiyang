// 高德开放平台 Web 端 JS API key 与安全密钥。
// 这些值在客户端代码中可见（高德 Web 端与安全密钥本来就用于前端 JS），
// 建议通过 VITE_AMAP_KEY / VITE_AMAP_SECURITY 注入到 .env 覆盖。
const ENV_KEY = (import.meta.env.VITE_AMAP_KEY as string | undefined)?.trim() ?? ''
const ENV_SECURITY = (import.meta.env.VITE_AMAP_SECURITY as string | undefined)?.trim() ?? ''

// 开发时兜底值：让当前已运行的 Vite 服务也能直接生效（.env 改动需重启才被读取）。
export const AMAP_KEY = ENV_KEY || 'af8aeef3815892ee5815b96c61f38d6c'
export const AMAP_SECURITY = ENV_SECURITY || '6a8cdcfea78af8a873d700ce02cfc132'

// 测试环境下不加载高德，保证单测确定性；无 key 时也走离线地图。
export const AMAP_AVAILABLE = AMAP_KEY !== '' && import.meta.env.MODE !== 'test'
