import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraOff, X } from 'lucide-react'

type DecodeFn = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' },
) => { data: string } | null

let jsQrPromise: Promise<DecodeFn> | null = null

/** jsQR 只在没有 BarcodeDetector 的浏览器（iOS 等）才需要，按需加载，不拖累首屏。 */
function loadJsQr(): Promise<DecodeFn> {
  if (!jsQrPromise) {
    jsQrPromise = import('jsqr').then((mod) => mod.default as unknown as DecodeFn)
  }
  return jsQrPromise
}

/** BarcodeDetector 尚未进入 TS 的 DOM 类型，这里按需声明最小子集。 */
interface DetectedBarcode {
  rawValue: string
}

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>
}

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  if (typeof window === 'undefined') return null
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  return typeof ctor === 'function' ? ctor : null
}

/**
 * 手机端扫码：优先用系统自带的 BarcodeDetector（Android Chrome/Edge 很快），
 * 不支持时退回 jsQR 在页面里解码（iOS Safari / 微信内置浏览器等）。
 */
export function QrScanner({ onDetected, onClose }: { onDetected: (raw: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const detectedRef = useRef(false)
  const decodeRef = useRef<DecodeFn | null>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  const stop = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    const stream = streamRef.current
    streamRef.current = null
    stream?.getTracks().forEach((track) => track.stop())
  }, [])

  useEffect(() => {
    let cancelled = false

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('当前浏览器不支持摄像头取景，请改用「手动输入连接码」')
      return stop
    }

    const detectorCtor = getBarcodeDetector()
    const detector = detectorCtor ? new detectorCtor({ formats: ['qr_code'] }) : null
    if (!detector) {
      void loadJsQr()
        .then((fn) => {
          if (!cancelled) decodeRef.current = fn
        })
        .catch(() => undefined)
    }

    const tick = () => {
      if (cancelled) return
      frameRef.current = window.requestAnimationFrame(tick)
      const video = videoRef.current
      if (!video || video.readyState < 2 || detectedRef.current) return

      if (detector) {
        detector
          .detect(video)
          .then((codes) => {
            const raw = codes[0]?.rawValue
            if (raw && !detectedRef.current) {
              detectedRef.current = true
              onDetected(raw)
            }
          })
          .catch(() => undefined)
        return
      }

      const canvas = canvasRef.current
      const decode = decodeRef.current
      if (!canvas || !decode) return
      const size = Math.min(video.videoWidth, video.videoHeight)
      if (!size) return
      // 只取画面中间的正方形区域，缩到 480px 足够解出短码，还能省电。
      const side = Math.min(480, size)
      canvas.width = side
      canvas.height = side
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      ctx.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, side, side)
      const image = ctx.getImageData(0, 0, side, side)
      const found = decode(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })
      if (found?.data && !detectedRef.current) {
        detectedRef.current = true
        onDetected(found.data)
      }
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          void video.play().catch(() => undefined)
        }
        setReady(true)
        frameRef.current = window.requestAnimationFrame(tick)
      })
      .catch((err: unknown) => {
        const name = (err as { name?: string })?.name
        setError(
          name === 'NotAllowedError'
            ? '没有拿到摄像头权限。允许后重试，或改用「手动输入连接码」'
            : '无法打开摄像头，请改用「手动输入连接码」',
        )
      })

    return () => {
      cancelled = true
      stop()
    }
  }, [onDetected, stop])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-slate-950/90 p-4">
      <div className="relative w-full max-w-sm">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-700 bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
          <canvas ref={canvasRef} className="hidden" />
          {ready && !error && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-3/5 w-3/5 rounded-lg border-2 border-teal-300/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]" />
            </div>
          )}
        </div>

        <p className="mt-3 text-center text-sm text-slate-300">
          对准手环上的二维码，识别成功后会自动连接
        </p>
        {error && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-sm text-amber-300">
            <CameraOff size={15} />
            {error}
          </p>
        )}

        <button type="button" className="btn-ghost mt-4 w-full justify-center" onClick={onClose}>
          <X size={16} />
          取消
        </button>
      </div>
    </div>
  )
}

export default QrScanner
