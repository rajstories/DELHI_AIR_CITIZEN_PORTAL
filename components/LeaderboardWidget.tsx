import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, TrendingUp, Flame, Star } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LeaderboardWidgetProps {
    currentUserPoints?: number;
}

// Mock Data as specified
const BASE_LEADERBOARD_DATA = {
  topRankers: [
    {
      id: "p1",
      rank: 1,
      name: "Sharma Ji",
      points: 2100,
      ward: "Rohini Sec-18",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneesh",
      status: "🔥 On Fire",
      badges: ["Guardian"]
    },
    {
      id: "p2",
      rank: 2,
      name: "Anjali Singh",
      points: 1850,
      ward: "Rohini Sec-18",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anjali",
      badges: ["Eco Warrior"]
    },
    {
      id: "p3",
      rank: 3,
      name: "Rahul Techie",
      points: 1400,
      ward: "Rohini Sec-18",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul",
      badges: ["Carbon Cutter"]
    }
  ]
};

export const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({ currentUserPoints = 1250 }) => {
  const { t } = useLanguage();
  
  // Calculate dynamic data based on points
  const nextMilestone = 1400; // Hardcoded goal for now
  const pointsToNext = Math.max(0, nextMilestone - currentUserPoints);
  const progressPercent = Math.min(100, (currentUserPoints / nextMilestone) * 100);

  // Dynamic current user object
  const currentUser = {
    id: "user_007",
    name: "You",
    rank: 4,
    points: currentUserPoints,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  };

  return (
    <div className="px-1 mt-4 space-y-3">
      
      {/* Header */}
      <div className="flex items-center justify-between px-2">
         <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('leaderboard.title') || 'Top Ward Protectors'}</h3>
         <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Rohini Sec-18</span>
      </div>

      {/* Top 3 List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {BASE_LEADERBOARD_DATA.topRankers.map((user, index) => (
          <motion.div 
            key={user.id}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.15, type: "spring", stiffness: 100 }}
            className={`flex items-center p-4 border-b border-gray-50 last:border-0 relative ${user.rank === 1 ? 'bg-gradient-to-r from-yellow-50 to-white' : ''}`}
          >
            {/* Sharma Ji Special Gold Border Effect */}
            {user.rank === 1 && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400"></div>
            )}

            {/* Rank */}
            <div className={`w-6 font-bold text-lg ${user.rank === 1 ? 'text-yellow-600' : 'text-gray-400'}`}>#{user.rank}</div>
            
            {/* Avatar */}
            <div className="relative mr-3 ml-1">
               <img 
                 src={user.avatar} 
                 alt={user.name} 
                 className={`w-10 h-10 rounded-full bg-gray-100 object-cover ${user.rank === 1 ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`} 
               />
               {user.rank === 1 && (
                 <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="absolute -top-3 -right-2 bg-white rounded-full p-1 shadow-sm border border-yellow-100"
                 >
                    <Crown size={14} className="text-yellow-500 fill-yellow-500" />
                 </motion.div>
               )}
            </div>

            {/* Info */}
            <div className="flex-1">
               <div className="flex items-center gap-2 flex-wrap">
                 <span className="font-bold text-gray-900 text-sm">{user.name}</span>
                 {user.status && (
                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 border border-red-200">
                        <Flame size={10} fill="currentColor" /> {user.status.replace('🔥 ', '')}
                    </span>
                 )}
               </div>
               <div className="text-xs text-gray-500 font-medium">{user.points} Green Credits</div>
            </div>

            {/* Medal Icons */}
            <div>
               {user.rank === 1 ? <Trophy className="text-yellow-500 drop-shadow-sm" size={20} fill="#fde047" /> : 
                user.rank === 2 ? <Medal className="text-gray-400" size={20} /> :
                <Medal className="text-orange-400" size={20} />
               }
            </div>
          </motion.div>
        ))}
      </div>

      {/* Current User Floating Bar */}
      <motion.div 
        layout
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        className="bg-gov-navy rounded-xl p-4 text-white shadow-xl shadow-indigo-900/10 relative overflow-hidden"
      >
          {/* Decorative Background */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400 opacity-10 rounded-full -ml-12 -mb-12 pointer-events-none"></div>
          
          <div className="flex items-center gap-4 relative z-10">
              <div className="text-center min-w-[3rem]">
                  <div className="text-3xl font-bold leading-none tracking-tighter">{currentUser.rank}</div>
                  <div className="text-[9px] uppercase font-bold text-blue-200 tracking-wider mt-1">Rank</div>
              </div>
              
              <div className="flex-1 border-l border-white/10 pl-4">
                  <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">You</span>
                          <span className="text-[10px] bg-white/20 px-1.5 rounded text-white/90">
                              {currentUser.points} pts
                          </span>
                      </div>
                      <span className="text-xs font-bold text-yellow-300 flex items-center gap-1">
                          <TrendingUp size={12} />
                          {pointsToNext > 0 ? `${pointsToNext} pts to beat Rahul` : "You beat Rahul!"}
                      </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="relative w-full h-2.5 bg-blue-950/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                      <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${progressPercent}%` }}
                         transition={{ duration: 1.5, delay: 0.6, ease: "circOut" }}
                         className="h-full bg-gradient-to-r from-green-400 to-yellow-400 rounded-full relative"
                      >
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50"></div>
                      </motion.div>
                  </div>
              </div>
          </div>
      </motion.div>
    </div>
  );
};