/**
 * Tests for PR history metric
 */
import { describe, it, expect } from '@jest/globals'
import {
  extractPRHistoryData,
  calculatePRHistoryMetric
} from '../../src/metrics/pr-history.js'
import {
  qualityContributorResponse,
  spamContributorResponse,
  newUserResponse
} from '../../__fixtures__/api-responses/contributor-data.js'

describe('PR History Metric', () => {
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  describe('extractPRHistoryData', () => {
    it('extracts correct counts from quality contributor', () => {
      const data = extractPRHistoryData(qualityContributorResponse, oneYearAgo)

      expect(data.totalPRs).toBe(4)
      expect(data.mergedPRs).toBe(3)
      expect(data.closedWithoutMerge).toBe(1)
    })

    it('calculates merge rate correctly', () => {
      const data = extractPRHistoryData(qualityContributorResponse, oneYearAgo)

      // 3 merged / (3 merged + 1 closed) = 0.75
      expect(data.mergeRate).toBe(0.75)
    })

    it('handles user with no PRs', () => {
      const data = extractPRHistoryData(newUserResponse, oneYearAgo)

      expect(data.totalPRs).toBe(0)
      expect(data.mergedPRs).toBe(0)
      expect(data.mergeRate).toBe(0)
    })

    it('identifies very short PRs', () => {
      const data = extractPRHistoryData(spamContributorResponse, oneYearAgo)

      // All PRs have 4 lines (3+1), which is < 10
      expect(data.veryShortPRs).toBe(data.totalPRs)
    })
  })

  describe('calculatePRHistoryMetric', () => {
    it('gives high score for good merge rate', () => {
      const data = extractPRHistoryData(qualityContributorResponse, oneYearAgo)
      const result = calculatePRHistoryMetric(data, 0.2)

      // 75% merge rate should give good score
      expect(result.normalizedScore).toBeGreaterThan(60)
    })

    it('gives low score for poor merge rate', () => {
      const data = extractPRHistoryData(spamContributorResponse, oneYearAgo)
      const result = calculatePRHistoryMetric(data, 0.2)

      // Low merge rate should give low score
      expect(result.normalizedScore).toBeLessThan(50)
    })

    it('gives neutral score for no data', () => {
      const data = extractPRHistoryData(newUserResponse, oneYearAgo)
      const result = calculatePRHistoryMetric(data, 0.2)

      expect(result.normalizedScore).toBe(50)
      expect(result.dataPoints).toBe(0)
    })

    it('applies weight correctly', () => {
      const data = extractPRHistoryData(qualityContributorResponse, oneYearAgo)
      const weight = 0.2
      const result = calculatePRHistoryMetric(data, weight)

      expect(result.weight).toBe(weight)
      expect(result.weightedScore).toBe(result.normalizedScore * weight)
    })
  })
})
