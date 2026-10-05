import { Inbox } from 'lucide-react'

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <Inbox size={20} strokeWidth={1.5} className="text-ink-faint dark:text-slate-600" />
      <p className="mt-3 text-sm text-ink-muted dark:text-slate-300">{title}</p>
      {hint && <p className="mt-1 text-xs text-ink-faint dark:text-slate-500">{hint}</p>}
    </div>
  )
}
