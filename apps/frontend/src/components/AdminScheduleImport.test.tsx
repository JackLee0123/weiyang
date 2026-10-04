import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminScheduleImport } from './AdminScheduleImport'
import { api } from '../lib/api'
import type { AdminUser } from '../lib/types'

vi.mock('../lib/api', () => ({
  api: {
    previewAdminSchedule: vi.fn(),
    importAdminSchedule: vi.fn(),
    rollbackAdminSchedule: vi.fn(),
    downloadAdminScheduleTemplate: vi.fn(),
  },
}))

const previewAdminSchedule = vi.mocked(api.previewAdminSchedule)
const importAdminSchedule = vi.mocked(api.importAdminSchedule)
const rollbackAdminSchedule = vi.mocked(api.rollbackAdminSchedule)

const USERS: AdminUser[] = [
  { id: 1, email: 'admin@example.com', name: '管理员', is_admin: true, is_active: true, created_at: '2026-01-01T00:00:00' },
  { id: 2, email: 'member@example.com', name: '成员', is_admin: false, is_active: true, created_at: '2026-01-01T00:00:00' },
]

const PREVIEW = {
  rows: [
    {
      date: '2099-01-01',
      title: '晨会',
      description: '',
      start_time: '09:00',
      end_time: '10:00',
      category: '工作',
      priority: 'medium' as const,
      status: 'pending' as const,
    },
  ],
  warnings: [],
  skipped: 0,
  columns: { date: '日期', title: '标题' },
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AdminScheduleImport meId={1} users={USERS} />
    </QueryClientProvider>,
  )
}

function pickFile() {
  const file = new File(['x'], 'schedule.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
  return file
}

describe('AdminScheduleImport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() })
  })

  it('解析预览后可以导入给自己', async () => {
    previewAdminSchedule.mockResolvedValue(PREVIEW)
    importAdminSchedule.mockResolvedValue({
      created: 1,
      skipped_past: 0,
      skipped_duplicate: 0,
      targets: [{ user_id: 1, name: '管理员', created: 1, skipped_past: 0, skipped_duplicate: 0 }],
      plan_ids: [10],
    })
    renderPanel()

    pickFile()
    fireEvent.click(screen.getByRole('button', { name: /解析预览/ }))
    expect(await screen.findByText('解析出 1 条日程')).toBeInTheDocument()
    expect(screen.getByText('晨会')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /确认导入/ }))
    await waitFor(() => expect(importAdminSchedule).toHaveBeenCalledTimes(1))
    expect(importAdminSchedule.mock.calls[0][0]).toMatchObject({ include_self: true, user_ids: [] })
    expect(await screen.findByText(/已写入 1 条日程/)).toBeInTheDocument()
  })

  it('勾选其他用户后一起导入，并可撤销', async () => {
    previewAdminSchedule.mockResolvedValue(PREVIEW)
    importAdminSchedule.mockResolvedValue({
      created: 2,
      skipped_past: 0,
      skipped_duplicate: 0,
      targets: [
        { user_id: 1, name: '管理员', created: 1, skipped_past: 0, skipped_duplicate: 0 },
        { user_id: 2, name: '成员', created: 1, skipped_past: 0, skipped_duplicate: 0 },
      ],
      plan_ids: [10, 11],
    })
    rollbackAdminSchedule.mockResolvedValue({ deleted: 2 })
    renderPanel()

    pickFile()
    fireEvent.click(screen.getByRole('button', { name: /解析预览/ }))
    await screen.findByText('解析出 1 条日程')

    fireEvent.click(screen.getByRole('checkbox', { name: /成员/ }))
    expect(await screen.findByText('将写入 2 人 × 1 条')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /确认导入/ }))
    await waitFor(() => expect(importAdminSchedule).toHaveBeenCalledTimes(1))
    expect(importAdminSchedule.mock.calls[0][0]).toMatchObject({ include_self: true, user_ids: [2] })

    fireEvent.click(await screen.findByRole('button', { name: /撤销本次导入/ }))
    await waitFor(() => expect(rollbackAdminSchedule).toHaveBeenCalledWith([10, 11]))
    expect(await screen.findByText(/已撤销本次导入，删除 2 条日程/)).toBeInTheDocument()
  })

  it('解析失败时给出提示', async () => {
    previewAdminSchedule.mockRejectedValue(new Error('没有识别出表头'))
    renderPanel()

    pickFile()
    fireEvent.click(screen.getByRole('button', { name: /解析预览/ }))
    expect(await screen.findByText('没有识别出表头')).toBeInTheDocument()
    expect(importAdminSchedule).not.toHaveBeenCalled()
  })
})
