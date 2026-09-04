import { useEffect, useState } from 'react'
import { Lock, Pi, Trash2 } from 'lucide-react'
import { ImageUpload } from './ImageUpload'
import { useRecordMutations } from '../lib/queries'
import type { Plan, RecordEntry, RecordEntryPayload } from '../lib/types'
import { CATEGORIES } from '../lib/constants'
import { isPast, todayISO } from '../lib/date'

const EMPTY_PLANS: Plan[] = []

interface Props {
  defaultDate: string
  initial?: RecordEntry
  plans?: Plan[]
  onClose: () => void
}

export function RecordForm({ defaultDate, initial, plans = EMPTY_PLANS, onClose }: Props) {
  const { create, update, remove } = useRecordMutations()
  const [error, setError] = useState('')
  const [form, setForm] = useState<RecordEntryPayload>({
    date: initial?.date ?? defaultDate,
    title: initial?.title ?? '',
    content: initial?.content ?? '',
    duration_minutes: initial?.duration_minutes ?? null,
    is_completed: initial?.is_completed ?? true,
    category: initial?.category ?? CATEGORIES[0],
    linked_plan_id: initial?.linked_plan_id ?? null,
    images: initial?.images ?? [],
  })

  useEffect(() => {
    setForm({
      date: initial?.date ?? defaultDate,
      title: initial?.title ?? '',
      content: initial?.content ?? '',
      duration_minutes: initial?.duration_minutes ?? null,
      is_completed: initial?.is_completed ?? true,
      category: initial?.category ?? CATEGORIES[0],
      linked_plan_id: initial?.linked_plan_id ?? null,
      images: initial?.images ?? [],
    })
  }, [initial, defaultDate, plans])

  const set = <K extends keyof RecordEntryPayload>(key: K, value: RecordEntryPayload[K]) => setForm((f) => ({ ...f, [key]: value }))
  const locked = isPast(form.date)
  const dayPlans = plans.filter((p) => p.date === form.date && p.status !== 'cancelled')

  const submit = async () => {
    if (!form.title.trim() || locked) return
    const payload = { ...form, duration_minutes: form.duration_minutes || null, linked_plan_id: form.linked_plan_id || null }
    try {
      if (initial) await update.mutateAsync({ id: initial.id, payload })
      else await create.mutateAsync(payload)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="space-y-4">
      {locked && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          <Lock size={14} className="mt-0.5 shrink-0" />
          过去的日期已封存为永久回忆，无法添加或修改记录。
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">日期</label>
          <input type="date" className="field" min={todayISO()} value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div>
          <label className="label">分类</label>
          <select className="field" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">记录标题</label>
        <input className="field" placeholder="今天做了什么？" value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus />
      </div>

      <div>
        <label className="label">具体内容</label>
        <textarea className="field resize-none" rows={3} placeholder="记录完成情况、心得、产出……" value={form.content} onChange={(e) => set('content', e.target.value)} />
      </div>

      <ImageUpload images={form.images ?? []} onChange={(images) => set('images', images)} disabled={locked} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label flex items-center gap-1">
            <Pi size={12} /> 用时（分钟）
          </label>
          <input
            type="number"
            min={0}
            className="field"
            value={form.duration_minutes ?? ''}
            onChange={(e) => set('duration_minutes', e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label">关联计划</label>
          <select className="field" value={form.linked_plan_id ?? ''} onChange={(e) => set('linked_plan_id', e.target.value ? Number(e.target.value) : null)}>
            <option value="">不关联</option>
            {dayPlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-soft dark:text-slate-300">
        <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand" checked={form.is_completed ?? true} onChange={(e) => set('is_completed', e.target.checked)} />
        标记为已完成
      </label>

      <div className="flex items-center justify-between pt-2">
        {initial && (
          <button
            className="btn text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent dark:text-rose-300 dark:hover:bg-rose-500/10 dark:disabled:text-slate-600"
            disabled={locked}
            onClick={async () => {
              try {
                await remove.mutateAsync(initial.id)
                onClose()
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e))
              }
            }}
          >
            <Trash2 size={15} /> 删除
          </button>
        )}
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn-primary" onClick={submit} disabled={!form.title.trim() || locked}>
            {initial ? '保存' : '添加记录'}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p>}
    </div>
  )
}
