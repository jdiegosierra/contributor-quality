/**
 * Tests for score normalizer
 */
import { describe, it, expect } from '@jest/globals'
import {
  normalizeScore,
  clampScore,
  getScoreCategory,
  scoreToPercentage
} from '../../src/scoring/normalizer.js'

describe('Score Normalizer', () => {
  describe('normalizeScore', () => {
    it('converts weighted sum to 0-1000 scale', () => {
      expect(normalizeScore(50)).toBe(500) // Baseline
      expect(normalizeScore(100)).toBe(1000) // Maximum
      expect(normalizeScore(0)).toBe(0) // Minimum
    })

    it('rounds to nearest integer', () => {
      expect(normalizeScore(55.5)).toBe(555)
      expect(normalizeScore(33.3)).toBe(333)
    })
  })

  describe('clampScore', () => {
    it('keeps score within bounds', () => {
      expect(clampScore(500)).toBe(500)
      expect(clampScore(1000)).toBe(1000)
      expect(clampScore(0)).toBe(0)
    })

    it('clamps values above 1000', () => {
      expect(clampScore(1500)).toBe(1000)
    })

    it('clamps values below 0', () => {
      expect(clampScore(-100)).toBe(0)
    })
  })

  describe('getScoreCategory', () => {
    it('returns excellent for high scores', () => {
      expect(getScoreCategory(800)).toBe('excellent')
      expect(getScoreCategory(1000)).toBe('excellent')
    })

    it('returns good for moderate-high scores', () => {
      expect(getScoreCategory(600)).toBe('good')
      expect(getScoreCategory(799)).toBe('good')
    })

    it('returns average for middle scores', () => {
      expect(getScoreCategory(400)).toBe('average')
      expect(getScoreCategory(599)).toBe('average')
    })

    it('returns low for below-average scores', () => {
      expect(getScoreCategory(200)).toBe('low')
      expect(getScoreCategory(399)).toBe('low')
    })

    it('returns poor for very low scores', () => {
      expect(getScoreCategory(0)).toBe('poor')
      expect(getScoreCategory(199)).toBe('poor')
    })
  })

  describe('scoreToPercentage', () => {
    it('converts score to percentage', () => {
      expect(scoreToPercentage(500)).toBe(50)
      expect(scoreToPercentage(1000)).toBe(100)
      expect(scoreToPercentage(0)).toBe(0)
      expect(scoreToPercentage(750)).toBe(75)
    })
  })
})
