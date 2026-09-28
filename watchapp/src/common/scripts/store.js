/**
 * 本地配置存取：服务器地址 / 访问令牌 / 演示模式。
 * 配置同时缓存在内存 config 中，页面通过 getConfig() 同步读取。
 */
import storage from '@system.storage'

var config = { baseUrl: '', token: '', demo: false }
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
  readyPromise = Promise.all([sget('baseUrl'), sget('token'), sget('demo')]).then(function (r) {
    config.baseUrl = (r[0] || '').replace(/\/+$/, '')
    config.token = r[1] || ''
    config.demo = r[2] === '1'
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

export function save(patch) {
  Object.keys(patch).forEach(function (k) {
    config[k] = patch[k]
  })
  config.baseUrl = (config.baseUrl || '').replace(/\/+$/, '')
  var jobs = Object.keys(patch).map(function (k) {
    var v = patch[k]
    var s = typeof v === 'boolean' ? (v ? '1' : '0') : String(v)
    return new Promise(function (resolve) {
      storage.set({ key: k, value: s, success: resolve, fail: resolve })
    })
  })
  return Promise.all(jobs)
}
