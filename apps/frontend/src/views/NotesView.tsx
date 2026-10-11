import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import DOMPurify from 'dompurify'
import { api } from '../lib/api'
import { Modal } from '../components/Modal'
import type { ObsidianNoteListItem } from '../lib/types'

interface TreeNode {
  name: string
  path: string // 目录为前缀路径；笔记为完整路径
  children: TreeNode[]
  note?: ObsidianNoteListItem
}

function buildTree(notes: ObsidianNoteListItem[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', children: [] }
  for (const note of notes) {
    const parts = note.path.split('/')
    let node = root
    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i]
      const prefix = parts.slice(0, i + 1).join('/')
      let next = node.children.find((c) => !c.note && c.name === dir)
      if (!next) {
        next = { name: dir, path: prefix, children: [] }
        node.children.push(next)
      }
      node = next
    }
    node.children.push({ name: note.title, path: note.path, children: [], note })
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.note === b.note ? a.name.localeCompare(b.name, 'zh') : a.note ? 1 : -1))
    nodes.forEach((n) => sort(n.children))
  }
  sort(root.children)
  return root.children
}

function TreeView({
  nodes,
  depth,
  selected,
  onSelect,
}: {
  nodes: TreeNode[]
  depth: number
  selected: string | null
  onSelect: (path: string) => void
}) {
  return (
    <ul className="space-y-px">
      {nodes.map((node) => (
        <li key={node.path}>
          {node.note ? (
            <button
              onClick={() => onSelect(node.note!.path)}
              style={{ paddingLeft: `${depth * 14 + 10}px` }}
              className={`w-full truncate rounded px-2 py-1 text-left text-[13px] transition-colors ${
                selected === node.note.path
                  ? 'bg-brand/10 font-medium text-brand dark:bg-teal-400/10 dark:text-teal-300'
                  : 'text-ink-soft hover:bg-surface-muted/70 hover:text-ink dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
              }`}
            >
              {node.name}
            </button>
          ) : (
            <>
              <div
                style={{ paddingLeft: `${depth * 14 + 10}px` }}
                className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint dark:text-slate-500"
              >
                {node.name}
              </div>
              <TreeView nodes={node.children} depth={depth + 1} selected={selected} onSelect={onSelect} />
            </>
          )}
        </li>
      ))}
    </ul>
  )
}

