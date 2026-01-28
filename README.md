# Contributor Quality

[![CI](https://github.com/jdiegosierra/contributor-quality/actions/workflows/ci.yml/badge.svg)](https://github.com/jdiegosierra/contributor-quality/actions/workflows/ci.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A GitHub Action that evaluates contributor quality using objective GitHub
metrics to help combat AI-generated spam PRs in open source projects.

## The Problem

Open source maintainers are increasingly facing a flood of low-quality,
AI-generated pull requests. These spam PRs waste maintainer time and resources.
This action helps by analyzing the PR author's contribution history using
objective metrics.

## How It Works

When a PR is opened, this action:

1. Fetches the contributor's GitHub activity from the past 12 months
2. Calculates a quality score (0-1000) based on objective metrics
3. Takes configured action if the score is below threshold (comment, label, or
   fail)

### Scoring System

- **Baseline Score**: 500/1000 (neutral starting point)
- **New users** start at 500, not penalized for lack of history
- **Score range**: 0-1000
- **Default threshold**: 300

### Metrics

| Metric               | Weight | Description                                 |
| -------------------- | ------ | ------------------------------------------- |
| PR Merge Rate        | 20%    | Percentage of PRs that get merged vs closed |
| Repo Quality         | 15%    | Contributions to repos with 100+ stars      |
| Positive Reactions   | 15%    | Positive reactions on comments              |
| Negative Reactions   | 10%    | Penalty for negative reactions              |
| Account Age          | 10%    | Bonus for established accounts              |
| Activity Consistency | 10%    | Regular activity over time                  |
| Issue Engagement     | 10%    | Issues that receive community engagement    |
| Code Reviews         | 10%    | Code reviews given to others                |

### Spam Detection

Additional penalties are applied for:

- Very short PRs (< 10 lines) pattern
- High volume of closed/rejected PRs
- New accounts with unusual activity bursts

### Score Decay

- Only the last 12 months of activity are analyzed
- Recent activity counts more than old activity
- Scores naturally drift toward baseline (500) over time

## Usage

### Basic Usage

```yaml
name: PR Quality Check

on:
  pull_request:
    types: [opened, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  check-contributor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check Contributor Quality
        uses: jdiegosierra/contributor-quality@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced Configuration

```yaml
- name: Check Contributor Quality
  uses: jdiegosierra/contributor-quality@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

    # Score threshold (0-1000)
    minimum-score: '400'

    # Minimum stars for "quality" repos
    minimum-stars: '50'

    # Analysis window in months
    analysis-window: '12'

    # Trusted users (always pass)
    trusted-users: 'dependabot[bot],renovate[bot],my-bot'

    # Trusted organizations
    trusted-orgs: 'my-org,partner-org'

    # Action on low score: comment, label, fail, comment-and-label, none
    on-low-score: 'comment-and-label'

    # Label to apply
    label-name: 'needs-review'

    # Custom weights (JSON)
    weights: |
      {
        "prMergeRate": 0.25,
        "repoQuality": 0.20
      }

    # Test mode - log but don't act
    dry-run: 'false'

    # New account handling: neutral, require-review, block
    new-account-action: 'require-review'

    # Days threshold for "new" accounts
    new-account-threshold-days: '14'
```

## Inputs

| Input                        | Required | Default               | Description                    |
| ---------------------------- | -------- | --------------------- | ------------------------------ |
| `github-token`               | Yes      | `${{ github.token }}` | GitHub token for API access    |
| `minimum-score`              | No       | `300`                 | Minimum score to pass (0-1000) |
| `minimum-stars`              | No       | `100`                 | Min stars for quality repos    |
| `analysis-window`            | No       | `12`                  | Months of history to analyze   |
| `trusted-users`              | No       | Common bots           | Comma-separated whitelist      |
| `trusted-orgs`               | No       | -                     | Comma-separated org whitelist  |
| `on-low-score`               | No       | `comment`             | Action when score is low       |
| `label-name`                 | No       | `needs-review`        | Label to apply                 |
| `weights`                    | No       | `{}`                  | Custom metric weights (JSON)   |
| `dry-run`                    | No       | `false`               | Log only, no actions           |
| `new-account-action`         | No       | `neutral`             | Handling for new accounts      |
| `new-account-threshold-days` | No       | `30`                  | Days to consider "new"         |

## Outputs

| Output             | Description                            |
| ------------------ | -------------------------------------- |
| `score`            | Contributor quality score (0-1000)     |
| `passed`           | Whether the score met the threshold    |
| `breakdown`        | JSON with detailed metric breakdown    |
| `recommendations`  | JSON array of improvement suggestions  |
| `is-new-account`   | Whether account is below age threshold |
| `has-limited-data` | Whether analysis had limited data      |
| `was-whitelisted`  | Whether user was on trusted list       |

## Using Outputs

```yaml
- name: Check Contributor Quality
  id: quality
  uses: jdiegosierra/contributor-quality@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Comment with score
  if: steps.quality.outputs.passed == 'false'
  run: |
    echo "Score: ${{ steps.quality.outputs.score }}"
    echo "Passed: ${{ steps.quality.outputs.passed }}"
```

## Default Trusted Users

These bots are trusted by default:

- `dependabot[bot]`
- `renovate[bot]`
- `github-actions[bot]`
- `codecov[bot]`
- `sonarcloud[bot]`

Override with an empty string to disable: `trusted-users: ''`

## Fair Treatment

This action is designed to be fair:

- **New users are not penalized** - They start at baseline (500)
- **Limited data = neutral score** - Not enough data doesn't mean low quality
- **Configurable thresholds** - Adjust for your project's needs
- **Whitelist support** - Trust known good actors
- **Dry run mode** - Test before enabling

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Lint
pnpm lint

# Build
pnpm bundle
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for
guidelines.

## License

MIT
