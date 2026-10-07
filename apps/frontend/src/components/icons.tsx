import type { ReactNode, SVGProps } from 'react'

/**
 * 未央 · Everlong —— 内联 SVG 图标集（方向代号「纸墨」）
 *
 * 设计规则：图标一律手绘内联 SVG，线性、1.5px 统一描边、currentColor 取色，
 * 不引任何图标库。这里取代了原先 lucide-react 的 79 个图标引用。
 *
 * 调用方式与原来完全一致（<Plus size={15} />）。为兼容旧调用保留了
 * strokeWidth / absoluteStrokeWidth 参数，但按设计规则不再生效——
 * 全站图标固定 1.5px 描边。
 */
type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  size?: number | string
  strokeWidth?: number
  absoluteStrokeWidth?: boolean
}

const STROKE = 1.5

function frame(body: ReactNode) {
  return function Icon({ size = 16, className, strokeWidth, absoluteStrokeWidth, ...rest }: IconProps) {
    // 设计规则：统一 1.5px 描边，调用处传入的粗细不再生效
    void strokeWidth
    void absoluteStrokeWidth
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...rest}
      >
        {body}
      </svg>
    )
  }
}

export const Activity = frame(<path d="M3 12h4l3-8 4 16 3-8h4" />)

export const AlertTriangle = frame(
  <>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>,
)

export const ArrowRight = frame(
  <>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </>,
)

export const Bell = frame(
  <>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
    <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
  </>,
)

export const BellOff = frame(
  <>
    <path d="M8.7 3A6 6 0 0 1 18 8c0 2.5.4 4.2 1 5.3" />
    <path d="M6 8c0 7-3 8-3 8h13" />
    <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    <path d="m2 2 20 20" />
  </>,
)

export const BellRing = frame(
  <>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
    <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    <path d="M2 8a6 6 0 0 1 3-5.2" />
    <path d="M22 8a6 6 0 0 0-3-5.2" />
  </>,
)

export const BookOpen = frame(
  <>
    <path d="M12 6.5C10.5 5.1 8.2 4.5 5.5 4.5H3v13h2.5c2.7 0 5 .6 6.5 2 1.5-1.4 3.8-2 6.5-2H21v-13h-2.5C15.8 4.5 13.5 5.1 12 6.5Z" />
    <path d="M12 6.5v13" />
  </>,
)

export const Calendar = frame(
  <>
    <rect x="3" y="5" width="18" height="16" rx="1" />
    <path d="M3 10h18" />
    <path d="M8 3v4M16 3v4" />
  </>,
)

export const CalendarCheck = frame(
  <>
    <rect x="3" y="5" width="18" height="16" rx="1" />
    <path d="M3 10h18" />
    <path d="M8 3v4M16 3v4" />
    <path d="m9 15 2 2 4-4" />
  </>,
)

export const CalendarClock = frame(
  <>
    <rect x="3" y="5" width="18" height="16" rx="1" />
    <path d="M3 10h18" />
    <path d="M8 3v4M16 3v4" />
    <path d="M16 14v2.5l2 1.2" />
  </>,
)

export const CalendarDays = frame(
  <>
    <rect x="3" y="5" width="18" height="16" rx="1" />
    <path d="M3 10h18" />
    <path d="M8 3v4M16 3v4" />
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
  </>,
)

export const CalendarPlus = frame(
  <>
    <rect x="3" y="5" width="18" height="16" rx="1" />
    <path d="M3 10h18" />
    <path d="M8 3v4M16 3v4" />
    <path d="M12 13v5M9.5 15.5h5" />
  </>,
)

export const CalendarRange = frame(
  <>
    <rect x="3" y="5" width="18" height="16" rx="1" />
    <path d="M3 10h18" />
    <path d="M8 3v4M16 3v4" />
    <path d="M8 14h8M8 18h5" />
  </>,
)

export const CameraOff = frame(
  <>
    <path d="m2 2 20 20" />
    <path d="M4 8v10a1 1 0 0 0 1 1h14" />
    <path d="M9.5 5.5 10 5h4l1.5 2H20a1 1 0 0 1 1 1v8.5" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </>,
)

