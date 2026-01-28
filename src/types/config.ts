/**
 * Configuration types for the contributor quality action
 */

/** Metric weight configuration for scoring */
export interface MetricWeights {
  prMergeRate: number
  repoQuality: number
  positiveReactions: number
  negativeReactions: number
  accountAge: number
  activityConsistency: number
  issueEngagement: number
  codeReviews: number
}

/** Actions to take when score is below threshold */
export type LowScoreAction =
  | 'comment'
  | 'label'
  | 'fail'
  | 'comment-and-label'
  | 'none'

/** Actions for new accounts */
export type NewAccountAction = 'neutral' | 'require-review' | 'block'

/** Main configuration for the action */
export interface ContributorQualityConfig {
  /** GitHub token for API access */
  githubToken: string

  /** Minimum score to pass (0-1000) */
  minimumScore: number

  /** Minimum stars for a repo to be considered "quality" */
  minimumStars: number

  /** Months of history to analyze */
  analysisWindowMonths: number

  /** Usernames that always pass (whitelist) */
  trustedUsers: string[]

  /** Organizations whose members always pass */
  trustedOrgs: string[]

  /** Action to take when score is below threshold */
  onLowScore: LowScoreAction

  /** Label name to apply when using label action */
  labelName: string

  /** Custom metric weights */
  weights: MetricWeights

  /** Run without taking action (logging only) */
  dryRun: boolean

  /** Action for new accounts */
  newAccountAction: NewAccountAction

  /** Days threshold to consider an account "new" */
  newAccountThresholdDays: number
}

/** Default metric weights */
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

/** Default trusted bots */
export const DEFAULT_TRUSTED_USERS: string[] = [
  'dependabot[bot]',
  'renovate[bot]',
  'github-actions[bot]',
  'codecov[bot]',
  'sonarcloud[bot]'
]
