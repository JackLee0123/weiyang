/**
 * 「当日专注」统计逻辑，移植自 Web 端 apps/frontend/src/lib/focus.ts。
 * 口径：当天 duration_minutes > 0 的记录即一段专注。
 */

/** 饼图配色，与 Web 端保持一致。 */
export var FOCUS_COLORS = [
  '#f472b6',
  '#5eead4',
  '#93c5fd',
  '#fbbf24',
  '#a5b4fc',
  '#34d399',
  '#fb923c',
  '#c4b5fd'
]

/** 超过这个数量的分片合并成「其他」。 */
var MAX_SLICES = 6
export var UNLINKED_LABEL = '未关联计划'
export var OTHER_LABEL = '其他'
var AUTO_FOCUS_TITLE = /^专注\s*[·:：]/

/** planTitles: { plan_id: title } 普通对象。 */
export function summarizeFocus(records, planTitles) {
  planTitles = planTitles || {}
  var groups = {}
  var order = []
  var count = 0
  var minutes = 0

  for (var i = 0; i < records.length; i++) {
    var record = records[i]
    var duration = Math.max(0, Math.round(record.duration_minutes || 0))
    if (duration <= 0) continue

    var label
    if (record.linked_plan_id && planTitles[record.linked_plan_id]) {
      label = planTitles[record.linked_plan_id]
    } else {
      var title = (record.title || '').trim()
      label = (!title || AUTO_FOCUS_TITLE.test(title)) ? UNLINKED_LABEL : title
    }

    if (!groups[label]) {
      groups[label] = { label: label, minutes: 0, count: 0 }
      order.push(label)
    }
    groups[label].minutes += duration
    groups[label].count += 1
    count += 1
    minutes += duration
  }

  var sorted = order.map(function (label) { return groups[label] })
  sorted.sort(function (a, b) {
    if (b.minutes !== a.minutes) return b.minutes - a.minutes
    return a.label < b.label ? -1 : (a.label > b.label ? 1 : 0)
  })

  var needsMerge = sorted.length > MAX_SLICES
  var head = needsMerge ? sorted.slice(0, MAX_SLICES - 1) : sorted
  var tail = needsMerge ? sorted.slice(MAX_SLICES - 1) : []
  var merged = head.slice()
  if (tail.length) {
    var other = { label: OTHER_LABEL, minutes: 0, count: 0 }
    tail.forEach(function (g) {
      other.minutes += g.minutes
      other.count += g.count
    })
    merged.push(other)
  }

  var slices = merged.map(function (g, index) {
    return {
      label: g.label,
      minutes: g.minutes,
      count: g.count,
      percent: minutes > 0 ? Math.round((g.minutes / minutes) * 1000) / 10 : 0,
      color: FOCUS_COLORS[index % FOCUS_COLORS.length]
    }
  })

  return { count: count, minutes: minutes, slices: slices }
}

/** 分钟数 → 「3小时25分」/「45分钟」 */
export function formatMinutes(minutes) {
  minutes = Math.round(minutes || 0)
  if (minutes <= 0) return '0分钟'
  var h = Math.floor(minutes / 60)
  var m = minutes % 60
  if (h > 0 && m > 0) return h + '小时' + m + '分'
  if (h > 0) return h + '小时'
  return m + '分钟'
}

/** 秒数 → 「MM:SS」 */
export function formatClock(totalSeconds) {
  totalSeconds = Math.max(0, Math.floor(totalSeconds || 0))
  var m = Math.floor(totalSeconds / 60)
  var s = totalSeconds % 60
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s
}
