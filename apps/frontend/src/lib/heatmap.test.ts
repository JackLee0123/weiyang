import { format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { activityLevel, buildCalendarWeeks, buildYearRange, scoreOf } from './heatmap'

describe('activityLevel', () => {
  it('maps scores to fixed levels', () => {
    expect(activityLevel(0)).toBe(0)
    expect(activityLevel(1)).toBe(1)
    expect(activityLevel(2)).toBe(2)
    expect(activityLevel(3)).toBe(3)
    expect(activityLevel(4)).toBe(3)
    expect(activityLevel(5)).toBe(4)
    expect(activityLevel(20)).toBe(4)
  })
})

describe('scoreOf', () => {
  it('weights records (在场) more heavily than completed plans', () => {
    expect(scoreOf({ date: '2026-08-24', completed_plans: 2, records_count: 0 })).toBe(2)
    expect(scoreOf({ date: '2026-08-24', completed_plans: 0, records_count: 1 })).toBe(2)
    expect(scoreOf(undefined)).toBe(0)
  })
})

describe('buildYearRange', () => {
  it('returns Jan 1 to Dec 31 of the given year', () => {
    expect(buildYearRange(2026)).toEqual({ start: '2026-01-01', end: '2026-12-31' })
  })
})

describe('buildCalendarWeeks', () => {
  it('builds Monday-aligned week columns spanning the whole year', () => {
    const weeks = buildCalendarWeeks(2026)

    for (const week of weeks) {
      expect(format(week[0], 'EEEE')).toBe('Monday')
      expect(week.length).toBe(7)
    }

    const all = weeks.flat()
    expect(all.some((d) => format(d, 'yyyy-MM-dd') === '2026-01-01')).toBe(true)
    expect(all.some((d) => format(d, 'yyyy-MM-dd') === '2026-12-31')).toBe(true)
    expect(weeks.length).toBeGreaterThanOrEqual(52)
    expect(weeks.length).toBeLessThanOrEqual(54)
  })
})
