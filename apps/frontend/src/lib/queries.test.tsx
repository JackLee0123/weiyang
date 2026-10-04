import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlanMutations, useRecords } from './queries'
import { api } from './api'

vi.mock('./api', () => ({
  api: {
    fetchRecords: vi.fn(),
    updatePlan: vi.fn(),
  },
}))

const fetchRecords = vi.mocked(api.fetchRecords)
const updatePlan = vi.mocked(api.updatePlan)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('usePlanMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchRecords.mockResolvedValue([])
    updatePlan.mockResolvedValue({} as never)
  })

  it('勾选完成后会刷新记录列表（记录是同步生成的那条）', async () => {
    const { result } = renderHook(
      () => ({ records: useRecords({ start: '2026-10-04', end: '2026-10-04' }), plans: usePlanMutations() }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.records.isSuccess).toBe(true))
    expect(fetchRecords).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.plans.update.mutateAsync({ id: 1, payload: { status: 'done' } })
    })

    await waitFor(() => expect(fetchRecords).toHaveBeenCalledTimes(2))
  })
})
