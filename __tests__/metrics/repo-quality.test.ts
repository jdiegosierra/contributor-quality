/**
 * Tests for repository quality metric
 */
import { describe, it, expect } from '@jest/globals'
import {
  extractRepoQualityData,
  checkRepoQuality
} from '../../src/metrics/repo-quality.js'
import type { GraphQLContributorData } from '../../src/types/github.js'
import type { RepoQualityData } from '../../src/types/metrics.js'

describe('Repo Quality Metric', () => {
  const sinceDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

  describe('extractRepoQualityData', () => {
    it('counts quality repos correctly', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
            totalCount: 3,
            nodes: [
              {
                state: 'MERGED',
                merged: true,
                mergedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                closedAt: new Date().toISOString(),
                additions: 50,
                deletions: 20,
                repository: {
                  owner: { login: 'org1' },
                  name: 'popular-repo',
                  stargazerCount: 5000
                }
              },
              {
                state: 'MERGED',
                merged: true,
                mergedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                closedAt: new Date().toISOString(),
                additions: 30,
                deletions: 10,
                repository: {
                  owner: { login: 'org2' },
                  name: 'small-repo',
                  stargazerCount: 50
                }
              }
            ],
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

      const result = extractRepoQualityData(data, 100, sinceDate)

      expect(result.qualityRepoCount).toBe(1) // Only one repo has >= 100 stars
      expect(result.contributedRepos.length).toBe(2)
      expect(result.highestStarRepo).toBe(5000)
    })

    it('handles no merged PRs', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
            totalCount: 1,
            nodes: [
              {
                state: 'CLOSED',
                merged: false,
                mergedAt: null,
                createdAt: new Date().toISOString(),
                closedAt: new Date().toISOString(),
                additions: 50,
                deletions: 20,
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

      const result = extractRepoQualityData(data, 100, sinceDate)

      expect(result.qualityRepoCount).toBe(0)
      expect(result.contributedRepos.length).toBe(0)
    })
  })

  describe('checkRepoQuality', () => {
    it('passes when quality repo count meets threshold', () => {
      const data: RepoQualityData = {
        contributedRepos: [
          { owner: 'org', repo: 'repo', stars: 5000, mergedPRCount: 3 }
        ],
        qualityRepoCount: 1,
        averageRepoStars: 5000,
        highestStarRepo: 5000
      }

      const result = checkRepoQuality(data, 1, 100)

      expect(result.passed).toBe(true)
      expect(result.rawValue).toBe(1)
    })

    it('fails when quality repo count is below threshold', () => {
      const data: RepoQualityData = {
        contributedRepos: [
          { owner: 'org', repo: 'repo', stars: 50, mergedPRCount: 3 }
        ],
        qualityRepoCount: 0,
        averageRepoStars: 50,
        highestStarRepo: 50
      }

      const result = checkRepoQuality(data, 1, 100)

      expect(result.passed).toBe(false)
      expect(result.rawValue).toBe(0)
    })

    it('passes with threshold of 0', () => {
      const data: RepoQualityData = {
        contributedRepos: [],
        qualityRepoCount: 0,
        averageRepoStars: 0,
        highestStarRepo: 0
      }

      const result = checkRepoQuality(data, 0, 100)

      expect(result.passed).toBe(true)
    })
  })
})
