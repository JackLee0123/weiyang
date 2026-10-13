import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { format, startOfMonth } from 'date-fns'
import { describe, expect, it, vi } from 'vitest'
import { MemoryView } from './MemoryView'
import { toISO } from '../lib/date'
import type { MemoryReport } from '../lib/types'

const mocks = vi.hoisted(() => ({ useMemoryReport: vi.fn(), removeBatch: vi.fn() }))

vi.mock('../lib/queries', () => ({
  useMemoryReport: mocks.useMemoryReport,
  usePlanMutations: () => ({ removeBatch: { mutateAsync: mocks.removeBatch, isPending: false } }),
}))

function makeReport(overrides: Partial<MemoryReport> = {}): MemoryReport {
  const today = toISO(new Date())
  return {
    start: today,
    end: today,
    period_days: 1,
    records_count: 3,
    recorded_minutes: 60,
    active_days: 2,
    consecutive_recording_days: 2,
    total_plans: 3,
    done_plans: 1,
    unfinished_plans: 1,
    cancelled_plans: 1,
    self_plans: 2,
    self_done_plans: 1,
    done_records: 2,
    completion_rate: 0.6,
    by_category: { 工作: 2, 生活: 1 },
    top_categories: ['工作', '生活'],
    busiest_day: today,
    unfinished: [
      {
        id: 1,
        date: today,
        title: '写周报',
        description: '',
        status: 'pending',
        priority: 'medium',
        category: '工作',
        created_at: '',
        updated_at: '',
      },
    ],
    ...overrides,
  }
}

describe('MemoryView', () => {
  it('renders report overview and unfinished narrative', () => {
    mocks.useMemoryReport.mockReturnValue({ isLoading: false, data: makeReport() })

    render(<MemoryView />)

    expect(screen.getByText('回忆')).toBeInTheDocument()
    expect(screen.getByText('3 段')).toBeInTheDocument()
    expect(screen.getByText('写周报')).toBeInTheDocument()
    // 完成率与今日页同口径（自建计划 + 记一笔）
    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('switches to monthly report and shows the month label', () => {
    mocks.useMemoryReport.mockReturnValue({ isLoading: false, data: makeReport() })

    render(<MemoryView />)
    fireEvent.click(screen.getByText('月报'))

    expect(screen.getByText(format(startOfMonth(new Date()), 'yyyy年M月'))).toBeInTheDocument()
  })

  it('批量删除未完成计划会走确认弹窗', async () => {
    mocks.useMemoryReport.mockReturnValue({ isLoading: false, data: makeReport() })
    mocks.removeBatch.mockResolvedValue({ deleted: 1, skipped: [] })

    render(<MemoryView />)
    fireEvent.click(screen.getByLabelText('全选'))
    fireEvent.click(screen.getByText(/删除 1 项/))
    fireEvent.click(screen.getByRole('button', { name: '确认删除' }))

    await waitFor(() => expect(mocks.removeBatch).toHaveBeenCalledWith([1]))
  })
})
