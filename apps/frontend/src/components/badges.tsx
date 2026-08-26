import type { PlanStatus, Priority } from '../lib/types'

const STATUS_MAP: Record<PlanStatus, { label: string; className: string }> = {
  pending: { label: '待启程', className: 'bg-slate-100 text-slate-600 dark:bg-slate-700/70 dark:text-slate-300' },
  in_progress: { label: '飞行中', className: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
  done: { label: '已抵达', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  cancelled: { label: '改道', className: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' },
}

const PRIORITY_MAP: Record<Priority, { label: string; className: string }> = {
  high: { label: '高', className: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' },
  medium: { label: '中', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  low: { label: '低', className: 'bg-slate-100 text-slate-500 dark:bg-slate-700/70 dark:text-slate-400' },
}

export function StatusBadge({ status }: { status: PlanStatus }) {
  const cfg = STATUS_MAP[status]
  return <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_MAP[priority]
  return <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}优先级</span>
}
