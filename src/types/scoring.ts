/**
 * Scoring result types
 */

import type { MetricResult } from './metrics.js'

/** Score adjustment detail */
export interface ScoreAdjustment {
  /** Metric that caused the adjustment */
  metric: string

  /** Points added or subtracted */
  points: number

  /** Reason for adjustment */
  reason: string
}

/** Complete scoring result */
export interface ScoringResult {
  /** Final score (0-1000) */
  score: number

  /** Score before decay applied */
  rawScore: number

  /** Decay factor applied (0.8-1.0) */
  decayFactor: number

  /** Whether the score meets minimum threshold */
  passed: boolean

  /** Minimum threshold configured */
  threshold: number

  /** Individual metric results */
  metrics: MetricResult[]

  /** Username analyzed */
  username: string

  /** When analysis was performed */
  analyzedAt: Date

  /** Start of analysis window */
  dataWindowStart: Date

  /** End of analysis window */
  dataWindowEnd: Date

  /** Total data points analyzed */
  totalDataPoints: number

  /** Actionable recommendations */
  recommendations: string[]

  /** Account is less than threshold days old */
  isNewAccount: boolean

  /** Limited data available for analysis */
  hasLimitedData: boolean

  /** User was on trusted list */
  isTrustedUser: boolean

  /** User was whitelisted (trusted user or org member) */
  wasWhitelisted: boolean
}

/** Score breakdown for detailed reporting */
export interface ScoreBreakdown {
  /** Starting baseline score */
  baselineScore: number

  /** Adjustments that added points */
  positiveAdjustments: ScoreAdjustment[]

  /** Adjustments that subtracted points */
  negativeAdjustments: ScoreAdjustment[]

  /** Spam pattern penalties */
  spamPenalties: ScoreAdjustment[]

  /** Final calculated score */
  finalScore: number
}

/** Action output format */
export interface ActionOutput {
  /** Numeric score */
  score: number

  /** Pass/fail status */
  passed: boolean

  /** JSON string of score breakdown */
  breakdown: string

  /** JSON string of recommendations */
  recommendations: string

  /** New account flag */
  isNewAccount: boolean

  /** Limited data flag */
  hasLimitedData: boolean

  /** Whitelist flag */
  wasWhitelisted: boolean
}

/** Scoring constants */
export const SCORING_CONSTANTS = {
  /** Baseline score for all users */
  BASELINE_SCORE: 500,

  /** Maximum possible score */
  MAX_SCORE: 1000,

  /** Minimum possible score */
  MIN_SCORE: 0,

  /** Maximum positive adjustment from baseline */
  MAX_POSITIVE_ADJUSTMENT: 500,

  /** Maximum negative adjustment from baseline */
  MAX_NEGATIVE_ADJUSTMENT: 500,

  /** Minimum decay factor (for old/stale data) */
  MIN_DECAY_FACTOR: 0.8,

  /** Maximum decay factor (recent activity) */
  MAX_DECAY_FACTOR: 1.0,

  /** Minimum contributions to have "sufficient data" */
  MIN_CONTRIBUTIONS_FOR_DATA: 5
} as const
