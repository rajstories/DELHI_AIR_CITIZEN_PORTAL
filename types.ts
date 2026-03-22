export type AQICategory = 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';

export interface LocationData {
  id: string;
  name: string;
  area: string;
  lat?: number;
  lng?: number;
}

export interface Pollutant {
  value: number;
  unit: string;
  status: 'Low' | 'Moderate' | 'High' | 'Critical';
}

export interface AQIData {
  aqi: number;
  category: AQICategory;
  pm25: Pollutant;
  pm10: Pollutant;
  no2: Pollutant;
  so2: Pollutant;
  temp: number;
  humidity: number;
  lastUpdated: string;
  rank: {
    current: number;
    total: number;
  };
  trend: {
    direction: 'improving' | 'worsening' | 'stable';
    value: number; // e.g., +23
  };
  healthImpact: {
    icon: string; // Emoji character
    shortDescription: string;
    fullDescription: string;
    isSensitive: boolean;
  };
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  location: string;
  timestamp: string; // relative string like "2 hours ago"
  message: string;
  detail: string;
  actionText?: string;
  read: boolean;
}

export interface HistoryPoint {
  date: string; // Display label (e.g., "Mon", "6 PM")
  fullDate: string; // For tooltip
  aqi: number;
  category: AQICategory;
}

export interface Prediction {
  period: string; // e.g., "Tomorrow Morning"
  time: string;
  aqiRange: string;
  status: AQICategory;
  alertLevel: 'high' | 'moderate' | 'low';
}

export interface ComparisonData {
  name: string;
  aqi: number;
  category: AQICategory;
}

export interface UserSettings {
  primaryWard: string;
  autoDetect: boolean;
  showNearby: boolean;
  notifyCritical: boolean;
  notifyPoor: boolean;
  notifyModerate: boolean;
  dailySummary: boolean;
  eveningForecast: boolean;
  realTimeAlerts: boolean;
  smartAlerts: boolean; // New predictive alert setting
  muteNonCritical: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  phoneNumber: string;
  emailEnabled: boolean;
  allowAnalytics: boolean;
  language: 'en' | 'hi' | 'pa';
  units: 'aqi' | 'raw';
  showActions: boolean;
  animations: boolean;
  highContrast: boolean;
  refreshRate: '15' | '30' | '60';
  autoRefresh: boolean;
  backgroundRefresh: boolean;
}

export type TimeRange = '24H' | '7D' | '30D';

export type AlertFilter = 'all' | 'critical' | 'warning' | 'info';

export type Page = 'home' | 'alerts' | 'history' | 'leaderboard' | 'actions' | 'myreports';

export interface NavItem {
  id: Page;
  label: string;
  icon: any; // Lucide icon component type
}

export interface ProgressUpdate {
  time: number;
  status: string;
}

export interface ReportData {
  reportId: string;
  status: 'verified' | 'flagged' | 'rejected' | 'open' | 'in_progress' | 'resolved' | string;
  trustScore: number;
  issueType: string;
  title: string;
  description: string;
  severity: string;
  timestamp: number;
  photoUrl: string;
  location: {
    submittedLat: number | null;
    submittedLng: number | null;
    address: string;
    digiPin: string | null;
  };
  progressUpdates: ProgressUpdate[];
}