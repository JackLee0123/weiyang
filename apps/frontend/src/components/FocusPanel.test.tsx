import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FocusPanel } from './FocusPanel'
import type { RecordEntry } from '../lib/types'

function record(over: Partial<RecordEntry> = {}): RecordEntry {
  return {
    id: 1,
    date: '2026-09-27',
    title: '专注 · 30 分钟',
    content: '',
    duration_minutes: 30,
    is_completed: true,
    category: '学习',
    linked_plan_id: null,
    created_at: '2026-09-27T02:00:00Z',
    ...over,
  }
}

describe('FocusPanel', () => {
  it('显示当日专注的次数与时长', () => {
    render(
      <FocusPanel
        date="2026-09-27"
        records={[
          record({ id: 1, title: '数学题', duration_minutes: 269 }),
          record({ id: 2, title: '背单词', duration_minutes: 45 }),
        ]}
      />,
    )

    expect(screen.getByText('当日专注')).toBeInTheDocument()
    expect(screen.getByText('次数')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('时长')).toBeInTheDocument()
    expect(screen.getByText('5 小时 14')).toBeInTheDocument()
    expect(screen.getByText('9月27日')).toBeInTheDocument()
  })

  it('按项目展示占比', () => {
    render(
      <FocusPanel
        date="2026-09-27"
        records={[
          record({ id: 1, title: '数学题', duration_minutes: 270 }),
          record({ id: 2, title: '专业课', duration_minutes: 90 }),
        ]}
      />,
    )

    expect(screen.getByText('数学题')).toBeInTheDocument()
    expect(screen.getByText('75.0%')).toBeInTheDocument()
    expect(screen.getByText('专业课')).toBeInTheDocument()
    expect(screen.getByText('25.0%')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /专注时长分布饼图，共计 6 小时/ })).toBeInTheDocument()
  })

  it('没有专注记录时给出引导', () => {
    render(<FocusPanel date="2026-09-27" records={[record({ duration_minutes: null })]} />)

    expect(screen.getByText(/这一天还没有专注记录/)).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
