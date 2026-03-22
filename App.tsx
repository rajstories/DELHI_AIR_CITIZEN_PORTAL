import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Home } from './pages/Home';
import { Alerts } from './pages/Alerts';
import { ActionRecommendations } from './pages/ActionRecommendations';
import { History } from './pages/History';
import { WardRakshak } from './pages/WardRakshak'; 
import { Page, LocationData, AQIData } from './types';
import { LOCATIONS } from './constants';
import { fetchLocations, detectLocation } from './services/aqiService';
import { LanguageProvider } from './contexts/LanguageContext';
import { GreenLensCamera } from './components/GreenLensCamera';
import { RewardModal } from './components/RewardModal';
import { VayuMitraModal } from './components/VayuMitraModal';
import MyReports from './pages/MyReports';
import { AnimatePresence } from 'framer-motion';

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentLocation, setCurrentLocation] = useState<LocationData>(LOCATIONS[0]);
  const [locations, setLocations] = useState<LocationData[]>(LOCATIONS);
  
  // State to hold AQI data for Actions page context
  const [activeAQIData, setActiveAQIData] = useState<AQIData | null>(null);

  // GreenLens & User State
  const [showCamera, setShowCamera] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [userPoints, setUserPoints] = useState(1250); // Initial points
  const [lastTrustScore, setLastTrustScore] = useState<number | null>(null);

  // Vayu Mitra Chat State
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    // Initial fetch of locations
    fetchLocations().then(setLocations);

    // Auto-detect location on startup
    const initLocation = async () => {
      try {
        const detected = await detectLocation();
        setCurrentLocation(detected);
      } catch (e) {
        console.log("Location auto-detect skipped or denied, using default.");
      }
    };
    initLocation();
  }, []);

  const handleViewActions = (data: AQIData) => {
    setActiveAQIData(data);
    setCurrentPage('actions');
  };

  const handleScanSubmit = (trustScore?: number) => {
    setShowCamera(false);
    // Award points scaled to trust score (demo: 50 base + bonus for high trust)
    const bonus = trustScore !== undefined ? Math.floor(trustScore / 2) : 25;
    setUserPoints(prev => prev + bonus);
    setLastTrustScore(trustScore ?? null);
    setShowReward(true);
    // After a moment, navigate to My Reports so citizen can track their submission
    setTimeout(() => setCurrentPage('history'), 3500);
  };

  const handleRedeem = () => {
    alert("Redemption Request Sent! A Metro Pass QR code has been sent to your registered number.");
    setShowReward(false);
  };

  const handleScanAnother = () => {
    setShowReward(false);
    setTimeout(() => setShowCamera(true), 300); // Small delay for smooth transition
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'home':
        return <Home currentLocation={currentLocation} onViewActions={handleViewActions} userPoints={userPoints} />;
      case 'alerts':
        return <Alerts />;
      case 'actions':
        return <ActionRecommendations data={activeAQIData} onBack={() => setCurrentPage('home')} />;
      case 'history':
        return <History />;
      case 'myreports':
        return <MyReports onScanClick={() => setShowCamera(true)} />;
      case 'leaderboard':
        // Pass dynamic points here
        return <WardRakshak userPoints={userPoints} />;
      default:
        return <Home currentLocation={currentLocation} onViewActions={handleViewActions} userPoints={userPoints} />;
    }
  };

  const isFullScreen = currentPage === 'actions';

  return (
    <div className="min-h-screen bg-gov-bg flex justify-center">
      <div className="w-full max-w-[640px] bg-gov-bg min-h-screen relative flex flex-col shadow-2xl overflow-hidden">
        
        {/* Overlays */}
        <AnimatePresence>
            {showCamera && (
                <GreenLensCamera 
                    onClose={() => setShowCamera(false)} 
                    onSubmit={handleScanSubmit} 
                />
            )}
            {showReward && (
                <RewardModal 
                    onClose={() => setShowReward(false)} 
                    onRedeem={handleRedeem}
                    onScanAnother={handleScanAnother}
                />
            )}
            {showChat && (
                <VayuMitraModal onClose={() => setShowChat(false)} />
            )}
        </AnimatePresence>

        {!isFullScreen && (
           <Header 
            locations={locations} 
            currentLocation={currentLocation} 
            onLocationChange={setCurrentLocation}
            onOpenChat={() => setShowChat(true)}
          />
        )}

        <main className="flex-1 overflow-y-auto scroll-smooth bg-gray-50">
          {renderContent()}
        </main>

        {!isFullScreen && (
          <BottomNav 
            currentPage={currentPage} 
            onNavigate={setCurrentPage} 
            onScanClick={() => setShowCamera(true)}
          />
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;