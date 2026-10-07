import { useState } from 'react'
import { BellRing, CalendarClock } from './icons'
import { NotificationSettings } from './NotificationSettings'
import { ScheduleSettings } from './ScheduleSettings'

export type NotificationTab = 'push' | 'schedule'

const TABS: { key: NotificationTab; label: string; icon: typeof BellRing }[] = [
  { key: 'push', label: '接收通知', icon: BellRing },
  { key: 'schedule', label: '任务提醒', icon: CalendarClock },
]

/** 通知设置：把「接收通知」与「任务提醒」合并到一个弹窗里，避免侧栏入口过多。 */
export function NotificationsPanel({ onClose, initialTab = 'push' }: { onClose: () => void; initialTab?: NotificationTab }) {
  const [tab, setTab] = useState<NotificationTab>(initialTab)

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-md border border-line bg-surface-muted p-0.5 dark:border-slate-700 dark:bg-slate-900/50">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={tab === item.key}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition ${
              tab === item.key
                ? 'bg-surface text-ink dark:bg-slate-700 dark:text-slate-100'
                : 'text-ink-muted dark:text-slate-400'
            }`}
            onClick={() => setTab(item.key)}
          >
            <item.icon size={15} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'push' ? <NotificationSettings onClose={onClose} /> : <ScheduleSettings onClose={onClose} />}
    </div>
  )
}

export default NotificationsPanel
