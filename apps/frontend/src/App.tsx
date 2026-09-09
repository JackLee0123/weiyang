import { useCallback, useEffect, useState } from 'react'
import { LoginPage } from './components/LoginPage'
import { Sidebar } from './components/Sidebar'
import { Modal } from './components/Modal'
import { NotificationSettings } from './components/NotificationSettings'
import { ScheduleSettings } from './components/ScheduleSettings'
import { PushPrompt } from './components/PushPrompt'
import { PlanForm } from './components/PlanForm'
import { FocusFlightOverlay } from './components/FocusFlightOverlay'
import { TodayView } from './views/TodayView'
import { WeiyangView } from './views/WeiyangView'
import { MemoryView } from './views/MemoryView'
import { CalendarView } from './views/CalendarView'
import { HeatmapView } from './views/HeatmapView'
import { ListView } from './views/ListView'
import { NotificationsView } from './views/NotificationsView'
import { TimetableView } from './views/TimetableView'
import { ChangelogView } from './views/ChangelogView'
import { AdminView } from './views/AdminView'
import { todayISO } from './lib/date'
import { useTheme } from './lib/theme'
import { api } from './lib/api'
import { clearAuth, getStoredUser, getToken, onAuthChange, updateStoredUser, type StoredUser } from './lib/auth'
import type { View } from './lib/types'

function initialView(): View {
  if (typeof window === 'undefined') return 'today'
  if (window.location.pathname.endsWith('/notifications')) return 'notifications'
  if (window.location.hash.includes('notifications')) return 'notifications'
  return 'today'
}

export default function App() {
  const [view, setView] = useState<View>(initialView)
  const [date, setDate] = useState(todayISO())
  const [showAddPlan, setShowAddPlan] = useState(false)
  const [showFocus, setShowFocus] = useState(false)
  const [showPushSettings, setShowPushSettings] = useState(false)
  const [showScheduleSettings, setShowScheduleSettings] = useState(false)
  const [isAuthed, setIsAuthed] = useState(() => typeof window !== 'undefined' && !!getToken())
  const { theme, toggleTheme } = useTheme()
  const [user, setUser] = useState<StoredUser | null>(() => getStoredUser())

  useEffect(() => {
    const sync = () => {
      const authed = !!getToken()
      setUser(getStoredUser())
      setIsAuthed(authed)
    }
    return onAuthChange(sync)
  }, [])

  useEffect(() => {
    if (!isAuthed) return
    let active = true
    api
      .me()
      .then((me) => {
        if (!active) return
        const stored: StoredUser = {
          id: me.id,
          email: me.email,
          name: me.name,
          is_admin: me.is_admin,
          is_active: me.is_active,
        }
        updateStoredUser(stored)
        setUser(stored)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [isAuthed])

  const navigate = (v: View) => {
    if (v === 'today') setDate(todayISO())
    setView(v)
  }

  const openFocus = useCallback(() => setShowFocus(true), [])
  const closeFocus = useCallback(() => setShowFocus(false), [])

  const login = () => {
    setUser(getStoredUser())
    setIsAuthed(true)
  }

  const logout = () => {
    void api.logout().catch(() => undefined)
    clearAuth()
    setIsAuthed(false)
    setView('today')
    setDate(todayISO())
  }

  if (!isAuthed) {
    return <LoginPage theme={theme} onToggleTheme={toggleTheme} onLogin={login} />
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      <Sidebar
        view={view}
        theme={theme}
        user={user}
        isAdmin={user?.is_admin ?? false}
        onToggleTheme={toggleTheme}
        onNavigate={navigate}
        onAddPlan={() => setShowAddPlan(true)}
        onOpenFocus={openFocus}
        onOpenPush={() => setShowPushSettings(true)}
        onOpenSchedule={() => setShowScheduleSettings(true)}
        onLogout={logout}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          <PushPrompt onOpenSettings={() => setShowPushSettings(true)} />
          {view === 'today' && <TodayView date={date} onChangeDate={setDate} />}
          {view === 'weiyang' && <WeiyangView />}
          {view === 'memory' && <MemoryView />}
          {view === 'calendar' && (
            <CalendarView
              onOpenDay={(d) => {
                setDate(d)
                setView('today')
              }}
            />
          )}
          {view === 'heatmap' && (
            <HeatmapView
              onOpenDay={(d) => {
                setDate(d)
                setView('today')
              }}
            />
          )}
          {view === 'timetable' && <TimetableView />}
          {view === 'list' && <ListView />}
          {view === 'notifications' && <NotificationsView onBack={() => navigate('today')} />}
          {view === 'changelog' && <ChangelogView />}
          {view === 'admin' && user?.is_admin && <AdminView meId={user.id} />}
        </div>
      </main>

      {showAddPlan && (
        <Modal title="新建计划" onClose={() => setShowAddPlan(false)}>
          <PlanForm defaultDate={todayISO()} onClose={() => setShowAddPlan(false)} />
        </Modal>
      )}
      {showFocus && <FocusFlightOverlay onClose={closeFocus} />}
      {showPushSettings && (
        <Modal title="接收通知" onClose={() => setShowPushSettings(false)}>
          <NotificationSettings onClose={() => setShowPushSettings(false)} />
        </Modal>
      )}
      {showScheduleSettings && (
        <Modal title="任务提醒" onClose={() => setShowScheduleSettings(false)}>
          <ScheduleSettings onClose={() => setShowScheduleSettings(false)} />
        </Modal>
      )}
    </div>
  )
}
