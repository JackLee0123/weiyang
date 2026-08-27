import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TimetableView } from './TimetableView'
import type { Course } from '../lib/types'

const mocks = vi.hoisted(() => ({
  useTimetableSettings: vi.fn(),
  useCourses: vi.fn(),
  useTimetableMutations: vi.fn(),
}))

vi.mock('../lib/queries', () => ({
  useTimetableSettings: mocks.useTimetableSettings,
  useCourses: mocks.useCourses,
  useTimetableMutations: mocks.useTimetableMutations,
}))

const course: Course = {
  id: 1,
  term: '2025-2026-1',
  name: '高等数学',
  teacher: '张三',
  location: 'A101',
  day_of_week: 2,
  start_period: 1,
  end_period: 2,
  week_mask: '1111111111111111',
  created_at: '',
}

function setup() {
  mocks.useTimetableSettings.mockReturnValue({
    isLoading: false,
    data: { active_term: '2025-2026-1', week1_date: '2025-09-01', period_times: [{ start: '08:00', end: '08:45' }] },
  })
  mocks.useCourses.mockReturnValue({
    isLoading: false,
    data: { term: '2025-2026-1', courses: [course], settings: { active_term: '2025-2026-1', week1_date: '2025-09-01', period_times: [] } },
  })
  mocks.useTimetableMutations.mockReturnValue({
    generate: vi.fn().mockResolvedValue({ created: 1, skipped_past: 0, skipped_duplicate: 0 }),
    remove: vi.fn().mockResolvedValue(undefined),
    updateSettings: vi.fn().mockResolvedValue({}),
    save: vi.fn().mockResolvedValue({ term: '2025-2026-1', saved: 1 }),
  })
}

describe('TimetableView', () => {
  it('renders the header, term and week info', () => {
    setup()
    render(<TimetableView />)
    expect(screen.getByText('课表')).toBeInTheDocument()
    expect(screen.getByText(/2025-2026-1/)).toBeInTheDocument()
  })

  it('renders the imported course in the grid and list', () => {
    setup()
    render(<TimetableView />)
    expect(screen.getAllByText('高等数学').length).toBeGreaterThan(0)
    expect(screen.getByText(/张三/)).toBeInTheDocument()
  })
})
