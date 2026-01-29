/**
 * PR history metric calculator
 */

import type { GraphQLContributorData } from '../types/github.js'
import type { PRHistoryData, MetricCheckResult } from '../types/metrics.js'

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
 * Check PR merge rate against threshold
 *
 * @param data - Extracted PR history data
 * @param threshold - Minimum merge rate (0-1) to pass
 * @returns MetricCheckResult with pass/fail status
 */
export function checkPRMergeRate(
  data: PRHistoryData,
  threshold: number
): MetricCheckResult {
  // No data = neutral (pass if threshold is 0)
  if (data.totalPRs === 0) {
    return {
      name: 'prMergeRate',
      rawValue: 0,
      threshold,
      passed: threshold === 0,
      details: 'No PR history found in analysis window',
      dataPoints: 0
    }
  }

  const mergeRate = data.mergeRate
  const passed = mergeRate >= threshold

  let details: string
  const mergeRatePercent = (mergeRate * 100).toFixed(1)
  const thresholdPercent = (threshold * 100).toFixed(0)
  const prInfo = `${data.mergedPRs}/${data.mergedPRs + data.closedWithoutMerge} PRs merged`

  if (passed) {
    details = `Merge rate ${mergeRatePercent}% meets threshold (>= ${thresholdPercent}%). ${prInfo}`
  } else {
    details = `Merge rate ${mergeRatePercent}% below threshold (>= ${thresholdPercent}%). ${prInfo}`
  }

  return {
    name: 'prMergeRate',
    rawValue: mergeRate,
    threshold,
    passed,
    details,
    dataPoints: data.totalPRs
  }
}
