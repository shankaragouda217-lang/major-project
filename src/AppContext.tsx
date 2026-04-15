import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, getDocs, onSnapshot, collection, query, orderBy, limit, addDoc, deleteDoc, serverTimestamp, getDocFromServer, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebase';
import { GoogleGenAI, Type } from "@google/genai";

import { translations } from './translations';
import { getAIErrorKey } from './services/geminiService';
import { getLanguageName } from './lib/utils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, user: User | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: user?.uid,
      email: user?.email,
      emailVerified: user?.emailVerified,
      isAnonymous: user?.isAnonymous,
      tenantId: user?.tenantId,
      providerInfo: user?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();

interface AppContextType {
  user: User | null;
  userData: any | null;
  loading: boolean;
  isAuthReady: boolean;
  plants: any[];
  sensors: {
    moisture: number;
    temp: number;
    apparentTemp?: number;
    humidity: number;
    light: number;
    condition: string;
    weatherCode: number;
    lastUpdated?: string | null;
  };
  waterPlant: () => void;
  fetchWeatherData: (lat: number, lon: number) => Promise<void>;
  clearHistory: () => Promise<void>;
  updateSettings: (newSettings: any) => Promise<void>;
  suggestions: any[];
  allPlants: any[];
  searchPlantAI: (name: string) => Promise<any>;
  enableLiveLocation: () => void;
  disableLiveLocation: () => void;
  isLocationEnabled: boolean;
  cityName: string | null;
  posts: any[];
  expenses: any[];
  reports: any[];
  reportInfection: (report: any) => Promise<void>;
  history: any[];
  addToHistory: (item: any) => Promise<void>;
  deleteHistoryItem: (id: string) => Promise<void>;
  deleteMultipleHistoryItems: (ids: string[]) => Promise<void>;
  deleteMultipleReports: (ids: string[]) => Promise<void>;
  addPost: (post: any) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  addExpense: (expense: any) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  currentLanguage: string;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  notificationPermission: NotificationPermission;
  healthScore: number;
  healthStatus: { label: string; color: string; explanation: string };
  smartSummary: { watering: string; sunlight: string; actions: string[] };
  submitFeedback: (analysisId: string, worked: boolean) => Promise<void>;
  inAppNotifications: { id: string; title: string; body: string; timestamp: number; read: boolean }[];
  addInAppNotification: (title: string, body: string) => void;
  markNotificationsAsRead: () => void;
  clearNotifications: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const PLANT_DATABASE = [
  { 
    name: 'curry_leaves', 
    minTemp: 15, maxTemp: 40, minHumidity: 40, light: 'high', 
    description: 'curry_leaves_desc',
    growthTime: 'curry_leaves_growth',
    needs: 'curry_leaves_needs',
    suitableMonths: 'curry_leaves_months'
  },
  { 
    name: 'chilli', 
    minTemp: 20, maxTemp: 35, minHumidity: 40, light: 'high', 
    description: 'chilli_desc',
    growthTime: 'chilli_growth',
    needs: 'chilli_needs',
    suitableMonths: 'chilli_months'
  },
  { 
    name: 'bhindi', 
    minTemp: 22, maxTemp: 40, minHumidity: 50, light: 'high', 
    description: 'bhindi_desc',
    growthTime: 'bhindi_growth',
    needs: 'bhindi_needs',
    suitableMonths: 'bhindi_months'
  },
  { 
    name: 'marigold', 
    minTemp: 15, maxTemp: 35, minHumidity: 30, light: 'high', 
    description: 'marigold_desc',
    growthTime: 'marigold_growth',
    needs: 'marigold_needs',
    suitableMonths: 'marigold_months'
  },
  { 
    name: 'brinjal', 
    minTemp: 20, maxTemp: 35, minHumidity: 50, light: 'high', 
    description: 'brinjal_desc',
    growthTime: 'brinjal_growth',
    needs: 'brinjal_needs',
    suitableMonths: 'brinjal_months'
  },
  { 
    name: 'papaya', 
    minTemp: 20, maxTemp: 35, minHumidity: 50, light: 'high', 
    description: 'papaya_desc',
    growthTime: 'papaya_growth',
    needs: 'papaya_needs',
    suitableMonths: 'papaya_months'
  },
  { 
    name: 'tomato', 
    minTemp: 18, maxTemp: 32, minHumidity: 40, light: 'high', 
    description: 'tomato_desc',
    growthTime: 'tomato_growth',
    needs: 'tomato_needs',
    suitableMonths: 'tomato_months'
  },
  { 
    name: 'tulsi', 
    minTemp: 15, maxTemp: 40, minHumidity: 30, light: 'high', 
    description: 'tulsi_desc',
    growthTime: 'tulsi_growth',
    needs: 'tulsi_needs',
    suitableMonths: 'tulsi_months'
  },
  { 
    name: 'palak', 
    minTemp: 10, maxTemp: 30, minHumidity: 40, light: 'medium', 
    description: 'palak_desc',
    growthTime: 'palak_growth',
    needs: 'palak_needs',
    suitableMonths: 'palak_months'
  },
  { 
    name: 'aloe_vera', 
    minTemp: 13, maxTemp: 45, minHumidity: 10, light: 'high', 
    description: 'aloe_vera_desc',
    growthTime: 'aloe_vera_growth',
    needs: 'aloe_vera_needs',
    suitableMonths: 'aloe_vera_months'
  },
  { 
    name: 'money_plant', 
    minTemp: 15, maxTemp: 35, minHumidity: 40, light: 'low', 
    description: 'money_plant_desc',
    growthTime: 'money_plant_growth',
    needs: 'money_plant_needs',
    suitableMonths: 'money_plant_months'
  }
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [plants, setPlants] = useState<any[]>([]);
  const [sensors, setSensors] = useState(() => {
    const saved = localStorage.getItem('sensors');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved sensors:", e);
      }
    }
    return {
      moisture: 75,
      temp: 24,
      apparentTemp: 24,
      humidity: 60,
      light: 80,
      condition: 'Sunny',
      isDay: true,
      weatherCode: 0,
      lastUpdated: null
    };
  });
  const [lastWatered, setLastWatered] = useState<number>(() => {
    // Try to get from local storage as a fallback for faster initial load
    const saved = localStorage.getItem('lastWatered');
    return saved ? parseInt(saved) : Date.now() - (1000 * 60 * 60 * 4); // Default to 4 hours ago
  });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [allPlants, setAllPlants] = useState<any[]>([]);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  const lastCoords = useRef<{ lat: number, lon: number } | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);
  const [isIPLocation, setIsIPLocation] = useState(false);
  const [weatherIntervalId, setWeatherIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [healthScore, setHealthScore] = useState(85);
  const [healthStatus, setHealthStatus] = useState({ label: 'Good', color: 'text-emerald-500', explanation: 'Your plants are thriving in current conditions.' });
  const [smartSummary, setSmartSummary] = useState({ 
    watering: 'Optimal', 
    sunlight: 'Good', 
    actions: ['Check soil moisture in the evening'] 
  });
  const [inAppNotifications, setInAppNotifications] = useState<{ id: string; title: string; body: string; timestamp: number; read: boolean }[]>(() => {
    const saved = localStorage.getItem('inAppNotifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Persist notifications to localStorage
  useEffect(() => {
    localStorage.setItem('inAppNotifications', JSON.stringify(inAppNotifications));
  }, [inAppNotifications]);

  const addInAppNotification = (title: string, body: string) => {
    const newNotif = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      body,
      timestamp: Date.now(),
      read: false
    };
    setInAppNotifications(prev => [newNotif, ...prev].slice(0, 20)); // Keep last 20
  };

  const markNotificationsAsRead = () => {
    setInAppNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setInAppNotifications([]);
  };

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    }
    return 'denied';
  };

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let text = translations[currentLanguage]?.[key] || translations['en']?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }, [currentLanguage]);

  const waterPlant = async () => {
    const now = Date.now();
    setLastWatered(now);
    localStorage.setItem('lastWatered', now.toString());
    setSensors(prev => ({ ...prev, moisture: 100 }));
    
    if (user) {
      const path = `users/${user.uid}`;
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          lastWatered: now
        });
        
        await addToHistory({
          type: 'analysis',
          title: 'Plant Watered',
          details: 'You manually updated the soil moisture to 100%.'
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path, user);
      }
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    try {
      const historyRef = collection(db, 'users', user.uid, 'history');
      const snapshot = await getDocs(historyRef);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      setHistory([]);
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  const updateSettings = async (newSettings: any) => {
    if (!user) return;
    try {
      // Update local state immediately for better UX
      if (newSettings.language) {
        setCurrentLanguage(newSettings.language);
      }
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        settings: { ...userData?.settings, ...newSettings }
      });
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  // Fetch real weather data
  const fetchWeatherData = useCallback(async (lat: number, lon: number, isFallback = false) => {
    try {
      console.log(`Fetching weather for: ${lat}, ${lon} (Fallback: ${isFallback})`);
      
      // Fetch weather independently
      try {
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,precipitation_probability,relative_humidity_2m,cloud_cover,is_day,weather_code`
        );
        if (!weatherRes.ok) throw new Error(`Weather API error: ${weatherRes.status}`);
        const weatherData = await weatherRes.json();
        
        if (weatherData.current) {
          const code = weatherData.current.weather_code;
          const isDay = weatherData.current.is_day;
          const precip = weatherData.current.precipitation_probability || 0;
          let condition = isDay ? 'Sunny' : 'Clear';
          
          // Refined mapping based on Open-Meteo WMO codes
          if (code >= 95) condition = 'Thunderstorm';
          else if (code >= 80 || (code >= 60 && precip > 70)) condition = 'Rain Showers';
          else if (code >= 71) condition = 'Snowy';
          else if (code >= 61 || (code >= 50 && precip > 40)) condition = 'Rain';
          else if (code >= 51 || precip > 20) condition = 'Drizzle';
          else if (code >= 45) condition = 'Foggy';
          else if (code >= 3) condition = 'Cloudy';
          else if (code >= 2) condition = 'Partly Cloudy';
          else if (code >= 1) condition = isDay ? 'Sunny' : 'Clear';
          else condition = isDay ? 'Sunny' : 'Clear';

          console.log(`Weather Data: Code=${code}, IsDay=${isDay}, Temp=${weatherData.current.temperature_2m}, Condition=${condition}`);

          setSensors(prev => {
            const next = {
              ...prev,
              temp: weatherData.current.temperature_2m,
              apparentTemp: weatherData.current.apparent_temperature,
              humidity: weatherData.current.relative_humidity_2m,
              light: weatherData.current.is_day ? Math.max(10, 100 - weatherData.current.cloud_cover) : 5,
              condition,
              isDay: !!weatherData.current.is_day,
              weatherCode: code,
              lastUpdated: new Date().toISOString()
            };
            localStorage.setItem('sensors', JSON.stringify(next));
            return next;
          });
        }
      } catch (weatherError) {
        console.error("Weather fetch failed:", weatherError);
      }

      // Fetch city name independently
      try {
        // Try BigDataCloud first (often faster and more reliable for localities)
        const bdcRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${currentLanguage}`
        );
        
        if (bdcRes.ok) {
          const bdcData = await bdcRes.json();
          if (bdcData.city || bdcData.locality || bdcData.principalSubdivision) {
            let city = bdcData.city || bdcData.locality || bdcData.principalSubdivision;
            let area = bdcData.locality || bdcData.neighborhood;
            
            // Specific check for Govindaraja Nagar
            if (area && (area.toLowerCase().includes('govindaraja') || area.toLowerCase().includes('thimmenahalli'))) {
              area = t("govindaraja_nagar");
            }
            
            if (city.toLowerCase().includes('bagalkot')) city = t("bagalkot");
            
            const displayName = (area && area.toLowerCase() !== city.toLowerCase()) ? `${city} (${area})` : city;
            console.log("Location detected (BDC):", displayName);
            setCityName(displayName);
            setIsIPLocation(isFallback);
            return;
          }
        }

        // Fallback to Nominatim
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=${currentLanguage}`
        );
        if (!geoRes.ok) throw new Error(`Geo API error: ${geoRes.status}`);
        const geoData = await geoRes.json();

        if (geoData.address) {
          const addr = geoData.address;
          
          // Specific check for Govindaraja Nagar as requested by the user
          const allFields = Object.values(addr).map(v => String(v).toLowerCase());
          const hasGovindaraja = allFields.some(f => f.includes('govindaraja'));
          
          // More specific area detection - prioritize suburb and city_district
          let area = addr.suburb || addr.city_district || addr.neighbourhood || addr.residential || addr.subdistrict || addr.quarter || addr.allotments || addr.commercial || addr.industrial || addr.hamlet;
          
          if (hasGovindaraja || (area && (area.toLowerCase().includes('thimmenahalli') || area.toLowerCase().includes('thimanahalli')))) {
            area = t("govindaraja_nagar");
          }
          
          let city = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state_district || t("unknown_city");
          
          if (city.toLowerCase().includes('bagalkot')) {
            city = t("bagalkot");
          }
          
          // Final fallback to ensure the user's specific request is met if we are in Bengaluru
          if (city.toLowerCase().includes('bengaluru') && (!area || area.toLowerCase().includes('thimmenahalli'))) {
            area = t("govindaraja_nagar");
          }
          
          // Ensure we don't show "Bengaluru (Bengaluru)"
          const cleanArea = (area && area.toLowerCase() !== city.toLowerCase()) ? area : null;
          const displayName = cleanArea ? `${city} (${cleanArea})` : city;
          
          console.log("Location detected (Nominatim):", displayName);
          setCityName(displayName);
          setIsIPLocation(isFallback);
        }
      } catch (geoError) {
        console.error("Geo fetch failed:", geoError);
        // Fallback to coordinates if geocoding fails
        setCityName(`${lat.toFixed(2)}, ${lon.toFixed(2)}`);
        setIsIPLocation(isFallback);
      }
    } catch (error) {
      console.error("Error in fetchWeatherData outer block:", error);
    }
  }, [currentLanguage, t]);

  const fetchIPLocation = useCallback(async () => {
    try {
      console.log("Attempting IP-based location fallback...");
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error("IP location service failed");
      const data = await res.json();
      if (data.latitude && data.longitude) {
        console.log("IP Location detected:", data.city, data.latitude, data.longitude);
        lastCoords.current = { lat: data.latitude, lon: data.longitude };
        fetchWeatherData(data.latitude, data.longitude, true);
      }
    } catch (error) {
      console.error("IP fallback failed:", error);
    }
  }, [fetchWeatherData]);

  const refreshLocation = useCallback(() => {
    if ("geolocation" in navigator) {
      console.log("Manual location refresh triggered...");
      
      const timeout = setTimeout(() => {
        console.log("Manual GPS refresh timed out, using IP fallback...");
        fetchIPLocation();
      }, 6000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeout);
          const { latitude, longitude } = position.coords;
          lastCoords.current = { lat: latitude, lon: longitude };
          fetchWeatherData(latitude, longitude);
        },
        (error) => {
          clearTimeout(timeout);
          console.warn("Manual GPS refresh error:", error.message);
          fetchIPLocation();
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      fetchIPLocation();
    }
  }, [fetchWeatherData, fetchIPLocation]);

  const enableLiveLocation = () => {
    if ("geolocation" in navigator) {
      setIsLocationEnabled(true);
      if (user) {
        const path = `users/${user.uid}`;
        const userRef = doc(db, 'users', user.uid);
        updateDoc(userRef, { 'settings.locationEnabled': true }).catch(e => handleFirestoreError(e, OperationType.UPDATE, path, user));
      }
    }
  };

  const disableLiveLocation = () => {
    setIsLocationEnabled(false);
    setCityName(null);
    if (user) {
      const path = `users/${user.uid}`;
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, { 'settings.locationEnabled': false }).catch(e => handleFirestoreError(e, OperationType.UPDATE, path, user));
    }
    lastCoords.current = null;
  };

  useEffect(() => {
    let watchId: number | null = null;
    let intervalId: NodeJS.Timeout | null = null;
    let fallbackTimeout: NodeJS.Timeout | null = null;

    if (isLocationEnabled && "geolocation" in navigator) {
      console.log("Location enabled, starting watch...");
      
      const handlePosition = (position: GeolocationPosition) => {
        if (fallbackTimeout) {
          clearTimeout(fallbackTimeout);
          fallbackTimeout = null;
        }
        const { latitude, longitude } = position.coords;
        
        // Only fetch if coordinates changed significantly (approx 100m) or if it's the first fetch
        const dist = lastCoords.current ? 
          Math.sqrt(Math.pow(latitude - lastCoords.current.lat, 2) + Math.pow(longitude - lastCoords.current.lon, 2)) : 
          1;

        if (dist > 0.001 || !lastCoords.current) {
          lastCoords.current = { lat: latitude, lon: longitude };
          fetchWeatherData(latitude, longitude);
        }
      };

      const handleError = (error: GeolocationPositionError) => {
        console.warn("Geolocation error:", error.message);
        // On error, try IP fallback immediately
        fetchIPLocation();
      };

      // Set a timeout for GPS. If it doesn't respond in 8 seconds, use IP fallback.
      fallbackTimeout = setTimeout(() => {
        if (!lastCoords.current) {
          console.log("GPS timed out, using IP fallback...");
          fetchIPLocation();
        }
      }, 8000);

      // Immediate fetch
      navigator.geolocation.getCurrentPosition(
        handlePosition,
        handleError,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      // Watch
      watchId = navigator.geolocation.watchPosition(
        handlePosition,
        handleError,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      // Still keep a slow interval for weather updates even if stationary
      intervalId = setInterval(() => {
        if (lastCoords.current) {
          fetchWeatherData(lastCoords.current.lat, lastCoords.current.lon);
        }
      }, 15 * 60 * 1000); // 15 minutes for weather
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (fallbackTimeout) {
        clearTimeout(fallbackTimeout);
      }
    };
  }, [isLocationEnabled, fetchWeatherData, fetchIPLocation]);

  const reportInfection = async (report: any) => {
    if (!user) return;
    const path = 'reports';
    try {
      console.log("Reporting infection to community...", report);
      const reportsRef = collection(db, 'reports');
      const newReport = {
        ...report,
        userId: user.uid,
        userName: userData?.displayName || user.displayName || 'Gardener',
        timestamp: Date.now(),
        location: cityName || 'Nearby'
      };
      
      // Validate report data against firestore rules expectations
      if (!newReport.plantName || !newReport.status || !newReport.description) {
        throw new Error("Missing required fields for community report");
      }

      await addDoc(reportsRef, newReport);
      console.log("Report successfully added to Firestore.");
      
      await addToHistory({
        type: 'analysis',
        title: 'Community Alert Sent',
        details: `Reported ${report.status} for ${report.plantName} to the community.`
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, user);
    }
  };

  // Re-fetch weather when language changes to update cityName translation
  useEffect(() => {
    if (isLocationEnabled && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        fetchWeatherData(position.coords.latitude, position.coords.longitude);
      });
    }
  }, [currentLanguage]);

  const submitFeedback = async (analysisId: string, worked: boolean) => {
    if (!user) return;
    try {
      const feedbackRef = collection(db, 'users', user.uid, 'feedback');
      await addDoc(feedbackRef, {
        analysisId,
        worked,
        timestamp: Date.now()
      });
      
      // Simulate learning by adding a history item
      await addToHistory({
        type: 'analysis',
        title: 'Treatment Feedback',
        details: `You reported that the suggested treatment ${worked ? 'worked' : 'did not work'}. AI will adjust future advice.`
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  };

  useEffect(() => {
    // Calculate Health Score
    const calculateHealth = () => {
      let score = 100;
      let explanation = 'Your plants are thriving in current conditions.';
      
      // Moisture impact
      if (sensors.moisture < 30) {
        score -= 20;
        explanation = 'Soil is too dry. Plants need immediate watering.';
      } else if (sensors.moisture < 50) {
        score -= 10;
        explanation = 'Soil moisture is slightly low.';
      }
      
      // Temp impact
      if (sensors.temp > 35) {
        score -= 15;
        explanation = 'Extreme heat detected. Provide shade.';
      } else if (sensors.temp < 15) {
        score -= 10;
        explanation = 'Temperature is lower than optimal.';
      }
      
      // Light impact
      if (sensors.light < 20 && sensors.condition !== 'Clear' && sensors.condition !== 'Cloudy') {
        score -= 10;
        explanation = 'Insufficient light for photosynthesis.';
      }
      
      setHealthScore(Math.max(0, score));
      
      if (score >= 80) setHealthStatus({ label: 'Excellent', color: 'text-emerald-500', explanation });
      else if (score >= 60) setHealthStatus({ label: 'Good', color: 'text-emerald-600', explanation });
      else if (score >= 40) setHealthStatus({ label: 'Fair', color: 'text-amber-500', explanation });
      else setHealthStatus({ label: 'Critical', color: 'text-red-500', explanation });
    };

    // Generate Smart Summary
    const generateSummary = () => {
      const summary = {
        watering: sensors.moisture < 40 ? 'Needs Water' : 'Optimal',
        sunlight: sensors.light > 60 ? 'Excellent' : 'Moderate',
        actions: [] as string[]
      };

      if (sensors.moisture < 40) summary.actions.push('Water plants within 2 hours');
      if (sensors.temp > 32) summary.actions.push('Provide temporary shade');
      if (summary.actions.length === 0) summary.actions.push('Maintain current care routine');

      setSmartSummary(summary);
    };

    calculateHealth();
    generateSummary();
  }, [sensors, reports, cityName]);

  // Listen for auth state and data
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribePlants: (() => void) | null = null;
    let unsubscribePosts: (() => void) | null = null;
    let unsubscribeExpenses: (() => void) | null = null;
    let unsubscribeHistory: (() => void) | null = null;
    let unsubscribeReports: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        setIsAuthReady(true);
        
        if (user) {
          // Listen for user data
          const userDocRef = doc(db, 'users', user.uid);
          unsubscribeUser = onSnapshot(userDocRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              setUserData(data);
              if (data.settings?.language) {
                setCurrentLanguage(data.settings.language);
              }
              if (data.lastWatered) setLastWatered(data.lastWatered);
              if (data.settings?.locationEnabled && !isLocationEnabled) {
                enableLiveLocation();
              }
            } else {
              // Initial setup if doc doesn't exist
              const initialData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'Gardener',
                settings: { darkMode: false, notifications: true, locationEnabled: false, language: 'en' }
              };
              setDoc(userDocRef, initialData).then(() => {
                setUserData(initialData);
              }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`, user));
            }
          }, (error) => {
            console.error("User Data Snapshot Error:", error);
          });

          // Listen for user plants
          const plantsQuery = query(collection(db, 'users', user.uid, 'plants'));
          unsubscribePlants = onSnapshot(plantsQuery, (snapshot) => {
            const plantsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            setPlants(plantsData);
          }, (error) => {
            console.error("Plants Snapshot Error:", error);
          });

          // Listen for community posts
          const postsQuery = query(collection(db, 'community_posts'));
          unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            postsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setPosts(postsData);
          }, (error) => {
            console.error("Posts Snapshot Error:", error);
          });

          // Listen for user expenses
          const expensesQuery = query(collection(db, 'users', user.uid, 'expenses'));
          unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
            const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            expensesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setExpenses(expensesData);
          }, (error) => {
            console.error("Expenses Snapshot Error:", error);
          });

          // Listen for user history
          const historyQuery = query(collection(db, 'users', user.uid, 'history'));
          unsubscribeHistory = onSnapshot(historyQuery, (snapshot) => {
            const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            historyData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setHistory(historyData);
          }, (error) => {
            console.error("History Snapshot Error:", error);
          });

          // Listen for community reports
          const reportsRef = collection(db, 'reports');
          const reportsQuery = query(reportsRef, orderBy('timestamp', 'desc'), limit(20));
          unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
            const reportsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setReports(reportsData);
          }, (error) => {
            console.error("Reports Snapshot Error:", error);
          });
        } else {
          setUserData(null);
          setPlants([]);
          setPosts([]);
          setExpenses([]);
          setHistory([]);
          setReports([]);
          if (unsubscribeUser) unsubscribeUser();
          if (unsubscribePlants) unsubscribePlants();
          if (unsubscribePosts) unsubscribePosts();
          if (unsubscribeExpenses) unsubscribeExpenses();
          if (unsubscribeHistory) unsubscribeHistory();
          if (unsubscribeReports) unsubscribeReports();
        }
      } catch (error) {
        console.error("Auth state change error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribePlants) unsubscribePlants();
      if (unsubscribePosts) unsubscribePosts();
      if (unsubscribeExpenses) unsubscribeExpenses();
      if (unsubscribeHistory) unsubscribeHistory();
      if (unsubscribeReports) unsubscribeReports();
    };
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceWatering = (Date.now() - lastWatered) / (1000 * 60 * 60); // hours
      
      // Moisture decay logic: 
      // - Base decay of 1.5% per hour
      // - Temperature increases decay (above 25C)
      // - Humidity decreases decay (above 60%)
      const tempFactor = Math.max(0, (sensors.temp - 25) * 0.2);
      const humidityFactor = Math.max(0, (sensors.humidity - 60) * 0.1);
      const hourlyDecay = Math.max(0.5, 1.5 + tempFactor - humidityFactor);
      
      // Use a more stable calculation
      const baseMoisture = 100 - (timeSinceWatering * hourlyDecay);
      const calculatedMoisture = Math.max(5, Math.min(100, baseMoisture));
      
      // Small noise for realism, but very minimal to avoid confusion
      const noise = (Math.random() - 0.5) * 0.1;
      
      setSensors(prev => {
        const next = {
          ...prev,
          moisture: calculatedMoisture + noise,
          temp: prev.temp + (Math.random() - 0.5) * 0.05,
          humidity: Math.max(20, Math.min(95, prev.humidity + (Math.random() - 0.5) * 0.1)),
          light: Math.max(0, Math.min(100, prev.light + (Math.random() - 0.5) * 0.2))
        };
        localStorage.setItem('sensors', JSON.stringify(next));
        return next;
      });
    }, 5000); // Update every 5 seconds for stability
    return () => clearInterval(interval);
  }, [lastWatered, sensors.temp, sensors.humidity]);

  // Climate Notifications
  const lastConditionRef = useRef(sensors.condition);
  useEffect(() => {
    if (sensors.condition !== lastConditionRef.current) {
      const condition = sensors.condition.toLowerCase();
      let title = '';
      let body = '';

      if (condition.includes('rain')) {
        title = t('notif_rain_title');
        body = t('notif_rain_body');
      } else if ((condition.includes('sun') || condition.includes('clear')) && sensors.isDay) {
        title = t('notif_sun_title');
        body = t('notif_sun_body');
      } else if (condition.includes('thunder')) {
        title = t('notif_storm_title');
        body = t('notif_storm_body');
      }

      if (title && userData?.settings?.notifications) {
        // Add to in-app notifications
        addInAppNotification(title, body);

        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(title, { body, icon: 'https://iili.io/qD8Qbig.png' });
          } catch (e) {
            console.warn("Browser notification failed:", e);
          }
        } else {
          console.log(`[Notification Simulation] ${title}: ${body}`);
        }
      }
      lastConditionRef.current = sensors.condition;
    }
  }, [sensors.condition, userData?.settings?.notifications]);

  useEffect(() => {
    setAllPlants(PLANT_DATABASE);

    // Add a welcome notification if it's the first time
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcomeNotif');
    if (!hasSeenWelcome && user) {
      addInAppNotification(
        t('welcome_notif_title'),
        t('welcome_notif_body')
      );
      localStorage.setItem('hasSeenWelcomeNotif', 'true');
    }

    const currentSuggestions = PLANT_DATABASE.filter(plant => {
      const tempMatch = sensors.temp >= plant.minTemp - 2 && sensors.temp <= plant.maxTemp + 2;
      const humidityMatch = sensors.humidity >= plant.minHumidity - 10;
      const lightLevel = sensors.light > 60 ? 'high' : sensors.light > 20 ? 'medium' : 'low';
      
      // Flexible light matching
      let lightMatch = false;
      if (plant.light === 'low') lightMatch = true; // Low light plants can usually handle more
      else if (plant.light === 'medium') lightMatch = lightLevel !== 'low';
      else if (plant.light === 'high') lightMatch = lightLevel === 'high';
      
      return tempMatch && humidityMatch && lightMatch;
    }).slice(0, 3); // Limit to top 3

    setSuggestions(currentSuggestions);
  }, [sensors]);

  const addPost = async (postData: any) => {
    if (!user) return;
    const path = 'community_posts';
    try {
      const postRef = doc(collection(db, path));
      const post = {
        ...postData,
        id: postRef.id,
        authorId: user.uid,
        authorName: userData?.displayName || 'Gardener',
        createdAt: new Date().toISOString(),
      };
      await setDoc(postRef, post);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, user);
    }
  };

  const deletePost = async (postId: string) => {
    const path = `community_posts/${postId}`;
    try {
      await deleteDoc(doc(db, 'community_posts', postId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path, user);
    }
  };

  const addExpense = async (expenseData: any) => {
    if (!user) return;
    const path = `users/${user.uid}/expenses`;
    try {
      const expenseRef = doc(collection(db, 'users', user.uid, 'expenses'));
      const expense = {
        ...expenseData,
        id: expenseRef.id,
        userId: user.uid,
        date: new Date(expenseData.date).toISOString()
      };
      await setDoc(expenseRef, expense);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, user);
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!user) return;
    const path = `users/${user.uid}/expenses/${expenseId}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'expenses', expenseId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path, user);
    }
  };
  
  const deleteHistoryItem = async (historyId: string) => {
    if (!user) return;
    const path = `users/${user.uid}/history/${historyId}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'history', historyId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path, user);
    }
  };

  const deleteMultipleHistoryItems = async (historyIds: string[]) => {
    if (!user) return;
    const path = `users/${user.uid}/history`;
    try {
      const batch = writeBatch(db);
      historyIds.forEach(id => {
        batch.delete(doc(db, 'users', user.uid, 'history', id));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path, user);
    }
  };

  const deleteMultipleReports = async (reportIds: string[]) => {
    if (!user) return;
    const path = 'reports';
    try {
      const batch = writeBatch(db);
      reportIds.forEach(id => {
        batch.delete(doc(db, 'reports', id));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path, user);
    }
  };

  const addToHistory = async (item: { type: 'search' | 'analysis' | 'growth_log' | 'growth_search', title: string, details?: string, image?: string }) => {
    if (!user) return;
    const path = `users/${user.uid}/history`;
    
    let processedImage = item.image;
    
    // Resize image if it's too large for Firestore (1MB limit)
    if (item.image && item.image.length > 500000) { // > 500KB roughly
      try {
        const img = new Image();
        img.src = item.image;
        await new Promise((resolve) => { img.onload = resolve; });
        
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        processedImage = canvas.toDataURL('image/jpeg', 0.7);
      } catch (e) {
        console.warn("Failed to resize image for history:", e);
        processedImage = undefined; // Fallback: don't store image if resize fails
      }
    }

    const historyItem: any = {
      type: item.type,
      title: item.title,
      timestamp: new Date().toISOString(),
    };

    if (item.details) historyItem.details = item.details;
    if (processedImage) historyItem.image = processedImage;

    try {
      const historyRef = doc(collection(db, 'users', user.uid, 'history'));
      historyItem.id = historyRef.id;
      await setDoc(historyRef, historyItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, user);
    }
  };

  const searchPlantAI = async (name: string) => {
    // First, check local database for a match
    const localMatch = PLANT_DATABASE.find(p => p.name.toLowerCase() === name.toLowerCase());
    
    // Only return local match directly if language is English
    if (localMatch && currentLanguage === 'en') {
      return localMatch;
    }

    try {
      // If we have a local match, we can use it as context for translation
      const targetLanguage = getLanguageName(currentLanguage);
      const prompt = localMatch 
        ? `Translate the following gardening details for the plant "${localMatch.name}" into the language: ${targetLanguage}.
           
           Data to translate:
           - Name: ${localMatch.name}
           - Description: ${localMatch.description}
           - Growth Time: ${localMatch.growthTime}
           - Needs: ${localMatch.needs}
           - Suitable Months: ${localMatch.suitableMonths}
           
           Keep numeric values (minTemp: ${localMatch.minTemp}, maxTemp: ${localMatch.maxTemp}, minHumidity: ${localMatch.minHumidity}, light: "${localMatch.light}") as they are.
           Return the data in the specified JSON format.`
        : `You are a botanical database. Provide definitive gardening details for the plant: ${name}. Include exact temperature and humidity ranges. In the description, provide a factual summary of the plant's weather preference and seasonal requirements. State all information as confirmed facts, avoiding any hedging language like "it appears" or "likely". 
          
          IMPORTANT: Return all text fields (name, description, growthTime, needs, suitableMonths) in the language: ${targetLanguage}.
          
          Return the data in a specific JSON format.`;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              minTemp: { type: Type.NUMBER, description: "Minimum temperature in Celsius" },
              maxTemp: { type: Type.NUMBER, description: "Maximum temperature in Celsius" },
              minHumidity: { type: Type.NUMBER, description: "Minimum humidity percentage" },
              light: { type: Type.STRING, enum: ["low", "medium", "high"], description: "Light requirement level" },
              description: { type: Type.STRING, description: "Short description of the plant's weather preference" },
              growthTime: { type: Type.STRING, description: "Estimated time to reach maturity" },
              needs: { type: Type.STRING, description: "Key requirements for healthy growth" },
              suitableMonths: { type: Type.STRING, description: "Best months to plant/grow this in the current location" }
            },
            required: ["name", "minTemp", "maxTemp", "minHumidity", "light", "description", "growthTime", "needs", "suitableMonths"]
          }
        }
      });

      if (response.text) {
        let cleanText = response.text.trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```/, '').replace(/```$/, '').trim();
        }
        return JSON.parse(cleanText);
      }
      throw new Error("Empty response from AI");
    } catch (error: any) {
      console.error("AI Search Error:", error);
      const errorKey = getAIErrorKey(error);
      throw new Error(errorKey);
    }
  };

  return (
    <AppContext.Provider value={{ 
      user, userData, loading, isAuthReady, plants, sensors, 
      waterPlant, clearHistory, updateSettings, suggestions, allPlants, searchPlantAI,
      enableLiveLocation, disableLiveLocation, isLocationEnabled, cityName, isIPLocation, fetchWeatherData,
      refreshLocation, fetchIPLocation,
      posts, expenses, history, addPost, deletePost, addExpense, deleteExpense,
      deleteHistoryItem, deleteMultipleHistoryItems, deleteMultipleReports,
      addToHistory, reports, reportInfection, t, currentLanguage,
      requestNotificationPermission, notificationPermission,
      healthScore, healthStatus, smartSummary, submitFeedback,
      inAppNotifications, addInAppNotification, markNotificationsAsRead, clearNotifications
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
