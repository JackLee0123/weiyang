import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, CalendarPlus, ChevronLeft, ChevronRight, Plus, Settings, Trash2, Upload } from 'lucide-react'
import { Modal } from '../components/Modal'
import { TimetableImport } from '../components/TimetableImport'
import { useCourses, useTimetableMutations, useTimetableSettings } from '../lib/queries'
import { addDaysISO, mondayOf, todayISO } from '../lib/date'
import { courseActiveOn, weekIndexFor } from '../lib/timetable'
import { CUSTOM_SCHOOL_ID, SCHOOL_PRESETS, detectPreset } from '../lib/schoolPresets'
import type { PeriodTime, TimetableSettings } from '../lib/types'

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

function SettingsForm({ initial, onClose }: { initial: TimetableSettings; onClose: () => void }) {
  const { updateSettings } = useTimetableMutations()
  const [term, setTerm] = useState(initial.active_term)
  const [week1, setWeek1] = useState(initial.week1_date ?? '')
  const [periods, setPeriods] = useState<PeriodTime[]>(initial.period_times.length ? initial.period_times : [])
  const [school, setSchool] = useState(() => detectPreset(initial.period_times))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const setPeriod = (idx: number, key: 'start' | 'end', value: string) =>
    setPeriods((list) => list.map((p, i) => (i === idx ? { ...p, [key]: value } : p)))

  const applySchool = (id: string) => {
    setSchool(id)
    const preset = SCHOOL_PRESETS.find((p) => p.id === id)
    if (preset) setPeriods(preset.periodTimes.map((t) => ({ ...t })))
  }

  const submit = async () => {
    setError('')
    setBusy(true)
    try {
      await updateSettings.mutateAsync({ active_term: term, week1_date: week1 || undefined, period_times: periods })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">学校</label>
        <select className="field" value={school} onChange={(e) => applySchool(e.target.value)}>
          {SCHOOL_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value={CUSTOM_SCHOOL_ID}>自定义（手动设置）</option>
        </select>
        {school === CUSTOM_SCHOOL_ID && (
          <p className="mt-1 text-xs text-ink-muted dark:text-slate-400">其他学校请手动填写下方各节次时间。</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">当前学年学期</label>
          <input className="field" placeholder="例如 2025-2026-1" value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <div>
          <label className="label">开学第 1 周周一</label>
          <input type="date" className="field" value={week1} onChange={(e) => setWeek1(e.target.value)} />
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="label mb-0">各节次时间</label>
          <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setPeriods((list) => [...list, { start: '08:00', end: '08:45' }])}>
            <Plus size={13} /> 添加节次
          </button>
        </div>
        <div className="space-y-1.5">
          {periods.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-xs text-ink-muted dark:text-slate-400">第{i + 1}节</span>
              <input type="time" className="field" value={p.start} onChange={(e) => setPeriod(i, 'start', e.target.value)} />
              <span className="text-xs text-ink-faint dark:text-slate-500">-</span>
              <input type="time" className="field" value={p.end} onChange={(e) => setPeriod(i, 'end', e.target.value)} />
              <button className="btn-ghost p-1.5" onClick={() => setPeriods((list) => list.filter((_, idx) => idx !== i))} aria-label="删除该节次" title="删除该节次">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-line-soft pt-3 dark:border-slate-700/60">
        <button className="btn-ghost" onClick={onClose}>
          取消
        </button>
        <button className="btn-primary" onClick={submit} disabled={busy}>
          保存
        </button>
      </div>
    </div>
  )
}

export function TimetableView() {
  const settingsQ = useTimetableSettings()
  const activeTerm = settingsQ.data?.active_term ?? ''
  const coursesQ = useCourses(activeTerm || undefined)
  const { generate, remove } = useTimetableMutations()
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayISO()))
  const [showImport, setShowImport] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const weekIndex = weekIndexFor(weekStart, settingsQ.data?.week1_date)
  const weekEnd = addDaysISO(weekStart, 6)
  const periodTimes = settingsQ.data?.period_times ?? []

  const weekCourses = useMemo(() => {
    const all = coursesQ.data?.courses ?? []
    if (!activeTerm) return []
    return all.filter((c) => c.term === activeTerm && courseActiveOn(c, weekIndex))
  }, [coursesQ.data, activeTerm, weekIndex])

  const maxPeriod = Math.max(periodTimes.length, ...weekCourses.map((c) => c.end_period).concat([1]), 1)
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1)
  const periodTime = (p: number) => {
    const t = periodTimes[p - 1]
    return t ? `${t.start}-${t.end}` : ''
  }

  const hasWeek1 = !!settingsQ.data?.week1_date
  const allCourses = coursesQ.data?.courses ?? []

  const doGenerate = async () => {
    setMsg('')
    if (!activeTerm || !hasWeek1) return
    setBusy(true)
    try {
      const text = await generate.mutateAsync({ term: activeTerm, week_start: weekStart })
      setMsg(`已生成 ${text.created} 条课程计划${text.skipped_duplicate ? `，跳过重复 ${text.skipped_duplicate} 条` : ''}${text.skipped_past ? `，跳过过去日期 ${text.skipped_past} 条` : ''}`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const deleteCourse = async (id: number) => {
    await remove.mutateAsync(id).catch(() => undefined)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink dark:text-slate-100">课表</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">
            {activeTerm ? `${activeTerm} · 第 ${weekIndex} 周` : '未选择学期'} · {format(new Date(weekStart + 'T00:00:00'), 'M月d日')} -{' '}
            {format(new Date(weekEnd + 'T00:00:00'), 'M月d日')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-line bg-surface p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <button className="btn-ghost p-1.5" onClick={() => setWeekStart(addDaysISO(weekStart, -7))} aria-label="上一周">
              <ChevronLeft size={16} />
            </button>
            <button className="btn-ghost p-1.5" onClick={() => setWeekStart(addDaysISO(weekStart, 7))} aria-label="下一周">
              <ChevronRight size={16} />
            </button>
            <button className="btn-ghost px-2 text-xs" onClick={() => setWeekStart(mondayOf(todayISO()))}>
              本周
            </button>
          </div>
          <button className="btn-ghost" onClick={() => setShowSettings(true)}>
            <Settings size={15} /> 设置
          </button>
          <button className="btn-ghost" onClick={() => setShowImport(true)}>
            <Upload size={15} /> 导入课表
          </button>
          <button className="btn-primary" onClick={doGenerate} disabled={busy || !activeTerm || !hasWeek1 || !weekCourses.length}>
            <CalendarPlus size={15} /> 生成本周计划
          </button>
        </div>
      </div>

      {!hasWeek1 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <div>
            尚未设置开学第 1 周周一的日期，无法生成课程计划。请先在「设置」中确认。
          </div>
        </div>
      )}
      {msg && <p className="text-sm text-ink-muted dark:text-slate-400">{msg}</p>}

      {activeTerm && weekCourses.length > 0 ? (
        <div className="panel overflow-x-auto">
          <div className="grid min-w-[760px]" style={{ gridTemplateColumns: '5rem repeat(7, 1fr)' }}>
            <div style={{ gridColumn: 1, gridRow: 1 }} className="border-b border-r border-line-soft px-1 py-2 text-center text-xs font-medium text-ink-faint dark:border-slate-700/60 dark:text-slate-500">
              节
            </div>
            {DAY_LABELS.map((d, i) => (
              <div key={d} style={{ gridColumn: i + 2, gridRow: 1 }} className="border-b border-r border-line-soft px-1 py-2 text-center text-xs font-medium text-ink-muted dark:border-slate-700/60 dark:text-slate-400">
                周{d}
              </div>
            ))}
            {periods.map((p) => (
              <div key={`p${p}`} style={{ gridColumn: 1, gridRow: p + 1 }} className="border-b border-r border-line-soft px-1 py-1 text-center text-xs text-ink-faint dark:border-slate-700/60 dark:text-slate-500">
                <div>{p}</div>
                {periodTime(p) && <div className="text-[9px] leading-tight opacity-80">{periodTime(p)}</div>}
              </div>
            ))}
            {periods.flatMap((p) =>
              DAY_LABELS.map((_, dIdx) => (
                <div
                  key={`${p}-${dIdx}`}
                  style={{ gridColumn: dIdx + 2, gridRow: p + 1 }}
                  className="min-h-[36px] border-b border-r border-line-soft dark:border-slate-700/60"
                />
              )),
            )}
            {weekCourses.map((c) => (
              <div
                key={`${c.id}-${c.day_of_week}`}
                style={{
                  gridColumn: c.day_of_week + 1,
                  gridRow: `${c.start_period + 1} / span ${Math.max(1, c.end_period - c.start_period + 1)}`,
                }}
                className="mx-0.5 my-0.5 overflow-hidden rounded-sm bg-brand-soft px-1.5 py-1 text-[10px] leading-tight text-brand-ink dark:bg-brand/15 dark:text-teal-100"
              >
                <p className="truncate font-medium">{c.name}</p>
                {(c.teacher || c.location) && (
                  <p className="truncate text-[9px] opacity-80">{[c.teacher, c.location].filter(Boolean).join(' · ')}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="panel flex flex-col items-center gap-3 px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink dark:text-slate-100">还没有该学期的课表</p>
          <p className="text-sm text-ink-muted dark:text-slate-400">从教务系统导入，或上传课表文件。</p>
          <button className="btn-primary" onClick={() => setShowImport(true)}>
            <Upload size={15} /> 导入课表
          </button>
        </div>
      )}

      {activeTerm && allCourses.length > 0 && (
        <section className="panel">
          <header className="flex items-center justify-between border-b border-line-soft px-4 py-2.5 dark:border-slate-700/60">
            <h2 className="text-sm font-semibold text-ink dark:text-slate-100">已导入课程</h2>
            <span className="text-xs text-ink-muted dark:text-slate-400">{allCourses.length} 条</span>
          </header>
          <div className="max-h-72 overflow-auto">
            <ul className="divide-y divide-line-soft dark:divide-slate-700/60">
              {allCourses.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink dark:text-slate-100">{c.name}</p>
                    <p className="truncate text-xs text-ink-muted dark:text-slate-400">
                      {`周${DAY_LABELS[c.day_of_week - 1]}`} {c.start_period}
                      {c.end_period !== c.start_period ? `-${c.end_period}` : ''}节
                      {c.teacher ? ` · ${c.teacher}` : ''}
                      {c.location ? ` · ${c.location}` : ''}
                      {c.week_label ? ` · ${c.week_label}` : ''}
                    </p>
                  </div>
                  <button className="btn-ghost p-1.5" onClick={() => deleteCourse(c.id)} aria-label="删除课程" title="删除课程">
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {showImport && (
        <Modal title="导入课表" onClose={() => setShowImport(false)}>
          <TimetableImport onClose={() => setShowImport(false)} />
        </Modal>
      )}
      {showSettings && settingsQ.data && (
        <Modal title="课表设置" onClose={() => setShowSettings(false)}>
          <SettingsForm initial={settingsQ.data} onClose={() => setShowSettings(false)} />
        </Modal>
      )}
    </div>
  )
}
