export const FOCUS_PRESETS = [15, 25, 45, 60] as const
export const FOCUS_MIN = 5
export const FOCUS_MAX = 360

export function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(FOCUS_MAX, Math.max(FOCUS_MIN, Math.round(value)))
}

export interface Airport {
  code: string
  name: string
  city: string
  lon: number
  lat: number
}

const AIRPORTS: Record<string, Airport> = {
  PEK: { code: 'PEK', name: '北京首都国际机场', city: '北京', lon: 116.607, lat: 40.08 },
  PKX: { code: 'PKX', name: '北京大兴国际机场', city: '北京', lon: 116.41, lat: 39.509 },
  SHA: { code: 'SHA', name: '上海虹桥国际机场', city: '上海', lon: 121.336, lat: 31.198 },
  PVG: { code: 'PVG', name: '上海浦东国际机场', city: '上海', lon: 121.805, lat: 31.144 },
  CAN: { code: 'CAN', name: '广州白云国际机场', city: '广州', lon: 113.299, lat: 23.392 },
  SZX: { code: 'SZX', name: '深圳宝安国际机场', city: '深圳', lon: 113.811, lat: 22.639 },
  CTU: { code: 'CTU', name: '成都双流国际机场', city: '成都', lon: 103.947, lat: 30.578 },
  XIY: { code: 'XIY', name: '西安咸阳国际机场', city: '西安', lon: 108.752, lat: 34.447 },
  CKG: { code: 'CKG', name: '重庆江北国际机场', city: '重庆', lon: 106.641, lat: 29.719 },
  HGH: { code: 'HGH', name: '杭州萧山国际机场', city: '杭州', lon: 120.436, lat: 30.23 },
  NKG: { code: 'NKG', name: '南京禄口国际机场', city: '南京', lon: 118.862, lat: 31.742 },
  NGB: { code: 'NGB', name: '宁波栎社国际机场', city: '宁波', lon: 121.462, lat: 29.827 },
  XMN: { code: 'XMN', name: '厦门高崎国际机场', city: '厦门', lon: 118.127, lat: 24.544 },
  WUH: { code: 'WUH', name: '武汉天河国际机场', city: '武汉', lon: 114.208, lat: 30.784 },
  KMG: { code: 'KMG', name: '昆明长水国际机场', city: '昆明', lon: 102.929, lat: 25.101 },
  TAO: { code: 'TAO', name: '青岛胶东国际机场', city: '青岛', lon: 120.092, lat: 36.361 },
  DLC: { code: 'DLC', name: '大连周水子国际机场', city: '大连', lon: 121.539, lat: 38.965 },
  CSX: { code: 'CSX', name: '长沙黄花国际机场', city: '长沙', lon: 113.22, lat: 28.189 },
  SYX: { code: 'SYX', name: '三亚凤凰国际机场', city: '三亚', lon: 109.412, lat: 18.303 },
  HAK: { code: 'HAK', name: '海口美兰国际机场', city: '海口', lon: 110.459, lat: 19.934 },
  URC: { code: 'URC', name: '乌鲁木齐地窝堡国际机场', city: '乌鲁木齐', lon: 87.474, lat: 43.907 },
  HKG: { code: 'HKG', name: '香港国际机场', city: '香港', lon: 113.914, lat: 22.308 },
  TPE: { code: 'TPE', name: '台湾桃园国际机场', city: '台北', lon: 121.233, lat: 25.08 },
  ICN: { code: 'ICN', name: '首尔仁川国际机场', city: '首尔', lon: 126.447, lat: 37.46 },
  KIX: { code: 'KIX', name: '大阪关西国际机场', city: '大阪', lon: 135.244, lat: 34.434 },
  NRT: { code: 'NRT', name: '东京成田国际机场', city: '东京', lon: 140.386, lat: 35.772 },
  SIN: { code: 'SIN', name: '新加坡樟宜机场', city: '新加坡', lon: 103.991, lat: 1.364 },
  BKK: { code: 'BKK', name: '曼谷素万那普机场', city: '曼谷', lon: 100.747, lat: 13.681 },
  KUL: { code: 'KUL', name: '吉隆坡国际机场', city: '吉隆坡', lon: 101.71, lat: 2.746 },
  CGK: { code: 'CGK', name: '雅加达苏加诺哈达机场', city: '雅加达', lon: 106.655, lat: -6.126 },
  DPS: { code: 'DPS', name: '巴厘岛伍拉赖国际机场', city: '巴厘岛', lon: 115.167, lat: -8.747 },
}

