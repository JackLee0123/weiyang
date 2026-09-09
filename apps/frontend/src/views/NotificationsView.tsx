import { Bell, BellOff, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { clearStoredNotifications, getStoredNotifications } from '../lib/push'
import type { PushNotification } from '../lib/types'

function timeLabel(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

export function NotificationsView({ onBack }: { onBack?: () => void }) {
  const [items, setItems] = useState<PushNotification[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const rows = await getStoredNotifications()
    setItems(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => void refresh(), 2000)
    return () => window.clearInterval(interval)
  }, [refresh])

  const handleClear = async () => {
    await clearStoredNotifications()
    setItems([])
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-lg">通知中心</h1>
          <p className="mt-0.5 text-sm text-ink-muted dark:text-slate-400">这里会保存你收到的系统推送</p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button className="btn-ghost" onClick={handleClear}>
              <Trash2 size={15} />
              清空
            </button>
          )}
          {onBack && (
            <button className="btn-primary" onClick={onBack}>
              回到今日
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="panel p-4 text-sm text-ink-muted dark:text-slate-400">加载中…</div>
      ) : items.length === 0 ? (
        <div className="panel flex flex-col items-center gap-2 p-8 text-center">
          <BellOff size={28} className="text-ink-faint dark:text-slate-500" />
          <p className="text-sm text-ink-muted dark:text-slate-400">还没有收到通知</p>
          <p className="text-xs text-ink-faint dark:text-slate-500">
            开启通知并等待服务器推送后，记录会出现在这里。
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={String(item.id ?? index)} className="panel flex items-start gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand/12 text-brand-ink dark:bg-brand/15 dark:text-teal-200">
                <Bell size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-ink dark:text-slate-100">{item.title}</p>
                  <span className="shrink-0 text-xs text-ink-faint dark:text-slate-500">
                    {timeLabel(item.ts ?? Date.now())}
                  </span>
                </div>
                {item.body && <p className="mt-0.5 text-sm text-ink-soft dark:text-slate-300">{item.body}</p>}
                {item.url && item.url !== '/' && (
                  <a className="mt-1 inline-block text-xs text-brand hover:text-brand-deep dark:text-teal-300" href={item.url}>
                    查看
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
