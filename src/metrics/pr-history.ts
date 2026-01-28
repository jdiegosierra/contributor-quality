/**
 * PR history metric calculator
 */

import type { GraphQLContributorData } from '../types/github.js'
import type { PRHistoryData, MetricResult } from '../types/metrics.js'

/** Threshold for very short PRs (potential spam indicator) */
const VERY_SHORT_PR_THRESHOLD = 10

/**
 * Extract PR history data from GraphQL response
 */
export function extractPRHistoryData(
  data: GraphQLContributorData,
  sinceDate: Date
): PRHistoryData {
  const prs = data.user.pullRequests.nodes.filter((pr) => {
    const prDate = new Date(pr.createdAt)
    return prDate >= sinceDate
  })

  const mergedPRs = prs.filter((pr) => pr.merged)
  const closedWithoutMerge = prs.filter(
    (pr) => pr.state === 'CLOSED' && !pr.merged
  )
  const openPRs = prs.filter((pr) => pr.state === 'OPEN')

  const totalLines = prs.reduce(
    (sum, pr) => sum + pr.additions + pr.deletions,
    0
  )
  const averagePRSize = prs.length > 0 ? totalLines / prs.length : 0

  const veryShortPRs = prs.filter(
    (pr) => pr.additions + pr.deletions < VERY_SHORT_PR_THRESHOLD
  ).length

  const mergedPRDates = mergedPRs
    .filter((pr) => pr.mergedAt)
    .map((pr) => new Date(pr.mergedAt!))

  // Calculate merge rate only from resolved PRs (not open ones)
  const resolvedPRs = mergedPRs.length + closedWithoutMerge.length
  const mergeRate = resolvedPRs > 0 ? mergedPRs.length / resolvedPRs : 0

  return {
    totalPRs: prs.length,
    mergedPRs: mergedPRs.length,
    closedWithoutMerge: closedWithoutMerge.length,
    openPRs: openPRs.length,
    mergeRate,
    averagePRSize,
    veryShortPRs,
    mergedPRDates
  }
}

/**
 * Calculate PR history metric score
 *
 * Scoring:
 * - 90%+ merge rate = +100 points
 * - 70-90% = +50 to +100 (linear)
 * - 30-70% = 0 (neutral zone)
 * - <30% = -100 to 0 (linear penalty)
 */
export function calculatePRHistoryMetric(
  data: PRHistoryData,
  weight: number
): MetricResult {
  // No data = neutral score
  if (data.totalPRs === 0) {
    return {
      name: 'prMergeRate',
      rawValue: 0,
      normalizedScore: 50, // Neutral
      weightedScore: 50 * weight,
      weight,
      details: 'No PR history found in analysis window',
      dataPoints: 0
    }
  }

  let normalizedScore: number
  let details: string

  const mergeRate = data.mergeRate

  if (mergeRate >= 0.9) {
    normalizedScore = 100
    details = `Excellent merge rate: ${(mergeRate * 100).toFixed(1)}% (${data.mergedPRs}/${data.mergedPRs + data.closedWithoutMerge} PRs merged)`
  } else if (mergeRate >= 0.7) {
    // Linear interpolation from 50 to 100
    normalizedScore = 50 + ((mergeRate - 0.7) / 0.2) * 50
    details = `Good merge rate: ${(mergeRate * 100).toFixed(1)}% (${data.mergedPRs}/${data.mergedPRs + data.closedWithoutMerge} PRs merged)`
  } else if (mergeRate >= 0.3) {
    // Neutral zone
    normalizedScore = 50
    details = `Average merge rate: ${(mergeRate * 100).toFixed(1)}% (${data.mergedPRs}/${data.mergedPRs + data.closedWithoutMerge} PRs merged)`
  } else {
    // Linear penalty from 50 down to 0
    normalizedScore = (mergeRate / 0.3) * 50
    details = `Low merge rate: ${(mergeRate * 100).toFixed(1)}% (${data.mergedPRs}/${data.mergedPRs + data.closedWithoutMerge} PRs merged)`
  }

  return {
    name: 'prMergeRate',
    rawValue: mergeRate,
    normalizedScore,
    weightedScore: normalizedScore * weight,
    weight,
    details,
    dataPoints: data.totalPRs
  }
}
