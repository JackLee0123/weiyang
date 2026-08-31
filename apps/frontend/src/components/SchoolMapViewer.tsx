import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize, Minus, Plus, X, ZoomIn } from 'lucide-react'

const MAP_SRC = '/campus-map.jpg'
const MAX_SCALE = 8
const REM = 0.92

type View = { x: number; y: number; scale: number }
type Size = { w: number; h: number }

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function fitScale(cw: number, ch: number, w: number, h: number) {
  return Math.min(cw / w, ch / h) * REM
}

function centered(cw: number, ch: number, w: number, h: number, scale: number): View {
  return { scale, x: (cw - w * scale) / 2, y: (ch - h * scale) / 2 }
}

function fitView(cw: number, ch: number, w: number, h: number): View {
  return centered(cw, ch, w, h, fitScale(cw, ch, w, h))
}

function constrain(next: View, cw: number, ch: number, w: number, h: number): View {
  const sw = w * next.scale
  const sh = h * next.scale
  return {
    scale: next.scale,
    x: sw <= cw ? (cw - sw) / 2 : clamp(next.x, cw - sw, 0),
    y: sh <= ch ? (ch - sh) / 2 : clamp(next.y, ch - sh, 0),
  }
}

function Lightbox({ onClose }: { onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [natural, setNatural] = useState<Size | null>(null)
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 })
  const viewRef = useRef(view)
  const naturalRef = useRef(natural)
  const dragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0, moved: false })

  viewRef.current = view
  naturalRef.current = natural

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  useEffect(() => {
    if (!natural || !containerRef.current) return
    const el = containerRef.current
    setView(fitView(el.clientWidth, el.clientHeight, natural.w, natural.h))
  }, [natural])

  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    const el = containerRef.current
    const nat = naturalRef.current
    if (!el || !nat) return
    const v = viewRef.current
    const min = fitScale(el.clientWidth, el.clientHeight, nat.w, nat.h)
    const scale = clamp(v.scale * factor, min, MAX_SCALE)
    const wx = (cx - v.x) / v.scale
    const wy = (cy - v.y) / v.scale
    setView(constrain({ scale, x: cx - wx * scale, y: cy - wy * scale }, el.clientWidth, el.clientHeight, nat.w, nat.h))
  }, [])

  const reset = useCallback(() => {
    const el = containerRef.current
    const nat = naturalRef.current
    if (!el || !nat) return
    setView(fitView(el.clientWidth, el.clientHeight, nat.w, nat.h))
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15
      zoomAt(factor, event.clientX - rect.left, event.clientY - rect.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const v = viewRef.current
    dragRef.current = { active: true, startX: event.clientX, startY: event.clientY, originX: v.x, originY: v.y, moved: false }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag.active) return
    const el = containerRef.current
    const nat = naturalRef.current
    if (!el || !nat) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(dx, dy) < 4) return
    drag.moved = true
    setView(constrain({ ...viewRef.current, x: drag.originX + dx, y: drag.originY + dy }, el.clientWidth, el.clientHeight, nat.w, nat.h))
  }

  const onPointerUp = () => {
    dragRef.current.active = false
  }

  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    zoomAt(1.6, event.clientX - rect.left, event.clientY - rect.top)
  }

  const zoomIn = () => {
    const el = containerRef.current
    if (!el) return
    zoomAt(1.25, el.clientWidth / 2, el.clientHeight / 2)
  }
  const zoomOut = () => {
    const el = containerRef.current
    if (!el) return
    zoomAt(1 / 1.25, el.clientWidth / 2, el.clientHeight / 2)
  }

  const percent = Math.round(view.scale * 100)
  const minPercent = natural && containerRef.current ? Math.round(fitScale(containerRef.current.clientWidth, containerRef.current.clientHeight, natural.w, natural.h) * 100) : 100
  const atFit = percent <= minPercent + 1

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-slate-950/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="学校地图"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-base font-semibold text-white">学校地图</h2>
        <button className="rounded-md p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="关闭" title="关闭">
          <X size={20} />
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        {natural ? (
          <div
            className="origin-top-left will-change-transform"
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, width: natural.w, height: natural.h }}
          >
            <img src={MAP_SRC} alt="学校地图" draggable={false} className="block select-none" style={{ width: natural.w, height: natural.h }} />
          </div>
        ) : (
          <img
            src={MAP_SRC}
            alt="学校地图"
            className="block w-full select-none"
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget
              setNatural({ w: el.naturalWidth, h: el.naturalHeight })
            }}
          />
        )}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-slate-900/80 p-1 shadow-soft ring-1 ring-white/10 backdrop-blur">
        <button type="button" className="pointer-events-auto rounded-full p-2 text-slate-200 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40" onClick={zoomOut} disabled={atFit} aria-label="缩小" title="缩小">
          <Minus size={18} />
        </button>
        <span className="w-14 text-center text-xs font-medium tabular-nums text-slate-200">{percent}%</span>
        <button type="button" className="pointer-events-auto rounded-full p-2 text-slate-200 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40" onClick={zoomIn} disabled={percent >= MAX_SCALE * 100} aria-label="放大" title="放大">
          <Plus size={18} />
        </button>
        <span className="h-5 w-px bg-white/15" />
        <button type="button" className="pointer-events-auto rounded-full p-2 text-slate-200 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40" onClick={reset} disabled={atFit} aria-label="复位" title="复位">
          <Maximize size={18} />
        </button>
      </div>
    </div>
  )
}

export function SchoolMapViewer() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block h-64 w-full overflow-hidden rounded-md border border-line-soft text-left dark:border-slate-700/70"
        aria-label="放大查看学校地图"
        title="点击放大查看学校地图"
      >
        <img src={MAP_SRC} alt="学校地图" className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.04]" />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
          <ZoomIn size={14} /> 点击放大
        </span>
      </button>
      {open && <Lightbox onClose={() => setOpen(false)} />}
    </>
  )
}

export default SchoolMapViewer
