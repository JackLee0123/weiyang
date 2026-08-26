import { useEffect, useState } from 'react'
import { Calendar, Clock, Flag, Lock, Trash2 } from 'lucide-react'
import { usePlanMutations } from '../lib/queries'
import type { Plan, PlanPayload, PlanStatus, Priority } from '../lib/types'
import { CATEGORIES, PRIORITY_OPTIONS, STATUS_OPTIONS } from '../lib/constants'
import { isPast, todayISO } from '../lib/date'

interface Props {
  defaultDate: string
  initial?: Plan
  onClose: () => void
}

export function PlanForm({ defaultDate, initial, onClose }: Props) {
  const { create, update, remove } = usePlanMutations()
  const [error, setError] = useState('')
  const [form, setForm] = useState<PlanPayload>({
    date: initial?.date ?? defaultDate,
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    start_time: initial?.start_time ?? '',
    end_time: initial?.end_time ?? '',
    status: initial?.status ?? 'pending',
    priority: initial?.priority ?? 'medium',
    category: initial?.category ?? CATEGORIES[0],
  })

  useEffect(() => {
    setForm({
      date: initial?.date ?? defaultDate,
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      start_time: initial?.start_time ?? '',
      end_time: initial?.end_time ?? '',
      status: initial?.status ?? 'pending',
      priority: initial?.priority ?? 'medium',
      category: initial?.category ?? CATEGORIES[0],
    })
  }, [initial, defaultDate])

  const set = <K extends keyof PlanPayload>(key: K, value: PlanPayload[K]) => setForm((f) => ({ ...f, [key]: value }))
  const locked = isPast(form.date)

  const submit = async () => {
    if (!form.title.trim() || locked) return
    const payload = { ...form, start_time: form.start_time || null, end_time: form.end_time || null }
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
          过去的日期已封存为永久回忆，无法添加或修改计划。
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
        <label className="label">计划标题</label>
        <input
          className="field"
          placeholder="例如：写周报"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          autoFocus
        />
      </div>

      <div>
        <label className="label">备注</label>
        <textarea className="field resize-none" rows={2} placeholder="补充计划细节" value={form.description} onChange={(e) => set('description', e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label flex items-center gap-1">
            <Clock size={12} /> 开始
          </label>
          <input type="time" className="field" value={form.start_time || ''} onChange={(e) => set('start_time', e.target.value)} />
        </div>
        <div>
          <label className="label flex items-center gap-1">
            <Clock size={12} /> 结束
          </label>
          <input type="time" className="field" value={form.end_time || ''} onChange={(e) => set('end_time', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label flex items-center gap-1">
            <Flag size={12} /> 优先级
          </label>
          <select className="field" value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label flex items-center gap-1">
            <Calendar size={12} /> 状态
          </label>
          <select className="field" value={form.status} onChange={(e) => set('status', e.target.value as PlanStatus)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

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
            {initial ? '保存' : '添加计划'}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p>}
    </div>
  )
}
