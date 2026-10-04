import type { RecordEntry } from './types'

/**
 * 当日专注的统计口径：当天「有用时」的记录即为一段专注，
 * 包括「专注航班」写入的记录和手动填了用时的记录。
 */
export interface FocusSlice {
  key: string
  label: string
  minutes: number
  count: number
  percent: number
  color: string
}

export interface FocusSummary {
  count: number
  minutes: number
  slices: FocusSlice[]
  /** 来自已完成计划、但计划里没写时间的条目：算「今天做过」，只是不计入时长 */
  untimed: FocusItem[]
}

export interface FocusItem {
  key: string
  label: string
  count: number
  /** 这一组里的第一条记录，点一下可以直接去改它的用时 */
  recordId?: number
}

/** 饼图配色，深浅色主题下都保持足够对比度。 */
export const FOCUS_COLORS = [
  '#f472b6',
  '#5eead4',
  '#93c5fd',
  '#fbbf24',
  '#a5b4fc',
  '#34d399',
  '#fb923c',
  '#c4b5fd',
]

/** 超过这个数量的分片合并成「其他」，避免饼图碎成一片。 */
const MAX_SLICES = 6
export const UNLINKED_LABEL = '未关联计划'
export const OTHER_LABEL = '其他'

const AUTO_FOCUS_TITLE = /^专注\s*[·:：]/

/** 0 → a，25 → z，26 → aa：专注记录的默认名称。 */
export function letterName(index: number): string {
  let n = Math.max(0, Math.floor(index || 0))
  let name = ''
  do {
    name = String.fromCharCode(97 + (n % 26)) + name
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return name
}

/** 下一段专注的默认名：当天已记了几段就顺延到第几个字母，之后可以手动改名。 */
export function nextFocusName(records: RecordEntry[]): string {
  const used = records.filter((record) => Math.round(record.duration_minutes ?? 0) > 0).length
  return letterName(used)
}

export function focusSliceLabel(record: RecordEntry, planTitle?: string): string {
  if (planTitle) return planTitle
  const title = (record.title ?? '').trim()
  if (!title || AUTO_FOCUS_TITLE.test(title)) return UNLINKED_LABEL
  return title
}

export function summarizeFocus(records: RecordEntry[], planTitles?: Map<number, string>): FocusSummary {
  const groups = new Map<string, { label: string; minutes: number; count: number }>()
  const untimedGroups = new Map<string, FocusItem>()
  let count = 0
  let minutes = 0

  for (const record of records) {
    const duration = Math.max(0, Math.round(record.duration_minutes ?? 0))
    // 填了用时的记录算一段专注；勾选完成计划同步过来的记录，即使没填用时也算今天做过的事
    const isPlanItem = record.source === 'plan' && record.is_completed
    if (duration <= 0 && !isPlanItem) continue

    const label = focusSliceLabel(record, record.linked_plan_id ? planTitles?.get(record.linked_plan_id) : undefined)
    if (duration <= 0) {
      const item =
        untimedGroups.get(label) ??
        { key: `untimed-${untimedGroups.size}-${label}`, label, count: 0, recordId: record.id }
      item.count += 1
      untimedGroups.set(label, item)
      count += 1
      continue
    }
    const group = groups.get(label) ?? { label, minutes: 0, count: 0 }
    group.minutes += duration
    group.count += 1
    groups.set(label, group)
    count += 1
    minutes += duration
  }

  const untimed = [...untimedGroups.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-Hans-CN'),
  )

  const sorted = [...groups.values()].sort(
    (a, b) => b.minutes - a.minutes || a.label.localeCompare(b.label, 'zh-Hans-CN'),
  )
  // 超过 MAX_SLICES 才合并：留一格给「其他」，零碎的项目并到一起
  const needsMerge = sorted.length > MAX_SLICES
  const head = needsMerge ? sorted.slice(0, MAX_SLICES - 1) : sorted
  const tail = needsMerge ? sorted.slice(MAX_SLICES - 1) : []
  const merged = tail.length
    ? [
        ...head,
        {
          label: OTHER_LABEL,
          minutes: tail.reduce((sum, group) => sum + group.minutes, 0),
          count: tail.reduce((sum, group) => sum + group.count, 0),
        },
      ]
    : head

  const slices: FocusSlice[] = merged.map((group, index) => ({
    key: `${index}-${group.label}`,
    label: group.label,
    minutes: group.minutes,
    count: group.count,
    percent: minutes > 0 ? Math.round((group.minutes / minutes) * 1000) / 10 : 0,
    color: FOCUS_COLORS[index % FOCUS_COLORS.length],
  }))

  return { count, minutes, slices, untimed }
}
