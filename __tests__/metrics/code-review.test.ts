/**
 * Tests for code review metric
 */
import { describe, it, expect } from '@jest/globals'
import {
  extractCodeReviewData,
  checkCodeReviews
} from '../../src/metrics/code-review.js'
import type { GraphQLContributorData } from '../../src/types/github.js'
import type { CodeReviewData } from '../../src/types/metrics.js'

describe('Code Review Metric', () => {
  describe('extractCodeReviewData', () => {
    it('extracts review count correctly', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          issues: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 0, weeks: [] },
            pullRequestReviewContributions: { totalCount: 15 }
          },
          issueComments: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      }

      const result = extractCodeReviewData(data)

      expect(result.reviewsGiven).toBe(15)
    })

    it('handles no reviews', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          issues: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 0, weeks: [] },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      }

      const result = extractCodeReviewData(data)

      expect(result.reviewsGiven).toBe(0)
    })
  })

  describe('checkCodeReviews', () => {
    it('passes when reviews meet threshold', () => {
      const data: CodeReviewData = {
        reviewsGiven: 10,
        reviewCommentsGiven: 5,
        reviewedRepos: []
      }

      const result = checkCodeReviews(data, 5)

      expect(result.passed).toBe(true)
      expect(result.rawValue).toBe(10)
    })

    it('fails when reviews are below threshold', () => {
      const data: CodeReviewData = {
        reviewsGiven: 3,
        reviewCommentsGiven: 1,
        reviewedRepos: []
      }

      const result = checkCodeReviews(data, 5)

      expect(result.passed).toBe(false)
      expect(result.rawValue).toBe(3)
    })

    it('passes with threshold of 0', () => {
      const data: CodeReviewData = {
        reviewsGiven: 0,
        reviewCommentsGiven: 0,
        reviewedRepos: []
      }

      const result = checkCodeReviews(data, 0)

      expect(result.passed).toBe(true)
    })
  })
})
