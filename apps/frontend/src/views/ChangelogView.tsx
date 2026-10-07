import { useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Sparkles } from '../components/icons'
import { CHANGELOG, CHANGELOG_KIND_META, CURRENT_VERSION, type ChangelogEntry } from '../lib/changelog'
import { FeedbackForm } from '../components/FeedbackForm'

const HISTORY_PAGE_SIZE = 5

function ChangelogCard({
  entry,
  isLatest = false,
  open,
  onToggle,
}: {
  entry: ChangelogEntry
  isLatest?: boolean
  open: boolean
  onToggle: () => void
}) {
  return (
    <article className="panel overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-surface-soft dark:hover:bg-white/5"
      >
        <span className="mt-0.5 shrink-0 font-mono text-2xs text-ink-faint dark:text-slate-500">
          {entry.version}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-ink dark:text-slate-100">{entry.title}</span>
            <span className="tnum text-2xs text-ink-faint dark:text-slate-500">{entry.date}</span>
            {isLatest && (
              <span className="text-2xs font-medium text-brand dark:text-teal-300">
                最新
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-2xs text-ink-faint dark:text-slate-500">{entry.items.length} 项改动</span>
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={`mt-0.5 shrink-0 text-ink-faint transition-transform dark:text-slate-500 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-line-soft px-4 py-3.5 dark:border-slate-800">
          <ul className="space-y-2">
            {entry.items.map((item, idx) => {
              const meta = CHANGELOG_KIND_META[item.kind]
              return (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <span className={`mt-0.5 w-7 shrink-0 text-2xs font-medium ${meta.className}`}>
                    {meta.label}
                  </span>
                  <span className="min-w-0 leading-6 text-ink-soft dark:text-slate-300">{item.text}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </article>
  )
}

export function ChangelogView() {
  const latestEntry = CHANGELOG[0]
  const latestVersion = latestEntry?.version ?? null
  const historyEntries = CHANGELOG.slice(1)
  const totalPages = Math.max(1, Math.ceil(historyEntries.length / HISTORY_PAGE_SIZE))
  const [openVersion, setOpenVersion] = useState<string | null>(latestVersion)
  const [page, setPage] = useState(1)
  const pageEntries = historyEntries.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE)

  const changePage = (nextPage: number) => {
    setPage(nextPage)
    setOpenVersion(latestVersion)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">更新日志</h1>
          <p className="mt-1 text-xs text-ink-muted dark:text-slate-400">记录每一次版本迭代带来的变化</p>
        </div>
        <div className="flex items-baseline gap-1.5 text-2xs text-ink-faint dark:text-slate-500">
          <span>当前版本</span>
          <span className="tnum text-ink-muted dark:text-slate-400">{CURRENT_VERSION}</span>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3">
          {latestEntry && (
            <ChangelogCard
              entry={latestEntry}
              isLatest
              open={openVersion === latestEntry.version}
              onToggle={() => setOpenVersion(openVersion === latestEntry.version ? null : latestEntry.version)}
            />
          )}

          {historyEntries.length > 0 && (
            <div className="flex items-center justify-between px-1 pt-1">
              <p className="eyebrow">历史版本</p>
              <p className="tnum text-2xs text-ink-faint dark:text-slate-500">
                第 {page} / {totalPages} 页
              </p>
            </div>
          )}

          {pageEntries.map((entry) => (
            <ChangelogCard
              key={entry.version}
              entry={entry}
              open={openVersion === entry.version}
              onToggle={() => setOpenVersion(openVersion === entry.version ? null : entry.version)}
            />
          ))}

          {totalPages > 1 && (
            <nav
              className="panel flex items-center justify-between gap-3 px-3 py-2"
              aria-label="更新日志分页"
            >
              <button
                type="button"
                className="btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-35"
                disabled={page === 1}
                onClick={() => changePage(page - 1)}
              >
                <ChevronLeft size={14} />
                上一页
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`tnum h-7 min-w-7 rounded-md px-2 text-xs transition-colors ${
                      page === pageNumber
                        ? 'bg-surface-soft font-medium text-ink dark:bg-slate-800 dark:text-slate-100'
                        : 'text-ink-muted hover:bg-surface-soft hover:text-ink dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                    }`}
                    aria-current={page === pageNumber ? 'page' : undefined}
                    onClick={() => changePage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-35"
                disabled={page === totalPages}
                onClick={() => changePage(page + 1)}
              >
                下一页
                <ChevronRight size={14} />
              </button>
            </nav>
          )}

          <p className="flex items-start gap-1.5 px-1 text-2xs leading-5 text-ink-faint dark:text-slate-500">
            <Sparkles size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            版本历史会随开发持续更新，任何想法与建议都欢迎反馈。
          </p>
        </div>

        <div className="lg:sticky lg:top-6">
          <FeedbackForm />
        </div>
      </div>
    </div>
  )
}
