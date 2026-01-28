/**
 * Scoring module exports
 */

export {
  extractAllMetrics,
  calculateAllMetrics,
  calculateBreakdown,
  generateRecommendations,
  calculateScore
} from './engine.js'

export {
  calculateDecayFactor,
  applyDecayTowardBaseline,
  calculateDecayPercentage
} from './decay.js'

export {
  normalizeScore,
  clampScore,
  calculateAdjustment,
  getScoreCategory,
  getScoreEmoji,
  formatScore,
  scoreToPercentage
} from './normalizer.js'
