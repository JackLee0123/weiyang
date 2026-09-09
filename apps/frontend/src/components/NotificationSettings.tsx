import { Bell, BellOff, BellRing, MonitorUp, RefreshCw, Share, ShieldCheck, Smartphone } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { disableNotifications, enableNotifications, fetchPushStatus, markPrompted, type PushUiState } from '../lib/push'

function StatusBadge({ state }: { state: PushUiState }) {
  const label = state.enabled
    ? '已开启'
    : state.denied
      ? '已拒绝'
      : state.unsupported
        ? '当前设备不支持'
        : '未开启'
  const tone = state.enabled
    ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-200'
    : state.denied
      ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
      : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'
  return <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>
}

export function NotificationSettings({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<PushUiState | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const refresh = useCallback(async () => {
    setState(await fetchPushStatus())
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setNotice = (kind: 'ok' | 'error', text: string) => setMessage({ kind, text })

  const handleEnable = async () => {
    setBusy(true)
    setMessage(null)
    try {
      await enableNotifications()
      markPrompted()
      setNotice('ok', '通知已开启，现在可以接收系统推送。')
      await refresh()
    } catch (error) {
      const msg = error instanceof Error ? error.message : '开启失败，请重试'
      setNotice('error', msg)
      markPrompted()
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const handleDisable = async () => {
    setBusy(true)
    setMessage(null)
    try {
      await disableNotifications()
      setNotice('ok', '已关闭通知，如需恢复可再次开启。')
      await refresh()
    } catch {
      setNotice('error', '关闭失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  const handleTest = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const result = await api.sendTestPush()
      setNotice('ok', `已发送测试通知（${result.success} 台设备）`)
    } catch (error) {
      setNotice('error', error instanceof Error ? error.message : '发送失败')
    } finally {
      setBusy(false)
    }
  }

  const buttonClass = 'btn w-full justify-center'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {state?.enabled ? <BellRing size={18} className="text-brand dark:text-teal-300" /> : <Bell size={18} className="text-ink-muted dark:text-slate-400" />}
          <span className="text-sm font-medium text-ink dark:text-slate-100">接收通知</span>
        </div>
        {state && <StatusBadge state={state} />}
      </div>

      {message && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            message.kind === 'ok'
              ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-200'
              : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
          }`}
        >
          {message.text}
        </p>
      )}

      {!state ? (
        <p className="text-sm text-ink-muted dark:text-slate-400">正在检测当前设备…</p>
      ) : !state.serverSupported ? (
        <div className="flex items-start gap-3 rounded-md bg-surface-soft p-3 dark:bg-white/5">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-ink-faint dark:text-slate-500" />
          <p className="text-sm text-ink-soft dark:text-slate-300">
            服务器尚未配置通知服务（VAPID），请联系管理员。
          </p>
        </div>
      ) : state.unsupported ? (
        <div className="flex items-start gap-3 rounded-md bg-surface-soft p-3 dark:bg-white/5">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-ink-faint dark:text-slate-500" />
          <p className="text-sm text-ink-soft dark:text-slate-300">当前浏览器或设备不支持 Web Push，无法开启通知。</p>
        </div>
      ) : state.denied ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-md bg-surface-soft p-3 dark:bg-white/5">
            <BellOff size={18} className="mt-0.5 shrink-0 text-rose-500" />
            <p className="text-sm text-ink-soft dark:text-slate-300">
              你已拒绝通知权限。想重新开启，请到浏览器/系统「设置 → 通知」中允许本站通知，然后点击下方「重新检测」。
            </p>
          </div>
          <div className="grid gap-2">
            <button className={buttonClass} onClick={refresh} disabled={busy}>
              <RefreshCw size={15} />
              重新检测
            </button>
          </div>
        </div>
      ) : state.iosRequiresInstall ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-md bg-surface-soft p-3 dark:bg-white/5">
            <Smartphone size={18} className="mt-0.5 shrink-0 text-brand dark:text-teal-300" />
            <p className="text-sm text-ink-soft dark:text-slate-300">
              iPhone 需要先将本网站添加到主屏幕，安装后才能开启通知。
            </p>
          </div>
          <ol className="space-y-2 text-sm text-ink-soft dark:text-slate-300">
            <li className="flex items-start gap-2">
              <Share size={15} className="mt-0.5 shrink-0 text-brand dark:text-teal-300" />
              <span>在 Safari 底部工具栏点「分享」按钮</span>
            </li>
            <li className="flex items-start gap-2">
              <MonitorUp size={15} className="mt-0.5 shrink-0 text-brand dark:text-teal-300" />
              <span>选择「添加到主屏幕」并确认安装</span>
            </li>
            <li className="flex items-start gap-2">
              <Bell size={15} className="mt-0.5 shrink-0 text-brand dark:text-teal-300" />
              <span>从主屏幕打开应用，再回到这里开启通知</span>
            </li>
          </ol>
          <button className={buttonClass} onClick={refresh} disabled={busy}>
            <RefreshCw size={15} />
            我已安装，重新检测
          </button>
        </div>
      ) : state.enabled ? (
        <div className="grid gap-2">
          <button className="btn-primary w-full" onClick={handleTest} disabled={busy}>
            <BellRing size={15} />
            发送测试通知
          </button>
          <button className={buttonClass} onClick={handleDisable} disabled={busy}>
            <BellOff size={15} />
            关闭通知
          </button>
        </div>
      ) : (
        <div className="grid gap-2">
          <button className="btn-primary w-full" onClick={handleEnable} disabled={busy}>
            <BellRing size={15} />
            开启通知
          </button>
          <p className="text-xs text-ink-faint dark:text-slate-500">
            开启后，即使没有打开网页也能收到手机推送。
          </p>
        </div>
      )}

      <div className="flex items-center justify-end border-t border-line-soft pt-3 dark:border-slate-700/60">
        <button className="btn-ghost" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  )
}
