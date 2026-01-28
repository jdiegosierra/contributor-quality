/**
 * Main scoring engine that aggregates all metrics
 */

import type { GraphQLContributorData } from '../types/github.js'
import type { ContributorQualityConfig } from '../types/config.js'
import type { MetricResult, AllMetricsData } from '../types/metrics.js'
import type { ScoringResult, ScoreBreakdown } from '../types/scoring.js'
import { SCORING_CONSTANTS } from '../types/scoring.js'

import {
  extractPRHistoryData,
  calculatePRHistoryMetric,
  extractRepoQualityData,
  calculateRepoQualityMetric,
  extractReactionData,
  calculatePositiveReactionsMetric,
  calculateNegativeReactionsMetric,
  extractAccountData,
  calculateAccountAgeMetric,
  calculateActivityConsistencyMetric,
  isNewAccount,
  extractIssueEngagementData,
  calculateIssueEngagementMetric,
  extractCodeReviewData,
  calculateCodeReviewMetric,
  detectSpamPatterns,
  calculateSpamPenalty
} from '../metrics/index.js'

import { calculateDecayFactor, applyDecayTowardBaseline } from './decay.js'
import { normalizeScore } from './normalizer.js'

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
 * Calculate all metric scores
 */
export function calculateAllMetrics(
  metricsData: AllMetricsData,
  config: ContributorQualityConfig
): MetricResult[] {
  const weights = config.weights

  return [
    calculatePRHistoryMetric(metricsData.prHistory, weights.prMergeRate),
    calculateRepoQualityMetric(
      metricsData.repoQuality,
      weights.repoQuality,
      config.minimumStars
    ),
    calculatePositiveReactionsMetric(
      metricsData.reactions,
      weights.positiveReactions
    ),
    calculateNegativeReactionsMetric(
      metricsData.reactions,
      weights.negativeReactions
    ),
    calculateAccountAgeMetric(metricsData.account, weights.accountAge),
    calculateActivityConsistencyMetric(
      metricsData.account,
      weights.activityConsistency
    ),
    calculateIssueEngagementMetric(
      metricsData.issueEngagement,
      weights.issueEngagement
    ),
    calculateCodeReviewMetric(metricsData.codeReviews, weights.codeReviews)
  ]
}

/**
 * Calculate detailed score breakdown
 */
export function calculateBreakdown(
  metrics: MetricResult[],
  spamPenalty: number
): ScoreBreakdown {
  const positiveAdjustments = metrics
    .filter((m) => m.normalizedScore > 50)
    .map((m) => ({
      metric: m.name,
      points: Math.round((m.normalizedScore - 50) * m.weight * 10),
      reason: m.details
    }))

  const negativeAdjustments = metrics
    .filter((m) => m.normalizedScore < 50)
    .map((m) => ({
      metric: m.name,
      points: Math.round((50 - m.normalizedScore) * m.weight * 10),
      reason: m.details
    }))

  const spamPenalties =
    spamPenalty > 0
      ? [
          {
            metric: 'spamPatterns',
            points: spamPenalty,
            reason: 'Spam pattern detection penalty'
          }
        ]
      : []

  // Calculate final score from weighted averages
  const weightedSum = metrics.reduce((sum, m) => sum + m.weightedScore, 0)
  const baseScore = normalizeScore(weightedSum)
  const finalScore = Math.max(
    SCORING_CONSTANTS.MIN_SCORE,
    Math.min(SCORING_CONSTANTS.MAX_SCORE, baseScore - spamPenalty)
  )

  return {
    baselineScore: SCORING_CONSTANTS.BASELINE_SCORE,
    positiveAdjustments,
    negativeAdjustments,
    spamPenalties,
    finalScore
  }
}

/**
 * Generate recommendations based on scoring
 */
