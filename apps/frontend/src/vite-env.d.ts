/// <reference types="vite/client" />

// Chrome / Edge 的“安装应用”事件（尚未成为标准 DOM 接口）
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}
