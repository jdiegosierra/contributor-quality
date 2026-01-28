/**
 * Tests for spam detection
 */
import { describe, it, expect } from '@jest/globals'
import {
  detectSpamPatterns,
  calculateSpamPenalty
} from '../../src/metrics/spam-detection.js'
import type { PRHistoryData, AccountData } from '../../src/types/metrics.js'

describe('Spam Detection', () => {
  const normalAccount: AccountData = {
    createdAt: new Date('2020-01-01'),
    ageInDays: 365,
    monthsWithActivity: 10,
    totalMonthsInWindow: 12,
    consistencyScore: 0.8
  }

  const newAccount: AccountData = {
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    ageInDays: 5,
    monthsWithActivity: 1,
    totalMonthsInWindow: 1,
    consistencyScore: 1
  }

  describe('detectSpamPatterns', () => {
    it('detects very short PRs pattern', () => {
      const prHistory: PRHistoryData = {
        totalPRs: 10,
        mergedPRs: 2,
        closedWithoutMerge: 8,
        openPRs: 0,
        mergeRate: 0.2,
        averagePRSize: 5,
        veryShortPRs: 8, // 80% short
        mergedPRDates: []
      }

      const patterns = detectSpamPatterns(prHistory, normalAccount)

      expect(patterns).toContainEqual(
        expect.objectContaining({ type: 'short-prs' })
      )
    })

    it('detects burst of closed PRs', () => {
      const prHistory: PRHistoryData = {
        totalPRs: 15,
        mergedPRs: 2,
        closedWithoutMerge: 13,
        openPRs: 0,
        mergeRate: 0.13,
        averagePRSize: 50,
        veryShortPRs: 0,
        mergedPRDates: []
      }

      const patterns = detectSpamPatterns(prHistory, normalAccount)

      expect(patterns).toContainEqual(
        expect.objectContaining({ type: 'burst-closed' })
      )
    })

    it('detects new account with high activity', () => {
      const prHistory: PRHistoryData = {
        totalPRs: 10,
        mergedPRs: 5,
        closedWithoutMerge: 5,
        openPRs: 0,
        mergeRate: 0.5,
        averagePRSize: 100,
        veryShortPRs: 0,
        mergedPRDates: []
      }

      const patterns = detectSpamPatterns(prHistory, newAccount)

      expect(patterns).toContainEqual(
        expect.objectContaining({ type: 'new-account-burst' })
      )
    })

    it('returns empty array for normal activity', () => {
      const prHistory: PRHistoryData = {
        totalPRs: 10,
        mergedPRs: 8,
        closedWithoutMerge: 2,
        openPRs: 0,
        mergeRate: 0.8,
        averagePRSize: 100,
        veryShortPRs: 1,
        mergedPRDates: []
      }

      const patterns = detectSpamPatterns(prHistory, normalAccount)

      expect(patterns).toHaveLength(0)
    })
  })

  describe('calculateSpamPenalty', () => {
    it('calculates total penalty', () => {
      const penalties = [
        { type: 'short-prs' as const, penalty: 50, reason: 'test' },
        { type: 'burst-closed' as const, penalty: 75, reason: 'test' }
      ]

      const total = calculateSpamPenalty(penalties)

      expect(total).toBe(125)
    })

    it('caps penalty at 150', () => {
      const penalties = [
        { type: 'short-prs' as const, penalty: 75, reason: 'test' },
        { type: 'burst-closed' as const, penalty: 75, reason: 'test' },
        { type: 'new-account-burst' as const, penalty: 30, reason: 'test' }
      ]

      const total = calculateSpamPenalty(penalties)

      expect(total).toBe(150)
    })

    it('returns 0 for no penalties', () => {
      const total = calculateSpamPenalty([])

      expect(total).toBe(0)
    })
  })
})
