import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, RefreshCw, ScanLine, Smartphone, Trash2, Watch } from 'lucide-react'
import { api } from '../lib/api'
import { deviceKindLabel, deviceTitle, formatDeviceTime, parseConnectPayload } from '../lib/devices'
import type { ConnectedDevice } from '../lib/types'
import { QrScanner } from './QrScanner'

type Stage = 'idle' | 'confirm' | 'connecting' | 'done'

interface Pending {
  code: string
  label: string
  expiresAt: number
}

/**
 * 设备连接：手环上打开「连接账户」显示二维码，这里扫码确认即可把这块手环
 * 绑定到当前账号；没有摄像头时也可以手动输入手环上的 6 位连接码。
 */
export function DeviceConnectPanel() {
  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [pending, setPending] = useState<Pending | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [devices, setDevices] = useState<ConnectedDevice[] | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const timerRef = useRef<number | null>(null)

  const loadDevices = useCallback(async () => {
    try {
      setDevices(await api.fetchDevices())
    } catch {
      /* 列表加载失败不影响连接流程本身 */
    }
  }, [])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  useEffect(() => {
    timerRef.current = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    }
  }, [])

  const describeError = (err: unknown): string => {
    const message = err instanceof Error ? err.message : ''
    if (!message) return '连接失败，请重试'
    if (message.includes('不存在') || message.includes('过期')) return message
    return message
  }

  const resolveCode = useCallback(
    async (code: string) => {
      setScanning(false)
      setError('')
      setNotice('')
      setStage('connecting')
      try {
        const info = await api.deviceHandshake(code)
        if (info.status !== 'pending') {
          setStage('idle')
          setError(
            info.status === 'expired'
              ? '二维码已过期，请在手环上重新生成'
              : '这台手环已经连接过了',
          )
          return
        }
        setPending({ code: info.code, label: info.device_label, expiresAt: Date.now() + info.expires_in * 1000 })
        setStage('confirm')
      } catch (err) {
        setStage('idle')
        setError(describeError(err))
      }
    },
    [],
  )

  const onScanned = useCallback(
    (raw: string) => {
      const code = parseConnectPayload(raw)
      if (!code) {
        setScanning(false)
        setError('二维码不是未央手环的连接码')
        return
      }
      void resolveCode(code)
    },
    [resolveCode],
  )

  const submitManual = () => {
    const code = parseConnectPayload(manual)
    if (!code) {
      setError('请输入手环上显示的 6 位连接码')
      return
    }
    void resolveCode(code)
  }

  const approve = async () => {
    if (!pending) return
    setStage('connecting')
    setError('')
    try {
      await api.approveDeviceHandshake(pending.code)
      setStage('done')
      setNotice(`「${pending.label}」已连接到你的账号`)
      setPending(null)
      setManual('')
      void loadDevices()
    } catch (err) {
      setStage('idle')
      setError(describeError(err))
    }
  }

  const revoke = async (device: ConnectedDevice) => {
    setBusyId(device.id)
    setError('')
    try {
      await api.revokeDevice(device.id)
      setDevices((prev) => (prev ? prev.filter((item) => item.id !== device.id) : prev))
      setNotice(`已解绑「${deviceTitle(device)}」`)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusyId(null)
    }
  }

  const remain = pending ? Math.max(0, Math.floor((pending.expiresAt - now) / 1000)) : 0
  const expired = pending !== null && remain <= 0
  const watches = devices?.filter((item) => item.device_kind === 'watch') ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-md border border-line bg-surface-soft p-3 dark:border-slate-700 dark:bg-slate-900/50">
        <Watch size={18} className="mt-0.5 shrink-0 text-brand-ink dark:text-teal-300" />
        <div className="text-sm leading-relaxed text-ink-soft dark:text-slate-300">
          <p className="font-medium text-ink dark:text-slate-100">用手环扫码连接</p>
          <p className="mt-1">在手环上打开「设置 → 连接账户」，手环会显示一个二维码；用手机扫一下并确认，就完成连接。</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {notice && !error && (
        <p className="flex items-center gap-1.5 text-sm text-brand-ink dark:text-teal-300">
          <CheckCircle2 size={15} />
          {notice}
        </p>
      )}

      {stage === 'done' && (
        <div className="rounded-md border border-brand/40 bg-brand-soft/40 p-3 text-sm text-brand-ink dark:border-teal-700 dark:bg-teal-900/20 dark:text-teal-200">
          手环会在一两秒内自动进入首页，之后在「当日专注」和「课表」里就能直接用了。
        </div>
      )}

      {stage === 'confirm' && pending && (
        <div className="space-y-3 rounded-md border border-line bg-surface p-3 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm text-ink dark:text-slate-100">
            确认把「{pending.label}」连接到当前账号？
          </p>
          <p className="text-xs text-ink-muted dark:text-slate-400">
            连接码 {pending.code} · {expired ? '已过期' : `${remain} 秒内有效`}
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn-primary flex-1 justify-center" onClick={() => void approve()} disabled={expired}>
              连接
            </button>
            <button
              type="button"
              className="btn-ghost flex-1 justify-center"
              onClick={() => {
                setPending(null)
                setStage('idle')
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {stage === 'connecting' && (
        <p className="flex items-center gap-2 text-sm text-ink-soft dark:text-slate-300">
          <Loader2 size={15} className="animate-spin" />
          正在处理…
        </p>
      )}

      {stage === 'idle' && (
        <div className="space-y-3">
          <button type="button" className="btn-primary w-full justify-center" onClick={() => setScanning(true)}>
            <ScanLine size={16} />
            扫码连接手环
          </button>

          <div className="rounded-md border border-dashed border-line-strong p-3 dark:border-slate-600">
            <p className="text-xs text-ink-muted dark:text-slate-400">没有摄像头？输入手环上显示的 6 位连接码：</p>
            <div className="mt-2 flex gap-2">
              <input
                className="field flex-1"
                inputMode="numeric"
                maxLength={6}
                placeholder="6 位数字"
                value={manual}
                onChange={(e) => setManual(e.target.value.replace(/[^\d]/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitManual()
                }}
              />
              <button type="button" className="btn-ghost justify-center" onClick={submitManual}>
                连接
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink dark:text-slate-100">已连接设备</p>
          <button
            type="button"
            className="text-xs text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-slate-200"
            onClick={() => void loadDevices()}
          >
            <RefreshCw size={13} className="mr-1 inline" />
            刷新
          </button>
        </div>

        {devices === null && <p className="text-xs text-ink-muted dark:text-slate-400">加载中…</p>}
        {devices !== null && watches.length === 0 && (
          <p className="text-xs text-ink-muted dark:text-slate-400">还没有连接手环</p>
        )}

        {watches.map((device) => (
          <div
            key={device.id}
            className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40"
          >
            <Watch size={16} className="shrink-0 text-brand-ink dark:text-teal-300" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink dark:text-slate-100">{deviceTitle(device)}</p>
              <p className="text-xs text-ink-muted dark:text-slate-400">
                连接于 {formatDeviceTime(device.created_at)}
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost px-2 py-1 text-xs"
              onClick={() => void revoke(device)}
              disabled={busyId === device.id}
            >
              <Trash2 size={13} />
              解绑
            </button>
          </div>
        ))}

        {devices !== null && devices.some((item) => item.device_kind !== 'watch') && (
          <p className="flex items-center gap-1.5 pt-1 text-xs text-ink-faint dark:text-slate-500">
            <Smartphone size={13} />
            当前账号还有 {devices.filter((item) => item.device_kind !== 'watch').length} 个
            {deviceKindLabel('web')}登录会话
          </p>
        )}
      </div>

      {scanning && <QrScanner onDetected={onScanned} onClose={() => setScanning(false)} />}
    </div>
  )
}

export default DeviceConnectPanel