interface RealFlight {
  from: string
  to: string
  minutes: number
}

// 常用真实航线的典型计划飞行时长（分钟，约值），按时长升序排列。
// routeFor 按 5 分钟分档，取对应档位的真实航班，保证每个 5 分钟档位一条不同航程。
const REAL_FLIGHTS: RealFlight[] = [
  { from: 'SHA', to: 'NGB', minutes: 25 },
  { from: 'SHA', to: 'HGH', minutes: 30 },
  { from: 'SZX', to: 'CAN', minutes: 30 },
  { from: 'SHA', to: 'NKG', minutes: 40 },
  { from: 'CTU', to: 'CKG', minutes: 45 },
  { from: 'CAN', to: 'XMN', minutes: 50 },
  { from: 'PEK', to: 'DLC', minutes: 55 },
  { from: 'SHA', to: 'TAO', minutes: 60 },
  { from: 'CAN', to: 'WUH', minutes: 65 },
  { from: 'CTU', to: 'KMG', minutes: 70 },
  { from: 'SZX', to: 'WUH', minutes: 75 },
  { from: 'PEK', to: 'XIY', minutes: 80 },
  { from: 'CAN', to: 'CTU', minutes: 85 },
  { from: 'PEK', to: 'HGH', minutes: 90 },
  { from: 'SHA', to: 'TPE', minutes: 95 },
  { from: 'PEK', to: 'ICN', minutes: 100 },
  { from: 'SZX', to: 'KMG', minutes: 105 },
  { from: 'SHA', to: 'CSX', minutes: 110 },
  { from: 'PEK', to: 'TAO', minutes: 115 },
  { from: 'CAN', to: 'KMG', minutes: 120 },
  { from: 'SHA', to: 'HAK', minutes: 125 },
  { from: 'PEK', to: 'WUH', minutes: 130 },
  { from: 'PEK', to: 'SHA', minutes: 135 },
  { from: 'SZX', to: 'HGH', minutes: 140 },
  { from: 'PEK', to: 'CSX', minutes: 145 },
  { from: 'SHA', to: 'CTU', minutes: 150 },
  { from: 'SZX', to: 'CTU', minutes: 155 },
  { from: 'CAN', to: 'TAO', minutes: 160 },
  { from: 'PEK', to: 'KMG', minutes: 165 },
  { from: 'PVG', to: 'HKG', minutes: 170 },
  { from: 'SHA', to: 'SYX', minutes: 175 },
  { from: 'SZX', to: 'TAO', minutes: 180 },
  { from: 'PEK', to: 'CTU', minutes: 185 },
  { from: 'CAN', to: 'BKK', minutes: 190 },
  { from: 'SHA', to: 'URC', minutes: 195 },
  { from: 'PEK', to: 'CAN', minutes: 200 },
  { from: 'CTU', to: 'URC', minutes: 205 },
  { from: 'SZX', to: 'SYX', minutes: 210 },
  { from: 'PEK', to: 'SYX', minutes: 215 },
  { from: 'HKG', to: 'SIN', minutes: 220 },
  { from: 'SHA', to: 'BKK', minutes: 225 },
  { from: 'PEK', to: 'BKK', minutes: 230 },
  { from: 'SZX', to: 'BKK', minutes: 235 },
  { from: 'KMG', to: 'SIN', minutes: 240 },
  { from: 'CTU', to: 'BKK', minutes: 245 },
  { from: 'PEK', to: 'SIN', minutes: 250 },
  { from: 'CAN', to: 'SIN', minutes: 255 },
  { from: 'SHA', to: 'SIN', minutes: 260 },
  { from: 'XIY', to: 'SIN', minutes: 265 },
  { from: 'PEK', to: 'HKG', minutes: 270 },
  { from: 'CTU', to: 'SIN', minutes: 275 },
  { from: 'PEK', to: 'KIX', minutes: 280 },
  { from: 'PVG', to: 'SIN', minutes: 285 },
  { from: 'CAN', to: 'KIX', minutes: 290 },
  { from: 'SZX', to: 'SIN', minutes: 295 },
  { from: 'PEK', to: 'NRT', minutes: 300 },
  { from: 'PVG', to: 'NRT', minutes: 305 },
  { from: 'CAN', to: 'NRT', minutes: 310 },
  { from: 'SZX', to: 'NRT', minutes: 315 },
  { from: 'PEK', to: 'KUL', minutes: 320 },
  { from: 'SHA', to: 'NRT', minutes: 325 },
  { from: 'CTU', to: 'NRT', minutes: 330 },
  { from: 'PEK', to: 'CGK', minutes: 335 },
  { from: 'PVG', to: 'KUL', minutes: 340 },
  { from: 'CAN', to: 'CGK', minutes: 345 },
  { from: 'SZX', to: 'KUL', minutes: 350 },
  { from: 'PEK', to: 'DPS', minutes: 355 },
  { from: 'PVG', to: 'DPS', minutes: 360 },
  { from: 'SHA', to: 'CGK', minutes: 345 },
  { from: 'SZX', to: 'DPS', minutes: 350 },
  { from: 'CTU', to: 'CGK', minutes: 355 },
  { from: 'CAN', to: 'DPS', minutes: 360 },
]

