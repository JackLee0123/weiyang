import { useRef, useState } from 'react'
import { Download, TriangleAlert, Upload } from './icons'
import { api } from '../lib/api'
import type { Backup } from '../lib/types'

type Pending = { name: string; data: Backup }

/** 用 FileReader 读文件：比 Blob.text() 兼容性更好（老浏览器与 jsdom 都没有 text()）。 */
function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('读取失败'))
    reader.readAsText(file)
  })
}

function describe(payload: Backup): string {
  return `${payload.plans?.length ?? 0} 个计划、${payload.records?.length ?? 0} 条记录`
}

/** 数据备份：导出全部计划与记录为 JSON，或从备份文件恢复。 */
export function BackupPanel({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const payload = await api.exportBackup()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `everlong-backup-${payload.exported_at?.slice(0, 10) || 'export'}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setMessage({ kind: 'ok', text: `已导出 ${describe(payload)}。` })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '导出失败' })
    } finally {
      setBusy(false)
    }
  }

  const handlePick = async (file?: File) => {
    setMessage(null)
    setPending(null)
    if (!file) return
    try {
      const payload = JSON.parse(await readAsText(file)) as Backup
      if (payload?.version !== 1 || !Array.isArray(payload.plans) || !Array.isArray(payload.records)) {
        throw new Error('不是有效的备份文件')
      }
      setPending({ name: file.name, data: payload })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '读取失败' })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleImport = async () => {
    if (!pending) return
    setBusy(true)
    setMessage(null)
    try {
      const result = await api.importBackup(pending.data)
      setMessage({ kind: 'ok', text: `已恢复 ${result.imported_plans} 个计划、${result.imported_records} 条记录。` })
      setPending(null)
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '恢复失败' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft dark:text-slate-300">
        导出的文件包含你的全部计划与记录（不含账号密码），适合换设备或定期留档。
      </p>

      <button className="btn-primary w-full" onClick={handleExport} disabled={busy}>
        <Download size={15} />
        导出备份文件
      </button>

      <div className="rounded-md border border-line-soft p-3 dark:border-slate-700/60">
        <p className="text-sm font-medium text-ink dark:text-slate-100">从备份恢复</p>
        <p className="mt-1 text-xs text-ink-muted dark:text-slate-400">
          恢复会<strong className="font-semibold text-rose-600 dark:text-rose-300">覆盖当前的全部计划与记录</strong>，建议先导出一次留底。
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="field mt-3"
          onChange={(e) => void handlePick(e.target.files?.[0])}
          disabled={busy}
        />
      </div>

      {pending && (
        <div className="notice-warn">
          <p className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
            <TriangleAlert size={15} className="mt-0.5 shrink-0" />
            <span>
              即将用 <strong className="font-semibold">{pending.name}</strong>（{describe(pending.data)}）覆盖当前数据，这一步无法撤销。
            </span>
          </p>
          <div className="mt-3 flex gap-2">
            <button className="btn-primary flex-1" onClick={handleImport} disabled={busy}>
              <Upload size={15} />
              {busy ? '恢复中…' : '确认覆盖恢复'}
            </button>
            <button className="btn-ghost flex-1" onClick={() => setPending(null)} disabled={busy}>
              取消
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={`text-xs ${message.kind === 'ok' ? 'text-brand dark:text-teal-300' : 'text-rose-600 dark:text-rose-300'}`}>
          {message.text}
        </p>
      )}

      <div className="flex items-center justify-end border-t border-line-soft pt-3 dark:border-slate-700/60">
        <button className="btn-ghost" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  )
}

export default BackupPanel
