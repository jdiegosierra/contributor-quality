/**
 * Account age and activity consistency metric calculator
 */

import type { GraphQLContributorData } from '../types/github.js'
import type { AccountData, MetricCheckResult } from '../types/metrics.js'

/**
 * Extract account data from GraphQL response
 */
export function extractAccountData(
  data: GraphQLContributorData,
  analysisWindowMonths: number
): AccountData {
  const createdAt = new Date(data.user.createdAt)
  const now = new Date()
  const ageInDays = Math.floor(
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Analyze contribution calendar for consistency
  const calendar = data.user.contributionsCollection.contributionCalendar
  const monthsWithActivity = new Set<string>()

  for (const week of calendar.weeks) {
    for (const day of week.contributionDays) {
      if (day.contributionCount > 0) {
        // Extract year-month from date
        const [year, month] = day.date.split('-')
        monthsWithActivity.add(`${year}-${month}`)
      }
    }
  }

  // Calculate consistency score (activity spread across months)
  const totalMonthsInWindow = Math.min(analysisWindowMonths, 12)
  const activeMonths = monthsWithActivity.size
  const consistencyScore =
    totalMonthsInWindow > 0 ? activeMonths / totalMonthsInWindow : 0

  return {
    createdAt,
    ageInDays,
    monthsWithActivity: activeMonths,
    totalMonthsInWindow,
    consistencyScore
  }
}

/**
 * Check account age against threshold
 *
 * @param data - Extracted account data
 * @param threshold - Minimum account age in days to pass
 * @returns MetricCheckResult with pass/fail status
 */
export function checkAccountAge(
  data: AccountData,
  threshold: number
): MetricCheckResult {
  const ageInDays = data.ageInDays
  const passed = ageInDays >= threshold

  let details: string

  if (ageInDays >= 365) {
    const years = Math.floor(ageInDays / 365)
    details = `Account is ${years}+ year${years > 1 ? 's' : ''} old (${ageInDays} days)`
  } else if (ageInDays >= 30) {
    details = `Account is ${Math.floor(ageInDays / 30)} months old (${ageInDays} days)`
  } else {
    details = `Account is ${ageInDays} days old`
  }

  details += passed
    ? ` (meets threshold >= ${threshold} days)`
    : ` (below threshold >= ${threshold} days)`

  return {
    name: 'accountAge',
    rawValue: ageInDays,
    threshold,
    passed,
    details,
    dataPoints: 1
  }
}

/**
 * Check activity consistency against threshold
 *
 * @param data - Extracted account data
 * @param threshold - Minimum consistency score (0-1) to pass
 * @returns MetricCheckResult with pass/fail status
 */
export function checkActivityConsistency(
  data: AccountData,
  threshold: number
): MetricCheckResult {
  const consistencyScore = data.consistencyScore
  const passed = consistencyScore >= threshold

  const activeMonths = data.monthsWithActivity
  const totalMonths = data.totalMonthsInWindow

  let details: string

  // For accounts younger than analysis window, adjust expectations
  const effectiveMonths = Math.min(totalMonths, Math.ceil(data.ageInDays / 30))

  if (effectiveMonths === 0) {
    details = 'Account too new to evaluate consistency'
  } else {
    const percentage = (consistencyScore * 100).toFixed(0)
    details = `Active in ${activeMonths}/${effectiveMonths} months (${percentage}% consistency)`
  }

  const thresholdPercent = (threshold * 100).toFixed(0)
  details += passed
    ? ` (meets threshold >= ${thresholdPercent}%)`
    : ` (below threshold >= ${thresholdPercent}%)`

  return {
    name: 'activityConsistency',
    rawValue: consistencyScore,
    threshold,
    passed,
    details,
    dataPoints: activeMonths
  }
}

/**
 * Check if account is considered "new" based on threshold
 */
export function isNewAccount(
  data: AccountData,
  thresholdDays: number
): boolean {
  return data.ageInDays < thresholdDays
}
