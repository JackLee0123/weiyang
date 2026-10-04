import { describe, expect, it } from 'vitest'
import { summarizeFocus } from './focus'
import type { RecordEntry } from './types'

function record(over: Partial<RecordEntry> = {}): RecordEntry {
  return {
    id: 1,
    date: '2026-09-27',
    title: '记录',
    content: '',
    duration_minutes: 30,
    is_completed: true,
    category: '学习',
    linked_plan_id: null,
    created_at: '2026-09-27T02:00:00Z',
    ...over,
  }
}

describe('summarizeFocus', () => {
  it('只统计填了用时的记录', () => {
    const summary = summarizeFocus([
      record({ id: 1, duration_minutes: 30 }),
      record({ id: 2, duration_minutes: 0 }),
      record({ id: 3, duration_minutes: null }),
      record({ id: 4, duration_minutes: undefined }),
    ])

    expect(summary.count).toBe(1)
    expect(summary.minutes).toBe(30)
    expect(summary.slices).toHaveLength(1)
  })

  it('按关联计划聚合，计划名优先于记录标题', () => {
    const planTitles = new Map([[7, '数学题']])
    const summary = summarizeFocus(
      [
        record({ id: 1, title: '刷题', duration_minutes: 60, linked_plan_id: 7 }),
        record({ id: 2, title: '刷题', duration_minutes: 30, linked_plan_id: 7 }),
      ],
      planTitles,
    )

    expect(summary.slices).toHaveLength(1)
    expect(summary.slices[0].label).toBe('数学题')
    expect(summary.slices[0].minutes).toBe(90)
    expect(summary.slices[0].count).toBe(2)
  })

  it('未关联计划的自动专注记录归为「未关联计划」', () => {
    const summary = summarizeFocus([
      record({ id: 1, title: '专注 · 25 分钟', duration_minutes: 25 }),
      record({ id: 2, title: '专注：50 分钟', duration_minutes: 50 }),
    ])

    expect(summary.slices).toHaveLength(1)
    expect(summary.slices[0].label).toBe('未关联计划')
    expect(summary.slices[0].minutes).toBe(75)
  })

  it('按时长倒序排列并给出占比', () => {
    const summary = summarizeFocus([
      record({ id: 1, title: '专业课', duration_minutes: 60 }),
      record({ id: 2, title: '背单词', duration_minutes: 30 }),
      record({ id: 3, title: '政治', duration_minutes: 10 }),
    ])

    expect(summary.minutes).toBe(100)
    expect(summary.slices.map((s) => s.label)).toEqual(['专业课', '背单词', '政治'])
    expect(summary.slices.map((s) => s.percent)).toEqual([60, 30, 10])
    expect(summary.slices.reduce((sum, s) => sum + s.percent, 0)).toBe(100)
  })

  it('分片过多时把零碎的合并成「其他」', () => {
    const records = ['语文', '数学', '英语', '物理', '化学', '生物', '历史'].map((title, index) =>
      record({ id: index + 1, title, duration_minutes: 10 }),
    )
    const summary = summarizeFocus(records)

    expect(summary.slices).toHaveLength(6)
    expect(summary.slices[5].label).toBe('其他')
    expect(summary.slices[5].minutes).toBe(20)
    expect(summary.count).toBe(7)
  })

  it('项目不超过上限时全部保留，不出现「其他」', () => {
    const records = ['语文', '数学', '英语', '物理', '化学', '生物'].map((title, index) =>
      record({ id: index + 1, title, duration_minutes: 10 }),
    )
    const summary = summarizeFocus(records)

    expect(summary.slices).toHaveLength(6)
    expect(summary.slices.some((slice) => slice.label === '其他')).toBe(false)
  })

  it('没有专注记录时返回空分布', () => {
    const summary = summarizeFocus([])
    expect(summary).toEqual({ count: 0, minutes: 0, slices: [], untimed: [] })
  })

  it('完成的计划没填时间时：计次数、列出来，但不进时长分布', () => {
    const summary = summarizeFocus([
      record({ id: 1, title: '词汇课', duration_minutes: null, source: 'plan', linked_plan_id: 11 }),
      record({ id: 2, title: '阅读课1', duration_minutes: null, source: 'plan', linked_plan_id: 12 }),
    ])

    expect(summary.count).toBe(2)
    expect(summary.minutes).toBe(0)
    expect(summary.slices).toEqual([])
    expect(summary.untimed.map((item) => item.label)).toEqual(['词汇课', '阅读课1'])
  })

  it('完成的计划填了时间就照常进分布', () => {
    const summary = summarizeFocus([
      record({ id: 1, title: '写周报', duration_minutes: 90, source: 'plan', linked_plan_id: 3 }),
    ])
    expect(summary.count).toBe(1)
    expect(summary.minutes).toBe(90)
    expect(summary.slices[0].label).toBe('写周报')
    expect(summary.untimed).toEqual([])
  })

  it('自己记的、没填用时的记录仍然不计入专注', () => {
    const summary = summarizeFocus([record({ id: 1, title: '随手一记', duration_minutes: null, source: 'manual' })])
    expect(summary).toEqual({ count: 0, minutes: 0, slices: [], untimed: [] })
  })
})
import { letterName, nextFocusName } from './focus'

describe('letterName', () => {
  it('按 a、b、c 顺序命名，超过 z 进位', () => {
    expect(letterName(0)).toBe('a')
    expect(letterName(1)).toBe('b')
    expect(letterName(25)).toBe('z')
    expect(letterName(26)).toBe('aa')
    expect(letterName(27)).toBe('ab')
  })
})

describe('nextFocusName', () => {
  const record = (minutes: number) => ({ duration_minutes: minutes }) as never

  it('按当天已有的专注段数顺延', () => {
    expect(nextFocusName([])).toBe('a')
    expect(nextFocusName([record(25)])).toBe('b')
    expect(nextFocusName([record(25), record(50)])).toBe('c')
  })

  it('没有时长的记录不计入', () => {
    expect(nextFocusName([record(0), record(25), record(0)])).toBe('b')
  })
})
