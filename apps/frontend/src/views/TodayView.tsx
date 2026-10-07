import { useMemo, useState } from 'react'
import { parseISO, format } from 'date-fns'
import { ChevronLeft, ChevronRight, Lock, Plus } from '../components/icons'
import { PlanItem } from '../components/PlanItem'
import { RecordItem } from '../components/RecordItem'
import { FocusPanel } from '../components/FocusPanel'
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
  const planTitles = useMemo(() => new Map(plans.map((plan) => [plan.id, plan.title])), [plans])

  const shiftDay = (n: number) => {
    const next = new Date(parsed)
    next.setDate(next.getDate() + n)
    onChangeDate(format(next, 'yyyy-MM-dd'))
  }

  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][parsed.getDay()]

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-end gap-3">
          <div className="flex items-center gap-0.5 pb-1">
            <button className="btn-ghost p-1.5" onClick={() => shiftDay(-1)} aria-label="前一天">
              <ChevronLeft size={16} strokeWidth={1.75} />
            </button>
            <button className="btn-ghost p-1.5" onClick={() => shiftDay(1)} aria-label="后一天">
              <ChevronRight size={16} strokeWidth={1.75} />
            </button>
            <button className="btn-quiet px-2" onClick={() => onChangeDate(todayISO())}>
              今天
            </button>
          </div>
          <div className="h-9 w-px bg-line dark:bg-slate-800" />
          <div>
            <h1 className="flex items-baseline gap-2.5 tracking-title text-ink dark:text-slate-100">
              <span className="page-title tnum">{format(parsed, 'M月d日')}</span>
              <span className="text-sm text-ink-faint dark:text-slate-500">
                {weekday}
                {isToday && ' · 今天'}
              </span>
            </h1>
            <p className="mt-1 text-xs text-ink-muted dark:text-slate-400">
              今天记录 {records.filter((r) => r.is_completed).length} 段航程
            </p>
          </div>
        </div>
        {locked ? (
          <span className="chip w-fit px-2 py-1">
            <Lock size={12} strokeWidth={1.75} /> 这一天已封存
          </span>
        ) : (
          <div className="flex gap-2">
            <button className="btn-record" onClick={() => setModal({ type: 'record' })}>
              <Plus size={14} strokeWidth={2} />
              记一笔
            </button>
            <button className="btn-primary" onClick={() => setModal({ type: 'plan' })}>
              <Plus size={14} strokeWidth={2} />
              新建计划
            </button>
          </div>
        )}
      </div>

      {statsQ.data && <StatsPanel stats={statsQ.data} />}

      <div className="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-2">
        <section className="min-w-0">
          <header className="flex items-baseline justify-between gap-2 border-b border-line pb-2.5 dark:border-slate-800">
            <h2 className="eyebrow">当日计划</h2>
            <span className="tnum text-2xs text-ink-faint dark:text-slate-500">{plans.length} 项</span>
          </header>
          <div className="mt-0.5">
            {plans.length === 0 ? (
              <EmptyState title="这一天还没有计划" hint="提前安排好要做的事" />
            ) : (
              plans.map((p) => <PlanItem key={p.id} plan={p} onEdit={(plan) => setModal({ type: 'plan', initial: plan })} />)
            )}
          </div>
        </section>

        <section className="min-w-0">
          <header className="flex items-baseline justify-between gap-2 border-b border-line pb-2.5 dark:border-slate-800">
            <h2 className="eyebrow">当天记录</h2>
            <span className="tnum text-2xs text-ink-faint dark:text-slate-500">{records.length} 条</span>
          </header>
          <div className="mt-0.5">
            {records.length === 0 ? (
              <EmptyState title="还没有记录" hint="记录今天实际完成了什么" />
            ) : (
              records.map((r) => <RecordItem key={r.id} record={r} onEdit={(record) => setModal({ type: 'record', initial: record })} />)
            )}
          </div>
        </section>
      </div>

      <FocusPanel
        date={date}
        records={records}
        planTitles={planTitles}
        onOpenRecord={(recordId) => {
          const record = records.find((item) => item.id === recordId)
          if (record && !locked) setModal({ type: 'record', initial: record })
        }}
      />

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
