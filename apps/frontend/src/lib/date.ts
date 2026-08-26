import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  addMonths,
  subMonths,
} from 'date-fns'

export const toISO = (d: Date) => format(d, 'yyyy-MM-dd')
export const todayISO = () => toISO(new Date())
export const isPast = (d: string) => d < todayISO()
export const monthRange = (d: Date) => ({ start: toISO(startOfMonth(d)), end: toISO(endOfMonth(d)) })
export const weekRange = (d: Date) => ({
  start: toISO(startOfWeek(d, { weekStartsOn: 1 })),
  end: toISO(endOfWeek(d, { weekStartsOn: 1 })),
})
export const monthDays = (d: Date) => eachDayOfInterval({ start: startOfMonth(d), end: endOfMonth(d) })
export const nextMonth = (d: Date) => addMonths(d, 1)
export const prevMonth = (d: Date) => subMonths(d, 1)
export const fmtShort = (d: Date) => format(d, 'M月d日')
export const fmtWeekday = (d: Date) => format(d, 'E')
