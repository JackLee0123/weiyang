/**
 * 本地配置存取（离线版）。
 *
 * 小米手环 10 的快应用拿不到联网能力（官方支持表里 system.fetch / system.network
 * 都是「不支持」），所以「连接账户 + 令牌」那一套整体去掉了，这里只剩两件事：
 *   1. 主题偏好（亮色 / 暗色）
 *   2. 给 records.js 用的底层存储读写
 */
import storage from '@system.storage'

var config = { theme: 'dark' }
var readyPromise = null

/** 不同引擎回调里的值形态可能不一样，这里统一成字符串。 */
function normalize(data) {
  if (data === null || data === undefined) return ''
  if (typeof data === 'string') return data
  if (typeof data === 'object' && typeof data.value === 'string') return data.value
  if (typeof data === 'number' || typeof data === 'boolean') return String(data)
  return ''
}

/** 读一个键；不存在或读取失败都返回空串。 */
export function sget(key) {
  return new Promise(function (resolve) {
    storage.get({
      key: key,
      success: function (data) { resolve(normalize(data)) },
      fail: function () { resolve('') }
    })
  })
}

/** 写一个键；无论成功失败都 resolve，调用方不需要区分。 */
export function sset(key, value) {
  return new Promise(function (resolve) {
    storage.set({ key: key, value: value, success: resolve, fail: resolve })
  })
}

export function init(app) {
  if (readyPromise) return readyPromise
  readyPromise = load().then(function (cfg) {
    app.$def.config = cfg
    console.info('[everlong] config loaded, theme=' + cfg.theme)
    return cfg
  })
  return readyPromise
}

function load() {
  return sget('theme').then(function (theme) {
    config.theme = theme === 'light' ? 'light' : 'dark'
    return config
  })
}

/**
 * 页面每次进入都要重新读一遍本地存储。
 * 快应用的页面是各自独立的 JS 上下文，只读一次容易拿到过期值。
 */
export function ready() {
  return load()
}

export function getConfig() {
  return config
}

/** 是否处于亮色主题（默认暗色）。 */
export function isLight() {
  return config.theme === 'light'
}

export function save(patch) {
  var jobs = Object.keys(patch).map(function (k) {
    config[k] = patch[k]
    var v = patch[k]
    return sset(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v))
  })
  return Promise.all(jobs)
}
