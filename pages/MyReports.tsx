/**
 * MyReports.tsx
 * Citizen's personal report tracker — reads from Firebase first,
 * with localStorage fallback when Firebase is not configured.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Camera, RefreshCw, Trophy, TrendingUp, Medal, Award, Target } from 'lucide-react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../src/services/firebaseConfig';
import { getCitizenId } from '../src/utils/citizenUtils';
import { ReportProgressCard } from '../components/ReportProgressCard';
import { getLocalReports } from '../src/services/reportService';
import type { ReportData } from '../types';

const LAST_VIEWED_KEY = 'dgp_reports_last_viewed';

function markAsViewed(): void {
  localStorage.setItem(LAST_VIEWED_KEY, String(Date.now()));
}

export function getUnreadReportCount(reports: ReportData[]): number {
  const lastViewed = Number(localStorage.getItem(LAST_VIEWED_KEY) ?? '0');
  return reports.filter(r =>
    (r.progressUpdates ?? []).some(u => u.time > lastViewed)
  ).length;
}

interface MyReportsProps {
  onScanClick: () => void;
}

const MyReports: React.FC<MyReportsProps> = ({ onScanClick }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [useLocalStorage, setUseLocalStorage] = useState(false);
  const citizenId = getCitizenId();

  useEffect(() => {
    markAsViewed();

    // Try Firebase first
    try {
      const dbRef = ref(database, `citizen_reports/${citizenId}`);
      
      const unsubscribe = onValue(
        dbRef,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const arr: ReportData[] = Object.values(data);
            arr.sort((a, b) => b.timestamp - a.timestamp);
            setReports(arr);
            setUseLocalStorage(false);
          } else {
            // No data in Firebase - try localStorage fallback
            loadLocalReports();
          }
          setLoading(false);
        },
        (err) => {
          console.warn('[MyReports] Firebase not available, using localStorage:', err);
          loadLocalReports();
        },
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('[MyReports] Firebase error:', err);
      loadLocalReports();
    }

    function loadLocalReports() {
      const localReports = getLocalReports(citizenId);
      setReports(localReports);
      setUseLocalStorage(true);
      setLoading(false);
    }
  }, [citizenId]);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!loading && reports.length === 0) {
    return (
      <div className="pb-24">
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

        {/* Ranking/Leaderboard Section */}
        <div className="px-4 py-8 pb-6">
          <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-600 rounded-full text-white">
                <Trophy size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Your Contribution Rank</h2>
                <p className="text-xs text-gray-600">Delhi Air Citizen Portal</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-xl p-4 text-center border border-purple-100">
                <p className="text-xs text-gray-600 font-medium mb-1">Your Rank</p>
                <p className="text-2xl font-bold text-purple-600">—</p>
                <p className="text-[10px] text-gray-500 mt-1">New member</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center border border-blue-100">
                <p className="text-xs text-gray-600 font-medium mb-1">Trust Score</p>
                <p className="text-2xl font-bold text-blue-600">0</p>
                <p className="text-[10px] text-gray-500 mt-1">Start reporting!</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center border border-green-100">
                <p className="text-xs text-gray-600 font-medium mb-1">Verified</p>
                <p className="text-2xl font-bold text-green-600">0</p>
                <p className="text-[10px] text-gray-500 mt-1">reports submitted</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Top Contributors This Month</p>
              <div className="space-y-2.5">
                {[
                  { rank: 1, name: 'Priya Sharma', score: 1250, badge: '🥇' },
                  { rank: 2, name: 'Arjun Kumar', score: 1180, badge: '🥈' },
                  { rank: 3, name: 'Neha Patel', score: 1095, badge: '🥉' },
                ].map((leader, idx) => (
                  <motion.div
                    key={leader.rank}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <span className="text-xl">{leader.badge}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{leader.name}</p>
                      <p className="text-xs text-gray-500">Trust Score: {leader.score}</p>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 font-bold text-sm">
                      <TrendingUp size={14} /> {leader.score}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-3 border border-yellow-200">
              <p className="text-[11px] font-bold text-gray-800">
                💡 Start reporting pollution and climb the leaderboard! Every verified report earns you trust points and contributes to a cleaner Delhi.
              </p>
            </div>
          </div>
        </div>
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
              {useLocalStorage && ' (saved locally)'}
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

      {/* Ranking/Leaderboard Section */}
      <div className="px-4 pt-8 pb-6 space-y-6">
        {/* Your Position */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-gradient-to-b from-yellow-100 to-yellow-50 border-2 border-yellow-300 p-6 shadow-lg"
        >
          <p className="text-xs font-bold text-orange-800 uppercase tracking-widest mb-4">Your Position</p>
          
          <div className="grid grid-cols-4 gap-2.5 mb-5">
            <div className="bg-white rounded-xl p-3 text-center border border-yellow-100 shadow-sm">
              <p className="text-[10px] text-gray-600 font-bold mb-1">Rank</p>
              <p className="text-2xl font-bold text-orange-600">#116</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-yellow-100 shadow-sm">
              <p className="text-[10px] text-gray-600 font-bold mb-1">Score</p>
              <p className="text-2xl font-bold text-green-600">842</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-yellow-100 shadow-sm">
              <p className="text-[10px] text-gray-600 font-bold mb-1">Reports</p>
              <p className="text-2xl font-bold text-blue-600">{reports.length}</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-yellow-100 shadow-sm">
              <p className="text-[10px] text-gray-600 font-bold mb-1">Verified</p>
              <p className="text-2xl font-bold text-green-600">
                {reports.filter(r => r.status === 'verified' || r.status?.includes('Verified')).length}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Top Contributors This Month</p>
            {[
              { rank: 1, name: 'Priya Sharma', score: 1250, badge: '🥇', verified: 44, improvement: '+120' },
              { rank: 2, name: 'Arjun Kumar', score: 1180, badge: '🥈', verified: 41, improvement: '+95' },
              { rank: 3, name: 'Neha Patel', score: 1095, badge: '🥉', verified: 38, improvement: '+80' },
            ].map((leader, idx) => (
              <motion.div
                key={leader.rank}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`flex items-center gap-3 bg-white rounded-xl p-3 border ${
                  leader.rank === 1 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 shadow-md' : 'border-gray-200'
                }`}
              >
                <span className="text-xl">{leader.badge}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">{leader.name}</p>
                  <p className="text-xs text-gray-500">{leader.verified} verified • {leader.improvement}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">{leader.score}</p>
                  <p className="text-[10px] text-gray-400">points</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Info Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-bold text-blue-800 mb-2">📊 How Your Reports Are Tracked</p>
          <div className="space-y-1.5 text-[11px] text-blue-700">
            <p>• <strong>Verified</strong> — AI confirmed authentic → +points</p>
            <p>• <strong>Flagged</strong> — Sent for manual review</p>
            <p>• <strong>Rejected</strong> — Failed verification checks</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyReports;
