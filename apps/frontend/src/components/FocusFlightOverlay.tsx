import { useEffect, useMemo, useRef, useState } from 'react'
import { Plane, X } from 'lucide-react'
import { FOCUS_MAX, FOCUS_MIN, FOCUS_PRESETS, clampMinutes, formatClock, routeFor } from '../lib/flight'
import { usePlanMutations, usePlans, useRecordMutations } from '../lib/queries'
import { todayISO } from '../lib/date'
import { FlightMap } from './FlightMap'

type Phase = 'boarding' | 'flying' | 'landed'

const CLOUDS = [
  { top: '8%', duration: '42s', delay: '0s', scale: 1 },
  { top: '22%', duration: '55s', delay: '-14s', scale: 0.8 },
  { top: '40%', duration: '48s', delay: '-28s', scale: 1.1 },
  { top: '62%', duration: '60s', delay: '-8s', scale: 0.9 },
  { top: '78%', duration: '50s', delay: '-22s', scale: 1 },
]

export function FocusFlightOverlay({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('boarding')
  const [minutes, setMinutes] = useState(25)
  const [customText, setCustomText] = useState('')
  const [linkedPlanId, setLinkedPlanId] = useState<string>('')
  const [elapsed, setElapsed] = useState(0)
  const [confirmAbort, setConfirmAbort] = useState(false)
  const [error, setError] = useState('')
  const [mapView, setMapView] = useState<'follow' | 'overview'>('follow')

  const startAtRef = useRef(0)
  const totalMsRef = useRef(0)

  const plansQ = usePlans({ start: todayISO(), end: todayISO() })
  const { create: createRecord } = useRecordMutations()
  const { update: updatePlan } = usePlanMutations()

  const todayPlans = useMemo(
    () => (plansQ.data ?? []).filter((p) => p.status !== 'done' && p.status !== 'cancelled'),
    [plansQ.data],
  )

  const selectedMinutes = customText !== '' ? clampMinutes(Number(customText) || 0) : minutes
  const selectedMs = selectedMinutes * 60000
  const linkedPlan = todayPlans.find((p) => p.id === Number(linkedPlanId)) ?? null

  const flightMinutes = totalMsRef.current > 0 ? Math.round(totalMsRef.current / 60000) : selectedMinutes
  const flightRoute = flightMinutes > 0 ? routeFor(flightMinutes) : routeFor(selectedMinutes)
  const pct = totalMsRef.current > 0 ? Math.min(100, (elapsed / totalMsRef.current) * 100) : 0

  const beginFlight = () => {
    if (selectedMinutes < 1) return
    totalMsRef.current = selectedMs
    startAtRef.current = Date.now()
    setElapsed(0)
    setConfirmAbort(false)
    setError('')
    setMapView('follow')
    setPhase('flying')
  }

  const saveFlight = async (completePlan: boolean) => {
    const durationMinutes = Math.max(1, Math.round(elapsed / 60000) || 1)
    const plan = completePlan ? linkedPlan : null
    const route = routeFor(durationMinutes)
    try {
      await createRecord.mutateAsync({
        date: todayISO(),
        title: plan?.title ?? `专注 · ${durationMinutes} 分钟`,
        content: `专注航班：${route.from.code} → ${route.to.code}`,
        duration_minutes: durationMinutes,
        is_completed: true,
        category: plan?.category ?? '其他',
        linked_plan_id: plan?.id ?? null,
      })
      if (plan) await updatePlan.mutateAsync({ id: plan.id, payload: { status: 'done' } })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    if (phase !== 'flying') return

    const tick = () => {
      const now = Date.now()
      const current = now - startAtRef.current
      if (current >= totalMsRef.current) {
        setElapsed(totalMsRef.current)
        setPhase('landed')
      } else {
        setElapsed(current)
      }
    }

    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [phase])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (phase === 'boarding' || phase === 'landed') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [phase, onClose])

  const customMinutes = Math.max(1, Math.round(elapsed / 60000) || 1)

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="专注航班">
      <div className="flight-sky" />
      {CLOUDS.map((cloud, index) => (
        <span
          key={index}
          className="flight-cloud"
          style={{
            top: cloud.top,
            width: `${40 * cloud.scale}vw`,
            animationDuration: cloud.duration,
            animationDelay: cloud.delay,
          }}
        />
      ))}

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-soft dark:text-slate-300">
            <Plane size={15} className="text-brand" />
            专注航班
          </div>
          {phase === 'flying' && !confirmAbort ? (
            <button className="btn-ghost" onClick={() => setConfirmAbort(true)}>
              中止
            </button>
          ) : phase === 'boarding' || phase === 'landed' ? (
            <button
              className="btn-ghost p-1.5"
              onClick={onClose}
              aria-label="关闭"
              title={phase === 'landed' ? '跳过记录并关闭' : '关闭'}
            >
              <X size={18} />
            </button>
          ) : null}
        </div>

        {phase === 'boarding' && (
          <div className="flex flex-1 items-center justify-center px-6 pb-8">
            <div className="w-full max-w-md">
              <div className="mb-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand dark:bg-brand/15 dark:text-teal-200">
                  <Plane size={24} />
                </div>
                <h1 className="text-2xl font-semibold text-ink dark:text-slate-100">登机 · 设定你的航程</h1>
                <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">把专注变成一段旅程</p>
              </div>

              <div className="rounded-lg border border-line bg-surface p-5 shadow-soft dark:border-slate-700 dark:bg-slate-800">
                <label className="label">专注时长</label>
                <div className="grid grid-cols-4 gap-2">
                  {FOCUS_PRESETS.map((preset) => {
                    const active = customText === '' && selectedMinutes === preset
                    return (
                      <button
                        key={preset}
                        className={`rounded-md border px-2 py-2 text-sm font-medium transition ${
                          active
                            ? 'border-brand bg-brand text-white'
                            : 'border-line text-ink-soft hover:border-brand dark:border-slate-600 dark:text-slate-300 dark:hover:border-brand'
                        }`}
                        onClick={() => {
                          setMinutes(preset)
                          setCustomText('')
                        }}
                      >
                        {preset}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-3">
                  <label className="label">自定义（分钟）</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={FOCUS_MIN}
                      max={FOCUS_MAX}
                      step={5}
                      className="field"
                      value={customText}
                      placeholder="自定义时长"
                      onChange={(e) => setCustomText(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-3 rounded-md border border-line-soft bg-surface-soft px-3 py-2.5 dark:border-slate-700 dark:bg-slate-700/40">
                  <p className="text-xs font-medium text-ink-soft dark:text-slate-300">匹配真实航程</p>
                  <p className="mt-0.5 text-sm font-medium text-ink dark:text-slate-100">
                    {flightRoute.from.name} <span className="text-ink-muted">({flightRoute.from.code})</span> →{' '}
                    {flightRoute.to.name} <span className="text-ink-muted">({flightRoute.to.code})</span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted dark:text-slate-400">
                    约 {flightRoute.minutes} 分钟 · {flightRoute.distanceKm} km
                  </p>
                </div>

                <div className="mt-3">
                  <label htmlFor="focus-plan" className="label">
                    关联计划（可选）
                  </label>
                  <select
                    id="focus-plan"
                    className="field"
                    value={linkedPlanId}
                    onChange={(e) => setLinkedPlanId(e.target.value)}
                  >
                    <option value="">不关联</option>
                    {todayPlans.map((plan) => (
                      <option key={plan.id} value={String(plan.id)}>
                        {plan.title}
                      </option>
                    ))}
                  </select>
                  {todayPlans.length === 0 && (
                    <p className="mt-1 text-xs text-ink-muted dark:text-slate-500">今日暂无未完成计划，可不关联</p>
                  )}
                </div>

                <button className="btn-primary mt-4 w-full" disabled={selectedMinutes < 1} onClick={beginFlight}>
                  <Plane size={16} />
                  登机起飞
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'flying' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-8">
            <p className="text-center text-sm font-medium text-ink-soft dark:text-slate-300">
              {flightRoute.from.city} {flightRoute.from.code} → {flightRoute.to.city} {flightRoute.to.code}
            </p>
            <p className="-mt-3 text-xs text-ink-muted dark:text-slate-400">
              真实航程约 {flightRoute.minutes} 分钟 · {flightRoute.distanceKm} km · 已飞行 {Math.round(pct)}%
            </p>
            <div className="text-5xl font-semibold tabular-nums tracking-tight text-ink dark:text-slate-100">
              {formatClock(elapsed)}
            </div>

            <div className="w-full max-w-2xl">
              <FlightMap route={flightRoute} progress={pct} view={mapView} />
            </div>

            <div className="flex items-center gap-2">
              <button
                className="btn-ghost"
                onClick={() => setMapView((v) => (v === 'follow' ? 'overview' : 'follow'))}
              >
                {mapView === 'follow' ? '俯瞰全图' : '跟随飞机'}
              </button>
              <p className="text-xs text-ink-muted dark:text-slate-400">心无旁骛，让思绪随气流前行</p>
            </div>

            {confirmAbort ? (
              <div className="w-full max-w-md rounded-lg border border-line bg-surface p-4 shadow-soft dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-ink dark:text-slate-100">确定要放弃这趟航班吗？</p>
                <p className="mt-1 text-xs text-ink-muted dark:text-slate-400">
                  可记录本次已专注的 {customMinutes} 分钟，或直接放弃。
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-primary flex-1" onClick={() => saveFlight(false)}>
                    记录本次专注
                  </button>
                  <button className="btn-ghost flex-1" onClick={onClose}>
                    放弃记录
                  </button>
                  <button className="btn-ghost" onClick={() => setConfirmAbort(false)}>
                    继续
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn-ghost mt-2" onClick={() => setConfirmAbort(true)}>
                中止航班
              </button>
            )}
          </div>
        )}

        {phase === 'landed' && (
          <div className="flex flex-1 items-center justify-center px-6 pb-8">
            <div className="w-full max-w-md">
              <div className="mb-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand dark:bg-brand/15 dark:text-teal-200">
                  <Plane size={24} />
                </div>
                <h2 className="text-2xl font-semibold text-ink dark:text-slate-100">已抵达</h2>
                <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">
                  {flightRoute.from.city} {flightRoute.from.code} → {flightRoute.to.city} {flightRoute.to.code}
                </p>
              </div>

              <div className="rounded-lg border border-line bg-surface p-5 shadow-soft dark:border-slate-700 dark:bg-slate-800">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted dark:text-slate-400">本次专注</span>
                  <span className="font-medium text-ink dark:text-slate-100">{flightMinutes} 分钟</span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-ink-muted dark:text-slate-400">将记录</span>
                  <span className="font-medium text-ink dark:text-slate-100">
                    {linkedPlan ? `关联「${linkedPlan.title}」` : '通用记录'}
                  </span>
                </div>
                {linkedPlan && (
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-ink-muted dark:text-slate-400">计划状态</span>
                    <span className="font-medium text-brand dark:text-teal-200">标记完成</span>
                  </div>
                )}
              </div>

              <button className="btn-primary mt-4 w-full" onClick={() => saveFlight(true)}>
                完成并记一笔
              </button>
              <button className="btn-ghost mt-2 w-full" onClick={onClose}>
                跳过记录
              </button>
              {error && <p className="mt-2 text-center text-xs text-rose-600 dark:text-rose-300">{error}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FocusFlightOverlay
