import React, { useMemo } from 'react';
import { Trophy, Crown, Flame, Zap, Medal } from 'lucide-react';
import { motion } from 'framer-motion';

interface WardRakshakProps {
  userPoints?: number;
}

interface Competitor {
  id: string;
  name: string;
  points: number;
  ward: string;
  avatar: string;
  status?: string;
  isMe?: boolean;
}

// Static Competitor Data
const COMPETITORS: Competitor[] = [
  {
    id: "p1",
    name: "Sharma Ji",
    points: 2100,
    ward: "Rohini Sec-18",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneesh",
    status: "🔥 On Fire",
  },
  {
    id: "p2",
    name: "Anjali Singh",
    points: 1850,
    ward: "Rohini Sec-18",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anjali",
  },
  {
    id: "p3",
    name: "Rahul Techie",
    points: 1400,
    ward: "Rohini Sec-18",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul",
  }
];

export const WardRakshak: React.FC<WardRakshakProps> = ({ userPoints = 1250 }) => {
  
  // Dynamic Leaderboard Logic
  const { sortedList, currentUserRank, nextRival } = useMemo(() => {
    const me: Competitor = {
        id: "user_007",
        name: "You",
        points: userPoints,
        ward: "Rohini Sec-18",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
        isMe: true
    };

    // Combine and Sort
    const allPlayers = [...COMPETITORS, me].sort((a, b) => b.points - a.points);
    
    // Assign Ranks
    const sortedWithRank = allPlayers.map((p, index) => ({
        ...p,
        rank: index + 1
    }));

    const myData = sortedWithRank.find(p => p.isMe)!;
    
    // Find Next Rival (The person directly above me)
    const myIndex = sortedWithRank.findIndex(p => p.isMe);
    const rival = myIndex > 0 ? sortedWithRank[myIndex - 1] : null;

    return {
        sortedList: sortedWithRank,
        currentUserRank: myData,
        nextRival: rival
    };
  }, [userPoints]);

  
  // Calculate progress for sticky footer
  let progressToNext = 100;
  let pointsNeeded = 0;
  let rivalName = "No one";

  if (nextRival) {
      const diff = nextRival.points - currentUserRank.points;
      pointsNeeded = diff + 1; // +1 to beat
      // Visual progress: assume a bracket of 500 points for the bar
      progressToNext = Math.max(0, Math.min(100, 100 - (diff / 500 * 100)));
      rivalName = nextRival.name;
  } else {
      rivalName = "Top Rank!";
  }

  return (
    <div className="min-h-full bg-gray-50 pb-40 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white sticky top-0 z-30 shadow-sm border-b border-gray-100">
        <div className="p-4 flex justify-between items-center max-w-[640px] mx-auto">
          <h1 className="text-xl font-extrabold text-gov-navy uppercase tracking-tight">
            Top Ward Protectors
          </h1>
          <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
            Rohini Sec-18
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-[640px] mx-auto">
        
        {/* Top Rankers List */}
        {sortedList.map((user, index) => {
          const isFirst = user.rank === 1;
          const isMe = user.isMe;
          
          let trophyColor = "text-gray-300";
          if (user.rank === 1) trophyColor = "text-yellow-400";
          if (user.rank === 3) trophyColor = "text-orange-400";

          return (
            <motion.div
              layout
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl p-4 flex items-center shadow-sm border transition-colors ${
                isFirst 
                  ? 'bg-yellow-50 border-yellow-200 border-l-[6px] border-l-yellow-400' 
                  : isMe
                    ? 'bg-blue-50 border-blue-200 border-l-[6px] border-l-gov-navy'
                    : 'bg-white border-gray-100'
              }`}
            >
              {/* Rank Number */}
              <div className={`w-8 text-xl font-bold ${isFirst ? 'text-yellow-600' : 'text-gray-400'}`}>
                #{user.rank}
              </div>

              {/* Avatar & Crown */}
              <div className="relative mx-3">
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className={`w-12 h-12 rounded-full bg-gray-200 object-cover ${isFirst ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`} 
                />
                {isFirst && (
                  <div className="absolute -top-4 -right-2 bg-white rounded-full p-1 shadow-sm border border-yellow-100 animate-bounce">
                     <Crown size={16} className="text-yellow-500 fill-yellow-500" />
                  </div>
                )}
              </div>

              {/* User Details */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold text-base ${isFirst ? 'text-gray-900' : 'text-gray-800'} ${isMe ? 'text-blue-800' : ''}`}>
                    {user.name} {isMe && "(You)"}
                  </h3>
                  {user.status && (
                    <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-200">
                      {user.status}
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium text-gray-500 mt-0.5">
                  {user.points} Green Credits
                </div>
              </div>

              {/* Trophy Icon */}
              <div>
                <Trophy 
                  className={trophyColor} 
                  size={24} 
                  fill={isFirst ? '#facc15' : 'currentColor'} 
                  fillOpacity={isFirst ? 1 : 0.2}
                />
              </div>
            </motion.div>
          );
        })}

        {/* Motivational Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white flex items-center gap-3 shadow-lg mt-6">
            <div className="bg-white/20 p-2 rounded-full">
                <Zap size={24} className="text-yellow-300" fill="currentColor" />
            </div>
            <div>
                <p className="font-bold text-sm">Snap pollution sources!</p>
                <p className="text-xs text-blue-100">Earn +50 credits for every verified report.</p>
            </div>
        </div>

      </div>

      {/* Current User Sticky Footer */}
      <div className="fixed bottom-[64px] left-0 right-0 z-40 bg-slate-800 text-white shadow-[0_-4px_20px_rgba(0,0,0,0.2)] border-t border-slate-700">
        <div className="max-w-[640px] mx-auto p-4 flex items-center gap-4">
          
          {/* Rank Box */}
          <div className="flex flex-col items-center justify-center bg-slate-700/50 rounded-lg px-3 py-1 min-w-[3.5rem] border border-slate-600">
            <span className="text-2xl font-bold leading-none">{currentUserRank.rank}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rank</span>
          </div>

          {/* User Stats & Progress */}
          <div className="flex-1">
             <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{currentUserRank.name}</span>
                    <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        {currentUserRank.points} pts
                    </span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-yellow-400 animate-pulse">
                    {nextRival ? (
                        <>
                            <Zap size={12} fill="currentColor" />
                            <span>{pointsNeeded} pts to beat {rivalName}</span>
                        </>
                    ) : (
                        <span>🏆 You are top rank!</span>
                    )}
                </div>
             </div>

             {/* Progress Bar */}
             <div className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                 <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-yellow-400 rounded-full transition-all duration-1000 ease-out relative"
                    style={{ width: `${progressToNext}%` }}
                 >
                     <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 blur-[1px]"></div>
                 </div>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
};
