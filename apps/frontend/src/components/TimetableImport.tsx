import { useEffect, useState } from 'react'
import { FileUp, RefreshCw, Save, School, Search, Upload, X } from 'lucide-react'
import { useTimetableMutations } from '../lib/queries'
import { api } from '../lib/api'
import type { ParseTimetableResult } from '../lib/types'
import { CUSTOM_SCHOOL_ID, SCHOOL_PRESETS, detectPresetByUrl } from '../lib/schoolPresets'

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

function dayLabel(day: number) {
  return `周${DAY_LABELS[day - 1] ?? day}`
}

function Preview({ result, onSave, saving }: { result: ParseTimetableResult; onSave: () => void; saving: boolean }) {
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
      <div className="flex justify-end">
        <button className="btn-primary" onClick={onSave} disabled={saving}>
          <Save size={15} /> 保存到课表
        </button>
      </div>
    </div>
  )
}

export function TimetableImport({ onClose }: { onClose: () => void }) {
  const { save } = useTimetableMutations()
  const [tab, setTab] = useState<'file' | 'wisedu'>('file')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ParseTimetableResult | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [rawText, setRawText] = useState('')
  const [term, setTerm] = useState('')
  const [week1, setWeek1] = useState('')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://jwxt.xjzfu.edu.cn')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaImg, setCaptchaImg] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')
  const [wiseduTerm, setWiseduTerm] = useState('')
  const [school, setSchool] = useState(() => detectPresetByUrl('https://jwxt.xjzfu.edu.cn'))

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
        term: wiseduTerm || undefined,
        base_url: baseUrl,
      })
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const applySchool = (id: string) => {
    setSchool(id)
    const preset = SCHOOL_PRESETS.find((p) => p.id === id)
    setBaseUrl(preset ? preset.baseUrl : '')
  }

  const saveResult = async () => {
    if (!result) return
    setBusy(true)
    setError('')
    try {
      await save.mutateAsync({
        term: result.term || wiseduTerm || term,
        courses: result.courses,
        week1_date: week1 || undefined,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-md border border-line bg-surface-soft p-0.5 dark:border-slate-700 dark:bg-slate-900/50">
        <button
          className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition ${
            tab === 'file' ? 'bg-surface text-brand-ink shadow-sm dark:bg-slate-700 dark:text-teal-100' : 'text-ink-muted dark:text-slate-400'
          }`}
          onClick={() => {
            setTab('file')
            setResult(null)
            setError('')
          }}
        >
          <Upload size={15} /> 文件导入
        </button>
        <button
          className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition ${
            tab === 'wisedu' ? 'bg-surface text-brand-ink shadow-sm dark:bg-slate-700 dark:text-teal-100' : 'text-ink-muted dark:text-slate-400'
          }`}
          onClick={() => {
            setTab('wisedu')
            setResult(null)
            setError('')
          }}
        >
          <School size={15} /> 教务系统导入
        </button>
      </div>

      {error && <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p>}

      {tab === 'file' && (
        <div className="space-y-3">
          <label className="label flex items-center gap-1">
            <FileUp size={13} /> 上传文件（Excel / HTML / ICS）
          </label>
          <input
            type="file"
            accept=".xlsx,.xls,.html,.htm,.ics"
            className="field"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <label className="label">或粘贴课表文字 / HTML</label>
          <textarea
            className="field resize-none"
            rows={4}
            placeholder="粘贴教务系统复制的表格，或含 <table> 的 HTML"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">学年学期（可留空自动识别）</label>
              <input className="field" placeholder="例如 2025-2026-1" value={term} onChange={(e) => setTerm(e.target.value)} />
            </div>
            <div>
              <label className="label">开学第 1 周周一（用于生成计划）</label>
              <input type="date" className="field" value={week1} onChange={(e) => setWeek1(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="btn" onClick={parseFile} disabled={busy}>
              <Search size={15} /> 解析
            </button>
          </div>
        </div>
      )}

      {tab === 'wisedu' && (
        <div className="space-y-3">
          <div>
            <label className="label">学校</label>
            <select className="field" value={school} onChange={(e) => applySchool(e.target.value)}>
              {SCHOOL_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value={CUSTOM_SCHOOL_ID}>自定义（手动填写）</option>
            </select>
          </div>
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
              {captchaImg ? (
                <img src={`data:image/png;base64,${captchaImg}`} alt="验证码" className="h-full w-full object-contain" />
              ) : (
                <RefreshCw size={16} />
              )}
            </button>
            <button type="button" className="btn-ghost p-2" onClick={refreshCaptcha} aria-label="刷新验证码" title="刷新验证码">
              <RefreshCw size={16} />
            </button>
          </div>
          <div>
            <label className="label">学年学期（可留空自动识别）</label>
            <input className="field" placeholder="例如 2025-2026-1" value={wiseduTerm} onChange={(e) => setWiseduTerm(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <button className="btn" onClick={fetchWisedu} disabled={busy || !username || !password || !captchaToken}>
              <Search size={15} /> 抓取课表
            </button>
          </div>
        </div>
      )}

      {result && <Preview result={result} onSave={saveResult} saving={busy} />}
      <div className="flex justify-end gap-2 border-t border-line-soft pt-3 dark:border-slate-700/60">
        <button className="btn-ghost" onClick={onClose}>
          <X size={15} /> 取消
        </button>
      </div>
    </div>
  )
}
