import { Activity, BookOpen, CalendarCheck, CalendarDays, CalendarRange, History, List, LogOut, Moon, Plane, Plus, Route, Sun, Users } from 'lucide-react'
import type { Theme } from '../lib/theme'
import type { View } from '../lib/types'

const NAV: { key: View; label: string; icon: typeof CalendarCheck }[] = [
  { key: 'today', label: '今日', icon: CalendarCheck },
  { key: 'weiyang', label: '未央', icon: Route },
  { key: 'memory', label: '回忆', icon: BookOpen },
  { key: 'calendar', label: '日历', icon: CalendarDays },
  { key: 'heatmap', label: '活跃度', icon: Activity },
  { key: 'list', label: '全部', icon: List },
]

const CHANGELOG_NAV = { key: 'changelog', label: '更新日志', icon: History } as const
const ADMIN_NAV = { key: 'admin', label: '用户管理', icon: Users } as const

export function Sidebar({
  view,
  theme,
  user,
  isAdmin,
  onToggleTheme,
  onNavigate,
  onAddPlan,
  onOpenFocus,
  onLogout,
}: {
  view: View
  theme: Theme
  user: { name: string; email: string } | null
  isAdmin?: boolean
  onToggleTheme: () => void
  onNavigate: (v: View) => void
  onAddPlan: () => void
  onOpenFocus: () => void
  onLogout: () => void
}) {
  const themeLabel = theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'

  const renderNav = (
    compact = false,
    items: { key: View; label: string; icon: typeof CalendarCheck }[] = NAV,
  ) => (
    <nav className={`${compact ? 'flex gap-1 overflow-x-auto' : 'flex-1 space-y-1 px-2 py-2'}`}>
      {items.map((item) => {
        const active = view === item.key
        return (
          <button
            key={item.key}
            className={`${
              compact
                ? 'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium'
                : 'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium'
            } transition ${
              active
                ? 'bg-brand-soft text-brand-ink dark:bg-brand/15 dark:text-teal-200'
                : 'text-ink-soft hover:bg-surface-soft hover:text-ink dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-slate-100'
            }`}
            onClick={() => onNavigate(item.key)}
          >
            <item.icon size={compact ? 15 : 16} />
            {item.label}
          </button>
        )
      })}
    </nav>
  )

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-white">
          <CalendarRange size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink dark:text-slate-100">未央 · Everlong</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">记录 & 排期</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button className="btn-ghost p-2" onClick={onLogout} aria-label="退出登录" title="退出登录">
            <LogOut size={17} />
          </button>
          <button className="btn-ghost p-2" onClick={onOpenFocus} aria-label="专注航班" title="专注航班">
            <Plane size={17} />
          </button>
          <button className="btn-ghost p-2" onClick={onToggleTheme} aria-label={themeLabel} title={themeLabel}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="btn-primary p-2" onClick={onAddPlan} aria-label="新建计划" title="新建计划">
            <Plus size={17} />
          </button>
        </div>
      </header>

      <div className="sticky top-14 z-20 border-b border-line bg-surface/95 px-2 py-1.5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 md:hidden">
        {renderNav(true, [...NAV, CHANGELOG_NAV, ...(isAdmin ? [ADMIN_NAV] : [])])}
      </div>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface dark:border-slate-700 dark:bg-slate-900 md:flex">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-white shadow-sm">
            <CalendarRange size={19} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink dark:text-slate-100">未央 · Everlong</p>
            <p className="text-xs text-ink-muted dark:text-slate-400">记录 & 排期</p>
          </div>
        </div>

        {renderNav(false, isAdmin ? [...NAV, ADMIN_NAV] : [...NAV])}

        <div className="space-y-2 border-t border-line-soft p-3 dark:border-slate-700/60">
          <button className="btn-ghost w-full justify-center" onClick={onOpenFocus}>
            <Plane size={16} />
            专注航班
          </button>
          {user && (
            <div className="flex items-center gap-2 rounded-md bg-surface-soft px-3 py-2 dark:bg-white/5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand-ink dark:bg-white/10 dark:text-teal-200">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink dark:text-slate-100">{user.name}</p>
                <p className="truncate text-xs text-ink-muted dark:text-slate-400">{user.email}</p>
              </div>
            </div>
          )}
          <button
            className={`btn-ghost w-full justify-center ${
              view === 'changelog' ? 'bg-brand-soft text-brand-ink dark:bg-brand/15 dark:text-teal-200' : ''
            }`}
            onClick={() => onNavigate('changelog')}
          >
            <History size={16} />
            更新日志
          </button>
          <button className="btn-ghost w-full justify-center" onClick={onLogout}>
            <LogOut size={16} />
            退出登录
          </button>
          <button className="btn-ghost w-full justify-center" onClick={onToggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? '浅色模式' : '深色模式'}
          </button>
          <button className="btn-primary w-full" onClick={onAddPlan}>
            <Plus size={16} />
            新建计划
          </button>
        </div>
      </aside>
    </>
  )
}
