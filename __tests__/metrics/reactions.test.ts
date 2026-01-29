/**
 * Tests for reactions metrics
 */
import { describe, it, expect } from '@jest/globals'
import {
  extractReactionData,
  checkPositiveReactions,
  checkNegativeReactions
} from '../../src/metrics/reactions.js'
import type { GraphQLContributorData } from '../../src/types/github.js'
import type { ReactionData } from '../../src/types/metrics.js'

describe('Reactions Metrics', () => {
  describe('extractReactionData', () => {
    it('counts reactions correctly', () => {
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
            totalCount: 3,
            nodes: [
              {
                reactions: { nodes: [{ content: '+1' }, { content: 'heart' }] }
              },
              { reactions: { nodes: [{ content: '-1' }] } },
              { reactions: { nodes: [{ content: 'laugh' }] } }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        },
        issueSearch: {
          issueCount: 0,
          nodes: []
        }
      }

      const result = extractReactionData(data)

      expect(result.totalComments).toBe(3)
      expect(result.positiveReactions).toBe(2) // +1, heart
      expect(result.negativeReactions).toBe(1) // -1
      expect(result.neutralReactions).toBe(1) // laugh
    })

    it('handles no comments', () => {
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

      const result = extractReactionData(data)

      expect(result.totalComments).toBe(0)
      expect(result.positiveReactions).toBe(0)
    })
  })

  describe('checkPositiveReactions', () => {
    it('passes when positive reactions meet threshold', () => {
      const data: ReactionData = {
        totalComments: 10,
        positiveReactions: 5,
        negativeReactions: 1,
        neutralReactions: 2,
        positiveRatio: 0.625
      }

      const result = checkPositiveReactions(data, 3)

      expect(result.passed).toBe(true)
      expect(result.rawValue).toBe(5)
    })

    it('fails when positive reactions are below threshold', () => {
      const data: ReactionData = {
        totalComments: 10,
        positiveReactions: 2,
        negativeReactions: 1,
        neutralReactions: 2,
        positiveRatio: 0.4
      }

      const result = checkPositiveReactions(data, 5)

      expect(result.passed).toBe(false)
      expect(result.rawValue).toBe(2)
    })

    it('passes with threshold of 0', () => {
      const data: ReactionData = {
        totalComments: 0,
        positiveReactions: 0,
        negativeReactions: 0,
        neutralReactions: 0,
        positiveRatio: 0.5
      }

      const result = checkPositiveReactions(data, 0)

      expect(result.passed).toBe(true)
    })
  })

  describe('checkNegativeReactions', () => {
    it('passes when negative reactions are within limit', () => {
      const data: ReactionData = {
        totalComments: 10,
        positiveReactions: 5,
        negativeReactions: 2,
        neutralReactions: 1,
        positiveRatio: 0.625
      }

      const result = checkNegativeReactions(data, 10)

      expect(result.passed).toBe(true)
      expect(result.rawValue).toBe(2)
    })

    it('fails when negative reactions exceed limit', () => {
      const data: ReactionData = {
        totalComments: 20,
        positiveReactions: 5,
        negativeReactions: 15,
        neutralReactions: 2,
        positiveRatio: 0.23
      }

      const result = checkNegativeReactions(data, 10)

      expect(result.passed).toBe(false)
      expect(result.rawValue).toBe(15)
    })

    it('passes exactly at limit', () => {
      const data: ReactionData = {
        totalComments: 20,
        positiveReactions: 5,
        negativeReactions: 10,
        neutralReactions: 2,
        positiveRatio: 0.29
      }

      const result = checkNegativeReactions(data, 10)

      expect(result.passed).toBe(true)
    })
  })
})
