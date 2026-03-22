/**
 * MyReports.tsx
 * Citizen's personal report tracker — reads from /citizen_reports/{citizenId}
 * and updates in real-time via Firebase onValue listener.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Camera, RefreshCw } from 'lucide-react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../src/services/firebaseConfig';
import { getCitizenId } from '../src/utils/citizenUtils';
import { ReportProgressCard } from '../components/ReportProgressCard';
import type { ReportData } from '../types';

// ─── LocalStorage badge tracking ──────────────────────────────────────────────

const LAST_VIEWED_KEY = 'dgp_reports_last_viewed';

function markAsViewed(): void {
  localStorage.setItem(LAST_VIEWED_KEY, String(Date.now()));
}

export function getUnreadReportCount(reports: ReportData[]): number {
  const lastViewed = Number(localStorage.getItem(LAST_VIEWED_KEY) ?? '0');
  return reports.filter(r =>
    // Report is "unread" if any progress update is newer than lastViewed
    (r.progressUpdates ?? []).some(u => u.time > lastViewed)
  ).length;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface MyReportsProps {
  onScanClick: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const MyReports: React.FC<MyReportsProps> = ({ onScanClick }) => {
  const [reports, setReports]     = useState<ReportData[]>([]);
  const [loading, setLoading]     = useState(true);
  const listenerRef               = useRef<ReturnType<typeof onValue> | null>(null);
  const citizenId                 = getCitizenId();

  useEffect(() => {
    markAsViewed();

    const dbRef = ref(database, `citizen_reports/${citizenId}`);

    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          setReports([]);
          setLoading(false);
          return;
        }
        // Convert object → array, sort newest first
        const arr: ReportData[] = Object.values(data);
        arr.sort((a, b) => b.timestamp - a.timestamp);
        setReports(arr);
        setLoading(false);
      },
      (err) => {
        console.error('[MyReports] Firebase read error:', err);
        setLoading(false);
      },
    );

    return () => {
      // Firebase onValue returns an unsubscribe function
      unsubscribe();
    };
  }, [citizenId]);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!loading && reports.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-24 h-24 rounded-3xl bg-blue-50 flex items-center justify-center mb-6 shadow-sm"
        >
          <ClipboardList size={44} className="text-blue-300" />
        </motion.div>
        <h3 className="text-lg font-bold text-gray-800 mb-1">No reports yet</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed max-w-[240px]">
          Spot a pollution violation? Tap Snap to report it and earn trust points!
        </p>
        <button
          onClick={onScanClick}
          className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold px-6 py-3 rounded-2xl shadow-md active:scale-95 transition-all"
        >
          <Camera size={18} /> Snap Now
        </button>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-2 bg-gray-100 rounded w-1/2" />
              </div>
              <div className="w-16 h-5 bg-gray-200 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Report list ───────────────────────────────────────────────────────────
  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-gray-50 z-10 px-4 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Reports</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {reports.length} report{reports.length !== 1 ? 's' : ''} submitted
            </p>
          </div>
          <button
            onClick={onScanClick}
            className="flex items-center gap-1.5 bg-green-500 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all"
          >
            <Camera size={14} /> New Report
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="px-4 pt-4 space-y-3">
        <AnimatePresence>
          {reports.map((report, i) => (
            <ReportProgressCard key={report.reportId} report={report} index={i} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MyReports;
