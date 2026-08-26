import { Lock, Pencil, Timer } from 'lucide-react'
import type { RecordEntry } from '../lib/types'
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
    <div className="group flex items-start gap-3 border-b border-line-soft px-3 py-3 transition last:border-0 hover:bg-surface-soft focus-within:bg-surface-soft dark:border-slate-700/70 dark:hover:bg-slate-700/40">
      <button
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
          locked
            ? 'cursor-not-allowed border-line text-ink-faint dark:border-slate-600 dark:text-slate-600'
            : record.is_completed
              ? 'border-brand bg-brand text-white hover:bg-brand-deep'
              : 'border-line-strong hover:border-brand dark:border-slate-600 dark:hover:border-brand'
        }`}
        onClick={toggle}
        aria-label={locked ? '已封存' : '切换完成'}
        title={locked ? '已封存' : '切换完成'}
      >
        <span className="text-xs text-white">✓</span>
      </button>
      <div className={`min-w-0 flex-1 ${locked ? '' : 'cursor-pointer'}`} title={record.title} onClick={() => !locked && onEdit(record)}>
        <div className="flex items-center gap-2">
          <p className={`truncate text-sm font-medium text-ink dark:text-slate-100 ${record.is_completed ? '' : 'text-ink-soft'}`}>{record.title}</p>
          <span className="rounded-sm bg-surface-soft px-2 py-0.5 text-xs text-ink-muted dark:bg-slate-700/70 dark:text-slate-300">{record.category}</span>
        </div>
        {record.content && <p className="mt-0.5 truncate text-xs text-ink-muted dark:text-slate-400">{record.content}</p>}
      </div>
      {record.duration_minutes != null && (
        <span className="mt-0.5 flex shrink-0 items-center gap-1 text-xs text-ink-muted dark:text-slate-500">
          <Timer size={12} /> {record.duration_minutes} 分钟
        </span>
      )}
      <button
        className="btn-ghost p-1.5"
        disabled={locked}
        onClick={() => onEdit(record)}
        aria-label={locked ? '已封存' : '编辑记录'}
        title={locked ? '已封存' : '编辑记录'}
      >
        {locked ? <Lock size={15} className="text-ink-faint dark:text-slate-600" /> : <Pencil size={15} />}
      </button>
    </div>
  )
}
