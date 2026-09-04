import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export function ImageGallery({ images }: { images: string[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  useEffect(() => {
    if (openIndex === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenIndex(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openIndex])

  if (!images?.length) return null
  const open = openIndex === null ? null : images[openIndex]

  return (
    <>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {images.map((uri, index) => (
          <button
            key={`${uri.slice(0, 64)}-${index}`}
            type="button"
            className="h-12 w-12 overflow-hidden rounded-md border border-line transition hover:border-brand dark:border-slate-600 dark:hover:border-teal-400"
            onClick={() => setOpenIndex(index)}
            aria-label={`查看图片 ${index + 1}`}
            title={`查看图片 ${index + 1}`}
          >
            <img src={uri} alt={`缩略图 ${index + 1}`} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setOpenIndex(null)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
            <img src={open} alt="图片预览" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
            <button
              className="absolute -right-2 -top-2 rounded-full bg-slate-900/80 p-2 text-white transition hover:bg-slate-900"
              onClick={() => setOpenIndex(null)}
              aria-label="关闭预览"
              title="关闭预览"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
