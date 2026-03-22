/**
 * TrustScoreBadge.tsx
 * Small pill that shows a report's trust status at a glance.
 */
import React from 'react';

interface TrustScoreBadgeProps {
  score: number | null;
  status: 'verified' | 'flagged' | 'rejected' | 'pending' | string;
}

export const TrustScoreBadge: React.FC<TrustScoreBadgeProps> = ({ score, status }) => {
  if (!score && score !== 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
        ⏳ Verifying...
      </span>
    );
  }

  if (status === 'verified' || score >= 70) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
        🟢 Verified {score}/100
      </span>
    );
  }

  if (status === 'flagged' || score >= 40) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
        🟡 Review {score}/100
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
      🔴 Rejected {score}/100
    </span>
  );
};
