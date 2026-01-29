/**
 * Tests for config input parsing
 */
import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach
} from '@jest/globals'
import * as core from '../../__fixtures__/core.js'

// Mock @actions/core before importing the module
jest.unstable_mockModule('@actions/core', () => core)

const { parseInputs } = await import('../../src/config/inputs.js')
const { DEFAULT_TRUSTED_USERS, DEFAULT_THRESHOLDS } =
  await import('../../src/config/defaults.js')

describe('Input Parsing', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks()

    // Setup default return values
    core.getInput.mockImplementation((name: string) => {
      const defaults: Record<string, string> = {
        'github-token': 'test-token',
        thresholds: '{}',
        'threshold-pr-merge-rate': '',
        'threshold-account-age': '',
        'threshold-negative-reactions': '',
        'required-metrics': 'prMergeRate,accountAge',
        'minimum-stars': '100',
        'analysis-window': '12',
        'trusted-users': '',
        'trusted-orgs': '',
        'on-fail': 'comment',
        'label-name': 'needs-review',
        'dry-run': 'false',
        'new-account-action': 'neutral',
        'new-account-threshold-days': '30'
      }
      return defaults[name] ?? ''
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('parses github token', () => {
    const config = parseInputs()

    expect(config.githubToken).toBe('test-token')
  })

  it('uses default thresholds', () => {
    const config = parseInputs()

    expect(config.thresholds).toEqual(DEFAULT_THRESHOLDS)
  })

  it('parses custom threshold-pr-merge-rate', () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'threshold-pr-merge-rate') return '0.5'
      if (name === 'github-token') return 'test-token'
      return ''
    })

    const config = parseInputs()

    expect(config.thresholds.prMergeRate).toBe(0.5)
  })

  it('parses custom thresholds from JSON', () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'thresholds') return '{"prMergeRate": 0.4, "accountAge": 60}'
      if (name === 'github-token') return 'test-token'
      return ''
    })

    const config = parseInputs()

    expect(config.thresholds.prMergeRate).toBe(0.4)
    expect(config.thresholds.accountAge).toBe(60)
    // Other thresholds should use defaults
    expect(config.thresholds.repoQuality).toBe(DEFAULT_THRESHOLDS.repoQuality)
  })

  it('uses default trusted users when empty', () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'github-token') return 'test-token'
      if (name === 'trusted-users') return ''
      return ''
    })

    const config = parseInputs()

    expect(config.trustedUsers).toEqual(DEFAULT_TRUSTED_USERS)
  })

  it('parses custom trusted users', () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'github-token') return 'test-token'
      if (name === 'trusted-users') return 'user1,user2,user3'
      return ''
    })

    const config = parseInputs()

    expect(config.trustedUsers).toEqual(['user1', 'user2', 'user3'])
  })

  it('parses dry run flag', () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'github-token') return 'test-token'
      if (name === 'dry-run') return 'true'
      return ''
    })

    const config = parseInputs()

    expect(config.dryRun).toBe(true)
  })

  it('validates on-fail action', () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'github-token') return 'test-token'
      if (name === 'on-fail') return 'invalid-action'
      return ''
    })

    const config = parseInputs()

    // Should fall back to default
    expect(config.onFail).toBe('comment')
    expect(core.warning).toHaveBeenCalled()
  })

  it('parses required metrics', () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'github-token') return 'test-token'
      if (name === 'required-metrics') return 'prMergeRate,codeReviews'
      return ''
    })

    const config = parseInputs()

    expect(config.requiredMetrics).toEqual(['prMergeRate', 'codeReviews'])
  })

  describe('Input Validation', () => {
    it('throws error for invalid prMergeRate threshold (> 1)', () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-token'
        if (name === 'threshold-pr-merge-rate') return '1.5'
        return ''
      })

      expect(() => parseInputs()).toThrow(
        'prMergeRate threshold must be between 0 and 1'
      )
    })

    it('throws error for invalid prMergeRate threshold (< 0)', () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-token'
        if (name === 'threshold-pr-merge-rate') return '-0.5'
        return ''
      })

      expect(() => parseInputs()).toThrow(
        'prMergeRate threshold must be between 0 and 1'
      )
    })

    it('throws error for negative minimum-stars', () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-token'
        if (name === 'minimum-stars') return '-10'
        return ''
      })

      expect(() => parseInputs()).toThrow(
        'minimum-stars must be a positive number'
      )
    })

    it('throws error for analysis-window of zero', () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-token'
        if (name === 'analysis-window') return '0'
        return ''
      })

      expect(() => parseInputs()).toThrow(
        'analysis-window must be greater than 0'
      )
    })

    it('throws error for invalid required metrics', () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-token'
        if (name === 'required-metrics') return 'prMergeRate,invalidMetric'
        return ''
      })

      expect(() => parseInputs()).toThrow(
        'Invalid metric names in required-metrics'
      )
    })

    it('throws error for negative new-account-threshold-days', () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-token'
        if (name === 'new-account-threshold-days') return '-5'
        return ''
      })

      expect(() => parseInputs()).toThrow(
        'new-account-threshold-days must be a positive number'
      )
    })

    it('allows edge case prMergeRate threshold of 0', () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-token'
        if (name === 'threshold-pr-merge-rate') return '0'
        return ''
      })

      const config = parseInputs()
      expect(config.thresholds.prMergeRate).toBe(0)
    })

    it('allows edge case prMergeRate threshold of 1', () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-token'
        if (name === 'threshold-pr-merge-rate') return '1'
        return ''
      })

      const config = parseInputs()
      expect(config.thresholds.prMergeRate).toBe(1)
    })
  })
})
