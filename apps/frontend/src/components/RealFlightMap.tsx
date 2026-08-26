import { useEffect, useRef, useState } from 'react'
import { AMAP_KEY, AMAP_SECURITY } from '../lib/mapConfig'
import { greatCirclePoints, type FlightRoute } from '../lib/flight'

let amapPromise: Promise<any> | null = null

function loadAmap(): Promise<any> {
  if ((window as any).AMap) return Promise.resolve((window as any).AMap)
  if (!amapPromise) {
    amapPromise = new Promise((resolve, reject) => {
      if (!AMAP_KEY) return reject(new Error('missing AMap key'))
      ;(window as any)._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY }
      const script = document.createElement('script')
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(AMAP_KEY)}`
      script.onload = () => {
        if ((window as any).AMap) resolve((window as any).AMap)
        else {
          amapPromise = null
          reject(new Error('AMap object missing'))
        }
      }
      script.onerror = () => {
        amapPromise = null
        reject(new Error('AMap script failed'))
      }
      document.head.appendChild(script)
    })
  }
  return amapPromise
}

function bearing(a: [number, number], b: [number, number]): number {
  const dlng = (b[0] - a[0]) * Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180)
  const dlat = b[1] - a[1]
  return (Math.atan2(dlng, dlat) * 180) / Math.PI
}

function pinHtml(label: string, color: string): string {
  return `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 1px 3px rgba(0,0,0,.28));">
    <span style="padding:2px 8px;border-radius:999px;background:${color};color:#fff;font-size:12px;font-weight:600;white-space:nowrap;margin-bottom:2px;">${label}</span>
    <span style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-sizing:border-box;"></span>
  </div>`
}

function planeHtml(color: string): string {
  return `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
    <svg width="28" height="28" viewBox="0 0 24 24" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.35));">
      <path d="M12 2c.55 0 1 .45 1 1v4.5l7 4v2.2l-7-2.7v4.6l2.2 1.3v2L12 15.7l-3.2 1.4v-2L11 13.8V9.2l-7 2.7V9.7l7-4V3c0-.55.45-1 1-1z" fill="${color}"/>
    </svg>
  </div>`
}

export function RealFlightMap({
  route,
  progress,
  view = 'follow',
  onError,
}: {
  route: FlightRoute
  progress: number
  view?: 'follow' | 'overview'
  onError: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const flownRef = useRef<any>(null)
  const planeRef = useRef<any>(null)
  const planeElRef = useRef<HTMLDivElement | null>(null)
  const pointsRef = useRef<[number, number][]>([])
  const overlaysRef = useRef<any>(null)
  const onErrorRef = useRef(onError)
  const [ready, setReady] = useState(false)

  onErrorRef.current = onError

  useEffect(() => {
    let cancelled = false
    let map: any

    const boot = async () => {
      try {
        const amap = await loadAmap()
        if (cancelled || !containerRef.current) return

        const points = greatCirclePoints(route.from, route.to, 80)
        pointsRef.current = points
        const dark = document.documentElement.classList.contains('dark')
        const brand = dark ? '#2dd4bf' : '#0f766e'
        const destColor = '#ea580c'

        map = new amap.Map(containerRef.current, {
          viewMode: '3D',
          zoom: 9,
          center: [(route.from.lon + route.to.lon) / 2, (route.from.lat + route.to.lat) / 2],
          mapStyle: dark ? 'amap://styles/dark' : 'amap://styles/normal',
          pitch: 38,
          rotation: 0,
        })

        const originPin = new amap.Marker({
          position: [route.from.lon, route.from.lat],
          title: route.from.name,
          content: pinHtml(route.from.code, brand),
          anchor: 'bottom-center',
        })
        const destPin = new amap.Marker({
          position: [route.to.lon, route.to.lat],
          title: route.to.name,
          content: pinHtml(route.to.code, destColor),
          anchor: 'bottom-center',
        })
        const remaining = new amap.Polyline({
          path: points,
          strokeColor: dark ? '#475569' : '#94a3b8',
          strokeWeight: 4,
          strokeStyle: 'dashed',
          strokeDasharray: [8, 12],
          lineJoin: 'round',
          zIndex: 40,
        })
        const flown = new amap.Polyline({
          path: [points[0]],
          strokeColor: brand,
          strokeWeight: 5,
          lineJoin: 'round',
          zIndex: 50,
        })
        const planeEl = document.createElement('div')
        planeEl.innerHTML = planeHtml(brand)
        const plane = new amap.Marker({
          position: points[0],
          content: planeEl,
          anchor: 'center',
          zIndex: 80,
        })

        map.add([remaining, flown, originPin, destPin, plane])

        mapRef.current = map
        flownRef.current = flown
        planeRef.current = plane
        planeElRef.current = planeEl
        overlaysRef.current = [remaining, originPin, destPin]
        setReady(true)
      } catch {
        if (!cancelled) onErrorRef.current()
      }
    }

    void boot()
    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
    }
  }, [route.from, route.to])

  useEffect(() => {
    if (!ready || !planeRef.current || !flownRef.current) return
    const points = pointsRef.current
    const t = Math.min(1, Math.max(0, progress / 100))
    const index = Math.round(t * (points.length - 1))
    const position = points[index]
    planeRef.current.setPosition(position)
    flownRef.current.setPath(points.slice(0, index + 1))
    const el = planeElRef.current
    if (el && index < points.length - 1) {
      el.style.transform = `rotate(${bearing(points[index], points[index + 1])}deg)`
    }
    if (view === 'follow') {
      mapRef.current?.setZoomAndCenter(9, position)
    }
  }, [progress, ready, view])

  useEffect(() => {
    if (!ready || !mapRef.current) return
    if (view === 'overview') {
      mapRef.current.setFitView(overlaysRef.current, false, [70, 70, 70, 70])
      mapRef.current.setPitch(0)
    } else {
      mapRef.current.setPitch(38)
      const position = planeRef.current?.getPosition?.()
      if (position) mapRef.current.setCenter(position)
    }
  }, [view, ready])

  return (
    <div ref={containerRef} className="h-full w-full">
      {!ready && (
        <div className="flex h-full w-full items-center justify-center bg-surface dark:bg-slate-800">
          <span className="text-xs text-ink-muted dark:text-slate-400">正在加载实时地图…</span>
        </div>
      )}
    </div>
  )
}

export default RealFlightMap
