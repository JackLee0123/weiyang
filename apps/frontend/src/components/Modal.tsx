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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 pt-16 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className={`w-full rounded-lg border border-line bg-surface shadow-soft dark:border-slate-700 dark:bg-slate-800 ${
          size === 'lg' ? 'max-w-2xl' : 'max-w-lg'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
          <h2 className="text-base font-semibold text-ink dark:text-slate-100">{title}</h2>
          <button className="btn-ghost -mr-2 p-1.5" onClick={onClose} aria-label="关闭" title="关闭">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
