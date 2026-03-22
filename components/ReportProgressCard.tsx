/**
 * ReportProgressCard.tsx
 * A card showing one citizen report's full status + progress timeline.
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  Flame, HardHat, Factory, Car, Trash2, HelpCircle,
  CheckCircle2, Clock, RefreshCw, Circle, AlertCircle
} from 'lucide-react';
import { TrustScoreBadge } from './TrustScoreBadge';
import type { ReportData } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ISSUE_ICONS: Record<string, any> = {
  'Biomass Burning':   Flame,
  'biomass_burning':   Flame,
  'Construction Dust': HardHat,
  'construction_dust': HardHat,
  'Industrial Smoke':  Factory,
  'industrial':        Factory,
  'Vehicle Pollution': Car,
  'vehicular':         Car,
  'Garbage Burning':   Trash2,
  'garbage_burning':   Trash2,
};

function getIssueIcon(issueType: string) {
  return ISSUE_ICONS[issueType] ?? HelpCircle;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getIssueLabel(issueType: string): string {
  const labels: Record<string, string> = {
    biomass_burning:   'Biomass Burning',
    construction_dust: 'Construction Dust',
    industrial:        'Industrial Smoke',
    vehicular:         'Vehicle Pollution',
    garbage_burning:   'Garbage Burning',
    other:             'Other',
  };
  return labels[issueType] ?? issueType;
}

// ─── Step icon for progress timeline ─────────────────────────────────────────

type StepState = 'done' | 'current' | 'future';

const TimelineStep: React.FC<{
  label: string;
  state: StepState;
  isLast: boolean;
}> = ({ label, state, isLast }) => (
  <div className="flex items-start gap-2">
    <div className="flex flex-col items-center shrink-0">
      {state === 'done' ? (
        <CheckCircle2 size={16} className="text-green-500" />
      ) : state === 'current' ? (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        >
          <RefreshCw size={16} className="text-blue-500" />
        </motion.div>
      ) : (
        <Circle size={16} className="text-gray-300" />
      )}
      {!isLast && (
        <div className={`w-0.5 h-4 mt-0.5 ${state === 'done' ? 'bg-green-300' : 'bg-gray-200'}`} />
      )}
    </div>
    <p className={`text-xs leading-tight mt-0 -mt-px ${
      state === 'done'    ? 'text-gray-700 font-medium'
      : state === 'current' ? 'text-blue-600 font-semibold'
      : 'text-gray-400'
    }`}>
      {label}
    </p>
  </div>
);

// ─── Status footer bar ────────────────────────────────────────────────────────

const StatusBar: React.FC<{ report: ReportData }> = ({ report }) => {
  const { status } = report;
  if (status === 'open' || status === 'verified') return (
    <p className="text-xs text-red-600 font-medium">🔴 Awaiting government response</p>
  );
  if (status === 'in_progress') return (
    <p className="text-xs text-blue-600 font-medium">🔄 Officer assigned — action underway</p>
  );
  if (status === 'resolved') return (
    <p className="text-xs text-green-700 font-medium">✅ Resolved</p>
  );
  if (status === 'flagged') return (
    <p className="text-xs text-amber-600 font-medium">⚠️ Under manual review</p>
  );
  if (status === 'rejected') return (
    <p className="text-xs text-red-500 font-medium">❌ Could not verify</p>
  );
  return <p className="text-xs text-gray-500">Processing...</p>;
};

// ─── Main card ────────────────────────────────────────────────────────────────

interface Props { report: ReportData; index: number; }

export const ReportProgressCard: React.FC<Props> = ({ report, index }) => {
  const IssueIcon = getIssueIcon(report.issueType);
  const updates = report.progressUpdates ?? [];

  // Build timeline steps
  // Fixed steps are: Submitted / Verifying / Status / (Officer Assigned) / (Resolved)
  const timelineSteps: { label: string; state: StepState }[] = [];

  const updateLabels = updates.map(u => u.status);

  // Step 0: Submitted — always done once we have the report
  timelineSteps.push({ label: updateLabels[0] ?? 'Submitted', state: 'done' });

  // Step 1: Verifying — done if we have step 2+
  if (updateLabels.length >= 2) {
    timelineSteps.push({ label: updateLabels[1] ?? 'Verifying...', state: 'done' });
  } else {
    timelineSteps.push({ label: 'Verifying...', state: 'current' });
  }

  // Step 2: Final verification status
  if (updateLabels.length >= 3) {
    timelineSteps.push({ label: updateLabels[2], state: 'done' });
  } else if (updateLabels.length === 2) {
    timelineSteps.push({ label: 'Sending to DPCC...', state: 'current' });
  }

  // Step 3: Officer assigned (govt update)
  if (report.status === 'in_progress' || report.status === 'resolved') {
    timelineSteps.push({ label: '🔄 Officer Assigned', state: 'done' });
  } else {
    timelineSteps.push({ label: 'Officer Assignment', state: 'future' });
  }

  // Step 4: Resolved
  timelineSteps.push({
    label: '✅ Resolved',
    state: report.status === 'resolved' ? 'done' : 'future',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* Top row */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <IssueIcon size={16} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {report.title ?? getIssueLabel(report.issueType)}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {report.location?.address ?? 'Delhi, India'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <TrustScoreBadge score={report.trustScore} status={report.status} />
            <span className="text-[10px] text-gray-400">{timeAgo(report.timestamp)}</span>
          </div>
        </div>

        {/* Body: timeline + photo */}
        <div className="flex gap-3">
          {/* Timeline */}
          <div className="flex-1 space-y-1 pt-1">
            {timelineSteps.map((step, i) => (
              <TimelineStep
                key={i}
                label={step.label}
                state={step.state}
                isLast={i === timelineSteps.length - 1}
              />
            ))}
          </div>

          {/* Photo thumbnail */}
          {report.photoUrl ? (
            <div className="shrink-0">
              <img
                src={report.photoUrl}
                alt="Report"
                className="w-16 h-16 rounded-xl object-cover border border-gray-200"
              />
            </div>
          ) : (
            <div className="shrink-0 w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
              <AlertCircle size={20} className="text-gray-300" />
            </div>
          )}
        </div>
      </div>

      {/* Status footer */}
      <div className="bg-gray-50 border-t border-gray-100 px-4 py-2">
        <StatusBar report={report} />
      </div>
    </motion.div>
  );
};
