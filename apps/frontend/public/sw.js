// 未央 · Everlong PWA 离线外壳
const CACHE = 'everlong-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest']
const ASSET = /^\/assets\//
const ICON = /^\/icons\//

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
