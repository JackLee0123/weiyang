import { BarChart3, CheckCircle2, Clock3, Flame, TrendingUp } from 'lucide-react'
import type { StatsOverview } from '../lib/types'
import { formatMinutes } from '../lib/format'

interface StatItem {
  label: string
  value: string
  /** 卡片下方的一行小字，用来把口径说清楚（例如本周里今天占了多少）。 */
  hint?: string
  icon: typeof Flame
  tone: string
  bg: string
}

export function StatsPanel({
  stats,
  date,
  dayLabel = '当天',
}: {
  stats: StatsOverview
  /** 当前查看的日期（需落在统计区间内），用于标出这一天占了多少。 */
  date?: string
  dayLabel?: string
}) {
  // 本周概览含未来几天，所以单独标出「今天」占了多少，避免被误读成当天的数字
  const inRange = !!date && date >= stats.start && date <= stats.end
  const todayPlanned = inRange ? stats.days.find((day) => day.date === date)?.planned_minutes ?? 0 : undefined
  const plannedHint = `不含课表课程${todayPlanned === undefined ? '' : ` · ${dayLabel} ${formatMinutes(todayPlanned)}`}`
  // 完成率只看「自己新建的计划」与「记一笔」：课表课程与改道的都不参与
  const rateHint =
    stats.self_plans + stats.records_count > 0
      ? `计划 ${stats.self_done_plans}/${stats.self_plans} · 记录 ${stats.done_records}/${stats.records_count}`
      : '本周还没有自建计划或记一笔'

  const items: StatItem[] = [
    {
      label: '连续记录',
      value: `${stats.consecutive_recording_days} 天`,
      icon: Flame,
      tone: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      label: '记录用时',
      value: formatMinutes(stats.recorded_minutes),
      icon: TrendingUp,
      tone: 'text-brand dark:text-teal-300',
      bg: 'bg-brand-soft dark:bg-brand/10',
    },
    {
      label: '计划用时',
      value: formatMinutes(stats.planned_minutes),
      hint: plannedHint,
      icon: Clock3,
      tone: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
      label: '计划完成率',
      value: `${Math.round(stats.completion_rate * 100)}%`,
      hint: rateHint,
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
              {item.hint && <p className="mt-0.5 truncate text-[11px] text-ink-faint dark:text-slate-500">{item.hint}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
