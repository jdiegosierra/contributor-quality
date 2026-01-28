/**
 * Output module exports
 */

export {
  generateAnalysisComment,
  generatePassedComment,
  generateWhitelistComment,
  COMMENT_MARKER
} from './comment.js'

export {
  formatActionOutput,
  setActionOutputs,
  setWhitelistOutputs,
  logResultSummary,
  writeJobSummary,
  writeWhitelistSummary
} from './formatter.js'
