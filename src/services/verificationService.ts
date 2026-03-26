/**
 * verificationService.ts
 * Client-side trust score engine for citizen pollution reports.
 *
 * Runs 5 independent checks and produces a 0-100 trust score.
 * No server needed — fully self-contained in the browser.
 *
 * SCORE BREAKDOWN:
 *   CHECK 1 — GPS vs EXIF GPS    0-30 pts
 *   CHECK 2 — DigiPin vs GPS     0-40 pts  (15 pts if no DigiPin entered)
 *   CHECK 3 — EXIF quality       0-20 pts
 *   CHECK 4 — Rate limit         0-10 pts
 *   CHECK 5 — Image valid        0 or -20 pts
 *
 * THRESHOLDS:
 *   >= 70  → 'verified'  → copy to /active_alerts
 *   40-69  → 'flagged'   → manual review queue
 *   < 40   → 'rejected'  → citizen notified with reason
 */
import { extractExifData } from './exifService';
import { decodeDigiPin, isValidDigiPin } from './digiPinService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VerificationBreakdown {
  gpsScore: number;        // 0-30
  digiPinScore: number;    // 0-40
  exifScore: number;       // 0-30
  rateLimitScore: number;  // 0-10
  imageScore: number;      // 0 or -20
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

// ─── Haversine distance ────────────────────────────────────────────────────────

/**
 * Returns the great-circle distance between two lat/lng coordinates in metres.
 */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Rate-limit tracking (localStorage) ───────────────────────────────────────

const RATE_LIMIT_KEY = (citizenId: string) => `dgp_reports_${citizenId}`;
const MS_24H = 24 * 60 * 60 * 1000;

/**
 * Returns the number of reports submitted by this citizenId in the last 24 hours.
 */
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

/**
 * Records a new report submission timestamp in localStorage.
 * Prunes entries older than 24 hours to keep storage small.
 */
export function recordReportSubmission(citizenId: string): void {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY(citizenId));
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - MS_24H;
    const fresh = timestamps.filter(ts => ts > cutoff);
    fresh.push(Date.now());
    localStorage.setItem(RATE_LIMIT_KEY(citizenId), JSON.stringify(fresh));
  } catch {
    // Silent — rate-limit tracking must never block a submission
  }
}

// ─── Main verification function ───────────────────────────────────────────────

/**
 * Runs all 5 checks against the submitted report and produces a VerificationResult.
 * Call this BEFORE writing to Firebase so you know the trust status upfront.
 */
