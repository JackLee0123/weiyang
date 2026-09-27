import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BackupPanel } from './BackupPanel'
import { api } from '../lib/api'

vi.mock('../lib/api', () => ({
  api: {
    exportBackup: vi.fn(),
    importBackup: vi.fn(),
  },
}))

const exportBackup = vi.mocked(api.exportBackup)
const importBackup = vi.mocked(api.importBackup)

const BACKUP = {
  version: 1,
  exported_at: '2026-09-27T00:00:00',
  plans: [{ id: 1, title: '计划' }],
  records: [{ id: 1, title: '记录' }],
} as never

function pickFile(contents: unknown) {
  const file = new File([JSON.stringify(contents)], 'backup.json', { type: 'application/json' })
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

describe('BackupPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    })
  })

  it('导出备份并提示数量', async () => {
    exportBackup.mockResolvedValue(BACKUP)
    render(<BackupPanel onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /导出备份文件/ }))

    await waitFor(() => expect(exportBackup).toHaveBeenCalledTimes(1))
    expect(await screen.findByText(/已导出 1 个计划、1 条记录/)).toBeInTheDocument()
  })

  it('导入前需要二次确认才覆盖数据', async () => {
    importBackup.mockResolvedValue({ imported_plans: 1, imported_records: 1 })
    render(<BackupPanel onClose={vi.fn()} />)

    pickFile(BACKUP)
    expect(await screen.findByText(/无法撤销|即将用/)).toBeInTheDocument()
    expect(importBackup).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /确认覆盖恢复/ }))
    await waitFor(() => expect(importBackup).toHaveBeenCalledTimes(1))
    expect(await screen.findByText(/已恢复 1 个计划、1 条记录/)).toBeInTheDocument()
  })

  it('拒绝无效的备份文件', async () => {
    render(<BackupPanel onClose={vi.fn()} />)

    pickFile({ version: 9, plans: [], records: [] })
    expect(await screen.findByText('不是有效的备份文件')).toBeInTheDocument()
    expect(importBackup).not.toHaveBeenCalled()
  })
})
