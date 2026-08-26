import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FlightMap } from './FlightMap'
import { routeFor } from '../lib/flight'

describe('FlightMap', () => {
  it('draws the real route airports and the flight map', () => {
    const route = routeFor(45)
    render(<FlightMap route={route} progress={40} />)
    expect(screen.getByText(route.from.code)).toBeInTheDocument()
    expect(screen.getByText(route.to.code)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: `${route.from.code} 到 ${route.to.code} 的航班地图` })).toBeInTheDocument()
  })
})
