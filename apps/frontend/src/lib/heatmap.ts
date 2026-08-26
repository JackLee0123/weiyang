import { addDays, startOfWeek } from 'date-fns'
import type { HeatmapDay } from './types'

export type Level = 0 | 1 | 2 | 3 | 4

export const LEVEL_CLASS = [
  'bg-slate-100 dark:bg-slate-700/50',
  'bg-emerald-100 dark:bg-emerald-400/20',
  'bg-emerald-300 dark:bg-emerald-400/50',
  'bg-emerald-500 dark:bg-emerald-400',
  'bg-emerald-700 dark:bg-emerald-300',
]

// 固定分档：0 / 1 / 2 / 3-4 / 5+
export function activityLevel(score: number): Level {
  if (score <= 0) return 0
  if (score === 1) return 1
  if (score === 2) return 2
  if (score <= 4) return 3
  return 4
}

export function buildYearRange(year: number): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

// 以周一为每周起始，覆盖某个自然年的完整周（首尾可能跨年，跨年格子由视图置灰）
export function buildCalendarWeeks(year: number): Date[][] {
  const jan1 = new Date(year, 0, 1)
  const dec31 = new Date(year, 11, 31)
  const start = startOfWeek(jan1, { weekStartsOn: 1 })
  const endWeekStart = startOfWeek(dec31, { weekStartsOn: 1 })
  const weeks: Date[][] = []
  let cursor = start
  while (cursor <= endWeekStart) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)))
    cursor = addDays(cursor, 7)
  }
  return weeks
}

export function scoreOf(day: HeatmapDay | undefined): number {
  // 偏向「在场」而非「完成」：记录（你出现了）权重更高。
  return day ? day.records_count * 2 + day.completed_plans : 0
}
