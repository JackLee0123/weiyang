import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlanForm } from './PlanForm'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('../lib/queries', () => ({
  usePlanMutations: () => ({
    create: { mutateAsync: mocks.create },
    update: { mutateAsync: mocks.update },
    remove: { mutateAsync: mocks.remove },
  }),
}))

describe('PlanForm', () => {
  beforeEach(() => {
    mocks.create.mockReset().mockResolvedValue({ id: 1 })
    mocks.update.mockReset()
    mocks.remove.mockReset()
  })

  it('submits with an images array', async () => {
    render(<PlanForm defaultDate="2099-01-01" onClose={() => {}} />)
    expect(screen.getByText('图片（选填，最多 3 张）')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('例如：写周报'), { target: { value: '写周报' } })
    fireEvent.click(screen.getByRole('button', { name: '添加计划' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalled())
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ title: '写周报', images: [] }))
  })
})
