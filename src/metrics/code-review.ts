/**
 * Code review contribution metric calculator
 */

import type { GraphQLContributorData } from '../types/github.js'
import type { CodeReviewData, MetricCheckResult } from '../types/metrics.js'

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
 * Check code reviews against threshold
 *
 * @param data - Extracted code review data
 * @param threshold - Minimum reviews given to pass
 * @returns MetricCheckResult with pass/fail status
 */
export function checkCodeReviews(
  data: CodeReviewData,
  threshold: number
): MetricCheckResult {
  const reviewsGiven = data.reviewsGiven
  const passed = reviewsGiven >= threshold

  let details: string

  if (reviewsGiven === 0) {
    details = 'No code reviews given in analysis window'
  } else {
    details = `${reviewsGiven} code reviews given`
  }

  if (threshold > 0) {
    details += passed
      ? ` (meets threshold >= ${threshold})`
      : ` (below threshold >= ${threshold})`
  }

  return {
    name: 'codeReviews',
    rawValue: reviewsGiven,
    threshold,
    passed,
    details,
    dataPoints: reviewsGiven
  }
}
