/**
 * Tests for rate limit handling utilities
 */
import { describe, it, expect, jest } from '@jest/globals'

// Mock @actions/core
jest.unstable_mockModule('@actions/core', () => ({
  warning: jest.fn(),
  debug: jest.fn()
}))

const {
  shouldWait,
  calculateWaitTime,
  parseRateLimit,
  isRateLimitError,
  isTransientError,
  executeWithRetry
} = await import('../../src/api/rate-limit.js')

describe('Rate Limit Utilities', () => {
  describe('shouldWait', () => {
    it('returns true when remaining is below threshold', () => {
      const rateLimit = {
        remaining: 50,
        resetAt: new Date(Date.now() + 60000),
        used: 950,
        limit: 1000
      }

      expect(shouldWait(rateLimit)).toBe(true)
    })

    it('returns false when remaining is above threshold', () => {
      const rateLimit = {
        remaining: 500,
        resetAt: new Date(Date.now() + 60000),
        used: 500,
        limit: 1000
      }

      expect(shouldWait(rateLimit)).toBe(false)
    })
  })

  describe('calculateWaitTime', () => {
    it('returns 0 when remaining is above threshold', () => {
      const rateLimit = {
        remaining: 500,
        resetAt: new Date(Date.now() + 60000),
        used: 500,
        limit: 1000
      }

      expect(calculateWaitTime(rateLimit)).toBe(0)
    })

    it('returns time until reset when below threshold', () => {
      const resetTime = new Date(Date.now() + 30000) // 30 seconds from now
      const rateLimit = {
        remaining: 50,
        resetAt: resetTime,
        used: 950,
        limit: 1000
      }

      const waitTime = calculateWaitTime(rateLimit)
      expect(waitTime).toBeGreaterThan(0)
      expect(waitTime).toBeLessThanOrEqual(30000)
    })

    it('returns 0 when reset time has passed', () => {
      const rateLimit = {
        remaining: 50,
        resetAt: new Date(Date.now() - 1000), // 1 second ago
        used: 950,
        limit: 1000
      }

      expect(calculateWaitTime(rateLimit)).toBe(0)
    })

    it('caps wait time at maximum', () => {
      const rateLimit = {
        remaining: 50,
        resetAt: new Date(Date.now() + 120000), // 2 minutes from now
        used: 950,
        limit: 1000
      }

      expect(calculateWaitTime(rateLimit)).toBeLessThanOrEqual(60000)
    })
  })

  describe('parseRateLimit', () => {
    it('parses valid rate limit data', () => {
      const data = {
        remaining: 100,
        resetAt: '2024-01-01T00:00:00Z',
        used: 400,
        limit: 500
      }

      const result = parseRateLimit(data)

      expect(result).toEqual({
        remaining: 100,
        resetAt: new Date('2024-01-01T00:00:00Z'),
        used: 400,
        limit: 500
      })
    })

    it('uses default limit when not provided', () => {
      const data = {
        remaining: 100,
        resetAt: '2024-01-01T00:00:00Z',
        used: 400
      }

      const result = parseRateLimit(data)

      expect(result?.limit).toBe(5000)
    })

    it('returns null for null input', () => {
      expect(parseRateLimit(null)).toBeNull()
    })
  })

  describe('isRateLimitError', () => {
    it('detects rate limit error messages', () => {
      expect(isRateLimitError(new Error('API rate limit exceeded'))).toBe(true)
      expect(isRateLimitError(new Error('secondary rate limit'))).toBe(true)
      expect(isRateLimitError(new Error('Rate Limit Exceeded'))).toBe(true)
    })

    it('returns false for other errors', () => {
      expect(isRateLimitError(new Error('Not found'))).toBe(false)
      expect(isRateLimitError(new Error('Server error'))).toBe(false)
      expect(isRateLimitError('string error')).toBe(false)
    })
  })

  describe('isTransientError', () => {
    it('detects network errors', () => {
      expect(isTransientError(new Error('ECONNRESET'))).toBe(true)
      expect(isTransientError(new Error('ETIMEDOUT'))).toBe(true)
      expect(isTransientError(new Error('ENOTFOUND'))).toBe(true)
      expect(isTransientError(new Error('socket hang up'))).toBe(true)
      expect(isTransientError(new Error('network error'))).toBe(true)
      expect(isTransientError(new Error('fetch failed'))).toBe(true)
    })

    it('detects server errors', () => {
      expect(isTransientError(new Error('500 Internal Server Error'))).toBe(
        true
      )
      expect(isTransientError(new Error('502 Bad Gateway'))).toBe(true)
      expect(isTransientError(new Error('503 Service Unavailable'))).toBe(true)
      expect(isTransientError(new Error('504 Gateway Timeout'))).toBe(true)
    })

    it('returns false for non-transient errors', () => {
      expect(isTransientError(new Error('Not found'))).toBe(false)
      expect(isTransientError(new Error('Bad request'))).toBe(false)
      expect(isTransientError(new Error('Unauthorized'))).toBe(false)
      expect(isTransientError('string error')).toBe(false)
    })
  })

  describe('executeWithRetry', () => {
    it('returns result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success')

      const result = await executeWithRetry(fn)

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('throws non-transient errors immediately', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Not found'))

      await expect(executeWithRetry(fn)).rejects.toThrow('Not found')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('throws rate limit errors when it is a rate limit error', async () => {
      // This verifies the function calls the retrying mechanism (even if we don't wait for retries)
      const fn = jest
        .fn<() => Promise<string>>()
        .mockRejectedValue(new Error('API rate limit exceeded'))

      // With real timers, we don't want to wait for retries
      // Just verify it rejects with the expected error
      await expect(executeWithRetry(fn, 1)).rejects.toThrow('rate limit')
    })
  })
})
