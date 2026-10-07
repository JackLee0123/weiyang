import { useMemo, useState } from 'react'
import { AlertTriangle, Check, Download, FileSpreadsheet, Loader2, Undo2, Upload, UserRound } from './icons'
import { useAdminScheduleImport } from '../lib/queries'
import { isPast } from '../lib/date'
import type { AdminScheduleImportResult, AdminSchedulePreview, AdminUser } from '../lib/types'

const PREVIEW_LIMIT = 50

const PRIORITY_LABEL: Record<string, string> = { high: '高', medium: '中', low: '低' }
const STATUS_LABEL: Record<string, string> = { pending: '待办', in_progress: '进行中', done: '已完成', cancelled: '已取消' }

function Summary({ preview, targetCount }: { preview: AdminSchedulePreview; targetCount: number }) {
  const pastCount = preview.rows.filter((row) => isPast(row.date)).length
  const dates = preview.rows.map((row) => row.date).sort()
  const detected = [
    preview.columns.date ? `日期＝「${preview.columns.date}」` : '',
    preview.columns.title ? `标题＝「${preview.columns.title}」` : '',
    preview.columns.time_range ? `时间＝「${preview.columns.time_range}」` : '',
  ].filter(Boolean)
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="rounded-sm text-2xs font-medium text-brand dark:text-teal-300">
        解析出 {preview.rows.length} 条日程
      </span>
      {detected.length > 0 && (
        <span className="rounded-sm bg-surface-muted px-2 py-0.5 text-ink-muted dark:bg-slate-700/70 dark:text-slate-300">
          自动识别：{detected.join('，')}
        </span>
      )}
      {dates.length > 0 && (
        <span className="rounded-sm bg-surface-muted px-2 py-0.5 text-ink-muted dark:bg-slate-700/70 dark:text-slate-300">
          日期范围 {dates[0]} ~ {dates[dates.length - 1]}
        </span>
      )}
      {preview.skipped > 0 && (
        <span className="rounded-sm text-2xs font-medium text-amber-700 dark:text-amber-300">
          {preview.skipped} 行无法识别，已跳过
        </span>
      )}
      {pastCount > 0 && (
        <span className="rounded-sm text-2xs font-medium text-amber-700 dark:text-amber-300">
          其中 {pastCount} 条已过期，导入时会自动跳过
        </span>
      )}
      {targetCount > 0 && (
        <span className="rounded-sm bg-surface-muted px-2 py-0.5 text-ink-muted dark:bg-slate-700/70 dark:text-slate-300">
          将写入 {targetCount} 人 × {preview.rows.length - pastCount} 条
        </span>
      )}
    </div>
  )
}

function ResultPanel({
  result,
  onRollback,
  rolling,
}: {
  result: AdminScheduleImportResult
  onRollback: () => void
  rolling: boolean
}) {
  return (
    <div className="notice-ok space-y-1">
      <p className="flex items-center gap-1.5 font-medium">
        <Check size={14} /> 已写入 {result.created} 条日程
        {result.skipped_duplicate > 0 && <span className="font-normal">· 跳过重复 {result.skipped_duplicate} 条</span>}
        {result.skipped_past > 0 && <span className="font-normal">· 跳过过去日期 {result.skipped_past} 条</span>}
      </p>
      <ul className="space-y-0.5">
        {result.targets.map((target) => (
          <li key={target.user_id} className="text-emerald-800 dark:text-emerald-200">
            {target.name || `用户 ${target.user_id}`}：写入 {target.created} 条
            {target.skipped_duplicate > 0 ? `，重复 ${target.skipped_duplicate} 条` : ''}
            {target.skipped_past > 0 ? `，过期 ${target.skipped_past} 条` : ''}
          </li>
        ))}
      </ul>
      {result.plan_ids.length > 0 && (
        <button className="btn-ghost px-2 py-1 text-xs text-emerald-800 dark:text-emerald-200" onClick={onRollback} disabled={rolling}>
          {rolling ? <Loader2 size={13} className="animate-spin" /> : <Undo2 size={13} />} 撤销本次导入
        </button>
      )}
    </div>
  )
}

