/**
 * Tests for account age and activity consistency metrics
 */
import { describe, it, expect } from '@jest/globals'
import {
  extractAccountData,
  checkAccountAge,
  checkActivityConsistency,
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
          issues: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          contributionsCollection: {
            contributionCalendar: {
              totalContributions: 0,
              weeks: []
            },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
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
          issues: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
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
          issueComments: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
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
          issues: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          },
          contributionsCollection: {
            contributionCalendar: {
              totalContributions: 0,
              weeks: []
            },
            pullRequestReviewContributions: { totalCount: 0 }
          },
          issueComments: {
            totalCount: 0,
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      }

      const result = extractAccountData(data, 12)

      expect(result.monthsWithActivity).toBe(0)
      expect(result.consistencyScore).toBe(0)
    })
  })

  describe('checkAccountAge', () => {
    it('passes for accounts above threshold', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
        ageInDays: 400,
        monthsWithActivity: 10,
        totalMonthsInWindow: 12,
        consistencyScore: 0.83
      }

      const result = checkAccountAge(data, 30)

      expect(result.passed).toBe(true)
      expect(result.rawValue).toBe(400)
      expect(result.threshold).toBe(30)
    })

    it('fails for new accounts below threshold', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        ageInDays: 10,
        monthsWithActivity: 1,
        totalMonthsInWindow: 12,
        consistencyScore: 0.08
      }

      const result = checkAccountAge(data, 30)

      expect(result.passed).toBe(false)
      expect(result.rawValue).toBe(10)
    })

    it('passes for accounts exactly at threshold', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        ageInDays: 30,
        monthsWithActivity: 1,
        totalMonthsInWindow: 12,
        consistencyScore: 0.08
      }

      const result = checkAccountAge(data, 30)

      expect(result.passed).toBe(true)
    })

    it('formats details correctly for established accounts', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
        ageInDays: 400,
        monthsWithActivity: 10,
        totalMonthsInWindow: 12,
        consistencyScore: 0.83
      }

      const result = checkAccountAge(data, 30)

      expect(result.details).toContain('year')
    })
  })

  describe('checkActivityConsistency', () => {
    it('passes for consistent activity above threshold', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        ageInDays: 365,
        monthsWithActivity: 11,
        totalMonthsInWindow: 12,
        consistencyScore: 0.92
      }

      const result = checkActivityConsistency(data, 0.5)

      expect(result.passed).toBe(true)
      expect(result.rawValue).toBeCloseTo(0.92, 2)
    })

    it('fails for sparse activity below threshold', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        ageInDays: 365,
        monthsWithActivity: 2,
        totalMonthsInWindow: 12,
        consistencyScore: 0.17
      }

      const result = checkActivityConsistency(data, 0.5)

      expect(result.passed).toBe(false)
    })

    it('passes with threshold of 0', () => {
      const data: AccountData = {
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        ageInDays: 365,
        monthsWithActivity: 0,
        totalMonthsInWindow: 12,
        consistencyScore: 0
      }

      const result = checkActivityConsistency(data, 0)

      expect(result.passed).toBe(true)
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
