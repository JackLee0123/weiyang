import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, MoveRight, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import type { CaptchaChallenge } from '../lib/types'

interface CaptchaProps {
  onValid: (token: string | null) => void
}

const THUMB_WIDTH = 40

function dataUrl(base64: string) {
  return `data:image/png;base64,${base64}`
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

export function Captcha({ onValid }: CaptchaProps) {
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null)
  const [displayWidth, setDisplayWidth] = useState(0)
  const [t, setT] = useState(0)
  const [status, setStatus] = useState<'idle' | 'verifying' | 'ok' | 'fail'>('idle')
  const [message, setMessage] = useState('')

  const boardRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startT: number } | null>(null)
  const tRef = useRef(0)
  const challengeRef = useRef<CaptchaChallenge | null>(null)
  tRef.current = t
  challengeRef.current = challenge

  const load = useCallback(async () => {
    setStatus('idle')
    setT(0)
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
    if (challenge && boardRef.current) {
      setDisplayWidth(boardRef.current.offsetWidth || 0)
    }
  }, [challenge])

  useEffect(() => {
    const el = boardRef.current
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
  const pieceLeft = t * Math.max(0, displayWidth - pieceW)

  const trackWidth = sliderRef.current?.offsetWidth ?? 0
  const thumbLeft = t * Math.max(0, trackWidth - THUMB_WIDTH)

  const verify = useCallback(
    async (progress: number) => {
      const current = challengeRef.current
      if (!current) return
      const logicalX = progress * (current.width - current.piece_width)
      setStatus('verifying')
      try {
        const result = await api.verifyCaptcha({ captcha_id: current.captcha_id, x: logicalX })
        setStatus('ok')
        setMessage('')
        onValid(result.captcha_token)
      } catch {
        setStatus('fail')
        setT(0)
        setMessage('没对准，再试一次；或点右上角换一张')
        onValid(null)
      }
    },
    [onValid],
  )

  const onPointerDown = (event: React.PointerEvent) => {
    if (status === 'verifying' || status === 'ok') return
    const target = event.currentTarget as HTMLElement
    target.setPointerCapture(event.pointerId)
    dragRef.current = { startX: event.clientX, startT: tRef.current }
  }

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const denom = Math.max(1, trackWidth - THUMB_WIDTH)
    const next = clamp01(drag.startT + (event.clientX - drag.startX) / denom)
    setT(next)
  }

  const onPointerUp = (event: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    const target = event.currentTarget as HTMLElement
    target.releasePointerCapture(event.pointerId)
    void verify(tRef.current)
  }

  const panelClass = 'overflow-hidden rounded-lg border border-line dark:border-slate-700'

  return (
    <div>
      {challenge ? (
        <div className="space-y-2">
          <div className={`relative select-none ${panelClass}`}>
            <div ref={boardRef} className="relative w-full" style={{ aspectRatio: `${challenge.width} / ${challenge.height}` }}>
              <img src={dataUrl(challenge.background)} alt="拼图背景" className="pointer-events-none absolute inset-0 h-full w-full" />
              <div
                className="pointer-events-none absolute"
                style={{ left: pieceLeft, top: challenge.piece_y * scale, width: pieceW, height: pieceH }}
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

          <div ref={sliderRef} className="relative mx-1 h-9 select-none overflow-hidden rounded-full bg-surface-soft dark:bg-slate-700/60">
            <div
              className="absolute top-1/2 flex h-9 w-10 -translate-y-1/2 touch-none cursor-grab items-center justify-center rounded-full bg-brand text-white shadow active:cursor-grabbing dark:bg-teal-400 dark:text-teal-900"
              style={{ left: thumbLeft }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              <MoveRight size={18} />
            </div>
          </div>

          <p className="text-xs leading-5">
            {status === 'idle' && <span className="text-ink-muted dark:text-slate-400">拖动下方滑块，把拼图块对准缺口</span>}
            {status === 'verifying' && <span className="text-ink-muted dark:text-slate-400">校验中…</span>}
            {status === 'ok' && <span className="font-medium text-brand dark:text-teal-300">验证通过</span>}
            {status === 'fail' && <span className="text-rose-600 dark:text-rose-300">{message}</span>}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-md border border-line py-8 text-sm text-ink-muted dark:border-slate-700 dark:text-slate-400">
          <span>{message || '正在加载拼图…'}</span>
        </div>
      )}
    </div>
  )
}

export default Captcha
