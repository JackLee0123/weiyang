import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeviceConnectPanel } from './DeviceConnectPanel'
import { api } from '../lib/api'

vi.mock('../lib/api', () => ({
  api: {
    fetchDevices: vi.fn(),
    deviceHandshake: vi.fn(),
    approveDeviceHandshake: vi.fn(),
    revokeDevice: vi.fn(),
  },
}))

vi.mock('./QrScanner', () => ({
  QrScanner: () => <div>扫码取景</div>,
}))

const fetchDevices = vi.mocked(api.fetchDevices)
const deviceHandshake = vi.mocked(api.deviceHandshake)
const approveDeviceHandshake = vi.mocked(api.approveDeviceHandshake)
const revokeDevice = vi.mocked(api.revokeDevice)

const WATCH = {
  id: 7,
  device_kind: 'watch',
  device_label: '小米手环',
  created_at: '2026-09-28T10:00:00',
  expires_at: '2026-10-28T10:00:00',
  is_current: false,
}

describe('DeviceConnectPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchDevices.mockResolvedValue([])
  })

  it('列出已连接的手环', async () => {
    fetchDevices.mockResolvedValue([WATCH])
    render(<DeviceConnectPanel />)
    expect(await screen.findByText('小米手环')).toBeInTheDocument()
  })

  it('手动输入 6 位连接码后确认即可连接', async () => {
    deviceHandshake.mockResolvedValue({ code: '123456', device_label: '小米手环', status: 'pending', expires_in: 300 })
    approveDeviceHandshake.mockResolvedValue({ code: '123456', device_label: '小米手环', status: 'approved', expires_in: 290 })

    render(<DeviceConnectPanel />)
    fireEvent.change(screen.getByPlaceholderText('6 位数字'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '连接' }))

    expect(await screen.findByText(/确认把「小米手环」连接到当前账号/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '连接' }))

    await waitFor(() => expect(approveDeviceHandshake).toHaveBeenCalledWith('123456'))
    expect(await screen.findByText(/已连接到你的账号/)).toBeInTheDocument()
  })

  it('解绑手环后从列表移除', async () => {
    fetchDevices.mockResolvedValue([WATCH])
    revokeDevice.mockResolvedValue(undefined)
    render(<DeviceConnectPanel />)

    fireEvent.click(await screen.findByRole('button', { name: /解绑/ }))
    await waitFor(() => expect(revokeDevice).toHaveBeenCalledWith(7))
    expect(await screen.findByText('还没有连接手环')).toBeInTheDocument()
  })
})
