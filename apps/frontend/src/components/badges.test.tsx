import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PriorityBadge, StatusBadge } from './badges'

describe('badges', () => {
  it('renders done status', () => {
    render(<StatusBadge status="done" />)
    expect(screen.getByText('已抵达')).toBeInTheDocument()
  })

  it('renders high priority', () => {
    render(<PriorityBadge priority="high" />)
    expect(screen.getByText('高优先级')).toBeInTheDocument()
  })
})
