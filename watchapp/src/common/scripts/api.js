/**
 * 与未央 Everlong 后端（FastAPI）通信的封装。
 * 对应 Web 端 apps/frontend/src/lib/api.ts 中的部分接口：
 *   GET  /api/records?start=&end=     当日专注数据来源
 *   POST /api/records                 手环专注计时结束后写记录
 *   GET  /api/timetable/courses       课表 + 学期设置
 *   GET  /api/plans?start=&end=       取计划标题用于专注分布标签
 *   GET  /api/auth/me                 校验令牌
 *   POST /api/devices/handshake       连接账户：生成一次性短码（未登录可用）
 *   POST /api/devices/handshake/:code/poll  连接账户：轮询领取访问令牌
 */
import fetch from '@system.fetch'
import { getBaseUrl, getConfig } from './store.js'

function request(path, options) {
  options = options || {}
  var cfg = getConfig()
  var header = { 'Content-Type': 'application/json' }
  // 连接账户时手环还没有令牌，这两个接口也不需要鉴权。
  if (cfg.token) {
    header.Authorization = 'Bearer ' + cfg.token
  }
  var params = {
    url: getBaseUrl() + '/api' + path,
    method: options.method || 'GET',
    header: header,
    responseType: 'json',
    success: function (resp) {
      if (resp.code >= 200 && resp.code < 300) {
        resolveRef(resp.data)
      } else {
        var detail = ''
        if (resp.data && resp.data.detail) {
          detail = resp.data.detail
        }
        rejectRef(new Error(detail || '请求失败 (HTTP ' + resp.code + ')'))
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
 * 连接账户第 1 步：手环端发起握手，拿到一次性短码与轮询凭据。
 * 短码显示成二维码给手机扫，poll_token 只留在手环本地。
 */
export function startHandshake(deviceLabel) {
  return request('/devices/handshake', { method: 'POST', body: { device_label: deviceLabel || '' } })
}

/**
 * 连接账户第 2 步：轮询握手结果。手机端确认后，这里会一次性拿到访问令牌。
 * 返回 status：pending / approved / claimed / expired / invalid。
 */
export function pollHandshake(code, pollToken) {
  return request('/devices/handshake/' + code + '/poll', {
    method: 'POST',
    body: { poll_token: pollToken }
  })
}
