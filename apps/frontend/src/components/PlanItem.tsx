import { Check, Lock, Pencil } from './icons'
import type { Plan } from '../lib/types'
import { PriorityBadge, StatusBadge } from './badges'
import { ImageGallery } from './ImageGallery'
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
    <div className={`group -mx-2 flex items-center gap-3 rounded-md border-b border-line-soft px-2 py-3 transition-colors last:border-0 hover:bg-surface-soft/60 focus-within:bg-surface-soft/60 dark:border-slate-800 dark:hover:bg-slate-800/40 ${done ? 'opacity-55' : ''}`}>
      <button
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:ring-offset-1 ${
          locked
            ? 'cursor-not-allowed border-line text-ink-faint dark:border-slate-700 dark:text-slate-600'
            : done
              ? 'border-brand bg-brand text-white hover:bg-brand-deep dark:border-teal-300 dark:bg-teal-300 dark:text-slate-900'
              : 'border-line-strong text-transparent hover:border-brand dark:border-slate-600 dark:hover:border-teal-300'
        }`}
        onClick={toggle}
        aria-label={locked ? '已封存' : done ? '标记未完成' : '标记完成'}
        title={
          locked
            ? '已封存'
            : done
              ? '标记未完成（记录里同步的那条会一起移除）'
              : '标记完成（会在记录里同步一条）'
        }
      >
        <Check size={11} strokeWidth={3} />
      </button>
      <div className={`min-w-0 flex-1 ${locked ? '' : 'cursor-pointer'}`} title={plan.title} onClick={() => !locked && onEdit(plan)}>
        <p className={`truncate text-sm text-ink dark:text-slate-100 ${done ? 'line-through' : 'font-medium'}`}>{plan.title}</p>
        {(time || plan.category) && (
          <p className="mt-0.5 truncate text-2xs text-ink-faint dark:text-slate-500">
            {[time, plan.category].filter(Boolean).join(' · ')}
          </p>
        )}
        <ImageGallery images={plan.images ?? []} />
      </div>
      <div className="hidden shrink-0 items-center gap-3.5 sm:flex">
        <PriorityBadge priority={plan.priority} />
        <StatusBadge status={plan.status} />
      </div>
      <button
        className="btn-ghost p-1.5 text-ink-faint dark:text-slate-500"
        disabled={locked}
        onClick={() => onEdit(plan)}
        aria-label={locked ? '已封存' : '编辑计划'}
        title={locked ? '已封存' : '编辑计划'}
      >
        {locked ? <Lock size={14} strokeWidth={1.75} className="text-ink-faint dark:text-slate-600" /> : <Pencil size={14} strokeWidth={1.75} />}
      </button>
    </div>
  )
}
