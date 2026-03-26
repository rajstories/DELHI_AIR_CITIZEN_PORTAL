import React, { useState } from 'react';
import { AlertFilter, Alert } from '../types';
import { MOCK_ALERTS } from '../constants';
import { Bell, AlertTriangle, CheckCircle, Info, Settings, X, ArrowRight, Trash2, Award, TrendingUp } from 'lucide-react';
import { Card } from '../components/Card';
import { SuperAlertCard } from '../components/SuperAlertCard';
import { GreenLensCamera } from '../components/GreenLensCamera';
import { RewardModal } from '../components/RewardModal';
import { AnimatePresence, motion } from 'framer-motion';

export const Alerts: React.FC = () => {
  console.log("ALERTS COMPONENT RENDERING...");
  const [filter, setFilter] = useState<AlertFilter>('all');
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [showSettings, setShowSettings] = useState(false);
  
  // Camera State for the Super Card
  const [showCamera, setShowCamera] = useState(false);
  const [showReward, setShowReward] = useState(false);

  // Government Action Notifications
  const [govtActions] = useState([
    { id: '1', reportId: 'RPT-001', title: 'Your report on vehicle pollution', action: '✓ Traffic patrol dispatched', time: '1h ago', status: 'completed', points: 15 },
    { id: '2', reportId: 'RPT-002', title: 'Report on construction dust', action: '⏳ Under review by DPCC', time: '3h ago', status: 'in-progress', points: 0 },
    { id: '3', reportId: 'RPT-003', title: 'Smoke emission from factory', action: '✓ Warning issued to facility', time: '1d ago', status: 'completed', points: 25 },
  ]);
  const [selectedAction, setSelectedAction] = useState<typeof govtActions[0] | null>(null);

  // Settings Form State
  const [settings, setSettings] = useState({
      notifyCritical: true,
      notifyPoor: true,
      dailySummary: false,
      notifyImprovement: true,
      pushEnabled: true,
      smsEnabled: true,
      phoneNumber: ''
  });

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.type === filter);
  const unreadCount = alerts.filter(a => !a.read).length;

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const markAllRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };

  // Handlers for Super Card
  const handleReportClick = () => setShowCamera(true);
  const handleScanSubmit = () => { setShowCamera(false); setShowReward(true); };
  const handleRedeem = () => { setShowReward(false); alert("Points Added!"); };

  const onTabClick = (f: AlertFilter) => {
      console.log("TAB CLICKED:", f);
      setFilter(f);
  };

  return (
    <div className="min-h-full pb-24 relative bg-gray-50">
       
       {/* Overlays for Gamification Flow */}
       <AnimatePresence>
            {showCamera && <GreenLensCamera onClose={() => setShowCamera(false)} onSubmit={handleScanSubmit} />}
            {showReward && <RewardModal onClose={() => setShowReward(false)} onRedeem={handleRedeem} onScanAnother={() => setShowReward(false)} />}
       </AnimatePresence>

       {/* HEADER */}
       <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
           <div className="p-4 flex justify-between items-center">
               <div>
                   <h1 className="text-xl font-bold text-gov-navy">Pollution Alerts</h1>
                   <p className="text-xs text-gray-500">{unreadCount} unread notifications</p>
               </div>
               <div className="flex gap-2">
                   {unreadCount > 0 && (
                       <button onClick={markAllRead} className="text-xs text-blue-600 font-medium px-2 py-1">
                           Mark all read
                       </button>
                   )}
                   <button onClick={() => setShowSettings(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
                       <Settings size={20} />
                   </button>
               </div>
           </div>

           {/* TABS */}
           <div className="flex px-4 space-x-4 overflow-x-auto no-scrollbar pb-0">
               <TabButton label="All" active={filter === 'all'} onClick={() => onTabClick('all')} />
               <TabButton label="Critical" active={filter === 'critical'} onClick={() => onTabClick('critical')} />
               <TabButton label="Warnings" active={filter === 'warning'} onClick={() => onTabClick('warning')} />
               <TabButton label="Updates" active={filter === 'info'} onClick={() => onTabClick('info')} />
           </div>
       </div>

       {/* ALERTS LIST */}
       <div className="p-4 space-y-4 min-h-[50vh]">
           {/* Government Action Notifications Section */}
           {(filter === 'all' || filter === 'info') && govtActions.length > 0 && (
               <div className="space-y-2 mb-6">
                   <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider px-2">Government Action Updates</h2>
                   {govtActions.map(action => (
                       <div key={action.id} 
                           onClick={() => { console.log("GOVT ACTION CLICKED:", action.id); setSelectedAction(action); }}
                           className={`rounded-lg p-4 border-2 flex items-start gap-4 transform transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm ${
                           action.status === 'completed' 
                               ? 'bg-green-50 border-green-200' 
                               : 'bg-blue-50 border-blue-200'
                       }`}>
                           <div className={`rounded-full p-2.5 flex-shrink-0 ${
                               action.status === 'completed' 
                                   ? 'bg-green-200 text-green-700' 
                                   : 'bg-blue-200 text-blue-700 animate-pulse'
                           }`}>
                               <CheckCircle size={20} />
                           </div>
                           <div className="flex-1 min-w-0">
                               <p className="text-sm font-bold text-gray-900 leading-tight">{action.title}</p>
                               <p className="text-xs text-gray-600 mt-1 font-medium">{action.action}</p>
                               <div className="flex items-center justify-between mt-2">
                                   <span className="text-[11px] text-gray-500">{action.time}</span>
                                   {action.points > 0 && (
                                       <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-full border border-yellow-200">
                                           <Award size={12} /> +{action.points} pts
                                       </span>
                                   )}
                               </div>
                           </div>
                       </div>
                   ))}
               </div>
           )}

           {/* Render SUPER CARD for Critical Alerts (Demo Data) */}
           {(filter === 'all' || filter === 'critical') && (
               <SuperAlertCard 
                  data={{
                      type: "CRITICAL",
                      title: "Severe Smog Cloud",
                      aqi: 412,
                      location: "Rohini Sec-18",
                      time: "2h ago",
                      govtAction: ["Water Sprinklers Active in Sector 18", "Construction Halted at 3 Sites"],
                      reliefTime: "4 Hours 30 Mins",
                      canReport: true
                  }}
                  onReport={handleReportClick}
               />
           )}

           {filteredAlerts.length === 0 && filter !== 'all' && filter !== 'critical' ? (
               <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                   <div className="bg-gray-100 p-4 rounded-full mb-3">
                       <Bell size={32} />
                   </div>
                   <p>No alerts in this category.</p>
               </div>
           ) : (
               filteredAlerts
                // Don't show the mock critical one if we are showing the super card, to avoid duplication in this demo
                .filter(a => a.id !== '1') 
                .map(alert => (
                   <AlertCard key={alert.id} alert={alert} onDismiss={() => dismissAlert(alert.id)} />
               ))
           )}
       </div>
       
       {/* SETTINGS MODAL */}
       {showSettings && (
           <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white w-full max-w-[640px] sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
                   <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
                       <h2 className="font-bold text-lg text-gov-navy">Alert Preferences</h2>
                       <button onClick={() => setShowSettings(false)} className="p-2 bg-gray-100 rounded-full">
                           <X size={20} />
                       </button>
                   </div>
                   
                   <div className="p-6 space-y-6">
                       <Section title="Notify me when:">
                           <Toggle label="AQI crosses 300 (Very Poor)" checked={settings.notifyCritical} onChange={v => setSettings({...settings, notifyCritical: v})} />
                           <Toggle label="AQI crosses 200 (Poor)" checked={settings.notifyPoor} onChange={v => setSettings({...settings, notifyPoor: v})} />
                           <Toggle label="Daily morning summary" checked={settings.dailySummary} onChange={v => setSettings({...settings, dailySummary: v})} />
                           <Toggle label="Improvement notifications" checked={settings.notifyImprovement} onChange={v => setSettings({...settings, notifyImprovement: v})} />
                       </Section>

                       <Section title="Delivery method:">
                           <Toggle label="Push notifications" checked={settings.pushEnabled} onChange={v => setSettings({...settings, pushEnabled: v})} />
                           <div className="pt-2">
                               <Toggle label="SMS Alerts" checked={settings.smsEnabled} onChange={v => setSettings({...settings, smsEnabled: v})} />
                               {settings.smsEnabled && (
                                   <input 
                                     type="tel" 
                                     placeholder="Enter mobile number" 
                                     className="mt-2 w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                     value={settings.phoneNumber}
                                     onChange={e => setSettings({...settings, phoneNumber: e.target.value})}
                                   />
                               )}
                           </div>
                       </Section>

                       <div className="pt-4">
                           <button 
                             onClick={() => setShowSettings(false)}
                             className="w-full bg-gov-navy text-white font-bold py-3 rounded-xl hover:bg-opacity-90 transition-colors"
                           >
                               Save Preferences
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {/* GOVT ACTION DETAIL MODAL */}
       <AnimatePresence>
           {selectedAction && (
               <div 
                 className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                 onClick={() => setSelectedAction(null)}
               >
                   <motion.div 
                       initial={{ opacity: 0, scale: 0.9, y: 20 }}
                       animate={{ opacity: 1, scale: 1, y: 0 }}
                       exit={{ opacity: 0, scale: 0.9, y: 20 }}
                       className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
                       onClick={(e) => e.stopPropagation()}
                   >
                       <div className={`p-6 ${selectedAction.status === 'completed' ? 'bg-green-600' : 'bg-blue-600'} text-white relative`}>
                           <button 
                               onClick={() => setSelectedAction(null)}
                               className="absolute top-4 right-4 p-1.5 bg-black/20 rounded-full hover:bg-black/30 transition-colors"
                           >
                               <X size={18} />
                           </button>
                           <div className="flex items-center gap-3 mb-2">
                               <div className="bg-white/20 p-2 rounded-full">
                                   <CheckCircle size={24} />
                               </div>
                               <span className="text-sm font-bold uppercase tracking-wider">Government Action Update</span>
                           </div>
                           <h3 className="text-xl font-bold leading-tight">{selectedAction.title}</h3>
                       </div>
                       
                       <div className="p-6 space-y-4">
                           <div className="flex items-center justify-between text-sm">
                               <span className="text-gray-500">Report ID</span>
                               <span className="font-mono font-bold text-gray-900">{selectedAction.reportId}</span>
                           </div>
                           <div className="flex items-center justify-between text-sm">
                               <span className="text-gray-500">Time</span>
                               <span className="text-gray-900">{selectedAction.time}</span>
                           </div>
                           <div className="flex items-center justify-between text-sm">
                               <span className="text-gray-500">Status</span>
                               <span className={`font-bold ${selectedAction.status === 'completed' ? 'text-green-600' : 'text-blue-600'}`}>
                                   {selectedAction.status === 'completed' ? 'Action Completed' : 'Under Investigation'}
                               </span>
                           </div>

                           <div className="pt-4 border-t border-gray-100">
                               <p className="text-sm font-bold text-gray-900 mb-2">Detailed Response:</p>
                               <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                                   {selectedAction.status === 'completed' 
                                       ? `The relevant authorities have addressed this issue. ${selectedAction.action}. Thank you for being a vigilant citizen.` 
                                       : `Your report is being reviewed. ${selectedAction.action}. We will notify you once action is taken.`}
                                </p>
                           </div>

                           {selectedAction.points > 0 && (
                               <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-xl flex items-center gap-3">
                                   <div className="bg-yellow-400 p-1.5 rounded-lg text-white">
                                       <Award size={18} />
                                   </div>
                                   <div>
                                       <p className="text-[11px] font-bold text-yellow-800 uppercase tracking-wide">Reward Earned</p>
                                       <p className="text-sm font-bold text-yellow-900">+{selectedAction.points} Green Credits</p>
                                   </div>
                               </div>
                           )}

                           <button 
                               onClick={() => setSelectedAction(null)}
                               className="w-full mt-4 bg-gray-900 text-white font-bold py-4 rounded-xl active:scale-[0.98] transition-transform shadow-lg"
                           >
                               Close
                           </button>
                       </div>
                   </motion.div>
               </div>
           )}
       </AnimatePresence>
    </div>
  );
};

interface TabButtonProps {
    label: string;
    active: boolean;
    onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, active, onClick }) => (
    <button 
      onClick={(e) => { e.preventDefault(); console.log('BUTTON CLICKED:', label); onClick(); }}
      type="button"
      className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap active:scale-95 ${active ? 'border-gov-navy text-gov-navy' : 'border-transparent text-gray-500'}`}
    >
        {label}
    </button>
);

interface SectionProps {
    title: string;
    children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
    <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <div className="space-y-3">{children}</div>
    </div>
);

interface ToggleProps {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform">
        <span className="text-gray-700 font-medium">{label}</span>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
            <div className={`block w-12 h-7 rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${checked ? 'transform translate-x-5' : ''}`}></div>
        </div>
    </label>
);

interface AlertCardProps {
    alert: Alert;
    onDismiss: () => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onDismiss }) => {
    const [expanded, setExpanded] = useState(false);

    const getIcon = () => {
        switch(alert.type) {
            case 'critical': return <AlertTriangle className="text-red-600" size={24} />;
            case 'warning': return <Info className="text-orange-500" size={24} />;
            case 'info': return <CheckCircle className="text-green-600" size={24} />;
        }
    };

    const getBorderColor = () => {
        switch(alert.type) {
            case 'critical': return 'border-l-red-600';
            case 'warning': return 'border-l-orange-500';
            case 'info': return 'border-l-green-600';
        }
    };

    return (
        <div className="relative group touch-pan-x">
             <div className="absolute inset-y-0 right-0 bg-red-100 rounded-xl w-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                 <Trash2 className="text-red-500" />
             </div>

            <Card className={`relative z-10 !border-l-4 ${getBorderColor()} transition-transform active:scale-[0.99]`}>
                <div onClick={() => { console.log('ALERT CARD CLICKED:', alert.id); setExpanded(!expanded); }} className="cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                alert.type === 'critical' ? 'bg-red-100 text-red-700' : 
                                alert.type === 'warning' ? 'bg-orange-100 text-orange-700' : 
                                'bg-green-100 text-green-700'
                            }`}>
                                {alert.type}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold">{alert.timestamp}</span>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDismiss(); }} 
                            className="text-gray-300 hover:text-gray-500 p-1 active:scale-90 transition-transform"
                            aria-label="Dismiss"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex gap-4">
                        <div className="mt-1 shrink-0">{getIcon()}</div>
                        <div>
                            <h3 className="font-black text-gray-900 leading-tight mb-1 text-base">{alert.title}</h3>
                            <p className="text-xs text-gray-500 font-bold mb-2">{alert.location}</p>
                            <p className="text-sm text-gray-800 leading-relaxed font-medium">{alert.message}</p>
                            
                            <div className={`grid transition-all duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <p className="text-sm text-gray-700 mb-2">{alert.detail}</p>
                                        {alert.actionText && (
                                            <button className="text-sm text-blue-600 font-bold flex items-center gap-1 hover:underline">
                                                {alert.actionText} <ArrowRight size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {!expanded && (
                                <p className="text-[11px] text-blue-500 mt-2 font-bold flex items-center gap-1">
                                    Tap to view details <ArrowRight size={10} />
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};
