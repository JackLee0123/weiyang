import { BellRing, CalendarClock, Clock, Plus, RefreshCw, Save, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { PushScheduleRecurrence } from '../lib/types'

const WEEK = ['一', '二', '三', '四', '五', '六', '日']
const RECURRENCE: { value: PushScheduleRecurrence; label: string }[] = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' },
]

interface FormState {
  enabled: boolean
  recurrence: PushScheduleRecurrence
  times: string[]
  days_of_week: number[]
  day_of_month: number[]
  month: number
  day: number
  batch_days: number
}

const DEFAULT: FormState = {
  enabled: false,
  recurrence: 'daily',
  times: ['09:00'],
  days_of_week: [],
  day_of_month: [1],
  month: 1,
  day: 1,
  batch_days: 0,
}

export function ScheduleSettings({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<FormState>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<'none' | { next: string | null; text: string | null }>('none')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const view = await api.fetchPushSchedule()
      if (view.exists && view.schedule) {
        const s = view.schedule
        setForm({
          enabled: s.enabled,
          recurrence: s.recurrence,
          times: s.times.length ? s.times : ['09:00'],
          days_of_week: s.days_of_week ?? [],
          day_of_month: s.day_of_month?.length ? s.day_of_month : [1],
          month: s.month ?? 1,
          day: s.day ?? 1,
          batch_days: s.batch_days ?? 0,
        })
        setPreview({ next: view.next_fire ?? null, text: view.preview ?? null })
      } else {
        setForm(DEFAULT)
        setPreview('none')
      }
    } catch {
      setForm(DEFAULT)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setRecurrence = (rec: PushScheduleRecurrence) => {
    setForm((f) => ({ ...f, recurrence: rec }))
  }

  const addTime = () => {
    const last = form.times[form.times.length - 1] ?? '09:00'
    set('times', [...form.times, last])
  }

  const updateTime = (index: number, value: string) => {
    const next = [...form.times]
    next[index] = value
    set('times', next)
  }

  const removeTime = (index: number) => {
    set('times', form.times.filter((_, i) => i !== index))
  }

  const toggleWeekday = (d: number) => {
    const has = form.days_of_week.includes(d)
    set('days_of_week', has ? form.days_of_week.filter((x) => x !== d) : [...form.days_of_week, d].sort())
  }

  const toggleDayOfMonth = (d: number) => {
    const has = form.day_of_month.includes(d)
    set('day_of_month', has ? form.day_of_month.filter((x) => x !== d) : [...form.day_of_month, d].sort((a, b) => a - b))
  }

  const save = async () => {
    if (!form.times.length) {
      setMessage({ kind: 'error', text: '请至少添加一个时间点' })
      return
    }
    if (form.recurrence === 'weekly' && !form.days_of_week.length) {
      setMessage({ kind: 'error', text: '每周提醒请至少选择一个星期' })
      return
    }
    if (form.recurrence === 'monthly' && !form.day_of_month.length) {
      setMessage({ kind: 'error', text: '每月提醒请至少选择一个日期' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const payload = {
        enabled: form.enabled,
        recurrence: form.recurrence,
        times: form.times,
        days_of_week: form.days_of_week,
        day_of_month: form.day_of_month,
        month: form.recurrence === 'yearly' ? form.month : null,
        day: form.recurrence === 'yearly' ? form.day : null,
        batch_days: form.recurrence === 'daily' ? form.batch_days : 0,
      }
      const saved = await api.updatePushSchedule(payload)
      const view = await api.fetchPushSchedule()
      setPreview({ next: view.next_fire ?? null, text: view.preview ?? null })
      setMessage({ kind: 'ok', text: saved.enabled ? '已保存，届时将自动推送提醒。' : '已保存，提醒当前关闭。' })
    } catch (error) {
      const msg = error instanceof Error ? error.message : '保存失败，请重试'
      setMessage({ kind: 'error', text: msg })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-muted dark:text-slate-400">正在加载提醒设置…</p>
  }

  const toggleClass = (active: boolean) =>
    `h-8 min-w-8 rounded-md px-2 text-sm transition ${
      active
        ? 'bg-brand text-white dark:bg-brand/15 dark:text-teal-200'
        : 'text-ink-soft hover:bg-surface-soft dark:text-slate-300 dark:hover:bg-white/10'
    }`

  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-ink dark:text-slate-100">
          <BellRing size={17} className="text-brand dark:text-teal-300" />
          每日任务提醒
        </span>
        <span className="relative inline-flex h-6 w-11 items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={form.enabled}
            onChange={(event) => set('enabled', event.target.checked)}
          />
          <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-brand dark:bg-slate-600" />
          <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
        </span>
      </label>
      <p className="-mt-2 text-xs text-ink-faint dark:text-slate-500">
        需先在「接收通知」开启手机通知后，到点才会推送。
      </p>

      {message && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            message.kind === 'ok'
              ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-200'
              : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
          }`}
        >
          {message.text}
        </p>
      )}

      <div>
        <label className="label">重复方式</label>
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-surface-soft p-1 dark:bg-white/5">
          {RECURRENCE.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`rounded-md py-1.5 text-sm font-medium transition ${
                form.recurrence === item.value
                  ? 'bg-surface text-brand shadow-sm dark:bg-slate-700 dark:text-teal-200'
                  : 'text-ink-soft hover:text-ink dark:text-slate-300 dark:hover:text-slate-100'
              }`}
              onClick={() => setRecurrence(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">时间点（可多个）</label>
        <div className="space-y-2">
          {form.times.map((value, index) => (
            <div key={index} className="flex items-center gap-2">
              <Clock size={16} className="shrink-0 text-ink-faint dark:text-slate-500" />
              <input
                className="field w-28"
                type="time"
                value={value}
                onChange={(event) => updateTime(index, event.target.value)}
              />
              <span className="flex-1 text-xs text-ink-faint dark:text-slate-500">在此时间推送任务摘要</span>
              <button
                type="button"
                className="btn-ghost p-1.5"
                onClick={() => removeTime(index)}
                aria-label="删除时间点"
                title="删除时间点"
              >
                <X size={15} />
              </button>
            </div>
          ))}
          <button type="button" className="btn-ghost w-full justify-center border border-line dark:border-slate-600" onClick={addTime}>
            <Plus size={15} />
            添加时间点
          </button>
        </div>
      </div>

      {form.recurrence === 'daily' && (
        <div>
          <label className="label">批量天数（提前查看几天）</label>
          <div className="flex items-center gap-3">
            <input
              className="field w-24"
              type="number"
              min={0}
              max={31}
              value={form.batch_days}
              onChange={(event) => set('batch_days', Math.max(0, Math.min(31, Number(event.target.value) || 0)))}
            />
            <span className="text-xs text-ink-faint dark:text-slate-500">0 表示只提醒今天，{'>0'} 会一并列出未来几天的任务</span>
          </div>
        </div>
      )}

      {form.recurrence === 'weekly' && (
        <div>
          <label className="label">选择星期</label>
          <div className="flex flex-wrap gap-1">
            {WEEK.map((label, index) => (
              <button key={index} type="button" className={toggleClass(form.days_of_week.includes(index))} onClick={() => toggleWeekday(index)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {form.recurrence === 'monthly' && (
        <div>
          <label className="label">选择每月日期</label>
          <div className="grid grid-cols-8 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <button key={d} type="button" className={toggleClass(form.day_of_month.includes(d))} onClick={() => toggleDayOfMonth(d)}>
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {form.recurrence === 'yearly' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">月份</label>
            <select className="field" value={form.month} onChange={(event) => set('month', Number(event.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m} 月
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">日期</label>
            <select className="field" value={form.day} onChange={(event) => set('day', Number(event.target.value))}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d} 日
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {preview !== 'none' && (
        <div className="rounded-md bg-surface-soft p-3 text-sm dark:bg-white/5">
          <p className="flex items-center gap-2 font-medium text-ink dark:text-slate-100">
            <CalendarClock size={15} className="text-brand dark:text-teal-300" />
            下次提醒
          </p>
          {preview.next && (
            <p className="mt-1 text-ink-soft dark:text-slate-300">
              {new Date(preview.next).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          {preview.text && <p className="mt-1 whitespace-pre-wrap text-ink-muted dark:text-slate-400">{preview.text}</p>}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-line-soft pt-3 dark:border-slate-700/60">
        <button className="btn-ghost" onClick={load}>
          <RefreshCw size={15} />
          刷新
        </button>
        <button className="btn-primary" onClick={save} disabled={saving}>
          <Save size={15} />
          {saving ? '保存中…' : '保存'}
        </button>
        <button className="btn-ghost" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  )
}
