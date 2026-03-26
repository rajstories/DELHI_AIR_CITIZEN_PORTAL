import React from 'react';
import { Home, Bell, BarChart2, Camera, ClipboardList } from 'lucide-react';
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
      <div className="max-w-[640px] mx-auto h-[72px] relative flex items-center">
        
        {/* Navigation Grid - 5 items with camera perfectly centered */}
        <div className="grid grid-cols-5 h-full w-full items-center justify-items-center px-1">
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
            <button
                onClick={onScanClick}
                className="flex flex-col items-center justify-center space-y-0.5 transition-all duration-200 relative h-16 w-12 hover:scale-110"
            >
                <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-full blur-sm opacity-80" style={{width: '52px', height: '52px'}}></div>
                    <div className="relative w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white">
                        <Camera size={28} strokeWidth={1.5} />
                    </div>
                </div>
                <span className="text-[9px] whitespace-nowrap font-extrabold text-green-700 tracking-tight">
                    {t('nav.snap')}
                </span>
            </button>
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
        </div>
      </div>
    </nav>
  );
};

const NavButton = ({ id, label, icon: Icon, isActive, onClick, badge }: any) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center space-y-0.5 transition-colors duration-200 relative h-16 w-12 ${
        isActive ? 'text-gov-navy' : 'text-gray-400 hover:text-gray-600'
        }`}
    >
        <div className={`p-1.5 rounded-lg transition-all relative ${isActive ? 'bg-blue-50' : 'bg-transparent'}`}>
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