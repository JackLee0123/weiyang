import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Flame, MapPin } from 'lucide-react'
import { useHeatmap } from '../lib/queries'
import { activityLevel, buildCalendarWeeks, buildYearRange, LEVEL_CLASS, scoreOf } from '../lib/heatmap'
import { toISO } from '../lib/date'

const DAY_LABELS: Record<number, string | null> = { 0: '周一', 3: '周四', 6: '周日' }
const CELL = 14
const GAP = 3

export function HeatmapView({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const range = useMemo(() => buildYearRange(year), [year])
  const weeks = useMemo(() => buildCalendarWeeks(year), [year])
  const heatQ = useHeatmap(range.start, range.end)
  const dataMap = useMemo(() => new Map((heatQ.data ?? []).map((d) => [d.date, d])), [heatQ.data])

  const monthLabels = useMemo(() => {
    const labels: string[] = []
    let prev = ''
    for (const week of weeks) {
      const inYearDay = week.find((d) => d.getFullYear() === year)
      const label = inYearDay ? format(inYearDay, 'M月') : ''
      if (label && label !== prev) {
        labels.push(label)
        prev = label
      } else {
        labels.push('')
      }
    }
    return labels
  }, [weeks, year])

  const activeDays = heatQ.data?.length ?? 0
  const gridStyle = {
    gridTemplateRows: `repeat(7, ${CELL}px)`,
    gridAutoFlow: 'column' as const,
    gridAutoColumns: `${CELL}px`,
    gap: `${GAP}px`,
  }
  const monthRowStyle = {
    gridTemplateRows: `${CELL}px`,
    gridAutoFlow: 'column' as const,
    gridAutoColumns: `${CELL}px`,
    gap: `${GAP}px`,
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-ink dark:text-slate-100">
            <Flame size={18} className="text-brand dark:text-teal-300" />
            活跃度
          </h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">{year} 年 · 有 {activeDays} 天记录</p>
        </div>
        <div className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs text-ink-muted shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          颜色越深，那天你越在场（记录与完成都算）
        </div>
      </div>

      {heatQ.isLoading ? (
        <div className="panel px-4 py-10 text-center text-sm text-ink-muted dark:text-slate-400">加载中…</div>
      ) : (
        <div className="panel overflow-x-auto p-4">
          <div className="inline-flex">
            <div className="mr-2 grid" style={gridStyle}>
              {[0, 1, 2, 3, 4, 5, 6].map((row) => (
                <div key={row} className="flex items-center justify-end pr-2 text-[10px] text-ink-faint dark:text-slate-500">
                  {DAY_LABELS[row] ?? ''}
                </div>
              ))}
            </div>
            <div>
              <div className="mb-1 grid" style={monthRowStyle}>
                {monthLabels.map((label, i) => (
                  <div key={i} className="whitespace-nowrap text-[9px] leading-none text-ink-faint dark:text-slate-500">
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid" style={gridStyle}>
                {weeks.flatMap((week, wi) =>
                  week.map((day, row) => {
                    const iso = toISO(day)
                    const inYear = day.getFullYear() === year
                    const data = inYear ? dataMap.get(iso) : undefined
                    const score = scoreOf(data)
                    const level = activityLevel(score)
                    return (
                      <button
                        key={`${wi}-${row}`}
                        title={inYear ? `${format(day, 'yyyy年M月d日')} · 记录 ${data?.records_count ?? 0} 条 · 完成 ${data?.completed_plans ?? 0} 条计划` : ''}
                        disabled={!inYear}
                        onClick={() => inYear && onOpenDay(iso)}
                        className={`rounded-[2px] ${!inYear ? 'bg-slate-100/50 dark:bg-slate-700/30' : LEVEL_CLASS[level]} ${
                          inYear ? 'hover:ring-2 hover:ring-brand/40' : 'cursor-default'
                        }`}
                        aria-label={iso}
                      />
                    )
                  }),
                )}
              </div>
            </div>
          </div>

          {activeDays === 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-surface-soft px-3 py-2 text-xs text-ink-muted dark:bg-slate-700/40 dark:text-slate-300">
              <MapPin size={13} />
              这一年还没有活跃数据，记录当天内容或完成计划后，这里就会出现热度。
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted dark:text-slate-400">
            <span>少</span>
            {LEVEL_CLASS.map((cls) => (
              <span key={cls} className={`h-3 w-3 rounded-[2px] ${cls}`} />
            ))}
            <span>多</span>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 border-t border-line-soft pt-3 dark:border-slate-700">
            <button className="btn-ghost p-1.5" onClick={() => setYear((y) => y - 1)} aria-label="上一年">
              <ChevronLeft size={15} />
            </button>
            <span className="min-w-[64px] text-center text-sm font-medium text-ink dark:text-slate-100">{year} 年</span>
            <button className="btn-ghost p-1.5" onClick={() => setYear((y) => y + 1)} aria-label="下一年">
              <ChevronRight size={15} />
            </button>
            {year !== new Date().getFullYear() && (
              <button className="btn-ghost px-2 text-xs" onClick={() => setYear(new Date().getFullYear())}>
                回到今年
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
