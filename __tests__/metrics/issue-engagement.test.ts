/**
 * Tests for issue engagement metric
 */
import { describe, it, expect } from '@jest/globals'
import {
  extractIssueEngagementData,
  checkIssueEngagement
} from '../../src/metrics/issue-engagement.js'
import type { GraphQLContributorData } from '../../src/types/github.js'
import type { IssueEngagementData } from '../../src/types/metrics.js'

describe('Issue Engagement Metric', () => {
  const sinceDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

  describe('extractIssueEngagementData', () => {
    it('counts issues and engagement correctly', () => {
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
        }
      }

      const result = extractIssueEngagementData(data, sinceDate)

      expect(result.issuesCreated).toBe(3)
      expect(result.issuesWithComments).toBe(2) // 2 with comments > 0
      expect(result.issuesWithReactions).toBe(1) // 1 with reactions > 0
    })

    it('handles no issues', () => {
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

      const result = extractIssueEngagementData(data, sinceDate)

      expect(result.issuesCreated).toBe(0)
      expect(result.issuesWithComments).toBe(0)
    })
  })

  describe('checkIssueEngagement', () => {
    it('passes when issues created meet threshold', () => {
      const data: IssueEngagementData = {
        issuesCreated: 5,
        issuesWithComments: 3,
        issuesWithReactions: 2,
        averageCommentsPerIssue: 2.5
      }

      const result = checkIssueEngagement(data, 3)

      expect(result.passed).toBe(true)
      expect(result.rawValue).toBe(5)
    })

    it('fails when issues created are below threshold', () => {
      const data: IssueEngagementData = {
        issuesCreated: 2,
        issuesWithComments: 1,
        issuesWithReactions: 1,
        averageCommentsPerIssue: 2
      }

      const result = checkIssueEngagement(data, 5)

      expect(result.passed).toBe(false)
      expect(result.rawValue).toBe(2)
    })

    it('passes with threshold of 0', () => {
      const data: IssueEngagementData = {
        issuesCreated: 0,
        issuesWithComments: 0,
        issuesWithReactions: 0,
        averageCommentsPerIssue: 0
      }

      const result = checkIssueEngagement(data, 0)

      expect(result.passed).toBe(true)
    })
  })
})
