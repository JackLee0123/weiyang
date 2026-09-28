/**
 * 课表工具，移植自 Web 端 apps/frontend/src/lib/timetable.ts。
 * day_of_week 约定：1=周一 … 7=周日（与后端一致）。
 */

export var DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

export function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

/** Date → 'YYYY-MM-DD'（本地时区） */
export function dateISO(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

export function todayISO() {
  return dateISO(new Date())
}

/** Date → 1..7（周一=1） */
export function weekdayOf(d) {
  var day = d.getDay()
  return day === 0 ? 7 : day
}

/** 本周周一的 'YYYY-MM-DD' */
export function mondayOf(d) {
  var copy = new Date(d.getTime())
  var wd = weekdayOf(copy)
  copy.setDate(copy.getDate() - wd + 1)
  return dateISO(copy)
}

/** 周次计算：weekStart(本周周一) 相对 week1Date(开学第 1 周周一) */
export function weekIndexFor(weekStart, week1Date) {
  if (!week1Date) return 0
  var start = new Date(weekStart + 'T00:00:00').getTime()
  var base = new Date(week1Date + 'T00:00:00').getTime()
  var diff = Math.round((start - base) / 86400000)
  return Math.floor(diff / 7) + 1
}

/** 解析「第1-16周」「单/双」等周标签 → [1,2,...] */
export function parseWeekLabel(label) {
  var text = (label || '').replace(/\s/g, '')
  if (!text) return []
  var odd = text.indexOf('单') >= 0
  var even = text.indexOf('双') >= 0
  var weeks = {}
  var range = /(\d+)\s*[-–~]\s*(\d+)/g
  var match
  while ((match = range.exec(text)) !== null) {
    var s = Number(match[1])
    var e = Number(match[2])
    for (var w = s; w <= e; w++) {
      if (odd && w % 2 === 0) continue
      if (even && w % 2 === 1) continue
      weeks[w] = true
    }
  }
  var parts = text.split(/[第周,\s、]+/)
  for (var i = 0; i < parts.length; i++) {
    var token = parts[i]
    if (/^\d+$/.test(token)) {
      var n = Number(token)
      if (odd && n % 2 === 0) continue
      if (even && n % 2 === 1) continue
      weeks[n] = true
    }
  }
  var result = Object.keys(weeks).map(Number)
  result.sort(function (a, b) { return a - b })
  return result
}

/** 课程生效周：优先 week_mask（01 串），否则解析 week_label */
export function courseWeeks(course) {
  var mask = course.week_mask || ''
  if (/^[01]{8,32}$/.test(mask)) {
    var weeks = []
    for (var i = 0; i < mask.length; i++) {
      if (mask[i] === '1') weeks.push(i + 1)
    }
    if (weeks.length) return weeks
  }
  return parseWeekLabel(course.week_label)
}

export function courseActiveOn(course, weekIndex) {
  if (weekIndex <= 0) return true
  var weeks = courseWeeks(course)
  return weeks.length ? weeks.indexOf(weekIndex) >= 0 : true
}

/** [1,2,3,5,6,8] → '1-3,5-6,8' */
export function weekRanges(weeks) {
  if (!weeks.length) return ''
  var ranges = []
  var start = weeks[0]
  var prev = weeks[0]
  for (var i = 1; i <= weeks.length; i++) {
    if (i < weeks.length && weeks[i] === prev + 1) {
      prev = weeks[i]
      continue
    }
    ranges.push(start === prev ? String(start) : start + '-' + prev)
    if (i < weeks.length) {
      start = weeks[i]
      prev = weeks[i]
    }
  }
  return ranges.join(',')
}

/** 'HH:MM' → 当天分钟数 */
export function minutesOf(hhmm) {
  if (!hhmm) return -1
  var parts = String(hhmm).split(':')
  if (parts.length < 2) return -1
  return Number(parts[0]) * 60 + Number(parts[1])
}

/** 当前时间分钟数 */
export function nowMinutes() {
  var d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

/**
 * 课程展示模型：
 * { name, location, teacher, periods, timeRange, weeksLabel, isNow, isPast }
 */
export function decorateCourse(course, weekIndex, periodTimes, viewDay, todayDay, nowMin) {
  var startP = course.start_period || 1
  var endP = course.end_period || startP
  var periods = periodTimes && periodTimes.length ? periodTimes : []

  var startTime = periods[startP - 1] ? periods[startP - 1].start : ''
  var endTime = periods[endP - 1] ? periods[endP - 1].end : ''

  var weeks = courseWeeks(course)
  var weeksLabel = weeks.length ? weekRanges(weeks) + '周' : (course.week_label || '')

  var isToday = viewDay === todayDay
  var startMin = minutesOf(startTime)
  var endMin = minutesOf(endTime)
  var isNow = isToday && startMin >= 0 && endMin >= 0 && nowMin >= startMin && nowMin < endMin
  var isPast = isToday && endMin >= 0 && nowMin >= endMin

  return {
    id: course.id,
    name: course.name || '未命名课程',
    location: course.location || '',
    teacher: course.teacher || '',
    periods: startP === endP ? startP + '节' : startP + '-' + endP + '节',
    timeRange: startTime && endTime ? startTime + '-' + endTime : '',
    weeksLabel: weeksLabel,
    isNow: isNow,
    isPast: isPast
  }
}
