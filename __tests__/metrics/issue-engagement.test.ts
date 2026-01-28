/**
 * Tests for issue engagement metrics
 */
import { describe, it, expect } from '@jest/globals'
import {
  extractIssueEngagementData,
  calculateIssueEngagementMetric
} from '../../src/metrics/issue-engagement.js'
import type { GraphQLContributorData } from '../../src/types/github.js'
import type { IssueEngagementData } from '../../src/types/metrics.js'

describe('Issue Engagement Metric', () => {
  const sinceDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

  describe('extractIssueEngagementData', () => {
    it('extracts issue data correctly', () => {
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
            totalCount: 3,
            nodes: [
              {
                createdAt: new Date().toISOString(),
                comments: { totalCount: 5 },
                reactions: { totalCount: 3 }
              },
              {
                createdAt: new Date().toISOString(),
                comments: { totalCount: 2 },
                reactions: { totalCount: 0 }
              },
              {
                createdAt: new Date().toISOString(),
                comments: { totalCount: 0 },
                reactions: { totalCount: 0 }
              }
            ]
          },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 0, weeks: [] },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: { totalCount: 0, nodes: [] }
        }
      }

      const result = extractIssueEngagementData(data, sinceDate)

      expect(result.issuesCreated).toBe(3)
      expect(result.issuesWithComments).toBe(2) // 2 issues have comments > 0
      expect(result.issuesWithReactions).toBe(1) // 1 issue has reactions > 0
      expect(result.averageCommentsPerIssue).toBeCloseTo(2.33, 1) // (5+2+0)/3
    })

    it('handles empty issues', () => {
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

      const result = extractIssueEngagementData(data, sinceDate)

      expect(result.issuesCreated).toBe(0)
      expect(result.issuesWithComments).toBe(0)
      expect(result.issuesWithReactions).toBe(0)
      expect(result.averageCommentsPerIssue).toBe(0)
    })

    it('filters issues outside analysis window', () => {
      const recentDate = new Date()
      const oldDate = new Date(Date.now() - 500 * 24 * 60 * 60 * 1000)

      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: oldDate.toISOString(),
          pullRequests: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          issues: {
            totalCount: 2,
            nodes: [
              {
                createdAt: recentDate.toISOString(),
                comments: { totalCount: 5 },
                reactions: { totalCount: 2 }
              },
              {
                createdAt: oldDate.toISOString(), // Outside window
                comments: { totalCount: 10 },
                reactions: { totalCount: 5 }
              }
            ]
          },
          contributionsCollection: {
            contributionCalendar: { totalContributions: 0, weeks: [] },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: { totalCount: 0, nodes: [] }
        }
      }

      const result = extractIssueEngagementData(data, sinceDate)

      // Only the recent issue should be counted
      expect(result.issuesCreated).toBe(1)
      expect(result.issuesWithComments).toBe(1)
    })
  })

  describe('calculateIssueEngagementMetric', () => {
    it('gives neutral score for no issues', () => {
      const data: IssueEngagementData = {
        issuesCreated: 0,
        issuesWithComments: 0,
        issuesWithReactions: 0,
        averageCommentsPerIssue: 0
      }

      const result = calculateIssueEngagementMetric(data, 0.1)

      expect(result.normalizedScore).toBe(50)
      expect(result.details).toContain('No issues created')
    })

    it('gives excellent score for high engagement with 3+ issues', () => {
      const data: IssueEngagementData = {
        issuesCreated: 5,
        issuesWithComments: 4,
        issuesWithReactions: 3,
        averageCommentsPerIssue: 4
      }

      const result = calculateIssueEngagementMetric(data, 0.1)

      expect(result.normalizedScore).toBe(100)
      expect(result.details).toContain('High engagement')
    })

    it('gives good score for moderate engagement with 2+ issues', () => {
      const data: IssueEngagementData = {
        issuesCreated: 4,
        issuesWithComments: 2,
        issuesWithReactions: 2,
        averageCommentsPerIssue: 2
      }

      const result = calculateIssueEngagementMetric(data, 0.1)

      expect(result.normalizedScore).toBe(75)
      expect(result.details).toContain('Good engagement')
    })

    it('gives moderate score for some engagement', () => {
      const data: IssueEngagementData = {
        issuesCreated: 5,
        issuesWithComments: 2,
        issuesWithReactions: 1,
        averageCommentsPerIssue: 1
      }

      const result = calculateIssueEngagementMetric(data, 0.1)

      expect(result.normalizedScore).toBe(60)
      expect(result.details).toContain('Some engagement')
    })

    it('gives neutral score for low engagement', () => {
      const data: IssueEngagementData = {
        issuesCreated: 10,
        issuesWithComments: 2,
        issuesWithReactions: 1,
        averageCommentsPerIssue: 0.5
      }

      const result = calculateIssueEngagementMetric(data, 0.1)

      expect(result.normalizedScore).toBe(50)
      expect(result.details).toContain('Low engagement')
    })

    it('includes average comments info when notable', () => {
      const data: IssueEngagementData = {
        issuesCreated: 5,
        issuesWithComments: 4,
        issuesWithReactions: 3,
        averageCommentsPerIssue: 5.5
      }

      const result = calculateIssueEngagementMetric(data, 0.1)

      expect(result.details).toContain('Avg 5.5 comments/issue')
    })

    it('applies weight correctly', () => {
      const data: IssueEngagementData = {
        issuesCreated: 5,
        issuesWithComments: 4,
        issuesWithReactions: 3,
        averageCommentsPerIssue: 3
      }

      const result = calculateIssueEngagementMetric(data, 0.15)

      expect(result.normalizedScore).toBe(100)
      expect(result.weightedScore).toBe(15) // 100 * 0.15
      expect(result.weight).toBe(0.15)
    })

    it('uses higher of comments or reactions for engagement', () => {
      const data: IssueEngagementData = {
        issuesCreated: 5,
        issuesWithComments: 1,
        issuesWithReactions: 4, // Higher
        averageCommentsPerIssue: 1
      }

      const result = calculateIssueEngagementMetric(data, 0.1)

      // 4/5 = 80% engagement, but only 5 issues -> should be 100
      expect(result.normalizedScore).toBe(100)
    })
  })
})