export interface FlightRoute {
  from: Airport
  to: Airport
  minutes: number
  distanceKm: number
  code: string
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI
}

export function haversineKm(a: Airport, b: Airport): number {
  const r = 6371
  const dLat = toRadians(b.lat - a.lat)
  const dLon = toRadians(b.lon - a.lon)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * r * Math.asin(Math.sqrt(h)))
}

function toVector(lon: number, lat: number): [number, number, number] {
  const la = toRadians(lat)
  const lo = toRadians(lon)
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]
}

function toLonLat(v: [number, number, number]): [number, number] {
  return [toDegrees(Math.atan2(v[1], v[0])), toDegrees(Math.asin(Math.max(-1, Math.min(1, v[2]))))]
}

function slerp(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  const theta = Math.acos(dot)
  if (theta < 1e-6) return a
  const sinTheta = Math.sin(theta)
  const wa = Math.sin((1 - t) * theta) / sinTheta
  const wb = Math.sin(t * theta) / sinTheta
  return [wa * a[0] + wb * b[0], wa * a[1] + wb * b[1], wa * a[2] + wb * b[2]]
}

// 球面大圆（orthodrome）采样点：真实最短航路，不是手画弧线。
export function greatCirclePoints(a: Airport, b: Airport, count = 60): [number, number][] {
  const va = toVector(a.lon, a.lat)
  const vb = toVector(b.lon, b.lat)
  const points: [number, number][] = []
  for (let i = 0; i <= count; i++) {
    const t = i / count
    points.push(toLonLat(slerp(va, vb, t)))
  }
  return points
}

export function routeFor(minutes: number): FlightRoute {
  const bucket = Math.min(FOCUS_MAX, Math.max(FOCUS_MIN, Math.round(clampMinutes(minutes) / 5) * 5))
  const index = Math.min(Math.round((bucket - FOCUS_MIN) / 5), REAL_FLIGHTS.length - 1)
  const flight = REAL_FLIGHTS[index]
  const from = AIRPORTS[flight.from]
  const to = AIRPORTS[flight.to]
  return {
    from,
    to,
    minutes: flight.minutes,
    distanceKm: haversineKm(from, to),
    code: `${flight.from}-${flight.to}`,
  }
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
