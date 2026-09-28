#!/usr/bin/env node
/**
 * 离线手环的数据同步脚本：从 Everlong 服务端拉课表，写进快应用源码。
 *
 *   npm run sync                                  # 用缓存令牌，或现场配对
 *   EVERLONG_TOKEN=xxx npm run sync               # 直接用现成令牌
 *   EVERLONG_BASE_URL=http://127.0.0.1:8000 npm run sync
 *
 * 令牌缓存在 watchapp/.sync-token.json（已 gitignore，默认 30 天有效）。
 * 首次运行会打印一个 6 位连接码：在网页端「设备连接 → 手动输入」里确认即可，
 * 跟以前手环扫码是同一条链路，只是这次由电脑上的脚本扮演设备。
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(here, '..')
const tokenFile = path.join(rootDir, '.sync-token.json')
const dataFile = path.join(rootDir, 'src/common/data/sync.js')
const baseUrl = (process.env.EVERLONG_BASE_URL || 'https://everlong.net.cn').replace(/\/+$/, '')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function request(pathname, options = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (options.token) headers.Authorization = 'Bearer ' + options.token
  const response = await fetch(baseUrl + pathname, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  const text = await response.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch (e) {
    payload = text
  }
  if (!response.ok) {
    const detail = payload && payload.detail
    const message = typeof detail === 'string' ? detail : (detail ? JSON.stringify(detail) : `HTTP ${response.status}`)
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  return payload
}

function readCachedToken() {
  try {
    return JSON.parse(fs.readFileSync(tokenFile, 'utf8')).token || ''
  } catch (e) {
    return ''
  }
}

function writeCachedToken(token, name) {
  fs.writeFileSync(tokenFile, JSON.stringify({ token, name, saved_at: new Date().toISOString() }, null, 2) + '\n')
}

/** 用系统默认浏览器打开确认链接；打不开也不影响流程，链接已经打印出来了。 */
function openInBrowser(url) {
  const [command, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]]
  try {
    const child = spawn(command, args, { stdio: 'ignore', detached: true, windowsHide: true })
    child.on('error', () => {})
    child.unref()
  } catch (error) {
    // 打不开浏览器就算了，链接已经在终端里
  }
}

async function ensureToken() {
  const fromEnv = (process.env.EVERLONG_TOKEN || '').trim()
  if (fromEnv) return fromEnv

  const cached = readCachedToken()
  if (cached) {
    try {
      await request('/api/auth/me', { token: cached })
      return cached
    } catch (error) {
      if (error.status !== 401) throw error
      console.log('缓存令牌已失效，重新配对…')
    }
  }

  const handshake = await request('/api/devices/handshake', {
    method: 'POST',
    body: { device_label: '课表同步脚本' }
  })

  const approveUrl = `${baseUrl}/?code=${handshake.code}`
  console.log('\n  浏览器里点一下「连接」就行（已自动打开，没打开就手动访问这个链接）：')
  console.log(`  ${approveUrl}`)
  console.log(`  也可以手动：网页端「设备连接」→ 输入连接码 ${handshake.code}\n`)
  openInBrowser(approveUrl)

  const deadline = Date.now() + (handshake.expires_in || 300) * 1000
  while (Date.now() < deadline) {
    await sleep(3000)
    const result = await request(`/api/devices/handshake/${handshake.code}/poll`, {
      method: 'POST',
      body: { poll_token: handshake.poll_token }
    })
    if (result.status === 'approved' && result.token) {
      writeCachedToken(result.token, result.name || '')
      console.log(`配对成功：${result.name || '已连接'}`)
      return result.token
    }
    if (result.status === 'expired' || result.status === 'invalid') {
      throw new Error('连接码已失效，请重新运行')
    }
  }
  throw new Error('等待手机确认超时，请重新运行')
}

function nowLabel() {
  const d = new Date()
  const pad = (n) => (n < 10 ? '0' + n : '' + n)
  return (
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) +
    '+08:00'
  )
}

async function main() {
  const token = await ensureToken()
  const me = await request('/api/auth/me', { token })
  const timetable = await request('/api/timetable/courses', { token })

  const courses = (timetable && timetable.courses) || []
  const settings = (timetable && timetable.settings) || {}
  const payload = {
    synced_at: nowLabel(),
    account: (me && (me.name || me.email)) || '',
    timetable: { settings, courses }
  }

  const banner =
    '/**\n' +
    ' * 本文件由 `npm run sync` 生成，请勿手改。\n' +
    ' *\n' +
    ' * 小米手环 10 的快应用不支持联网（官方支持表：system.fetch / system.request /\n' +
    ' * system.network 一律「不支持」），所以课表和学期设置在打包前拉取一次，\n' +
    ' * 作为静态数据随安装包带进手环。\n' +
    ' */\n'
  fs.writeFileSync(dataFile, banner + 'export default ' + JSON.stringify(payload, null, 2) + '\n')

  console.log('已写入 ' + path.relative(process.cwd(), dataFile))
  console.log(`同步时间：${payload.synced_at}    账号：${payload.account}`)
  console.log(
    `课程 ${courses.length} 门    学期：${settings.active_term || '未设置'}    ` +
    `开学第一周：${settings.week1_date || '未设置'}`
  )
  console.log('接着：npm run build，然后用 AstroBox 把 dist 里的 rpk 推到手环')
}

main().catch((error) => {
  console.error('同步失败：' + error.message)
  process.exit(1)
})
