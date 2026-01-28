/**
 * Tests for repository quality metrics
 */
import { describe, it, expect } from '@jest/globals'
import {
  extractRepoQualityData,
  calculateRepoQualityMetric
} from '../../src/metrics/repo-quality.js'
import type { GraphQLContributorData } from '../../src/types/github.js'
import type { RepoQualityData } from '../../src/types/metrics.js'

describe('Repo Quality Metric', () => {
  const sinceDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

  describe('extractRepoQualityData', () => {
    it('extracts data from merged PRs only', () => {
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
                additions: 100,
                deletions: 50,
                repository: {
                  owner: { login: 'microsoft' },
                  name: 'vscode',
                  stargazerCount: 150000
                }
              },
              {
                state: 'CLOSED',
                merged: false,
                mergedAt: null,
                createdAt: new Date().toISOString(),
                closedAt: new Date().toISOString(),
                additions: 10,
                deletions: 5,
                repository: {
                  owner: { login: 'facebook' },
                  name: 'react',
                  stargazerCount: 200000
                }
              }
            ],
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

      const result = extractRepoQualityData(data, 100, sinceDate)

      // Should only count merged PR to vscode
      expect(result.contributedRepos.length).toBe(1)
      expect(result.contributedRepos[0].repo).toBe('vscode')
    })

    it('counts quality repos correctly based on star threshold', () => {
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
                additions: 100,
                deletions: 50,
                repository: {
                  owner: { login: 'big-org' },
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
                additions: 50,
                deletions: 20,
                repository: {
                  owner: { login: 'small-org' },
                  name: 'small-repo',
                  stargazerCount: 50
                }
              }
            ],
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

      const result = extractRepoQualityData(data, 100, sinceDate)

      expect(result.contributedRepos.length).toBe(2)
      expect(result.qualityRepoCount).toBe(1) // Only popular-repo has 100+ stars
    })

    it('groups multiple PRs to same repo', () => {
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
                additions: 100,
                deletions: 50,
                repository: {
                  owner: { login: 'org' },
                  name: 'repo',
                  stargazerCount: 1000
                }
              },
              {
                state: 'MERGED',
                merged: true,
                mergedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                closedAt: new Date().toISOString(),
                additions: 50,
                deletions: 20,
                repository: {
                  owner: { login: 'org' },
                  name: 'repo',
                  stargazerCount: 1000
                }
              }
            ],
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

      const result = extractRepoQualityData(data, 100, sinceDate)

      expect(result.contributedRepos.length).toBe(1)
      expect(result.contributedRepos[0].mergedPRCount).toBe(2)
    })

    it('calculates average repo stars', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
            totalCount: 2,
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
                  owner: { login: 'org1' },
                  name: 'repo1',
                  stargazerCount: 1000
                }
              },
              {
                state: 'MERGED',
                merged: true,
                mergedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                closedAt: new Date().toISOString(),
                additions: 50,
                deletions: 20,
                repository: {
                  owner: { login: 'org2' },
                  name: 'repo2',
                  stargazerCount: 3000
                }
              }
            ],
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

      const result = extractRepoQualityData(data, 100, sinceDate)

      expect(result.averageRepoStars).toBe(2000)
      expect(result.highestStarRepo).toBe(3000)
    })

    it('handles empty PRs', () => {
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

      const result = extractRepoQualityData(data, 100, sinceDate)

      expect(result.contributedRepos.length).toBe(0)
      expect(result.qualityRepoCount).toBe(0)
      expect(result.averageRepoStars).toBe(0)
      expect(result.highestStarRepo).toBe(0)
    })

    it('skips PRs with null repository (deleted/private repos)', () => {
      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: new Date().toISOString(),
          pullRequests: {
            totalCount: 2,
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
                  name: 'existing-repo',
                  stargazerCount: 1000
                }
              },
              {
                state: 'MERGED',
                merged: true,
                mergedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                closedAt: new Date().toISOString(),
                additions: 50,
                deletions: 20,
                repository: null // Deleted or private repo
              }
            ],
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

      const result = extractRepoQualityData(data, 100, sinceDate)

      // Should only count the PR with a valid repository
      expect(result.contributedRepos.length).toBe(1)
      expect(result.contributedRepos[0].repo).toBe('existing-repo')
    })

    it('filters PRs outside analysis window', () => {
      const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const oldDate = new Date(Date.now() - 500 * 24 * 60 * 60 * 1000)

      const data: GraphQLContributorData = {
        user: {
          login: 'test-user',
          createdAt: oldDate.toISOString(),
          pullRequests: {
            totalCount: 2,
            nodes: [
              {
                state: 'MERGED',
                merged: true,
                mergedAt: recentDate.toISOString(),
                createdAt: recentDate.toISOString(),
                closedAt: recentDate.toISOString(),
                additions: 100,
                deletions: 50,
                repository: {
                  owner: { login: 'org1' },
                  name: 'recent-repo',
                  stargazerCount: 1000
                }
              },
              {
                state: 'MERGED',
                merged: true,
                mergedAt: oldDate.toISOString(),
                createdAt: oldDate.toISOString(),
                closedAt: oldDate.toISOString(),
                additions: 50,
                deletions: 20,
                repository: {
                  owner: { login: 'org2' },
                  name: 'old-repo',
                  stargazerCount: 5000
                }
              }
            ],
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

      const result = extractRepoQualityData(data, 100, sinceDate)

      // Only recent-repo should be included
      expect(result.contributedRepos.length).toBe(1)
      expect(result.contributedRepos[0].repo).toBe('recent-repo')
    })
  })

  describe('calculateRepoQualityMetric', () => {
    it('returns neutral score for no PRs', () => {
      const data: RepoQualityData = {
        contributedRepos: [],
        qualityRepoCount: 0,
        averageRepoStars: 0,
        highestStarRepo: 0
      }

      const result = calculateRepoQualityMetric(data, 0.15, 100)

      expect(result.normalizedScore).toBe(50)
      expect(result.details).toContain('No merged PRs')
    })

    it('returns neutral score for no quality repos', () => {
      const data: RepoQualityData = {
        contributedRepos: [
          { owner: 'org', repo: 'small-repo', stars: 50, mergedPRCount: 2 }
        ],
        qualityRepoCount: 0,
        averageRepoStars: 50,
        highestStarRepo: 50
      }

      const result = calculateRepoQualityMetric(data, 0.15, 100)

      expect(result.normalizedScore).toBe(50)
      expect(result.details).toContain('none with 100+ stars')
    })

    it('gives slight bonus for 1 quality repo', () => {
      const data: RepoQualityData = {
        contributedRepos: [
          { owner: 'org', repo: 'quality-repo', stars: 500, mergedPRCount: 1 }
        ],
        qualityRepoCount: 1,
        averageRepoStars: 500,
        highestStarRepo: 500
      }

      const result = calculateRepoQualityMetric(data, 0.15, 100)

      expect(result.normalizedScore).toBe(55)
      expect(result.details).toContain('Some quality contributions')
    })

    it('gives moderate score for 2-4 quality repos', () => {
      const data: RepoQualityData = {
        contributedRepos: [
          { owner: 'org1', repo: 'repo1', stars: 500, mergedPRCount: 1 },
          { owner: 'org2', repo: 'repo2', stars: 1000, mergedPRCount: 2 },
          { owner: 'org3', repo: 'repo3', stars: 200, mergedPRCount: 1 }
        ],
        qualityRepoCount: 3,
        averageRepoStars: 567,
        highestStarRepo: 1000
      }

      const result = calculateRepoQualityMetric(data, 0.15, 100)

      expect(result.normalizedScore).toBe(65)
      expect(result.details).toContain('Moderate')
    })

    it('gives good score for 5-9 quality repos', () => {
      const data: RepoQualityData = {
        contributedRepos: Array.from({ length: 7 }, (_, i) => ({
          owner: `org${i}`,
          repo: `repo${i}`,
          stars: 500 + i * 100,
          mergedPRCount: 1
        })),
        qualityRepoCount: 7,
        averageRepoStars: 800,
        highestStarRepo: 1100
      }

      const result = calculateRepoQualityMetric(data, 0.15, 100)

      expect(result.normalizedScore).toBe(75)
      expect(result.details).toContain('Good')
    })

    it('gives excellent score for 10+ quality repos', () => {
      const data: RepoQualityData = {
        contributedRepos: Array.from({ length: 12 }, (_, i) => ({
          owner: `org${i}`,
          repo: `repo${i}`,
          stars: 500 + i * 100,
          mergedPRCount: 1
        })),
        qualityRepoCount: 12,
        averageRepoStars: 1050,
        highestStarRepo: 1600
      }

      const result = calculateRepoQualityMetric(data, 0.15, 100)

      expect(result.normalizedScore).toBe(100)
      expect(result.details).toContain('Excellent')
    })

    it('includes highest star info for notable repos', () => {
      const data: RepoQualityData = {
        contributedRepos: [
          {
            owner: 'microsoft',
            repo: 'vscode',
            stars: 150000,
            mergedPRCount: 1
          }
        ],
        qualityRepoCount: 1,
        averageRepoStars: 150000,
        highestStarRepo: 150000
      }

      const result = calculateRepoQualityMetric(data, 0.15, 100)

      expect(result.details).toContain('Highest: 150,000 stars')
    })

    it('applies weight correctly', () => {
      const data: RepoQualityData = {
        contributedRepos: Array.from({ length: 12 }, (_, i) => ({
          owner: `org${i}`,
          repo: `repo${i}`,
          stars: 500,
          mergedPRCount: 1
        })),
        qualityRepoCount: 12,
        averageRepoStars: 500,
        highestStarRepo: 500
      }

      const result = calculateRepoQualityMetric(data, 0.2, 100)

      expect(result.normalizedScore).toBe(100)
      expect(result.weightedScore).toBe(20) // 100 * 0.2
      expect(result.weight).toBe(0.2)
    })
  })
})
