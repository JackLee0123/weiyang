import { BarChart3, CheckCircle2, Clock3, Flame, TrendingUp } from 'lucide-react'
import type { StatsOverview } from '../lib/types'

function fmtMinutes(min: number) {
  if (min < 60) return `${min} 分钟`
  const h = Math.floor(min / 60)
  return `${h} 小时 ${min % 60 ? (min % 60) + ' 分钟' : ''}`
}

export function StatsPanel({ stats }: { stats: StatsOverview }) {
  const items = [
    {
      label: '连续记录',
      value: `${stats.consecutive_recording_days} 天`,
      icon: Flame,
      tone: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      label: '记录用时',
      value: fmtMinutes(stats.recorded_minutes),
      icon: TrendingUp,
      tone: 'text-brand dark:text-teal-300',
      bg: 'bg-brand-soft dark:bg-brand/10',
    },
    {
      label: '计划用时',
      value: fmtMinutes(stats.planned_minutes),
      icon: Clock3,
      tone: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
      label: '计划完成率',
      value: `${Math.round(stats.completion_rate * 100)}%`,
      icon: CheckCircle2,
      tone: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 size={15} className="text-ink-muted dark:text-slate-400" />
        <h2 className="section-title">本周概览</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="panel flex items-center gap-3 px-4 py-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${item.bg}`}>
              <item.icon size={17} className={item.tone} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-ink-muted dark:text-slate-400">{item.label}</p>
              <p className="mt-1 truncate text-lg font-semibold text-ink dark:text-slate-100">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
