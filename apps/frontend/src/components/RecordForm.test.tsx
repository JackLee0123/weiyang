import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordForm } from './RecordForm'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('../lib/queries', () => ({
  useRecordMutations: () => ({
    create: { mutateAsync: mocks.create },
    update: { mutateAsync: mocks.update },
    remove: { mutateAsync: mocks.remove },
  }),
}))

describe('RecordForm', () => {
  beforeEach(() => {
    mocks.create.mockReset().mockResolvedValue({ id: 1 })
    mocks.update.mockReset()
    mocks.remove.mockReset()
  })

  it('submits with an images array', async () => {
    render(<RecordForm defaultDate="2099-01-01" onClose={() => {}} />)
    expect(screen.getByText('图片（选填，最多 3 张）')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('今天做了什么？'), { target: { value: '写了周报' } })
    fireEvent.click(screen.getByRole('button', { name: '添加记录' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalled())
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ title: '写了周报', images: [] }))
  })

  it('计划同步来的记录不能在这里直接删除，并给出说明', () => {
    render(
      <RecordForm
        defaultDate="2099-01-01"
        initial={{
          id: 5,
          date: '2099-01-01',
          title: '写周报',
          content: '',
          is_completed: true,
          category: '工作',
          linked_plan_id: 3,
          source: 'plan',
          images: [],
          created_at: '2099-01-01T09:00:00',
        }}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText(/这条记录来自已完成的计划/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /删除/ })).toBeDisabled()
  })
})
