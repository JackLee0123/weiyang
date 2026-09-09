// 未央 · Everlong PWA 离线外壳
const CACHE = 'everlong-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest']
const ASSET = /^\/assets\//
const ICON = /^\/icons\//

// ---- Web Push：把收到的通知写入 IndexedDB，供前端“通知中心”读取 ----
function storeNotification(payload) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('everlong-push', 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('notifications')) {
        const store = db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true })
        store.createIndex('ts', 'ts')
      }
    }
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction('notifications', 'readwrite')
      tx.objectStore('notifications').add({
        title: payload.title || '未央 · Everlong',
        body: payload.body || '',
        url: payload.url || '/',
        icon: payload.icon || '/icons/icon-192.png',
        ts: Date.now(),
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    }
    req.onerror = () => reject(req.error)
  })
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // 后端接口每次走网络，保证数据实时；不做缓存。
  if (url.pathname.startsWith('/api/')) return

  const isShell = url.pathname === '/' || SHELL.includes(url.pathname)
  const isAsset = ASSET.test(url.pathname)
  const isIcon = ICON.test(url.pathname)
  // 开发模式下 Vite 的模块（/src、/@fs、/@vite）不拦截，交给浏览器正常加载。
  if (!isShell && !isAsset && !isIcon) return

  if (isShell) {
    // 应用外壳：网络优先，离线时回退缓存，保证打开即有界面。
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then((match) => match || caches.match('/index.html'))),
    )
    return
  }

  // 静态资源与图标：缓存优先，缺失时回源并写入缓存。
  event.respondWith(
    caches.match(request).then(
      (match) =>
        match ||
        fetch(request).then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
          return res
        }),
    ),
  )
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: '未央 · Everlong' }
  }

  const title = payload.title || '未央 · Everlong'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    tag: payload.tag || 'everlong',
    dir: 'auto',
    vibrate: [100, 50, 100],
    renotify: false,
    data: { url: payload.url || '/' },
    actions: payload.actions || [],
  }

  event.waitUntil(
    (async () => {
      try {
        await storeNotification(payload)
      } catch {
        // 存储失败不影响展示通知
      }
      return self.registration.showNotification(title, options)
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  const target = new URL(url, self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('navigate' in client && client.url !== target) client.navigate(target)
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow(target)
    }),
  )
})
