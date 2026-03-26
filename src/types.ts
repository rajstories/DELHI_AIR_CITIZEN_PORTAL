export interface ReportPayload {
  image: string;
  gps_lat: number;
  gps_lng: number;
  digipin: string;
  description: string;
  capture_timestamp: string;
  submission_timestamp: string;
  attestation_token: string;
  client_phash: string;
}

export interface DeviceIntegrityResult {
  is_valid: boolean;
  is_rooted: boolean;
  is_spoofed_camera: boolean;
}

export interface TimeBufferResult {
  is_valid: boolean;
  buffer_minutes: number;
}

export interface LivenessResult {
  is_live: boolean;
  confidence: number;
  reason?: string;
}

export interface GANManipulationResult {
  is_ai_generated: boolean;
  confidence: number;
  artifacts_detected: string[];
}

export interface PollutionClassification {
  labels: string[];
  confidences: number[];
}

export interface NLPConsistencyResult {
  is_consistent: boolean;
  matched_labels: string[];
  confidence: number;
}

export interface DigiPinResult {
  is_valid: boolean;
  decoded_lat: number;
  decoded_lng: number;
}

export interface SceneContextResult {
  matches: boolean;
  terrain_type: string;
}

export interface VerificationResult {
  liveness: LivenessResult;
  gan_manipulation: GANManipulationResult;
  pollution_classification: PollutionClassification;
  nlp_consistency: NLPConsistencyResult;
  digipin_match: DigiPinResult;
  scene_context: SceneContextResult;
}

export interface ScoringResult {
  trust_score: number;
  status: 'VERIFIED_PRIORITY' | 'PENDING_REVIEW' | 'REJECTED';
  breakdown: {
    liveness_score: number;
    gan_score: number;
    classification_score: number;
    consistency_score: number;
    digipin_score: number;
    context_score: number;
  };
}

export interface WSMessage {
  type: 'VERIFIED_PRIORITY' | 'PENDING_REVIEW' | 'ALERT';
  report_id: string;
  timestamp: string;
  payload?: ReportPayload;
}
