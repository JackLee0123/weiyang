import { useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, History, Sparkles } from 'lucide-react'
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
        <span className="mt-0.5 shrink-0 rounded-sm bg-brand/10 px-2 py-0.5 font-mono text-xs font-bold text-brand dark:bg-teal-500/15 dark:text-teal-300">
          {entry.version}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-ink dark:text-slate-100">{entry.title}</span>
            <span className="text-xs text-ink-faint dark:text-slate-500">{entry.date}</span>
            {isLatest && (
              <span className="rounded-sm bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white dark:bg-teal-500 dark:text-slate-900">
                最新
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-xs text-ink-muted dark:text-slate-400">{entry.items.length} 项改动</span>
        </span>
        <ChevronDown
          size={18}
          className={`mt-0.5 shrink-0 text-ink-faint transition-transform dark:text-slate-500 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-line-soft px-4 py-3.5 dark:border-slate-700">
          <ul className="space-y-2.5">
            {entry.items.map((item, idx) => {
              const meta = CHANGELOG_KIND_META[item.kind]
              return (
                <li key={idx} className="flex items-start gap-2.5 text-sm">
                  <span className={`mt-0.5 shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-medium leading-4 ${meta.className}`}>
                    {meta.label}
                  </span>
                  <span className="min-w-0 text-ink-soft dark:text-slate-200">{item.text}</span>
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-ink dark:text-slate-100">
            <History size={18} className="text-brand dark:text-teal-300" />
            更新日志
          </h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">记录每一次版本迭代带来的变化</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <span className="text-ink-faint dark:text-slate-500">当前版本</span>
          <span className="font-semibold text-brand dark:text-teal-300">{CURRENT_VERSION}</span>
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
              <p className="text-xs font-medium text-ink-muted dark:text-slate-400">历史版本</p>
              <p className="text-xs text-ink-faint dark:text-slate-500">
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
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2 shadow-panel dark:border-slate-700 dark:bg-slate-800"
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
                    className={`h-7 min-w-7 rounded-md px-2 text-xs font-medium transition ${
                      page === pageNumber
                        ? 'bg-brand text-white dark:bg-teal-500 dark:text-slate-900'
                        : 'text-ink-muted hover:bg-surface-soft hover:text-ink dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100'
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

          <p className="flex items-start gap-1.5 px-1 text-xs leading-5 text-ink-faint dark:text-slate-500">
            <Sparkles size={14} className="mt-0.5 shrink-0" />
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
