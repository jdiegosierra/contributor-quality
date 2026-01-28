/**
 * Issue engagement metric calculator
 */

import type { GraphQLContributorData } from '../types/github.js'
import type { IssueEngagementData, MetricResult } from '../types/metrics.js'

/**
 * Extract issue engagement data from GraphQL response
 */
export function extractIssueEngagementData(
  data: GraphQLContributorData,
  sinceDate: Date
): IssueEngagementData {
  const issues = data.user.issues.nodes.filter((issue) => {
    const issueDate = new Date(issue.createdAt)
    return issueDate >= sinceDate
  })

  const issuesWithComments = issues.filter(
    (issue) => issue.comments.totalCount > 0
  ).length

  const issuesWithReactions = issues.filter(
    (issue) => issue.reactions.totalCount > 0
  ).length

  const totalComments = issues.reduce(
    (sum, issue) => sum + issue.comments.totalCount,
    0
  )

  const averageCommentsPerIssue =
    issues.length > 0 ? totalComments / issues.length : 0

  return {
    issuesCreated: issues.length,
    issuesWithComments,
    issuesWithReactions,
    averageCommentsPerIssue
  }
}

/**
 * Calculate issue engagement metric score
 *
 * Issues that receive engagement from others suggest quality contributions.
 *
 * Scoring:
 * - No issues = 50 (neutral)
 * - 70%+ engagement rate with 3+ issues = 100 points
 * - 50-70% engagement rate with 2+ issues = 75 points
 * - 30-50% engagement rate = 60 points
 * - <30% engagement rate = 50 points (neutral, not penalized)
 */
export function calculateIssueEngagementMetric(
  data: IssueEngagementData,
  weight: number
): MetricResult {
  // No issues = neutral
  if (data.issuesCreated === 0) {
    return {
      name: 'issueEngagement',
      rawValue: 0,
      normalizedScore: 50,
      weightedScore: 50 * weight,
      weight,
      details: 'No issues created in analysis window',
      dataPoints: 0
    }
  }

  // Calculate engagement rate (issues that got comments or reactions)
  const engagedIssues = Math.max(
    data.issuesWithComments,
    data.issuesWithReactions
  )
  const engagementRate = engagedIssues / data.issuesCreated

  let normalizedScore: number
  let details: string

  if (engagementRate >= 0.7 && data.issuesCreated >= 3) {
    normalizedScore = 100
    details = `High engagement: ${engagedIssues}/${data.issuesCreated} issues received responses`
  } else if (engagementRate >= 0.5 && data.issuesCreated >= 2) {
    normalizedScore = 75
    details = `Good engagement: ${engagedIssues}/${data.issuesCreated} issues received responses`
  } else if (engagementRate >= 0.3) {
    normalizedScore = 60
    details = `Some engagement: ${engagedIssues}/${data.issuesCreated} issues received responses`
  } else {
    normalizedScore = 50
    details = `Low engagement: ${engagedIssues}/${data.issuesCreated} issues received responses`
  }

  // Add average comments info if notable
  if (data.averageCommentsPerIssue >= 3) {
    details += `. Avg ${data.averageCommentsPerIssue.toFixed(1)} comments/issue`
  }

  return {
    name: 'issueEngagement',
    rawValue: engagementRate,
    normalizedScore,
    weightedScore: normalizedScore * weight,
    weight,
    details,
    dataPoints: data.issuesCreated
  }
}
