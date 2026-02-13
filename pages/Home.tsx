import React, { useEffect, useState, useRef } from 'react';
import { AQIData, LocationData, Pollutant } from '../types';
import { fetchAQIData } from '../services/aqiService';
import { AQI_COLORS } from '../constants';
import { Card } from '../components/Card';
import { Shield, ArrowUpRight, ArrowDownRight, RefreshCcw, Info, AlertTriangle, Wind } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { ActivityPlanner } from '../components/ActivityPlanner';
import { SafeCommute } from '../components/SafeCommute';
import { WhatsAppChannelCard } from '../components/WhatsAppChannelCard';

interface HomeProps {
  currentLocation: LocationData;
  onViewActions: (data: AQIData) => void;
  userPoints?: number;
}

export const Home: React.FC<HomeProps> = ({ currentLocation, onViewActions, userPoints = 1250 }) => {
  const [data, setData] = useState<AQIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useLanguage();
  
  // Pull to refresh state
  const pullStartY = useRef(0);
  const [pullDist, setPullDist] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(false);
    try {
      const aqiData = await fetchAQIData(currentLocation, isRefresh);
      setData(aqiData);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentLocation]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY.current > 0) {
      const touchY = e.touches[0].clientY;
      const dist = touchY - pullStartY.current;
      if (dist > 0 && dist < 150) {
        setPullDist(dist);
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDist > 80) {
      setRefreshing(true);
      loadData(true);
    }
    setPullDist(0);
    pullStartY.current = 0;
  };

  if (loading && !data && !error) {
    return <SkeletonLoader />;
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-4 text-center">
        <div className="text-red-500 mb-4">
          <Info size={48} />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Unable to fetch data</h3>
        <p className="text-gray-500 mb-6">Check your internet connection and try again.</p>
        <button 
          onClick={() => loadData(true)}
          className="px-6 py-3 bg-gov-navy text-white rounded-lg font-semibold"
        >
          Tap to Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const colorScheme = AQI_COLORS[data.category];

  // Helper for Health Banner
  const getBannerContent = () => {
      if (data.aqi > 400) return { bg: 'bg-gov-navy', text: 'text-white', msg: '⚠️ EMERGENCY: EVERYONE STAY INDOORS' };
      if (data.aqi > 300) return { bg: 'bg-purple-800', text: 'text-white', msg: '⚠️ HEALTH RISK: ASTHMA PATIENTS STAY INDOORS' };
      if (data.aqi > 200) return { bg: 'bg-red-600', text: 'text-white', msg: '⚠️ WARNING: WEAR MASK OUTDOORS' };
      if (data.aqi > 100) return { bg: 'bg-orange-500', text: 'text-white', msg: '⚠️ ALERT: SENSITIVE GROUPS REDUCE OUTDOOR TIME' };
      return { bg: 'bg-green-600', text: 'text-white', msg: '✅ AIR IS CLEAN: ENJOY YOUR DAY' };
  };
  const banner = getBannerContent();

  return (
    <div 
      className="relative min-h-full pb-24"
      ref={scrollContainerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(pullDist > 0 || refreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex justify-center items-center h-16 pointer-events-none transition-transform"
          style={{ transform: `translateY(${refreshing ? 0 : pullDist / 2 - 40}px)` }}
        >
          <div className="bg-white rounded-full p-2 shadow-md z-10">
            <RefreshCcw size={20} className={`text-gov-navy ${refreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${pullDist * 2}deg)` }} />
          </div>
        </div>
      )}

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 mt-2 mx-1">
          <div 
            className="absolute top-0 left-0 w-full h-2 transition-colors duration-500" 
            style={{ backgroundColor: colorScheme.bg }}
          />
          
          <div className="p-6 text-center">
             <h2 className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-6">{t('home.aqi')}</h2>
             
             <div className="relative inline-flex items-center justify-center mb-6">
               <div 
                 className="w-48 h-48 rounded-full flex flex-col items-center justify-center border-[10px] transition-colors duration-500 bg-white"
                 style={{ 
                   borderColor: colorScheme.bg,
                   boxShadow: `0 0 20px ${colorScheme.bg}20` 
                  }}
               >
                  <span className="text-6xl font-bold text-gray-900 tracking-tighter">
                    {data.aqi}
                  </span>
                  <span className="text-sm font-bold text-gray-400 mt-1 uppercase">AQI</span>
               </div>
             </div>

             <div className="mb-4">
               <span 
                 className="inline-block px-6 py-2 rounded-full text-base font-bold shadow-sm transition-colors duration-500"
                 style={{ backgroundColor: colorScheme.bg, color: colorScheme.text }}
               >
                 {data.category}
               </span>
             </div>
             
             <p className="text-xs text-gray-400 font-medium">{t('home.updated')}: {data.lastUpdated}</p>
          </div>
        </div>

        {/* WhatsApp Channel Integration */}
        <WhatsAppChannelCard />

        {/* BOLD ACTIONABLE ALERT BANNER */}
        <div className={`mx-1 p-4 rounded-xl shadow-md flex items-center gap-3 animate-pulse ${banner.bg}`}>
            <AlertTriangle className={`${banner.text} shrink-0`} size={28} />
            <span className={`${banner.text} font-black text-sm uppercase tracking-wide leading-tight`}>
                {banner.msg}
            </span>
        </div>

        {/* POLLUTANT GAUGES (Color Bars) */}
        <Card className="mx-1">
             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Pollutant Levels</h3>
             <div className="space-y-4">
                 <PollutantBar label="PM2.5" value={data.pm25.value} max={300} unit={data.pm25.unit} />
                 <PollutantBar label="PM10" value={data.pm10.value} max={500} unit={data.pm10.unit} />
             </div>
             <p className="text-[10px] text-gray-400 mt-3 text-right">WHO Standard: PM2.5 &lt; 15, PM10 &lt; 45</p>
        </Card>
        
        {/* Activity Planner */}
        <ActivityPlanner aqi={data.aqi} />

        {/* Safe Commute Widget */}
        <SafeCommute />

        <div className="grid grid-cols-1 gap-4 mx-1">
          <Card className="flex items-center justify-between !py-3">
             <div className="flex flex-col">
               <span className="text-xs text-gray-500 uppercase font-semibold">{t('home.rank')}</span>
               <span className="font-bold text-gray-900 text-lg">
                 {data.rank.current} <span className="text-gray-400 text-sm font-normal">/ {data.rank.total}</span>
               </span>
             </div>
             <div className="text-right">
               <span className="text-xs text-gray-500 uppercase font-semibold block mb-0.5">{t('home.trend')}</span>
               <div className={`flex items-center justify-end font-bold ${data.trend.direction === 'worsening' ? 'text-red-600' : 'text-green-600'}`}>
                 {data.trend.direction === 'worsening' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                 <span className="ml-1">{data.trend.value}</span>
               </div>
             </div>
          </Card>
        </div>

        <div className="pt-2 mx-1">
          <button 
            onClick={() => onViewActions(data)}
            className="w-full bg-gov-navy text-white text-lg font-bold h-14 rounded-xl shadow-lg hover:bg-[#152e4d] active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
          >
            <Shield size={20} />
            <span>{t('home.cta')}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

// Component for Pollutant Bar
const PollutantBar = ({ label, value, max, unit }: { label: string, value: number, max: number, unit: string }) => {
    const percentage = Math.min(100, (value / max) * 100);
    
    // Determine color based on value thresholds
    let colorClass = 'bg-green-500';
    if (percentage > 20) colorClass = 'bg-yellow-400';
    if (percentage > 40) colorClass = 'bg-orange-500';
    if (percentage > 70) colorClass = 'bg-red-600';
    if (percentage > 90) colorClass = 'bg-purple-800';

    return (
        <div>
            <div className="flex justify-between items-end mb-1">
                <span className="text-sm font-bold text-gray-700">{label}</span>
                <span className={`text-xs font-bold ${percentage > 50 ? 'text-red-600' : 'text-gray-600'}`}>
                    {value} <span className="text-[10px] font-normal text-gray-400">{unit}</span>
                </span>
            </div>
            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ${colorClass}`} 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}

const SkeletonLoader = () => (
  <div className="space-y-6 animate-pulse pt-2">
    <div className="h-80 bg-gray-200 rounded-[16px] w-full"></div>
    <div className="grid grid-cols-2 gap-3">
      {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>)}
    </div>
    <div className="h-32 bg-gray-200 rounded-xl"></div>
    <div className="h-20 bg-gray-200 rounded-xl"></div>
  </div>
);
