/**
 * 本地配置存取：服务器地址 / 访问令牌 / 账号名 / 演示模式。
 * 配置同时缓存在内存 config 中，页面通过 getConfig() 同步读取。
 */
import storage from '@system.storage'

// 默认后端地址（与 Web 端 https://everlong.net.cn 同源，API 在 /api 下）。
// 本地开发时可覆盖：设置页修改服务器地址即可。
export var DEFAULT_BASE_URL = 'https://everlong.net.cn'

var config = { baseUrl: '', token: '', accountName: '', demo: false }
var readyPromise = null

function sget(key) {
  return new Promise(function (resolve) {
    storage.get({
      key: key,
      success: function (data) { resolve(typeof data === 'string' ? data : '') },
      fail: function () { resolve('') }
    })
  })
}

export function init(app) {
  if (readyPromise) return readyPromise
  readyPromise = Promise.all([sget('baseUrl'), sget('token'), sget('demo'), sget('accountName')]).then(function (r) {
    config.baseUrl = (r[0] || DEFAULT_BASE_URL).replace(/\/+$/, '')
    config.token = r[1] || ''
    config.demo = r[2] === '1'
    config.accountName = r[3] || ''
    app.$def.config = config
    console.info('[everlong] config loaded, demo=' + config.demo)
    return config
  })
  return readyPromise
}

export function ready() {
  return readyPromise || Promise.resolve(config)
}

export function getConfig() {
  return config
}

/**
 * 取当前服务器地址：没配置过时用默认地址，保证「开箱即用」。
 * 页面和请求都走这个函数，避免存储读取失败时整个应用不可用。
 */
export function getBaseUrl() {
  return (config.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

export function save(patch) {
  Object.keys(patch).forEach(function (k) {
    config[k] = patch[k]
  })
  config.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
  var jobs = Object.keys(patch).map(function (k) {
    var v = patch[k]
    var s = typeof v === 'boolean' ? (v ? '1' : '0') : String(v)
    return new Promise(function (resolve) {
      storage.set({ key: k, value: s, success: resolve, fail: resolve })
    })
  })
  return Promise.all(jobs)
}
