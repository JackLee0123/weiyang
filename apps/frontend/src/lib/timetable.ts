import type { Course } from './types'

export function parseWeekLabel(label?: string | null): number[] {
  const text = (label ?? '').replace(/\s/g, '')
  if (!text) return []
  const odd = text.includes('单')
  const even = text.includes('双')
  const weeks = new Set<number>()
  const range = /(\d+)\s*[-–~]\s*(\d+)/g
  let match: RegExpExecArray | null
  while ((match = range.exec(text)) !== null) {
    const start = Number(match[1])
    const end = Number(match[2])
    for (let w = start; w <= end; w++) {
      if (odd && w % 2 === 0) continue
      if (even && w % 2 === 1) continue
      weeks.add(w)
    }
  }
  for (const token of text.split(/[第周,\s、]+/)) {
    if (/^\d+$/.test(token)) {
      const n = Number(token)
      if (odd && n % 2 === 0) continue
      if (even && n % 2 === 1) continue
      weeks.add(n)
    }
  }
  return [...weeks].sort((a, b) => a - b)
}

export function courseWeeks(course: Course): number[] {
  const mask = course.week_mask ?? ''
  if (/^[01]{8,32}$/.test(mask)) {
    const weeks: number[] = []
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === '1') weeks.push(i + 1)
    }
    if (weeks.length) return weeks
  }
  return parseWeekLabel(course.week_label)
}

export function courseActiveOn(course: Course, weekIndex: number): boolean {
  const weeks = courseWeeks(course)
  return weeks.length ? weeks.includes(weekIndex) : true
}

export function weekIndexFor(weekStart: string, week1Date?: string | null): number {
  if (!week1Date) return 1
  const start = new Date(weekStart + 'T00:00:00')
  const base = new Date(week1Date + 'T00:00:00')
  const diff = Math.round((start.getTime() - base.getTime()) / 86400000)
  return Math.floor(diff / 7) + 1
}