export const Check = frame(<path d="m4 12 5 5L20 6" />)

export const CheckCircle2 = frame(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.4 2.5 2.5 5-5.6" />
  </>,
)

export const ChevronDown = frame(<path d="m6 9 6 6 6-6" />)

export const ChevronLeft = frame(<path d="m15 6-6 6 6 6" />)

export const ChevronRight = frame(<path d="m9 6 6 6-6 6" />)

export const ChevronUp = frame(<path d="m6 15 6-6 6 6" />)

export const ClipboardCheck = frame(
  <>
    <rect x="5" y="4" width="14" height="17" rx="1" />
    <path d="M9 4V2.8h6V4" />
    <path d="m8.5 13 2.5 2.5L16 10" />
  </>,
)

export const Clock = frame(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.5l3.5 2" />
  </>,
)

export const Database = frame(
  <>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
    <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
  </>,
)

export const Download = frame(
  <>
    <path d="M12 3v12" />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    <path d="M4 20h16" />
  </>,
)

export const Eye = frame(
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </>,
)

export const EyeOff = frame(
  <>
    <path d="M2.5 12S6 5.5 12 5.5c1.6 0 3 .4 4.3 1" />
    <path d="M21.5 12S18 18.5 12 18.5c-1.6 0-3-.4-4.3-1" />
    <path d="m2 2 20 20" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </>,
)

export const FileSpreadsheet = frame(
  <>
    <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" />
    <path d="M14 3v4h4" />
    <path d="M9 12h6M9 16h6M12 11v6" />
  </>,
)

export const FileUp = frame(
  <>
    <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" />
    <path d="M14 3v4h4" />
    <path d="M12 18v-6" />
    <path d="m9.5 14.5 2.5-2.5 2.5 2.5" />
  </>,
)

export const Flag = frame(
  <>
    <path d="M5 21V4" />
    <path d="M5 5h11l-1.5 3.5L16 12H5" />
  </>,
)

export const Flame = frame(
  <path d="M12 3c3 3.5 5 6.2 5 9.2A5 5 0 0 1 7 12.5c0-1.6.7-3 2-4.3.5 1.3 1.4 2.2 2.4 2.6C11 8.6 11.4 5.6 12 3Z" />,
)

export const History = frame(
  <>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3 4v4h4" />
    <path d="M12 8v4.5l3 1.8" />
  </>,
)

export const ImagePlus = frame(
  <>
    <rect x="3" y="4" width="18" height="16" rx="1" />
    <path d="m4.5 17 4.5-4.5 3.5 3.5" />
    <path d="m13 15 2.5-2.5 4.5 4.5" />
    <path d="M18 2.5v4M16 4.5h4" />
  </>,
)

export const Inbox = frame(
  <>
    <path d="M3 13.5 5.6 5.4A1 1 0 0 1 6.5 4.7h11a1 1 0 0 1 .9.7L21 13.5" />
    <path d="M3 13.5h5l1.2 2.6h5.6l1.2-2.6h5" />
    <path d="M3 13.5v5a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-5" />
  </>,
)

export const List = frame(
  <>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </>,
)

export const Loader2 = frame(
  <>
    <path d="M12 3v4" />
    <path d="M12 17v4" />
    <path d="M3 12h4" />
    <path d="M17 12h4" />
    <path d="m5.6 5.6 2.8 2.8" />
    <path d="m15.6 15.6 2.8 2.8" />
    <path d="m5.6 18.4 2.8-2.8" />
    <path d="m15.6 8.4 2.8-2.8" />
  </>,
)

export const Lock = frame(
  <>
    <rect x="4" y="10.5" width="16" height="10.5" rx="1" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    <path d="M12 14.5v3" />
  </>,
)

export const LockKeyhole = frame(
  <>
    <rect x="4" y="10.5" width="16" height="10.5" rx="1" />
    <circle cx="12" cy="15.5" r="1.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </>,
)

export const LogOut = frame(
  <>
    <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
    <path d="m9 8-4 4 4 4" />
    <path d="M5 12h10" />
  </>,
)

export const Mail = frame(
  <>
    <rect x="2.5" y="5" width="19" height="14" rx="1" />
    <path d="m3 6.5 9 6.5 9-6.5" />
  </>,
)

