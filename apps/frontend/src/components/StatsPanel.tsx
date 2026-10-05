import type { StatsOverview } from '../lib/types'
import { formatMinutes } from '../lib/format'

/**
 * 本周概览：不用四个彩色图标卡片，改成一条带发丝分隔线的数据带。
 * 数字用轻字重 + 等宽字形，标签用小字——靠排版层级而不是色块来区分。
 */
export function StatsPanel({ stats }: { stats: StatsOverview }) {
  const items = [
    { label: '连续记录', value: `${stats.consecutive_recording_days} 天` },
    { label: '记录用时', value: formatMinutes(stats.recorded_minutes) },
    { label: '计划用时', value: formatMinutes(stats.planned_minutes) },
    { label: '计划完成率', value: `${Math.round(stats.completion_rate * 100)}%` },
  ]
  const range = `${stats.start.slice(5).replace('-', '.')} — ${stats.end.slice(5).replace('-', '.')}`

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="eyebrow">本周概览</h2>
        <span className="tnum text-2xs text-ink-faint dark:text-slate-500">{range}</span>
      </div>
      <div className="mt-2.5 grid grid-cols-1 divide-y divide-line border-y border-line dark:divide-slate-800 dark:border-slate-800 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-baseline justify-between gap-4 py-3 sm:block sm:px-4 sm:py-3.5 sm:first:pl-0 sm:last:pr-0"
          >
            <p className="text-xs text-ink-muted dark:text-slate-400">{item.label}</p>
            <p className="tnum text-[22px] font-light leading-7 tracking-title text-ink dark:text-slate-100 sm:mt-1.5">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
