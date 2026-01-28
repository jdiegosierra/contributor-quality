/**
 * Score normalization utilities
 */

import { SCORING_CONSTANTS } from '../types/scoring.js'

/**
 * Normalize weighted metric sum to 0-1000 scale
 *
 * Input: sum of (normalizedScore * weight) values
 * - Each metric has normalizedScore 0-100
 * - Each metric has weight summing to 1.0
 * - So weighted sum ranges from 0 to 100
 *
 * Output: score on 0-1000 scale
 * - 50 average (neutral) -> 500 baseline
 * - 100 maximum -> 1000
 * - 0 minimum -> 0
 */
export function normalizeScore(weightedSum: number): number {
  // weightedSum is 0-100, convert to 0-1000
  return Math.round(weightedSum * 10)
}

/**
 * Clamp score to valid range
 */
export function clampScore(score: number): number {
  return Math.max(
    SCORING_CONSTANTS.MIN_SCORE,
    Math.min(SCORING_CONSTANTS.MAX_SCORE, score)
  )
}

/**
 * Calculate the adjustment from baseline
 */
export function calculateAdjustment(score: number): number {
  return score - SCORING_CONSTANTS.BASELINE_SCORE
}

/**
 * Get score category for display
 */
export function getScoreCategory(
  score: number
): 'excellent' | 'good' | 'average' | 'low' | 'poor' {
  if (score >= 800) return 'excellent'
  if (score >= 600) return 'good'
  if (score >= 400) return 'average'
  if (score >= 200) return 'low'
  return 'poor'
}

/**
 * Get category emoji for display
 */
export function getScoreEmoji(score: number): string {
  const category = getScoreCategory(score)
  switch (category) {
    case 'excellent':
      return '🌟'
    case 'good':
      return '✅'
    case 'average':
      return '📊'
    case 'low':
      return '⚠️'
    case 'poor':
      return '🚨'
  }
}

/**
 * Format score for display
 */
export function formatScore(score: number): string {
  return `${score}/1000`
}

/**
 * Calculate percentage of maximum score
 */
export function scoreToPercentage(score: number): number {
  return Math.round((score / SCORING_CONSTANTS.MAX_SCORE) * 100)
}
