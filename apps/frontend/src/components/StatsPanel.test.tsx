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
  it('计划用时给出本周总量，并说明不含课表、今天占了多少', () => {
    render(<StatsPanel stats={stats} date="2026-09-28" dayLabel="今日" />)

    expect(screen.getByText('计划用时')).toBeInTheDocument()
    expect(screen.getByText('13 小时 35 分钟')).toBeInTheDocument()
    expect(screen.getByText('不含课表课程 · 今日 4 小时')).toBeInTheDocument()
  })

  it('查看别的日期时按该日期说话，且没有计划就标 0', () => {
    render(<StatsPanel stats={stats} date="2026-09-30" dayLabel="9月30日" />)

    expect(screen.getByText('不含课表课程 · 9月30日 0 分钟')).toBeInTheDocument()
  })

  it('日期不在统计区间内就只保留口径说明', () => {
    render(<StatsPanel stats={stats} date="2026-10-09" dayLabel="10月9日" />)

    expect(screen.getByText('不含课表课程')).toBeInTheDocument()
    expect(screen.queryByText(/10月9日/)).not.toBeInTheDocument()
  })

  it('完成率按「自建计划 + 记一笔」计算，并把两组数字摊开', () => {
    render(<StatsPanel stats={stats} date="2026-09-28" dayLabel="今日" />)

    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('计划 2/3 · 记录 1/2')).toBeInTheDocument()
  })

  it('还没有自建计划与记录时直接说清楚', () => {
    const empty: StatsOverview = {
      ...stats,
      self_plans: 0,
      self_done_plans: 0,
      records_count: 0,
      done_records: 0,
      completion_rate: 0,
    }
    render(<StatsPanel stats={empty} date="2026-09-28" dayLabel="今日" />)

    expect(screen.getByText('本周还没有自建计划或记一笔')).toBeInTheDocument()
  })
})
