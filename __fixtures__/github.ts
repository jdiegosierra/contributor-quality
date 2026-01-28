/**
 * Mock for @actions/github
 */
import { jest } from '@jest/globals'

export const context = {
  eventName: 'pull_request',
  repo: {
    owner: 'test-owner',
    repo: 'test-repo'
  },
  payload: {
    pull_request: {
      number: 123,
      user: {
        login: 'test-user'
      }
    }
  }
}

export const getOctokit = jest.fn(() => ({
  graphql: jest.fn(),
  rest: {
    issues: {
      createComment: jest.fn(),
      addLabels: jest.fn(),
      createLabel: jest.fn()
    }
  }
}))
