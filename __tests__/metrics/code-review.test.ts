/**
 * Tests for code review contribution metrics
 */
import { describe, it, expect } from '@jest/globals'
import {
  extractCodeReviewData,
  calculateCodeReviewMetric
} from '../../src/metrics/code-review.js'
import type { GraphQLContributorData } from '../../src/types/github.js'
import type { CodeReviewData } from '../../src/types/metrics.js'

describe('Code Review Metric', () => {
  describe('extractCodeReviewData', () => {
    it('extracts review count from contributions collection', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          issues: { totalCount: 0, nodes: [] },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 100, weeks: [] },
            pullRequestReviewContributions: { totalCount: 15 }
          },
          issueComments: { totalCount: 0, nodes: [] }
        }
      }

      const result = extractCodeReviewData(data)

      expect(result.reviewsGiven).toBe(15)
      expect(result.reviewCommentsGiven).toBe(7) // Estimated as floor(15 * 0.5)
    })

    it('handles zero reviews', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          issues: { totalCount: 0, nodes: [] },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 0, weeks: [] },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: { totalCount: 0, nodes: [] }
        }
      }

      const result = extractCodeReviewData(data)

      expect(result.reviewsGiven).toBe(0)
      expect(result.reviewCommentsGiven).toBe(0)
      expect(result.reviewedRepos).toEqual([])
    })
  })

  describe('calculateCodeReviewMetric', () => {
    it('gives neutral score for zero reviews', () => {
      const data: CodeReviewData = {
        reviewsGiven: 0,
        reviewCommentsGiven: 0,
        reviewedRepos: []
      }

      const result = calculateCodeReviewMetric(data, 0.1)

      expect(result.normalizedScore).toBe(50)
      expect(result.details).toContain('No code reviews')
    })

    it('gives slight bonus for 1-4 reviews', () => {
      const data: CodeReviewData = {
        reviewsGiven: 3,
        reviewCommentsGiven: 1,
        reviewedRepos: []
      }

      const result = calculateCodeReviewMetric(data, 0.1)

      expect(result.normalizedScore).toBe(55)
      expect(result.details).toContain('Few reviews')
    })

    it('gives moderate score for 5-9 reviews', () => {
      const data: CodeReviewData = {
        reviewsGiven: 7,
        reviewCommentsGiven: 3,
        reviewedRepos: []
      }

      const result = calculateCodeReviewMetric(data, 0.1)

      expect(result.normalizedScore).toBe(65)
      expect(result.details).toContain('Some reviews')
    })

    it('gives good score for 10-19 reviews', () => {
      const data: CodeReviewData = {
        reviewsGiven: 15,
        reviewCommentsGiven: 7,
        reviewedRepos: []
      }

      const result = calculateCodeReviewMetric(data, 0.1)

      expect(result.normalizedScore).toBe(80)
      expect(result.details).toContain('Active reviewer')
    })

    it('gives excellent score for 20+ reviews', () => {
      const data: CodeReviewData = {
        reviewsGiven: 25,
        reviewCommentsGiven: 12,
        reviewedRepos: []
      }

      const result = calculateCodeReviewMetric(data, 0.1)

      expect(result.normalizedScore).toBe(100)
      expect(result.details).toContain('Excellent reviewer')
    })

    it('applies weight correctly', () => {
      const data: CodeReviewData = {
        reviewsGiven: 25,
        reviewCommentsGiven: 12,
        reviewedRepos: []
      }

      const result = calculateCodeReviewMetric(data, 0.15)

      expect(result.normalizedScore).toBe(100)
      expect(result.weightedScore).toBe(15) // 100 * 0.15
      expect(result.weight).toBe(0.15)
    })

    it('sets dataPoints to review count', () => {
      const data: CodeReviewData = {
        reviewsGiven: 12,
        reviewCommentsGiven: 6,
        reviewedRepos: []
      }

      const result = calculateCodeReviewMetric(data, 0.1)

      expect(result.dataPoints).toBe(12)
    })
  })
})
