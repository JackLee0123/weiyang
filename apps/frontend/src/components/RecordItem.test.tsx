import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordItem } from './RecordItem'
import type { RecordEntry } from '../lib/types'

vi.mock('../lib/queries', () => ({
  useRecordMutations: () => ({ update: { mutateAsync: vi.fn() } }),
}))

function record(overrides: Partial<RecordEntry> = {}): RecordEntry {
  return {
    id: 1,
    date: '2099-01-01',
    title: '写周报',
    content: '',
    duration_minutes: 90,
    is_completed: true,
    category: '工作',
    linked_plan_id: 7,
    source: 'manual',
    images: [],
    created_at: '2099-01-01T09:00:00',
    ...overrides,
  }
}

describe('RecordItem', () => {
  beforeEach(() => vi.clearAllMocks())

  it('计划完成同步来的记录会标出来', () => {
    render(<RecordItem record={record({ source: 'plan' })} onEdit={vi.fn()} />)
    expect(screen.getByText('写周报')).toBeInTheDocument()
    expect(screen.getByText('来自计划')).toBeInTheDocument()
    expect(screen.getByText(/90 分钟/)).toBeInTheDocument()
  })

  it('自己记的记录不带这个标记', () => {
    render(<RecordItem record={record()} onEdit={vi.fn()} />)
    expect(screen.queryByText('来自计划')).not.toBeInTheDocument()
  })
})
