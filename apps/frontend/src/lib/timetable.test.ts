import { describe, expect, it } from 'vitest'
import { courseActiveOn, courseWeeks, parseWeekLabel, weekIndexFor } from './timetable'
import type { Course } from './types'

function course(overrides: Partial<Course> = {}): Course {
  return {
    id: 1,
    term: '2025-2026-1',
    name: '课',
    day_of_week: 1,
    start_period: 1,
    end_period: 2,
    created_at: '',
    ...overrides,
  }
}

describe('timetable helpers', () => {
  it('parses week labels', () => {
    expect(parseWeekLabel('1-8周')).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(parseWeekLabel('1-8周(单)')).toEqual([1, 3, 5, 7])
    expect(parseWeekLabel('1-8,10-12周')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12])
  })

  it('reads week mask and checks activity', () => {
    const c = course({ week_mask: '1111111100000000' })
    expect(courseWeeks(c)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(courseActiveOn(c, 3)).toBe(true)
    expect(courseActiveOn(c, 10)).toBe(false)
  })

  it('computes week index from week start and week 1', () => {
    expect(weekIndexFor('2025-09-08', '2025-09-01')).toBe(2)
    expect(weekIndexFor('2025-09-01', '2025-09-01')).toBe(1)
  })
})
