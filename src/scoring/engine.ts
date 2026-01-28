/**
 * Main evaluation engine that checks all metrics against thresholds
 */

import type { GraphQLContributorData } from '../types/github.js'
import type { ContributorQualityConfig } from '../types/config.js'
import type { MetricCheckResult, AllMetricsData } from '../types/metrics.js'
import type { AnalysisResult } from '../types/scoring.js'
import { ANALYSIS_CONSTANTS } from '../types/scoring.js'

import {
  extractPRHistoryData,
  checkPRMergeRate,
  extractRepoQualityData,
  checkRepoQuality,
  extractReactionData,
  checkPositiveReactions,
  checkNegativeReactions,
  extractAccountData,
  checkAccountAge,
  checkActivityConsistency,
  isNewAccount,
  extractIssueEngagementData,
  checkIssueEngagement,
  extractCodeReviewData,
  checkCodeReviews
} from '../metrics/index.js'

/**
 * Extract all metrics data from GraphQL response
 */
export function extractAllMetrics(
  data: GraphQLContributorData,
  config: ContributorQualityConfig,
  sinceDate: Date
): AllMetricsData {
  return {
    prHistory: extractPRHistoryData(data, sinceDate),
    repoQuality: extractRepoQualityData(data, config.minimumStars, sinceDate),
    reactions: extractReactionData(data),
    account: extractAccountData(data, config.analysisWindowMonths),
    issueEngagement: extractIssueEngagementData(data, sinceDate),
    codeReviews: extractCodeReviewData(data)
  }
}

/**
 * Check all metrics against their thresholds
 */
export function checkAllMetrics(
  metricsData: AllMetricsData,
  config: ContributorQualityConfig
): MetricCheckResult[] {
  const thresholds = config.thresholds

  return [
    checkPRMergeRate(metricsData.prHistory, thresholds.prMergeRate),
    checkRepoQuality(
      metricsData.repoQuality,
      thresholds.repoQuality,
      config.minimumStars
    ),
    checkPositiveReactions(metricsData.reactions, thresholds.positiveReactions),
    checkNegativeReactions(metricsData.reactions, thresholds.negativeReactions),
    checkAccountAge(metricsData.account, thresholds.accountAge),
    checkActivityConsistency(
      metricsData.account,
      thresholds.activityConsistency
    ),
    checkIssueEngagement(
      metricsData.issueEngagement,
      thresholds.issueEngagement
    ),
    checkCodeReviews(metricsData.codeReviews, thresholds.codeReviews)
  ]
}

/**
 * Determine if all required metrics passed
 */
export function determinePassStatus(
  metrics: MetricCheckResult[],
  requiredMetrics: string[]
): boolean {
  // If no required metrics specified, all must pass
  if (requiredMetrics.length === 0) {
    return metrics.every((m) => m.passed)
  }

  // Check only the required metrics
  return requiredMetrics.every((requiredName) => {
    const metric = metrics.find((m) => m.name === requiredName)
    return metric ? metric.passed : true // If metric not found, assume pass
  })
}

/**
 * Generate recommendations based on failed metrics
 */
export function generateRecommendations(
  metricsData: AllMetricsData,
  metrics: MetricCheckResult[]
): string[] {
  const recommendations: string[] = []
  const failedMetrics = metrics.filter((m) => !m.passed)

  for (const metric of failedMetrics) {
    switch (metric.name) {
      case 'prMergeRate':
        recommendations.push(
          'Improve PR quality to increase merge rate. Focus on smaller, well-documented changes.'
        )
        break
      case 'repoQuality':
        recommendations.push(
          'Consider contributing to established open source projects with significant community adoption.'
        )
        break
      case 'codeReviews':
        recommendations.push(
          'Participate in code reviews to demonstrate engagement with the community.'
        )
        break
      case 'negativeReactions':
        recommendations.push(
          'Focus on constructive communication to improve community reception.'
        )
        break
      case 'accountAge':
        recommendations.push(
          'Continue building your contribution history. New accounts naturally have limited data.'
        )
        break
      case 'activityConsistency':
        if (metricsData.account.ageInDays >= 90) {
          recommendations.push(
            'Maintain consistent activity over time to build a stronger contribution profile.'
          )
        }
        break
      case 'positiveReactions':
        recommendations.push(
          'Engage more with the community through helpful comments and discussions.'
        )
        break
      case 'issueEngagement':
        recommendations.push(
          'Create issues to report bugs or suggest features, and engage with the community.'
        )
        break
    }
  }

  // General recommendation if no specific recommendations
  if (recommendations.length === 0 && failedMetrics.length > 0) {
    recommendations.push(
      'Build your GitHub profile through meaningful contributions, code reviews, and community engagement.'
    )
  }

  return recommendations
}

/**
 * Main evaluation function
 */
export function evaluateContributor(
  data: GraphQLContributorData,
  config: ContributorQualityConfig,
  sinceDate: Date
): AnalysisResult {
  const username = data.user.login
  const now = new Date()

  // Extract all metrics data
  const metricsData = extractAllMetrics(data, config, sinceDate)

  // Check all metrics against thresholds
  const metrics = checkAllMetrics(metricsData, config)

  // Determine pass/fail based on required metrics
  const passed = determinePassStatus(metrics, config.requiredMetrics)

  // Calculate counts
  const passedCount = metrics.filter((m) => m.passed).length
  const failedMetrics = metrics.filter((m) => !m.passed).map((m) => m.name)

  // Check account status
  const accountIsNew = isNewAccount(
    metricsData.account,
    config.newAccountThresholdDays
  )
  const totalDataPoints = metrics.reduce((sum, m) => sum + m.dataPoints, 0)
  const hasLimitedData =
    totalDataPoints < ANALYSIS_CONSTANTS.MIN_CONTRIBUTIONS_FOR_DATA

  // Generate recommendations based on failed metrics
  const recommendations = generateRecommendations(metricsData, metrics)

  return {
    passed,
    passedCount,
    totalMetrics: metrics.length,
    metrics,
    failedMetrics,
    username,
    analyzedAt: now,
    dataWindowStart: sinceDate,
    dataWindowEnd: now,
    recommendations,
    isNewAccount: accountIsNew,
    hasLimitedData,
    isTrustedUser: false,
    wasWhitelisted: false
  }
}
