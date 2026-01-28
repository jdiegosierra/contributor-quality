/**
 * Tests for account age and activity consistency metrics
 */
import { describe, it, expect } from '@jest/globals'
import {
  extractAccountData,
  calculateAccountAgeMetric,
  calculateActivityConsistencyMetric,
  isNewAccount
} from '../../src/metrics/account-age.js'
import type { GraphQLContributorData } from '../../src/types/github.js'
import type { AccountData } from '../../src/types/metrics.js'

describe('Account Age Metric', () => {
  describe('extractAccountData', () => {
    it('calculates account age correctly', () => {
      const now = new Date()
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: oneYearAgo.toISOString(),
          pullRequests: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          issues: { totalCount: 0, nodes: [] },
          contributionsCollection: {
            contributionCalendar: {
              totalContributions: 0,
              weeks: []
            },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: { totalCount: 0, nodes: [] }
        }
      }

      const result = extractAccountData(data, 12)

      expect(result.ageInDays).toBeGreaterThanOrEqual(364)
      expect(result.ageInDays).toBeLessThanOrEqual(366)
    })

    it('calculates months with activity from contribution calendar', () => {
      const now = new Date()

      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date(
            now.getTime() - 365 * 24 * 60 * 60 * 1000
          ).toISOString(),
          pullRequests: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          issues: { totalCount: 0, nodes: [] },
          contributionsCollection: {
            contributionCalendar: {
              totalContributions: 100,
              weeks: [
                {
                  contributionDays: [
                    { contributionCount: 5, date: '2024-01-15' },
                    { contributionCount: 3, date: '2024-01-16' }
                  ]
                },
                {
                  contributionDays: [
                    { contributionCount: 2, date: '2024-02-10' }
                  ]
                },
                {
                  contributionDays: [
                    { contributionCount: 0, date: '2024-03-05' } // No activity
                  ]
                }
              ]
            },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: { totalCount: 0, nodes: [] }
        }
      }

      const result = extractAccountData(data, 12)

      // Should have 2 months with activity (January and February)
      expect(result.monthsWithActivity).toBe(2)
    })

    it('handles empty contribution calendar', () => {
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
            contributionCalendar: {
              totalContributions: 0,
              weeks: []
            },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: { totalCount: 0, nodes: [] }
        }
      }

      const result = extractAccountData(data, 12)

      expect(result.monthsWithActivity).toBe(0)
      expect(result.consistencyScore).toBe(0)
    })
  })

  describe('calculateAccountAgeMetric', () => {
    it('gives high score for established accounts (365+ days)', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
        ageInDays: 400,
        monthsWithActivity: 10,
        totalMonthsInWindow: 12,
        consistencyScore: 0.83
      }

      const result = calculateAccountAgeMetric(data, 0.1)

      expect(result.normalizedScore).toBe(100)
      expect(result.details).toContain('Established account')
    })

    it('gives good score for mature accounts (180-365 days)', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
        ageInDays: 200,
        monthsWithActivity: 6,
        totalMonthsInWindow: 12,
        consistencyScore: 0.5
      }

      const result = calculateAccountAgeMetric(data, 0.1)

      expect(result.normalizedScore).toBe(75)
      expect(result.details).toContain('Mature account')
    })

    it('gives moderate score for accounts 90-180 days', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        ageInDays: 120,
        monthsWithActivity: 3,
        totalMonthsInWindow: 12,
        consistencyScore: 0.25
      }

      const result = calculateAccountAgeMetric(data, 0.1)

      expect(result.normalizedScore).toBe(60)
    })

    it('gives slight bonus for accounts 30-90 days', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        ageInDays: 60,
        monthsWithActivity: 2,
        totalMonthsInWindow: 12,
        consistencyScore: 0.17
      }

      const result = calculateAccountAgeMetric(data, 0.1)

      expect(result.normalizedScore).toBe(55)
      expect(result.details).toContain('Recent account')
    })

    it('gives neutral score for new accounts (<30 days)', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        ageInDays: 10,
        monthsWithActivity: 1,
        totalMonthsInWindow: 12,
        consistencyScore: 0.08
      }

      const result = calculateAccountAgeMetric(data, 0.1)

      expect(result.normalizedScore).toBe(50)
      expect(result.details).toContain('New account')
    })

    it('applies weight correctly', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
        ageInDays: 400,
        monthsWithActivity: 10,
        totalMonthsInWindow: 12,
        consistencyScore: 0.83
      }

      const result = calculateAccountAgeMetric(data, 0.15)

      expect(result.normalizedScore).toBe(100)
      expect(result.weightedScore).toBe(15) // 100 * 0.15
      expect(result.weight).toBe(0.15)
    })
  })

  describe('calculateActivityConsistencyMetric', () => {
    it('gives high score for very consistent activity (90%+)', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        ageInDays: 365,
        monthsWithActivity: 11,
        totalMonthsInWindow: 12,
        consistencyScore: 0.92
      }

      const result = calculateActivityConsistencyMetric(data, 0.1)

      expect(result.normalizedScore).toBe(100)
      expect(result.details).toContain('Very consistent')
    })

    it('gives good score for consistent activity (70-90%)', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        ageInDays: 365,
        monthsWithActivity: 9,
        totalMonthsInWindow: 12,
        consistencyScore: 0.75
      }

      const result = calculateActivityConsistencyMetric(data, 0.1)

      expect(result.normalizedScore).toBe(85)
      expect(result.details).toContain('Consistent')
    })

    it('gives moderate score for moderate consistency (50-70%)', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        ageInDays: 365,
        monthsWithActivity: 7,
        totalMonthsInWindow: 12,
        consistencyScore: 0.58
      }

      const result = calculateActivityConsistencyMetric(data, 0.1)

      expect(result.normalizedScore).toBe(70)
      expect(result.details).toContain('Moderate consistency')
    })

    it('gives neutral score for sparse activity', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        ageInDays: 365,
        monthsWithActivity: 2,
        totalMonthsInWindow: 12,
        consistencyScore: 0.17
      }

      const result = calculateActivityConsistencyMetric(data, 0.1)

      expect(result.normalizedScore).toBe(50)
      expect(result.details).toContain('Sparse activity')
    })

    it('gives neutral score for accounts too new to evaluate', () => {
      // Account with 0 days means effectiveMonths = 0, triggering "too new"
      const data: AccountData = {
        createdAt: new Date(),
        ageInDays: 0,
        monthsWithActivity: 0,
        totalMonthsInWindow: 12,
        consistencyScore: 0
      }

      const result = calculateActivityConsistencyMetric(data, 0.1)

      expect(result.normalizedScore).toBe(50)
      expect(result.details).toContain('too new')
    })
  })

  describe('isNewAccount', () => {
    it('returns true for accounts below threshold', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        ageInDays: 10,
        monthsWithActivity: 1,
        totalMonthsInWindow: 12,
        consistencyScore: 0.08
      }

      expect(isNewAccount(data, 30)).toBe(true)
    })

    it('returns false for accounts above threshold', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        ageInDays: 60,
        monthsWithActivity: 2,
        totalMonthsInWindow: 12,
        consistencyScore: 0.17
      }

      expect(isNewAccount(data, 30)).toBe(false)
    })

    it('returns false for accounts exactly at threshold', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        ageInDays: 30,
        monthsWithActivity: 1,
        totalMonthsInWindow: 12,
        consistencyScore: 0.08
      }

      expect(isNewAccount(data, 30)).toBe(false)
    })
  })
})
