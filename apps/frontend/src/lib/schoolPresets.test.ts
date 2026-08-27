import { describe, expect, it } from 'vitest'
import { CUSTOM_SCHOOL_ID, SCHOOL_PRESETS, detectPreset, detectPresetByUrl, matchesPreset } from './schoolPresets'

describe('school presets', () => {
  it('includes 新疆政法学院 with a full schedule', () => {
    const preset = SCHOOL_PRESETS.find((p) => p.id === 'xjzfu')
    expect(preset?.name).toBe('新疆政法学院')
    expect(preset?.periodTimes).toHaveLength(11)
    expect(preset?.periodTimes[0]).toEqual({ start: '10:00', end: '10:45' })
  })

  it('detects a matching preset and falls back to custom', () => {
    const preset = SCHOOL_PRESETS[0]
    expect(detectPreset(preset.periodTimes)).toBe('xjzfu')
    expect(detectPreset([{ start: '08:00', end: '08:45' }])).toBe(CUSTOM_SCHOOL_ID)
    expect(matchesPreset(preset.periodTimes, preset.periodTimes)).toBe(true)
    expect(matchesPreset([{ start: '09:00', end: '09:45' }], preset.periodTimes)).toBe(false)
  })

  it('detects the school from a website url', () => {
    expect(detectPresetByUrl('https://jwxt.xjzfu.edu.cn/jwapp/sys/homeapp/home/index.html')).toBe('xjzfu')
    expect(detectPresetByUrl('https://other.edu.cn')).toBe(CUSTOM_SCHOOL_ID)
  })
})
