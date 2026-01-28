/**
 * Output formatting utilities
 */

import * as core from '@actions/core'
import type { ScoringResult } from '../types/scoring.js'
import type { ActionOutput } from '../types/scoring.js'

/**
 * Format scoring result for action outputs
 */
export function formatActionOutput(result: ScoringResult): ActionOutput {
  // Create breakdown object
  const breakdown = {
    score: result.score,
    rawScore: result.rawScore,
    decayFactor: result.decayFactor,
    metrics: result.metrics.map((m) => ({
      name: m.name,
      score: m.normalizedScore,
      weight: m.weight,
      details: m.details
    })),
    analysisWindow: {
      start: result.dataWindowStart.toISOString(),
      end: result.dataWindowEnd.toISOString()
    }
  }

  return {
    score: result.score,
    passed: result.passed,
    breakdown: JSON.stringify(breakdown),
    recommendations: JSON.stringify(result.recommendations),
    isNewAccount: result.isNewAccount,
    hasLimitedData: result.hasLimitedData,
    wasWhitelisted: result.wasWhitelisted
  }
}

/**
 * Set all action outputs
 */
export function setActionOutputs(result: ScoringResult): void {
  const output = formatActionOutput(result)

  core.setOutput('score', output.score)
  core.setOutput('passed', output.passed)
  core.setOutput('breakdown', output.breakdown)
  core.setOutput('recommendations', output.recommendations)
  core.setOutput('is-new-account', output.isNewAccount)
  core.setOutput('has-limited-data', output.hasLimitedData)
  core.setOutput('was-whitelisted', output.wasWhitelisted)
}

/**
 * Set outputs for whitelisted user
 */
export function setWhitelistOutputs(username: string): void {
  core.setOutput('score', 1000)
  core.setOutput('passed', true)
  core.setOutput('breakdown', JSON.stringify({ whitelisted: true, username }))
  core.setOutput('recommendations', JSON.stringify([]))
  core.setOutput('is-new-account', false)
  core.setOutput('has-limited-data', false)
  core.setOutput('was-whitelisted', true)
}

/**
 * Log scoring result summary
 */
export function logResultSummary(result: ScoringResult): void {
  core.info('')
  core.info('╔══════════════════════════════════════════════════╗')
  core.info('║         CONTRIBUTOR QUALITY ANALYSIS             ║')
  core.info('╚══════════════════════════════════════════════════╝')
  core.info('')
  core.info(`  Score:     ${result.score}/1000`)
  core.info(`  Status:    ${result.passed ? '✓ PASSED' : '✗ NEEDS REVIEW'}`)
  core.info(`  Threshold: ${result.threshold}`)
  core.info('')

  core.info(
    '┌─────────────────────────────────────────────────────────────────────────────────┐'
  )
  core.info(
    '│ Metric               │ Score  │ Weight │ Contribution │ Details                │'
  )
  core.info(
    '├─────────────────────────────────────────────────────────────────────────────────┤'
  )

  let totalContribution = 0
  for (const metric of result.metrics) {
    const contribution = (metric.normalizedScore * metric.weight) / 10
    totalContribution += contribution
    const name = metric.name.padEnd(20)
    const score = `${metric.normalizedScore}/100`.padEnd(6)
    const weight = `${(metric.weight * 100).toFixed(0)}%`.padEnd(6)
    const contrib = contribution.toFixed(1).padStart(5)
    const details = (metric.details || '-').substring(0, 22).padEnd(22)
    core.info(
      `│ ${name} │ ${score} │ ${weight} │ ${contrib} pts    │ ${details} │`
    )
  }

  core.info(
    '├─────────────────────────────────────────────────────────────────────────────────┤'
  )
  core.info(
    `│ TOTAL                │        │  100%  │ ${totalContribution.toFixed(1).padStart(5)} pts    │ × 10 = ${result.score} score     │`
  )
  core.info(
    '└─────────────────────────────────────────────────────────────────────────────────┘'
  )

  if (result.recommendations.length > 0) {
    core.info('')
    core.info('Recommendations:')
    for (const rec of result.recommendations) {
      core.info(`  → ${rec}`)
    }
  }

  core.info('')
  core.info(
    `Analysis: ${result.dataWindowStart.toISOString().split('T')[0]} to ${result.dataWindowEnd.toISOString().split('T')[0]} | Data points: ${result.totalDataPoints} | Decay: ${(result.decayFactor * 100).toFixed(0)}%`
  )
  core.info('')
}

/**
 * Write scoring result to GitHub Job Summary
 */
export async function writeJobSummary(
  result: ScoringResult,
  username: string
): Promise<void> {
  const statusEmoji = result.passed ? '✅' : '⚠️'
  const statusText = result.passed ? 'Passed' : 'Needs Review'

  await core.summary
    .addHeading('Contributor Quality Analysis', 2)
    .addTable([
      [
        { data: 'Contributor', header: true },
        { data: 'Score', header: true },
        { data: 'Status', header: true },
        { data: 'Threshold', header: true }
      ],
      [
        `@${username}`,
        `**${result.score}**/1000`,
        `${statusEmoji} ${statusText}`,
        `${result.threshold}`
      ]
    ])
    .addHeading('Metric Breakdown', 3)
    .addTable([
      [
        { data: 'Metric', header: true },
        { data: 'Score', header: true },
        { data: 'Weight', header: true },
        { data: 'Details', header: true }
      ],
      ...result.metrics.map((m) => [
        m.name,
        `${m.normalizedScore}/100`,
        `${(m.weight * 100).toFixed(0)}%`,
        m.details || '-'
      ])
    ])
    .addRaw(
      `\n**Analysis Period:** ${result.dataWindowStart.toISOString().split('T')[0]} to ${result.dataWindowEnd.toISOString().split('T')[0]}\n`
    )
    .addRaw(`**Data Points:** ${result.totalDataPoints}\n`)
    .addRaw(
      `**Activity Decay Factor:** ${(result.decayFactor * 100).toFixed(0)}%\n`
    )
    .write()

  if (result.recommendations.length > 0) {
    await core.summary
      .addHeading('Recommendations', 3)
      .addList(result.recommendations)
      .write()
  }
}

/**
 * Write whitelisted user summary to GitHub Job Summary
 */
export async function writeWhitelistSummary(username: string): Promise<void> {
  await core.summary
    .addHeading('Contributor Quality Analysis', 2)
    .addRaw(
      `✅ **@${username}** is a trusted contributor and was automatically approved.\n`
    )
    .write()
}
