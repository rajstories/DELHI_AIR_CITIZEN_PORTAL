import { recordReportSubmission } from '../utils/citizenUtils';
import { database } from './firebaseConfig';
import { ref, set } from 'firebase/database';
import type { VerificationResult } from './verificationService';

/**
 * reportService.ts
 * Handles photo compression, Firebase Storage upload, and all RTDB writes.
 */

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

export interface SaveReportResult {
  wrotePaths: string[];
  failedPaths: Array<{ path: string; reason: string }>;
  persistedLocally: boolean;
}

// ─── Helper: Ward lookup ──────────────────────────────────────────────────────

export function getWardFromLocation(lat: number | null, lng: number | null): string {
  if (lat === null || lng === null) return '000X';
  if (lat > 28.68 && lng < 77.15) return '024N';
  if (lat > 28.61 && lat <= 28.68 && lng > 77.20 && lng < 77.24) return '042S';
  if (lat < 28.56 && lng > 77.18 && lng < 77.26) return '083S';
  if (lat < 28.62 && lng < 77.10) return '067W';
  if (lat > 28.63 && lng > 77.28) return '091E';
  if (lat > 28.75) return '011N';
  return '000X';
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

async function compressImage(file: File, maxWidth = 1200, quality = 0.82): Promise<File> {
  const THRESHOLD = 500 * 1024;
  if (file.size <= THRESHOLD) return file;

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
        resolve(compressed);
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ─── Photo Upload ─────────────────────────────────────────────────────────────

export async function uploadPhoto(
  file: File,
  citizenId: string,
  reportId: string,
): Promise<string> {
  try {
    const processedFile = await compressImage(file);
    const { storage } = await import('./firebaseConfig');
    const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage');

    const path    = `reports/${citizenId}/${reportId}.jpg`;
    const fileRef = storageRef(storage, path);

    await Promise.race([
      uploadBytes(fileRef, processedFile, { contentType: 'image/jpeg' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timeout')), 8000))
    ]);

    const url = await getDownloadURL(fileRef);
    return url;
  } catch (err) {
    console.warn('[reportService] ⚠️ Photo upload failed:', err);
    return '';
  }
}

// ─── Firebase RTDB Writes ─────────────────────────────────────────────────────

export async function saveReport(
  report: ReportPayload,
  verification: VerificationResult,
): Promise<SaveReportResult> {
  const { reportId, citizenId } = report;
  const lat = report.location.submittedLat;
  const lng = report.location.submittedLng;
  const result: SaveReportResult = {
    wrotePaths: [],
    failedPaths: [],
    persistedLocally: false,
  };

  const safeSet = async (path: string, payload: unknown): Promise<boolean> => {
    try {
      await set(ref(database, path), payload);
      result.wrotePaths.push(path);
      return true;
    } catch (err) {
      result.failedPaths.push({ path, reason: String(err) });
      return false;
    }
  };

  // 1. /pending_reports/{reportId}
  await safeSet(`pending_reports/${reportId}`, {
    ...report,
    verification: {
      ...report.verification,
      trustScore: verification.trustScore,
      status:     verification.status,
      details:    verification.details,
    },
  });

  // 2. /citizen_reports/{citizenId}/{reportId}
  const progressUpdates = [
    { time: report.timestamp,       status: 'Submitted' },
    { time: report.timestamp + 100, status: 'Verifying...' },
    {
      time: report.timestamp + 200,
      status: verification.status === 'verified' ? '✅ Verified — Sent to DPCC' : '⚠️ Under Review',
    },
  ];

  await safeSet(`citizen_reports/${citizenId}/${reportId}`, {
    ...report,
    title: getAlertTitle(report.report.issueType),
    progressUpdates,
  });

  // 3. /active_alerts — government portal reads this for actioning
  if (verification.status === 'verified') {
    const wardId = getWardFromLocation(lat, lng);
    await safeSet(`active_alerts/${reportId}`, {
      // 🚨 REQUIRED BY SENIOR DEV (FLAT SCHEMA)
      title:              getAlertTitle(report.report.issueType),
      description:        report.report.description,
      location:           report.location.address,
      timestamp:          report.timestamp,
      status:             'open',
      
      // Metadata
      sourceReportId:     reportId,
      citizenId,
      wardId,
      issueType:          report.report.issueType,
      photoUrl:           report.photo.url,
      
      // Structured Coords
      coords: {
        lat,
        lng,
        digiPin: report.location.digiPin,
      },
      
      severity:           getSeverityFromLevel(report.report.severity),
      trustScore:         verification.trustScore,
      isFromCitizen:      true,
      governmentResponse: null,
      resolvedAt:         null,
    });
  }

  // 4. Persistence for offline scenarios (fallback)
  if (result.wrotePaths.length === 0) {
    localStorage.setItem(`dgp_unsent_report_${reportId}`, JSON.stringify({ report, verification }));
    result.persistedLocally = true;
  }

  recordReportSubmission(citizenId);
  return result;
}