function SyncSettings({ onClose }: { onClose: () => void }) {
  const settingsQ = useQuery({ queryKey: ['obsidian-settings'], queryFn: api.fetchObsidianSettings })
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [root, setRoot] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const s = settingsQ.data
  const rootValue = root ?? s?.sync_root ?? ''

  const genKey = async () => {
    setBusy(true)
    try {
      const res = await api.regenerateObsidianApiKey()
      setApiKey(res.api_key)
      setMsg('新密钥已生成（只显示这一次，请立即复制到 Obsidian 插件设置里）')
      settingsQ.refetch()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '生成失败')
    } finally {
      setBusy(false)
    }
  }

  const saveRoot = async () => {
    setBusy(true)
    try {
      await api.setObsidianSyncRoot(rootValue.trim())
      setMsg('同步目录已保存')
      settingsQ.refetch()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Obsidian 同步设置" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <div className="rounded-lg border border-line/60 bg-surface-muted/50 p-3 text-xs leading-5 text-ink-muted dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
          在 Obsidian 中安装「Everlong Sync」插件，把下面的 API 密钥填进插件设置；
          之后每次修改笔记，插件会自动推送到这里，并以富文本展示。
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink dark:text-slate-200">API 密钥</span>
            <button
              onClick={genKey}
              disabled={busy}
              className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-soft transition hover:bg-surface-muted disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {s?.has_api_key ? '重新生成' : '生成密钥'}
            </button>
          </div>
          {s?.has_api_key && !apiKey && (
            <p className="text-xs text-ink-faint dark:text-slate-500">
              已生成（{s.api_key_created_at ? new Date(s.api_key_created_at).toLocaleString() : '未知时间'}），重新生成后旧密钥立即失效。
            </p>
          )}
          {apiKey && (
            <div className="flex items-center gap-2">
              <code className="flex-1 select-all break-all rounded-md bg-surface-muted px-3 py-2 font-mono text-xs text-ink dark:bg-slate-800 dark:text-slate-200">
                {apiKey}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(apiKey).catch(() => undefined)}
                className="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs text-ink-soft hover:bg-surface-muted dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                复制
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <span className="font-medium text-ink dark:text-slate-200">同步目录（留空 = 整个库）</span>
          <div className="flex items-center gap-2">
            <input
              value={rootValue}
              onChange={(e) => setRoot(e.target.value)}
              placeholder="例如：日记/工作"
              className="flex-1 rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <button
              onClick={saveRoot}
              disabled={busy}
              className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-soft hover:bg-surface-muted disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              保存
            </button>
          </div>
          <p className="text-xs text-ink-faint dark:text-slate-500">插件只会同步该目录（含子目录）下的 Markdown 文件。</p>
        </div>

        {msg && <p className="text-xs text-brand dark:text-teal-300">{msg}</p>}
      </div>
    </Modal>
  )
}

export function NotesView() {
  const [selected, setSelected] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const notesQ = useQuery({ queryKey: ['obsidian-notes'], queryFn: api.fetchObsidianNotes })
  const noteQ = useQuery({
    queryKey: ['obsidian-note', selected],
    queryFn: () => api.fetchObsidianNote(selected!),
    enabled: !!selected,
  })

  const notes = notesQ.data ?? []
  const tree = useMemo(() => buildTree(notes), [notes])

  useEffect(() => {
    if (!selected && notes.length > 0) setSelected(notes[0].path)
  }, [notes, selected])

  const html = useMemo(
    () => (noteQ.data ? DOMPurify.sanitize(noteQ.data.content_html) : ''),
    [noteQ.data],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">笔记</h1>
          <p className="mt-1 text-xs text-ink-muted dark:text-slate-400">
            从 Obsidian 同步的笔记，共 {notes.length} 篇。
          </p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs text-ink-soft transition hover:bg-surface-muted dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          同步设置
        </button>
      </div>

      {notesQ.isLoading ? (
        <p className="py-10 text-center text-sm text-ink-muted dark:text-slate-400">加载中…</p>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-14 text-center dark:border-slate-700">
          <p className="text-sm text-ink-muted dark:text-slate-400">还没有同步任何笔记。</p>
          <p className="mt-2 text-xs text-ink-faint dark:text-slate-500">
            点击右上角「同步设置」生成 API 密钥，并在 Obsidian 插件中填入，保存笔记后内容会自动出现在这里。
          </p>
        </div>
      ) : (
        <div className="flex gap-6">
          <aside className="hidden w-56 shrink-0 overflow-y-auto rounded-lg border border-line/60 py-2 md:block dark:border-slate-700/60">
            <TreeView nodes={tree} depth={0} selected={selected} onSelect={setSelected} />
          </aside>
          <div className="min-w-0 flex-1">
            <div className="mb-3 md:hidden">
              <select
                value={selected ?? ''}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {notes.map((n) => (
                  <option key={n.path} value={n.path}>
                    {n.path}
                  </option>
                ))}
              </select>
            </div>
            {noteQ.isLoading ? (
              <p className="py-10 text-center text-sm text-ink-muted dark:text-slate-400">加载中…</p>
            ) : noteQ.isError ? (
              <p className="py-10 text-center text-sm text-red-500">加载失败，请稍后重试</p>
            ) : noteQ.data ? (
              <article className="rounded-xl border border-line/60 bg-surface px-6 py-5 dark:border-slate-700/60 dark:bg-slate-900/40">
                <header className="mb-4 border-b border-line/50 pb-3 dark:border-slate-700/60">
                  <h2 className="text-lg font-semibold text-ink dark:text-slate-100">{noteQ.data.title}</h2>
                  <p className="mt-1 text-xs text-ink-faint dark:text-slate-500">
                    {noteQ.data.path} · 更新于 {new Date(noteQ.data.updated_at).toLocaleString()}
                  </p>
                </header>
                {/* 后端已用白名单消毒，前端再经 DOMPurify 双保险 */}
                <div
                  className="prose-notes"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </article>
            ) : null}
          </div>
        </div>
      )}

      {showSettings && <SyncSettings onClose={() => setShowSettings(false)} />}
    </div>
  )
}
