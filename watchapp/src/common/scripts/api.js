/**
 * 与未央 Everlong 后端（FastAPI）通信的封装。
 * 对应 Web 端 apps/frontend/src/lib/api.ts 中的部分接口：
 *   GET  /api/records?start=&end=     当日专注数据来源
 *   POST /api/records                 手环专注计时结束后写记录
 *   GET  /api/timetable/courses       课表 + 学期设置
 *   GET  /api/plans?start=&end=       取计划标题用于专注分布标签
 *   GET  /api/auth/me                 校验令牌
 */
import fetch from '@system.fetch'
import { getConfig } from './store.js'

function request(path, options) {
  options = options || {}
  var cfg = getConfig()
  var params = {
    url: cfg.baseUrl + '/api' + path,
    method: options.method || 'GET',
    header: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + cfg.token
    },
    responseType: 'json',
    success: function (resp) {
      if (resp.code >= 200 && resp.code < 300) {
        resolveRef(resp.data)
      } else {
        rejectRef(new Error('请求失败 (HTTP ' + resp.code + ')'))
      }
    },
    fail: function (data, code) {
      rejectRef(new Error('网络错误 (' + code + ')'))
    }
  }
  if (options.body) {
    params.data = JSON.stringify(options.body)
  }
  var resolveRef
  var rejectRef
  var promise = new Promise(function (resolve, reject) {
    resolveRef = resolve
    rejectRef = reject
  })
  fetch.fetch(params)
  return promise
}

export function fetchRecords(start, end) {
  return request('/records?start=' + start + '&end=' + end)
}

export function createRecord(payload) {
  return request('/records', { method: 'POST', body: payload })
}

export function fetchCourses() {
  return request('/timetable/courses')
}

export function fetchPlans(start, end) {
  return request('/plans?start=' + start + '&end=' + end)
}

export function fetchMe() {
  return request('/auth/me')
}

/**
 * 凭 6 位配对码换取访问令牌（网页端「设备连接」生成）。
 * 配对码一次性、5 分钟有效；成功后后端签发新的访问令牌。
 */
export function pairDevice(code) {
  return request('/devices/pair', { method: 'POST', body: { code: code } })
}
