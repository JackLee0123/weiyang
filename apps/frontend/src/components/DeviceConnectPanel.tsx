import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, RefreshCw, ScanLine, Smartphone, Trash2, Watch } from './icons'
import { Package } from './icons'
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
 * 设备连接。
 *
 * 主要用途是给「课表同步脚本」配对：手环 10 的快应用不支持联网，课表要靠
 * `watchapp` 目录下的 `npm run sync` 打包进安装包。脚本会打印并直接打开一个
 * 带 `?code=` 的链接，在这里点一下「连接」就完成授权，不用再手抄连接码。
 *
 * 扫码 / 手动输入 6 位连接码的入口保留着，方便其他形态的设备接入。
 */
interface DeviceConnectPanelProps {
  /** 链接里带来的连接码：打开面板后自动进入确认流程。 */
  initialCode?: string
}

export function DeviceConnectPanel({ initialCode }: DeviceConnectPanelProps = {}) {
  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [pending, setPending] = useState<Pending | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [devices, setDevices] = useState<ConnectedDevice[] | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [buildStatus, setBuildStatus] = useState<{ available: boolean; reason: string } | null>(null)
  const [building, setBuilding] = useState(false)
  const [buildNotice, setBuildNotice] = useState('')
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
    let active = true
    api
      .watchAppBuildStatus()
      .then((status) => {
        if (active) setBuildStatus(status)
      })
      .catch(() => {
        if (active) setBuildStatus({ available: false, reason: '暂时获取不到打包状态' })
      })
    return () => {
      active = false
    }
  }, [])

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

  const autoResolved = useRef(false)
  useEffect(() => {
    if (autoResolved.current || !initialCode) return
    const code = parseConnectPayload(initialCode)
    if (!code) return
    autoResolved.current = true
    void resolveCode(code)
  }, [initialCode, resolveCode])

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

  /** 让服务端用当前账号的课表打一个包，然后把 rpk 下载下来。 */
  const buildPackage = async () => {
    setBuilding(true)
    setError('')
    setBuildNotice('')
    try {
      const blob = await api.buildWatchApp()
      const url = URL.createObjectURL(blob)
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const link = document.createElement('a')
      link.href = url
      link.download = `everlong-watch-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.rpk`
      document.body.appendChild(link)
      link.click()
      link.remove()
      // 立刻 revoke 会让部分浏览器把下载掐掉，留一点时间。
      window.setTimeout(() => URL.revokeObjectURL(url), 10000)
      setBuildNotice('已开始下载，接着用 AstroBox 把它推送到手环')
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBuilding(false)
    }
  }

  const remain = pending ? Math.max(0, Math.floor((pending.expiresAt - now) / 1000)) : 0
  const expired = pending !== null && remain <= 0
  const watches = devices?.filter((item) => item.device_kind === 'watch') ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-md border border-line-soft bg-surface-soft p-3 dark:bg-slate-900/50">
        <Watch size={18} className="mt-0.5 shrink-0 text-brand-ink dark:text-teal-300" />
        <div className="text-sm leading-relaxed text-ink-soft dark:text-slate-300">
          <p className="font-medium text-ink dark:text-slate-100">连接课表同步脚本</p>
          <p className="mt-1">
            小米手环 10 的快应用不支持联网（官方支持表里 system.fetch / system.network 一律「不支持」），
            所以手环上的课表改由打包时注入：在电脑上进入 watchapp 目录跑 <code>npm run sync</code>，
            脚本会打开一个带连接码的页面，在这里点一次「连接」，它就能把你的课表写进安装包。
          </p>
          <p className="mt-1">跑完脚本后接着 <code>npm run build</code>，再用 AstroBox 把 dist 里的 rpk 推到手环即可。</p>
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
          脚本已经拿到访问令牌。回到终端继续跑 <code>npm run build</code>，然后用 AstroBox 把 dist 里的 rpk 推到手环；
          手环上的课表是打包时的快照，课表变了要重跑一次。
        </div>
      )}

      {stage === 'confirm' && pending && (
        <div className="panel space-y-3 p-3">
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
            <p className="text-xs text-ink-muted dark:text-slate-400">也可以手动输入 6 位连接码（脚本或手环屏幕上显示的）：</p>
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

      <div className="space-y-3 rounded-md border border-line bg-surface-soft p-3 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="flex items-start gap-3">
          <Package size={18} className="mt-0.5 shrink-0 text-brand-ink dark:text-teal-300" />
          <div className="text-sm leading-relaxed text-ink-soft dark:text-slate-300">
            <p className="font-medium text-ink dark:text-slate-100">生成手环安装包</p>
            <p className="mt-1">
              服务端会用你当前的课表打一个包：课表随包带进去，手环本身不联网。下载下来用 AstroBox
              推送到手环即可，自己电脑上不用装开发环境。
            </p>
          </div>
        </div>

        {buildStatus && !buildStatus.available && (
          <p className="text-xs text-ink-muted dark:text-slate-400">{buildStatus.reason}</p>
        )}

        <button
          type="button"
          className="btn-primary w-full justify-center"
          onClick={() => void buildPackage()}
          disabled={building || buildStatus?.available === false}
        >
          {building ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
          {building ? '正在打包，约 10 秒…' : '生成并下载 rpk'}
        </button>

        {buildNotice && (
          <p className="flex items-center gap-1.5 text-xs text-brand-ink dark:text-teal-300">
            <CheckCircle2 size={13} />
            {buildNotice}
          </p>
        )}
      </div>

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
            className="panel flex items-center gap-3 px-3 py-2"
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
