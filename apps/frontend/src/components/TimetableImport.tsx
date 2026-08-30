import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Download, FileUp, Plus, RefreshCw, Save, School, Search, Settings2, Trash2, Upload, X } from 'lucide-react'
import { useTimetableMutations } from '../lib/queries'
import { api } from '../lib/api'
import type { ParseTimetableResult, PeriodTime, TimetableSettings } from '../lib/types'
import { CUSTOM_SCHOOL_ID, SCHOOL_PRESETS, detectPreset, detectPresetByUrl } from '../lib/schoolPresets'

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

function dayLabel(day: number) {
  return `周${DAY_LABELS[day - 1] ?? day}`
}

function Preview({ result }: { result: ParseTimetableResult }) {
  if (!result.courses.length) {
    return <p className="text-sm text-ink-muted dark:text-slate-400">没有解析出任何课程。</p>
  }
  return (
    <div className="space-y-3">
      {result.warnings.length > 0 && (
        <div className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          <p className="mb-1 font-medium">解析提示</p>
          <ul className="list-disc space-y-0.5 pl-4">
            {result.warnings.slice(0, 6).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="max-h-64 overflow-auto rounded-md border border-line dark:border-slate-700">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-surface-soft text-ink-muted dark:bg-slate-900/80 dark:text-slate-400">
            <tr>
              <th className="px-2 py-1.5 font-medium">课程</th>
              <th className="px-2 py-1.5 font-medium">星期</th>
              <th className="px-2 py-1.5 font-medium">节次</th>
              <th className="px-2 py-1.5 font-medium">教师</th>
              <th className="px-2 py-1.5 font-medium">教室</th>
              <th className="px-2 py-1.5 font-medium">周次</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft dark:divide-slate-700/60">
            {result.courses.map((c, i) => (
              <tr key={i}>
                <td className="px-2 py-1.5 text-ink dark:text-slate-100">{c.name}</td>
                <td className="px-2 py-1.5">{dayLabel(c.day_of_week)}</td>
                <td className="px-2 py-1.5">
                  {c.start_period}
                  {c.end_period !== c.start_period ? `-${c.end_period}` : ''}节
                </td>
                <td className="px-2 py-1.5">{c.teacher ?? '—'}</td>
                <td className="px-2 py-1.5">{c.location ?? '—'}</td>
                <td className="px-2 py-1.5">{c.week_label ?? (c.week_mask ? '按周次' : '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function TimetableImport({ initial, onClose }: { initial?: TimetableSettings; onClose: () => void }) {
  const { save, updateSettings } = useTimetableMutations()
  const [tab, setTab] = useState<'file' | 'wisedu'>('file')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ParseTimetableResult | null>(null)

  const [term, setTerm] = useState(initial?.active_term ?? '')
  const [week1, setWeek1] = useState(initial?.week1_date ?? '')
  const [periods, setPeriods] = useState<PeriodTime[]>(initial?.period_times?.length ? initial.period_times : [])
  const [school, setSchool] = useState(() => detectPreset(initial?.period_times ?? []))
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [rawText, setRawText] = useState('')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://jwxt.xjzfu.edu.cn')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaImg, setCaptchaImg] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')

  const setPeriod = (idx: number, key: 'start' | 'end', value: string) =>
    setPeriods((list) => list.map((p, i) => (i === idx ? { ...p, [key]: value } : p)))

  const applySchool = (id: string) => {
    setSchool(id)
    const preset = SCHOOL_PRESETS.find((p) => p.id === id)
    if (preset) {
      setPeriods(preset.periodTimes.map((t) => ({ ...t })))
      setBaseUrl((url) => (url === 'https://jwxt.xjzfu.edu.cn' ? preset.baseUrl : url))
    }
  }

  const refreshCaptcha = async () => {
    setError('')
    try {
      const data = await api.fetchWiseduCaptcha({ base_url: baseUrl })
      setCaptchaToken(data.captcha_token)
      setCaptchaImg(data.image)
      setCaptchaCode('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    if (tab === 'wisedu') void refreshCaptcha()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const parseFile = async () => {
    setError('')
    if (!file && !rawText.trim()) {
      setError('请选择一个文件或粘贴课表内容')
      return
    }
    setBusy(true)
    try {
      const data = await api.parseTimetable({ file: file ?? undefined, raw_text: rawText.trim() || undefined, term: term || undefined })
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const fetchWisedu = async () => {
    setError('')
    setBusy(true)
    try {
      const data = await api.fetchWiseduTimetable({
        username,
        password,
        captcha_token: captchaToken,
        captcha_code: captchaCode || undefined,
        term: term || undefined,
        base_url: baseUrl,
      })
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const doSave = async () => {
    setError('')
    setBusy(true)
    try {
      if (result) {
        await save.mutateAsync({
          term: result.term || term,
          courses: result.courses,
          week1_date: week1 || undefined,
          period_times: periods,
        })
      } else {
        await updateSettings.mutateAsync({ active_term: term, week1_date: week1 || undefined, period_times: periods })
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const switchTab = (next: 'file' | 'wisedu') => {
    setTab(next)
    setResult(null)
    setError('')
  }

  const schoolLabel = school === CUSTOM_SCHOOL_ID ? '自定义节次' : SCHOOL_PRESETS.find((p) => p.id === school)?.name ?? '自定义节次'

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-line-soft bg-surface-soft p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
          <label className="label">学期信息</label>
          <input className="field" placeholder="例如 2025-2026-1" value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <div className="rounded-md border border-line-soft bg-surface-soft p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
          <label className="label">开学第 1 周周一</label>
          <input type="date" className="field" value={week1} onChange={(e) => setWeek1(e.target.value)} />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink dark:text-slate-100">
          <Upload size={15} className="text-ink-muted dark:text-slate-400" />
          导入方式
        </div>
        <div className="flex gap-1 rounded-md border border-line bg-surface-soft p-0.5 dark:border-slate-700 dark:bg-slate-900/50">
          <button
            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition ${
              tab === 'file' ? 'bg-surface text-brand-ink shadow-sm dark:bg-slate-700 dark:text-teal-100' : 'text-ink-muted dark:text-slate-400'
            }`}
            onClick={() => switchTab('file')}
          >
            <FileUp size={15} /> 文件导入
          </button>
          <button
            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition ${
              tab === 'wisedu' ? 'bg-surface text-brand-ink shadow-sm dark:bg-slate-700 dark:text-teal-100' : 'text-ink-muted dark:text-slate-400'
            }`}
            onClick={() => switchTab('wisedu')}
          >
            <School size={15} /> 教务系统
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p>}

      {tab === 'file' && (
        <div className="space-y-3">
          <label className="label flex items-center gap-1">
            <FileUp size={13} /> 上传文件（Excel / HTML / ICS）
          </label>
          <input type="file" accept=".xlsx,.xls,.html,.htm,.ics" className="field" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <label className="label">或粘贴课表文字 / HTML</label>
          <textarea
            className="field resize-none"
            rows={4}
            placeholder="粘贴教务系统复制的表格，或含 <table> 的 HTML"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <div className="flex justify-end">
            <button className="btn-primary" onClick={parseFile} disabled={busy}>
              <Search size={15} /> 解析课表
            </button>
          </div>
        </div>
      )}

      {tab === 'wisedu' && (
        <div className="space-y-3">
          <div>
            <label className="label">教务系统网址（课表所在页面）</label>
            <input
              className="field"
              placeholder="https://jwxt.xjzfu.edu.cn"
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value)
                setSchool(detectPresetByUrl(e.target.value))
              }}
              onBlur={() => void refreshCaptcha()}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">学号</label>
              <input className="field" value={username} onChange={(e) => setUsername(e.target.value)} name="school_login_id" autoComplete="off" aria-autocomplete="none" />
            </div>
            <div>
              <label className="label">密码</label>
              <input type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} name="school_login_password" autoComplete="new-password" />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="label">验证码（如学校要求则填写）</label>
              <input className="field" value={captchaCode} onChange={(e) => setCaptchaCode(e.target.value)} autoComplete="off" placeholder="输入图中的字符" />
            </div>
            <button
              className="btn-ghost h-[38px] w-24 overflow-hidden border border-line"
              onClick={refreshCaptcha}
              title="刷新验证码"
              aria-label="刷新验证码"
            >
              {captchaImg ? <img src={`data:image/png;base64,${captchaImg}`} alt="验证码" className="h-full w-full object-contain" /> : <RefreshCw size={16} />}
            </button>
            <button type="button" className="btn-ghost p-2" onClick={refreshCaptcha} aria-label="刷新验证码" title="刷新验证码">
              <RefreshCw size={16} />
            </button>
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" onClick={fetchWisedu} disabled={busy || !username || !password || !captchaToken}>
              <Download size={15} /> 抓取课表
            </button>
          </div>
        </div>
      )}

      <div>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-line bg-surface-soft px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/40"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
        >
          <span className="flex items-center gap-1.5 text-ink dark:text-slate-100">
            <Settings2 size={15} className="text-ink-muted dark:text-slate-400" />
            学校与节次时间
            {!showAdvanced && (
              <span className="text-xs text-ink-muted dark:text-slate-400">
                · {schoolLabel}
                {periods.length ? ` · ${periods.length} 节` : ''}
              </span>
            )}
          </span>
          {showAdvanced ? <ChevronUp size={15} className="text-ink-muted dark:text-slate-400" /> : <ChevronDown size={15} className="text-ink-muted dark:text-slate-400" />}
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3">
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
              {school === CUSTOM_SCHOOL_ID && <p className="mt-1 text-xs text-ink-muted dark:text-slate-400">其他学校请手动填写下方各节次时间。</p>}
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
          </div>
        )}
      </div>

      {result && (
        <div className="rounded-md border border-line-soft bg-surface-soft p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
          <p className="mb-2 text-sm font-medium text-ink dark:text-slate-100">解析结果</p>
          <Preview result={result} />
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-line-soft pt-3 dark:border-slate-700/60">
        <button className="btn-ghost" onClick={onClose}>
          <X size={15} /> 取消
        </button>
        <button className="btn-primary" onClick={doSave} disabled={busy || (!result && !term)}>
          {result ? <Save size={15} /> : <Settings2 size={15} />}
          {result ? '保存到课表' : '保存设置'}
        </button>
      </div>
    </div>
  )
}
