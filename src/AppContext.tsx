import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, getDocs, onSnapshot, collection, query, orderBy, limit, addDoc, deleteDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './firebase';
import { GoogleGenAI, Type } from "@google/genai";

import { translations } from './translations';

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
    humidity: number;
    light: number;
    condition: string;
    weatherCode: number;
  };
  waterPlant: () => void;
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
  addPost: (post: any) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  addExpense: (expense: any) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  t: (key: string) => string;
  currentLanguage: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const PLANT_DATABASE = [
  { 
    name: 'Curry Leaves', 
    minTemp: 15, maxTemp: 40, minHumidity: 40, light: 'high', 
    description: 'Essential Indian herb, loves warm tropical climates.',
    growthTime: '1-2 years to establish',
    needs: 'Full sun, well-drained soil, and regular pruning.',
    suitableMonths: 'Year-round (best in Summer/Monsoon)'
  },
  { 
    name: 'Chilli', 
    minTemp: 20, maxTemp: 35, minHumidity: 40, light: 'high', 
    description: 'Thrives in the Indian heat, perfect for balconies.',
    growthTime: '60-80 days',
    needs: 'Full sun, moderate watering, and organic compost.',
    suitableMonths: 'Jan-Feb or June-July'
  },
  { 
    name: 'Okra (Bhindi)', 
    minTemp: 22, maxTemp: 40, minHumidity: 50, light: 'high', 
    description: 'Heat-loving vegetable, very productive in Indian summers.',
    growthTime: '50-60 days',
    needs: 'Full sun, deep watering, and space to grow.',
    suitableMonths: 'Feb-April or June-July'
  },
  { 
    name: 'Marigold (Genda)', 
    minTemp: 15, maxTemp: 35, minHumidity: 30, light: 'high', 
    description: 'Traditional Indian flower, great for pest control.',
    growthTime: '45-60 days',
    needs: 'Full sun, well-drained soil, and deadheading.',
    suitableMonths: 'Year-round (best in Winter)'
  },
  { 
    name: 'Brinjal (Baingan)', 
    minTemp: 20, maxTemp: 35, minHumidity: 50, light: 'high', 
    description: 'Versatile vegetable, loves the tropical sun.',
    growthTime: '70-90 days',
    needs: 'Full sun, consistent moisture, and staking.',
    suitableMonths: 'Jan-Feb or June-July'
  },
  { 
    name: 'Papaya', 
    minTemp: 20, maxTemp: 35, minHumidity: 50, light: 'high', 
    description: 'Tropical fruit that loves heat and humidity.',
    growthTime: '6-9 months to fruit',
    needs: 'Full sun, well-draining soil, and regular watering.',
    suitableMonths: 'Year-round in tropics'
  },
  { 
    name: 'Tomato', 
    minTemp: 18, maxTemp: 32, minHumidity: 40, light: 'high', 
    description: 'Thrives in warm, sunny weather.',
    growthTime: '60-80 days',
    needs: 'Full sun (6-8 hours), consistent watering, and nutrient-rich soil.',
    suitableMonths: 'Oct-Nov or Feb-March'
  },
  { 
    name: 'Tulsi (Holy Basil)', 
    minTemp: 15, maxTemp: 40, minHumidity: 30, light: 'high', 
    description: 'Sacred Indian plant with medicinal properties.',
    growthTime: '40-60 days',
    needs: 'Bright light, regular watering, and pinching tips.',
    suitableMonths: 'Year-round'
  },
  { 
    name: 'Spinach (Palak)', 
    minTemp: 10, maxTemp: 30, minHumidity: 40, light: 'medium', 
    description: 'Nutritious leafy green, grows fast in Indian winters.',
    growthTime: '35-50 days',
    needs: 'Partial shade in summer, nitrogen-rich soil, and consistent moisture.',
    suitableMonths: 'Sept-Oct or Feb-March'
  },
  { 
    name: 'Aloe Vera', 
    minTemp: 13, maxTemp: 45, minHumidity: 10, light: 'high', 
    description: 'Medicinal plant that thrives in dry Indian air.',
    growthTime: '3-4 years to maturity',
    needs: 'Bright indirect light, infrequent deep watering, and well-draining soil.',
    suitableMonths: 'Year-round'
  },
  { 
    name: 'Money Plant', 
    minTemp: 15, maxTemp: 35, minHumidity: 40, light: 'low', 
    description: 'Popular Indian indoor plant, very easy to grow.',
    growthTime: 'Fast growing',
    needs: 'Indirect light, can grow in water or soil.',
    suitableMonths: 'Year-round'
  }
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [plants, setPlants] = useState<any[]>([]);
  const [sensors, setSensors] = useState({
    moisture: 75,
    temp: 24,
    humidity: 60,
    light: 80,
    condition: 'Sunny',
    weatherCode: 0
  });
  const [lastWatered, setLastWatered] = useState<number>(() => {
    // Try to get from local storage as a fallback for faster initial load
    const saved = localStorage.getItem('lastWatered');
    return saved ? parseInt(saved) : Date.now() - (1000 * 60 * 60 * 4); // Default to 4 hours ago
  });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [allPlants, setAllPlants] = useState<any[]>([]);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [cityName, setCityName] = useState<string | null>(null);
  const [weatherIntervalId, setWeatherIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const t = (key: string) => {
    return translations[currentLanguage]?.[key] || translations['en']?.[key] || key;
  };

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
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        settings: { ...userData?.settings, ...newSettings }
      });
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  // Fetch real weather data
  const fetchWeatherData = async (lat: number, lon: number) => {
    try {
      // Fetch weather
      const weatherPromise = fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,cloud_cover,is_day,weather_code`
      ).then(res => res.json());

      // Fetch city name (Reverse Geocoding using OpenStreetMap Nominatim)
      const geoPromise = fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`
      ).then(res => res.json());

      const [weatherData, geoData] = await Promise.all([weatherPromise, geoPromise]);
      
      if (weatherData.current) {
        const code = weatherData.current.weather_code;
        let condition = 'Sunny';
        if (code >= 95) condition = 'Thunderstorm';
        else if (code >= 80) condition = 'Rain Showers';
        else if (code >= 61) condition = 'Rain';
        else if (code >= 51) condition = 'Drizzle';
        else if (code >= 45) condition = 'Foggy';
        else if (code >= 1) condition = 'Cloudy';

        setSensors(prev => ({
          ...prev,
          temp: weatherData.current.temperature_2m,
          humidity: weatherData.current.relative_humidity_2m,
          light: weatherData.current.is_day ? Math.max(10, 100 - weatherData.current.cloud_cover) : 5,
          condition,
          weatherCode: code
        }));
      }

      if (geoData.address) {
        const city = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.suburb || "Unknown City";
        setCityName(city);
      }
    } catch (error) {
      console.error("Error fetching weather or location data:", error);
    }
  };

  const enableLiveLocation = () => {
    if ("geolocation" in navigator) {
      setIsLocationEnabled(true);
      if (user) {
        const path = `users/${user.uid}`;
        const userRef = doc(db, 'users', user.uid);
        updateDoc(userRef, { 'settings.locationEnabled': true }).catch(e => handleFirestoreError(e, OperationType.UPDATE, path, user));
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeatherData(latitude, longitude);
          
          // Refresh weather every 15 minutes
          const interval = setInterval(() => {
            fetchWeatherData(latitude, longitude);
          }, 15 * 60 * 1000);
          
          setWeatherIntervalId(interval);
        },
        (error) => {
          console.warn("Geolocation error:", error.message);
          setIsLocationEnabled(false);
        }
      );
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
    if (weatherIntervalId) {
      clearInterval(weatherIntervalId);
      setWeatherIntervalId(null);
    }
    // Optionally reset sensors to default or keep last known
  };

  const reportInfection = async (report: any) => {
    try {
      const reportsRef = collection(db, 'reports');
      const newReport = {
        ...report,
        userId: user?.uid || 'anonymous',
        userName: user?.displayName || 'A Farmer',
        timestamp: Date.now(),
        location: cityName || 'Nearby'
      };
      await addDoc(reportsRef, newReport);
    } catch (error) {
      console.error("Error reporting infection:", error);
    }
  };

  // Listen for reports
  useEffect(() => {
    const reportsRef = collection(db, 'reports');
    const q = query(reportsRef, orderBy('timestamp', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(reportsData);
    });
    return () => unsubscribe();
  }, []);

  // Listen for user data (history, posts, expenses)
  useEffect(() => {
    if (!user) {
      setHistory([]);
      setPosts([]);
      setExpenses([]);
      return;
    }

    const historyRef = collection(db, 'users', user.uid, 'history');
    const historyQuery = query(historyRef, orderBy('timestamp', 'desc'), limit(50));
    const unsubHistory = onSnapshot(historyQuery, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const postsRef = collection(db, 'users', user.uid, 'posts');
    const postsQuery = query(postsRef, orderBy('timestamp', 'desc'));
    const unsubPosts = onSnapshot(postsQuery, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const expensesRef = collection(db, 'users', user.uid, 'expenses');
    const expensesQuery = query(expensesRef, orderBy('timestamp', 'desc'));
    const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubHistory();
      unsubPosts();
      unsubExpenses();
    };
  }, [user]);
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceWatering = (Date.now() - lastWatered) / (1000 * 60 * 60); // hours
      
      // Decay rate influenced by real temp and humidity
      // Base decay: 3% per hour (increased from 2% for better visibility)
      // Temp factor: +0.8% for every degree above 25C
      // Humidity factor: -0.6% for every 10% above 50%
      const tempFactor = Math.max(0, (sensors.temp - 25) * 0.8);
      const humidityFactor = (sensors.humidity - 50) * 0.06;
      const hourlyDecay = Math.max(0.8, 3 + tempFactor - humidityFactor);
      
      const calculatedMoisture = Math.max(5, 100 - (timeSinceWatering * hourlyDecay));
      
      // Add subtle noise to sensors to make them feel "live"
      const noise = (Math.random() - 0.5) * 0.4;
      
      setSensors(prev => ({
        ...prev,
        moisture: calculatedMoisture + noise,
        temp: prev.temp + ((Math.random() - 0.5) * 0.1),
        humidity: Math.min(100, Math.max(0, prev.humidity + ((Math.random() - 0.5) * 0.2))),
        light: Math.min(100, Math.max(0, prev.light + ((Math.random() - 0.5) * 0.5)))
      }));
    }, 3000); // Faster update (3s)
    return () => clearInterval(interval);
  }, [lastWatered, sensors.temp, sensors.humidity]);

  useEffect(() => {
    setAllPlants(PLANT_DATABASE);

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

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribePlants: (() => void) | null = null;
    let unsubscribePosts: (() => void) | null = null;
    let unsubscribeExpenses: (() => void) | null = null;
    let unsubscribeHistory: (() => void) | null = null;

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
        } else {
          setUserData(null);
          setPlants([]);
          setPosts([]);
          setExpenses([]);
          setHistory([]);
          if (unsubscribeUser) unsubscribeUser();
          if (unsubscribePlants) unsubscribePlants();
          if (unsubscribePosts) unsubscribePosts();
          if (unsubscribeExpenses) unsubscribeExpenses();
          if (unsubscribeHistory) unsubscribeHistory();
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
    };
  }, []);

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
      const deletePromises = historyIds.map(id => deleteDoc(doc(db, 'users', user.uid, 'history', id)));
      await Promise.all(deletePromises);
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
    if (localMatch) {
      return localMatch;
    }

    const keys = [
      { name: 'GEMINI_API_KEY1', val: process.env.GEMINI_API_KEY1 },
      { name: 'GEMINI_API_KEY', val: process.env.GEMINI_API_KEY },
      { name: 'Gemini_API_Key2', val: (process.env as any).Gemini_API_Key2 },
      { name: 'VITE_GEMINI_API_KEY', val: process.env.VITE_GEMINI_API_KEY },
      { name: 'API_KEY', val: process.env.API_KEY },
      { name: 'import.meta.env.VITE_GEMINI_API_KEY', val: (import.meta as any).env?.VITE_GEMINI_API_KEY }
    ];

    const validKeys = keys
      .map(k => String(k.val || '').trim())
      .filter(val => 
        val !== '' && 
        val !== 'undefined' && 
        val !== 'null' && 
        val !== 'YOUR_API_KEY'
      );

    if (validKeys.length === 0) {
      throw new Error("NO_KEYS: Gemini API key is missing or set to a placeholder like 'AI Studio Free Tier'. To fix this: 1. Get a key from ai.google.dev. 2. Open Settings (gear icon) -> Secrets in AI Studio. 3. Add 'GEMINI_API_KEY' with your actual key string. (v3.2)");
    }

    let lastError = null;

    for (const apiKey of validKeys) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `You are a botanical database. Provide definitive gardening details for the plant: ${name}. Include exact temperature and humidity ranges. In the description, provide a factual summary of the plant's weather preference and seasonal requirements. State all information as confirmed facts, avoiding any hedging language like "it appears" or "likely". 
          
          IMPORTANT: Return all text fields (name, description, growthTime, needs, suitableMonths) in the language: ${currentLanguage}.
          
          Return the data in a specific JSON format.`,
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
          const data = JSON.parse(cleanText);
          return data;
        }
      } catch (error: any) {
        console.error(`AI Search Error with key starting with ${apiKey.substring(0, 4)}:`, error);
        lastError = error;
        // Continue to next key
      }
    }

    // If we get here, all keys failed
    const originalMsg = lastError?.message || String(lastError);
    if (originalMsg.includes('API_KEY_INVALID')) {
      throw new Error(`INVALID_KEY: All provided keys are invalid or restricted. (${originalMsg}) - v3.0`);
    } else if (originalMsg.includes('PERMISSION_DENIED')) {
      throw new Error(`PERMISSION_DENIED: Gemini API might not be enabled for these keys. (${originalMsg}) - v3.0`);
    } else if (originalMsg.includes('quota')) {
      throw new Error(`QUOTA_EXCEEDED: AI search limit reached on all keys. (${originalMsg}) - v3.0`);
    }
    throw new Error(`AI_ERROR: ${originalMsg}. Please ensure your GEMINI_API_KEY is correctly set in AI Studio Secrets. - v3.1`);
  };

  return (
    <AppContext.Provider value={{ 
      user, userData, loading, isAuthReady, plants, sensors, 
      waterPlant, clearHistory, updateSettings, suggestions, allPlants, searchPlantAI,
      enableLiveLocation, disableLiveLocation, isLocationEnabled, cityName,
      posts, expenses, history, addPost, deletePost, addExpense, deleteExpense,
      deleteHistoryItem, deleteMultipleHistoryItems,
      addToHistory, reports, reportInfection, t, currentLanguage
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
