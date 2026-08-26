import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CHANGELOG } from '../lib/changelog'
import { ChangelogView } from './ChangelogView'

describe('ChangelogView', () => {
  it('renders the header and current version', () => {
    render(<ChangelogView />)
    expect(screen.getByText('更新日志')).toBeInTheDocument()
    expect(screen.getByText('当前版本')).toBeInTheDocument()
    expect(screen.getAllByText(CHANGELOG[0].version).length).toBeGreaterThan(0)
  })

  it('shows the latest release expanded by default', () => {
    render(<ChangelogView />)
    expect(screen.getByText(CHANGELOG[0].title)).toBeInTheDocument()
    expect(screen.getByText(CHANGELOG[0].items[0].text)).toBeInTheDocument()
  })

  it('collapses and expands a release on click', () => {
    render(<ChangelogView />)

    const firstItem = CHANGELOG[0].items[0].text
    expect(screen.getByText(firstItem)).toBeInTheDocument()

    fireEvent.click(screen.getByText(CHANGELOG[0].title))
    expect(screen.queryByText(firstItem)).not.toBeInTheDocument()

    fireEvent.click(screen.getByText(CHANGELOG[0].title))
    expect(screen.getByText(firstItem)).toBeInTheDocument()
  })
})