export const MapPin = frame(
  <>
    <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </>,
)

export const Maximize = frame(
  <>
    <path d="M9 3H4a1 1 0 0 0-1 1v5" />
    <path d="M15 3h5a1 1 0 0 1 1 1v5" />
    <path d="M15 21h5a1 1 0 0 0 1-1v-5" />
    <path d="M9 21H4a1 1 0 0 1-1-1v-5" />
  </>,
)

export const Megaphone = frame(
  <>
    <path d="M3 11v2a1 1 0 0 0 1 1h3l9 4V6L7 10H4a1 1 0 0 0-1 1Z" />
    <path d="M7 14v4a1 1 0 0 0 1 1h1.5a1 1 0 0 0 1-1v-3" />
  </>,
)

export const MessageSquareText = frame(
  <>
    <path d="M20 4H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3v3.5L11 16h9a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1Z" />
    <path d="M7.5 8.5h9M7.5 12h6" />
  </>,
)

export const Minus = frame(<path d="M5 12h14" />)

export const MonitorDown = frame(
  <>
    <rect x="3" y="4" width="18" height="12" rx="1" />
    <path d="M9 20h6M12 16v4" />
    <path d="m9 10 3 3 3-3" />
  </>,
)

export const MonitorUp = frame(
  <>
    <rect x="3" y="4" width="18" height="12" rx="1" />
    <path d="M9 20h6M12 16v4" />
    <path d="m9 12 3-3 3 3" />
  </>,
)

export const Moon = frame(<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />)

export const MoveRight = frame(
  <>
    <path d="M4 12h14" />
    <path d="m14 8 4 4-4 4" />
  </>,
)

export const Package = frame(
  <>
    <path d="m12 3 8.5 4.6v8.8L12 21l-8.5-4.6V7.6z" />
    <path d="m3.5 7.6 8.5 4.6 8.5-4.6" />
    <path d="M12 12.2V21" />
  </>,
)

export const Pencil = frame(
  <>
    <path d="M17.5 3.5a2.1 2.1 0 0 1 3 3L7 20l-4 1 1-4z" />
    <path d="m15 6 3 3" />
  </>,
)

export const Pi = frame(
  <>
    <path d="M4 8h16" />
    <path d="M9 8v8" />
    <path d="M15 8v6a2 2 0 0 0 2 2" />
  </>,
)

export const PieChart = frame(
  <>
    <path d="M12 3a9 9 0 1 0 9 9h-9z" />
    <path d="M15 3.6A9 9 0 0 1 20.4 9H15z" />
  </>,
)

export const Plane = frame(
  <path d="M12 2c.6 0 1 .4 1 1v5.5l7.5 4.3v2.4l-7.5-2.9v4.4l2.5 1.7v2L12 19.6l-3.5.8v-2l2.5-1.7v-4.4L3.5 15.2v-2.4L11 8.5V3c0-.6.4-1 1-1Z" />,
)

export const PlaneLanding = frame(
  <>
    <path d="M3 19.5h18" />
    <path d="m5 13.5 3.5 1.5 8-2.3 3 1a1.5 1.5 0 0 1-.5 2.9l-13 1z" />
  </>,
)

export const Plus = frame(<path d="M12 5v14M5 12h14" />)

export const RefreshCw = frame(
  <>
    <path d="M20 5v5h-5" />
    <path d="M4 19v-5h5" />
    <path d="M19.2 10A8 8 0 0 0 6 6.3L4 8" />
    <path d="M4.8 14a8 8 0 0 0 13.2 3.7L20 16" />
  </>,
)

export const RotateCcw = frame(
  <>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3 4v4h4" />
  </>,
)

export const Route = frame(
  <>
    <circle cx="6" cy="18.5" r="2.5" />
    <circle cx="18" cy="5.5" r="2.5" />
    <path d="M8.5 18.5H14a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h5.5" />
  </>,
)

export const Save = frame(
  <>
    <path d="M5 3h11l3 3v15H5z" />
    <path d="M9 3v6h6V3" />
    <path d="M8 14h8v7H8z" />
  </>,
)

