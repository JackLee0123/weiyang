import { useState } from 'react'
import { parseISO, format } from 'date-fns'
import { CheckSquare, ChevronLeft, ChevronRight, ClipboardList, Lock, Plus } from 'lucide-react'
import { PlanItem } from '../components/PlanItem'
import { RecordItem } from '../components/RecordItem'
import { PlanForm } from '../components/PlanForm'
import { RecordForm } from '../components/RecordForm'
import { EmptyState } from '../components/EmptyState'
import { StatsPanel } from '../components/StatsPanel'
import { Modal } from '../components/Modal'
import { usePlans, useRecords, useStats } from '../lib/queries'
import { isPast, todayISO, weekRange } from '../lib/date'
import type { Plan, RecordEntry } from '../lib/types'

type ModalState = { type: 'plan'; initial?: Plan } | { type: 'record'; initial?: RecordEntry } | null

export function TodayView({ date, onChangeDate }: { date: string; onChangeDate: (d: string) => void }) {
  const [modal, setModal] = useState<ModalState>(null)
  const parsed = parseISO(date)
  const isToday = date === todayISO()
  const locked = isPast(date)
  const plansQ = usePlans({ start: date, end: date })
  const recordsQ = useRecords({ start: date, end: date })
  const week = weekRange(parsed)
  const statsQ = useStats(week.start, week.end)

  const plans = plansQ.data ?? []
  const records = recordsQ.data ?? []

  const shiftDay = (n: number) => {
    const next = new Date(parsed)
    next.setDate(next.getDate() + n)
    onChangeDate(format(next, 'yyyy-MM-dd'))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border border-line bg-surface p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <button className="btn-ghost p-1.5" onClick={() => shiftDay(-1)} aria-label="前一天">
              <ChevronLeft size={16} />
            </button>
            <button className="btn-ghost p-1.5" onClick={() => shiftDay(1)} aria-label="后一天">
              <ChevronRight size={16} />
            </button>
            <button className="btn-ghost px-2 text-xs" onClick={() => onChangeDate(todayISO())}>
              今天
            </button>
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-ink dark:text-slate-100">
              {format(parsed, 'M月d日')}
              {isToday && <span className="rounded-sm bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-ink dark:bg-brand/15 dark:text-teal-200">今天</span>}
            </h1>
            <p className="text-sm text-ink-muted dark:text-slate-400">
              已连续飞行 {statsQ.data?.consecutive_recording_days ?? 0} 天 · 今天记录{' '}
              {records.filter((r) => r.is_completed).length} 段航程
            </p>
          </div>
        </div>
        {locked ? (
          <span className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            <Lock size={14} /> 这一天已封存
          </span>
        ) : (
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setModal({ type: 'record' })}>
              <Plus size={15} />
              记一笔
            </button>
            <button className="btn-primary" onClick={() => setModal({ type: 'plan' })}>
              <Plus size={15} />
              新建计划
            </button>
          </div>
        )}
      </div>

      {statsQ.data && <StatsPanel stats={statsQ.data} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="min-w-0">
          <header className="flex items-center gap-2 border-b border-line pb-2.5 dark:border-slate-700">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-soft text-brand-ink dark:bg-brand/15 dark:text-teal-200">
              <ClipboardList size={15} />
            </div>
            <h2 className="section-title">当日计划</h2>
            <span className="ml-auto text-xs text-ink-muted dark:text-slate-400">{plans.length} 项</span>
          </header>
          <div className="mt-1">
            {plans.length === 0 ? (
              <EmptyState title="这一天还没有计划" hint="提前安排好要做的事" />
            ) : (
              plans.map((p) => <PlanItem key={p.id} plan={p} onEdit={(plan) => setModal({ type: 'plan', initial: plan })} />)
            )}
          </div>
        </section>

        <section className="min-w-0">
          <header className="flex items-center gap-2 border-b border-line pb-2.5 dark:border-slate-700">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
              <CheckSquare size={15} />
            </div>
            <h2 className="section-title">当天记录</h2>
            <span className="ml-auto text-xs text-ink-muted dark:text-slate-400">{records.length} 条</span>
          </header>
          <div className="mt-1">
            {records.length === 0 ? (
              <EmptyState title="还没有记录" hint="记录今天实际完成了什么" />
            ) : (
              records.map((r) => <RecordItem key={r.id} record={r} onEdit={(record) => setModal({ type: 'record', initial: record })} />)
            )}
          </div>
        </section>
      </div>

      {modal?.type === 'plan' && (
        <Modal title={modal.initial ? '编辑计划' : '新建计划'} onClose={() => setModal(null)}>
          <PlanForm defaultDate={date} initial={modal.initial} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === 'record' && (
        <Modal title={modal.initial ? '编辑记录' : '新增记录'} onClose={() => setModal(null)}>
          <RecordForm defaultDate={date} initial={modal.initial} plans={plans} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  )
}
