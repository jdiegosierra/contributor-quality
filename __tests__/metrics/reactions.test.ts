/**
 * Tests for reactions metrics
 */
import { describe, it, expect } from '@jest/globals'
import {
  extractReactionData,
  calculatePositiveReactionsMetric,
  calculateNegativeReactionsMetric
} from '../../src/metrics/reactions.js'
import type { GraphQLContributorData } from '../../src/types/github.js'
import type { ReactionData } from '../../src/types/metrics.js'

describe('Reactions Metric', () => {
  describe('extractReactionData', () => {
    it('counts positive reactions correctly', () => {
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
          issueComments: {
            totalCount: 3,
            nodes: [
              {
                createdAt: new Date().toISOString(),
                reactions: { nodes: [{ content: '+1' }, { content: 'heart' }] }
              },
              {
                createdAt: new Date().toISOString(),
                reactions: {
                  nodes: [{ content: 'rocket' }, { content: 'hooray' }]
                }
              },
              {
                createdAt: new Date().toISOString(),
                reactions: { nodes: [{ content: '+1' }] }
              }
            ]
          }
        }
      }

      const result = extractReactionData(data)

      // +1, heart, rocket, hooray, +1 = 5 positive reactions
      expect(result.positiveReactions).toBe(5)
      expect(result.negativeReactions).toBe(0)
      expect(result.totalComments).toBe(3)
    })

    it('counts negative reactions correctly', () => {
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
          issueComments: {
            totalCount: 2,
            nodes: [
              {
                createdAt: new Date().toISOString(),
                reactions: {
                  nodes: [{ content: '-1' }, { content: 'confused' }]
                }
              },
              {
                createdAt: new Date().toISOString(),
                reactions: { nodes: [{ content: '+1' }] }
              }
            ]
          }
        }
      }

      const result = extractReactionData(data)

      expect(result.positiveReactions).toBe(1)
      expect(result.negativeReactions).toBe(2)
    })

    it('handles empty comments', () => {
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
          issueComments: {
            totalCount: 0,
            nodes: []
          }
        }
      }

      const result = extractReactionData(data)

      expect(result.totalComments).toBe(0)
      expect(result.positiveRatio).toBe(0.5) // Default neutral
    })

    it('calculates positive ratio correctly', () => {
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
          issueComments: {
            totalCount: 2,
            nodes: [
              {
                createdAt: new Date().toISOString(),
                reactions: {
                  nodes: [
                    { content: '+1' },
                    { content: '+1' },
                    { content: '+1' }
                  ]
                }
              },
              {
                createdAt: new Date().toISOString(),
                reactions: { nodes: [{ content: '-1' }] }
              }
            ]
          }
        }
      }

      const result = extractReactionData(data)

      expect(result.positiveRatio).toBe(0.75) // 3 out of 4
    })
  })

  describe('calculatePositiveReactionsMetric', () => {
    it('returns neutral score for insufficient data', () => {
      const data: ReactionData = {
        totalComments: 2,
        positiveReactions: 2,
        negativeReactions: 0,
        neutralReactions: 0,
        positiveRatio: 1
      }

      const result = calculatePositiveReactionsMetric(data, 0.15)

      expect(result.normalizedScore).toBe(50)
      expect(result.details).toContain('Insufficient')
    })

    it('gives high score for excellent reception (80%+)', () => {
      const data: ReactionData = {
        totalComments: 10,
        positiveReactions: 18,
        negativeReactions: 1,
        neutralReactions: 1,
        positiveRatio: 0.9
      }

      const result = calculatePositiveReactionsMetric(data, 0.15)

      expect(result.normalizedScore).toBe(100)
      expect(result.details).toContain('Excellent reception')
    })

    it('gives good score for good reception (60-80%)', () => {
      const data: ReactionData = {
        totalComments: 10,
        positiveReactions: 7,
        negativeReactions: 2,
        neutralReactions: 1,
        positiveRatio: 0.7
      }

      const result = calculatePositiveReactionsMetric(data, 0.15)

      expect(result.normalizedScore).toBe(75)
      expect(result.details).toContain('Good reception')
    })

    it('gives neutral score for mixed reception (40-60%)', () => {
      const data: ReactionData = {
        totalComments: 10,
        positiveReactions: 5,
        negativeReactions: 4,
        neutralReactions: 1,
        positiveRatio: 0.5
      }

      const result = calculatePositiveReactionsMetric(data, 0.15)

      expect(result.normalizedScore).toBe(50)
      expect(result.details).toContain('Mixed reception')
    })

    it('gives low score for poor reception (<40%)', () => {
      const data: ReactionData = {
        totalComments: 10,
        positiveReactions: 2,
        negativeReactions: 7,
        neutralReactions: 1,
        positiveRatio: 0.2
      }

      const result = calculatePositiveReactionsMetric(data, 0.15)

      expect(result.normalizedScore).toBe(25) // (0.2 / 0.4) * 50
      expect(result.details).toContain('Poor reception')
    })

    it('applies weight correctly', () => {
      const data: ReactionData = {
        totalComments: 10,
        positiveReactions: 18,
        negativeReactions: 1,
        neutralReactions: 1,
        positiveRatio: 0.9
      }

      const result = calculatePositiveReactionsMetric(data, 0.2)

      expect(result.normalizedScore).toBe(100)
      expect(result.weightedScore).toBe(20) // 100 * 0.2
    })
  })

  describe('calculateNegativeReactionsMetric', () => {
    it('returns neutral score for insufficient data', () => {
      const data: ReactionData = {
        totalComments: 1,
        positiveReactions: 1,
        negativeReactions: 1,
        neutralReactions: 0,
        positiveRatio: 0.5
      }

      const result = calculateNegativeReactionsMetric(data, 0.1)

      expect(result.normalizedScore).toBe(50)
      expect(result.details).toContain('Insufficient')
    })

    it('gives no penalty for low negative reactions (<10%)', () => {
      const data: ReactionData = {
        totalComments: 20,
        positiveReactions: 18,
        negativeReactions: 1,
        neutralReactions: 1,
        positiveRatio: 0.9
      }

      const result = calculateNegativeReactionsMetric(data, 0.1)

      expect(result.normalizedScore).toBe(50) // No penalty
      expect(result.details).toContain('Low negative')
    })

    it('gives slight penalty for 10-20% negative', () => {
      const data: ReactionData = {
        totalComments: 20,
        positiveReactions: 8,
        negativeReactions: 1,
        neutralReactions: 1,
        positiveRatio: 0.8
      }

      const result = calculateNegativeReactionsMetric(data, 0.1)

      expect(result.normalizedScore).toBe(40)
      expect(result.details).toContain('Some negative')
    })

    it('gives moderate penalty for 20-30% negative', () => {
      const data: ReactionData = {
        totalComments: 20,
        positiveReactions: 6,
        negativeReactions: 2,
        neutralReactions: 2,
        positiveRatio: 0.6
      }

      const result = calculateNegativeReactionsMetric(data, 0.1)

      expect(result.normalizedScore).toBe(25)
      expect(result.details).toContain('Notable negative')
    })

    it('gives heavy penalty for >30% negative', () => {
      const data: ReactionData = {
        totalComments: 20,
        positiveReactions: 4,
        negativeReactions: 5,
        neutralReactions: 1,
        positiveRatio: 0.4
      }

      const result = calculateNegativeReactionsMetric(data, 0.1)

      expect(result.normalizedScore).toBeLessThan(25)
      expect(result.details).toContain('High negative')
    })
  })
})
