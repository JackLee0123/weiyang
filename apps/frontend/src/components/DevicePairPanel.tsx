import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, Watch } from 'lucide-react'
import { api } from '../lib/api'

interface PairCode {
  code: string
  expiresAt: number
}

/** 设备连接：生成 6 位配对码，供手环/手表「连接账户」页输入后换取令牌。 */
export function DevicePairPanel() {
  const [pair, setPair] = useState<PairCode | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<number | null>(null)

  const generate = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.createPairCode()
      setPair({ code: res.code, expiresAt: Date.now() + res.expires_in * 1000 })
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void generate()
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    }
  }, [generate])

  useEffect(() => {
    timerRef.current = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    }
  }, [])

  const remain = pair ? Math.max(0, Math.floor((pair.expiresAt - now) / 1000)) : 0
  const expired = pair !== null && remain <= 0

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-md border border-line bg-surface-soft p-3 dark:border-slate-700 dark:bg-slate-900/50">
        <Watch size={18} className="mt-0.5 shrink-0 text-brand-ink dark:text-teal-300" />
        <div className="text-sm leading-relaxed text-ink-soft dark:text-slate-300">
          <p className="font-medium text-ink dark:text-slate-100">用手环连接此账户</p>
          <p className="mt-1">
            在手环「设置 → 连接账户」中输入下方 6 位配对码，手环即可自动获得访问权限，无需手动输入令牌。
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {pair && !expired && (
        <div className="text-center">
          <div className="select-all font-mono text-4xl font-bold tracking-[0.4em] text-brand-ink dark:text-teal-300">
            {pair.code}
          </div>
          <p className="mt-2 text-sm text-ink-muted dark:text-slate-400">
            {Math.floor(remain / 60)}:{String(remain % 60).padStart(2, '0')} 后过期 · 仅可使用一次
          </p>
        </div>
      )}
      {expired && <p className="text-center text-sm text-ink-muted dark:text-slate-400">配对码已过期，请重新生成</p>}

      <button
        type="button"
        className="btn-ghost w-full justify-center"
        onClick={() => void generate()}
        disabled={loading}
      >
        <RefreshCw size={16} className={loading ? 'animate-spin' : undefined} />
        {pair ? '重新生成' : '生成配对码'}
      </button>
    </div>
  )
}

export default DevicePairPanel
