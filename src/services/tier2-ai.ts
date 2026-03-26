import {
  ReportPayload,
  LivenessResult,
  GANManipulationResult,
  PollutionClassification,
  NLPConsistencyResult,
  DigiPinResult,
  SceneContextResult,
  VerificationResult,
} from '../types.js';

export async function verifyLiveness(image: string): Promise<LivenessResult> {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const hasScreenArtifacts = image.includes('screen') || image.includes('screenshot');
  
  return {
    is_live: !hasScreenArtifacts,
    confidence: hasScreenArtifacts ? 0.45 : 0.92,
    reason: hasScreenArtifacts ? 'Screen reflection detected' : undefined,
  };
}

export async function detectGANManipulation(image: string): Promise<GANManipulationResult> {
  await new Promise(resolve => setTimeout(resolve, 120));
  
  const hasArtifacts = image.includes('ai_generated') || image.includes('deepfake');
  const artifacts = hasArtifacts ? ['inconsistent texture'] : [];
  
  return {
    is_ai_generated: hasArtifacts,
    confidence: hasArtifacts ? 0.85 : 0.12,
    artifacts_detected: artifacts,
  };
}

export async function classifyPollutionScene(image: string): Promise<PollutionClassification> {
  await new Promise(resolve => setTimeout(resolve, 80));
  
  const labels = ['smoke', 'trash', 'urban', 'construction', 'water'];
  const confidences = [0.85, 0.72, 0.65, 0.55, 0.40];
  
  return {
    labels,
    confidences,
  };
}

export async function nlpConsistencyCheck(
  description: string,
  labels: string[]
): Promise<NLPConsistencyResult> {
  await new Promise(resolve => setTimeout(resolve, 60));
  
  const descLower = description.toLowerCase();
  const matched = labels.filter(label => descLower.includes(label));
  
  return {
    is_consistent: matched.length > 0 || descLower.length > 5,
    matched_labels: matched,
    confidence: matched.length > 0 ? 0.85 : 0.65,
  };
}

export async function verifyDigiPinMatch(
  digipin: string,
  gps_lat: number,
  gps_lng: number
): Promise<DigiPinResult> {
  await new Promise(resolve => setTimeout(resolve, 40));
  
  if (digipin.length !== 10) {
    return { is_valid: false, decoded_lat: 0, decoded_lng: 0 };
  }
  
  const decodedLat = gps_lat;
  const decodedLng = gps_lng;
  
  return {
    is_valid: true,
    decoded_lat: Math.round(decodedLat * 1000) / 1000,
    decoded_lng: Math.round(decodedLng * 1000) / 1000,
  };
}

export async function verifySceneContext(
  gps_lat: number,
  gps_lng: number,
  labels: string[]
): Promise<SceneContextResult> {
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const terrainTypes = ['urban', 'river', 'park', 'industrial', 'residential'];
  const terrainIdx = Math.abs(Math.floor((gps_lat + gps_lng) * 100)) % terrainTypes.length;
  const terrain = terrainTypes[terrainIdx];
  
  return {
    matches: true,
    terrain_type: terrain,
  };
}

export async function runParallelVerification(
  payload: ReportPayload,
  labels: string[]
): Promise<VerificationResult> {
  const [liveness, gan_manipulation, pollution_classification, nlp_consistency, digipin_match, scene_context] =
    await Promise.all([
      verifyLiveness(payload.image),
      detectGANManipulation(payload.image),
      classifyPollutionScene(payload.image),
      nlpConsistencyCheck(payload.description, labels),
      verifyDigiPinMatch(payload.digipin, payload.gps_lat, payload.gps_lng),
      verifySceneContext(payload.gps_lat, payload.gps_lng, labels),
    ]);

  return {
    liveness,
    gan_manipulation,
    pollution_classification,
    nlp_consistency,
    digipin_match,
    scene_context,
  };
}
