import React from 'react';
import { MapPin, ChevronDown, Navigation, Bot, Sparkles } from 'lucide-react';
import { LocationData } from '../types';
import { detectLocation } from '../services/aqiService';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  locations: LocationData[];
  currentLocation: LocationData;
  onLocationChange: (location: LocationData) => void;
  onOpenChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({ locations, currentLocation, onLocationChange, onOpenChat }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isDetecting, setIsDetecting] = React.useState(false);
  const { t } = useLanguage();

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleSelect = (location: LocationData) => {
    onLocationChange(location);
    setIsOpen(false);
  };

  const handleDetectLocation = async () => {
    setIsDetecting(true);
    try {
      const detected = await detectLocation();
      onLocationChange(detected);
      setIsOpen(false);
    } catch (error) {
      // In a real app, show a proper toast
      alert("Could not detect location. Please select manually.");
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-gov-navy text-white shadow-md">
      <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center justify-between">
        {/* Location Section */}
        <div className="flex flex-col flex-1 mr-4">
          <div className="text-[10px] uppercase tracking-wider opacity-80 font-medium mb-0.5">{t('header.location')}</div>
          
          <div className="relative">
            <button 
              onClick={toggleDropdown}
              className="flex items-center space-x-2 font-bold text-lg leading-tight focus:outline-none w-full"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
            >
              <div className="flex items-center space-x-1 truncate max-w-[85%]">
                <MapPin size={18} className="text-status-info shrink-0" />
                <span className="truncate">{currentLocation.name}</span>
              </div>
              <ChevronDown size={16} className={`transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10 bg-black/20" 
                  onClick={() => setIsOpen(false)} 
                  aria-hidden="true"
                />
                <div 
                  className="absolute top-full left-0 mt-2 w-full max-w-xs bg-white rounded-xl shadow-xl overflow-hidden text-gray-800 z-20 border border-gray-100 animate-in fade-in zoom-in-95 duration-100"
                  role="listbox"
                >
                  <button 
                    onClick={handleDetectLocation}
                    disabled={isDetecting}
                    className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-blue-50 text-blue-600 font-medium flex items-center space-x-2"
                  >
                     <Navigation size={16} className={isDetecting ? "animate-spin" : ""} />
                     <span>{isDetecting ? t('header.detecting') : t('header.detect')}</span>
                  </button>

                  <div className="max-h-[300px] overflow-y-auto">
                    {locations.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => handleSelect(loc)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors flex justify-between items-center ${
                          currentLocation.id === loc.id ? 'bg-blue-50 text-gov-navy font-semibold' : ''
                        }`}
                        role="option"
                        aria-selected={currentLocation.id === loc.id}
                      >
                        <span>{loc.name}</span>
                        <span className="text-xs text-gray-400">{loc.area}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Vayu Mitra AI Button */}
        <button 
          onClick={onOpenChat}
          className="relative w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all border border-white/10 shrink-0 group active:scale-95"
          aria-label="Open Vayu Mitra AI Chat"
        >
           <Bot size={22} className="text-white drop-shadow-sm group-hover:scale-110 transition-transform" />
           {/* Online Status Dot with Pulse */}
           <div className="absolute top-1 right-1">
              <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500 border border-gov-navy"></span>
           </div>
        </button>
      </div>
    </header>
  );
};