export async function verifyReport(params: VerifyReportParams): Promise<VerificationResult> {
  const { file, submittedLat, submittedLng, digiPin, citizenId, isLiveCapture } = params;

  console.log('[verifyReport] Starting verification for citizenId:', citizenId);
  console.log('[verifyReport] Submitted GPS:', submittedLat, submittedLng);

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

  // ── CHECK 1 — GPS vs EXIF GPS (0-30 pts) ────────────────────────────────────
  const exifData = await extractExifData(file);
  details.exifData = exifData;

  if (exifData.gps) {
    const dist = haversine(submittedLat, submittedLng, exifData.gps.lat, exifData.gps.lng);
    console.log(`[verifyReport] CHECK 1 — GPS distance: ${dist.toFixed(1)}m`);

    if (dist < 100) {
      breakdown.gpsScore = 30;
      details.gpsMatch = true;
    } else if (dist < 500) {
      breakdown.gpsScore = 20;
      details.gpsMatch = true;
    } else if (dist < 1000) {
      breakdown.gpsScore = 10;
    } else {
      breakdown.gpsScore = 0;
    }
  } else {
    console.log('[verifyReport] CHECK 1 — No EXIF GPS available. Score: 0');
    breakdown.gpsScore = 0;
  }

  // ── CHECK 2 — DigiPin vs submitted GPS (0-40 pts) ───────────────────────────
  if (!digiPin || !isValidDigiPin(digiPin)) {
    // No DigiPin entered → neutral 15 pts (don't penalise ordinary users)
    breakdown.digiPinScore = digiPin ? 0 : 15; // 0 if entered but invalid, 15 if not entered
    console.log(`[verifyReport] CHECK 2 — No DigiPin (or invalid). Score: ${breakdown.digiPinScore}`);
  } else {
    const decoded = decodeDigiPin(digiPin);
    if (!decoded) {
      breakdown.digiPinScore = 0;
      console.log('[verifyReport] CHECK 2 — DigiPin decode failed. Score: 0');
    } else {
      const dist = haversine(submittedLat, submittedLng, decoded.lat, decoded.lng);
      console.log(`[verifyReport] CHECK 2 — DigiPin distance: ${dist.toFixed(1)}m`);

      if (dist < 50) {
        breakdown.digiPinScore = 40;
        details.digiPinMatch = true;
      } else if (dist < 200) {
        breakdown.digiPinScore = 25;
        details.digiPinMatch = true;
      } else {
        breakdown.digiPinScore = 0;
      }
    }
  }

  // ── CHECK 3 — EXIF quality & Live Capture (0-30 pts) ─────────────────────────
  // CRITICAL: If isLiveCapture is false, ALWAYS reject
  if (!isLiveCapture) {
    breakdown.exifScore = 0;
    details.rejectionReason = 'gallery_not_allowed';
    breakdown.imageScore = -20; // Additional penalty for attempting gallery upload
    console.log('[verifyReport] ⛔ CHECK 3 — NOT a live capture (Gallery/uploaded photo detected). REJECTED.');
    console.log('[verifyReport]    Reason: Only real-time camera photos are accepted for authenticity verification.');
  } else if (!exifData.hasExif) {
    breakdown.exifScore = 10; // +10 for live capture confirming it's not from gallery
    console.log('[verifyReport] CHECK 3 — Live capture confirmed but no EXIF metadata. Score: 10');
  } else {
    details.hasRealExif = true;
    let score = 10; // +10 base for live capture

    if (exifData.cameraModel) {
      score += 10;
      console.log(`[verifyReport] CHECK 3 — Camera model found: ${exifData.cameraModel} (+10)`);
    }
    if (exifData.captureTime) {
      score += 5;
      console.log(`[verifyReport] CHECK 3 — Capture time found (+5)`);

      const ageMs = Date.now() - exifData.captureTime.getTime();
      if (ageMs >= 0 && ageMs < MS_24H) {
        score += 5;
        console.log('[verifyReport] CHECK 3 — Photo taken within 24 hours (+5)');
      } else {
        console.log('[verifyReport] CHECK 3 — Photo older than 24 hours or future timestamp');
      }
    }
    breakdown.exifScore = score;
  }

  // ── CHECK 4 — Rate limit (0-10 pts) ──────────────────────────────────────────
  const reportCount = getReportCountLast24h(citizenId);
  console.log(`[verifyReport] CHECK 4 — Reports in last 24h by this citizen: ${reportCount}`);

  if (reportCount <= 5) {
    breakdown.rateLimitScore = 10;
    details.rateLimitOk = true;
  } else if (reportCount <= 10) {
    breakdown.rateLimitScore = 5;
    details.rateLimitOk = true;
  } else {
    breakdown.rateLimitScore = 0;
    details.rateLimitOk = false;
    console.log('[verifyReport] CHECK 4 — Rate limit exceeded!');
  }

  // ── CHECK 5 — Image validation (0 or -20 pts) ────────────────────────────────
  const MIN_FILE_SIZE = 50 * 1024; // 50 KB
  const isValidMime = file.type.startsWith('image/');
  const isLargeEnough = file.size >= MIN_FILE_SIZE;

  if (isValidMime && isLargeEnough) {
    breakdown.imageScore = 0;
    details.imageValid = true;
    console.log(`[verifyReport] CHECK 5 — Image valid. Size: ${(file.size / 1024).toFixed(1)}KB, Type: ${file.type}`);
  } else {
    breakdown.imageScore = -20;
    details.imageValid = false;
    console.log(`[verifyReport] CHECK 5 — Image invalid! Size: ${(file.size / 1024).toFixed(1)}KB, Type: ${file.type} (-20)`);
  }

  // ── TOTAL SCORE ───────────────────────────────────────────────────────────────
  const trustScore = Math.max(
    0,
    breakdown.gpsScore +
      breakdown.digiPinScore +
      breakdown.exifScore +
      breakdown.rateLimitScore +
      breakdown.imageScore,
  );

  let status: VerificationResult['status'];
  
  // CRITICAL: isLiveCapture MUST be true AND score >= 70 to verify
  if (!isLiveCapture) {
    // Gallery photos are ALWAYS rejected — no exceptions
    status = 'rejected';
    details.rejectionReason = 'gallery_not_allowed';
    console.log('[verifyReport] ⛔ CRITICAL: Gallery/non-live photo detected. REJECTING regardless of other scores.');
  } else if (trustScore >= 70) {
    status = 'verified';
  } else if (trustScore >= 40) {
    status = 'flagged';
    details.rejectionReason = null;
  } else {
    status = 'rejected';
    // Determine primary rejection reason for citizen feedback
    if (!details.imageValid) {
      details.rejectionReason = 'invalid_image';
    } else if (!details.rateLimitOk) {
      details.rejectionReason = 'rate_limit';
    } else if (!details.gpsMatch && !details.digiPinMatch) {
      details.rejectionReason = 'gps_mismatch';
    } else {
      details.rejectionReason = 'low_trust_score';
    }
  }

  console.log('[verifyReport] ─── RESULT ───────────────────────────');
  console.log(`[verifyReport]   GPS:      ${breakdown.gpsScore}/30`);
  console.log(`[verifyReport]   DigiPin:  ${breakdown.digiPinScore}/40`);
  console.log(`[verifyReport]   EXIF:     ${breakdown.exifScore}/30`);
  console.log(`[verifyReport]   RateLimit: ${breakdown.rateLimitScore}/10`);
  console.log(`[verifyReport]   Image:    ${breakdown.imageScore}`);
  console.log(`[verifyReport]   TOTAL:    ${trustScore}/100 → ${status.toUpperCase()}`);
  console.log('[verifyReport] ──────────────────────────────────────');

  return { trustScore, status, breakdown, details };
}
