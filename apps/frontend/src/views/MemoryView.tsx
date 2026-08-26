import { useState } from 'react'
import { addDays, addMonths, format, parseISO, subDays, subMonths } from 'date-fns'
import { BookOpen, ChevronLeft, ChevronRight, Flame, MapPin } from 'lucide-react'
import { useMemoryReport } from '../lib/queries'
import { monthRange, weekRange } from '../lib/date'
import { EmptyState } from '../components/EmptyState'

type Period = 'week' | 'month'

function fmtMinutes(min: number) {
  if (min < 60) return `${min} 分钟`
  const h = Math.floor(min / 60)
  return `${h} 小时${min % 60 ? ` ${min % 60} 分钟` : ''}`
}

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-ink dark:text-slate-100">
            <BookOpen size={18} className="text-brand dark:text-teal-300" />
            回忆
          </h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">把一段时光，还原成一段航程。</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-line dark:border-slate-600">
            {(['week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  period === p ? 'bg-brand text-white' : 'bg-surface text-ink-soft hover:bg-surface-soft dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
                onClick={() => setPeriod(p)}
              >
                {p === 'week' ? '周报' : '月报'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-md border border-line bg-surface p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <button className="btn-ghost p-1.5" onClick={() => shift(-1)} aria-label="上一期">
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[92px] text-center text-xs font-medium text-ink dark:text-slate-100">{label}</span>
            <button className="btn-ghost p-1.5" onClick={() => shift(1)} aria-label="下一期">
              <ChevronRight size={16} />
            </button>
          </div>
          {!isCurrent && (
            <button className="btn-ghost px-2 text-xs" onClick={() => setAnchor(new Date())}>
              回到本期
            </button>
          )}
        </div>
      </div>

      {!hasContent ? (
        <EmptyState title="这段时间还没有回忆" hint="记录当天内容或完成计划后，这里就会生长出航程" />
      ) : (
        <>
          <p className="text-sm leading-6 text-ink-soft dark:text-slate-300">
            这段时光里，你记录了 <span className="font-semibold text-ink dark:text-slate-100">{report.records_count}</span> 段航程，飞了{' '}
            <span className="font-semibold text-ink dark:text-slate-100">{fmtMinutes(report.recorded_minutes)}</span>。
            {report.top_categories.length > 0 && (
              <>
                {' '}主要飞的是：<span className="font-medium text-brand dark:text-teal-300">{report.top_categories.join('、')}</span>
              </>
            )}
            。有 <span className="font-semibold text-ink dark:text-slate-100">{report.active_days}</span> 天留下足迹，连续{' '}
            <span className="font-semibold text-ink dark:text-slate-100">{report.consecutive_recording_days}</span> 天在线。
          </p>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: '记录航段', value: `${report.records_count} 段` },
              { label: '飞行时长', value: fmtMinutes(report.recorded_minutes) },
              { label: '在线天数', value: `${report.active_days} 天` },
              { label: '连续记录', value: `${report.consecutive_recording_days} 天` },
            ].map((item) => (
              <div key={item.label} className="panel px-4 py-3">
                <p className="truncate text-xs text-ink-muted dark:text-slate-400">{item.label}</p>
                <p className="mt-1 truncate text-lg font-semibold text-ink dark:text-slate-100">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="panel p-4">
              <header className="flex items-baseline gap-2 border-b border-line pb-2.5 dark:border-slate-700">
                <h2 className="section-title">计划概览</h2>
                <span className="ml-auto text-xs text-ink-muted dark:text-slate-400">{report.total_plans} 项</span>
              </header>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  { label: '已抵达', value: report.done_plans },
                  { label: '未央', value: report.unfinished_plans },
                  { label: '改道', value: report.cancelled_plans },
                  { label: '完成率', value: `${Math.round(report.completion_rate * 100)}%` },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-ink-muted dark:text-slate-400">{item.label}</p>
                    <p className="mt-0.5 text-lg font-semibold text-ink dark:text-slate-100">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel p-4">
              <header className="flex items-baseline gap-2 border-b border-line pb-2.5 dark:border-slate-700">
                <h2 className="section-title">类别分布</h2>
                <span className="ml-auto text-xs text-ink-muted dark:text-slate-400">{totalRecords} 条记录</span>
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
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-soft dark:bg-slate-700/60">
                          <div
                            className="h-full rounded-full bg-brand dark:bg-teal-400"
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
              <header className="flex items-baseline gap-2 border-b border-line pb-2.5 dark:border-slate-700">
                <h2 className="section-title">未央 · 仍未抵达</h2>
                <span className="ml-auto text-xs text-ink-muted dark:text-slate-400">{report.unfinished.length} 项</span>
              </header>
              <div className="mt-3">
                {report.unfinished.length === 0 ? (
                  <p className="text-sm text-ink-muted dark:text-slate-400">这段回忆里没有未央的航段。</p>
                ) : (
                  <ul className="space-y-2">
                    {report.unfinished.map((plan) => (
                      <li key={plan.id} className="flex items-center gap-2 text-sm">
                        <span className="rounded-sm bg-surface-soft px-1.5 py-0.5 text-xs text-ink-muted dark:bg-slate-700/70 dark:text-slate-400">
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
                <Flame size={15} className="text-amber-500" />
                <span className="text-xs">足迹最多的一天</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <MapPin size={18} className="text-brand dark:text-teal-300" />
                <span className="text-lg font-semibold text-ink dark:text-slate-100">
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
