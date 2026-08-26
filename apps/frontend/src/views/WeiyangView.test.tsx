import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WeiyangView } from './WeiyangView'
import { todayISO } from '../lib/date'
import type { Plan } from '../lib/types'

const mocks = vi.hoisted(() => ({
  useUnfinishedPlans: vi.fn(),
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
}))

vi.mock('../lib/queries', () => ({
  useUnfinishedPlans: mocks.useUnfinishedPlans,
  usePlanMutations: () => ({
    create: { mutateAsync: mocks.createPlan },
    update: { mutateAsync: mocks.updatePlan },
    remove: { mutateAsync: vi.fn() },
  }),
}))

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 1,
    date: todayISO(),
    title: '写周报',
    description: '',
    status: 'pending',
    priority: 'medium',
    category: '工作',
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

describe('WeiyangView', () => {
  it('groups today vs en-route unfinished plans', () => {
    mocks.useUnfinishedPlans.mockReturnValue({
      isLoading: false,
      data: [
        makePlan({ id: 1, date: todayISO(), title: '今日计划' }),
        makePlan({ id: 2, date: '2020-01-01', title: '历史记忆' }),
      ],
    })

    render(<WeiyangView />)

    expect(screen.getByText('今日仍飞来')).toBeInTheDocument()
    expect(screen.getByText('已在途 · 未央')).toBeInTheDocument()
    expect(screen.getByText('今日计划')).toBeInTheDocument()
    expect(screen.getByText('历史记忆')).toBeInTheDocument()
  })

  it('marks a today plan as done via update mutation', () => {
    mocks.useUnfinishedPlans.mockReturnValue({ isLoading: false, data: [makePlan({ id: 3 })] })
    mocks.updatePlan.mockResolvedValue(makePlan({ id: 3, status: 'done' }))

    render(<WeiyangView />)
    fireEvent.click(screen.getByText('完成抵达'))

    expect(mocks.updatePlan).toHaveBeenCalledWith({ id: 3, payload: { status: 'done' } })
  })

  it('carries a past plan forward by creating a new leg', async () => {
    mocks.useUnfinishedPlans.mockReturnValue({
      isLoading: false,
      data: [makePlan({ id: 4, date: '2020-01-01', title: '旧航段' })],
    })
    mocks.createPlan.mockResolvedValue(makePlan({ id: 5, date: todayISO() }))

    render(<WeiyangView />)
    fireEvent.click(screen.getByText('顺延为新航段'))
    expect(screen.getByText('顺延到哪一天？')).toBeInTheDocument()

    fireEvent.click(screen.getByText('顺延到位'))

    await waitFor(() => {
      expect(mocks.createPlan).toHaveBeenCalled()
    })
    const payload = mocks.createPlan.mock.calls[0][0]
    expect(payload.title).toBe('旧航段')
    expect(payload.status).toBe('pending')
  })
})
