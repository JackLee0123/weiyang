import type { PeriodTime } from './types'

export interface SchoolPreset {
  id: string
  name: string
  baseUrl: string
  periodTimes: PeriodTime[]
}

export const SCHOOL_PRESETS: SchoolPreset[] = [
  {
    id: 'xjzfu',
    name: '新疆政法学院',
    baseUrl: 'https://jwxt.xjzfu.edu.cn',
    periodTimes: [
      { start: '10:00', end: '10:45' },
      { start: '10:50', end: '11:35' },
      { start: '11:50', end: '12:30' },
      { start: '12:35', end: '13:25' },
      { start: '13:30', end: '14:15' },
      { start: '16:00', end: '16:45' },
      { start: '16:55', end: '17:35' },
      { start: '17:50', end: '18:35' },
      { start: '18:40', end: '19:25' },
      { start: '20:30', end: '21:15' },
      { start: '21:20', end: '22:05' },
    ],
  },
]

export const CUSTOM_SCHOOL_ID = 'custom'

export function matchesPreset(times: PeriodTime[], preset: PeriodTime[]): boolean {
  return times.length === preset.length && times.every((t, i) => t.start === preset[i].start && t.end === preset[i].end)
}

export function detectPreset(times: PeriodTime[]): string {
  return SCHOOL_PRESETS.find((p) => matchesPreset(times, p.periodTimes))?.id ?? CUSTOM_SCHOOL_ID
}

export function detectPresetByUrl(url: string): string {
  const host = (u: string) => {
    const m = u.match(/^https?:\/\/([^/]+)/i)
    return m ? m[1].toLowerCase() : u.toLowerCase()
  }
  return SCHOOL_PRESETS.find((p) => host(p.baseUrl) === host(url))?.id ?? CUSTOM_SCHOOL_ID
}
