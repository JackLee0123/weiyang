import { useMemo, useState } from 'react'
import { addDays, startOfMonth, startOfWeek, format, isSameMonth, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarPlus } from 'lucide-react'
import { usePlans, useRecords } from '../lib/queries'
import { monthRange, nextMonth, prevMonth, todayISO } from '../lib/date'
import type { Plan, RecordEntry } from '../lib/types'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

export function CalendarView({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const [month, setMonth] = useState(() => new Date())
  const range = monthRange(month)
  const plansQ = usePlans({ start: range.start, end: range.end })
  const recordsQ = useRecords({ start: range.start, end: range.end })

  const cells = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    return Array.from({ length: 42 }, (_, i) => addDays(first, i))
  }, [month])

  const planMap = useMemo(() => {
    const m = new Map<string, Plan[]>()
    for (const p of plansQ.data ?? []) {
      const list = m.get(p.date) ?? []
      list.push(p)
      m.set(p.date, list)
    }
    return m
  }, [plansQ.data])

  const recordMap = useMemo(() => {
    const m = new Map<string, RecordEntry[]>()
    for (const r of recordsQ.data ?? []) {
      const list = m.get(r.date) ?? []
      list.push(r)
      m.set(r.date, list)
    }
    return m
  }, [recordsQ.data])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink dark:text-slate-100">{format(month, 'yyyy年M月')}</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">点击日期查看当天计划与记录</p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-line bg-surface p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <button className="btn-ghost p-1.5" onClick={() => setMonth(prevMonth(month))} aria-label="上个月">
            <ChevronLeft size={16} />
          </button>
          <button className="btn-ghost p-1.5" onClick={() => setMonth(nextMonth(month))} aria-label="下个月">
            <ChevronRight size={16} />
          </button>
          <button className="btn-ghost px-2 text-xs" onClick={() => setMonth(new Date())}>
            回今天
          </button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line dark:border-slate-700">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`py-2 text-center text-xs font-medium ${
                i > 4 ? 'text-ink-faint dark:text-slate-500' : 'text-ink-muted dark:text-slate-400'
              }`}
            >
              周{w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const iso = format(day, 'yyyy-MM-dd')
            const inMonth = isSameMonth(day, month)
            const plans = planMap.get(iso) ?? []
            const records = recordMap.get(iso) ?? []
            const today = isToday(day)
            return (
              <button
                key={i}
                onClick={() => onOpenDay(iso)}
                className={`min-h-[72px] border-b border-r border-line-soft p-1.5 text-left align-top transition sm:min-h-[92px] ${
                  inMonth
                    ? 'bg-surface hover:bg-surface-soft dark:bg-slate-800 dark:hover:bg-slate-700/70'
                    : 'bg-surface-muted/70 hover:bg-surface-soft dark:bg-slate-900/30 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      today
                        ? 'bg-brand text-white'
                        : inMonth
                          ? 'text-ink dark:text-slate-200'
                          : 'text-ink-faint dark:text-slate-600'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {(plans.length || records.length) > 0 && (
                    <span className="text-[10px] text-ink-faint dark:text-slate-500">{plans.length + records.length} 项</span>
                  )}
                </div>
                <div className="mt-1 space-y-1">
                  {plans.slice(0, 2).map((p) => (
                    <div
                      key={p.id}
                      className="truncate rounded-sm bg-brand-soft px-1 py-0.5 text-[10px] text-brand-ink dark:bg-brand/15 dark:text-teal-200"
                    >
                      {p.title}
                    </div>
                  ))}
                  {records.slice(0, 1).map((r) => (
                    <div key={r.id} className="truncate rounded-sm bg-blue-50 px-1 py-0.5 text-[10px] text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                      {r.title}
                    </div>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-ink-muted dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-soft dark:bg-brand/20" /> 计划
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-50 dark:bg-blue-500/20" /> 记录
        </span>
        <button className="ml-auto flex items-center gap-1 text-ink-muted hover:text-brand dark:text-slate-400 dark:hover:text-brand" onClick={() => onOpenDay(todayISO())}>
          <CalendarPlus size={14} /> 去今天
        </button>
      </div>
    </div>
  )
}
