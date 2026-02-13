import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, Wind, Camera, Megaphone, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

export interface SuperAlertProps {
  data: {
    type: string; // "CRITICAL"
    title: string;
    aqi: number;
    location: string;
    time: string;
    govtAction: string[];
    reliefTime: string;
    canReport: boolean;
  };
  onReport: () => void;
}

export const SuperAlertCard: React.FC<SuperAlertProps> = ({ data, onReport }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-red-100 relative mb-6">
      {/* Top Border Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-red-600 to-red-500"></div>

      <div className="p-5">
        {/* 1. Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-3">
            {/* Animated Warning Icon */}
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 bg-red-500 rounded-full blur-md"
              />
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                className="relative bg-red-100 p-2 rounded-full text-red-600 border border-red-200 z-10"
              >
                <AlertTriangle size={24} fill="currentColor" />
              </motion.div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-black text-gray-900 leading-none tracking-tight">{data.title}</h2>
                <span className="bg-red-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                  AQI {data.aqi}
                </span>
              </div>
              <div className="flex items-center text-xs text-gray-500 font-medium">
                 <span className="mr-2">{data.location}</span>
                 <span className="w-1 h-1 bg-gray-300 rounded-full mr-2"></span>
                 <span>{data.time}</span>
              </div>
            </div>
          </div>
          
          <div className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
             LIVE
          </div>
        </div>

        {/* 2. Relief Forecast (Dark Theme) */}
        <div className="bg-slate-900 rounded-xl p-4 mb-4 text-white relative overflow-hidden shadow-inner">
           {/* Decorative bg element */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-10 rounded-full blur-2xl -mr-10 -mt-10"></div>
           
           <div className="relative z-10">
               <div className="flex items-center gap-2 mb-2 text-blue-200 text-xs font-bold uppercase tracking-widest">
                   <TrendingDown size={14} />
                   <span>Relief Forecast</span>
               </div>
               
               <p className="text-sm font-medium leading-relaxed mb-3 text-slate-100">
                   Prediction: Air quality expected to improve by <span className="text-green-400 font-bold">6:00 PM</span> due to wind shift.
               </p>

               {/* Custom Progress Bar */}
               <div className="relative pt-1">
                   <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                       <span className="text-red-400">Current: {data.aqi}</span>
                       <span className="text-green-400">Target: &lt; 200</span>
                   </div>
                   <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: "100%" }}
                         animate={{ width: "40%" }}
                         transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
                         className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full relative"
                       >
                           <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white]"></div>
                       </motion.div>
                   </div>
                   <div className="flex items-center justify-end gap-1 mt-1.5 text-[10px] text-slate-400">
                       <Wind size={10} />
                       <span>Est. time: {data.reliefTime}</span>
                   </div>
               </div>
           </div>
        </div>

        {/* 3. Live Government Action (Ticker Style) */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="bg-blue-600 text-white p-1 rounded">
                    <Megaphone size={12} />
                </div>
                <span className="text-xs font-black text-blue-900 uppercase tracking-wider">GOVT ACTION LIVE:</span>
            </div>
            
            <div className="space-y-2 pl-1">
                {data.govtAction.map((action, idx) => (
                    <motion.div 
                        key={idx}
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 + (idx * 0.1) }}
                        className="flex items-start gap-2 text-sm text-blue-900"
                    >
                        <CheckCircle2 size={16} className="text-blue-500 mt-0.5 shrink-0" />
                        <span className="font-medium">{action}</span>
                    </motion.div>
                ))}
            </div>
        </div>

        {/* 4. Verify Action Button (Gamification) */}
        {data.canReport && (
            <motion.button 
                whileTap={{ scale: 0.98 }}
                onClick={onReport}
                className="w-full group relative overflow-hidden bg-white border-2 border-green-500 text-green-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-50 transition-colors shadow-sm"
            >
                <div className="p-1.5 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                    <Camera size={18} className="text-green-600" />
                </div>
                <span>See a violation? Report & Earn</span>
                <span className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">+50 Pts</span>
                
                {/* Shine Effect */}
                <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-40 group-hover:animate-shine" />
            </motion.button>
        )}

      </div>
    </div>
  );
};
