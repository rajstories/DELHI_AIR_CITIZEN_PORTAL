import { AQICategory, LocationData, AQIData, Pollutant, Alert } from './types';

// AQI Color Palette
export const AQI_COLORS: Record<AQICategory, { bg: string; text: string; border: string }> = {
  'Good': { bg: '#00e400', text: '#000000', border: '#00b000' },
  'Satisfactory': { bg: '#ffff00', text: '#000000', border: '#e6e600' },
  'Moderate': { bg: '#ff7e00', text: '#ffffff', border: '#cc6500' },
  'Poor': { bg: '#ff0000', text: '#ffffff', border: '#cc0000' },
  'Very Poor': { bg: '#8f3f97', text: '#ffffff', border: '#723279' },
  'Severe': { bg: '#7e0023', text: '#ffffff', border: '#65001c' },
};

// Available Locations in Delhi (Subset of 272 wards)
export const LOCATIONS: LocationData[] = [
  { id: '1', name: 'ITO', area: 'Central Delhi' },
  { id: '2', name: 'R.K. Puram', area: 'South Delhi' },
  { id: '3', name: 'Punjabi Bagh', area: 'West Delhi' },
  { id: '4', name: 'Anand Vihar', area: 'East Delhi' },
  { id: '5', name: 'Mandir Marg', area: 'Central Delhi' },
  { id: '6', name: 'Jahangirpuri', area: 'North Delhi' },
  { id: '7', name: 'Rohini', area: 'North West Delhi' },
  { id: '8', name: 'Dwarka', area: 'South West Delhi' },
];

export const MOCK_ALERTS: Alert[] = [
  {
    id: '1',
    type: 'critical',
    title: 'SEVERE POLLUTION',
    location: 'Rohini Ward',
    timestamp: '2 hours ago',
    message: 'AQI jumped from 312 to 412. Primary cause: Traffic congestion.',
    detail: 'Action: Stay indoors, wear mask',
    actionText: 'View Details',
    read: false
  },
  {
    id: '2',
    type: 'warning',
    title: 'PREDICTION WARNING',
    location: 'Rohini Ward',
    timestamp: '5 hours ago',
    message: 'AQI expected to reach 450 by 8 PM. Plan accordingly.',
    detail: 'Plan your commute to avoid evening rush hour.',
    actionText: 'View Forecast',
    read: true
  },
  {
    id: '3',
    type: 'info',
    title: 'AIR QUALITY IMPROVED',
    location: 'Rohini Ward',
    timestamp: 'Yesterday',
    message: 'AQI dropped from 412 to 285. Government interventions working!',
    detail: 'Water sprinkling and construction bans have shown positive results.',
    actionText: 'See What Worked',
    read: true
  }
];

export const getAQICategory = (aqi: number): AQICategory => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
};

const getPollutantStatus = (val: number, type: 'pm25' | 'pm10' | 'no2' | 'so2'): Pollutant['status'] => {
  // Simplified logic for status
  if (type === 'pm25') return val > 250 ? 'Critical' : val > 120 ? 'High' : val > 60 ? 'Moderate' : 'Low';
  if (type === 'pm10') return val > 430 ? 'Critical' : val > 250 ? 'High' : val > 100 ? 'Moderate' : 'Low';
  return val > 80 ? 'High' : 'Low';
};

export const getHealthImpact = (category: AQICategory) => {
  switch (category) {
    case 'Good': return { 
      icon: '😊', 
      shortDescription: 'Air is clean', 
      fullDescription: 'Air quality is considered satisfactory, and air pollution poses little or no risk.', 
      isSensitive: false 
    };
    case 'Satisfactory': return { 
      icon: '🙂', 
      shortDescription: 'Acceptable quality', 
      fullDescription: 'Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution.', 
      isSensitive: true 
    };
    case 'Moderate': return { 
      icon: '😐', 
      shortDescription: 'Moderate concern', 
      fullDescription: 'Breathing discomfort for sensitive people. Avoid prolonged outdoor exertion.', 
      isSensitive: true 
    };
    case 'Poor': return { 
      icon: '😷', 
      shortDescription: 'Poor air quality', 
      fullDescription: 'Breathing discomfort to most people on prolonged exposure. Wear a mask outdoors.', 
      isSensitive: true 
    };
    case 'Very Poor': return { 
      icon: '🤢', 
      shortDescription: 'Very Poor', 
      fullDescription: 'Respiratory illness on prolonged exposure. Avoid all outdoor physical activities. Use air purifiers indoors.', 
      isSensitive: true 
    };
    case 'Severe': return { 
      icon: '☠️', 
      shortDescription: 'Severe Emergency', 
      fullDescription: 'Affects healthy people and seriously impacts those with existing diseases. Stay indoors. Keep windows closed.', 
      isSensitive: true 
    };
    default: return { icon: '❓', shortDescription: 'Unknown', fullDescription: 'No data available', isSensitive: false };
  }
};

// Helper to generate mock data
const generateMockData = (id: string): AQIData => {
  const baseAqi = Math.floor(Math.random() * 400) + 50; // Random AQI between 50 and 450
  // Adjust based on location for "realism"
  const aqi = id === '4' ? 450 : id === '1' ? 342 : baseAqi;
  
  const category = getAQICategory(aqi);
  
  return {
    aqi,
    category,
    pm25: { value: Math.floor(aqi * 0.6), unit: 'µg/m³', status: getPollutantStatus(Math.floor(aqi * 0.6), 'pm25') },
    pm10: { value: Math.floor(aqi * 0.8), unit: 'µg/m³', status: getPollutantStatus(Math.floor(aqi * 0.8), 'pm10') },
    no2: { value: Math.floor(Math.random() * 60) + 20, unit: 'µg/m³', status: getPollutantStatus(40, 'no2') },
    so2: { value: Math.floor(Math.random() * 20) + 5, unit: 'µg/m³', status: getPollutantStatus(10, 'so2') },
    temp: 28,
    humidity: 45,
    lastUpdated: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    rank: { current: Math.floor(Math.random() * 272) + 1, total: 272 },
    trend: { direction: Math.random() > 0.5 ? 'worsening' : 'improving', value: Math.floor(Math.random() * 30) },
    healthImpact: getHealthImpact(category)
  };
};

export const MOCK_AQI_DATA: Record<string, AQIData> = {};
LOCATIONS.forEach(loc => {
  MOCK_AQI_DATA[loc.id] = generateMockData(loc.id);
});

export const getHealthAdvice = (category: AQICategory): string[] => {
    // Keeping for backward compatibility if needed, but MOCK_AQI_DATA now has rich descriptions
    return [getHealthImpact(category).fullDescription];
};
