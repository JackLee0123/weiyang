import { Activity, Bell, BookOpen, CalendarCheck, CalendarDays, CalendarRange, Database, History, List, LogOut, MonitorDown, Moon, Plane, Plus, Route, Sun, Users, Watch } from './icons'
import { useEffect, useState, type ReactNode } from 'react'
import type { Theme } from '../lib/theme'
import type { View } from '../lib/types'
import { BrandMark } from './BrandMark'

const NAV: { key: View; label: string; icon: typeof CalendarCheck }[] = [
  { key: 'today', label: '今日', icon: CalendarCheck },
  { key: 'weiyang', label: '未央', icon: Route },
  { key: 'memory', label: '回忆', icon: BookOpen },
  { key: 'notifications', label: '通知', icon: Bell },
  { key: 'calendar', label: '日历', icon: CalendarDays },
  { key: 'timetable', label: '课表', icon: CalendarRange },
  { key: 'heatmap', label: '活跃度', icon: Activity },
  { key: 'list', label: '全部', icon: List },
]

const CHANGELOG_NAV = { key: 'changelog', label: '更新与意见', icon: History } as const
const ADMIN_NAV = { key: 'admin', label: '用户管理', icon: Users } as const

function InstallAppButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || !deferred) return null

  const handleClick = async () => {
    const promptEvent = deferred
    setDeferred(null)
    try {
      await promptEvent.prompt()
      const choice = await promptEvent.userChoice
      if (choice.outcome === 'accepted') setInstalled(true)
    } catch {
      // 已安装或浏览器不再允许弹出时静默处理
    }
  }

  return (
    <button className={className} onClick={handleClick}>
      <MonitorDown size={compact ? 15 : 16} />
      安装应用
    </button>
  )
}

