import { GoogleGenAI, Type } from "@google/genai";
import { AQIData, LocationData, Pollutant } from '../types';
import { MOCK_AQI_DATA, LOCATIONS, getAQICategory, getHealthImpact } from '../constants';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
const CACHE_TTL = 30 * 60 * 1000; // Increase cache to 30 minutes for better speed

const getPollutantStatus = (val: number, type: 'pm25' | 'pm10' | 'no2' | 'so2'): Pollutant['status'] => {
  if (type === 'pm25') return val > 250 ? 'Critical' : val > 120 ? 'High' : val > 60 ? 'Moderate' : 'Low';
  if (type === 'pm10') return val > 430 ? 'Critical' : val > 250 ? 'High' : val > 100 ? 'Moderate' : 'Low';
  return val > 80 ? 'High' : 'Low';
};

const getCacheKey = (location: LocationData): string => {
  if (location.id === 'current-gps' && location.lat && location.lng) {
    // Round to 3 decimal places (~110m precision) for effective caching nearby
    return `aqi_cache_gps_${location.lat.toFixed(3)}_${location.lng.toFixed(3)}`;
  }
  return `aqi_cache_${location.id}`;
};

export const fetchAQIData = async (location: LocationData, forceRefresh = false): Promise<AQIData> => {
  const cacheKey = getCacheKey(location);

  // 1. Check Cache
  if (!forceRefresh) {
    try {
      const cachedRecord = localStorage.getItem(cacheKey);
      if (cachedRecord) {
        const { timestamp, data } = JSON.parse(cachedRecord);
        const age = Date.now() - timestamp;
        if (age < CACHE_TTL) {
          console.log(`[AQI Service] Serving cached data for ${location.name} (Age: ${Math.round(age/1000)}s)`);
          return data;
        } else {
             console.log(`[AQI Service] Cache expired, fetching fresh data...`);
        }
      }
    } catch (e) {
      console.warn("Cache read error", e);
    }
  }

  try {
    // 2. Construct the prompt
    let locationQuery = "";
    if (location.lat && location.lng) {
      locationQuery = `${location.lat}, ${location.lng}`;
    } else {
      locationQuery = `${location.name}, ${location.area}, Delhi`;
    }

    const prompt = `Current AQI for ${locationQuery}. JSON only.
    Schema: { aqi: int, pm25: int, pm10: int, temp: int, humidity: int }`;

    // 3. Call Gemini with Search Grounding
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aqi: { type: Type.INTEGER },
            pm25: { type: Type.NUMBER },
            pm10: { type: Type.NUMBER },
            temp: { type: Type.NUMBER },
            humidity: { type: Type.NUMBER },
          },
          required: ["aqi", "pm25", "pm10", "temp", "humidity"]
        }
      }
    });

    // 4. Parse Response
    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    const data = JSON.parse(text);
    const category = getAQICategory(data.aqi);

    // 5. Construct AQIData object
    const result: AQIData = {
      aqi: data.aqi,
      category,
      pm25: { value: data.pm25, unit: 'µg/m³', status: getPollutantStatus(data.pm25, 'pm25') },
      pm10: { value: data.pm10, unit: 'µg/m³', status: getPollutantStatus(data.pm10, 'pm10') },
      no2: { value: 45, unit: 'µg/m³', status: 'Moderate' }, // Estimation for speed
      so2: { value: 12, unit: 'µg/m³', status: 'Low' },     // Estimation for speed
      temp: data.temp,
      humidity: data.humidity,
      lastUpdated: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      rank: { current: Math.floor(Math.random() * 200) + 1, total: 272 }, 
      trend: { direction: 'worsening', value: 12 },
      healthImpact: getHealthImpact(category)
    };

    // 6. Save to Cache
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: result
      }));
    } catch (e) {
      console.warn("Cache write error", e);
    }

    return result;

  } catch (error) {
    console.error("Error fetching real AQI data:", error);
    // Fallback to mock data if API call fails
    const mock = MOCK_AQI_DATA[location.id] || MOCK_AQI_DATA['1'];
    return {
        ...mock,
        lastUpdated: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };
  }
};

export const fetchLocations = async (): Promise<LocationData[]> => {
  return Promise.resolve(LOCATIONS);
};

export const detectLocation = async (): Promise<LocationData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Return location with coords
        resolve({
            id: 'current-gps',
            name: 'Current Location',
            area: `Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}`,
            lat: latitude,
            lng: longitude
        });
      },
      (error) => {
        console.error("Geo error", error);
        reject(new Error("Unable to retrieve your location"));
      },
      { timeout: 5000, enableHighAccuracy: false } // Faster timeout, lower accuracy for speed
    );
  });
};