import { useRef, useState } from 'react'
import { ImagePlus, Loader2, MessageSquareText, Send, X } from 'lucide-react'
import { api } from '../lib/api'
import { getStoredUser } from '../lib/auth'

const MAX_IMAGES = 3
const MAX_IMAGE_MB = 5

interface PreviewImage {
  file: File
  url: string
}

type FeedbackMessage = { type: 'ok' | 'err'; text: string } | null

export function FeedbackForm() {
  const [content, setContent] = useState('')
  const [contact, setContact] = useState(() => getStoredUser()?.email ?? '')
  const [images, setImages] = useState<PreviewImage[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<FeedbackMessage>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addImages = (files: FileList | null) => {
    if (!files) return
    setMessage(null)
    const next = [...images]
    for (const file of Array.from(files)) {
      if (next.length >= MAX_IMAGES) break
      if (!file.type.startsWith('image/')) continue
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        setMessage({ type: 'err', text: `${file.name} 超过 ${MAX_IMAGE_MB}MB，请压缩后再传` })
        continue
      }
      next.push({ file, url: URL.createObjectURL(file) })
    }
    setImages(next)
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(images[index].url)
    setImages(images.filter((_, i) => i !== index))
  }

  const submit = async () => {
    if (!content.trim()) {
      setMessage({ type: 'err', text: '请填写反馈内容' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      await api.submitFeedback({
        content: content.trim(),
        contact: contact.trim(),
        images: images.map((item) => item.file),
      })
      setMessage({ type: 'ok', text: '反馈已提交，我们会认真查看' })
      setContent('')
      images.forEach((item) => URL.revokeObjectURL(item.url))
      setImages([])
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : '提交失败，请稍后重试' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <MessageSquareText size={17} className="text-brand dark:text-teal-300" />
        <h2 className="text-base font-semibold text-ink dark:text-slate-100">问题反馈</h2>
      </div>
      <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">
        描述你遇到的问题或想法，可以附上截图，我们会直接收到并尽快改进。
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="label" htmlFor="feedback-content">
            反馈内容
          </label>
          <textarea
            id="feedback-content"
            className="field min-h-[96px] resize-y"
            placeholder="例如：希望日历视图支持周视图…"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="feedback-contact">
            联系方式（选填）
          </label>
          <input
            id="feedback-contact"
            className="field"
            type="text"
            placeholder="方便我们回复你，如邮箱或微信"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
          />
        </div>

        <div>
          <span className="label">截图（选填，最多 {MAX_IMAGES} 张）</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="flex h-24 w-28 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line-strong text-ink-muted transition hover:border-brand hover:text-brand dark:border-slate-600 dark:text-slate-400 dark:hover:border-teal-400 dark:hover:text-teal-300"
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus size={20} />
              <span className="text-xs">添加图片</span>
            </button>

            {images.map((item, index) => (
              <div
                key={item.url}
                className="relative h-24 w-28 overflow-hidden rounded-md border border-line dark:border-slate-600"
              >
                <img src={item.url} alt={`反馈图片 ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded bg-slate-950/55 p-1 text-white transition hover:bg-slate-950/75"
                  onClick={() => removeImage(index)}
                  aria-label="移除图片"
                  title="移除图片"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              addImages(event.target.files)
              event.target.value = ''
            }}
          />
        </div>

        {message && (
          <p
            className={`rounded-md px-3 py-2 text-sm ${
              message.type === 'ok'
                ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-200'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
            }`}
          >
            {message.text}
          </p>
        )}

        <button className="btn-primary w-full justify-center sm:w-auto" type="button" onClick={() => void submit()} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
          {loading ? '提交中…' : '提交反馈'}
        </button>
      </div>
    </section>
  )
}
