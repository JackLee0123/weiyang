/**
 * 打包时注入的离线数据（课表 + 学期设置）。
 *
 * 数据由 `npm run sync` 从服务端拉取后写进 src/common/data/sync.js，
 * 手环上只读这份快照，运行期不再联网。
 */
import data from '../data/sync.js'

/** 手环的 JS 引擎对字符串日期解析支持不稳，这里手动解析 'YYYY-MM-DDTHH:MM'。 */
function formatSyncedAt(raw) {
  var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(raw || ''))
  if (!m) return ''
  return Number(m[2]) + '月' + Number(m[3]) + '日 ' + m[4] + ':' + m[5]
}

export function getSync() {
  return data || {}
}

/** 课表数据：{ courses: [], settings: {} } */
export function getTimetable() {
  var timetable = (data && data.timetable) || {}
  return {
    courses: timetable.courses || [],
    settings: timetable.settings || {}
  }
}

/** 「9月28日 23:40」；没同步过返回空串。 */
export function syncedLabel() {
  return formatSyncedAt(data && data.synced_at)
}

export function accountLabel() {
  return (data && data.account) || ''
}

/** 有课表或有开学日期，就算同步过了。 */
export function hasSync() {
  var timetable = getTimetable()
  return timetable.courses.length > 0 || !!timetable.settings.week1_date
}
