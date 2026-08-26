import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Sidebar } from './Sidebar'

const baseProps = {
  view: 'today' as const,
  theme: 'light' as const,
  user: { name: '主人', email: 'owner@example.com' },
  isAdmin: false,
  onToggleTheme: vi.fn(),
  onNavigate: vi.fn(),
  onAddPlan: vi.fn(),
  onOpenFocus: vi.fn(),
  onLogout: vi.fn(),
}

describe('Sidebar install entry', () => {
  it('does not offer the desktop download in web runtime', () => {
    render(<Sidebar {...baseProps} />)
    expect(screen.queryAllByText('下载桌面版')).toHaveLength(0)
    expect(screen.queryByText('桌面版')).not.toBeInTheDocument()
  })

  it('shows the install button when the browser offers to install', async () => {
    render(<Sidebar {...baseProps} />)
    expect(screen.queryByText('安装应用')).not.toBeInTheDocument()

    const prompt = vi.fn().mockResolvedValue(undefined)
    const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent
    Object.defineProperty(event, 'prompt', { value: prompt })
    Object.defineProperty(event, 'userChoice', {
      value: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
    })
    act(() => {
      window.dispatchEvent(event)
    })

    const buttons = screen.getAllByText('安装应用')
    expect(buttons.length).toBeGreaterThan(0)
    await act(async () => {
      fireEvent.click(buttons[0])
    })
    expect(prompt).toHaveBeenCalled()
  })
})
