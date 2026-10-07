import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from './icons'

/**
 * 弹窗：全站唯一的浮层形态。
 * 圆角 6px、1px 描边、只在浮层用一处低对比投影，遮罩不做毛玻璃。
 */
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/[0.34] p-4 pt-16"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className={`w-full rounded-md border border-line-strong bg-surface shadow-float dark:border-slate-600 dark:bg-slate-800 ${
          size === 'lg' ? 'max-w-[672px]' : 'max-w-[520px]'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-2.75 dark:border-slate-700">
          <h2 className="text-base font-semibold tracking-section text-ink dark:text-slate-100">{title}</h2>
          <button
            className="btn-ghost -mr-2 p-1.5 text-ink-faint dark:text-slate-500"
            onClick={onClose}
            aria-label="关闭"
            title="关闭"
          >
            <X size={17} />
          </button>
        </div>
        <div className="px-5 py-4.5">{children}</div>
      </div>
    </div>
  )
}
