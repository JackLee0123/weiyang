import { useEffect, useState } from 'react'
import { Megaphone, X } from 'lucide-react'
import { useAnnouncementMutations, useUnreadAnnouncement } from '../lib/queries'

/** 后端存的是 UTC（不带时区后缀），显示时按本地时间换算。 */
function formatSentAt(value: string) {
  const date = new Date(value.endsWith('Z') ? value : `${value}Z`)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * 管理员公告弹窗：打开网站时，如果有一条自己还没确认过的公告，就弹出来。
 * 点「知道了」之后写入已读，之后不再打扰。
 */
export function AnnouncementPopup() {
  const { data } = useUnreadAnnouncement()
  const { acknowledge } = useAnnouncementMutations()
  const [dismissedId, setDismissedId] = useState<number | null>(null)

  const item = data && data.id !== dismissedId ? data : null

  useEffect(() => {
    if (!item) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [item])

  if (!item) return null

  const close = () => {
    setDismissedId(item.id)
    acknowledge.mutate(item.id)
  }

  const important = item.level === 'important'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={close}
    >
      <div
        className={`w-full max-w-md overflow-hidden rounded-card border bg-surface shadow-float dark:bg-slate-800 ${
          important ? 'border-amber-300 dark:border-amber-300/50' : 'border-line dark:border-slate-700'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-5 pt-5">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              important
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300'
                : 'bg-surface-soft text-ink-soft dark:bg-slate-700/60 dark:text-slate-300'
            }`}
          >
            <Megaphone size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-2xs tracking-label text-ink-faint dark:text-slate-500">
              {important ? '管理员公告 · 重要' : '管理员公告'}
            </p>
            <h2 className="mt-1 text-base font-medium tracking-title text-ink dark:text-slate-100">{item.title}</h2>
            {item.body && (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-soft dark:text-slate-300">{item.body}</p>
            )}
          </div>
          <button className="btn-ghost -mr-1 -mt-1 p-1.5 text-ink-faint dark:text-slate-500" onClick={close} aria-label="关闭" title="关闭">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-4">
          <span className="tnum text-2xs text-ink-faint dark:text-slate-500">{formatSentAt(item.created_at)}</span>
          <button className="btn-primary" onClick={close}>
            知道了
          </button>
        </div>
      </div>
    </div>
  )
}