export function Sidebar({
  view,
  theme,
  user,
  isAdmin,
  onToggleTheme,
  onNavigate,
  onAddPlan,
  onOpenFocus,
  onOpenNotifications,
  onOpenBackup,
  onOpenDevices,
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
  onOpenNotifications: () => void
  onOpenBackup: () => void
  onOpenDevices: () => void
  onLogout: () => void
}) {
  const themeLabel = theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'

  // 工具区：以前是 8 个一模一样的整宽按钮，收成安静的次级列表
  const tools: { label: string; icon: typeof CalendarCheck; onClick: () => void; active?: boolean }[] = [
    { label: '专注航班', icon: Plane, onClick: onOpenFocus },
    { label: '通知设置', icon: Bell, onClick: onOpenNotifications },
    { label: '数据备份', icon: Database, onClick: onOpenBackup },
    { label: '设备连接', icon: Watch, onClick: onOpenDevices },
    { label: '更新与意见', icon: History, onClick: () => onNavigate('changelog'), active: view === 'changelog' },
  ]

  const rowClass = (active = false) =>
    `group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-left text-[13px] transition-colors ${
      active
        ? 'bg-surface-soft font-medium text-ink dark:bg-slate-800 dark:text-slate-100'
        : 'text-ink-soft hover:bg-surface-soft/70 hover:text-ink dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
    }`

  const iconClass = (active = false) =>
    `shrink-0 transition-colors ${
      active
        ? 'text-brand dark:text-teal-300'
        : 'text-ink-faint group-hover:text-ink-muted dark:text-slate-500 dark:group-hover:text-slate-400'
    }`

  const renderNav = (
    compact = false,
    items: { key: View; label: string; icon: typeof CalendarCheck }[] = NAV,
    trailing?: ReactNode,
  ) => (
    <nav className={`${compact ? 'flex gap-0.5 overflow-x-auto' : 'flex-1 space-y-px px-2 py-1'}`}>
      {items.map((item) => {
        const active = view === item.key
        if (compact) {
          return (
            <button
              key={item.key}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-surface-soft text-ink dark:bg-slate-800 dark:text-slate-100'
                  : 'text-ink-muted hover:bg-surface-soft/70 hover:text-ink dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
              }`}
              onClick={() => onNavigate(item.key)}
            >
              <item.icon size={14} strokeWidth={1.75} className={active ? 'text-brand dark:text-teal-300' : ''} />
              {item.label}
            </button>
          )
        }
        return (
          <button key={item.key} className={rowClass(active)} onClick={() => onNavigate(item.key)}>
            {active && (
              <span className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-brand dark:bg-teal-300" />
            )}
            <item.icon size={15} strokeWidth={1.75} className={iconClass(active)} />
            {item.label}
          </button>
        )
      })}
      {trailing}
    </nav>
  )

  return (
    <>
      <header className="sticky top-0 z-30 flex h-12 items-center gap-2.5 border-b border-line bg-surface/90 px-3.5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 md:hidden">
        <BrandMark size={20} className="text-brand dark:text-teal-300" />
        <p className="text-[13px] font-semibold tracking-title text-ink dark:text-slate-100">未央 · Everlong</p>
        <div className="ml-auto flex items-center gap-0.5">
          <button className="btn-ghost p-1.5" onClick={onLogout} aria-label="退出登录" title="退出登录">
            <LogOut size={16} strokeWidth={1.75} />
          </button>
          <button className="btn-ghost p-1.5" onClick={onOpenNotifications} aria-label="通知设置" title="通知设置">
            <Bell size={16} strokeWidth={1.75} />
          </button>
          <button className="btn-ghost p-1.5" onClick={onOpenFocus} aria-label="专注航班" title="专注航班">
            <Plane size={16} strokeWidth={1.75} />
          </button>
          <button className="btn-ghost p-1.5" onClick={onToggleTheme} aria-label={themeLabel} title={themeLabel}>
            {theme === 'dark' ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
          </button>
          <button className="btn-primary ml-1 p-1.5" onClick={onAddPlan} aria-label="新建计划" title="新建计划">
            <Plus size={16} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="sticky top-12 z-20 border-b border-line bg-surface/90 px-2 py-1 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 md:hidden">
        {renderNav(
          true,
          [...NAV, CHANGELOG_NAV, ...(isAdmin ? [ADMIN_NAV] : [])],
          <>
            {/* 手机上侧栏是收起的，这些入口要放在顶部才能点到（扫码连手环就在手机上做） */}
            <button
              className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-soft/70 hover:text-ink dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
              onClick={onOpenDevices}
            >
              <Watch size={14} strokeWidth={1.75} />
              设备连接
            </button>
            <button
              className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-soft/70 hover:text-ink dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
              onClick={onOpenBackup}
            >
              <Database size={14} strokeWidth={1.75} />
              数据备份
            </button>
            <InstallAppButton
              compact
              className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-soft/70 hover:text-ink dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
            />
          </>,
        )}
      </div>

      <aside className="hidden w-[232px] shrink-0 flex-col border-r border-line bg-surface dark:border-slate-800 dark:bg-slate-900 md:flex">
        <div className="flex items-center gap-2.5 px-4 pb-4 pt-5">
          <BrandMark size={22} className="shrink-0 text-brand dark:text-teal-300" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold tracking-title text-ink dark:text-slate-100">未央 · Everlong</p>
            <p className="truncate text-2xs text-ink-faint dark:text-slate-500">记录 & 排期</p>
          </div>
        </div>

        {renderNav(false, isAdmin ? [...NAV, ADMIN_NAV] : [...NAV])}

        <div className="space-y-px border-t border-line-soft px-2 py-2 dark:border-slate-800">
          {tools.map((tool) => (
            <button key={tool.label} className={rowClass(tool.active)} onClick={tool.onClick}>
              {tool.active && (
                <span className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-brand dark:bg-teal-300" />
              )}
              <tool.icon size={15} strokeWidth={1.75} className={iconClass(tool.active)} />
              {tool.label}
            </button>
          ))}
          <InstallAppButton className={`${rowClass(false)} [&>svg]:h-[15px] [&>svg]:w-[15px]`} />
        </div>

        <div className="space-y-3 border-t border-line-soft p-3 dark:border-slate-800">
          {user && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface-soft text-2xs font-medium text-ink-soft dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink dark:text-slate-100">{user.name}</p>
                <p className="truncate text-2xs text-ink-faint dark:text-slate-500">{user.email}</p>
              </div>
              <button className="btn-ghost p-1.5" onClick={onToggleTheme} aria-label={themeLabel} title={themeLabel}>
                {theme === 'dark' ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
              </button>
              <button className="btn-ghost p-1.5" onClick={onLogout} aria-label="退出登录" title="退出登录">
                <LogOut size={15} strokeWidth={1.75} />
              </button>
            </div>
          )}
          <button className="btn-primary w-full" onClick={onAddPlan}>
            <Plus size={15} strokeWidth={2} />
            新建计划
          </button>
        </div>
      </aside>
    </>
  )
}
