import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FocusFlightOverlay } from './FocusFlightOverlay'
import { usePlanMutations, usePlans, useRecordMutations } from '../lib/queries'
import type { Plan, RecordEntry } from '../lib/types'

vi.mock('../lib/queries', () => ({
  usePlans: vi.fn(),
  useRecordMutations: vi.fn(),
  usePlanMutations: vi.fn(),
}))

const createRecord = vi.fn()
const updatePlan = vi.fn()

const makePlan = (overrides: Partial<Plan> = {}): Plan => ({
  id: 7,
  date: '2026-08-24',
  title: '写周报',
  description: '',
  start_time: null,
  end_time: null,
  status: 'pending',
  priority: 'medium',
  category: '工作',
  created_at: '',
  updated_at: '',
  ...overrides,
})

beforeEach(() => {
  createRecord.mockReset().mockResolvedValue({ id: 1, date: '2026-08-24', title: '写周报' } as RecordEntry)
  updatePlan.mockReset().mockResolvedValue(makePlan({ status: 'done' }))
  vi.mocked(usePlans).mockReturnValue({ data: [] } as never)
  vi.mocked(useRecordMutations).mockReturnValue({ create: { mutateAsync: createRecord } } as never)
  vi.mocked(usePlanMutations).mockReturnValue({ update: { mutateAsync: updatePlan } } as never)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

const setCustomMinutes = (input: HTMLInputElement, value: string) => {
  fireEvent.change(input, { target: { value } })
}

const startFlight = (input: HTMLInputElement) => {
  setCustomMinutes(input, '5')
  fireEvent.click(screen.getByRole('button', { name: /登机起飞/ }))
}

const landFlight = (input: HTMLInputElement) => {
  startFlight(input)
  act(() => {
    vi.advanceTimersByTime(300_001)
  })
}

describe('FocusFlightOverlay', () => {
  it('renders the boarding stage with a ready launch button', () => {
    render(<FocusFlightOverlay onClose={vi.fn()} />)
    expect(screen.getByText('登机 · 设定你的航程')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /登机起飞/ })).toBeEnabled()
  })

  it('moves from boarding to flying', () => {
    render(<FocusFlightOverlay onClose={vi.fn()} />)
    const input = screen.getByPlaceholderText('自定义时长') as HTMLInputElement
    startFlight(input)

    expect(screen.getByText(/已飞行/)).toBeInTheDocument()
  })

  it('lands when time completes', () => {
    render(<FocusFlightOverlay onClose={vi.fn()} />)
    const input = screen.getByPlaceholderText('自定义时长') as HTMLInputElement
    landFlight(input)

    expect(screen.getByText('已抵达')).toBeInTheDocument()
  })

  it('records a general entry on landing when no plan is linked', async () => {
    const onClose = vi.fn()
    render(<FocusFlightOverlay onClose={onClose} />)
    const input = screen.getByPlaceholderText('自定义时长') as HTMLInputElement
    landFlight(input)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /完成并记一笔/ }))
    })

    expect(createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '专注 · 5 分钟',
        category: '其他',
        duration_minutes: 5,
        linked_plan_id: null,
        is_completed: true,
      }),
    )
    expect(onClose).toHaveBeenCalled()
    expect(updatePlan).not.toHaveBeenCalled()
  })

  it('completes a linked plan and records on landing', async () => {
    const plan = makePlan()
    vi.mocked(usePlans).mockReturnValue({ data: [plan] } as never)
    const onClose = vi.fn()
    render(<FocusFlightOverlay onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('关联计划（可选）'), { target: { value: String(plan.id) } })
    const input = screen.getByPlaceholderText('自定义时长') as HTMLInputElement
    landFlight(input)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /完成并记一笔/ }))
    })

    expect(createRecord).toHaveBeenCalledWith(expect.objectContaining({ title: '写周报', linked_plan_id: 7 }))
    expect(updatePlan).toHaveBeenCalledWith({ id: 7, payload: { status: 'done' } })
    expect(onClose).toHaveBeenCalled()
  })

  it('offers to record or discard when aborted mid-flight', async () => {
    const onClose = vi.fn()
    render(<FocusFlightOverlay onClose={onClose} />)
    const input = screen.getByPlaceholderText('自定义时长') as HTMLInputElement
    startFlight(input)

    fireEvent.click(screen.getByText('中止航班'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '记录本次专注' }))
    })

    expect(createRecord).toHaveBeenCalled()
    expect(updatePlan).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('ignores Escape while flying but closes during boarding', () => {
    const onClose = vi.fn()
    render(<FocusFlightOverlay onClose={onClose} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    onClose.mockClear()
    const input = screen.getByPlaceholderText('自定义时长') as HTMLInputElement
    setCustomMinutes(input, '5')
    fireEvent.click(screen.getByRole('button', { name: /登机起飞/ }))

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
