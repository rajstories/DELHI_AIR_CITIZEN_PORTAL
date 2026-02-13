import React from 'react';
import { ChevronLeft, Share2, Info, CheckCircle2, ShieldAlert, Car, Home as HomeIcon } from 'lucide-react';
import { AQIData } from '../types';
import { AQI_COLORS } from '../constants';
import { Card } from '../components/Card';
import { useLanguage } from '../contexts/LanguageContext';

interface ActionRecommendationsProps {
  data: AQIData | null;
  onBack: () => void;
}

export const ActionRecommendations: React.FC<ActionRecommendationsProps> = ({ data, onBack }) => {
  const aqi = data?.aqi || 0;
  const category = data?.category || 'Good';
  const colorScheme = AQI_COLORS[category];
  const { t } = useLanguage();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Delhi Air Quality Alert',
          text: `Delhi air quality is ${category} (AQI ${aqi}) today. Check out these safety recommendations.`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      alert("Sharing not supported on this device/browser");
    }
  };

  return (
    <div className="min-h-full bg-gray-50 animate-in slide-in-from-right duration-300">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center text-gov-navy font-semibold">
            <ChevronLeft size={24} />
            <span>{t('actions.back')}</span>
          </button>
          <div className="text-sm font-bold text-gray-800">{t('actions.title')}</div>
          <div className="w-6"></div> {/* Spacer for centering */}
        </div>
      </header>

      <div className="p-4 space-y-6 pb-24">
        {/* SUB-HEADER */}
        <div className="bg-gov-navy text-white p-4 rounded-xl shadow-md text-center">
            <h2 className="text-xs uppercase opacity-80 tracking-widest font-bold mb-1">{t('actions.basedOn')}</h2>
            <div className="text-3xl font-bold flex items-center justify-center gap-2">
                <span>{aqi}</span>
                <span className="w-1.5 h-1.5 bg-white rounded-full opacity-50"></span>
                <span style={{ color: colorScheme.bg }} className="brightness-150">{category}</span>
            </div>
        </div>

        {/* IMMEDIATE ACTIONS */}
        <Card className="!border-l-[6px] !border-l-red-600 relative overflow-hidden">
           <div className="flex items-center gap-2 mb-4">
               <ShieldAlert className="text-red-600" />
               <h3 className="text-lg font-bold text-gray-900">{t('actions.immediate.title')}</h3>
           </div>
           <ul className="space-y-3">
               <ActionItem text={t('actions.immediate.1')} />
               <ActionItem text={t('actions.immediate.2')} />
               <ActionItem text={t('actions.immediate.3')} />
               <ActionItem text={t('actions.immediate.4')} />
               <ActionItem text={t('actions.immediate.5')} />
           </ul>
        </Card>

        {/* VULNERABLE GROUPS */}
        <Card className="!border-l-[6px] !border-l-orange-500">
           <div className="flex items-center gap-2 mb-4">
               <Info className="text-orange-500" />
               <h3 className="text-lg font-bold text-gray-900">{t('actions.special.title')}</h3>
           </div>
           <div className="space-y-4">
               <div>
                   <h4 className="font-bold text-sm text-gray-700 mb-1">{t('actions.special.children')}</h4>
                   <ul className="space-y-1">
                       <ActionItem text={t('actions.special.children.1')} small />
                       <ActionItem text={t('actions.special.children.2')} small />
                   </ul>
               </div>
               <div>
                   <h4 className="font-bold text-sm text-gray-700 mb-1">{t('actions.special.elderly')}</h4>
                   <ul className="space-y-1">
                       <ActionItem text={t('actions.special.elderly.1')} small />
                       <ActionItem text={t('actions.special.elderly.2')} small />
                   </ul>
               </div>
               <div>
                   <h4 className="font-bold text-sm text-gray-700 mb-1">{t('actions.special.asthma')}</h4>
                   <ul className="space-y-1">
                       <ActionItem text={t('actions.special.asthma.1')} small />
                       <ActionItem text={t('actions.special.asthma.2')} small />
                   </ul>
               </div>
           </div>
        </Card>

        {/* COMMUTE TIPS */}
        <Card className="!border-l-[6px] !border-l-blue-500">
           <div className="flex items-center gap-2 mb-4">
               <Car className="text-blue-500" />
               <h3 className="text-lg font-bold text-gray-900">{t('actions.commute.title')}</h3>
           </div>
           <ul className="space-y-3">
               <ActionItem text={t('actions.commute.1')} />
               <ActionItem text={t('actions.commute.2')} />
               <ActionItem text={t('actions.commute.3')} />
               <ActionItem text={t('actions.commute.4')} />
           </ul>
        </Card>

         {/* INDOOR HEALTH */}
         <Card className="!border-l-[6px] !border-l-green-500">
           <div className="flex items-center gap-2 mb-4">
               <HomeIcon className="text-green-500" />
               <h3 className="text-lg font-bold text-gray-900">{t('actions.home.title')}</h3>
           </div>
           <ul className="space-y-3">
               <ActionItem text={t('actions.home.1')} />
               <ActionItem text={t('actions.home.2')} />
               <ActionItem text={t('actions.home.3')} />
               <ActionItem text={t('actions.home.4')} />
           </ul>
        </Card>

        {/* GOVERNMENT ACTIONS */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3 text-gov-navy">
               <Info size={20} />
               <h3 className="font-bold">{t('actions.gov.title')}</h3>
            </div>
            <ul className="space-y-2 mb-4">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                    <span>{t('actions.gov.1')}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                    <span>{t('actions.gov.2')}</span>
                </li>
                 <li className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-orange-500 text-xs mt-0.5 shrink-0">⏳</span>
                    <span>{t('actions.gov.3')}</span>
                </li>
            </ul>
            <p className="text-xs text-blue-800 font-medium bg-blue-100 p-2 rounded-lg">
                Expected improvement: AQI may drop to ~380 by evening. We'll update you.
            </p>
        </div>

      </div>

      {/* FLOATING SHARE BUTTON */}
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={handleShare}
          className="flex items-center gap-2 bg-gov-navy text-white px-5 py-3 rounded-full shadow-xl hover:bg-[#152e4d] active:scale-95 transition-all font-bold"
        >
            <Share2 size={20} />
            <span>{t('actions.share')}</span>
        </button>
      </div>
    </div>
  );
};

const ActionItem = ({ text, small = false }: { text: string; small?: boolean }) => (
    <li className={`flex items-start gap-2 text-gray-800 ${small ? 'text-sm' : 'text-base'}`}>
        <span className="text-green-500 font-bold">✓</span>
        <span>{text}</span>
    </li>
);
