import { useState } from 'react'
import { addDays, addMonths, format, parseISO, subDays, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Flame, MapPin } from '../components/icons'
import { useMemoryReport } from '../lib/queries'
import { monthRange, weekRange } from '../lib/date'
import { formatMinutes } from '../lib/format'
import { EmptyState } from '../components/EmptyState'

type Period = 'week' | 'month'

function fmtDay(date: string) {
  return format(parseISO(date), 'M月d日')
}

export function MemoryView() {
  const [period, setPeriod] = useState<Period>('week')
  const [anchor, setAnchor] = useState(() => new Date())

  const range = period === 'week' ? weekRange(anchor) : monthRange(anchor)
  const currentRange = period === 'week' ? weekRange(new Date()) : monthRange(new Date())
  const reportQ = useMemoryReport(range.start, range.end)
  const report = reportQ.data

  const shift = (dir: 1 | -1) => {
    setAnchor((prev) => {
      if (period === 'week') return dir === 1 ? addDays(prev, 7) : subDays(prev, 7)
      return dir === 1 ? addMonths(prev, 1) : subMonths(prev, 1)
    })
  }

  const label =
    period === 'week'
      ? `${fmtDay(range.start)} – ${fmtDay(range.end)}`
      : format(parseISO(range.start), 'yyyy年M月')

  const isCurrent = range.start === currentRange.start

  if (reportQ.isLoading) {
    return <div className="panel px-4 py-10 text-center text-sm text-ink-muted dark:text-slate-400">加载中…</div>
  }

  if (!report) {
    return <div className="panel px-4 py-10 text-center text-sm text-ink-muted dark:text-slate-400">暂时无法生成回忆</div>
  }

  const totalRecords = Object.values(report.by_category).reduce((sum, value) => sum + value, 0)
  const maxCategory = totalRecords ? Math.max(...Object.values(report.by_category)) : 0
  const hasContent = report.records_count > 0 || report.total_plans > 0

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-title text-ink dark:text-slate-100">回忆</h1>
          <p className="mt-1 text-xs text-ink-muted dark:text-slate-400">把一段时光，还原成一段航程。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            {(['week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  period === p
                    ? 'bg-surface-soft font-medium text-ink dark:bg-slate-800 dark:text-slate-100'
                    : 'text-ink-muted hover:bg-surface-soft/60 hover:text-ink dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
                }`}
                onClick={() => setPeriod(p)}
              >
                {p === 'week' ? '周报' : '月报'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            <button className="btn-ghost p-1.5" onClick={() => shift(-1)} aria-label="上一期">
              <ChevronLeft size={16} strokeWidth={1.75} />
            </button>
            <span className="tnum min-w-[92px] text-center text-xs text-ink dark:text-slate-100">{label}</span>
            <button className="btn-ghost p-1.5" onClick={() => shift(1)} aria-label="下一期">
              <ChevronRight size={16} strokeWidth={1.75} />
            </button>
          </div>
          {!isCurrent && (
            <button className="btn-quiet px-2" onClick={() => setAnchor(new Date())}>
              回到本期
            </button>
          )}
        </div>
      </div>

      {!hasContent ? (
        <EmptyState title="这段时间还没有回忆" hint="记录当天内容或完成计划后，这里就会生长出航程" />
      ) : (
        <>
          <p className="text-sm leading-7 text-ink-soft dark:text-slate-300">
            这段时光里，你记录了 <span className="tnum font-medium text-ink dark:text-slate-100">{report.records_count}</span> 段航程，飞了{' '}
            <span className="tnum font-medium text-ink dark:text-slate-100">{formatMinutes(report.recorded_minutes)}</span>。
            {report.top_categories.length > 0 && (
              <>
                {' '}主要飞的是：<span className="font-medium text-brand dark:text-teal-300">{report.top_categories.join('、')}</span>
              </>
            )}
            。有 <span className="tnum font-medium text-ink dark:text-slate-100">{report.active_days}</span> 天留下足迹，连续{' '}
            <span className="tnum font-medium text-ink dark:text-slate-100">{report.consecutive_recording_days}</span> 天在线。
          </p>

          <div className="grid grid-cols-1 divide-y divide-line border-y border-line dark:divide-slate-800 dark:border-slate-800 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {[
              { label: '记录航段', value: `${report.records_count} 段` },
              { label: '飞行时长', value: formatMinutes(report.recorded_minutes) },
              { label: '在线天数', value: `${report.active_days} 天` },
              { label: '连续记录', value: `${report.consecutive_recording_days} 天` },
            ].map((item) => (
              <div key={item.label} className="flex items-baseline justify-between gap-4 py-3 sm:block sm:px-4 sm:py-3.5 sm:first:pl-0 sm:last:pr-0">
                <p className="text-xs text-ink-muted dark:text-slate-400">{item.label}</p>
                <p className="tnum text-[22px] font-light leading-7 tracking-title text-ink dark:text-slate-100 sm:mt-1.5">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="panel p-4">
              <header className="flex items-baseline gap-2 border-b border-line pb-2.5 dark:border-slate-700/60">
                <h2 className="eyebrow">计划概览</h2>
                <span className="tnum ml-auto text-2xs text-ink-faint dark:text-slate-500">{report.total_plans} 项</span>
              </header>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  { label: '已抵达', value: report.done_plans },
                  { label: '未央', value: report.unfinished_plans },
                  { label: '改道', value: report.cancelled_plans },
                  { label: '完成率', value: `${Math.round(report.completion_rate * 100)}%` },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-2xs text-ink-muted dark:text-slate-400">{item.label}</p>
                    <p className="tnum mt-0.5 text-lg font-light text-ink dark:text-slate-100">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel p-4">
              <header className="flex items-baseline gap-2 border-b border-line pb-2.5 dark:border-slate-700/60">
                <h2 className="eyebrow">类别分布</h2>
                <span className="tnum ml-auto text-2xs text-ink-faint dark:text-slate-500">{totalRecords} 条记录</span>
              </header>
              <div className="mt-3 space-y-2.5">
                {Object.entries(report.by_category).length === 0 ? (
                  <p className="text-sm text-ink-muted dark:text-slate-400">这段时间还没有记录。</p>
                ) : (
                  Object.entries(report.by_category)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, count]) => (
                      <div key={category}>
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="text-ink-soft dark:text-slate-300">{category}</span>
                          <span className="text-xs text-ink-muted dark:text-slate-500">{count} 条</span>
                        </div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-soft dark:bg-slate-700/50">
                          <div
                            className="h-full rounded-full bg-brand/80 dark:bg-teal-300/80"
                            style={{ width: maxCategory ? `${(count / maxCategory) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>
                    ))
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="panel p-4">
              <header className="flex items-baseline gap-2 border-b border-line pb-2.5 dark:border-slate-700/60">
                <h2 className="eyebrow">未央 · 仍未抵达</h2>
                <span className="tnum ml-auto text-2xs text-ink-faint dark:text-slate-500">{report.unfinished.length} 项</span>
              </header>
              <div className="mt-3">
                {report.unfinished.length === 0 ? (
                  <p className="text-sm text-ink-muted dark:text-slate-400">这段回忆里没有未央的航段。</p>
                ) : (
                  <ul className="space-y-2">
                    {report.unfinished.map((plan) => (
                      <li key={plan.id} className="flex items-center gap-2.5 text-sm">
                        <span className="tnum shrink-0 text-2xs text-ink-faint dark:text-slate-500">
                          {plan.date.slice(5)}
                        </span>
                        <span className="truncate text-ink-soft dark:text-slate-300">{plan.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="panel flex flex-col justify-center p-4">
              <div className="flex items-center gap-2 text-ink-muted dark:text-slate-400">
                <Flame size={14} strokeWidth={1.75} className="text-ink-faint dark:text-slate-500" />
                <span className="eyebrow">足迹最多的一天</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <MapPin size={16} strokeWidth={1.75} className="text-brand dark:text-teal-300" />
                <span className="tnum text-lg font-light text-ink dark:text-slate-100">
                  {report.busiest_day ? fmtDay(report.busiest_day) : '暂无'}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-ink-muted dark:text-slate-500">
                {report.busiest_day ? '那天你留下了最多的记录，是这段航程里在线最久的一天。' : '记录下当天做了什么，这里会记住你。'}
              </p>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

export default MemoryView
