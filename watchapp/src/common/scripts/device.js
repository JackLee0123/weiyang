/**
 * 设备信息：屏幕形状与尺寸。
 *
 * 手环（胶囊屏）和手环 Pro（矩形屏）的可用宽度差很多，光靠样式里的媒体查询
 * 没法减少元素数量，所以页面上还需要一个「是不是胶囊屏」的开关来决定要不要
 * 省略次要信息（比如顶栏的「今天」角标、单独的周次列）。
 */
import device from '@system.device'

var info = { shape: 'rect', width: 0, height: 0, capsule: false, loaded: false }
var readyPromise = null

export function initDeviceInfo() {
  if (readyPromise) return readyPromise
  readyPromise = new Promise(function (resolve) {
    try {
      device.getInfo({
        success: function (data) {
          data = data || {}
          info.shape = data.screenShape || 'rect'
          info.width = data.screenWidth || 0
          info.height = data.screenHeight || 0
          info.capsule = info.shape === 'pill-shaped'
          info.loaded = true
          console.info('[everlong] device ' + info.shape + ' ' + info.width + 'x' + info.height)
          resolve(info)
        },
        fail: function () {
          resolve(info)
        }
      })
    } catch (e) {
      // 设备接口不可用时按矩形屏处理，不影响主流程。
      resolve(info)
    }
  })
  return readyPromise
}

export function getDeviceInfo() {
  return info
}

/** 胶囊屏（小米手环 10）：屏幕极窄，顶栏要精简。 */
export function isCapsule() {
  return info.capsule
}
