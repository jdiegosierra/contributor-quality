/**
 * Repository quality metric calculator
 */

import type { GraphQLContributorData } from '../types/github.js'
import type {
  RepoQualityData,
  RepoContribution,
  MetricResult
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
 * Calculate repository quality metric score
 *
 * Scoring (only positive - contributing to quality repos is good,
 * not contributing isn't necessarily bad):
 * - 10+ quality repos = 100 points
 * - 5-9 quality repos = 75 points
 * - 2-4 quality repos = 50 points
 * - 1 quality repo = 25 points
 * - 0 quality repos = 50 (neutral)
 */
export function calculateRepoQualityMetric(
  data: RepoQualityData,
  weight: number,
  minimumStars: number
): MetricResult {
  const qualityCount = data.qualityRepoCount

  let normalizedScore: number
  let details: string

  if (qualityCount === 0) {
    if (data.contributedRepos.length === 0) {
      normalizedScore = 50 // Neutral - no data
      details = 'No merged PRs found in analysis window'
    } else {
      normalizedScore = 50 // Neutral - has contributions but not to high-star repos
      details = `Contributed to ${data.contributedRepos.length} repos, none with ${minimumStars}+ stars`
    }
  } else if (qualityCount >= 10) {
    normalizedScore = 100
    details = `Excellent: Merged PRs in ${qualityCount} repos with ${minimumStars}+ stars`
  } else if (qualityCount >= 5) {
    normalizedScore = 75
    details = `Good: Merged PRs in ${qualityCount} repos with ${minimumStars}+ stars`
  } else if (qualityCount >= 2) {
    normalizedScore = 65
    details = `Moderate: Merged PRs in ${qualityCount} repos with ${minimumStars}+ stars`
  } else {
    normalizedScore = 55
    details = `Some quality contributions: Merged PR in ${qualityCount} repo with ${minimumStars}+ stars`
  }

  // Add info about highest star repo if notable
  if (data.highestStarRepo >= 1000) {
    details += `. Highest: ${data.highestStarRepo.toLocaleString()} stars`
  }

  return {
    name: 'repoQuality',
    rawValue: qualityCount,
    normalizedScore,
    weightedScore: normalizedScore * weight,
    weight,
    details,
    dataPoints: data.contributedRepos.length
  }
}
