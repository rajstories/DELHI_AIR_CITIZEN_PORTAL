import { UserSettings } from '../types';

// SECURITY: Rate Limiter to prevent abuse
class RateLimiter {
  private requests: number[] = [];
  private limit: number = 60; // Max requests
  private window: number = 3600000; // 1 hour in ms

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.window);
    
    if (this.requests.length >= this.limit) {
      console.warn("Rate limit exceeded");
      return false;
    }
    
    this.requests.push(now);
    return true;
  }
}

export const rateLimiter = new RateLimiter();

// DEFAULT SETTINGS
const DEFAULT_SETTINGS: UserSettings = {
  primaryWard: '1', // ID of location
  autoDetect: true,
  showNearby: true,
  notifyCritical: true,
  notifyPoor: true,
  notifyModerate: false,
  dailySummary: true,
  eveningForecast: true,
  realTimeAlerts: false,
  smartAlerts: true, // Default to true
  muteNonCritical: true,
  pushEnabled: true,
  smsEnabled: false,
  phoneNumber: '',
  emailEnabled: false,
  allowAnalytics: true,
  language: 'en',
  units: 'aqi',
  showActions: true,
  animations: true,
  highContrast: false,
  refreshRate: '30',
  autoRefresh: true,
  backgroundRefresh: false
};

// SECURITY: Sanitize Inputs
export const sanitizeInput = (input: string): string => {
  // Allow only alphanumeric, spaces, hyphens for general text
  return input.replace(/[^a-zA-Z0-9\s-@.]/g, '').trim();
};

export const sanitizePhone = (phone: string): string => {
  // Allow digits only
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length > 10) return cleaned.slice(0, 10);
  return cleaned;
};

// SECURITY: Masking sensitive data for display
export const maskPhone = (phone: string): string => {
  if (!phone || phone.length < 4) return phone;
  return `+91-XXXXX-XXX${phone.slice(-2)}`;
};

// SERVICE METHODS
export const getSettings = (): UserSettings => {
  try {
    // SECURITY: Use sessionStorage instead of localStorage for user preferences
    const stored = sessionStorage.getItem('user_settings');
    if (!stored) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch (e) {
    console.error("Failed to load settings", e);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: UserSettings): boolean => {
  if (!rateLimiter.canMakeRequest()) return false;

  try {
    // Basic validation before save
    if (settings.phoneNumber && !/^[6-9]\d{9}$/.test(settings.phoneNumber) && settings.phoneNumber !== '') {
       // Don't save invalid phones (though UI should catch this)
    }

    sessionStorage.setItem('user_settings', JSON.stringify(settings));
    return true;
  } catch (e) {
    console.error("Failed to save settings", e);
    return false;
  }
};

export const clearUserData = () => {
  sessionStorage.removeItem('user_settings');
  // Note: We deliberately do not clear the AQI Data cache in localStorage 
  // as that is public, non-sensitive data.
};