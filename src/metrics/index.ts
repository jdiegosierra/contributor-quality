/**
 * Metrics module exports
 */

// PR History
export { extractPRHistoryData, calculatePRHistoryMetric } from './pr-history.js'

// Repo Quality
export {
  extractRepoQualityData,
  calculateRepoQualityMetric
} from './repo-quality.js'

// Reactions
export {
  extractReactionData,
  calculatePositiveReactionsMetric,
  calculateNegativeReactionsMetric
} from './reactions.js'

// Account Age
export {
  extractAccountData,
  calculateAccountAgeMetric,
  calculateActivityConsistencyMetric,
  isNewAccount
} from './account-age.js'

// Issue Engagement
export {
  extractIssueEngagementData,
  calculateIssueEngagementMetric
} from './issue-engagement.js'

// Code Reviews
export {
  extractCodeReviewData,
  calculateCodeReviewMetric
} from './code-review.js'

// Spam Detection
export {
  detectSpamPatterns,
  calculateSpamPenalty,
  createSpamPenaltyMetric,
  type SpamPenalty
} from './spam-detection.js'
