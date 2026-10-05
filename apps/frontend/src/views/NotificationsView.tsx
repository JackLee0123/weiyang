import { Bell, BellOff, Megaphone, Send, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { clearStoredNotifications, getStoredNotifications } from '../lib/push'
import { useAnnouncementMutations, useAnnouncements } from '../lib/queries'
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

/** 后端存的是 UTC（不带时区后缀），显示时按本地时间换算。 */
function sentAt(iso: string): string {
  const date = new Date(iso.endsWith('Z') ? iso : `${iso}Z`)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * 管理员发送公告：发出去后，所有用户下次打开网站会弹窗看到一次；
 * 这里能看到已读人数，也可以撤回。
 */
function AnnouncementComposer() {
  const { data: sent = [] } = useAnnouncements(true)
  const { create, remove } = useAnnouncementMutations()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [important, setImportant] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const send = async () => {
    if (!title.trim()) return
    setError('')
    setOk('')
    try {
      await create.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        level: important ? 'important' : 'info',
      })
      setTitle('')
      setBody('')
      setImportant(false)
      setOk('已发出，其他用户下次打开网站时会看到这条公告。')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <section className="panel p-4">
      <header className="flex items-baseline justify-between gap-3 border-b border-line pb-2.5 dark:border-slate-800">
        <h2 className="eyebrow">发送公告</h2>
        <span className="text-2xs text-ink-faint dark:text-slate-500">打开网站的人都会看到</span>
      </header>

      <div className="mt-3 space-y-3">
        <div>
          <label className="label" htmlFor="announcement-title">
            标题
          </label>
          <input
            id="announcement-title"
            className="field"
            placeholder="例如：本周六服务器维护"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="announcement-body">
            正文（可留空）
          </label>
          <textarea
            id="announcement-body"
            className="field resize-none"
            rows={3}
            placeholder="要告诉大家的细节，换行会原样保留。"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-ink-soft dark:text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line-strong text-brand"
            checked={important}
            onChange={(e) => setImportant(e.target.checked)}
          />
          标记为重要（弹窗用黄色强调）
        </label>

        {ok && <p className="notice-ok">{ok}</p>}
        {error && <p className="notice-err">{error}</p>}

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-2xs text-ink-faint dark:text-slate-500">对方点「知道了」后不再重复弹出</span>
          <button className="btn-primary" onClick={() => void send()} disabled={!title.trim() || create.isPending}>
            <Send size={14} strokeWidth={1.75} />
            {create.isPending ? '发送中…' : '发送公告'}
          </button>
        </div>
      </div>

      {sent.length > 0 && (
        <ul className="mt-4 divide-y divide-line-soft border-t border-line-soft dark:divide-slate-800 dark:border-slate-800">
          {sent.map((item) => (
            <li key={item.id} className="flex items-start gap-3 py-3">
              <Megaphone
                size={14}
                strokeWidth={1.75}
                className={`mt-0.5 shrink-0 ${item.level === 'important' ? 'text-amber-600 dark:text-amber-300' : 'text-ink-faint dark:text-slate-500'}`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink dark:text-slate-100">{item.title}</p>
                <p className="tnum mt-0.5 text-2xs text-ink-faint dark:text-slate-500">
                  {sentAt(item.created_at)} · 已读 {item.read_count}/{item.user_count}
                </p>
              </div>
              <button
                className="btn-danger px-2 py-1"
                onClick={() => remove.mutate(item.id)}
                title="撤回这条公告"
                aria-label="撤回公告"
              >
                <Trash2 size={13} strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function NotificationsView({ onBack, isAdmin = false }: { onBack?: () => void; isAdmin?: boolean }) {
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
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-light tracking-title text-ink dark:text-slate-100">通知</h1>
          <p className="mt-1 text-xs text-ink-muted dark:text-slate-400">这里会保存你收到的系统推送</p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button className="btn-record" onClick={handleClear}>
              <Trash2 size={14} strokeWidth={1.75} />
              清空
            </button>
          )}
          {onBack && (
            <button className="btn-quiet px-2" onClick={onBack}>
              回到今日
            </button>
          )}
        </div>
      </div>

      {isAdmin && <AnnouncementComposer />}

      {loading ? (
        <p className="py-10 text-center text-sm text-ink-muted dark:text-slate-400">加载中…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border-t border-line py-14 text-center dark:border-slate-800">
          <BellOff size={20} strokeWidth={1.5} className="text-ink-faint dark:text-slate-600" />
          <p className="mt-1 text-sm text-ink-muted dark:text-slate-300">还没有收到通知</p>
          <p className="text-2xs text-ink-faint dark:text-slate-500">
            开启通知并等待服务器推送后，记录会出现在这里。
          </p>
        </div>
      ) : (
        <ul className="panel divide-y divide-line-soft dark:divide-slate-700/60">
          {items.map((item, index) => (
            <li key={String(item.id ?? index)} className="flex items-start gap-3 px-4 py-3.5">
              <Bell size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-faint dark:text-slate-500" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium text-ink dark:text-slate-100">{item.title}</p>
                  <span className="tnum shrink-0 text-2xs text-ink-faint dark:text-slate-500">
                    {timeLabel(item.ts ?? Date.now())}
                  </span>
                </div>
                {item.body && <p className="mt-0.5 text-xs leading-5 text-ink-soft dark:text-slate-300">{item.body}</p>}
                {item.url && item.url !== '/' && (
                  <a className="mt-1 inline-block text-2xs text-brand transition-colors hover:text-brand-deep dark:text-teal-300" href={item.url}>
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
