/**
 * Main entry point for the Contributor Quality GitHub Action
 */

import * as core from '@actions/core'
import { parseInputs } from './config/index.js'
import { GitHubClient, getPRContext } from './api/index.js'
import { calculateScore } from './scoring/index.js'
import {
  generateLowScoreComment,
  setActionOutputs,
  setWhitelistOutputs,
  logResultSummary
} from './output/index.js'
import type { ScoringResult } from './types/scoring.js'

/**
 * Main action function
 */
export async function run(): Promise<void> {
  try {
    // Parse configuration from inputs
    const config = parseInputs()

    // Get PR context
    const prContext = getPRContext()
    if (!prContext) {
      core.setFailed(
        'Could not determine PR context. Is this running on a pull_request event?'
      )
      return
    }

    const username = prContext.prAuthor
    core.info(`Analyzing contributor: ${username}`)

    // Check if user is in whitelist
    if (config.trustedUsers.includes(username)) {
      core.info(`User ${username} is in trusted users list, skipping analysis`)
      setWhitelistOutputs(username)

      if (!config.dryRun && config.onLowScore !== 'none') {
        // Optionally comment about whitelist status
        core.debug('User is whitelisted, no comment needed')
      }
      return
    }

    // Initialize GitHub client
    const client = new GitHubClient(config.githubToken)

    // Check organization membership
    if (config.trustedOrgs.length > 0) {
      const isMember = await client.checkOrgMembership(
        username,
        config.trustedOrgs
      )
      if (isMember) {
        core.info(
          `User ${username} is member of a trusted organization, skipping analysis`
        )
        setWhitelistOutputs(username)
        return
      }
    }

    // Calculate analysis window
    const now = new Date()
    const sinceDate = new Date(now)
    sinceDate.setMonth(sinceDate.getMonth() - config.analysisWindowMonths)

    // Fetch contributor data
    core.info(
      `Fetching contributor data from ${sinceDate.toISOString().split('T')[0]} to now`
    )
    const contributorData = await client.fetchContributorData(
      username,
      sinceDate
    )

    // Calculate score
    core.info('Calculating contributor quality score...')
    const result = calculateScore(contributorData, config, sinceDate)

    // Log results
    logResultSummary(result)

    // Set outputs
    setActionOutputs(result)

    // Handle new account action
    if (result.isNewAccount && config.newAccountAction !== 'neutral') {
      await handleNewAccount(result, config, client, prContext)
      return
    }

    // Handle score-based actions
    if (!result.passed) {
      await handleLowScore(result, config, client, prContext)
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed: ${error.message}`)
      core.debug(error.stack ?? '')
    } else {
      core.setFailed('Action failed with unknown error')
    }
  }
}

/**
 * Handle new account based on configuration
 */
async function handleNewAccount(
  result: ScoringResult,
  config: ReturnType<typeof parseInputs>,
  client: GitHubClient,
  prContext: NonNullable<ReturnType<typeof getPRContext>>
): Promise<void> {
  core.info(
    `New account detected (${result.isNewAccount ? 'new' : 'established'})`
  )

  switch (config.newAccountAction) {
    case 'require-review':
      if (!config.dryRun) {
        await client.addPRLabel(prContext, config.labelName)
        core.info(`Added label "${config.labelName}" for new account review`)
      } else {
        core.info(`[DRY RUN] Would add label "${config.labelName}"`)
      }
      break

    case 'block':
      core.setFailed(
        `New accounts (< ${config.newAccountThresholdDays} days) are not allowed to submit PRs`
      )
      break

    case 'neutral':
    default:
      // No special handling
      break
  }
}

/**
 * Handle low score based on configuration
 */
async function handleLowScore(
  result: ScoringResult,
  config: ReturnType<typeof parseInputs>,
  client: GitHubClient,
  prContext: NonNullable<ReturnType<typeof getPRContext>>
): Promise<void> {
  core.warning(
    `Contributor score (${result.score}) is below threshold (${config.minimumScore})`
  )

  const comment = generateLowScoreComment(result, config)

  switch (config.onLowScore) {
    case 'comment':
      if (!config.dryRun) {
        await client.addPRComment(prContext, comment)
        core.info('Posted quality check comment')
      } else {
        core.info('[DRY RUN] Would post comment:')
        core.info(comment)
      }
      break

    case 'label':
      if (!config.dryRun) {
        await client.addPRLabel(prContext, config.labelName)
        core.info(`Added label "${config.labelName}"`)
      } else {
        core.info(`[DRY RUN] Would add label "${config.labelName}"`)
      }
      break

    case 'comment-and-label':
      if (!config.dryRun) {
        await client.addPRComment(prContext, comment)
        await client.addPRLabel(prContext, config.labelName)
        core.info(`Posted comment and added label "${config.labelName}"`)
      } else {
        core.info('[DRY RUN] Would post comment and add label')
      }
      break

    case 'fail':
      core.setFailed(
        `Contributor quality score (${result.score}) is below minimum threshold (${config.minimumScore})`
      )
      break

    case 'none':
    default:
      core.info('Low score action set to "none", no action taken')
      break
  }
}
