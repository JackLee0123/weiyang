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
      // 不同引擎回调里的值形态可能不一样，这里统一成字符串。
      success: function (data) {
        if (data === null || data === undefined) return resolve('')
        if (typeof data === 'string') return resolve(data)
        if (typeof data === 'object' && typeof data.value === 'string') return resolve(data.value)
        if (typeof data === 'number' || typeof data === 'boolean') return resolve(String(data))
        resolve('')
      },
      fail: function () { resolve('') }
    })
  })
}

export function init(app) {
  if (readyPromise) return readyPromise
  readyPromise = load().then(function (cfg) {
    app.$def.config = cfg
    console.info('[everlong] config loaded, demo=' + cfg.demo)
    return cfg
  })
  return readyPromise
}

function load() {
  return Promise.all([sget('baseUrl'), sget('token'), sget('demo'), sget('accountName')]).then(function (r) {
    config.baseUrl = (r[0] || DEFAULT_BASE_URL).replace(/\/+$/, '')
    config.token = r[1] || ''
    config.demo = r[2] === '1'
    config.accountName = r[3] || ''
    return config
  })
}

/**
 * 页面每次进入都要重新读一遍本地存储。
 *
 * 快应用的页面是各自独立的 JS 上下文：连接账户是在「连接」页写的存储，
 * 课表页如果只读一次（首次进入时还没连接）就会一直拿着空的令牌，
 * 表现为「手机上明明提示已连接，手环却让我先连接账户」。
 */
export function ready() {
  return load()
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
