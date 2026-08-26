import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('api client', () => {
  it('fetches plans from /api/plans', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 1 }]), { status: 200 }))
    const data = await api.fetchPlans()
    expect(data).toEqual([{ id: 1 }])
    expect(global.fetch).toHaveBeenCalledWith('/api/plans', expect.anything())
  })

  it('throws ApiError with backend detail on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: '计划标题不能为空' }), { status: 422 }))
    await expect(api.createPlan({ date: '2026-01-01', title: '' })).rejects.toThrow('计划标题不能为空')
  })

  it('returns undefined for 204', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    await expect(api.deletePlan(1)).resolves.toBeUndefined()
  })
})
