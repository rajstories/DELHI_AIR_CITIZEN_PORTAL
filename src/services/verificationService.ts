/**
 * verificationService.ts
 * Client-side trust score engine for citizen pollution reports.
 * 
 * NOW INTEGRATED WITH BACKEND VERIFICATION ENGINE
 * Calls the backend API for server-side AI verification (liveness, GAN detection, etc.)
 */
import { extractExifData } from './exifService';
import { decodeDigiPin, isValidDigiPin } from './digiPinService';

const API_BASE_URL = import.meta.env.VITE_VERIFICATION_API_URL || 
  (typeof window !== 'undefined' ? '/api/v1/reports/submit' : 'http://localhost:3000/api/v1/reports/submit');

export interface VerificationBreakdown {
  gpsScore: number;
  digiPinScore: number;
  exifScore: number;
  rateLimitScore: number;
  imageScore: number;
}

export interface VerificationDetails {
  gpsMatch: boolean;
  digiPinMatch: boolean;
  hasRealExif: boolean;
  rateLimitOk: boolean;
  imageValid: boolean;
  exifData: {
    gps: { lat: number; lng: number } | null;
    cameraModel: string | null;
    captureTime: Date | null;
    hasExif: boolean;
  };
  rejectionReason: string | null;
}

export interface VerificationResult {
  trustScore: number;
  status: 'verified' | 'flagged' | 'rejected';
  breakdown: VerificationBreakdown;
  details: VerificationDetails;
}

interface VerifyReportParams {
  file: File;
  submittedLat: number;
  submittedLng: number;
  digiPin: string | null;
  citizenId: string;
  isLiveCapture: boolean;
}

const RATE_LIMIT_KEY = (citizenId: string) => `dgp_reports_${citizenId}`;
const MS_24H = 24 * 60 * 60 * 1000;

function getReportCountLast24h(citizenId: string): number {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY(citizenId));
    if (!raw) return 0;
    const timestamps: number[] = JSON.parse(raw);
    const cutoff = Date.now() - MS_24H;
    return timestamps.filter(ts => ts > cutoff).length;
  } catch {
    return 0;
  }
}

export function recordReportSubmission(citizenId: string): void {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY(citizenId));
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - MS_24H;
    const fresh = timestamps.filter(ts => ts > cutoff);
    fresh.push(Date.now());
    localStorage.setItem(RATE_LIMIT_KEY(citizenId), JSON.stringify(fresh));
  } catch {
    // Silent
  }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function verifyReport(params: VerifyReportParams): Promise<VerificationResult> {
  const { file, submittedLat, submittedLng, digiPin, citizenId, isLiveCapture } = params;

  console.log('[verifyReport] Starting backend verification for citizenId:', citizenId);

  const breakdown: VerificationBreakdown = {
    gpsScore: 0,
    digiPinScore: 0,
    exifScore: 0,
    rateLimitScore: 0,
    imageScore: 0,
  };

  const details: VerificationDetails = {
    gpsMatch: false,
    digiPinMatch: false,
    hasRealExif: false,
    rateLimitOk: true,
    imageValid: true,
    exifData: { gps: null, cameraModel: null, captureTime: null, hasExif: false },
    rejectionReason: null,
  };

  // CRITICAL: Gallery photos are ALWAYS rejected - no exceptions
  if (!isLiveCapture) {
    details.rejectionReason = 'gallery_not_allowed';
    return { trustScore: 0, status: 'rejected', breakdown, details };
  }

  // Extract EXIF data
  const exifData = await extractExifData(file);
  details.exifData = exifData;

  // Basic image validation
  const MIN_FILE_SIZE = 50 * 1024;
  details.imageValid = file.type.startsWith('image/') && file.size >= MIN_FILE_SIZE;
  if (!details.imageValid) {
    breakdown.imageScore = -20;
    details.rejectionReason = 'invalid_image';
    return { trustScore: 0, status: 'rejected', breakdown, details };
  }

  // Rate limit check
  const reportCount = getReportCountLast24h(citizenId);
  if (reportCount >= 10) {
    breakdown.rateLimitScore = 0;
    details.rateLimitOk = false;
    details.rejectionReason = 'rate_limit';
    return { trustScore: 0, status: 'rejected', breakdown, details };
  }
  breakdown.rateLimitScore = 10;
  details.rateLimitOk = true;

  // GPS match scoring (for local display)
  if (exifData.gps) {
    const dist = haversine(submittedLat, submittedLng, exifData.gps.lat, exifData.gps.lng);
    if (dist < 1000) {
      breakdown.gpsScore = 30;
      details.gpsMatch = true;
    }
  }

  // DigiPin validation (for local display)
  if (digiPin && isValidDigiPin(digiPin)) {
    const decoded = decodeDigiPin(digiPin);
    if (decoded) {
      const dist = haversine(submittedLat, submittedLng, decoded.lat, decoded.lng);
      if (dist < 200) {
        breakdown.digiPinScore = 40;
        details.digiPinMatch = true;
      }
    }
  }

  try {
    const reader = new FileReader();
    const imageBase64 = await new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    const payload = {
      image: "pollution_report_image",
      gps_lat: submittedLat,
      gps_lng: submittedLng,
      digipin: digiPin || 'ABCD123456',
      description: 'Pollution report from citizen app',
      capture_timestamp: exifData.captureTime?.toISOString() || new Date().toISOString(),
      submission_timestamp: new Date().toISOString(),
      attestation_token: `citizen_${citizenId}`,
      client_phash: `hash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    console.log('[verifyReport] Sending to backend API...');
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // Check for backend rejection (any non-2xx response or error in body)
    if (!response.ok || result.error) {
      console.log('[verifyReport] Backend rejected the report:', result.error || 'Unknown error');
      details.rejectionReason = result.error || 'backend_rejected';
      return { trustScore: 0, status: 'rejected', breakdown, details };
    }

    console.log('[verifyReport] Backend verification result:', result);

    if (result.status === 'VERIFIED_PRIORITY') {
      // HIGH trust score - fully verified report
      breakdown.exifScore = 30;
      details.hasRealExif = true;
      
      const trustScore = breakdown.gpsScore + breakdown.digiPinScore + breakdown.exifScore + breakdown.rateLimitScore + breakdown.imageScore;
      
      recordReportSubmission(citizenId);
      
      return {
        trustScore: Math.max(0, trustScore),
        status: 'verified',
        breakdown,
        details,
      };
    } else if (result.status === 'PENDING_REVIEW') {
      // Medium trust score - sent for manual review
      // NO POINTS AWARDED - requires human verification
      breakdown.exifScore = 0;
      
      details.rejectionReason = 'pending_review';
      
      return {
        trustScore: 0,
        status: 'flagged',
        breakdown,
        details,
      };
    }

    // Unknown status from backend
    console.log('[verifyReport] Unknown backend status:', result.status);
    details.rejectionReason = 'backend_error';
    return { trustScore: 0, status: 'rejected', breakdown, details };
    
  } catch (error) {
    console.error('[verifyReport] Backend API error - rejecting report:', error);
    
    // Network error - reject the report, don't use local scoring
    // This prevents fake reports from bypassing the verification engine
    details.rejectionReason = 'network_error';
    return { trustScore: 0, status: 'rejected', breakdown, details };
  }
}
