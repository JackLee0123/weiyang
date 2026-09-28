/**
 * 本机专注记录（离线版）。
 *
 * 手环没有联网能力，计时结束后只能记在手环本地：记录不会上传，也不会和
 * 网页端 / 手机端的数据合并，两边各记各的。
 * 存储结构：[{ date: 'YYYY-MM-DD', title: 'a', duration_minutes: 25, linked_plan_id: null }]
 */
import { sget, sset } from './store.js'

var KEY = 'focusRecords'
/** 手环存储很小，只保留最近这么多条。 */
var MAX_KEEP = 80

function parse(raw) {
  if (!raw) return []
  try {
    var list = JSON.parse(raw)
    if (!list || typeof list.length !== 'number') return []
    return list
  } catch (e) {
    return []
  }
}

/** 读出全部本机记录（旧的在前）。 */
export function loadRecords() {
  return sget(KEY).then(parse)
}

/** 追加一条记录，自动裁剪到 MAX_KEEP 条。 */
export function appendRecord(record) {
  return loadRecords().then(function (list) {
    list = list.concat([record])
    if (list.length > MAX_KEEP) list = list.slice(list.length - MAX_KEEP)
    return sset(KEY, JSON.stringify(list)).then(function () {
      return list
    })
  })
}