export const ScanLine = frame(
  <>
    <path d="M3 8V5a1 1 0 0 1 1-1h3" />
    <path d="M21 8V5a1 1 0 0 0-1-1h-3" />
    <path d="M3 16v3a1 1 0 0 0 1 1h3" />
    <path d="M21 16v3a1 1 0 0 1-1 1h-3" />
    <path d="M3 12h18" />
  </>,
)

export const School = frame(
  <>
    <path d="m12 3 9 4.5-9 4.5-9-4.5z" />
    <path d="M6 10v5.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V10" />
    <path d="M21 8v6" />
  </>,
)

export const Search = frame(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </>,
)

export const Send = frame(
  <>
    <path d="M21.3 2.7 2.9 9.9a.6.6 0 0 0 .1 1.1l7 2.1 2.1 7a.6.6 0 0 0 1.1.1z" />
    <path d="M21.3 2.7 10 14" />
  </>,
)

export const Settings2 = frame(
  <>
    <path d="M4 6h16M4 12h16M4 18h16" />
    <circle cx="9" cy="6" r="2" />
    <circle cx="15" cy="12" r="2" />
    <circle cx="7" cy="18" r="2" />
  </>,
)

export const Share = frame(
  <>
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="m8.3 10.8 7.4-3.6" />
    <path d="m8.3 13.2 7.4 3.6" />
  </>,
)

export const ShieldAlert = frame(
  <>
    <path d="M12 3l8 3v5.5c0 5-3.4 8.6-8 9.5-4.6-.9-8-4.5-8-9.5V6z" />
    <path d="M12 9v4" />
    <path d="M12 16h.01" />
  </>,
)

export const ShieldCheck = frame(
  <>
    <path d="M12 3l8 3v5.5c0 5-3.4 8.6-8 9.5-4.6-.9-8-4.5-8-9.5V6z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </>,
)

export const Smartphone = frame(
  <>
    <rect x="6" y="2.5" width="12" height="19" rx="1.5" />
    <path d="M10.5 18.5h3" />
  </>,
)

export const Sparkles = frame(
  <>
    <path d="m12 3.5 1.6 4.4 4.4 1.6-4.4 1.6L12 15.5l-1.6-4.4L6 9.5l4.4-1.6z" />
    <path d="m18.5 15 .8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  </>,
)

export const Sun = frame(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
  </>,
)

export const Timer = frame(
  <>
    <circle cx="12" cy="14" r="8" />
    <path d="M12 11v3.5l2.5 1.5" />
    <path d="M9 2.5h6M12 2.5V6" />
  </>,
)

export const Trash2 = frame(
  <>
    <path d="M4 6.5h16" />
    <path d="M9.5 6.5V4.2h5v2.3" />
    <path d="M6.5 6.5 7.4 20a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9l.9-13.5" />
    <path d="M10.5 10.5v6.5M13.5 10.5v6.5" />
  </>,
)

export const TriangleAlert = frame(
  <>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>,
)

export const Undo2 = frame(
  <>
    <path d="M8 5 4 9l4 4" />
    <path d="M4 9h9a6 6 0 0 1 0 12H8" />
  </>,
)

export const Upload = frame(
  <>
    <path d="M12 21V9" />
    <path d="m7.5 13.5 4.5-4.5 4.5 4.5" />
    <path d="M4 4h16" />
  </>,
)

export const UserRound = frame(
  <>
    <circle cx="12" cy="8.5" r="4" />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </>,
)

export const Users = frame(
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 5.2a3.5 3.5 0 0 1 0 6.6" />
    <path d="M18 20a6.5 6.5 0 0 0-1.8-4.5" />
  </>,
)

export const Watch = frame(
  <>
    <circle cx="12" cy="12" r="6" />
    <path d="M12 9.5V12l1.8 1.2" />
    <path d="M9.5 6.2 9 3h6l-.5 3.2M9.5 17.8 9 21h6l-.5-3.2" />
  </>,
)

export const X = frame(<path d="M6 6l12 12M18 6 6 18" />)

export const ZoomIn = frame(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
    <path d="M11 8.5v5M8.5 11h5" />
  </>,
)
