import { describe, expect, it } from 'vitest'
import { formatMinutes, minutesParts } from './format'

describe('formatMinutes', () => {
  it('不足一小时用分钟表示', () => {
    expect(formatMinutes(0)).toBe('0 分钟')
    expect(formatMinutes(45)).toBe('45 分钟')
  })

  it('整小时省略分钟', () => {
    expect(formatMinutes(60)).toBe('1 小时')
    expect(formatMinutes(120)).toBe('2 小时')
  })

  it('带零头时小时与分钟都显示', () => {
    expect(formatMinutes(504)).toBe('8 小时 24 分钟')
    expect(formatMinutes(61)).toBe('1 小时 1 分钟')
  })
})

describe('minutesParts', () => {
  it('拆出数值与单位', () => {
    expect(minutesParts(45)).toEqual({ value: '45', unit: '分钟' })
    expect(minutesParts(120)).toEqual({ value: '2', unit: '小时' })
    expect(minutesParts(504)).toEqual({ value: '8 小时 24', unit: '分钟' })
  })
})
