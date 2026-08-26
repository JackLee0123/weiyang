import { Inbox } from 'lucide-react'

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-line px-4 py-10 text-center dark:border-slate-700">
      <Inbox size={26} className="text-ink-faint dark:text-slate-600" />
      <p className="mt-2 text-sm font-medium text-ink-muted dark:text-slate-300">{title}</p>
      {hint && <p className="mt-1 text-xs text-ink-faint dark:text-slate-500">{hint}</p>}
    </div>
  )
}
