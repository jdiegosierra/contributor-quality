/**
 * Issue engagement metric calculator
 */

import type { GraphQLContributorData } from '../types/github.js'
import type {
  IssueEngagementData,
  MetricCheckResult
} from '../types/metrics.js'

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
 * Check issue engagement against threshold
 *
 * @param data - Extracted issue engagement data
 * @param threshold - Minimum issues created to pass
 * @returns MetricCheckResult with pass/fail status
 */
export function checkIssueEngagement(
  data: IssueEngagementData,
  threshold: number
): MetricCheckResult {
  const issuesCreated = data.issuesCreated
  const passed = issuesCreated >= threshold

  let details: string

  if (issuesCreated === 0) {
    details = 'No issues created in analysis window'
  } else {
    // Calculate engagement rate (issues that got comments or reactions)
    const engagedIssues = Math.max(
      data.issuesWithComments,
      data.issuesWithReactions
    )
    details = `${issuesCreated} issues created, ${engagedIssues} received engagement`

    // Add average comments info if notable
    if (data.averageCommentsPerIssue >= 3) {
      details += `. Avg ${data.averageCommentsPerIssue.toFixed(1)} comments/issue`
    }
  }

  if (threshold > 0) {
    details += passed
      ? ` (meets threshold >= ${threshold})`
      : ` (below threshold >= ${threshold})`
  }

  return {
    name: 'issueEngagement',
    rawValue: issuesCreated,
    threshold,
    passed,
    details,
    dataPoints: issuesCreated
  }
}
