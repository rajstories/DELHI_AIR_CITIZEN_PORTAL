import React from 'react';
import { Footprints, Bike, Wind, Gamepad2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ActivityPlannerProps {
  aqi: number;
}

type Status = 'good' | 'moderate' | 'poor' | 'bad';

export const ActivityPlanner: React.FC<ActivityPlannerProps> = ({ aqi }) => {
  const { t } = useLanguage();

  const getActivityStatus = (type: 'walk' | 'kids' | 'vent' | 'travel'): { status: Status; label: string } => {
    if (type === 'walk') {
      if (aqi <= 100) return { status: 'good', label: t('activity.walk.good') };
      if (aqi <= 200) return { status: 'moderate', label: t('activity.walk.moderate') };
      return { status: 'bad', label: t('activity.walk.bad') };
    }
    if (type === 'kids') {
      if (aqi <= 100) return { status: 'good', label: t('activity.kids.good') };
      if (aqi <= 200) return { status: 'moderate', label: t('activity.kids.moderate') };
      return { status: 'bad', label: t('activity.kids.bad') };
    }
    if (type === 'vent') {
      if (aqi <= 100) return { status: 'good', label: t('activity.vent.good') };
      if (aqi <= 200) return { status: 'moderate', label: t('activity.vent.moderate') };
      return { status: 'bad', label: t('activity.vent.bad') };
    }
    // Travel
    if (aqi <= 150) return { status: 'good', label: t('activity.travel.good') };
    if (aqi <= 300) return { status: 'poor', label: t('activity.travel.moderate') };
    return { status: 'bad', label: t('activity.travel.bad') };
  };

  const getStyles = (status: Status) => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-900 border-green-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-900 border-yellow-200';
      case 'poor': return 'bg-orange-100 text-orange-900 border-orange-200';
      case 'bad': return 'bg-red-100 text-red-900 border-red-200';
    }
  };

  const getIconColor = (status: Status) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'poor': return 'text-orange-600';
      case 'bad': return 'text-red-600';
    }
  };

  const activities = [
    { id: 'walk', icon: Footprints, title: t('activity.walk.title'), ...getActivityStatus('walk') },
    { id: 'kids', icon: Gamepad2, title: t('activity.kids.title'), ...getActivityStatus('kids') },
    { id: 'vent', icon: Wind, title: t('activity.vent.title'), ...getActivityStatus('vent') },
    { id: 'travel', icon: Bike, title: t('activity.travel.title'), ...getActivityStatus('travel') },
  ];

  return (
    <div className="px-1">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">{t('activity.title')}</h3>
      <div className="grid grid-cols-2 gap-3">
        {activities.map((item) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.id} 
              className={`rounded-xl p-4 border flex flex-col items-center justify-center text-center transition-colors duration-300 ${getStyles(item.status as Status)}`}
            >
              <div className={`mb-2 ${getIconColor(item.status as Status)}`}>
                <Icon size={28} />
              </div>
              <span className="text-xs font-semibold opacity-70 mb-1 uppercase tracking-wide">{item.title}</span>
              <span className="text-sm font-bold leading-tight">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};