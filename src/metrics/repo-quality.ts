/**
 * Repository quality metric calculator
 */

import type { GraphQLContributorData } from '../types/github.js'
import type {
  RepoQualityData,
  RepoContribution,
  MetricCheckResult
} from '../types/metrics.js'

/**
 * Extract repository quality data from GraphQL response
 */
export function extractRepoQualityData(
  data: GraphQLContributorData,
  minimumStars: number,
  sinceDate: Date
): RepoQualityData {
  const mergedPRs = data.user.pullRequests.nodes.filter((pr) => {
    if (!pr.merged || !pr.mergedAt) return false
    // Skip PRs to deleted or private repos (repository can be null)
    if (!pr.repository) return false
    const mergedDate = new Date(pr.mergedAt)
    return mergedDate >= sinceDate
  })

  // Group by repository
  const repoMap = new Map<string, RepoContribution>()

  for (const pr of mergedPRs) {
    // Skip if repository is null (already filtered above, but extra safety)
    if (!pr.repository) continue

    const key = `${pr.repository.owner.login}/${pr.repository.name}`

    if (!repoMap.has(key)) {
      repoMap.set(key, {
        owner: pr.repository.owner.login,
        repo: pr.repository.name,
        stars: pr.repository.stargazerCount,
        mergedPRCount: 0
      })
    }

    const repo = repoMap.get(key)!
    repo.mergedPRCount++
  }

  const contributedRepos = Array.from(repoMap.values())
  const qualityRepos = contributedRepos.filter((r) => r.stars >= minimumStars)

  const totalStars = contributedRepos.reduce((sum, r) => sum + r.stars, 0)
  const averageRepoStars =
    contributedRepos.length > 0 ? totalStars / contributedRepos.length : 0

  const highestStarRepo =
    contributedRepos.length > 0
      ? Math.max(...contributedRepos.map((r) => r.stars))
      : 0

  return {
    contributedRepos,
    qualityRepoCount: qualityRepos.length,
    averageRepoStars,
    highestStarRepo
  }
}

/**
 * Check repository quality against threshold
 *
 * @param data - Extracted repo quality data
 * @param threshold - Minimum number of quality repos to pass
 * @param minimumStars - Stars threshold used for "quality" classification
 * @returns MetricCheckResult with pass/fail status
 */
export function checkRepoQuality(
  data: RepoQualityData,
  threshold: number,
  minimumStars: number
): MetricCheckResult {
  const qualityCount = data.qualityRepoCount
  const passed = qualityCount >= threshold

  let details: string

  if (data.contributedRepos.length === 0) {
    details = 'No merged PRs found in analysis window'
  } else if (qualityCount === 0) {
    details = `Contributed to ${data.contributedRepos.length} repos, none with ${minimumStars}+ stars`
  } else {
    details = `Merged PRs in ${qualityCount} repos with ${minimumStars}+ stars`
  }

  if (passed && threshold > 0) {
    details += ` (meets threshold >= ${threshold})`
  } else if (!passed && threshold > 0) {
    details += ` (below threshold >= ${threshold})`
  }

  // Add info about highest star repo if notable
  if (data.highestStarRepo >= 1000) {
    details += `. Highest: ${data.highestStarRepo.toLocaleString()} stars`
  }

  return {
    name: 'repoQuality',
    rawValue: qualityCount,
    threshold,
    passed,
    details,
    dataPoints: data.contributedRepos.length
  }
}
