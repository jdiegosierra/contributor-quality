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
  core.info('='.repeat(50))
  core.info(`Contributor Quality Score: ${result.score}/1000`)
  core.info(`Status: ${result.passed ? 'PASSED' : 'FAILED'}`)
  core.info(`Threshold: ${result.threshold}`)
  core.info('='.repeat(50))

  core.info('')
  core.info('Metric Breakdown:')
  for (const metric of result.metrics) {
    core.info(
      `  ${metric.name}: ${metric.normalizedScore}/100 (${metric.details})`
    )
  }

  if (result.recommendations.length > 0) {
    core.info('')
    core.info('Recommendations:')
    for (const rec of result.recommendations) {
      core.info(`  - ${rec}`)
    }
  }

  core.info('')
  core.info(
    `Analysis window: ${result.dataWindowStart.toISOString().split('T')[0]} to ${result.dataWindowEnd.toISOString().split('T')[0]}`
  )
  core.info(`Total data points: ${result.totalDataPoints}`)
  core.info(`Decay factor: ${(result.decayFactor * 100).toFixed(0)}%`)
}
