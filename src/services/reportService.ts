/**
 * reportService.ts
 * Handles photo compression, Firebase Storage upload, and all RTDB writes.
 *
 * DATABASE PATHS:
 *   /pending_reports/{reportId}             — full record (always)
 *   /citizen_reports/{citizenId}/{reportId} — citizen tracker (always)
 *   /latest_alert                           — backward compat bridge (always)
 *   /active_alerts/{reportId}               — verified reports only
 */
import { database } from './firebaseConfig';
import { ref, set } from 'firebase/database';
import { recordReportSubmission } from '../utils/citizenUtils';
import type { VerificationResult } from './verificationService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportPayload {
  citizenId: string;
  reportId: string;
  timestamp: number;
  status: string;
  trustScore: number;
  location: {
    submittedLat: number | null;
    submittedLng: number | null;
    exifLat: number | null;
    exifLng: number | null;
    digiPin: string | null;
    address: string;
  };
  photo: {
    url: string;
    hasExif: boolean;
    cameraModel: string | null;
    captureTime: string | null;
  };
  report: {
    issueType: string;
    description: string;
    severity: string;
  };
  verification: VerificationResult['breakdown'];
}

// ─── Helper: Ward lookup ──────────────────────────────────────────────────────

/**
 * Derives an approximate ward ID from lat/lng.
 * For the demo covers major Delhi zones — extend with a proper shapefile later.
 */
export function getWardFromLocation(lat: number | null, lng: number | null): string {
  if (lat === null || lng === null) return '000X';

  // North Delhi — Rohini / Pitampura belt
  if (lat > 28.68 && lng < 77.15) return '024N';
  // Central Delhi — Connaught Place / Paharganj
  if (lat > 28.61 && lat <= 28.68 && lng > 77.20 && lng < 77.24) return '042S';
  // South Delhi — Hauz Khas / Defence Colony belt
  if (lat < 28.56 && lng > 77.18 && lng < 77.26) return '083S';
  // West Delhi — Dwarka / Janakpuri
  if (lat < 28.62 && lng < 77.10) return '067W';
  // East Delhi — Anand Vihar / Mayur Vihar
  if (lat > 28.63 && lng > 77.28) return '091E';
  // North-West — Narela / Bawana
  if (lat > 28.75) return '011N';

  return '000X'; // unknown ward
}

// ─── Helper: Alert title ──────────────────────────────────────────────────────

export function getAlertTitle(issueType: string): string {
  const titles: Record<string, string> = {
    'Biomass Burning':   'Biomass/Crop Burning Alert',
    'biomass_burning':   'Biomass/Crop Burning Alert',
    'Construction Dust': 'Construction Dust Violation',
    'construction_dust': 'Construction Dust Violation',
    'Industrial Smoke':  'Industrial Smoke Violation',
    'industrial':        'Industrial Smoke Violation',
    'Vehicle Pollution': 'Vehicle Emission Violation',
    'vehicular':         'Vehicle Emission Violation',
    'Garbage Burning':   'Open Garbage Burning Alert',
    'garbage_burning':   'Open Garbage Burning Alert',
    'Other':             'Pollution Incident Reported',
    'other':             'Pollution Incident Reported',
  };
  return titles[issueType] ?? 'Pollution Incident Reported';
}

// ─── Helper: Severity mapping ─────────────────────────────────────────────────

export function getSeverityFromLevel(severity: string): string {
  const map: Record<string, string> = {
    high:   'Critical',
    High:   'Critical',
    Severe: 'Critical',
    medium: 'High',
    Medium: 'High',
    Moderate: 'High',
    low:    'Medium',
    Low:    'Medium',
    Mild:   'Medium',
  };
  return map[severity] ?? 'High';
}

// ─── Image Compression ────────────────────────────────────────────────────────

/**
 * Resizes an image File to a max width of 1200px using a canvas,
 * then returns a new File. Only compresses if file > 500 KB.
 */
async function compressImage(file: File, maxWidth = 1200, quality = 0.82): Promise<File> {
  const THRESHOLD = 500 * 1024; // 500 KB
  if (file.size <= THRESHOLD) {
    console.log(`[reportService] File ${(file.size / 1024).toFixed(0)} KB — no compression needed`);
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width  = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return; }
        const compressed = new File([blob], file.name || 'capture.jpg', { type: 'image/jpeg' });
        console.log(
          `[reportService] Compressed: ${(file.size / 1024).toFixed(0)} KB → ${(compressed.size / 1024).toFixed(0)} KB`,
        );
        resolve(compressed);
      }, 'image/jpeg', quality);
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ─── Photo Upload ─────────────────────────────────────────────────────────────

/**
 * Compresses (if needed) and uploads a photo to Firebase Storage.
 * Returns the download URL, or '' on failure — report is always saved regardless.
 */
