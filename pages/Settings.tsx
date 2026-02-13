import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { getSettings, saveSettings, sanitizePhone, maskPhone, clearUserData } from '../services/settingsService';
import { ChevronLeft, ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, Trash2, Save, MapPin, Bell, Lock, Smartphone, Info, Zap, Sparkles } from 'lucide-react';
import { LOCATIONS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface SettingsProps {
    onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
    const [settings, setSettings] = useState<UserSettings>(getSettings());
    const [isDirty, setIsDirty] = useState(false);
    const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
    const [editingPhone, setEditingPhone] = useState(false);
    const { t, setLanguage } = useLanguage();
    
    // Section collapse state
    const [openSection, setOpenSection] = useState<string>('notifications');

    // Load settings on mount
    useEffect(() => {
        setSettings(getSettings());
    }, []);

    const showToast = (msg: string, type: 'success'|'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSave = () => {
        if (settings.smsEnabled && settings.phoneNumber.length !== 10) {
            showToast("Invalid phone number format", 'error');
            return;
        }

        const success = saveSettings(settings);
        if (success) {
            setIsDirty(false);
            setEditingPhone(false);
            showToast(t('settings.saved'), 'success');
        } else {
            showToast("Rate limit exceeded. Try again later.", 'error');
        }
    };

    const handleChange = (key: keyof UserSettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setIsDirty(true);
        // If language changed, update context immediately
        if (key === 'language') {
             setLanguage(value);
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitized = sanitizePhone(e.target.value);
        handleChange('phoneNumber', sanitized);
    };

    const toggleSection = (id: string) => {
        setOpenSection(openSection === id ? '' : id);
    };

    const handleDeleteData = () => {
        if (window.confirm("Are you sure? This will clear your preferences for this session.")) {
            clearUserData();
            setSettings(getSettings()); // Reset to defaults
            setLanguage('en'); // Reset language
            showToast("Data cleared successfully", 'success');
        }
    };

    const containerClass = settings.highContrast ? "bg-white text-black font-bold" : "bg-gray-50 text-gray-900";

    return (
        <div className={`min-h-full pb-24 relative animate-in slide-in-from-right duration-300 ${containerClass}`}>
            
            {/* HEADER */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center justify-between">
                    <button onClick={onBack} className="flex items-center text-gov-navy font-semibold hover:bg-gray-50 p-1 rounded-lg transition-colors">
                        <ChevronLeft size={24} />
                        <span>{t('settings.back')}</span>
                    </button>
                    <h1 className="text-lg font-bold text-gov-navy">{t('settings.title')}</h1>
                    {isDirty ? (
                        <button onClick={handleSave} className="text-sm font-bold text-white bg-green-600 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1 animate-in zoom-in">
                            <Save size={14} /> {t('settings.save')}
                        </button>
                    ) : <div className="w-12"></div>}
                </div>
            </div>

            <div className="max-w-[640px] mx-auto p-4 space-y-4">

                {/* SECTION 1: LOCATION */}
                <Section 
                    id="location" 
                    title={t('settings.section.location')} 
                    icon={MapPin} 
                    isOpen={openSection === 'location'} 
                    onToggle={toggleSection}
                    highContrast={settings.highContrast}
                >
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
                             <label className="text-xs font-bold text-blue-800 uppercase block mb-1">Primary Ward</label>
                             <select 
                                value={settings.primaryWard}
                                onChange={(e) => handleChange('primaryWard', e.target.value)}
                                className="w-full bg-white border border-blue-200 rounded p-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                             >
                                 {LOCATIONS.map(loc => (
                                     <option key={loc.id} value={loc.id}>{loc.name} - {loc.area}</option>
                                 ))}
                             </select>
                        </div>
                        <Toggle 
                            label="Auto-detect location" 
                            checked={settings.autoDetect} 
                            onChange={(v) => handleChange('autoDetect', v)} 
                        />
                        <Toggle 
                            label="Show nearby wards (5km radius)" 
                            checked={settings.showNearby} 
                            onChange={(v) => handleChange('showNearby', v)} 
                        />
                    </div>
                </Section>

                {/* SECTION 2: NOTIFICATIONS */}
                <Section 
                    id="notifications" 
                    title={t('settings.section.notifications')} 
                    icon={Bell} 
                    isOpen={openSection === 'notifications'} 
                    onToggle={toggleSection}
                    highContrast={settings.highContrast}
                >
                    <div className="space-y-6">
                        {/* SMART ALERTS - NEW FEATURE */}
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-3">
                             <div className="flex items-start gap-3">
                                 <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                     <Sparkles size={18} />
                                 </div>
                                 <div className="flex-1">
                                     <h4 className="font-bold text-gray-900 text-sm">Smart Alerts</h4>
                                     <p className="text-xs text-gray-600 mb-2">Alert me 30 mins before pollution spikes.</p>
                                     <Toggle 
                                         label="Enable Predictive Alerts" 
                                         checked={settings.smartAlerts} 
                                         onChange={(v) => handleChange('smartAlerts', v)} 
                                     />
                                 </div>
                             </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Thresholds</h4>
                            <div className="space-y-3">
                                <Toggle label="Notify when AQI > 300 (Very Poor)" checked={settings.notifyCritical} onChange={(v) => handleChange('notifyCritical', v)} />
                                <Toggle label="Notify when AQI > 200 (Poor)" checked={settings.notifyPoor} onChange={(v) => handleChange('notifyPoor', v)} />
                                <Toggle label="Notify when AQI > 100 (Moderate)" checked={settings.notifyModerate} onChange={(v) => handleChange('notifyModerate', v)} />
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Timing</h4>
                            <div className="space-y-3">
                                <Toggle label="Daily morning summary (8 AM)" checked={settings.dailySummary} onChange={(v) => handleChange('dailySummary', v)} />
                                <Toggle label="Evening forecast (6 PM)" checked={settings.eveningForecast} onChange={(v) => handleChange('eveningForecast', v)} />
                            </div>
                        </div>

                        <div>
                             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Channels</h4>
                             <div className="space-y-3">
                                <Toggle label="Push notifications" checked={settings.pushEnabled} onChange={(v) => handleChange('pushEnabled', v)} />
                                
                                <div className={`p-3 rounded-lg border transition-colors ${settings.smsEnabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-transparent'}`}>
                                    <Toggle label="SMS Alerts" checked={settings.smsEnabled} onChange={(v) => handleChange('smsEnabled', v)} />
                                    
                                    {settings.smsEnabled && (
                                        <div className="mt-3 animate-in slide-in-from-top-2">
                                            <label className="text-xs text-gray-500 block mb-1">Mobile Number (+91)</label>
                                            <div className="flex gap-2">
                                                {editingPhone ? (
                                                    <input 
                                                        type="tel" 
                                                        value={settings.phoneNumber}
                                                        onChange={handlePhoneChange}
                                                        placeholder="Enter 10 digits"
                                                        className="flex-1 border border-gray-300 rounded p-2 text-sm"
                                                        maxLength={10}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <div className="flex-1 bg-gray-100 p-2 rounded text-sm font-mono text-gray-600">
                                                        {maskPhone(settings.phoneNumber) || "No number set"}
                                                    </div>
                                                )}
                                                <button 
                                                    onClick={() => setEditingPhone(!editingPhone)}
                                                    className="text-xs font-bold text-blue-600 px-2 hover:bg-blue-50 rounded"
                                                >
                                                    {editingPhone ? 'Done' : 'Edit'}
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                                <Lock size={10} /> Number stored in secure session only.
                                            </p>
                                        </div>
                                    )}
                                </div>
                             </div>
                        </div>
                    </div>
                </Section>

                {/* SECTION 3: PRIVACY */}
                <Section 
                    id="privacy" 
                    title={t('settings.section.privacy')} 
                    icon={ShieldCheck} 
                    isOpen={openSection === 'privacy'} 
                    onToggle={toggleSection}
                    highContrast={settings.highContrast}
                >
                    <div className="space-y-4">
                        <Toggle label="Allow anonymous usage analytics" checked={settings.allowAnalytics} onChange={(v) => handleChange('allowAnalytics', v)} />
                        
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <h4 className="text-sm font-bold text-gov-navy mb-2 flex items-center gap-2">
                                <Lock size={14} /> Data Policy
                            </h4>
                            <ul className="text-xs text-gray-600 space-y-1 mb-4 list-disc list-inside">
                                <li>Location preferences are stored in <strong>Session Storage</strong>.</li>
                                <li>We never store your personal identification.</li>
                                <li>No location tracking history is kept on server.</li>
                            </ul>
                            <button 
                                onClick={handleDeleteData}
                                className="w-full border border-red-200 text-red-600 bg-white hover:bg-red-50 text-xs font-bold py-2 rounded flex items-center justify-center gap-2"
                            >
                                <Trash2 size={14} /> Delete My Session Data
                            </button>
                        </div>
                    </div>
                </Section>

                {/* SECTION 4: DISPLAY */}
                <Section 
                    id="display" 
                    title={t('settings.section.display')} 
                    icon={Smartphone} 
                    isOpen={openSection === 'display'} 
                    onToggle={toggleSection}
                    highContrast={settings.highContrast}
                >
                    <div className="space-y-4">
                        <div>
                             <label className="text-sm font-medium text-gray-700 block mb-2">{t('settings.lang')}</label>
                             <div className="flex gap-2">
                                 {['English', 'हिंदी', 'ਪੰਜਾਬੀ'].map((lang, i) => {
                                     const code = ['en', 'hi', 'pa'][i];
                                     return (
                                        <button 
                                            key={lang}
                                            onClick={() => handleChange('language', code)}
                                            className={`flex-1 py-2 text-sm rounded border ${
                                                settings.language === code 
                                                ? 'bg-gov-navy text-white border-gov-navy' 
                                                : 'bg-white text-gray-600 border-gray-200'
                                            }`}
                                        >
                                            {lang}
                                        </button>
                                     );
                                 })}
                             </div>
                        </div>
                        <div className="pt-2 border-t border-gray-100">
                            <Toggle label="High Contrast Mode" checked={settings.highContrast} onChange={(v) => handleChange('highContrast', v)} />
                            <Toggle label="Show Animations" checked={settings.animations} onChange={(v) => handleChange('animations', v)} />
                        </div>
                    </div>
                </Section>

                {/* SECTION 6: ADVANCED */}
                <Section 
                    id="advanced" 
                    title={t('settings.section.advanced')} 
                    icon={Zap} 
                    isOpen={openSection === 'advanced'} 
                    onToggle={toggleSection}
                    highContrast={settings.highContrast}
                >
                     <div className="space-y-4">
                        <div>
                             <label className="text-sm font-medium text-gray-700 block mb-2">Data Refresh Rate</label>
                             <div className="flex gap-2">
                                 {[
                                     {val: '15', label: '15 min'},
                                     {val: '30', label: '30 min'},
                                     {val: '60', label: '1 Hr'}
                                 ].map((opt) => (
                                     <button 
                                        key={opt.val}
                                        onClick={() => handleChange('refreshRate', opt.val)}
                                        className={`flex-1 py-2 text-xs font-bold rounded border ${
                                            settings.refreshRate === opt.val
                                            ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                            : 'bg-white text-gray-500 border-gray-200'
                                        }`}
                                     >
                                         {opt.label}
                                     </button>
                                 ))}
                             </div>
                        </div>
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded border border-gray-200">
                            <div>
                                <span className="text-xs font-bold text-gray-500 block">Cache Storage</span>
                                <span className="text-sm font-mono">2.4 MB</span>
                            </div>
                            <button className="text-xs text-blue-600 hover:underline" onClick={() => localStorage.clear()}>Clear Cache</button>
                        </div>
                     </div>
                </Section>

                {/* SECTION 5: ABOUT */}
                <div className="pt-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
                        <Info size={16} />
                        <span className="text-xs font-bold tracking-widest uppercase">{t('settings.section.about')}</span>
                    </div>
                    <p className="text-xs text-gray-500">Delhi Air Quality Monitoring v1.0.0</p>
                    <p className="text-[10px] text-gray-400 mt-1">Powered by CPCB & IMD</p>
                </div>

            </div>

            {/* TOAST */}
            {toast && (
                <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full shadow-lg text-sm font-bold animate-in fade-in slide-in-from-bottom-4 z-50 ${
                    toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
                }`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
};

// HELPERS

const Section: React.FC<{
    id: string;
    title: string;
    icon: any;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: (id: string) => void;
    highContrast: boolean;
}> = ({ id, title, icon: Icon, children, isOpen, onToggle, highContrast }) => (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden border transition-all ${highContrast ? 'border-2 border-black' : 'border-gray-100'}`}>
        <button 
            onClick={() => onToggle(id)}
            className={`w-full flex items-center justify-between p-4 ${isOpen ? 'bg-gray-50' : 'bg-white'}`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${highContrast ? 'bg-black text-white' : 'bg-blue-50 text-gov-navy'}`}>
                    <Icon size={20} />
                </div>
                <span className={`font-bold ${highContrast ? 'text-lg' : 'text-base'}`}>{title}</span>
            </div>
            {isOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </button>
        {isOpen && (
            <div className="p-4 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                {children}
            </div>
        )}
    </div>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between cursor-pointer group">
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{label}</span>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
            <div className={`block w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${checked ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out shadow-sm ${checked ? 'transform translate-x-5' : ''}`}></div>
        </div>
    </label>
);