export function generateRecommendations(
  metricsData: AllMetricsData,
  metrics: MetricResult[],
  score: number
): string[] {
  const recommendations: string[] = []

  // Low merge rate recommendation
  const prMetric = metrics.find((m) => m.name === 'prMergeRate')
  if (prMetric && prMetric.normalizedScore < 50) {
    recommendations.push(
      'Improve PR quality to increase merge rate. Focus on smaller, well-documented changes.'
    )
  }

  // No quality repo contributions
  const repoMetric = metrics.find((m) => m.name === 'repoQuality')
  if (repoMetric && metricsData.repoQuality.qualityRepoCount === 0) {
    recommendations.push(
      'Consider contributing to established open source projects with significant community adoption.'
    )
  }

  // Low code review activity
  const reviewMetric = metrics.find((m) => m.name === 'codeReviews')
  if (reviewMetric && metricsData.codeReviews.reviewsGiven < 5) {
    recommendations.push(
      'Participate in code reviews to demonstrate engagement with the community.'
    )
  }

  // Negative reactions
  const negReactionMetric = metrics.find((m) => m.name === 'negativeReactions')
  if (negReactionMetric && negReactionMetric.normalizedScore < 40) {
    recommendations.push(
      'Focus on constructive communication to improve community reception.'
    )
  }

  // New account
  if (metricsData.account.ageInDays < 30) {
    recommendations.push(
      'Continue building your contribution history. New accounts naturally have limited data.'
    )
  }

  // Low activity consistency
  const consistencyMetric = metrics.find(
    (m) => m.name === 'activityConsistency'
  )
  if (
    consistencyMetric &&
    consistencyMetric.normalizedScore < 60 &&
    metricsData.account.ageInDays >= 90
  ) {
    recommendations.push(
      'Maintain consistent activity over time to build a stronger contribution profile.'
    )
  }

  // Overall low score
  if (score < 300 && recommendations.length === 0) {
    recommendations.push(
      'Build your GitHub profile through meaningful contributions, code reviews, and community engagement.'
    )
  }

  return recommendations
}

/**
 * Main scoring function
 */
export function calculateScore(
  data: GraphQLContributorData,
  config: ContributorQualityConfig,
  sinceDate: Date
): ScoringResult {
  const username = data.user.login
  const now = new Date()

  // Extract all metrics data
  const metricsData = extractAllMetrics(data, config, sinceDate)

  // Calculate individual metric scores
  const metrics = calculateAllMetrics(metricsData, config)

  // Detect spam patterns
  const spamPatterns = detectSpamPatterns(
    metricsData.prHistory,
    metricsData.account
  )
  const spamPenalty = calculateSpamPenalty(spamPatterns)

  // Calculate decay factor based on activity recency
  const decayFactor = calculateDecayFactor(metricsData.prHistory.mergedPRDates)

  // Calculate weighted score
  const weightedSum = metrics.reduce((sum, m) => sum + m.weightedScore, 0)
  const rawScore = normalizeScore(weightedSum)

  // Apply spam penalty first
  const scoreAfterPenalty = rawScore - spamPenalty

  // Apply decay toward baseline (this moves score toward 500)
  // Decay is applied to the distance from baseline, not the raw score
  const decayedScore = applyDecayTowardBaseline(scoreAfterPenalty, decayFactor)

  // Clamp to valid range
  const finalScore = Math.max(
    SCORING_CONSTANTS.MIN_SCORE,
    Math.min(SCORING_CONSTANTS.MAX_SCORE, decayedScore)
  )

  // Determine pass/fail
  const passed = finalScore >= config.minimumScore

  // Check account status
  const accountIsNew = isNewAccount(
    metricsData.account,
    config.newAccountThresholdDays
  )
  const totalDataPoints = metrics.reduce((sum, m) => sum + m.dataPoints, 0)
  const hasLimitedData =
    totalDataPoints < SCORING_CONSTANTS.MIN_CONTRIBUTIONS_FOR_DATA

  // Generate recommendations
  const recommendations = generateRecommendations(
    metricsData,
    metrics,
    finalScore
  )

  return {
    score: finalScore,
    rawScore,
    decayFactor,
    passed,
    threshold: config.minimumScore,
    metrics,
    username,
    analyzedAt: now,
    dataWindowStart: sinceDate,
    dataWindowEnd: now,
    totalDataPoints,
    recommendations,
    isNewAccount: accountIsNew,
    hasLimitedData,
    isTrustedUser: false,
    wasWhitelisted: false
  }
}
