import { recordReportSubmission } from '../utils/citizenUtils';
import type { VerificationResult } from './verificationService';

export interface ReportPayload {
  citizenId: string;
  reportId: string;
  timestamp: number;
  status: string;
  trustScore: number;
  location: { submittedLat: number | null; submittedLng: number | null; exifLat: number | null; exifLng: number | null; digiPin: string | null; address: string; };
  photo: { url: string; hasExif: boolean; cameraModel: string | null; captureTime: string | null; };
  report: { issueType: string; description: string; severity: string; };
  verification: any;
}

const LOCAL_REPORTS_KEY = 'dgp_citizen_reports';

function getLocalReports(citizenId: string): any[] {
  try {
    const key = `${LOCAL_REPORTS_KEY}_${citizenId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalReport(citizenId: string, report: any): void {
  try {
    const key = `${LOCAL_REPORTS_KEY}_${citizenId}`;
    const reports = getLocalReports(citizenId);
    reports.unshift(report);
    localStorage.setItem(key, JSON.stringify(reports.slice(0, 50)));
  } catch (e) {
    console.warn('[reportService] Failed to save to localStorage:', e);
  }
}

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

export function getAlertTitle(issueType: string): string {
  const titles: Record<string, string> = {
    'Biomass Burning': 'Biomass/Crop Burning Alert',
    'biomass_burning': 'Biomass/Crop Burning Alert',
    'Construction Dust': 'Construction Dust Violation',
    'construction_dust': 'Construction Dust Violation',
    'Industrial Smoke': 'Industrial Smoke Violation',
    'industrial': 'Industrial Smoke Violation',
    'Vehicle Pollution': 'Vehicle Emission Violation',
    'vehicular': 'Vehicle Emission Violation',
    'Garbage Burning': 'Open Garbage Burning Alert',
    'garbage_burning': 'Open Garbage Burning Alert',
    'Other': 'Pollution Incident Reported',
    'other': 'Pollution Incident Reported',
  };
  return titles[issueType] ?? 'Pollution Incident Reported';
}

export function getSeverityFromLevel(severity: string): string {
  const map: Record<string, string> = {
    high: 'Critical', High: 'Critical', Severe: 'Critical',
    medium: 'High', Medium: 'High', Moderate: 'High',
    low: 'Medium', Low: 'Medium', Mild: 'Medium',
  };
  return map[severity] ?? 'High';
}

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
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
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

export async function uploadPhoto(file: File, citizenId: string, reportId: string): Promise<string> {
  try {
    const processedFile = await compressImage(file);
    const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('./firebaseConfig');
    const path = `reports/${citizenId}/${reportId}.jpg`;
    const fileRef = storageRef(storage, path);
    await Promise.race([
      uploadBytes(fileRef, processedFile, { contentType: 'image/jpeg' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timeout')), 8000))
    ]);
    const url = await getDownloadURL(fileRef);
    console.log('[reportService] ✅ Photo uploaded:', url);
    return url;
  } catch (err) {
    console.warn('[reportService] ⚠️ Photo upload failed:', err);
    return `https://placeholder.com/pollution-${reportId}.jpg`;
  }
}

export async function saveReport(report: any, verification: VerificationResult): Promise<any> {
  const { reportId, citizenId } = report;
  const lat = report.location.submittedLat;
  const result: any = { wrotePaths: [], failedPaths: [], persistedLocally: false };

  const progressUpdates = [
    { time: report.timestamp, status: 'Submitted' },
    { time: report.timestamp + 100, status: 'Verifying...' },
    {
      time: report.timestamp + 200,
      status: verification.status === 'verified'
        ? '✅ Verified — Sent to DPCC'
        : verification.status === 'flagged'
        ? '⚠️ Flagged for manual review'
        : '❌ Could not verify',
    },
  ];

  const reportData: any = {
    reportId,
    status: report.status,
    trustScore: report.trustScore,
    issueType: report.report.issueType,
    title: getAlertTitle(report.report.issueType),
    description: report.report.description,
    severity: report.report.severity,
    timestamp: report.timestamp,
    photoUrl: report.photo.url,
    location: report.location,
    progressUpdates,
  };

  try {
    const { getDatabase, ref, set } = await import('firebase/database');
    const db = getDatabase();
    const dbRef = ref(db, `citizen_reports/${citizenId}/${reportId}`);
    await set(dbRef, reportData);
    result.wrotePaths.push(`citizen_reports/${citizenId}/${reportId}`);
  } catch (err) {
    console.warn('[reportService] ⚠️ Firebase not available, saving locally:', err);
    saveLocalReport(citizenId, report);
    result.persistedLocally = true;
  }

  try {
    const { getDatabase, ref, set } = await import('firebase/database');
    const db = getDatabase();
    const dbRef = ref(db, `pending_reports/${reportId}`);
    await set(dbRef, { ...report, verification: { trustScore: verification.trustScore, status: verification.status } });
  } catch {}

  if (verification.status === 'verified') {
    try {
      const { getDatabase, ref, set } = await import('firebase/database');
      const db = getDatabase();
      const wardId = getWardFromLocation(lat, report.location.submittedLng);
      const dbRef = ref(db, `active_alerts/${reportId}`);
      await set(dbRef, {
        sourceReportId: reportId, citizenId, wardId,
        issueType: report.report.issueType,
        title: getAlertTitle(report.report.issueType),
        description: report.report.description,
        photoUrl: report.photo.url,
        location: { lat, lng: report.location.submittedLng, address: report.location.address, digiPin: report.location.digiPin },
        severity: getSeverityFromLevel(report.report.severity),
        trustScore: verification.trustScore,
        timestamp: report.timestamp, status: 'open', isFromCitizen: true,
        governmentResponse: null, resolvedAt: null,
      });
    } catch {}
  }

  recordReportSubmission(citizenId);
  return result;
}

export { getLocalReports };
