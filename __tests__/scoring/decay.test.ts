/**
 * Tests for decay calculations
 */
import { describe, it, expect } from '@jest/globals'
import {
  calculateDecayFactor,
  applyDecayTowardBaseline
} from '../../src/scoring/decay.js'
import { SCORING_CONSTANTS } from '../../src/types/scoring.js'

describe('Decay Calculations', () => {
  describe('calculateDecayFactor', () => {
    it('returns max factor for all recent activity', () => {
      const now = new Date()
      const recentDates = [
        new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 1 month ago
      ]

      const factor = calculateDecayFactor(recentDates)

      expect(factor).toBe(SCORING_CONSTANTS.MAX_DECAY_FACTOR)
    })

    it('returns min factor for all old activity', () => {
      const now = new Date()
      const oldDates = [
        new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000),
        new Date(now.getTime() - 250 * 24 * 60 * 60 * 1000),
        new Date(now.getTime() - 300 * 24 * 60 * 60 * 1000)
      ]

      const factor = calculateDecayFactor(oldDates)

      expect(factor).toBe(SCORING_CONSTANTS.MIN_DECAY_FACTOR)
    })

    it('returns max factor for no activity', () => {
      const factor = calculateDecayFactor([])

      expect(factor).toBe(SCORING_CONSTANTS.MAX_DECAY_FACTOR)
    })

    it('returns intermediate factor for mixed activity', () => {
      const now = new Date()
      const mixedDates = [
        new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // Recent
        new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000) // Old
      ]

      const factor = calculateDecayFactor(mixedDates)

      expect(factor).toBeGreaterThan(SCORING_CONSTANTS.MIN_DECAY_FACTOR)
      expect(factor).toBeLessThan(SCORING_CONSTANTS.MAX_DECAY_FACTOR)
    })
  })

  describe('applyDecayTowardBaseline', () => {
    const baseline = SCORING_CONSTANTS.BASELINE_SCORE

    it('moves high score toward baseline', () => {
      const score = 800
      const decayFactor = 0.8
      const result = applyDecayTowardBaseline(score, decayFactor)

      expect(result).toBeLessThan(score)
      expect(result).toBeGreaterThan(baseline)
    })

    it('moves low score toward baseline', () => {
      const score = 200
      const decayFactor = 0.8
      const result = applyDecayTowardBaseline(score, decayFactor)

      expect(result).toBeGreaterThan(score)
      expect(result).toBeLessThan(baseline)
    })

    it('keeps baseline score unchanged', () => {
      const result = applyDecayTowardBaseline(baseline, 0.8)

      expect(result).toBe(baseline)
    })

    it('does not move score with factor 1.0', () => {
      const score = 800
      const result = applyDecayTowardBaseline(score, 1.0)

      expect(result).toBe(score)
    })
  })
})
