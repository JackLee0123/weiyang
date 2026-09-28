import { describe, expect, it } from 'vitest'
import { buildConnectPayload, deviceKindLabel, deviceTitle, parseConnectPayload } from './devices'

describe('parseConnectPayload', () => {
  it('识别手环二维码里的短载荷', () => {
    expect(parseConnectPayload('EVP:123456')).toBe('123456')
    expect(parseConnectPayload('evp：123456')).toBe('123456')
    expect(parseConnectPayload('everlong:654321')).toBe('654321')
  })

  it('也接受纯 6 位数字与链接形式', () => {
    expect(parseConnectPayload(' 123456 ')).toBe('123456')
    expect(parseConnectPayload('https://everlong.net.cn/pair?c=246810')).toBe('246810')
    expect(parseConnectPayload('https://everlong.net.cn/?pair=135790')).toBe('135790')
    expect(parseConnectPayload('https://everlong.net.cn/watch/112233')).toBe('112233')
  })

  it('不是手环码时返回 null', () => {
    expect(parseConnectPayload('')).toBeNull()
    expect(parseConnectPayload('https://example.com')).toBeNull()
    expect(parseConnectPayload('EVP:12345')).toBeNull()
    expect(parseConnectPayload('订单号 1234567890')).toBeNull()
  })

  it('与手环端约定的载荷一致', () => {
    expect(buildConnectPayload('123456')).toBe('EVP:123456')
    expect(parseConnectPayload(buildConnectPayload('123456'))).toBe('123456')
  })
})

describe('deviceTitle', () => {
  it('手环优先显示设备名，网页登录显示为浏览器登录', () => {
    const base = {
      id: 1,
      created_at: '2026-09-28T10:00:00',
      expires_at: '2026-10-28T10:00:00',
      is_current: false,
    }
    expect(deviceTitle({ ...base, device_kind: 'watch', device_label: '小米手环' })).toBe('小米手环')
    expect(deviceTitle({ ...base, device_kind: 'watch', device_label: null })).toBe('手环')
    expect(deviceTitle({ ...base, device_kind: 'web', device_label: null })).toBe('浏览器登录')
    expect(deviceKindLabel('watch')).toBe('手环')
    expect(deviceKindLabel('web')).toBe('网页端')
  })
})
