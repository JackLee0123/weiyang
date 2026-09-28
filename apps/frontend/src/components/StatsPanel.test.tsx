import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatsPanel } from './StatsPanel'
import type { StatsOverview } from '../lib/types'

const stats: StatsOverview = {
  start: '2026-09-28',
  end: '2026-10-04',
  total_plans: 7,
  done_plans: 3,
  cancelled_plans: 1,
  self_plans: 3,
  self_done_plans: 2,
  records_count: 2,
  done_records: 1,
  completion_rate: 0.6,
  planned_minutes: 815,
  recorded_minutes: 0,
  by_category: {},
  days: [
    { date: '2026-09-28', total_plans: 2, done_plans: 2, planned_minutes: 240, records_count: 0, recorded_minutes: 0 },
    { date: '2026-09-29', total_plans: 2, done_plans: 1, planned_minutes: 240, records_count: 0, recorded_minutes: 0 },
  ],
  consecutive_recording_days: 0,
}

describe('StatsPanel', () => {
  it('展示本周概览的四个数字', () => {
    render(<StatsPanel stats={stats} />)

    expect(screen.getByText('连续记录')).toBeInTheDocument()
    expect(screen.getByText('0 天')).toBeInTheDocument()
    expect(screen.getByText('0 分钟')).toBeInTheDocument()
    expect(screen.getByText('计划用时')).toBeInTheDocument()
    expect(screen.getByText('13 小时 35 分钟')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('卡片里不再有多余的小字说明', () => {
    render(<StatsPanel stats={stats} />)

    expect(screen.queryByText(/不含课表/)).not.toBeInTheDocument()
    expect(screen.queryByText(/计划 \d+\/\d+/)).not.toBeInTheDocument()
  })
})
