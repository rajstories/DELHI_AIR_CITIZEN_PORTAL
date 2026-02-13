import React from 'react';
import { MapPin, Navigation, Leaf, Clock, Cigarette, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const SafeCommute: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="px-1 mt-2">
      <div className="flex items-center justify-between mb-3 ml-1">
         <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('commute.title')}</h3>
         <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold">BETA</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
        {/* Input Simulation */}
        <div className="flex gap-3 mb-6 relative">
           {/* Connecting Line */}
           <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-gray-200"></div>
           
           <div className="flex flex-col justify-between h-20 py-1">
             <div className="w-5 h-5 rounded-full border-4 border-gov-navy bg-white z-10"></div>
             <div className="w-5 h-5 rounded-full border-4 border-blue-400 bg-white z-10"></div>
           </div>
           
           <div className="flex-1 space-y-3">
             <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 flex justify-between items-center border border-gray-100">
                <span>{t('commute.home')}</span>
                <span className="text-xs text-gray-400 font-normal">Rohini Sec 13</span>
             </div>
             <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 flex justify-between items-center border border-gray-100">
                <span>{t('commute.work')}</span>
                <span className="text-xs text-gray-400 font-normal">Connaught Place</span>
             </div>
           </div>
        </div>

        {/* Route Comparison */}
        <div className="space-y-3">
            
            {/* Route A - Dirty */}
            <div className="border border-red-100 bg-red-50/50 rounded-xl p-3 relative opacity-90">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <div className="bg-red-100 p-1.5 rounded-full text-red-600">
                            <Navigation size={16} />
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-red-800 uppercase tracking-wider">{t('commute.route.fastest')}</span>
                            <span className="block text-xs text-gray-500">Via Ring Road</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="block text-lg font-bold text-gray-900">25 {t('commute.min')}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 text-red-700 font-semibold">
                         <AlertTriangle size={14} />
                         <span>AQI 400</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                         <Cigarette size={14} />
                         <span>{t('commute.cig.equiv')}</span>
                    </div>
                </div>
            </div>

            {/* Route B - Clean */}
            <div className="border-2 border-green-500 bg-green-50 rounded-xl p-3 relative shadow-md transform scale-[1.02]">
                <div className="absolute -top-3 right-3 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm flex items-center gap-1">
                    <Leaf size={10} fill="currentColor" /> {t('commute.recommended')}
                </div>

                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <div className="bg-green-100 p-1.5 rounded-full text-green-700">
                            <Leaf size={16} />
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-green-800 uppercase tracking-wider">{t('commute.route.cleanest')}</span>
                            <span className="block text-xs text-gray-500">Via Ridge Road</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="block text-lg font-bold text-gray-900">32 {t('commute.min')}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 text-green-700 font-semibold">
                         <span className="w-2 h-2 rounded-full bg-green-500"></span>
                         <span>AQI 280</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-800 font-medium bg-green-200/50 px-2 py-0.5 rounded-md">
                         <span>{t('commute.green.zone')}</span>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};