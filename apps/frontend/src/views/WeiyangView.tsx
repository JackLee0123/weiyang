import { useState } from 'react'
import { addDays } from 'date-fns'
import { CalendarClock, PlaneLanding, RotateCcw, Route } from 'lucide-react'
import { Modal } from '../components/Modal'
import { EmptyState } from '../components/EmptyState'
import { PriorityBadge, StatusBadge } from '../components/badges'
import { usePlanMutations, useUnfinishedPlans } from '../lib/queries'
import { toISO, todayISO } from '../lib/date'
import type { Plan } from '../lib/types'

export function WeiyangView() {
  const today = todayISO()
  const tomorrow = toISO(addDays(new Date(), 1))
  const [carry, setCarry] = useState<Plan | null>(null)
  const [target, setTarget] = useState(tomorrow)
  const unfinishedQ = useUnfinishedPlans()
  const { create, update } = usePlanMutations()

  const all = unfinishedQ.data ?? []
  const todayPlans = all.filter((plan) => plan.date === today)
  const enRoute = all.filter((plan) => plan.date < today)

  const openCarry = (plan: Plan) => {
    setCarry(plan)
    setTarget(tomorrow)
  }

  const applyCarry = async () => {
    if (!carry || !target) return
    if (carry.date >= today) {
      await update.mutateAsync({ id: carry.id, payload: { date: target } })
    } else {
      await create.mutateAsync({
        date: target,
        title: carry.title,
        description: carry.description,
        start_time: carry.start_time,
        end_time: carry.end_time,
        status: 'pending',
        priority: carry.priority,
        category: carry.category,
      })
    }
    setCarry(null)
  }

  if (unfinishedQ.isLoading) {
    return <div className="panel px-4 py-10 text-center text-sm text-ink-muted dark:text-slate-400">加载中…</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-ink dark:text-slate-100">
          <Route size={18} className="text-brand dark:text-teal-300" />
          未央
        </h1>
        <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">
          未完成的不是负债，是仍在航线上的部分。
        </p>
      </div>

      {all.length === 0 ? (
        <EmptyState title="此刻没有未央的计划" hint="可以顺延、留下，或安心继续飞行" />
      ) : (
        <>
          <section className="min-w-0">
            <header className="flex items-baseline gap-2 border-b border-line pb-2.5 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-ink dark:text-slate-100">今日仍飞来</h2>
              <span className="ml-auto text-xs text-ink-muted dark:text-slate-400">{todayPlans.length} 项</span>
            </header>
            <div className="mt-1">
              {todayPlans.length === 0 ? (
                <EmptyState title="今天没有待飞行的计划" hint="起飞前可以为今天设定航向" />
              ) : (
                todayPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="group flex flex-wrap items-center gap-3 border-b border-line-soft px-3 py-3 transition last:border-0 hover:bg-surface-soft dark:border-slate-700/70 dark:hover:bg-slate-700/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink dark:text-slate-100">{plan.title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted dark:text-slate-500">
                        {plan.start_time ? `${plan.start_time}${plan.end_time ? ' - ' + plan.end_time : ''}` : '起飞前'}
                      </p>
                    </div>
                    <div className="hidden items-center gap-1.5 sm:flex">
                      <span className="rounded-sm bg-surface-soft px-2 py-0.5 text-xs text-ink-muted dark:bg-slate-700/70 dark:text-slate-300">
                        {plan.category}
                      </span>
                      <PriorityBadge priority={plan.priority} />
                      <StatusBadge status={plan.status} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => update.mutateAsync({ id: plan.id, payload: { status: 'done' } })}>
                        <PlaneLanding size={14} />
                        完成抵达
                      </button>
                      <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => openCarry(plan)}>
                        <CalendarClock size={14} />
                        顺延
                      </button>
                      <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => update.mutateAsync({ id: plan.id, payload: { status: 'cancelled' } })}>
                        <RotateCcw size={14} />
                        改道
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="min-w-0">
            <header className="flex items-baseline gap-2 border-b border-line pb-2.5 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-ink dark:text-slate-100">已在途 · 未央</h2>
              <span className="ml-auto text-xs text-ink-muted dark:text-slate-400">{enRoute.length} 项</span>
            </header>
            <p className="mt-2 text-xs text-ink-muted dark:text-slate-500">这些是封存的回忆，不催促、也不算失败。</p>
            <div className="mt-1">
              {enRoute.length === 0 ? (
                <EmptyState title="没有封存的航段" hint="过去未完成的计划会安静地在这里停留" />
              ) : (
                enRoute.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex flex-wrap items-center gap-3 border-b border-line-soft px-3 py-3 transition last:border-0 hover:bg-surface-soft dark:border-slate-700/70 dark:hover:bg-slate-700/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink dark:text-slate-100">{plan.title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted dark:text-slate-500">{plan.date}</p>
                    </div>
                    <div className="hidden items-center gap-1.5 sm:flex">
                      <span className="rounded-sm bg-surface-soft px-2 py-0.5 text-xs text-ink-muted dark:bg-slate-700/70 dark:text-slate-300">
                        {plan.category}
                      </span>
                      <PriorityBadge priority={plan.priority} />
                      <StatusBadge status={plan.status} />
                    </div>
                    <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => openCarry(plan)}>
                      <CalendarClock size={14} />
                      顺延为新航段
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}

      {carry && (
        <Modal title="顺延到哪一天？" onClose={() => setCarry(null)}>
          <p className="mb-3 text-sm text-ink-soft dark:text-slate-300">{carry.title}</p>
          <label className="label" htmlFor="carry-date">
            新航段日期
          </label>
          <input
            id="carry-date"
            type="date"
            className="field"
            min={today}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary flex-1" onClick={applyCarry}>
              顺延到位
            </button>
            <button className="btn-ghost flex-1" onClick={() => setCarry(null)}>
              留在未央
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default WeiyangView
