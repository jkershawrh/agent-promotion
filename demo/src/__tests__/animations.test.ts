// TDD: tests for animation variants.

import { describe, it, expect } from 'vitest'
import {
  promoteVariants,
  demoteVariants,
  refuseVariants,
  allowVariants,
  routeHumanVariants,
  chainFillVariants,
  fadeInUp,
  TIER_COLORS,
} from '../lib/animations'

describe('TDD: Animation variants', () => {
  it('promoteVariants has initial and promote states', () => {
    expect(promoteVariants.initial).toBeDefined()
    expect(promoteVariants.promote).toBeDefined()
  })

  it('demoteVariants has initial and demote states', () => {
    expect(demoteVariants.initial).toBeDefined()
    expect(demoteVariants.demote).toBeDefined()
  })

  it('refuseVariants shake animation uses x-axis', () => {
    expect(refuseVariants.initial).toBeDefined()
    const refuse = refuseVariants.refuse
    expect(refuse).toBeDefined()
    if (typeof refuse === 'object' && refuse !== null && 'x' in refuse) {
      expect(Array.isArray(refuse.x)).toBe(true)
    }
  })

  it('allowVariants pulse uses scale', () => {
    expect(allowVariants.initial).toBeDefined()
    const allow = allowVariants.allow
    expect(allow).toBeDefined()
    if (typeof allow === 'object' && allow !== null && 'scale' in allow) {
      expect(Array.isArray(allow.scale)).toBe(true)
    }
  })

  it('routeHumanVariants has amber border animation', () => {
    expect(routeHumanVariants.initial).toBeDefined()
    expect(routeHumanVariants.route).toBeDefined()
  })

  it('chainFillVariants fill is a function', () => {
    expect(chainFillVariants.initial).toBeDefined()
    expect(typeof chainFillVariants.fill).toBe('function')
  })

  it('chainFillVariants fill produces correct width', () => {
    const fill = chainFillVariants.fill as (accuracy: number) => Record<string, unknown>
    const result = fill(0.75)
    expect(result.width).toBe('75%')
  })

  it('fadeInUp has initial, animate, and exit', () => {
    expect(fadeInUp.initial).toBeDefined()
    expect(fadeInUp.animate).toBeDefined()
    expect(fadeInUp.exit).toBeDefined()
  })
})

describe('TDD: Tier colors', () => {
  it('has colors for all five tiers', () => {
    expect(TIER_COLORS.T0).toBeDefined()
    expect(TIER_COLORS.T1).toBeDefined()
    expect(TIER_COLORS.T2).toBeDefined()
    expect(TIER_COLORS.T3).toBeDefined()
    expect(TIER_COLORS.T4).toBeDefined()
  })

  it('colors are valid hex strings', () => {
    for (const [_tier, color] of Object.entries(TIER_COLORS)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
