import { api } from './api'
import type { PushNotification } from './types'

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export interface PushUiState {
  permission: PushPermission
  serverSupported: boolean
  enabled: boolean
  denied: boolean
  unsupported: boolean
  iosRequiresInstall: boolean
  standalone: boolean
  subscriptions: number
}

const PROMPTED_KEY = 'planner-push-prompted'
const IOS_PROMPTED_KEY = 'planner-ios-prompt-dismissed'
const DB_NAME = 'everlong-push'
const STORE = 'notifications'

type Nav = Navigator & { standalone?: boolean }
type Reg = ServiceWorkerRegistration & { pushManager: PushManager }

export function isIos(): boolean {
  const ua = navigator.userAgent
  const isIPadOS = navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua)
  return /iphone|ipad|ipod/i.test(ua) || isIPadOS
}

export function isStandalone(): boolean {
  const nav = navigator as Nav
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

/** iOS 只有在添加到主屏幕成为 PWA 后，Safari 才会真正开放 Web Push。 */
export function iosRequiresInstall(): boolean {
  return isIos() && !isStandalone()
}

export function getPermission(): PushPermission {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported'
  return Notification.permission
}

function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    window.isSecureContext
  )
}

export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

async function registration(): Promise<Reg | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    await navigator.serviceWorker.register('/sw.js')
    const reg = await navigator.serviceWorker.ready
    return reg as Reg
  } catch {
    return null
  }
}

async function applicationServerKey(): Promise<Uint8Array | null> {
  try {
    const config = await api.pushConfig()
    if (!config.server_supported || !config.public_key) return null
    return urlBase64ToUint8Array(config.public_key)
  } catch {
    return null
  }
}

async function saveSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON()
  if (!json.endpoint || !json.keys) throw new Error('订阅信息不完整')
  await api.subscribePush({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh ?? '', auth: json.keys.auth ?? '' },
    user_agent: navigator.userAgent,
  })
}

export async function enableNotifications(): Promise<'granted'> {
  if (!isPushSupported()) throw new Error('当前浏览器/设备不支持 Web Push')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('用户已拒绝通知权限')
  const key = await applicationServerKey()
  if (!key) throw new Error('推送服务未配置')
  const reg = await registration()
  if (!reg) throw new Error('Service Worker 注册失败')

  let subscription = await reg.pushManager.getSubscription()
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    })
  }
  await saveSubscription(subscription)
  return 'granted'
}

export async function disableNotifications(): Promise<void> {
  const reg = await registration()
  if (!reg) return
  const subscription = await reg.pushManager.getSubscription()
  if (subscription) {
    const endpoint = subscription.toJSON().endpoint
    if (endpoint) await api.unsubscribePush({ endpoint }).catch(() => undefined)
    await subscription.unsubscribe()
  }
}

export async function fetchPushStatus(): Promise<PushUiState> {
  const permission = getPermission()
  const standalone = isStandalone()
  const iosReq = iosRequiresInstall()
  const pushAvailable =
    window.isSecureContext &&
    'PushManager' in window &&
    'Notification' in window &&
    'serviceWorker' in navigator
  const serverSupported = pushAvailable
  let subscriptions = 0
  let serverEnabled = false
  try {
    const status = await api.pushStatus()
    subscriptions = status.subscriptions
    serverEnabled = status.subscriptions > 0
  } catch {
    // 未登录或接口异常时按未开启处理
  }
  return {
    permission,
    serverSupported,
    enabled: permission === 'granted' && serverEnabled,
    denied: permission === 'denied',
    unsupported: !pushAvailable && !iosReq,
    iosRequiresInstall: iosReq,
    standalone,
    subscriptions,
  }
}

export function wasPrompted(): boolean {
  return localStorage.getItem(PROMPTED_KEY) === '1'
}

export function markPrompted(): void {
  localStorage.setItem(PROMPTED_KEY, '1')
}

export function wasIosPrompted(): boolean {
  return localStorage.getItem(IOS_PROMPTED_KEY) === '1'
}

export function markIosPrompted(): void {
  localStorage.setItem(IOS_PROMPTED_KEY, '1')
}

export function shouldShowEnablePrompt(status: PushUiState): boolean {
  if (wasPrompted()) return false
  if (status.unsupported || status.denied || status.enabled || status.iosRequiresInstall) return false
  return status.serverSupported && status.permission === 'default'
}

export function shouldShowIosPrompt(status: PushUiState): boolean {
  if (wasIosPrompted()) return false
  return status.iosRequiresInstall
}

// ---- 通知中心：从 Service Worker 写入的 IndexedDB 读取 ----
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
        store.createIndex('ts', 'ts')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getStoredNotifications(): Promise<PushNotification[]> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).getAll()
      req.onsuccess = () => {
        const rows = (req.result || []) as PushNotification[]
        resolve(rows.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0)))
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function clearStoredNotifications(): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const req = tx.objectStore(STORE).clear()
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    // sw 尚未写入时无事发生
  }
}
