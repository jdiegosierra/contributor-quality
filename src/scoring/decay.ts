/**
 * Time-based decay calculations
 *
 * Activity decays toward baseline over time to:
 * - Give less weight to old activity
 * - Allow users to recover from past negative patterns
 * - Ensure recent behavior is most relevant
 */

import { SCORING_CONSTANTS } from '../types/scoring.js'

/** Months threshold for "recent" activity */
const RECENT_ACTIVITY_MONTHS = 3

/**
 * Calculate decay factor based on activity recency
 *
 * Recent activity = less decay (factor closer to 1.0)
 * Old activity = more decay (factor closer to 0.8)
 *
 * This naturally moves scores toward baseline over time
 */
export function calculateDecayFactor(activityDates: Date[]): number {
  if (activityDates.length === 0) {
    // No activity = no decay (stay at baseline)
    return SCORING_CONSTANTS.MAX_DECAY_FACTOR
  }

  const now = new Date()
  const recentThreshold = new Date(now)
  recentThreshold.setMonth(recentThreshold.getMonth() - RECENT_ACTIVITY_MONTHS)

  // Count recent vs total activity
  const recentActivity = activityDates.filter(
    (date) => date >= recentThreshold
  ).length
  const totalActivity = activityDates.length

  // Calculate recency ratio
  const recencyRatio = recentActivity / totalActivity

  // Linear interpolation between min and max decay factors
  // 100% recent = 1.0 (no decay)
  // 0% recent = 0.8 (20% decay toward baseline)
  const decayRange =
    SCORING_CONSTANTS.MAX_DECAY_FACTOR - SCORING_CONSTANTS.MIN_DECAY_FACTOR
  const decayFactor =
    SCORING_CONSTANTS.MIN_DECAY_FACTOR + recencyRatio * decayRange

  return decayFactor
}

/**
 * Apply decay to move a score toward baseline
 *
 * For scores above baseline: decay pulls down
 * For scores below baseline: decay pulls up
 *
 * This implements the "restoration" feature where
 * both positive and negative scores drift toward 500 over time
 */
export function applyDecayTowardBaseline(
  score: number,
  decayFactor: number
): number {
  const baseline = SCORING_CONSTANTS.BASELINE_SCORE

  // Calculate distance from baseline
  const distanceFromBaseline = score - baseline

  // Apply decay to the distance (not the raw score)
  const decayedDistance = distanceFromBaseline * decayFactor

  // Return new score closer to baseline
  return Math.round(baseline + decayedDistance)
}

/**
 * Calculate effective decay percentage for display
 */
export function calculateDecayPercentage(decayFactor: number): number {
  return Math.round((1 - decayFactor) * 100)
}
