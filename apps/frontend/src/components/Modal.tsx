import { X } from 'lucide-react'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

export function Modal({
  title,
  children,
  onClose,
  size = 'md',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  size?: 'md' | 'lg'
}) {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-4 pt-16 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className={`w-full rounded-card border border-line bg-surface shadow-float dark:border-slate-700 dark:bg-slate-800 ${
          size === 'lg' ? 'max-w-2xl' : 'max-w-lg'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3 dark:border-slate-800">
          <h2 className="text-[15px] font-medium tracking-title text-ink dark:text-slate-100">{title}</h2>
          <button className="btn-ghost -mr-2 p-1.5 text-ink-faint dark:text-slate-500" onClick={onClose} aria-label="关闭" title="关闭">
            <X size={17} strokeWidth={1.75} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
