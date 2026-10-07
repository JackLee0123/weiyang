import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { PieChart } from './icons'
import { summarizeFocus, type FocusSlice } from '../lib/focus'
import { formatMinutes, minutesParts } from '../lib/format'
import type { RecordEntry } from '../lib/types'

function Donut({ slices, minutes }: { slices: FocusSlice[]; minutes: number }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const gap = slices.length > 1 ? 2 : 0
  let travelled = 0

  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label={`专注时长分布饼图，共计 ${formatMinutes(minutes)}`}>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="15"
          className="stroke-surface-soft dark:stroke-slate-700/70"
        />
        {slices.map((slice) => {
          const length = minutes > 0 ? (slice.minutes / minutes) * circumference : 0
          const visible = Math.max(length - gap, Math.min(length, 0.8))
          const dash = `${visible} ${Math.max(circumference - visible, 0)}`
          const offset = -travelled
          travelled += length
          return (
            <circle
              key={slice.key}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="15"
              stroke={slice.color}
              strokeDasharray={dash}
              strokeDashoffset={offset}
              transform="rotate(-90 50 50)"
            />
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] text-ink-muted dark:text-slate-400">总计</span>
        <span className="mt-0.5 text-sm font-semibold text-ink dark:text-slate-100">{formatMinutes(minutes)}</span>
      </div>
    </div>
  )
}

export function FocusPanel({
  date,
  records,
  planTitles,
  onOpenRecord,
}: {
  date: string
  records: RecordEntry[]
  planTitles?: Map<number, string>
  /** 点「未填用时」的条目时，打开对应记录去补用时 */
  onOpenRecord?: (recordId: number) => void
}) {
  const summary = useMemo(() => summarizeFocus(records, planTitles), [records, planTitles])
  const duration = minutesParts(summary.minutes)
  const dateLabel = format(parseISO(date), 'M月d日')

  return (
    <section className="min-w-0 space-y-3">
      <header className="flex items-baseline justify-between gap-3 border-b border-line pb-2.5 dark:border-slate-800">
        <h2 className="eyebrow">当日专注</h2>
        <span className="tnum text-2xs text-ink-faint dark:text-slate-500">{dateLabel}</span>
      </header>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="panel flex flex-col justify-between gap-5 px-4 py-4 lg:col-span-1">
          <div>
            <p className="eyebrow">次数</p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="figure">{summary.count}</span>
              <span className="text-xs text-ink-muted dark:text-slate-400">次</span>
            </p>
          </div>
          <div>
            <p className="eyebrow">时长</p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="figure text-brand dark:text-teal-300">{duration.value}</span>
              <span className="text-xs text-ink-muted dark:text-slate-400">{duration.unit}</span>
            </p>
          </div>
        </div>

        <div className="panel px-4 py-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <PieChart size={15} className="text-ink-muted dark:text-slate-400" />
            <h3 className="section-title">专注时长分布</h3>
          </div>

          {summary.slices.length === 0 ? (
            summary.untimed.length > 0 ? (
              <div className="mt-3 space-y-3">
                <ul className="space-y-2">
                  {summary.untimed.map((item) => {
                    const clickable = Boolean(onOpenRecord && item.recordId)
                    return (
                      <li
                        key={item.key}
                        className={`flex items-center gap-2 text-sm ${
                          clickable ? 'cursor-pointer rounded px-1 py-0.5 hover:bg-surface-muted dark:hover:bg-slate-700/40' : 'px-1'
                        }`}
                        onClick={clickable ? () => onOpenRecord?.(item.recordId as number) : undefined}
                        title={clickable ? '去这条记录里填用时' : undefined}
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand/50" />
                        <span className="min-w-0 flex-1 truncate text-ink-soft dark:text-slate-300">{item.label}</span>
                        <span className="shrink-0 text-xs text-ink-muted dark:text-slate-400">
                          未填用时{clickable ? ' · 去填写' : ''}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <p className="text-xs text-ink-muted dark:text-slate-400">
                  这些是今天完成的计划，还没有填写用时。到「当天记录」里给它们加上用时（点上面这几条，或点记录右侧的铅笔），这里就会显示专注时长分布。
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-muted dark:text-slate-400">
                这一天还没有专注记录，用左侧的「专注航班」开始一段专注，或给记录填上用时。
              </p>
            )
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
                <Donut slices={summary.slices} minutes={summary.minutes} />
                <ul className="w-full min-w-0 space-y-2">
                  {summary.slices.map((slice) => (
                    <li key={slice.key} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                      <span className="min-w-0 flex-1 truncate text-ink-soft dark:text-slate-300">{slice.label}</span>
                      <span className="shrink-0 text-xs text-ink-muted dark:text-slate-400">{formatMinutes(slice.minutes)}</span>
                      <span className="w-12 shrink-0 text-right text-xs font-medium text-ink dark:text-slate-200">
                        {slice.percent.toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {summary.untimed.length > 0 && (
                <p className="text-xs text-ink-muted dark:text-slate-400">
                  另有 {summary.untimed.length} 项完成的计划还没填用时，暂不计入时长：
                  {summary.untimed.map((item) => item.label).join('、')}
                  。到「当天记录」里给它们加上用时就会显示出来。
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default FocusPanel
