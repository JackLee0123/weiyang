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
  onOpenNotifications: vi.fn(),
  onOpenBackup: vi.fn(),
  onOpenDevices: vi.fn(),
  onLogout: vi.fn(),
}

describe('Sidebar install entry', () => {
  it('labels the changelog and feedback entry clearly', () => {
    render(<Sidebar {...baseProps} />)
    expect(screen.getAllByText('更新与意见').length).toBeGreaterThan(0)
    expect(screen.queryByText('更新日志')).not.toBeInTheDocument()
  })

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

describe('Sidebar mobile entries', () => {
  it('手机顶部导航也提供设备连接与数据备份入口', () => {
    // 桌面侧栏 md 以上才显示，手机顶部是另一套结构；两边都要有入口，
    // 否则手机（扫码连手环的地方）点不到「设备连接」。
    render(<Sidebar {...baseProps} />)
    const devices = screen.getAllByRole('button', { name: /设备连接/ })
    expect(devices.length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByRole('button', { name: /数据备份/ }).length).toBeGreaterThanOrEqual(2)

    fireEvent.click(devices[devices.length - 1])
    expect(baseProps.onOpenDevices).toHaveBeenCalled()
  })
})