export function AdminScheduleImport({ meId, users }: { meId: number; users: AdminUser[] }) {
  const { preview, importRows, rollback, template } = useAdminScheduleImport()
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<AdminSchedulePreview | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [includeSelf, setIncludeSelf] = useState(true)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [result, setResult] = useState<AdminScheduleImportResult | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const me = users.find((user) => user.id === meId)
  const activeUsers = useMemo(() => users.filter((user) => user.is_active), [users])
  // 「我自己」由单独的开关控制，用户列表里只放其他用户，避免重复计数。
  const otherUsers = useMemo(() => activeUsers.filter((user) => user.id !== meId), [activeUsers, meId])
  const targetCount = selected.length + (includeSelf ? 1 : 0)

  const reset = () => {
    setParsed(null)
    setResult(null)
    setMessage(null)
  }

  const handleFile = (next: File | null) => {
    setFile(next)
    reset()
  }

  const doPreview = async () => {
    if (!file) {
      setMessage({ kind: 'error', text: '请先选择 .xlsx 日程表文件' })
      return
    }
    setMessage(null)
    setResult(null)
    try {
      const data = await preview.mutateAsync(file)
      setParsed(data)
      if (!data.rows.length) {
        setMessage({ kind: 'error', text: '没有解析出任何日程，请检查表格里的「日期」和「标题」两列' })
      }
    } catch (error) {
      setParsed(null)
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '解析失败' })
    }
  }

  const doImport = async () => {
    if (!parsed) return
    if (targetCount === 0) {
      setMessage({ kind: 'error', text: '请至少选择一个导入对象' })
      return
    }
    setMessage(null)
    try {
      const data = await importRows.mutateAsync({
        rows: parsed.rows,
        user_ids: selected,
        include_self: includeSelf,
        skip_duplicates: skipDuplicates,
      })
      setResult(data)
      setMessage({ kind: 'ok', text: `已把 ${data.created} 条日程写入 ${data.targets.length} 个日程表` })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '导入失败' })
    }
  }

  const doRollback = async () => {
    if (!result?.plan_ids.length) return
    setMessage(null)
    try {
      const data = await rollback.mutateAsync(result.plan_ids)
      setResult(null)
      setMessage({ kind: 'ok', text: `已撤销本次导入，删除 ${data.deleted} 条日程` })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '撤销失败' })
    }
  }

  const doDownloadTemplate = async () => {
    setMessage(null)
    try {
      const blob = await template.mutateAsync()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = '日程导入模板.xlsx'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '模板下载失败' })
    }
  }

  const toggleUser = (userId: number) => {
    setSelected((list) => (list.includes(userId) ? list.filter((id) => id !== userId) : [...list, userId]))
  }

  return (
    <section className="space-y-4 panel p-4">
      <header className="flex flex-wrap items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center text-ink-faint dark:text-slate-500">
          <FileSpreadsheet size={15} />
        </div>
        <h2 className="section-title">批量导入日程</h2>
        <button className="btn-ghost ml-auto px-2 py-1 text-xs" onClick={() => void doDownloadTemplate()} disabled={template.isPending}>
          {template.isPending ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} 下载模板
        </button>
      </header>

      <p className="text-xs text-ink-muted dark:text-slate-400">
        上传一份 .xlsx 日程表，可以把同一批日程一次性写进你自己和选定用户的日程里。系统会
        <span className="font-medium text-ink dark:text-slate-200">自动识别</span>
        哪一列是日期、哪一列是日程内容——表头写成「日期 / 标题」可以，写成「上课时间 / 课程名称」这类也可以，
        没有表头同样能认；解析后会告诉你是按哪两列识别的。
        <span className="font-medium text-ink dark:text-slate-200">横向按周排布</span>
        的表格也支持：第一行写星期几或日期、下面的格子里写当天的安排，会自动把每个格子放进对应日期。
        开始 / 结束时间、备注、分类、优先级、状态、重复这些列有就识别，没有也不影响。已存在的相同日程会自动跳过，过去的日期不会写入。
      </p>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label className="label flex items-center gap-1">
            <Upload size={13} /> 日程表文件（.xlsx）
          </label>
          <input
            type="file"
            accept=".xlsx,.xlsm"
            className="field"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <button className="btn-primary" onClick={() => void doPreview()} disabled={!file || preview.isPending}>
          {preview.isPending ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />} 解析预览
        </button>
      </div>

      {message && (
        <p className={`text-xs ${message.kind === 'error' ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
          {message.text}
        </p>
      )}

      {parsed && (
        <div className="space-y-3 rounded-md border border-line-soft bg-surface-muted p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
          <Summary preview={parsed} targetCount={targetCount} />

          {parsed.warnings.length > 0 && (
            <div className="notice-warn">
              <p className="mb-1 flex items-center gap-1 font-medium">
                <AlertTriangle size={13} /> 解析提示
              </p>
              <ul className="list-disc space-y-0.5 pl-4">
                {parsed.warnings.slice(0, 6).map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="max-h-72 overflow-auto rounded-md border border-line dark:border-slate-700">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="sticky top-0 bg-surface-muted text-ink-muted dark:bg-slate-900/90 dark:text-slate-400">
                <tr>
                  <th className="px-2 py-1.5 font-medium">日期</th>
                  <th className="px-2 py-1.5 font-medium">时间</th>
                  <th className="px-2 py-1.5 font-medium">标题</th>
                  <th className="px-2 py-1.5 font-medium">分类</th>
                  <th className="px-2 py-1.5 font-medium">优先级</th>
                  <th className="px-2 py-1.5 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft dark:divide-slate-700/60">
                {parsed.rows.slice(0, PREVIEW_LIMIT).map((row, index) => (
                  <tr key={`${row.date}-${row.title}-${index}`} className={isPast(row.date) ? 'text-ink-faint dark:text-slate-500' : ''}>
                    <td className="px-2 py-1.5">
                      {row.date}
                      {isPast(row.date) && <span className="ml-1 text-[11px]">（已过期）</span>}
                    </td>
                    <td className="px-2 py-1.5">{row.start_time ? `${row.start_time}${row.end_time ? `-${row.end_time}` : ''}` : '全天'}</td>
                    <td className="px-2 py-1.5 text-ink dark:text-slate-100">{row.title}</td>
                    <td className="px-2 py-1.5">{row.category}</td>
                    <td className="px-2 py-1.5">{PRIORITY_LABEL[row.priority] ?? row.priority}</td>
                    <td className="px-2 py-1.5">{STATUS_LABEL[row.status] ?? row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsed.rows.length > PREVIEW_LIMIT && (
            <p className="text-xs text-ink-muted dark:text-slate-400">仅预览前 {PREVIEW_LIMIT} 条，导入时会把全部 {parsed.rows.length} 条都写入。</p>
          )}

          <div className="space-y-2 border-t border-line-soft pt-3 dark:border-slate-700/60">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-ink dark:text-slate-100">导入给谁</span>
              <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setSelected(otherUsers.map((user) => user.id))}>
                全选用户
              </button>
              <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setSelected([])}>
                清空
              </button>
              <span className="text-xs text-ink-muted dark:text-slate-400">已选 {targetCount} 个日程表</span>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink dark:text-slate-100">
              <input type="checkbox" checked={includeSelf} onChange={(event) => setIncludeSelf(event.target.checked)} />
              <UserRound size={14} className="text-ink-muted dark:text-slate-400" />
              我自己{me ? `（${me.name}）` : ''}
            </label>

            <div className="max-h-44 space-y-1 overflow-auto rounded-md border border-line p-2 dark:border-slate-700">
              {otherUsers.length === 0 && <p className="text-xs text-ink-muted dark:text-slate-400">还没有其他可选的用户</p>}
              {otherUsers.map((user) => (
                <label key={user.id} className="flex items-center gap-2 rounded px-1 py-0.5 text-sm text-ink dark:text-slate-100">
                  <input type="checkbox" checked={selected.includes(user.id)} onChange={() => toggleUser(user.id)} />
                  <span>
                    {user.name}
                    <span className="ml-1.5 text-xs text-ink-muted dark:text-slate-400">{user.email}</span>
                  </span>
                </label>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-ink-soft dark:text-slate-300">
              <input type="checkbox" checked={skipDuplicates} onChange={(event) => setSkipDuplicates(event.target.checked)} />
              跳过已存在的相同日程（同一天、同一标题、同一开始时间）
            </label>

            <div className="flex justify-end">
              <button className="btn-primary" onClick={() => void doImport()} disabled={importRows.isPending || !parsed.rows.length || targetCount === 0}>
                {importRows.isPending ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} 确认导入
              </button>
            </div>
          </div>
        </div>
      )}

      {result && <ResultPanel result={result} onRollback={() => void doRollback()} rolling={rollback.isPending} />}
    </section>
  )
}

export default AdminScheduleImport
