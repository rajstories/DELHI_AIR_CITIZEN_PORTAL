import React from 'react';
import { Home, Bell, BarChart2, Trophy, Camera } from 'lucide-react';
import { Page, NavItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface BottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onScanClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onNavigate, onScanClick }) => {
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40 pb-safe">
      <div className="max-w-[640px] mx-auto h-16 relative">
        
        {/* Floating Button - Positioned absolutely relative to the container for z-index and overflow handling */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6 z-10 flex flex-col items-center">
            <button 
                onClick={onScanClick}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-green-600 to-yellow-400 shadow-[0_4px_15px_rgba(34,197,94,0.4)] flex items-center justify-center text-white border-4 border-white transition-transform active:scale-95"
            >
                <Camera size={28} />
            </button>
            <span className="text-[10px] font-bold text-green-700 whitespace-nowrap bg-green-50 px-2 py-0.5 rounded-full shadow-sm mt-1">
                {t('nav.snap')}
            </span>
        </div>

        {/* Navigation Grid - 5 Columns for perfect symmetry */}
        <div className="grid grid-cols-5 h-full items-end pb-2">
            <div className="flex justify-center">
                <NavButton 
                    id="home" 
                    label={t('nav.home')} 
                    icon={Home} 
                    isActive={currentPage === 'home'} 
                    onClick={() => onNavigate('home')} 
                />
            </div>
            <div className="flex justify-center">
                <NavButton 
                    id="alerts" 
                    label={t('nav.alerts')} 
                    icon={Bell} 
                    isActive={currentPage === 'alerts'} 
                    onClick={() => onNavigate('alerts')} 
                />
            </div>
            
            {/* Spacer for Center Button */}
            <div></div>

            <div className="flex justify-center">
                <NavButton 
                    id="history" 
                    label={t('nav.history')} 
                    icon={BarChart2} 
                    isActive={currentPage === 'history'} 
                    onClick={() => onNavigate('history')} 
                />
            </div>
            <div className="flex justify-center">
                <NavButton 
                    id="leaderboard" 
                    label="Ranking" 
                    icon={Trophy} 
                    isActive={currentPage === 'leaderboard'} 
                    onClick={() => onNavigate('leaderboard')} 
                />
            </div>
        </div>
      </div>
    </nav>
  );
};

const NavButton = ({ id, label, icon: Icon, isActive, onClick }: any) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center space-y-1 transition-colors duration-200 ${
        isActive ? 'text-gov-navy' : 'text-gray-400 hover:text-gray-600'
        }`}
    >
        <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-blue-50' : 'bg-transparent'}`}>
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
        </div>
        <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
            {label}
        </span>
    </button>
);