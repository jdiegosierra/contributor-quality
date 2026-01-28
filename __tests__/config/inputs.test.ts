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
const { DEFAULT_CONFIG, DEFAULT_TRUSTED_USERS } =
  await import('../../src/config/defaults.js')

describe('Input Parsing', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks()

    // Setup default return values
    core.getInput.mockImplementation((name: string) => {
      const defaults: Record<string, string> = {
        'github-token': 'test-token',
        'minimum-score': '300',
        'minimum-stars': '100',
        'analysis-window': '12',
        'trusted-users': '',
        'trusted-orgs': '',
        'on-low-score': 'comment',
        'label-name': 'needs-review',
        weights: '{}',
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

  it('uses default minimum score', () => {
    const config = parseInputs()

    expect(config.minimumScore).toBe(DEFAULT_CONFIG.minimumScore)
  })

  it('parses custom minimum score', () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'minimum-score') return '500'
      if (name === 'github-token') return 'test-token'
      return ''
    })

    const config = parseInputs()

    expect(config.minimumScore).toBe(500)
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

  it('validates on-low-score action', () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'github-token') return 'test-token'
      if (name === 'on-low-score') return 'invalid-action'
      return ''
    })

    const config = parseInputs()

    // Should fall back to default
    expect(config.onLowScore).toBe('comment')
    expect(core.warning).toHaveBeenCalled()
  })

  it('parses custom weights', () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === 'github-token') return 'test-token'
      if (name === 'weights') return '{"prMergeRate": 0.3}'
      return ''
    })

    const config = parseInputs()

    expect(config.weights.prMergeRate).toBe(0.3)
    // Other weights should use defaults
    expect(config.weights.repoQuality).toBe(DEFAULT_CONFIG.weights.repoQuality)
  })

  describe('Input Validation', () => {
    it('throws error for minimum-score out of range (high)', () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-token'
        if (name === 'minimum-score') return '1500'
        return ''
      })

      expect(() => parseInputs()).toThrow(
        'minimum-score must be between 0 and 1000'
      )
    })

    it('throws error for minimum-score out of range (negative)', () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-token'
        if (name === 'minimum-score') return '-100'
        return ''
      })

      expect(() => parseInputs()).toThrow(
        'minimum-score must be between 0 and 1000'
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

    it('throws error for invalid number in minimum-score', () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-token'
        if (name === 'minimum-score') return 'not-a-number'
        return ''
      })

      expect(() => parseInputs()).toThrow('Invalid minimum-score')
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

    it('allows edge case minimum-score of 0', () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-token'
        if (name === 'minimum-score') return '0'
        return ''
      })

      const config = parseInputs()
      expect(config.minimumScore).toBe(0)
    })

    it('allows edge case minimum-score of 1000', () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return 'test-token'
        if (name === 'minimum-score') return '1000'
        return ''
      })

      const config = parseInputs()
      expect(config.minimumScore).toBe(1000)
    })
  })
})
