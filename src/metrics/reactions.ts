/**
 * Reactions metric calculator
 */

import type {
  GraphQLContributorData,
  GitHubReactionContent
} from '../types/github.js'
import type { ReactionData, MetricResult } from '../types/metrics.js'
import { POSITIVE_REACTIONS, NEGATIVE_REACTIONS } from '../types/metrics.js'

/**
 * Extract reaction data from GraphQL response
 */
export function extractReactionData(
  data: GraphQLContributorData
): ReactionData {
  const comments = data.user.issueComments.nodes

  let positiveCount = 0
  let negativeCount = 0
  let neutralCount = 0

  for (const comment of comments) {
    for (const reaction of comment.reactions.nodes) {
      const content = reaction.content as GitHubReactionContent

      if (
        POSITIVE_REACTIONS.includes(
          content as (typeof POSITIVE_REACTIONS)[number]
        )
      ) {
        positiveCount++
      } else if (
        NEGATIVE_REACTIONS.includes(
          content as (typeof NEGATIVE_REACTIONS)[number]
        )
      ) {
        negativeCount++
      } else {
        neutralCount++
      }
    }
  }

  const totalReactions = positiveCount + negativeCount + neutralCount
  const positiveRatio =
    totalReactions > 0 ? positiveCount / totalReactions : 0.5

  return {
    totalComments: comments.length,
    positiveReactions: positiveCount,
    negativeReactions: negativeCount,
    neutralReactions: neutralCount,
    positiveRatio
  }
}

/**
 * Calculate positive reactions metric score
 *
 * Scoring:
 * - <5 total reactions = 50 (neutral, insufficient data)
 * - 80%+ positive = 100 points
 * - 60-80% positive = 75 points
 * - 40-60% positive = 50 points (neutral)
 * - <40% positive = below neutral
 */
export function calculatePositiveReactionsMetric(
  data: ReactionData,
  weight: number
): MetricResult {
  const totalReactions =
    data.positiveReactions + data.negativeReactions + data.neutralReactions

  // Insufficient data
  if (totalReactions < 5) {
    return {
      name: 'positiveReactions',
      rawValue: data.positiveRatio,
      normalizedScore: 50,
      weightedScore: 50 * weight,
      weight,
      details: `Insufficient reaction data (${totalReactions} reactions)`,
      dataPoints: totalReactions
    }
  }

  let normalizedScore: number
  let details: string

  const positiveRatio = data.positiveRatio

  if (positiveRatio >= 0.8) {
    normalizedScore = 100
    details = `Excellent reception: ${(positiveRatio * 100).toFixed(0)}% positive reactions (${data.positiveReactions} positive)`
  } else if (positiveRatio >= 0.6) {
    normalizedScore = 75
    details = `Good reception: ${(positiveRatio * 100).toFixed(0)}% positive reactions`
  } else if (positiveRatio >= 0.4) {
    normalizedScore = 50
    details = `Mixed reception: ${(positiveRatio * 100).toFixed(0)}% positive reactions`
  } else {
    // Linear decrease from 50 to 0
    normalizedScore = (positiveRatio / 0.4) * 50
    details = `Poor reception: ${(positiveRatio * 100).toFixed(0)}% positive reactions`
  }

  return {
    name: 'positiveReactions',
    rawValue: positiveRatio,
    normalizedScore,
    weightedScore: normalizedScore * weight,
    weight,
    details,
    dataPoints: totalReactions
  }
}

/**
 * Calculate negative reactions metric score (penalty metric)
 *
 * Scoring:
 * - <5 total reactions = 50 (neutral)
 * - <10% negative = 50 (no penalty)
 * - 10-20% negative = 40 (slight penalty)
 * - 20-30% negative = 25 (moderate penalty)
 * - >30% negative = 0-25 (heavy penalty)
 */
export function calculateNegativeReactionsMetric(
  data: ReactionData,
  weight: number
): MetricResult {
  const totalReactions =
    data.positiveReactions + data.negativeReactions + data.neutralReactions

  // Insufficient data
  if (totalReactions < 5) {
    return {
      name: 'negativeReactions',
      rawValue: 0,
      normalizedScore: 50,
      weightedScore: 50 * weight,
      weight,
      details: 'Insufficient reaction data for negative metric',
      dataPoints: totalReactions
    }
  }

  const negativeRatio =
    totalReactions > 0 ? data.negativeReactions / totalReactions : 0

  let normalizedScore: number
  let details: string

  if (negativeRatio < 0.1) {
    normalizedScore = 50 // No penalty
    details = `Low negative reactions: ${(negativeRatio * 100).toFixed(0)}%`
  } else if (negativeRatio < 0.2) {
    normalizedScore = 40
    details = `Some negative reactions: ${(negativeRatio * 100).toFixed(0)}% (${data.negativeReactions} negative)`
  } else if (negativeRatio < 0.3) {
    normalizedScore = 25
    details = `Notable negative reactions: ${(negativeRatio * 100).toFixed(0)}% (${data.negativeReactions} negative)`
  } else {
    // Heavy penalty
    normalizedScore = Math.max(0, 25 - (negativeRatio - 0.3) * 100)
    details = `High negative reactions: ${(negativeRatio * 100).toFixed(0)}% (${data.negativeReactions} negative)`
  }

  return {
    name: 'negativeReactions',
    rawValue: negativeRatio,
    normalizedScore,
    weightedScore: normalizedScore * weight,
    weight,
    details,
    dataPoints: totalReactions
  }
}
