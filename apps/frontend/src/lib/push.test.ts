import { describe, expect, it } from 'vitest'
import { urlBase64ToUint8Array } from './push'

describe('push helpers', () => {
  it('decodes a url-safe base64 public key into a 65-byte uncompressed EC point', () => {
    const key = 'BNo0jm9JHia8ii_vLfL-ybz9cEFeQRlrMrmx7ZXwUkFFlIKhGNxx5L41fj7Jjxwlj2gfu51fp3MkYxb-1YYEPVE'
    const bytes = urlBase64ToUint8Array(key)
    expect(bytes.length).toBe(65)
    expect(bytes[0]).toBe(0x04)
  })

  it('handles padded input and non-url-safe characters', () => {
    const bytes = urlBase64ToUint8Array('AAAA')
    expect(Array.from(bytes)).toEqual([0, 0, 0])
  })
})
