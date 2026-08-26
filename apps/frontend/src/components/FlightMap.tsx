import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import REGION from '../lib/region-map.json'
import { AMAP_AVAILABLE } from '../lib/mapConfig'
import { RealFlightMap } from './RealFlightMap'
import { greatCirclePoints, type FlightRoute } from '../lib/flight'

const MAP_W = 800
const MAP_H = 480
const MIN_LON = 98
const MAX_LON = 124
const MIN_LAT = 0
const MAX_LAT = 42

function project(lon: number, lat: number): [number, number] {
  return [
    ((lon - MIN_LON) / (MAX_LON - MIN_LON)) * MAP_W,
    ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * MAP_H,
  ]
}

const LAND_PATH = REGION.rings
  .map((ring) => {
    const points = ring.map(([lon, lat]) => {
      const [x, y] = project(lon, lat)
      return `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`
    })
    return `M ${points.join(' L ')} Z`
  })
  .join(' ')

function OfflineMap({ route, progress }: { route: FlightRoute; progress: number }) {
  const points = useMemo(
    () => greatCirclePoints(route.from, route.to, 60).map(([lon, lat]) => project(lon, lat)),
    [route.from, route.to],
  )
  const count = points.length
  const t = Math.min(1, Math.max(0, progress / 100))
  const index = Math.round(t * (count - 1))
  const plane = points[index]
  const [length, setLength] = useState(0)
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const path = pathRef.current
    if (!path) return
    try {
      setLength(path.getTotalLength())
    } catch {
      setLength(0)
    }
  }, [])

  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`).join(' ')

  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const ratio = MAP_W / MAP_H
  const pad = 80
  let vw = Math.max(...xs) - Math.min(...xs) + pad * 2
  let vh = Math.max(...ys) - Math.min(...ys) + pad * 2
  if (vw / vh < ratio) vw = vh * ratio
  else vh = vw / ratio
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2
  const viewBox = `${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`

  const next = points[Math.min(count - 1, index + 1)]
  const angle = next ? (Math.atan2(next[1] - plane[1], next[0] - plane[0]) * 180) / Math.PI : 0

  return (
    <div className="flight-map overflow-hidden rounded-lg border border-line bg-surface text-ink dark:border-slate-700 dark:bg-slate-800">
      <svg
        viewBox={viewBox}
        className="block h-auto w-full"
        role="img"
        aria-label={`${route.from.code} 到 ${route.to.code} 的航班地图`}
      >
        <rect x={0} y={0} width={MAP_W} height={MAP_H} fill="var(--map-ocean)" />
        <path
          d={LAND_PATH}
          fill="var(--map-land)"
          stroke="var(--map-coast)"
          strokeWidth={1}
          strokeLinejoin="round"
          opacity={0.85}
        />
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`v${i}`} x1={i * 100} y1={0} x2={i * 100} y2={MAP_H} stroke="var(--map-grid)" />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 96} x2={MAP_W} y2={i * 96} stroke="var(--map-grid)" />
        ))}

        <path
          ref={pathRef}
          d={path}
          fill="none"
          stroke="var(--map-route-remain)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray="3 9"
          opacity={0.8}
        />
        <path
          d={path}
          fill="none"
          stroke="var(--map-route-flown)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={length > 0 ? `${t * length} ${length}` : undefined}
        />

        <g transform={`translate(${points[0][0]}, ${points[0][1]})`}>
          <circle r={7} fill="var(--map-pin)" opacity={0.18} />
          <circle r={3.5} fill="var(--map-pin)" />
          <text x={-10} y={-12} textAnchor="end" fontSize={14} fontWeight={600} fill="var(--map-text)">
            {route.from.code}
          </text>
        </g>
        <g transform={`translate(${points[count - 1][0]}, ${points[count - 1][1]})`}>
          <circle r={7} fill="var(--map-pin)" opacity={0.18} />
          <circle r={3.5} fill="var(--map-pin)" />
          <text x={12} y={18} fontSize={14} fontWeight={600} fill="var(--map-text)">
            {route.to.code}
          </text>
        </g>

        <g transform={`translate(${plane[0]}, ${plane[1]}) rotate(${angle})`}>
          <path d="M 10 0 L -6 5 L -2.5 0 L -6 -5 Z" fill="var(--map-route-flown)" />
        </g>
      </svg>
    </div>
  )
}

export function FlightMap({
  route,
  progress,
  view = 'follow',
}: {
  route: FlightRoute
  progress: number
  view?: 'follow' | 'overview'
}) {
  const [realFailed, setRealFailed] = useState(false)
  const useReal = AMAP_AVAILABLE && !realFailed
  const handleRealError = useCallback(() => setRealFailed(true), [])

  return (
    <div className="relative w-full">
      <OfflineMap route={route} progress={progress} />
      {useReal && (
        <div className="absolute inset-0 overflow-hidden rounded-lg">
          <RealFlightMap route={route} progress={progress} view={view} onError={handleRealError} />
        </div>
      )}
    </div>
  )
}

export default FlightMap
