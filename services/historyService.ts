import { HistoryPoint, TimeRange, Prediction, ComparisonData, AQICategory } from '../types';
import { getAQICategory } from '../constants';

export const fetchHistoryData = async (range: TimeRange): Promise<HistoryPoint[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const data: HistoryPoint[] = [];
  const now = new Date();

  if (range === '24H') {
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hour = d.getHours();
      // Simulate diurnal cycle (worse in morning/evening)
      let baseAQI = 300;
      if (hour >= 6 && hour <= 10) baseAQI += 100; // Morning peak
      if (hour >= 18 && hour <= 22) baseAQI += 80; // Evening peak
      if (hour >= 14 && hour <= 16) baseAQI -= 50; // Afternoon dip
      
      const noise = Math.floor(Math.random() * 40) - 20;
      const aqi = Math.max(50, Math.min(500, baseAQI + noise));
      
      data.push({
        date: d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
        fullDate: d.toLocaleString(),
        aqi,
        category: getAQICategory(aqi)
      });
    }
  } else if (range === '7D') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      // Random daily variation
      const aqi = Math.floor(Math.random() * 200) + 200; // 200-400 range
      
      data.push({
        date: days[d.getDay()],
        fullDate: d.toLocaleDateString(),
        aqi,
        category: getAQICategory(aqi)
      });
    }
  } else {
    // 30D
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const aqi = Math.floor(Math.random() * 250) + 150;
      
      data.push({
        date: d.getDate().toString(), // Just the day number
        fullDate: d.toLocaleDateString(),
        aqi,
        category: getAQICategory(aqi)
      });
    }
  }
  
  return data;
};

export const fetchPredictions = async (): Promise<Prediction[]> => {
    return [
        {
            period: "Tomorrow Morning",
            time: "6 AM - 12 PM",
            aqiRange: "380-410",
            status: "Severe",
            alertLevel: "high"
        },
        {
            period: "Tomorrow Evening",
            time: "6 PM - 12 AM",
            aqiRange: "350-380",
            status: "Very Poor",
            alertLevel: "moderate"
        },
        {
            period: "Day After",
            time: "Full Day",
            aqiRange: "280-320",
            status: "Poor",
            alertLevel: "low"
        }
    ];
};

export const fetchComparison = async (): Promise<ComparisonData[]> => {
    return [
        { name: "Rohini (You)", aqi: 412, category: "Severe" },
        { name: "Dwarka", aqi: 298, category: "Poor" },
        { name: "Connaught Place", aqi: 185, category: "Moderate" },
        { name: "Delhi Avg", aqi: 310, category: "Very Poor" },
    ];
};
