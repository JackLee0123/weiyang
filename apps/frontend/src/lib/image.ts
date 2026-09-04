export const MAX_IMAGES = 3
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
export const MAX_CLIENT_DIMENSION = 1600

/** 把本地图片文件压缩成 base64 data URI（控制请求体，服务端会再压一次）。 */
export function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_CLIENT_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight))
        const width = Math.max(1, Math.round(img.naturalWidth * scale))
        const height = Math.max(1, Math.round(img.naturalHeight * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('浏览器不支持图片处理')
        ctx.drawImage(img, 0, 0, width, height)
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        resolve(canvas.toDataURL(mime, 0.82))
      } catch (err) {
        reject(err instanceof Error ? err : new Error('图片处理失败'))
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}
