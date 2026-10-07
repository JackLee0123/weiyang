import { Inbox } from './icons'

/**
 * 空状态：一条发丝级上边线 + 居中的一句话说明。
 * 不用插画、不用彩色图标块——空态本身也应该是安静的。
 */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <Inbox size={20} className="text-ink-faint dark:text-slate-600" />
      <p className="empty-title">{title}</p>
      {hint && <p className="empty-hint">{hint}</p>}
    </div>
  )
}

/** 加载态：15px 细环 + 一句说明，与空态同一套留白节奏。 */
export function LoadingState({ label = '加载中' }: { label?: string }) {
  return (
    <div className="empty" role="status" aria-live="polite">
      <span className="spin" aria-hidden="true" />
      <p className="empty-hint">{label}…</p>
    </div>
  )
}

/**
 * 骨架条：列表占位用，宽度递减，和真实条目共用同一套行高节奏。
 * 只做静态占位，不做闪光动画（动效只保留 150ms 的颜色过渡）。
 */
export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.75 px-2 py-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="sk" style={{ width: `${92 - index * 14}%` }} />
      ))}
    </div>
  )
}
