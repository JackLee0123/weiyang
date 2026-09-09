import { Bell, BellRing, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  enableNotifications,
  fetchPushStatus,
  markIosPrompted,
  markPrompted,
  shouldShowEnablePrompt,
  shouldShowIosPrompt,
  type PushUiState,
} from '../lib/push'

export function PushPrompt({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [state, setState] = useState<PushUiState | null>(null)
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const next = await fetchPushStatus()
    setState(next)
    setError('')
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (!state || dismissed) return null

  const showEnable = shouldShowEnablePrompt(state)
  const showIos = shouldShowIosPrompt(state)
  if (!showEnable && !showIos) return null

  const handleEnable = async () => {
    setBusy(true)
    setError('')
    try {
      await enableNotifications()
      markPrompted()
      setDismissed(true)
    } catch (err) {
      markPrompted()
      setError(err instanceof Error ? err.message : '开启失败')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const handleDismiss = () => {
    if (showIos) markIosPrompted()
    else markPrompted()
    setDismissed(true)
  }

  return (
    <div
      className={`mb-3 flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
        showIos
          ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
          : 'border-teal-200 bg-teal-50 dark:border-teal-500/30 dark:bg-teal-500/10'
      }`}
    >
      <div className="flex items-start gap-3">
        {showIos ? <Bell size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" /> : <BellRing size={18} className="mt-0.5 shrink-0 text-teal-700 dark:text-teal-200" />}
        <div>
          {showIos ? (
            <p className="text-sm font-medium text-amber-800 dark:text-amber-100">
              iPhone 需要先将本网站添加到主屏幕，安装后才能开启通知。
            </p>
          ) : (
            <p className="text-sm font-medium text-teal-800 dark:text-teal-100">开启手机通知？</p>
          )}
          {error && <p className="mt-0.5 text-xs text-rose-600 dark:text-rose-300">{error}</p>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          className="btn-primary h-8 px-3 py-1.5 text-xs"
          onClick={showIos ? onOpenSettings : handleEnable}
          disabled={busy}
        >
          {showIos ? '查看步骤' : '开启通知'}
        </button>
        <button className="btn-ghost h-8 px-2 py-1.5 text-xs" onClick={onOpenSettings}>
          设置
        </button>
        <button className="btn-ghost h-8 px-2 py-1.5" onClick={handleDismiss} aria-label="稍后再说" title="稍后再说">
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
