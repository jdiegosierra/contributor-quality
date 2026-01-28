# Contributing to Contributor Quality

Thank you for your interest in contributing to Contributor Quality! This
document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct.
Please be respectful and constructive in all interactions.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:

1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected behavior vs actual behavior
4. Your environment (Node.js version, OS, etc.)
5. Any relevant logs or screenshots

### Suggesting Features

Feature requests are welcome! Please open an issue with:

1. A clear description of the feature
2. The problem it solves
3. Potential implementation approaches (if any)

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`pnpm test && pnpm lint`)
5. Commit your changes with a descriptive message
6. Push to your branch
7. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/jdiegosierra/contributor-quality.git
cd contributor-quality

# Install dependencies
pnpm install
```

### Available Commands

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# Lint code
pnpm lint

# Format code
pnpm format:write

# Build the action
pnpm bundle
```

## Project Structure

```
contributor-quality/
├── src/
│   ├── api/           # GitHub API client and rate limiting
│   ├── config/        # Configuration and input parsing
│   ├── metrics/       # Individual metric calculators
│   ├── output/        # Comment and output formatting
│   ├── scoring/       # Scoring engine and normalization
│   ├── types/         # TypeScript type definitions
│   └── main.ts        # Action entry point
├── __tests__/         # Test files (mirrors src structure)
├── __fixtures__/      # Test fixtures and mocks
└── dist/              # Compiled action (auto-generated)
```

## Adding a New Metric

1. Create a new file in `src/metrics/` (e.g., `my-metric.ts`)
2. Implement the extract and calculate functions:

```typescript
export function extractMyMetricData(
  data: GraphQLContributorData
): MyMetricData {
  // Extract relevant data
}

export function calculateMyMetric(
  data: MyMetricData,
  weight: number
): MetricResult {
  // Calculate normalized score (0-100)
}
```

3. Add types to `src/types/metrics.ts`
4. Export from `src/metrics/index.ts`
5. Add weight to `src/types/config.ts` and `src/config/defaults.ts`
6. Integrate in `src/scoring/engine.ts`
7. Write tests in `__tests__/metrics/`

## Scoring Guidelines

When implementing or modifying metrics:

- **Neutral baseline**: Score of 50 means neutral (no bonus, no penalty)
- **Never penalize lack of data**: New users shouldn't be punished
- **Be fair**: Metrics should be objective and verifiable
- **Document thresholds**: Explain why specific values were chosen

## Testing Guidelines

- Write tests for all new functionality
- Maintain or improve code coverage (currently 56%+)
- Use descriptive test names
- Test edge cases (empty data, null values, boundary conditions)

Example test structure:

```typescript
describe('My Metric', () => {
  describe('extractMyMetricData', () => {
    it('extracts data correctly', () => {
      // ...
    })

    it('handles empty data', () => {
      // ...
    })
  })

  describe('calculateMyMetric', () => {
    it('gives high score for good values', () => {
      // ...
    })

    it('gives neutral score for no data', () => {
      // ...
    })
  })
})
```

## Commit Messages

Use clear, descriptive commit messages:

- `feat: add new metric for code review quality`
- `fix: handle null repository in PR data`
- `docs: update README with new configuration`
- `test: add tests for edge cases in scoring`
- `refactor: simplify decay calculation`

## Pull Request Guidelines

- Keep PRs focused on a single change
- Update tests for any code changes
- Update documentation if needed
- Ensure all checks pass before requesting review
- Respond to review feedback promptly

## Release Process

Releases are managed by maintainers:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a GitHub release with release notes
4. The action is automatically published to the Marketplace

## Questions?

If you have questions, feel free to:

- Open an issue with the "question" label
- Start a discussion in the GitHub Discussions tab

Thank you for contributing!