export async function uploadPhoto(
  file: File,
  citizenId: string,
  reportId: string,
): Promise<string> {
  try {
    const processedFile = await compressImage(file);

    // Dynamic import — keeps the bundle lean and avoids crashing if storage
    // bucket isn't configured (common during local dev without env vars).
    const { storage } = await import('./firebaseConfig');
    const { ref: storageRef, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');

    const path    = `reports/${citizenId}/${reportId}.jpg`;
    const fileRef = storageRef(storage, path);

    // uploadBytesResumable gives us progress tracking
    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(fileRef, processedFile, { contentType: 'image/jpeg' });
      task.on(
        'state_changed',
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          console.log(`[reportService] Upload: ${pct}%`);
        },
        reject,
        resolve,
      );
    });

    const url = await getDownloadURL(fileRef);
    console.log('[reportService] ✅ Photo uploaded:', url);
    return url;
  } catch (err) {
    console.warn('[reportService] ⚠️ Photo upload failed — continuing without URL:', err);
    return '';
  }
}

// ─── Firebase RTDB Writes ─────────────────────────────────────────────────────

/**
 * Writes the report to all relevant RTDB nodes and records the submission
 * for rate-limit tracking.
 */
export async function saveReport(
  report: ReportPayload,
  verification: VerificationResult,
): Promise<void> {
  const { reportId, citizenId } = report;
  const lat = report.location.submittedLat;
  const lng = report.location.submittedLng;

  // 1. /pending_reports/{reportId} — full record for internal processing
  await set(ref(database, `pending_reports/${reportId}`), {
    ...report,
    verification: {
      ...report.verification,
      trustScore: verification.trustScore,
      status:     verification.status,
      details:    verification.details,
    },
  });
  console.log(`[reportService] ✅ Written to /pending_reports/${reportId}`);

  // 2. /citizen_reports/{citizenId}/{reportId} — what the citizen sees
  const progressUpdates = [
    { time: report.timestamp,       status: 'Submitted' },
    { time: report.timestamp + 100, status: 'Verifying...' },
    {
      time: report.timestamp + 200,
      status:
        verification.status === 'verified'
          ? `✅ Verified — Sent to DPCC`
          : verification.status === 'flagged'
          ? `⚠️ Flagged for manual review (Trust: ${verification.trustScore}/100)`
          : `❌ Could not verify — ${
              verification.details.rejectionReason === 'gps_mismatch'    ? 'Location mismatch'
            : verification.details.rejectionReason === 'rate_limit'      ? 'Too many reports today'
            : verification.details.rejectionReason === 'invalid_image'   ? 'Invalid image'
            : 'Low trust score'
            }`,
    },
  ];

  await set(ref(database, `citizen_reports/${citizenId}/${reportId}`), {
    reportId,
    status:      report.status,
    trustScore:  report.trustScore,
    issueType:   report.report.issueType,
    title:       getAlertTitle(report.report.issueType),
    description: report.report.description,
    severity:    report.report.severity,
    timestamp:   report.timestamp,
    photoUrl:    report.photo.url,
    location:    report.location,
    progressUpdates,
  });
  console.log(`[reportService] ✅ Written to /citizen_reports/${citizenId}/${reportId}`);

  // 3. /latest_alert — backward compat for govt portal polling
  await set(ref(database, 'latest_alert'), {
    id:            reportId,
    type:          report.report.issueType,
    title:         getAlertTitle(report.report.issueType),
    severity:      getSeverityFromLevel(report.report.severity),
    location:      report.location.address,
    description:   report.report.description,
    timestamp:     new Date(report.timestamp).toLocaleTimeString(),
    lat,
    lng,
    trustScore:    report.trustScore,
    photoUrl:      report.photo.url,
    isNew:         true,
    isFromCitizen: true,
  });
  console.log('[reportService] ✅ Written to /latest_alert');

  // 4. /active_alerts/{reportId} — government portal reads this
  if (verification.status === 'verified') {
    const wardId = getWardFromLocation(lat, lng);
    await set(ref(database, `active_alerts/${reportId}`), {
      sourceReportId:     reportId,
      citizenId,
      wardId,
      issueType:          report.report.issueType,
      title:              getAlertTitle(report.report.issueType),
      description:        report.report.description,
      photoUrl:           report.photo.url,
      location: {
        lat,
        lng,
        address: report.location.address,
        digiPin: report.location.digiPin,
      },
      severity:           getSeverityFromLevel(report.report.severity),
      trustScore:         verification.trustScore,
      citizenTrustBreakdown: verification.breakdown,
      timestamp:          report.timestamp,
      status:             'open',
      isFromCitizen:      true,
      governmentResponse: null,
      resolvedAt:         null,
    });
    console.log(`[reportService] ✅ Written to /active_alerts/${reportId} (ward: ${wardId})`);
  }

  // 5. Rate-limit tracking
  recordReportSubmission(citizenId);
  console.log(`[reportService] Report ${reportId} fully saved. Status: ${verification.status}`);
}
