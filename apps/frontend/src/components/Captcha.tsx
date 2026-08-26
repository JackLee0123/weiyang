import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import type { CaptchaChallenge } from '../lib/types'

interface CaptchaProps {
  onValid: (token: string | null) => void
}

function dataUrl(base64: string) {
  return `data:image/png;base64,${base64}`
}

export function Captcha({ onValid }: CaptchaProps) {
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null)
  const [displayWidth, setDisplayWidth] = useState(0)
  const [left, setLeft] = useState(0)
  const [status, setStatus] = useState<'idle' | 'verifying' | 'ok' | 'fail'>('idle')
  const [message, setMessage] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startLeft: number } | null>(null)
  const leftRef = useRef(0)
  const challengeRef = useRef<CaptchaChallenge | null>(null)
  leftRef.current = left
  challengeRef.current = challenge

  const load = useCallback(async () => {
    setStatus('idle')
    setLeft(0)
    setMessage('')
    try {
      const data = await api.createCaptcha()
      setChallenge(data)
      onValid(null)
    } catch {
      setMessage('验证码加载失败，点右上角刷新重试')
    }
  }, [onValid])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (challenge && containerRef.current) {
      setDisplayWidth(containerRef.current.offsetWidth || 0)
    }
  }, [challenge])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      setDisplayWidth(entries[0]?.contentRect.width ?? 0)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const scale = challenge && displayWidth > 0 ? displayWidth / challenge.width : 0
  const pieceW = challenge ? challenge.piece_width * scale : 0
  const pieceH = challenge ? challenge.piece_height * scale : 0
  const maxLeft = challenge && scale > 0 ? challenge.width * scale - pieceW : 0

  const onPointerDown = (event: React.PointerEvent) => {
    if (status === 'verifying' || status === 'ok') return
    const target = event.currentTarget as HTMLElement
    target.setPointerCapture(event.pointerId)
    dragRef.current = { startX: event.clientX, startLeft: leftRef.current }
  }

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const next = Math.max(0, Math.min(maxLeft, drag.startLeft + (event.clientX - drag.startX)))
    setLeft(next)
  }

  const onPointerUp = async (event: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    const target = event.currentTarget as HTMLElement
    target.releasePointerCapture(event.pointerId)
    if (!challengeRef.current || scale <= 0) return
    const logicalX = leftRef.current / scale
    setStatus('verifying')
    try {
      const result = await api.verifyCaptcha({ captcha_id: challengeRef.current.captcha_id, x: logicalX })
      setStatus('ok')
      setMessage('')
      onValid(result.captcha_token)
    } catch {
      setStatus('fail')
      setLeft(0)
      setMessage('没对准，再拖一次；或刷新换一张')
      onValid(null)
    }
  }

  return (
    <div>
      {challenge ? (
        <div className="space-y-1.5">
          <div className="relative select-none overflow-hidden rounded-md border border-line dark:border-slate-700">
            <div
              ref={containerRef}
              className="relative w-full"
              style={{ aspectRatio: `${challenge.width} / ${challenge.height}` }}
            >
              <img src={dataUrl(challenge.background)} alt="拼图背景" className="pointer-events-none absolute inset-0 h-full w-full" />
              <div
                className="absolute touch-none"
                style={{
                  left,
                  top: challenge.piece_y * scale,
                  width: pieceW,
                  height: pieceH,
                  cursor: status === 'ok' ? 'default' : 'grab',
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              >
                <img src={dataUrl(challenge.piece)} alt="拼图块" className="h-full w-full" draggable={false} />
                {status === 'ok' && (
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white shadow">
                    <Check size={14} />
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              className="btn-ghost absolute right-1.5 top-1.5 z-10 p-1.5"
              onClick={load}
              aria-label="换一张拼图"
              title="换一张拼图"
            >
              <RefreshCw size={15} />
            </button>
          </div>
          <p className="text-xs leading-5">
            {status === 'idle' && <span className="text-ink-muted dark:text-slate-400">拖动拼图块，对齐缺口</span>}
            {status === 'verifying' && <span className="text-ink-muted dark:text-slate-400">校验中…</span>}
            {status === 'ok' && <span className="font-medium text-brand dark:text-teal-300">验证通过</span>}
            {status === 'fail' && <span className="text-rose-600 dark:text-rose-300">{message}</span>}
            {!challenge && <span className="text-ink-muted dark:text-slate-400">{message || '加载中…'}</span>}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-md border border-line py-8 text-sm text-ink-muted dark:border-slate-700 dark:text-slate-400">
          <span>正在加载拼图…</span>
        </div>
      )}
    </div>
  )
}

export default Captcha
