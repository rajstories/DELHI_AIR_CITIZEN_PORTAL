import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Medal, Award, Target } from 'lucide-react';

export const Leaderboard: React.FC = () => {
  const topContributors = [
    { rank: 1, name: 'Priya Sharma', score: 1250, badge: '🥇', reports: 45, verified: 44, improvement: '+120' },
    { rank: 2, name: 'Arjun Kumar', score: 1180, badge: '🥈', reports: 42, verified: 40, improvement: '+95' },
    { rank: 3, name: 'Neha Patel', score: 1095, badge: '🥉', reports: 38, verified: 35, improvement: '+85' },
    { rank: 4, name: 'Rajesh Singh', score: 980, badge: '4️⃣', reports: 35, verified: 31, improvement: '+72' },
    { rank: 5, name: 'Anjali Verma', score: 920, badge: '5️⃣', reports: 32, verified: 29, improvement: '+65' },
    { rank: 6, name: 'Vikram Patel', score: 845, badge: '6️⃣', reports: 28, verified: 24, improvement: '+58' },
    { rank: 7, name: 'Deepika Roy', score: 780, badge: '7️⃣', reports: 25, verified: 21, improvement: '+48' },
    { rank: 8, name: 'Rohit Gupta', score: 715, badge: '8️⃣', reports: 22, verified: 18, improvement: '+42' },
  ];

  const yourStats = {
    rank: 116,
    score: 842,
    reports: 28,
    verified: 24,
    improvement: '+28',
  };

  const categories = [
    { title: 'Most Verified', leader: 'Priya Sharma', value: '44 reports', icon: '✓' },
    { title: 'Most Active', leader: 'Arjun Kumar', value: '42 submissions', icon: '🔥' },
    { title: 'Highest Score', leader: 'Priya Sharma', value: '1250 points', icon: '⭐' },
    { title: 'Fastest Riser', leader: 'Vikram Patel', value: '+58 this week', icon: '📈' },
  ];

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg z-10">
        <div className="px-4 pt-6 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <Trophy size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Leaderboard</h1>
              <p className="text-sm text-white/80">Delhi Air Citizen Portal</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Your Rank Card */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-yellow-100 to-orange-100 border-2 border-yellow-300 p-6 shadow-md"
        >
          <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-4">Your Position</p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 font-medium">Rank</p>
              <p className="text-2xl font-bold text-orange-600">#{yourStats.rank}</p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 font-medium">Score</p>
              <p className="text-2xl font-bold text-green-600">{yourStats.score}</p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 font-medium">Reports</p>
              <p className="text-2xl font-bold text-blue-600">{yourStats.reports}</p>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 font-medium">Verified</p>
              <p className="text-2xl font-bold text-purple-600">{yourStats.verified}</p>
            </div>
          </div>
          <div className="flex items-center justify-between bg-white/90 rounded-lg p-3">
            <span className="text-sm font-semibold text-gray-800">Weekly Improvement</span>
            <span className="text-lg font-bold text-green-600 flex items-center gap-1">
              <TrendingUp size={16} /> {yourStats.improvement}
            </span>
          </div>
        </motion.div>

        {/* Category Highlights */}
        <div>
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Category Leaders</p>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="text-2xl mb-2">{cat.icon}</p>
                <p className="text-xs font-bold text-gray-600 uppercase mb-1">{cat.title}</p>
                <p className="text-sm font-bold text-gray-900 truncate">{cat.leader}</p>
                <p className="text-xs text-green-600 font-semibold">{cat.value}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Top 8 Contributors */}
        <div>
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Top Contributors</p>
          <div className="space-y-2">
            {topContributors.map((contributor, idx) => (
              <motion.div
                key={contributor.rank}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`rounded-xl p-4 border-2 flex items-center gap-4 hover:shadow-lg transition-all ${
                  contributor.rank <= 3
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 shadow-md'
                    : 'bg-white border-gray-200'
                }`}
              >
                {/* Rank Badge */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                  contributor.rank === 1 ? 'bg-yellow-300 text-yellow-900' :
                  contributor.rank === 2 ? 'bg-gray-300 text-gray-900' :
                  contributor.rank === 3 ? 'bg-orange-300 text-orange-900' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {contributor.badge}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{contributor.name}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {contributor.verified}✓ verified
                    </span>
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      {contributor.reports} submitted
                    </span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-purple-600">{contributor.score}</p>
                  <p className="text-xs text-green-600 font-semibold">{contributor.improvement}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Achievement Section */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Medal size={24} className="text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">How to Climb the Leaderboard</h3>
          </div>
          <div className="space-y-3">
            <div className="flex gap-3">
              <Award size={18} className="text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold text-sm text-gray-900">Verified Reports</p>
                <p className="text-xs text-gray-600">Government agencies verify your reports → +25 points each</p>
              </div>
            </div>
            <div className="flex gap-3">
              <TrendingUp size={18} className="text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold text-sm text-gray-900">High Accuracy</p>
                <p className="text-xs text-gray-600">Submit quality photos with verified GPS → Bonus multiplier</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Target size={18} className="text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold text-sm text-gray-900">Consistency</p>
                <p className="text-xs text-gray-600">Report regularly throughout the month → Streak bonuses</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
