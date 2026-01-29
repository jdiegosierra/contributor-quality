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
        issueSearch: {
          issueCount: 3,
          nodes: [
            {
              createdAt: new Date().toISOString(),
              comments: { totalCount: 5 },
              reactions: {
                nodes: [{ content: 'THUMBS_UP' }, { content: 'HEART' }]
              }
            },
            {
              createdAt: new Date().toISOString(),
              comments: { totalCount: 2 },
              reactions: { nodes: [] }
            },
            {
              createdAt: new Date().toISOString(),
              comments: { totalCount: 0 },
              reactions: { nodes: [] }
            }
          ]
        }
      }

      const result = extractIssueEngagementData(data)

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
        issueSearch: {
          issueCount: 0,
          nodes: []
        }
      }

      const result = extractIssueEngagementData(data)

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
