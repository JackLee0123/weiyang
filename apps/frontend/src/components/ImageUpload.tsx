import { ImagePlus, Loader2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { fileToDataUri, MAX_IMAGE_BYTES, MAX_IMAGES } from '../lib/image'

interface Props {
  images: string[]
  onChange: (images: string[]) => void
  disabled?: boolean
}

export function ImageUpload({ images, onChange, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  const addFiles = async (files: FileList | null) => {
    if (!files || disabled) return
    setError('')
    const next = [...images]
    for (const file of Array.from(files)) {
      if (next.length >= MAX_IMAGES) break
      if (!file.type.startsWith('image/')) continue
      if (file.size > MAX_IMAGE_BYTES) {
        setError(`${file.name} 超过 8MB，请压缩后再传`)
        continue
      }
      setProcessing(file.name)
      try {
        const uri = await fileToDataUri(file)
        next.push(uri)
      } catch (err) {
        setError(err instanceof Error ? err.message : '图片处理失败')
      } finally {
        setProcessing(null)
      }
    }
    onChange(next)
  }

  const removeImage = (index: number) => {
    if (disabled) return
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <div>
      <span className="label">图片（选填，最多 {MAX_IMAGES} 张）</span>
      <div className="flex flex-wrap gap-2">
        {!disabled && images.length < MAX_IMAGES && (
          <button
            type="button"
            className="flex h-24 w-28 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line-strong text-ink-muted transition hover:border-brand hover:text-brand dark:border-slate-600 dark:text-slate-400 dark:hover:border-teal-400 dark:hover:text-teal-300"
            onClick={() => inputRef.current?.click()}
            aria-label="添加图片"
            title="添加图片"
          >
            {processing ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
            <span className="text-xs">{processing ? '处理中…' : '添加图片'}</span>
          </button>
        )}

        {images.map((uri, index) => (
          <div key={`${uri.slice(0, 64)}-${index}`} className="relative h-24 w-28 overflow-hidden rounded-md border border-line dark:border-slate-600">
            <img src={uri} alt={`图片 ${index + 1}`} className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                className="absolute right-1 top-1 rounded bg-slate-950/55 p-1 text-white transition hover:bg-slate-950/75"
                onClick={() => removeImage(index)}
                aria-label="移除图片"
                title="移除图片"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          void addFiles(event.target.files)
          event.target.value = ''
        }}
      />
    </div>
  )
}
