import { describe, expect, it } from 'vitest'
import { FOCUS_PRESETS, clampMinutes, formatClock, greatCirclePoints, haversineKm, routeFor } from './flight'

describe('flight helpers', () => {
  it('exposes preset focus durations', () => {
    expect(FOCUS_PRESETS).toEqual([15, 25, 45, 60])
  })

  it('clamps minutes into 5..360', () => {
    expect(clampMinutes(0)).toBe(5)
    expect(clampMinutes(-5)).toBe(5)
    expect(clampMinutes(500)).toBe(360)
    expect(clampMinutes(45)).toBe(45)
    expect(clampMinutes(Number.NaN)).toBe(0)
  })

  it('formats elapsed time as mm:ss', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(65_000)).toBe('01:05')
    expect(formatClock(-1000)).toBe('00:00')
  })

  it('maps each 5-minute bucket to a distinct real flight', () => {
    expect(routeFor(5).code).toBe('SHA-NGB')
    expect(routeFor(15).code).toBe('SZX-CAN')
    expect(routeFor(25).code).toBe('CTU-CKG')
    expect(routeFor(15).code).not.toBe(routeFor(20).code)
    expect(routeFor(20).code).not.toBe(routeFor(25).code)
  })

  it('caps the focus duration at 360 minutes', () => {
    expect(routeFor(400).minutes).toBe(360)
    expect(routeFor(400).code).toBe('CAN-DPS')
    expect(clampMinutes(360)).toBe(360)
  })

  it('computes a real great-circle distance and path', () => {
    const route = routeFor(45)
    expect(haversineKm(route.from, route.to)).toBeGreaterThan(90)

    const points = greatCirclePoints(route.from, route.to, 4)
    expect(points).toHaveLength(5)
    expect(points[0][0]).toBeCloseTo(route.from.lon, 1)
    expect(points[0][1]).toBeCloseTo(route.from.lat, 1)
    expect(points[4][0]).toBeCloseTo(route.to.lon, 1)
    expect(points[4][1]).toBeCloseTo(route.to.lat, 1)
    expect(points[2][0]).not.toBeCloseTo(route.from.lon, 1)
  })
})
