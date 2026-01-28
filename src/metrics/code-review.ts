/**
 * Code review contribution metric calculator
 */

import type { GraphQLContributorData } from '../types/github.js'
import type { CodeReviewData, MetricResult } from '../types/metrics.js'

/**
 * Extract code review data from GraphQL response
 */
export function extractCodeReviewData(
  data: GraphQLContributorData
): CodeReviewData {
  const reviewCount =
    data.user.contributionsCollection.pullRequestReviewContributions.totalCount

  // We don't have detailed review data in the current query,
  // so we use the count and estimate comments
  const estimatedComments = Math.floor(reviewCount * 0.5) // Rough estimate

  return {
    reviewsGiven: reviewCount,
    reviewCommentsGiven: estimatedComments,
    reviewedRepos: [] // Would need additional query
  }
}

/**
 * Calculate code review metric score
 *
 * Giving thoughtful code reviews is a strong positive signal of
 * community engagement and technical contribution.
 *
 * Scoring:
 * - 20+ reviews = 100 points
 * - 10-19 reviews = 80 points
 * - 5-9 reviews = 65 points
 * - 1-4 reviews = 55 points
 * - 0 reviews = 50 points (neutral)
 */
export function calculateCodeReviewMetric(
  data: CodeReviewData,
  weight: number
): MetricResult {
  let normalizedScore: number
  let details: string

  const reviews = data.reviewsGiven

  if (reviews === 0) {
    normalizedScore = 50
    details = 'No code reviews given in analysis window'
  } else if (reviews >= 20) {
    normalizedScore = 100
    details = `Excellent reviewer: ${reviews} code reviews given`
  } else if (reviews >= 10) {
    normalizedScore = 80
    details = `Active reviewer: ${reviews} code reviews given`
  } else if (reviews >= 5) {
    normalizedScore = 65
    details = `Some reviews: ${reviews} code reviews given`
  } else {
    normalizedScore = 55
    details = `Few reviews: ${reviews} code reviews given`
  }

  return {
    name: 'codeReviews',
    rawValue: reviews,
    normalizedScore,
    weightedScore: normalizedScore * weight,
    weight,
    details,
    dataPoints: reviews
  }
}
