import { VerificationResult, ScoringResult } from '../types.js';

export function calculateTrustScore(result: VerificationResult): ScoringResult {
  const breakdown = {
    liveness_score: result.liveness.is_live ? 100 : 0,
    gan_score: result.gan_manipulation.is_ai_generated ? 0 : Math.round((1 - result.gan_manipulation.confidence) * 100),
    classification_score: result.pollution_classification.confidences[0] > 0.5 ? 80 : 50,
    consistency_score: Math.round(result.nlp_consistency.confidence * 100),
    digipin_score: result.digipin_match.is_valid ? 100 : 0,
    context_score: result.scene_context.matches ? 100 : 40,
  };

  const weights = {
    liveness: 0.25,
    gan: 0.15,
    classification: 0.15,
    consistency: 0.15,
    digipin: 0.15,
    context: 0.15,
  };

  const trust_score = Math.round(
    breakdown.liveness_score * weights.liveness +
    breakdown.gan_score * weights.gan +
    breakdown.classification_score * weights.classification +
    breakdown.consistency_score * weights.consistency +
    breakdown.digipin_score * weights.digipin +
    breakdown.context_score * weights.context
  );

  let status: 'VERIFIED_PRIORITY' | 'PENDING_REVIEW' | 'REJECTED';
  
  if (trust_score >= 80 && result.liveness.is_live) {
    status = 'VERIFIED_PRIORITY';
  } else if (trust_score >= 60 && result.liveness.is_live) {
    status = 'PENDING_REVIEW';
  } else {
    status = 'REJECTED';
  }

  return {
    trust_score,
    status,
    breakdown,
  };
}
