/**
 * Account age and activity consistency metric calculator
 */

import type { GraphQLContributorData } from '../types/github.js'
import type { AccountData, MetricResult } from '../types/metrics.js'

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
 * Calculate account age metric score
 *
 * Scoring (bonus for established accounts, no penalty for new):
 * - 365+ days = 100 points
 * - 180-365 days = 75 points
 * - 90-180 days = 60 points
 * - 30-90 days = 55 points
 * - <30 days = 50 points (neutral, not penalized)
 */
export function calculateAccountAgeMetric(
  data: AccountData,
  weight: number
): MetricResult {
  let normalizedScore: number
  let details: string

  if (data.ageInDays >= 365) {
    normalizedScore = 100
    const years = Math.floor(data.ageInDays / 365)
    details = `Established account: ${years}+ year${years > 1 ? 's' : ''} old`
  } else if (data.ageInDays >= 180) {
    normalizedScore = 75
    details = `Mature account: ${Math.floor(data.ageInDays / 30)} months old`
  } else if (data.ageInDays >= 90) {
    normalizedScore = 60
    details = `Account age: ${Math.floor(data.ageInDays / 30)} months old`
  } else if (data.ageInDays >= 30) {
    normalizedScore = 55
    details = `Recent account: ${data.ageInDays} days old`
  } else {
    normalizedScore = 50
    details = `New account: ${data.ageInDays} days old`
  }

  return {
    name: 'accountAge',
    rawValue: data.ageInDays,
    normalizedScore,
    weightedScore: normalizedScore * weight,
    weight,
    details,
    dataPoints: 1
  }
}

/**
 * Calculate activity consistency metric score
 *
 * Scoring:
 * - 12/12 months active = 100 points
 * - 9-11 months active = 85 points
 * - 6-8 months active = 70 points
 * - 3-5 months active = 55 points
 * - <3 months active = 50 points (neutral for new accounts)
 */
export function calculateActivityConsistencyMetric(
  data: AccountData,
  weight: number
): MetricResult {
  let normalizedScore: number
  let details: string

  const activeMonths = data.monthsWithActivity
  const totalMonths = data.totalMonthsInWindow

  // For accounts younger than analysis window, adjust expectations
  const effectiveMonths = Math.min(totalMonths, Math.ceil(data.ageInDays / 30))

  if (effectiveMonths === 0) {
    normalizedScore = 50
    details = 'Account too new to evaluate consistency'
  } else {
    const ratio = activeMonths / effectiveMonths

    if (ratio >= 0.9) {
      normalizedScore = 100
      details = `Very consistent: Active in ${activeMonths}/${effectiveMonths} months`
    } else if (ratio >= 0.7) {
      normalizedScore = 85
      details = `Consistent: Active in ${activeMonths}/${effectiveMonths} months`
    } else if (ratio >= 0.5) {
      normalizedScore = 70
      details = `Moderate consistency: Active in ${activeMonths}/${effectiveMonths} months`
    } else if (ratio >= 0.25) {
      normalizedScore = 55
      details = `Occasional activity: Active in ${activeMonths}/${effectiveMonths} months`
    } else {
      normalizedScore = 50
      details = `Sparse activity: Active in ${activeMonths}/${effectiveMonths} months`
    }
  }

  return {
    name: 'activityConsistency',
    rawValue: data.consistencyScore,
    normalizedScore,
    weightedScore: normalizedScore * weight,
    weight,
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
