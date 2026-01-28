/**
 * Spam pattern detection
 */

import type {
  PRHistoryData,
  AccountData,
  MetricResult
} from '../types/metrics.js'

/** Spam detection thresholds */
const SPAM_THRESHOLDS = {
  /** Percentage of very short PRs that triggers spam flag */
  SHORT_PR_RATIO: 0.7,

  /** Number of closed PRs that triggers burst flag */
  BURST_CLOSED_COUNT: 10,

  /** Merge rate below which burst closed is considered spam */
  BURST_MERGE_RATE: 0.2,

  /** Days threshold for new account spam */
  NEW_ACCOUNT_DAYS: 7,

  /** PR count that triggers new account spam */
  NEW_ACCOUNT_PR_COUNT: 5
}

/** Spam penalty result */
export interface SpamPenalty {
  type: 'short-prs' | 'burst-closed' | 'new-account-burst'
  penalty: number
  reason: string
}

/**
 * Detect spam patterns and return penalties
 */
export function detectSpamPatterns(
  prHistory: PRHistoryData,
  account: AccountData
): SpamPenalty[] {
  const penalties: SpamPenalty[] = []

  // Check for very short PRs pattern
  if (prHistory.totalPRs > 0) {
    const shortPRRatio = prHistory.veryShortPRs / prHistory.totalPRs

    if (shortPRRatio >= SPAM_THRESHOLDS.SHORT_PR_RATIO) {
      penalties.push({
        type: 'short-prs',
        penalty: Math.min(50 + (shortPRRatio - 0.7) * 100, 75),
        reason: `${(shortPRRatio * 100).toFixed(0)}% of PRs have fewer than 10 lines changed`
      })
    }
  }

  // Check for burst of closed PRs
  if (
    prHistory.closedWithoutMerge >= SPAM_THRESHOLDS.BURST_CLOSED_COUNT &&
    prHistory.mergeRate < SPAM_THRESHOLDS.BURST_MERGE_RATE
  ) {
    penalties.push({
      type: 'burst-closed',
      penalty: Math.min(50 + prHistory.closedWithoutMerge * 2, 75),
      reason: `${prHistory.closedWithoutMerge} PRs closed without merge (${(prHistory.mergeRate * 100).toFixed(0)}% merge rate)`
    })
  }

  // Check for new account with high activity
  if (
    account.ageInDays < SPAM_THRESHOLDS.NEW_ACCOUNT_DAYS &&
    prHistory.totalPRs > SPAM_THRESHOLDS.NEW_ACCOUNT_PR_COUNT
  ) {
    penalties.push({
      type: 'new-account-burst',
      penalty: 30,
      reason: `New account (${account.ageInDays} days) with ${prHistory.totalPRs} PRs`
    })
  }

  return penalties
}

/**
 * Calculate total spam penalty
 */
export function calculateSpamPenalty(penalties: SpamPenalty[]): number {
  const total = penalties.reduce((sum, p) => sum + p.penalty, 0)
  // Cap at 150 points total
  return Math.min(total, 150)
}

/**
 * Create spam penalty metric result
 */
export function createSpamPenaltyMetric(
  penalties: SpamPenalty[]
): MetricResult | null {
  if (penalties.length === 0) {
    return null
  }

  const totalPenalty = calculateSpamPenalty(penalties)
  const reasons = penalties.map((p) => p.reason).join('; ')

  // Convert penalty to a negative score adjustment
  // Penalty of 150 = normalized score of 0
  // No penalty = normalized score of 50
  const normalizedScore = Math.max(0, 50 - totalPenalty / 3)

  return {
    name: 'spamPenalty',
    rawValue: totalPenalty,
    normalizedScore,
    weightedScore: normalizedScore, // Applied as direct penalty
    weight: 1, // Direct application
    details: `Spam patterns detected: ${reasons}`,
    dataPoints: penalties.length
  }
}
