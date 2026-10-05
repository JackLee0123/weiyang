import { useEffect, useState } from 'react'
import { Calendar, Clock, Flag, Lock, Trash2 } from 'lucide-react'
import { ImageUpload } from './ImageUpload'
import { usePlanMutations } from '../lib/queries'
import type { Plan, PlanPayload, PlanStatus, Priority } from '../lib/types'
import { CATEGORIES, PRIORITY_OPTIONS, STATUS_OPTIONS } from '../lib/constants'
import { isPast, todayISO } from '../lib/date'

interface Props {
  defaultDate: string
  initial?: Plan
  onClose: () => void
}

/** 跨午夜的计划最长按 12 小时算，再长就基本是把开始与结束填反了（与后端统计同一口径）。 */
const MAX_CROSS_MIDNIGHT_MINUTES = 12 * 60

function plannedSpanMinutes(start?: string, end?: string): number | null {
  if (!start || !end) return null
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number)
    return hours * 60 + minutes
  }
  const startMinutes = toMinutes(start)
  let endMinutes = toMinutes(end)
  if (endMinutes === startMinutes) return 0
  if (endMinutes < startMinutes) endMinutes += 24 * 60
  return endMinutes - startMinutes
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
    images: initial?.images ?? [],
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
      images: initial?.images ?? [],
    })
  }, [initial, defaultDate])

  const set = <K extends keyof PlanPayload>(key: K, value: PlanPayload[K]) => setForm((f) => ({ ...f, [key]: value }))
  const locked = isPast(form.date)
  const span = plannedSpanMinutes(form.start_time ?? '', form.end_time ?? '')
  const timeWarning =
    span === 0
      ? '开始与结束时间相同，这条计划不会计入「计划用时」。'
      : span !== null && span > MAX_CROSS_MIDNIGHT_MINUTES
        ? '结束时间早于开始时间，看起来像填反了，这条计划不会计入「计划用时」。'
        : ''

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
        <div className="notice-warn">
          <Lock size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
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

      <ImageUpload images={form.images ?? []} onChange={(images) => set('images', images)} disabled={locked} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label flex items-center gap-1">
            <Clock size={12} strokeWidth={1.75} /> 开始
          </label>
          <input type="time" className="field" value={form.start_time || ''} onChange={(e) => set('start_time', e.target.value)} />
        </div>
        <div>
          <label className="label flex items-center gap-1">
            <Clock size={12} strokeWidth={1.75} /> 结束
          </label>
          <input type="time" className="field" value={form.end_time || ''} onChange={(e) => set('end_time', e.target.value)} />
        </div>
      </div>

      {timeWarning && <p className="text-xs text-amber-700 dark:text-amber-300">{timeWarning}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label flex items-center gap-1">
            <Flag size={12} strokeWidth={1.75} /> 优先级
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
            <Calendar size={12} strokeWidth={1.75} /> 状态
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
            className="btn-danger disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent dark:disabled:text-slate-600"
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
            <Trash2 size={14} strokeWidth={1.75} /> 删除
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
