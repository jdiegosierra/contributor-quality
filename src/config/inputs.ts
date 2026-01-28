/**
 * Parse action inputs from @actions/core
 */

import * as core from '@actions/core'
import type {
  ContributorQualityConfig,
  MetricWeights,
  LowScoreAction,
  NewAccountAction
} from '../types/config.js'
import { DEFAULT_CONFIG, mergeWeights, validateWeights } from './defaults.js'

/** Parse comma-separated string into array */
function parseList(input: string): string[] {
  if (!input || input.trim() === '') {
    return []
  }
  return input
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** Parse JSON with fallback to empty object */
function parseJSON<T>(input: string, fallback: T): T {
  if (!input || input.trim() === '' || input.trim() === '{}') {
    return fallback
  }
  try {
    return JSON.parse(input) as T
  } catch {
    core.warning(`Failed to parse JSON input: ${input}. Using defaults.`)
    return fallback
  }
}

/** Validate low score action */
function validateLowScoreAction(action: string): LowScoreAction {
  const valid: LowScoreAction[] = [
    'comment',
    'label',
    'fail',
    'comment-and-label',
    'none'
  ]
  if (valid.includes(action as LowScoreAction)) {
    return action as LowScoreAction
  }
  core.warning(`Invalid on-low-score value: ${action}. Using 'comment'.`)
  return 'comment'
}

/** Validate new account action */
function validateNewAccountAction(action: string): NewAccountAction {
  const valid: NewAccountAction[] = ['neutral', 'require-review', 'block']
  if (valid.includes(action as NewAccountAction)) {
    return action as NewAccountAction
  }
  core.warning(`Invalid new-account-action value: ${action}. Using 'neutral'.`)
  return 'neutral'
}

/** Parse integer with validation */
function parseIntSafe(
  value: string,
  name: string,
  defaultValue: number
): number {
  if (!value || value.trim() === '') {
    return defaultValue
  }
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) {
    throw new Error(`Invalid ${name}: "${value}" is not a valid number`)
  }
  return parsed
}

/** Validate the complete config object */
function validateConfig(config: ContributorQualityConfig): void {
  // Validate minimum score range
  if (config.minimumScore < 0 || config.minimumScore > 1000) {
    throw new Error(
      `minimum-score must be between 0 and 1000, got ${config.minimumScore}`
    )
  }

  // Validate minimum stars is positive
  if (config.minimumStars < 0) {
    throw new Error(
      `minimum-stars must be a positive number, got ${config.minimumStars}`
    )
  }

  // Validate analysis window is positive
  if (config.analysisWindowMonths <= 0) {
    throw new Error(
      `analysis-window must be greater than 0, got ${config.analysisWindowMonths}`
    )
  }

  // Validate new account threshold is positive
  if (config.newAccountThresholdDays < 0) {
    throw new Error(
      `new-account-threshold-days must be a positive number, got ${config.newAccountThresholdDays}`
    )
  }
}

/** Parse all action inputs into config object */
export function parseInputs(): ContributorQualityConfig {
  const githubToken = core.getInput('github-token', { required: true })

  const minimumScore = parseIntSafe(
    core.getInput('minimum-score'),
    'minimum-score',
    DEFAULT_CONFIG.minimumScore
  )

  const minimumStars = parseIntSafe(
    core.getInput('minimum-stars'),
    'minimum-stars',
    DEFAULT_CONFIG.minimumStars
  )

  const analysisWindowMonths = parseIntSafe(
    core.getInput('analysis-window'),
    'analysis-window',
    DEFAULT_CONFIG.analysisWindowMonths
  )

  const trustedUsersInput = core.getInput('trusted-users')
  const trustedUsers =
    trustedUsersInput !== undefined && trustedUsersInput !== ''
      ? parseList(trustedUsersInput)
      : DEFAULT_CONFIG.trustedUsers

  const trustedOrgs = parseList(core.getInput('trusted-orgs'))

  const onLowScore = validateLowScoreAction(
    core.getInput('on-low-score') || DEFAULT_CONFIG.onLowScore
  )

  const labelName = core.getInput('label-name') || DEFAULT_CONFIG.labelName

  const customWeights = parseJSON<Partial<MetricWeights>>(
    core.getInput('weights'),
    {}
  )
  const weights = mergeWeights(customWeights)

  if (!validateWeights(weights)) {
    core.warning('Metric weights do not sum to 1.0. Results may be skewed.')
  }

  const dryRun = core.getInput('dry-run').toLowerCase() === 'true'

  const newAccountAction = validateNewAccountAction(
    core.getInput('new-account-action') || DEFAULT_CONFIG.newAccountAction
  )

  const newAccountThresholdDays = parseIntSafe(
    core.getInput('new-account-threshold-days'),
    'new-account-threshold-days',
    DEFAULT_CONFIG.newAccountThresholdDays
  )

  const config: ContributorQualityConfig = {
    githubToken,
    minimumScore,
    minimumStars,
    analysisWindowMonths,
    trustedUsers,
    trustedOrgs,
    onLowScore,
    labelName,
    weights,
    dryRun,
    newAccountAction,
    newAccountThresholdDays
  }

  // Validate all config values
  validateConfig(config)

  return config
}
