import { describe, expect, it } from 'vitest'
import { CHANGELOG, CURRENT_VERSION } from './changelog'

describe('changelog data', () => {
  it('places the current version first', () => {
    expect(CHANGELOG[0]?.version).toBe(CURRENT_VERSION)
  })

  it('keeps versions ordered newest first', () => {
    const versions = CHANGELOG.map((entry) => entry.version)
    const sorted = [...versions].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    expect(versions).toEqual(sorted)
  })

  it('gives every release at least one item', () => {
    for (const entry of CHANGELOG) {
      expect(entry.items.length).toBeGreaterThan(0)
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})
