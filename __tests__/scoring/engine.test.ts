/**
 * Tests for the main scoring engine
 */
import { describe, it, expect } from '@jest/globals'
import {
  extractAllMetrics,
  calculateAllMetrics,
  calculateBreakdown,
  generateRecommendations
} from '../../src/scoring/engine.js'
import { DEFAULT_CONFIG } from '../../src/config/defaults.js'
import type { GraphQLContributorData } from '../../src/types/github.js'
import type { AllMetricsData, MetricResult } from '../../src/types/metrics.js'

describe('Scoring Engine', () => {
  const sinceDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

  describe('extractAllMetrics', () => {
    it('extracts all metric data from GraphQL response', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date(
            Date.now() - 400 * 24 * 60 * 60 * 1000
          ).toISOString(),
          pullRequests: {
            totalCount: 5,
            nodes: [
              {
                state: 'MERGED',
                merged: true,
                mergedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                closedAt: new Date().toISOString(),
                additions: 100,
                deletions: 50,
                repository: {
                  owner: { login: 'org' },
                  name: 'repo',
                  stargazerCount: 5000
                }
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          issues: {
            totalCount: 2,
            nodes: [
              {
                createdAt: new Date().toISOString(),
                comments: { totalCount: 3 },
                reactions: { totalCount: 5 }
              }
            ]
          },
          contributionsCollection: {
            contributionCalendar: {
              totalContributions: 100,
              weeks: [
                {
                  contributionDays: [
                    { contributionCount: 5, date: '2024-01-15' }
                  ]
                }
              ]
            },
            pullRequestReviewContributions: { totalCount: 10 }
          },
          issueComments: {
            totalCount: 5,
            nodes: [
              { reactions: { nodes: [{ content: '+1' }] } },
              { reactions: { nodes: [{ content: 'heart' }] } }
            ]
          }
        }
      }

      const result = extractAllMetrics(data, DEFAULT_CONFIG, sinceDate)

      expect(result.prHistory).toBeDefined()
      expect(result.repoQuality).toBeDefined()
      expect(result.reactions).toBeDefined()
      expect(result.account).toBeDefined()
      expect(result.issueEngagement).toBeDefined()
      expect(result.codeReviews).toBeDefined()
    })
  })

  describe('calculateAllMetrics', () => {
    it('calculates all metric scores', () => {
      const metricsData: AllMetricsData = {
        prHistory: {
          totalPRs: 10,
          mergedPRs: 8,
          closedWithoutMerge: 2,
          openPRs: 0,
          mergeRate: 0.8,
          averagePRSize: 100,
          veryShortPRs: 0,
          mergedPRDates: [new Date()]
        },
        repoQuality: {
          contributedRepos: [
            { owner: 'org', repo: 'repo', stars: 5000, mergedPRCount: 3 }
          ],
          qualityRepoCount: 1,
          averageRepoStars: 5000,
          highestStarRepo: 5000
        },
        reactions: {
          totalComments: 20,
          positiveReactions: 15,
          negativeReactions: 2,
          neutralReactions: 3,
          positiveRatio: 0.75
        },
        account: {
          createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
          ageInDays: 400,
          monthsWithActivity: 10,
          totalMonthsInWindow: 12,
          consistencyScore: 0.83
        },
        issueEngagement: {
          issuesCreated: 5,
          issuesWithComments: 4,
          issuesWithReactions: 3,
          averageCommentsPerIssue: 3
        },
        codeReviews: {
          reviewsGiven: 15,
          reviewCommentsGiven: 7,
          reviewedRepos: []
        }
      }

      const results = calculateAllMetrics(metricsData, DEFAULT_CONFIG)

      expect(results.length).toBe(8) // 8 metrics
      expect(results.every((r) => r.normalizedScore >= 0)).toBe(true)
      expect(results.every((r) => r.normalizedScore <= 100)).toBe(true)
    })
  })

  describe('calculateBreakdown', () => {
    it('calculates positive and negative adjustments', () => {
      const metrics: MetricResult[] = [
        {
          name: 'prMergeRate',
          rawValue: 0.9,
          normalizedScore: 100,
          weightedScore: 20,
          weight: 0.2,
          details: 'Excellent merge rate',
          dataPoints: 10
        },
        {
          name: 'negativeReactions',
          rawValue: 0.3,
          normalizedScore: 25,
          weightedScore: 2.5,
          weight: 0.1,
          details: 'High negative reactions',
          dataPoints: 20
        }
      ]

      const breakdown = calculateBreakdown(metrics, 0)

      expect(breakdown.positiveAdjustments.length).toBe(1)
      expect(breakdown.positiveAdjustments[0].metric).toBe('prMergeRate')

      expect(breakdown.negativeAdjustments.length).toBe(1)
      expect(breakdown.negativeAdjustments[0].metric).toBe('negativeReactions')
    })

    it('includes spam penalties in breakdown', () => {
      const metrics: MetricResult[] = [
        {
          name: 'prMergeRate',
          rawValue: 0.5,
          normalizedScore: 50,
          weightedScore: 10,
          weight: 0.2,
          details: 'Average merge rate',
          dataPoints: 10
        }
      ]

      const breakdown = calculateBreakdown(metrics, 75)

      expect(breakdown.spamPenalties.length).toBe(1)
      expect(breakdown.spamPenalties[0].points).toBe(75)
    })
  })

  describe('generateRecommendations', () => {
    it('recommends improving PR quality for low merge rate', () => {
      const metricsData: AllMetricsData = {
        prHistory: {
          totalPRs: 10,
          mergedPRs: 2,
          closedWithoutMerge: 8,
          openPRs: 0,
          mergeRate: 0.2,
          averagePRSize: 50,
          veryShortPRs: 0,
          mergedPRDates: []
        },
        repoQuality: {
          contributedRepos: [],
          qualityRepoCount: 0,
          averageRepoStars: 0,
          highestStarRepo: 0
        },
        reactions: {
          totalComments: 0,
          positiveReactions: 0,
          negativeReactions: 0,
          neutralReactions: 0,
          positiveRatio: 0.5
        },
        account: {
          createdAt: new Date(),
          ageInDays: 100,
          monthsWithActivity: 3,
          totalMonthsInWindow: 12,
          consistencyScore: 0.25
        },
        issueEngagement: {
          issuesCreated: 0,
          issuesWithComments: 0,
          issuesWithReactions: 0,
          averageCommentsPerIssue: 0
        },
        codeReviews: {
          reviewsGiven: 0,
          reviewCommentsGiven: 0,
          reviewedRepos: []
        }
      }

      const metrics: MetricResult[] = [
        {
          name: 'prMergeRate',
          rawValue: 0.2,
          normalizedScore: 30,
          weightedScore: 6,
          weight: 0.2,
          details: 'Low merge rate',
          dataPoints: 10
        }
      ]

      const recommendations = generateRecommendations(metricsData, metrics, 300)

      expect(
        recommendations.some((r) => r.toLowerCase().includes('pr quality'))
      ).toBe(true)
    })

    it('recommends contributing to quality repos', () => {
      const metricsData: AllMetricsData = {
        prHistory: {
          totalPRs: 5,
          mergedPRs: 4,
          closedWithoutMerge: 1,
          openPRs: 0,
          mergeRate: 0.8,
          averagePRSize: 50,
          veryShortPRs: 0,
          mergedPRDates: []
        },
        repoQuality: {
          contributedRepos: [
            { owner: 'user', repo: 'small', stars: 10, mergedPRCount: 1 }
          ],
          qualityRepoCount: 0,
          averageRepoStars: 10,
          highestStarRepo: 10
        },
        reactions: {
          totalComments: 5,
          positiveReactions: 3,
          negativeReactions: 1,
          neutralReactions: 1,
          positiveRatio: 0.6
        },
        account: {
          createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
          ageInDays: 200,
          monthsWithActivity: 6,
          totalMonthsInWindow: 12,
          consistencyScore: 0.5
        },
        issueEngagement: {
          issuesCreated: 0,
          issuesWithComments: 0,
          issuesWithReactions: 0,
          averageCommentsPerIssue: 0
        },
        codeReviews: {
          reviewsGiven: 2,
          reviewCommentsGiven: 1,
          reviewedRepos: []
        }
      }

      const metrics: MetricResult[] = [
        {
          name: 'repoQuality',
          rawValue: 0,
          normalizedScore: 50,
          weightedScore: 7.5,
          weight: 0.15,
          details: 'No quality repos',
          dataPoints: 1
        }
      ]

      const recommendations = generateRecommendations(metricsData, metrics, 450)

      expect(
        recommendations.some((r) => r.toLowerCase().includes('established'))
      ).toBe(true)
    })

    it('recommends code reviews for low review count', () => {
      const metricsData: AllMetricsData = {
        prHistory: {
          totalPRs: 10,
          mergedPRs: 8,
          closedWithoutMerge: 2,
          openPRs: 0,
          mergeRate: 0.8,
          averagePRSize: 100,
          veryShortPRs: 0,
          mergedPRDates: []
        },
        repoQuality: {
          contributedRepos: [],
          qualityRepoCount: 0,
          averageRepoStars: 0,
          highestStarRepo: 0
        },
        reactions: {
          totalComments: 10,
          positiveReactions: 8,
          negativeReactions: 1,
          neutralReactions: 1,
          positiveRatio: 0.8
        },
        account: {
          createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
          ageInDays: 400,
          monthsWithActivity: 10,
          totalMonthsInWindow: 12,
          consistencyScore: 0.83
        },
        issueEngagement: {
          issuesCreated: 0,
          issuesWithComments: 0,
          issuesWithReactions: 0,
          averageCommentsPerIssue: 0
        },
        codeReviews: {
          reviewsGiven: 2,
          reviewCommentsGiven: 1,
          reviewedRepos: []
        }
      }

      const metrics: MetricResult[] = [
        {
          name: 'codeReviews',
          rawValue: 2,
          normalizedScore: 55,
          weightedScore: 5.5,
          weight: 0.1,
          details: 'Few reviews',
          dataPoints: 2
        }
      ]

      const recommendations = generateRecommendations(metricsData, metrics, 500)

      expect(
        recommendations.some((r) => r.toLowerCase().includes('code review'))
      ).toBe(true)
    })

    it('adds general recommendation for very low score with no specific issues', () => {
      const metricsData: AllMetricsData = {
        prHistory: {
          totalPRs: 0,
          mergedPRs: 0,
          closedWithoutMerge: 0,
          openPRs: 0,
          mergeRate: 0,
          averagePRSize: 0,
          veryShortPRs: 0,
          mergedPRDates: []
        },
        repoQuality: {
          contributedRepos: [],
          qualityRepoCount: 0,
          averageRepoStars: 0,
          highestStarRepo: 0
        },
        reactions: {
          totalComments: 0,
          positiveReactions: 0,
          negativeReactions: 0,
          neutralReactions: 0,
          positiveRatio: 0.5
        },
        account: {
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          ageInDays: 5,
          monthsWithActivity: 0,
          totalMonthsInWindow: 12,
          consistencyScore: 0
        },
        issueEngagement: {
          issuesCreated: 0,
          issuesWithComments: 0,
          issuesWithReactions: 0,
          averageCommentsPerIssue: 0
        },
        codeReviews: {
          reviewsGiven: 0,
          reviewCommentsGiven: 0,
          reviewedRepos: []
        }
      }

      const metrics: MetricResult[] = [
        {
          name: 'prMergeRate',
          rawValue: 0,
          normalizedScore: 50,
          weightedScore: 10,
          weight: 0.2,
          details: 'No data',
          dataPoints: 0
        }
      ]

      const recommendations = generateRecommendations(metricsData, metrics, 200)

      expect(
        recommendations.some((r) => r.toLowerCase().includes('build'))
      ).toBe(true)
    })
  })
})
