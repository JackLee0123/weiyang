import { Check, Lock, Pencil } from 'lucide-react'
import type { Plan } from '../lib/types'
import { PriorityBadge, StatusBadge } from './badges'
import { usePlanMutations } from '../lib/queries'
import { isPast } from '../lib/date'

export function PlanItem({ plan, onEdit }: { plan: Plan; onEdit: (plan: Plan) => void }) {
  const { update } = usePlanMutations()
  const locked = isPast(plan.date)
  const done = plan.status === 'done'
  const toggle = async () => {
    if (locked) return
    await update.mutateAsync({ id: plan.id, payload: { status: done ? 'pending' : 'done' } })
  }
  const time = plan.start_time ? `${plan.start_time}${plan.end_time ? ' - ' + plan.end_time : ''}` : ''

  return (
    <div className={`group flex items-center gap-3 border-b border-line-soft px-3 py-3 transition last:border-0 hover:bg-surface-soft focus-within:bg-surface-soft dark:border-slate-700/70 dark:hover:bg-slate-700/40 ${done ? 'opacity-70' : ''}`}>
      <button
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
          locked
            ? 'cursor-not-allowed border-line text-ink-faint dark:border-slate-600 dark:text-slate-600'
            : done
              ? 'border-brand bg-brand text-white hover:bg-brand-deep'
              : 'border-line-strong text-transparent hover:border-brand dark:border-slate-600 dark:hover:border-brand'
        }`}
        onClick={toggle}
        aria-label={locked ? '已封存' : done ? '标记未完成' : '标记完成'}
        title={locked ? '已封存' : done ? '标记未完成' : '标记完成'}
      >
        <Check size={12} strokeWidth={3} />
      </button>
      <div className={`min-w-0 flex-1 ${locked ? '' : 'cursor-pointer'}`} title={plan.title} onClick={() => !locked && onEdit(plan)}>
        <p className={`truncate text-sm font-medium text-ink dark:text-slate-100 ${done ? 'line-through' : ''}`}>{plan.title}</p>
        {time && <p className="mt-0.5 text-xs text-ink-muted dark:text-slate-500">{time}</p>}
      </div>
      <div className="hidden items-center gap-1.5 sm:flex">
        <span className="rounded-sm bg-surface-soft px-2 py-0.5 text-xs text-ink-muted dark:bg-slate-700/70 dark:text-slate-300">{plan.category}</span>
        <PriorityBadge priority={plan.priority} />
        <StatusBadge status={plan.status} />
      </div>
      <button
        className="btn-ghost p-1.5"
        disabled={locked}
        onClick={() => onEdit(plan)}
        aria-label={locked ? '已封存' : '编辑计划'}
        title={locked ? '已封存' : '编辑计划'}
      >
        {locked ? <Lock size={15} className="text-ink-faint dark:text-slate-600" /> : <Pencil size={15} />}
      </button>
    </div>
  )
}
