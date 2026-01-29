/**
 * Sample API responses for testing
 */
import type { GraphQLContributorData } from '../../src/types/github.js'

/** Quality contributor with good history */
export const qualityContributorResponse: GraphQLContributorData = {
  user: {
    login: 'quality-user',
    createdAt: '2020-01-01T00:00:00Z',
    pullRequests: {
      totalCount: 25,
      nodes: [
        {
          state: 'MERGED',
          merged: true,
          mergedAt: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
          ).toISOString(), // 7 days ago
          createdAt: new Date(
            Date.now() - 8 * 24 * 60 * 60 * 1000
          ).toISOString(),
          closedAt: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          additions: 150,
          deletions: 50,
          repository: {
            owner: { login: 'microsoft' },
            name: 'vscode',
            stargazerCount: 150000
          }
        },
        {
          state: 'MERGED',
          merged: true,
          mergedAt: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          createdAt: new Date(
            Date.now() - 35 * 24 * 60 * 60 * 1000
          ).toISOString(),
          closedAt: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          additions: 200,
          deletions: 75,
          repository: {
            owner: { login: 'facebook' },
            name: 'react',
            stargazerCount: 200000
          }
        },
        {
          state: 'MERGED',
          merged: true,
          mergedAt: new Date(
            Date.now() - 60 * 24 * 60 * 60 * 1000
          ).toISOString(),
          createdAt: new Date(
            Date.now() - 65 * 24 * 60 * 60 * 1000
          ).toISOString(),
          closedAt: new Date(
            Date.now() - 60 * 24 * 60 * 60 * 1000
          ).toISOString(),
          additions: 100,
          deletions: 20,
          repository: {
            owner: { login: 'vercel' },
            name: 'next.js',
            stargazerCount: 100000
          }
        },
        {
          state: 'CLOSED',
          merged: false,
          mergedAt: null,
          createdAt: new Date(
            Date.now() - 90 * 24 * 60 * 60 * 1000
          ).toISOString(),
          closedAt: new Date(
            Date.now() - 85 * 24 * 60 * 60 * 1000
          ).toISOString(),
          additions: 50,
          deletions: 10,
          repository: {
            owner: { login: 'other' },
            name: 'repo',
            stargazerCount: 50
          }
        }
      ],
      pageInfo: {
        hasNextPage: false,
        endCursor: null
      }
    },
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: 500,
        weeks: Array.from({ length: 52 }, (_, i) => ({
          contributionDays: Array.from({ length: 7 }, (_, j) => ({
            contributionCount: Math.floor(Math.random() * 5),
            date: new Date(Date.now() - (i * 7 + j) * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0]
          }))
        }))
      },
      pullRequestReviewContributions: {
        totalCount: 25
      }
    },
    issueComments: {
      totalCount: 50,
      nodes: Array.from({ length: 20 }, () => ({
        createdAt: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
        reactions: {
          nodes: [
            { content: 'THUMBS_UP' as const },
            { content: 'HEART' as const }
          ]
        }
      })),
      pageInfo: { hasNextPage: false, endCursor: null }
    }
  },
  issueSearch: {
    issueCount: 10,
    nodes: [
      {
        createdAt: new Date(
          Date.now() - 14 * 24 * 60 * 60 * 1000
        ).toISOString(),
        comments: { totalCount: 5 },
        reactions: {
          nodes: [
            { content: 'THUMBS_UP' as const },
            { content: 'HEART' as const },
            { content: 'THUMBS_UP' as const },
            { content: 'ROCKET' as const }
          ]
        }
      },
      {
        createdAt: new Date(
          Date.now() - 60 * 24 * 60 * 60 * 1000
        ).toISOString(),
        comments: { totalCount: 3 },
        reactions: {
          nodes: [
            { content: 'THUMBS_UP' as const },
            { content: 'HEART' as const }
          ]
        }
      }
    ]
  }
}

/** Spam-like contributor pattern */
export const spamContributorResponse: GraphQLContributorData = {
  user: {
    login: 'spam-user',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    pullRequests: {
      totalCount: 15,
      nodes: Array.from({ length: 15 }, (_, i) => ({
        state: i < 2 ? 'MERGED' : 'CLOSED',
        merged: i < 2,
        mergedAt:
          i < 2
            ? new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
            : null,
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        closedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        additions: 3, // Very short PRs
        deletions: 1,
        repository: {
          owner: { login: 'random' },
          name: `repo-${i}`,
          stargazerCount: 10
        }
      })) as GraphQLContributorData['user']['pullRequests']['nodes'],
      pageInfo: {
        hasNextPage: false,
        endCursor: null
      }
    },
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: 15,
        weeks: [
          {
            contributionDays: Array.from({ length: 5 }, (_, i) => ({
              contributionCount: 3,
              date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0]
            }))
          }
        ]
      },
      pullRequestReviewContributions: {
        totalCount: 0
      }
    },
    issueComments: {
      totalCount: 5,
      nodes: Array.from({ length: 5 }, () => ({
        createdAt: new Date().toISOString(),
        reactions: {
          nodes: [
            { content: 'THUMBS_DOWN' as const },
            { content: 'CONFUSED' as const }
          ]
        }
      })),
      pageInfo: { hasNextPage: false, endCursor: null }
    }
  },
  issueSearch: {
    issueCount: 0,
    nodes: []
  }
}

/** New user with no history */
export const newUserResponse: GraphQLContributorData = {
  user: {
    login: 'new-user',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    pullRequests: {
      totalCount: 0,
      nodes: [],
      pageInfo: {
        hasNextPage: false,
        endCursor: null
      }
    },
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: 0,
        weeks: []
      },
      pullRequestReviewContributions: {
        totalCount: 0
      }
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
