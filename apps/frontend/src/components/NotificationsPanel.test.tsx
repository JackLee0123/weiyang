import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NotificationsPanel } from './NotificationsPanel'

vi.mock('./NotificationSettings', () => ({
  NotificationSettings: ({ onClose }: { onClose: () => void }) => (
    <div>
      <p>推送设置内容</p>
      <button onClick={onClose}>关闭</button>
    </div>
  ),
}))

vi.mock('./ScheduleSettings', () => ({
  ScheduleSettings: () => <div>提醒设置内容</div>,
}))

describe('NotificationsPanel', () => {
  it('默认展示接收通知，可切到任务提醒', () => {
    render(<NotificationsPanel onClose={vi.fn()} />)

    expect(screen.getByText('推送设置内容')).toBeInTheDocument()
    expect(screen.queryByText('提醒设置内容')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /任务提醒/ }))
    expect(screen.getByText('提醒设置内容')).toBeInTheDocument()
    expect(screen.queryByText('推送设置内容')).not.toBeInTheDocument()
  })

  it('可以从指定标签页打开', () => {
    render(<NotificationsPanel onClose={vi.fn()} initialTab="schedule" />)
    expect(screen.getByText('提醒设置内容')).toBeInTheDocument()
  })
})
