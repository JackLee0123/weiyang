import type { PlanStatus, Priority } from '../lib/types'

/**
 * 状态用「一个点 + 文字」，优先级只用颜色区分文字——
 * 不再用四种淡彩底色的胶囊标签（那是最典型的模板感来源）。
 */
const STATUS_MAP: Record<PlanStatus, { label: string; dot: string }> = {
  pending: { label: '待启程', dot: 'bg-ink-faint dark:bg-slate-500' },
  in_progress: { label: '飞行中', dot: 'bg-blue-500 dark:bg-blue-300' },
  done: { label: '已抵达', dot: 'bg-emerald-500 dark:bg-emerald-300' },
  cancelled: { label: '改道', dot: 'bg-rose-400 dark:bg-rose-300' },
}

const PRIORITY_MAP: Record<Priority, { label: string; text: string }> = {
  high: { label: '高优先级', text: 'text-rose-600 dark:text-rose-300' },
  medium: { label: '中优先级', text: 'text-amber-700 dark:text-amber-300' },
  low: { label: '低优先级', text: 'text-ink-muted dark:text-slate-400' },
}

export function StatusBadge({ status }: { status: PlanStatus }) {
  const cfg = STATUS_MAP[status]
  return (
    <span className="chip">
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_MAP[priority]
  return <span className={`whitespace-nowrap text-2xs font-medium ${cfg.text}`}>{cfg.label}</span>
}
