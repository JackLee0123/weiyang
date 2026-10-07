import { Check, Lock, Pencil, Timer } from './icons'
import type { RecordEntry } from '../lib/types'
import { ImageGallery } from './ImageGallery'
import { useRecordMutations } from '../lib/queries'
import { isPast } from '../lib/date'

export function RecordItem({ record, onEdit }: { record: RecordEntry; onEdit: (record: RecordEntry) => void }) {
  const { update } = useRecordMutations()
  const locked = isPast(record.date)
  const toggle = async () => {
    if (locked) return
    await update.mutateAsync({ id: record.id, payload: { is_completed: !record.is_completed } })
  }

  return (
    <div className="group -mx-2 flex items-start gap-3 rounded-md border-b border-line-soft px-2 py-3 transition-colors last:border-0 hover:bg-surface-muted/60 focus-within:bg-surface-muted/60 dark:border-slate-800 dark:hover:bg-slate-800/40">
      <button
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[3px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:ring-offset-1 ${
          locked
            ? 'cursor-not-allowed border-line text-ink-faint dark:border-slate-700 dark:text-slate-600'
            : record.is_completed
              ? 'border-brand bg-brand text-white hover:bg-brand-deep dark:border-teal-300 dark:bg-teal-300 dark:text-slate-900'
              : 'border-line-strong hover:border-brand dark:border-slate-600 dark:hover:border-teal-300'
        }`}
        onClick={toggle}
        aria-label={locked ? '已封存' : '切换完成'}
        title={locked ? '已封存' : '切换完成'}
      >
        <Check size={11} strokeWidth={3} />
      </button>
      <div className={`min-w-0 flex-1 ${locked ? '' : 'cursor-pointer'}`} title={record.title} onClick={() => !locked && onEdit(record)}>
        <div className="flex items-baseline gap-2">
          <p className={`truncate text-sm text-ink dark:text-slate-100 ${record.is_completed ? 'font-medium' : 'text-ink-soft'}`}>{record.title}</p>
          {record.source === 'plan' && (
            <span
              className="shrink-0 text-2xs text-brand dark:text-teal-300"
              title="这条记录来自已完成的计划，取消计划的勾选就会一起移除"
            >
              来自计划
            </span>
          )}
        </div>
        {(record.content || record.category) && (
          <p className="mt-0.5 truncate text-2xs text-ink-faint dark:text-slate-500">
            {[record.category, record.content].filter(Boolean).join(' · ')}
          </p>
        )}
        <ImageGallery images={record.images ?? []} />
      </div>
      {record.duration_minutes != null && (
        <span className="tnum mt-0.5 flex shrink-0 items-center gap-1 text-2xs text-ink-muted dark:text-slate-400">
          <Timer size={12} strokeWidth={1.75} /> {record.duration_minutes} 分钟
        </span>
      )}
      <button
        className="btn-ghost p-1.5 text-ink-faint dark:text-slate-500"
        disabled={locked}
        onClick={() => onEdit(record)}
        aria-label={locked ? '已封存' : '编辑记录'}
        title={locked ? '已封存' : '编辑记录'}
      >
        {locked ? <Lock size={14} strokeWidth={1.75} className="text-ink-faint dark:text-slate-600" /> : <Pencil size={14} strokeWidth={1.75} />}
      </button>
    </div>
  )
}
