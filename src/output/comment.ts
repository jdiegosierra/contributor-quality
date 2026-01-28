/**
 * PR comment generation
 */

import type { ScoringResult } from '../types/scoring.js'
import type { ContributorQualityConfig } from '../types/config.js'
import {
  getScoreEmoji,
  formatScore,
  scoreToPercentage
} from '../scoring/normalizer.js'

/**
 * Generate PR comment for low score
 */
export function generateLowScoreComment(
  result: ScoringResult,
  config: ContributorQualityConfig
): string {
  const emoji = getScoreEmoji(result.score)
  const percentage = scoreToPercentage(result.score)

  const lines: string[] = [
    `## ${emoji} Contributor Quality Check`,
    '',
    `**Score:** ${formatScore(result.score)} (${percentage}%)`,
    `**Status:** ${result.passed ? 'Passed' : 'Requires Review'}`,
    `**Threshold:** ${config.minimumScore}`,
    ''
  ]

  // Add note for new accounts
  if (result.isNewAccount) {
    lines.push(
      `> **Note:** This is a new GitHub account (< ${config.newAccountThresholdDays} days old). ` +
        'Limited history is available for evaluation.'
    )
    lines.push('')
  }

  // Add note for limited data
  if (result.hasLimitedData && !result.isNewAccount) {
    lines.push(
      '> **Note:** Limited contribution data available. ' +
        'This may affect score accuracy.'
    )
    lines.push('')
  }

  // Score breakdown
  lines.push('### Score Breakdown')
  lines.push('')
  lines.push('| Metric | Score | Details |')
  lines.push('|--------|-------|---------|')

  for (const metric of result.metrics) {
    const scoreBar = generateScoreBar(metric.normalizedScore)
    lines.push(
      `| ${formatMetricName(metric.name)} | ${scoreBar} | ${metric.details} |`
    )
  }

  lines.push('')

  // Recommendations
  if (result.recommendations.length > 0) {
    lines.push('### Recommendations')
    lines.push('')
    for (const rec of result.recommendations) {
      lines.push(`- ${rec}`)
    }
    lines.push('')
  }

  // Footer
  lines.push('---')
  lines.push(
    `<sub>This check evaluates contributor quality based on public GitHub activity. ` +
      `[Learn more about scoring](https://github.com/jdiegosierra/contributor-quality#scoring-system)</sub>`
  )

  return lines.join('\n')
}

/**
 * Generate PR comment for passed check
 */
export function generatePassedComment(result: ScoringResult): string {
  const emoji = getScoreEmoji(result.score)

  return [
    `## ${emoji} Contributor Quality Check`,
    '',
    `**Score:** ${formatScore(result.score)}`,
    `**Status:** Passed ✓`,
    '',
    '<details>',
    '<summary>View score breakdown</summary>',
    '',
    '| Metric | Score |',
    '|--------|-------|',
    ...result.metrics.map(
      (m) =>
        `| ${formatMetricName(m.name)} | ${generateScoreBar(m.normalizedScore)} |`
    ),
    '',
    '</details>'
  ].join('\n')
}

/**
 * Generate PR comment for whitelisted user
 */
export function generateWhitelistComment(username: string): string {
  return [
    '## ✅ Contributor Quality Check',
    '',
    `**User:** @${username}`,
    `**Status:** Trusted contributor (whitelisted)`,
    '',
    'This user is on the trusted contributors list and was not analyzed.'
  ].join('\n')
}

/**
 * Generate visual score bar
 */
function generateScoreBar(score: number): string {
  const filled = Math.round(score / 10)
  const empty = 10 - filled

  let emoji: string
  if (score >= 70) emoji = '🟢'
  else if (score >= 50) emoji = '🟡'
  else emoji = '🔴'

  return `${emoji} ${'█'.repeat(filled)}${'░'.repeat(empty)} ${score}%`
}

/**
 * Format metric name for display
 */
function formatMetricName(name: string): string {
  const nameMap: Record<string, string> = {
    prMergeRate: 'PR Merge Rate',
    repoQuality: 'Repo Quality',
    positiveReactions: 'Positive Reactions',
    negativeReactions: 'Negative Reactions',
    accountAge: 'Account Age',
    activityConsistency: 'Activity Consistency',
    issueEngagement: 'Issue Engagement',
    codeReviews: 'Code Reviews'
  }

  return nameMap[name] || name
}
