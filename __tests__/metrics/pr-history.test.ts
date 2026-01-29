/**
 * Tests for PR history metric
 */
import { describe, it, expect } from '@jest/globals'
import {
  extractPRHistoryData,
  checkPRMergeRate
} from '../../src/metrics/pr-history.js'
import type { GraphQLContributorData } from '../../src/types/github.js'
import type { PRHistoryData } from '../../src/types/metrics.js'

describe('PR History Metric', () => {
  const sinceDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

  describe('extractPRHistoryData', () => {
    it('calculates merge rate correctly', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
            totalCount: 10,
            nodes: [
              ...Array(8)
                .fill(null)
                .map(() => ({
                  state: 'MERGED' as const,
                  merged: true,
                  mergedAt: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  closedAt: new Date().toISOString(),
                  additions: 50,
                  deletions: 20,
                  repository: {
                    owner: { login: 'org' },
                    name: 'repo',
                    stargazerCount: 100
                  }
                })),
              ...Array(2)
                .fill(null)
                .map(() => ({
                  state: 'CLOSED' as const,
                  merged: false,
                  mergedAt: null,
                  createdAt: new Date().toISOString(),
                  closedAt: new Date().toISOString(),
                  additions: 50,
                  deletions: 20,
                  repository: {
                    owner: { login: 'org' },
                    name: 'repo',
                    stargazerCount: 100
                  }
                }))
            ],
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
        },
        issueSearch: { issueCount: 0, nodes: [] }
      }

      const result = extractPRHistoryData(data, sinceDate)

      expect(result.totalPRs).toBe(10)
      expect(result.mergedPRs).toBe(8)
      expect(result.closedWithoutMerge).toBe(2)
      expect(result.mergeRate).toBe(0.8) // 8/(8+2)
    })

    it('handles no PRs', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
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
        },
        issueSearch: { issueCount: 0, nodes: [] }
      }

      const result = extractPRHistoryData(data, sinceDate)

      expect(result.totalPRs).toBe(0)
      expect(result.mergeRate).toBe(0)
    })
  })

  describe('checkPRMergeRate', () => {
    it('passes when merge rate is above threshold', () => {
      const data: PRHistoryData = {
        totalPRs: 10,
        mergedPRs: 8,
        closedWithoutMerge: 2,
        openPRs: 0,
        mergeRate: 0.8,
        averagePRSize: 100,
        veryShortPRs: 0,
        mergedPRDates: [new Date()]
      }

      const result = checkPRMergeRate(data, 0.3)

      expect(result.passed).toBe(true)
      expect(result.rawValue).toBe(0.8)
      expect(result.threshold).toBe(0.3)
    })

    it('fails when merge rate is below threshold', () => {
      const data: PRHistoryData = {
        totalPRs: 10,
        mergedPRs: 2,
        closedWithoutMerge: 8,
        openPRs: 0,
        mergeRate: 0.2,
        averagePRSize: 100,
        veryShortPRs: 0,
        mergedPRDates: []
      }

      const result = checkPRMergeRate(data, 0.3)

      expect(result.passed).toBe(false)
      expect(result.rawValue).toBe(0.2)
    })

    it('passes for threshold of 0 with no PRs', () => {
      const data: PRHistoryData = {
        totalPRs: 0,
        mergedPRs: 0,
        closedWithoutMerge: 0,
        openPRs: 0,
        mergeRate: 0,
        averagePRSize: 0,
        veryShortPRs: 0,
        mergedPRDates: []
      }

      const result = checkPRMergeRate(data, 0)

      expect(result.passed).toBe(true)
    })

    it('fails for no PRs when threshold > 0', () => {
      const data: PRHistoryData = {
        totalPRs: 0,
        mergedPRs: 0,
        closedWithoutMerge: 0,
        openPRs: 0,
        mergeRate: 0,
        averagePRSize: 0,
        veryShortPRs: 0,
        mergedPRDates: []
      }

      const result = checkPRMergeRate(data, 0.3)

      expect(result.passed).toBe(false)
      expect(result.details).toContain('No PR history')
    })
  })
})
