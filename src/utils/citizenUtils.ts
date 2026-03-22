/**
 * citizenUtils.ts
 * Citizen identity and rate-limit tracking via localStorage.
 * No auth required — uses a persistent anonymous ID.
 */

const CITIZEN_ID_KEY = 'dgp_citizen_id';
const REPORT_TIMESTAMPS_PREFIX = 'dgp_reports_';
const MS_24H = 24 * 60 * 60 * 1000;

/**
 * Returns a persistent anonymous citizen ID.
 * Generated once, stored in localStorage, reused across sessions.
 */
export function getCitizenId(): string {
  const stored = localStorage.getItem(CITIZEN_ID_KEY);
  if (stored) return stored;
  const newId = 'anon_' + Math.random().toString(36).substring(2, 11);
  localStorage.setItem(CITIZEN_ID_KEY, newId);
  return newId;
}

/**
 * Records a report submission timestamp for rate-limit tracking.
 * Automatically prunes entries older than 24 hours to keep storage lean.
 */
export function recordReportSubmission(citizenId: string): void {
  try {
    const key = REPORT_TIMESTAMPS_PREFIX + citizenId;
    const raw = localStorage.getItem(key);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - MS_24H;
    const fresh = timestamps.filter(ts => ts > cutoff);
    fresh.push(Date.now());
    localStorage.setItem(key, JSON.stringify(fresh));
  } catch {
    // Silent — never block a submission
  }
}

/**
 * Returns the count of reports submitted by this citizen in the last 24 hours.
 */
export function getReportCountToday(citizenId: string): number {
  try {
    const key = REPORT_TIMESTAMPS_PREFIX + citizenId;
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const timestamps: number[] = JSON.parse(raw);
    const cutoff = Date.now() - MS_24H;
    return timestamps.filter(ts => ts > cutoff).length;
  } catch {
    return 0;
  }
}
