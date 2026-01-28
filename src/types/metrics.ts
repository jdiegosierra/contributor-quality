/**
 * Metric data structures and interfaces
 */

/** Result from a single metric calculation */
export interface MetricResult {
  /** Metric identifier */
  name: string

  /** Raw measured value */
  rawValue: number

  /** Score on 0-100 scale before weighting */
  normalizedScore: number

  /** Score after applying weight */
  weightedScore: number

  /** Weight applied to this metric */
  weight: number

  /** Human-readable explanation */
  details: string

  /** Number of data points that contributed to this metric */
  dataPoints: number
}

/** PR history analysis data */
export interface PRHistoryData {
  /** Total number of PRs in analysis window */
  totalPRs: number

  /** Number of merged PRs */
  mergedPRs: number

  /** Number of PRs closed without merging */
  closedWithoutMerge: number

  /** Number of currently open PRs */
  openPRs: number

  /** Merge rate (merged / (merged + closed)) */
  mergeRate: number

  /** Average lines changed per PR */
  averagePRSize: number

  /** Number of very short PRs (< 10 lines) */
  veryShortPRs: number

  /** Dates of merged PRs for recency calculation */
  mergedPRDates: Date[]
}

/** Repository contribution data */
export interface RepoContribution {
  /** Repository owner */
  owner: string

  /** Repository name */
  repo: string

  /** Repository star count */
  stars: number

  /** Number of merged PRs to this repo */
  mergedPRCount: number
}

/** Repository quality metric data */
export interface RepoQualityData {
  /** All repositories contributed to */
  contributedRepos: RepoContribution[]

  /** Number of repos with >= minimum stars */
  qualityRepoCount: number

  /** Average stars across contributed repos */
  averageRepoStars: number

  /** Highest star count among contributed repos */
  highestStarRepo: number
}

/** Reaction type classification */
export type ReactionType =
  | '+1'
  | '-1'
  | 'laugh'
  | 'confused'
  | 'heart'
  | 'hooray'
  | 'rocket'
  | 'eyes'

/** Positive reaction types */
export const POSITIVE_REACTIONS: ReactionType[] = [
  '+1',
  'heart',
  'rocket',
  'hooray'
]

/** Negative reaction types */
export const NEGATIVE_REACTIONS: ReactionType[] = ['-1', 'confused']

/** Reaction analysis data */
export interface ReactionData {
  /** Total comments analyzed */
  totalComments: number

  /** Positive reactions count */
  positiveReactions: number

  /** Negative reactions count */
  negativeReactions: number

  /** Neutral reactions count */
  neutralReactions: number

  /** Ratio of positive reactions (0-1) */
  positiveRatio: number
}

/** Account age and activity data */
export interface AccountData {
  /** Account creation date */
  createdAt: Date

  /** Account age in days */
  ageInDays: number

  /** Number of months with activity in analysis window */
  monthsWithActivity: number

  /** Total months in analysis window */
  totalMonthsInWindow: number

  /** Consistency score (0-1) based on activity spread */
  consistencyScore: number
}

/** Issue engagement data */
export interface IssueEngagementData {
  /** Number of issues created */
  issuesCreated: number

  /** Issues that received comments from others */
  issuesWithComments: number

  /** Issues that received reactions */
  issuesWithReactions: number

  /** Average comments per issue */
  averageCommentsPerIssue: number
}

/** Code review contribution data */
export interface CodeReviewData {
  /** Number of reviews given */
  reviewsGiven: number

  /** Number of review comments written */
  reviewCommentsGiven: number

  /** Repositories where reviews were given */
  reviewedRepos: string[]
}

/** Aggregated metrics from all calculators */
export interface AllMetricsData {
  prHistory: PRHistoryData
  repoQuality: RepoQualityData
  reactions: ReactionData
  account: AccountData
  issueEngagement: IssueEngagementData
  codeReviews: CodeReviewData
}

/** Interface for metric calculators */
export interface MetricCalculator<T> {
  /** Calculate metric from raw data */
  calculate(data: T, weight: number): MetricResult
}
