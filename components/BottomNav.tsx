import React from 'react';
import { Home, Bell, BarChart2, Trophy, Camera, ClipboardList } from 'lucide-react';
import { Page, NavItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { ref, onValue } from 'firebase/database';
import { database } from '../src/services/firebaseConfig';
import { getCitizenId } from '../src/utils/citizenUtils';
import { getUnreadReportCount } from '../pages/MyReports';
import type { ReportData } from '../types';

interface BottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onScanClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onNavigate, onScanClick }) => {
  const { t } = useLanguage();

  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    const citizenId = getCitizenId();
    const dbRef = ref(database, `citizen_reports/${citizenId}`);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { setUnreadCount(0); return; }
      const arr = Object.values(data) as ReportData[];
      setUnreadCount(getUnreadReportCount(arr));
    });
    return () => unsubscribe();
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40 pb-safe">
      <div className="max-w-[640px] mx-auto h-[72px] relative">
        
        {/* Floating Button - Centered ABOVE the navbar */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-[4.5rem] z-20 flex flex-col items-center">
            <button 
                onClick={onScanClick}
                className="w-[68px] h-[68px] rounded-full bg-gradient-to-tr from-green-600 to-yellow-400 shadow-[0_8px_20px_rgba(34,197,94,0.4)] flex items-center justify-center text-white border-[5px] border-white transition-transform hover:scale-105 active:scale-95"
            >
                <Camera size={30} />
            </button>
            <span className="text-[11px] font-extrabold tracking-wide text-green-800 whitespace-nowrap bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full shadow-md mt-1 border border-green-100">
                {t('nav.snap')}
            </span>
        </div>

        {/* Navigation Grid - 5 evenly spaced items */}
        <div className="grid grid-cols-5 h-full items-end pb-2 justify-items-center px-1">
            <NavButton 
                id="home" 
                label={t('nav.home')} 
                icon={Home} 
                isActive={currentPage === 'home'} 
                onClick={() => onNavigate('home')} 
            />
            <NavButton 
                id="alerts" 
                label={t('nav.alerts')} 
                icon={Bell} 
                isActive={currentPage === 'alerts'} 
                onClick={() => onNavigate('alerts')} 
            />
            <NavButton 
                id="myreports" 
                label="Reports" 
                icon={ClipboardList} 
                isActive={currentPage === 'myreports'} 
                onClick={() => onNavigate('myreports')} 
                badge={unreadCount > 0}
            />
            <NavButton 
                id="history" 
                label="History" 
                icon={BarChart2} 
                isActive={currentPage === 'history'} 
                onClick={() => onNavigate('history')} 
            />
            <NavButton 
                id="leaderboard" 
                label="Ranking" 
                icon={Trophy} 
                isActive={currentPage === 'leaderboard'} 
                onClick={() => onNavigate('leaderboard')} 
            />
        </div>
      </div>
    </nav>
  );
};

const NavButton = ({ id, label, icon: Icon, isActive, onClick, badge }: any) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center space-y-1 transition-colors duration-200 relative ${
        isActive ? 'text-gov-navy' : 'text-gray-400 hover:text-gray-600'
        }`}
    >
        <div className={`p-1 rounded-xl transition-all relative ${isActive ? 'bg-blue-50' : 'bg-transparent'}`}>
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            {badge && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            )}
        </div>
        <span className={`text-[10px] whitespace-nowrap font-medium ${isActive ? 'font-semibold' : ''}`}>
            {label}
        </span>
    </button>
);