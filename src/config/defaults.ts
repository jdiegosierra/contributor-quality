/**
 * Default configuration values
 */

import type {
  ContributorQualityConfig,
  MetricWeights,
  LowScoreAction,
  NewAccountAction
} from '../types/config.js'

/** Default metric weights (must sum to 1.0) */
export const DEFAULT_WEIGHTS: MetricWeights = {
  prMergeRate: 0.2,
  repoQuality: 0.15,
  positiveReactions: 0.15,
  negativeReactions: 0.1,
  accountAge: 0.1,
  activityConsistency: 0.1,
  issueEngagement: 0.1,
  codeReviews: 0.1
}

/** Default trusted users (common bots) */
export const DEFAULT_TRUSTED_USERS: string[] = [
  'dependabot[bot]',
  'renovate[bot]',
  'github-actions[bot]',
  'codecov[bot]',
  'sonarcloud[bot]'
]

/** Default configuration values */
export const DEFAULT_CONFIG: Omit<ContributorQualityConfig, 'githubToken'> = {
  minimumScore: 300,
  minimumStars: 100,
  analysisWindowMonths: 12,
  trustedUsers: DEFAULT_TRUSTED_USERS,
  trustedOrgs: [],
  onLowScore: 'comment' as LowScoreAction,
  labelName: 'needs-review',
  weights: DEFAULT_WEIGHTS,
  dryRun: false,
  newAccountAction: 'neutral' as NewAccountAction,
  newAccountThresholdDays: 30
}

/** Validate that weights sum to approximately 1.0 */
export function validateWeights(weights: MetricWeights): boolean {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0)
  return Math.abs(sum - 1.0) < 0.01
}

/** Merge custom weights with defaults */
export function mergeWeights(custom: Partial<MetricWeights>): MetricWeights {
  return {
    ...DEFAULT_WEIGHTS,
    ...custom
  }
}
