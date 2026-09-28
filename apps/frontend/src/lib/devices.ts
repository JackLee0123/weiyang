import type { ConnectedDevice } from './types'

/** 手环端二维码里的载荷前缀，避免和别的二维码混淆。 */
export const DEVICE_CODE_PREFIX = 'EVP'

const CODE_RE = /^\d{6}$/

/**
 * 从扫码结果里解析出手环连接码。
 *
 * 兼容几种写法，方便以后换载荷或让系统相机也能扫：
 * `EVP:123456`、`everlong:123456`、纯 6 位数字，以及带 `pair=` / `c=` 的链接。
 */
export function parseConnectPayload(raw: string): string | null {
  const text = (raw ?? '').trim()
  if (!text) return null

  if (CODE_RE.test(text)) return text

  const prefixed = text.match(/^(?:evp|everlong|weiyang)\s*[:：]\s*(\d{6})$/i)
  if (prefixed) return prefixed[1]

  // 链接形式：`.../pair?c=123456`、`...?pair=123456`、`.../pair/123456`
  const query = text.match(/[?&](?:pair|c|code)=(\d{6})\b/i)
  if (query) return query[1]
  const path = text.match(/\/(?:pair|watch|link)\/(\d{6})\b/i)
  if (path) return path[1]

  return null
}

/** 手环二维码的载荷（与手环端约定一致）。 */
export function buildConnectPayload(code: string): string {
  return `${DEVICE_CODE_PREFIX}:${code}`
}

export function deviceKindLabel(kind: string): string {
  if (kind === 'watch') return '手环'
  return '网页端'
}

export function deviceTitle(device: ConnectedDevice): string {
  if (device.device_kind === 'watch') return device.device_label || '手环'
  return device.device_label || '浏览器登录'
}

export function formatDeviceTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
