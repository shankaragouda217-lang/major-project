import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../AppContext';
import { Droplets, Thermometer, Wind, Sun, Plus, Leaf, CloudRain, Cloud, Zap, AlertCircle, MapPin, TrendingUp, Share2, Maximize, Sparkles, Camera, Loader2, Bell, Search, ShoppingBag, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SensorCard = ({ title, value, unit, icon: Icon, status, subtitle }: any) => {
  const { t } = useApp();
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'attention': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={`p-3.5 rounded-3xl border-2 ${getStatusColor()} flex flex-col gap-1.5 transition-all relative overflow-hidden`}
    >
      <div className="flex justify-between items-center">
        <Icon size={20} />
        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/50">{t(status)}</span>
      </div>
      <div>
        <h3 className="text-xs font-medium opacity-80">{title}</h3>
        <div className="flex items-baseline gap-1">
          <AnimatePresence mode="wait">
            <motion.p
              key={value}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="text-xl font-bold"
            >
              {value}
            </motion.p>
          </AnimatePresence>
          <span className="text-xs font-bold opacity-60">{unit}</span>
        </div>
        {subtitle && (
          <p className="text-[9px] font-bold opacity-50 mt-1 uppercase tracking-tighter">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
};

export default function DashboardScreen({ onNavigate, onAskAI }: { onNavigate: (s: any) => void, onAskAI: (q: string) => void }) {
  const { userData, sensors, waterPlant, suggestions, allPlants, searchPlantAI, enableLiveLocation, disableLiveLocation, isLocationEnabled, cityName, expenses, addToHistory, t, reports } = useApp();
  const [forecast, setForecast] = useState<any[]>([]);
  const [dashboardQuery, setDashboardQuery] = useState('');
  const [newPlantName, setNewPlantName] = useState('');
  const [extraSuggestions, setExtraSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [timeSinceWatered, setTimeSinceWatered] = useState<string>('');
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);

  const diseaseAlerts = useMemo(() => {
    const alerts = [];
    
    // High humidity + Moderate temp = Blight Risk
    if (sensors.humidity > 75 && sensors.temp > 15 && sensors.temp < 28) {
      alerts.push({ 
        name: 'Tomato Late Blight', 
        location: '2.4 km away', 
        risk: 'High', 
        color: 'text-red-600', 
        bg: 'bg-red-50',
        description: 'Late blight is a devastating disease that can destroy entire tomato crops in a matter of days.',
        why: 'High humidity (above 75%) and moderate temperatures (15-28°C) currently detected in your area create the perfect environment for spores to spread.',
        prevention: 'Ensure good air circulation, avoid overhead watering, and use resistant varieties.',
        remedy: 'Apply organic fungicides like copper spray or a mixture of baking soda and water.'
      });
    }

    // Warm + Dry = Powdery Mildew
    if (sensors.temp > 25 && sensors.humidity < 50) {
      alerts.push({ 
        name: 'Powdery Mildew', 
        location: '5.1 km away', 
        risk: 'Medium', 
        color: 'text-orange-600', 
        bg: 'bg-orange-50',
        description: 'Powdery mildew appears as white or gray powdery spots on leaves and stems.',
        why: 'Warm days and dry air (humidity below 50%) currently detected favor the growth of these fungal spores.',
        prevention: 'Plant in sunny locations and provide adequate spacing for airflow.',
        remedy: 'Spray a mixture of milk and water (40:60 ratio) or use a sulfur-based organic fungicide.'
      });
    }

    // High temp = Aphid Activity
    if (sensors.temp > 32) {
      alerts.push({ 
        name: 'Aphid Infestation', 
        location: '1.8 km away', 
        risk: 'High', 
        color: 'text-red-600', 
        bg: 'bg-red-50',
        description: 'Aphids are small insects that suck the sap from plants, causing leaves to curl.',
        why: 'High temperatures (above 32°C) currently detected accelerate aphid reproduction cycles.',
        prevention: 'Encourage beneficial insects like ladybugs and avoid over-fertilizing with nitrogen.',
        remedy: 'Blast them off with a strong stream of water or use neem oil spray.'
      });
    }

    // Default if no specific weather triggers
    if (alerts.length === 0) {
      alerts.push({
        name: 'General Pest Watch',
        location: 'Local area',
        risk: 'Low',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        description: 'No specific weather-triggered threats detected.',
        why: 'Your current environmental conditions are stable and not favoring common disease outbreaks.',
        prevention: 'Continue regular monitoring and maintain healthy soil.',
        remedy: 'Keep using organic compost to build plant immunity.'
      });
    }

    return alerts;
  }, [sensors.temp, sensors.humidity]);

  useEffect(() => {
    if (userData?.lastWatered) {
      const updateTime = () => {
        const diff = Date.now() - userData.lastWatered;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        if (hours > 0) setTimeSinceWatered(`${hours}h ${mins % 60}m ago`);
        else setTimeSinceWatered(`${mins}m ago`);
      };
      updateTime();
      const interval = setInterval(updateTime, 60000);
      return () => clearInterval(interval);
    }
  }, [userData?.lastWatered]);

  const handleDashboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dashboardQuery.trim()) {
      addToHistory({ type: 'search', title: `AI Chat: ${dashboardQuery}`, details: dashboardQuery });
      onAskAI(dashboardQuery);
      setDashboardQuery('');
    }
  };

  const handleAddPlantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlantName.trim()) {
      setIsSearching(true);
      setSearchError(null);
      try {
        const plant = await searchPlantAI(newPlantName);
        if (plant) {
          addToHistory({ type: 'search', title: `Plant Search: ${plant.name}`, details: plant.description });
          setExtraSuggestions(prev => [plant, ...prev]);
        }
      } catch (error: any) {
        console.error("Search Error:", error);
        setSearchError(error.message || "Failed to find plant details.");
      } finally {
        setIsSearching(false);
        setNewPlantName('');
      }
    }
  };

  useEffect(() => {
    const getConditionIcon = (condition: string) => {
      if (condition === 'Thunderstorm') return Zap;
      if (condition.includes('Rain')) return CloudRain;
      if (condition === 'Cloudy') return Cloud;
      return Sun;
    };

    // Mock forecast data
    setForecast([
      { day: t('today'), temp: Math.round(sensors.temp), condition: t(sensors.condition.toLowerCase()), icon: getConditionIcon(sensors.condition) },
      { day: t('tomorrow'), temp: Math.round(sensors.temp + 2), condition: t('sunny'), icon: Sun },
      { day: t('day_after'), temp: Math.round(sensors.temp - 1), condition: t('cloudy'), icon: Cloud },
    ]);
  }, [sensors.temp, sensors.condition, t]);

  const getSuitabilityInfo = (plant: any) => {
    const tempMatch = sensors.temp >= plant.minTemp - 2 && sensors.temp <= plant.maxTemp + 2;
    const humidityMatch = sensors.humidity >= plant.minHumidity - 10;
    const lightLevel = sensors.light > 60 ? 'high' : sensors.light > 20 ? 'medium' : 'low';
    
    let lightMatch = false;
    if (plant.light === 'low') lightMatch = true;
    else if (plant.light === 'medium') lightMatch = lightLevel !== 'low';
    else if (plant.light === 'high') lightMatch = lightLevel === 'high';
    
    const isSuitable = tempMatch && humidityMatch && lightMatch;
    
    // Check for long-term seasonal requirements
    const desc = (plant.description || '').toLowerCase();
    const needsText = (plant.needs || '').toLowerCase();
    const isConditional = desc.includes('chill hours') || desc.includes('dormancy') || 
                         needsText.includes('chill hours') || needsText.includes('dormancy');

    let reason = '';
    let tip = '';
    if (!tempMatch) {
      reason = sensors.temp < plant.minTemp ? t('too_cold') : t('too_hot');
      tip = sensors.temp < plant.minTemp ? t('heat_mat_advice') : t('shade_advice');
    } else if (!humidityMatch) {
      reason = t('too_dry');
      tip = t('mist_advice');
    } else if (!lightMatch) {
      reason = t('not_enough_light');
      tip = t('move_sun_advice');
    } else if (isConditional) {
      reason = t('seasonal_needs');
      tip = t('chill_hours_advice');
    }

    return { isSuitable, isConditional, reason, tip };
  };

  const getStatus = (type: string, val: number) => {
    if (type === 'moisture') {
      if (val < 30) return 'attention';
      if (val < 50) return 'moderate';
      return 'good';
    }
    if (type === 'temp') {
      if (val > 35 || val < 18) return 'attention';
      if (val > 30 || val < 22) return 'moderate';
      return 'good';
    }
    if (type === 'humidity') {
      if (val < 40 || val > 80) return 'moderate';
      return 'good';
    }
    if (type === 'light') {
      if (val < 20) return 'attention';
      if (val < 40) return 'moderate';
      return 'good';
    }
    return 'good';
  };

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearchQuery.trim()) {
      const query = globalSearchQuery.toLowerCase();
      // If it's a plant name, maybe they want suitability
      const plantMatch = allPlants.find(p => query.includes(p.name.toLowerCase()));
      if (plantMatch) {
        setNewPlantName(plantMatch.name);
        handleAddPlantSubmit(e);
        setIsSearchModalOpen(false);
        setGlobalSearchQuery('');
        return;
      }
      // Otherwise, just ask AI
      handleDashboardSubmit(e);
      setIsSearchModalOpen(false);
      setGlobalSearchQuery('');
    }
  };

  const calculateEfficiency = () => {
    let score = 0;
    const statuses = [
      getStatus('moisture', sensors.moisture),
      getStatus('temp', sensors.temp),
      getStatus('humidity', sensors.humidity),
      getStatus('light', sensors.light)
    ];

    statuses.forEach(s => {
      if (s === 'good') score += 25;
      else if (s === 'moderate') score += 15;
      else if (s === 'attention') score += 5;
    });

    return score;
  };

  const efficiencyScore = calculateEfficiency();

  return (
    <div className="p-5 pb-24">
      {/* Header Section */}
      <header className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-bold text-emerald-950 tracking-tight">{t('hello')}, {userData?.displayName}!</h1>
          <p className="text-xs text-zinc-500 font-medium">{t('garden_doing_great')}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsSearchModalOpen(true)}
            className="w-9 h-9 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <Search size={18} />
          </button>
          <button className="w-9 h-9 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-colors relative">
            <Bell size={18} />
            {userData?.settings?.notifications && (
              <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-500 rounded-full border-2 border-white" />
            )}
          </button>
          <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-emerald-100">
            {userData?.displayName?.[0]}
          </div>
        </div>
      </header>


      {/* Main Search Bar - Prominent at the top */}
      <div className="mb-6">
        <form onSubmit={handleDashboardSubmit} className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-emerald-600 transition-colors">
            <Sparkles size={18} />
          </div>
          <input
            type="text"
            value={dashboardQuery}
            onChange={(e) => setDashboardQuery(e.target.value)}
            placeholder={t('ask_ai')}
            className="w-full bg-white border-2 border-zinc-100 rounded-2xl pl-11 pr-14 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
          />
          <button
            type="submit"
            disabled={!dashboardQuery.trim()}
            className="absolute right-1.5 top-1.5 bottom-1.5 bg-emerald-600 text-white px-3.5 rounded-xl font-bold text-[10px] shadow-md active:scale-95 transition-all disabled:opacity-50"
          >
            {t('ask')}
          </button>
        </form>
      </div>

      {/* Weather & Location Widget */}
      <div className="mb-6">
        <div className="bg-zinc-900 rounded-3xl p-4 text-white relative overflow-hidden shadow-2xl shadow-zinc-200">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <MapPin size={60} />
          </div>
          
          <div className="flex justify-between items-start mb-5 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">{t('live_environment')}</h3>
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
              </div>
              <p className="text-base font-bold">{isLocationEnabled && cityName ? cityName : 'Global Sync'}</p>
            </div>
            <button 
              onClick={() => isLocationEnabled ? disableLiveLocation() : enableLiveLocation()}
              className={`px-2.5 py-1 rounded-lg text-[8px] font-black tracking-widest transition-all ${isLocationEnabled ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {isLocationEnabled ? t('location_on') : t('location_off')}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 relative z-10">
            {forecast.map((f, i) => (
              <div key={i} className="flex flex-col items-center text-center p-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/5">
                <span className="text-[7px] font-bold text-zinc-500 uppercase mb-1.5 tracking-widest">{f.day}</span>
                <f.icon size={20} className={f.condition === 'Rain' ? 'text-blue-400' : 'text-amber-400'} />
                <span className="text-sm font-bold mt-1.5">{f.temp}°C</span>
                <span className="text-[8px] font-medium text-zinc-400 mt-0.5">{f.condition}</span>
              </div>
            ))}
          </div>

          {sensors.temp > 30 && (
            <div className="mt-4 pt-4 border-t border-white/10 flex items-start gap-2.5 text-amber-400 bg-amber-400/5 -mx-4 px-4 pb-1">
              <AlertCircle size={14} className="mt-0.5" />
              <p className="text-[10px] font-bold leading-relaxed">Heatwave warning: Increase watering frequency for your Tomato plants tomorrow.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <SensorCard
          title={t('soil_moisture')}
          value={Math.round(sensors.moisture)}
          unit="%"
          icon={Droplets}
          status={getStatus('moisture', sensors.moisture)}
          subtitle={timeSinceWatered ? `${t('last_watered')}: ${timeSinceWatered}` : t('no_data')}
        />
        <SensorCard
          title={t('temperature')}
          value={Math.round(sensors.temp)}
          unit="°C"
          icon={Thermometer}
          status={getStatus('temp', sensors.temp)}
        />
        <SensorCard
          title={t('humidity')}
          value={Math.round(sensors.humidity)}
          unit="%"
          icon={Wind}
          status={getStatus('humidity', sensors.humidity)}
        />
        <SensorCard
          title={t('light_level')}
          value={Math.round(sensors.light)}
          unit="%"
          icon={Sun}
          status={getStatus('light', sensors.light)}
        />
      </div>

      {/* Disease Alerts Section - Single Icon/Button */}
      <div className="mb-8">
        <button 
          onClick={() => setIsAlertsModalOpen(true)}
          className="w-full bg-white p-5 rounded-[2rem] border-2 border-red-50 shadow-xl shadow-red-100/20 flex items-center justify-between group active:scale-[0.98] transition-all relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertCircle size={60} className="text-red-600" />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-inner">
              <AlertCircle size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-zinc-900">{t('disease_alerts')}</h3>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                {diseaseAlerts.length + reports.length} {t('active_threats')}
              </p>
            </div>
          </div>
          <div className="w-8 h-8 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-400 group-hover:bg-red-500 group-hover:text-white transition-all">
            <ChevronRight size={18} />
          </div>
        </button>
      </div>

      {/* Action Button */}
      <div className="flex justify-center mb-6">
        <button 
          onClick={waterPlant}
          className="group relative bg-white border-2 border-blue-100 text-blue-600 px-6 py-3 rounded-[1.5rem] text-xs font-bold flex items-center gap-3 active:scale-95 transition-all hover:bg-blue-50 hover:border-blue-200 shadow-xl shadow-blue-100/50"
        >
          <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <Droplets size={16} />
          </div>
          {t('watered_plant')}
        </button>
      </div>

      {/* Plant Search & Suggestions */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-emerald-950">{t('plant_suitability')}</h2>
          <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 rounded-full">
            <Leaf size={12} className="text-emerald-600" />
            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">
              {Math.min(3, suggestions.length + extraSuggestions.length)} {t('analysis')}
            </span>
          </div>
        </div>

        <form onSubmit={handleAddPlantSubmit} className="mb-6 relative">
          <input
            type="text"
            value={newPlantName}
            onChange={(e) => {
              setNewPlantName(e.target.value);
              if (searchError) setSearchError(null);
            }}
            placeholder={t('search_suitability_placeholder')}
            className={`w-full bg-white border-2 ${searchError ? 'border-red-200' : 'border-zinc-100'} rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm pr-14`}
          />
          <button
            type="submit"
            disabled={!newPlantName.trim() || isSearching}
            className="absolute right-1.5 top-1.5 bottom-1.5 bg-zinc-900 text-white px-3.5 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          </button>
          {searchError && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[9px] text-red-500 font-bold mt-2 ml-3 flex items-center gap-2"
            >
              <AlertCircle size={12} /> {searchError}
            </motion.p>
          )}
        </form>
        
        <div className="space-y-4">
          {(suggestions.length > 0 || extraSuggestions.length > 0) ? (
            [...extraSuggestions, ...suggestions].slice(0, 3).map((plant: any, idx: number) => {
              const { isSuitable, isConditional, reason, tip } = getSuitabilityInfo(plant);
              return (
                <motion.div
                  key={plant.name + idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white p-5 rounded-[1.75rem] border border-zinc-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4 mb-5">
                    <div className={`w-12 h-12 shrink-0 ${
                      isSuitable && !isConditional ? 'bg-emerald-50 text-emerald-600' : 
                      isConditional ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                    } rounded-3xl flex items-center justify-center shadow-inner`}>
                      <Leaf size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-base font-bold text-zinc-900">{plant.name}</h3>
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-xl uppercase tracking-widest ${
                          isSuitable && !isConditional ? 'bg-emerald-100 text-emerald-700' : 
                          isConditional ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isSuitable && !isConditional ? t('suitable') : 
                           isConditional ? t('conditional') : t('needs_care')}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 font-medium leading-relaxed">{plant.description}</p>
                    </div>
                  </div>

                  {(isConditional || !isSuitable) && (
                    <div className={`${isConditional ? 'bg-blue-50/50 border-blue-100' : 'bg-amber-50/50 border-amber-100'} border p-3.5 rounded-3xl flex items-start gap-3.5 mb-5`}>
                      <div className={`w-8 h-8 shrink-0 ${isConditional ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'} rounded-2xl flex items-center justify-center`}>
                        {isConditional ? <Sparkles size={16} /> : <AlertCircle size={16} />}
                      </div>
                      <div>
                        <h5 className={`text-[10px] font-black ${isConditional ? 'text-blue-800' : 'text-amber-800'} uppercase tracking-widest mb-1`}>
                          {isConditional ? t('seasonal_advice') : t('care_strategy')}
                        </h5>
                        <p className={`text-xs font-medium ${isConditional ? 'text-blue-700' : 'text-amber-700'} leading-relaxed`}>{tip}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-50">
                    <div>
                      <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('growth_cycle')}</h4>
                      <p className="text-xs font-bold text-zinc-800">{plant.growthTime}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('best_months')}</h4>
                      <p className="text-xs font-bold text-zinc-800">{plant.suitableMonths}</p>
                    </div>
                    <div className="col-span-2">
                      <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('key_requirements')}</h4>
                      <p className="text-xs font-medium text-zinc-600 leading-relaxed italic">"{plant.needs}"</p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 p-10 rounded-[2.5rem] text-center">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-zinc-300 mx-auto mb-4 shadow-sm">
                <Leaf size={32} />
              </div>
              <p className="text-sm text-zinc-500 font-medium px-6">
                {t('search_suitability_empty')}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ROI Summary Card */}
      <motion.div 
        whileHover={{ scale: 1.01 }}
        onClick={() => onNavigate('tracker')}
        className="bg-emerald-950 rounded-3xl p-6 text-white cursor-pointer relative overflow-hidden shadow-2xl shadow-emerald-900/20 mb-8"
      >
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <TrendingUp size={70} />
        </div>
        <div className="relative z-10">
          <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-4">{t('financial_performance')}</h3>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest mb-1">{t('total_investment')}</p>
              <p className="text-2xl font-black">
                ₹{expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest mb-1">{t('projected_savings')}</p>
              <p className="text-2xl font-black text-emerald-400">
                +₹{(expenses.reduce((sum, e) => sum + e.amount, 0) * 1.5).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">{t('efficiency_score')}</span>
            <span className="text-xs font-black text-emerald-400">{efficiencyScore}%</span>
          </div>
        </div>
      </motion.div>

      {/* Global Search Modal */}
      <AnimatePresence>
        {isAlertsModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-zinc-950/60 backdrop-blur-md flex items-end justify-center"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md h-[80vh] rounded-t-[40px] p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                    <AlertCircle size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900">{t('disease_alerts')}</h3>
                </div>
                <button onClick={() => setIsAlertsModalOpen(false)} className="p-2 bg-zinc-100 rounded-full text-zinc-500">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pb-8">
                {diseaseAlerts.map((alert, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setSelectedAlert(alert)}
                    className="w-full bg-zinc-50 p-5 rounded-3xl border border-zinc-100 flex items-center justify-between group active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${alert.bg} rounded-2xl flex items-center justify-center ${alert.color}`}>
                        <AlertCircle size={24} />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-zinc-900">{alert.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium mt-0.5">
                          <MapPin size={12} />
                          <span>{alert.location}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${alert.color}`}>{alert.risk} {t('risk')}</span>
                      <div className="flex items-center gap-1 justify-end mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${alert.color} animate-pulse`} />
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">{t('active')}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert Details Modal */}
      <AnimatePresence>
        {selectedAlert && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-zinc-950/80 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className={`p-8 ${selectedAlert.bg} flex flex-col items-center text-center relative`}>
                <button 
                  onClick={() => setSelectedAlert(null)}
                  className="absolute top-6 right-6 p-2 bg-white/50 backdrop-blur-md rounded-full text-zinc-600"
                >
                  <X size={20} />
                </button>
                <div className={`w-20 h-20 ${selectedAlert.bg} border-4 border-white rounded-[2rem] flex items-center justify-center ${selectedAlert.color} shadow-xl mb-4`}>
                  <AlertCircle size={40} />
                </div>
                <h3 className="text-2xl font-black text-zinc-900 mb-1">{selectedAlert.name}</h3>
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-500 uppercase tracking-widest">
                  <MapPin size={14} />
                  <span>{selectedAlert.location}</span>
                </div>
              </div>

              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                <div>
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('details')}</h4>
                  <p className="text-sm text-zinc-600 leading-relaxed">{selectedAlert.description}</p>
                </div>

                <div className="p-5 bg-orange-50 rounded-3xl border border-orange-100">
                  <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">{t('why_happening')}</h4>
                  <p className="text-sm text-orange-900 leading-relaxed font-medium">{selectedAlert.why}</p>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{t('prevention')}</h4>
                  <p className="text-sm text-zinc-600 leading-relaxed">{selectedAlert.prevention}</p>
                </div>

                <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">{t('organic_remedy')}</h4>
                  <p className="text-sm text-emerald-900 leading-relaxed font-bold italic">"{selectedAlert.remedy}"</p>
                </div>
              </div>

              <div className="p-6 bg-zinc-50 border-t border-zinc-100">
                <button 
                  onClick={() => setSelectedAlert(null)}
                  className="w-full py-4 bg-zinc-900 text-white font-bold rounded-2xl shadow-xl active:scale-95 transition-all"
                >
                  {t('back')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Search Modal */}
      <AnimatePresence>
        {isSearchModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-md flex items-start justify-center p-6 pt-24"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[2.5rem] p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900">Search Garden</h3>
                <button 
                  onClick={() => setIsSearchModalOpen(false)}
                  className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleGlobalSearch} className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input 
                  autoFocus
                  type="text"
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  placeholder="Search plants, products, or ask AI..."
                  className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-3xl pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:border-emerald-500 transition-all"
                />
              </form>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Quick Links</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => { onNavigate('community'); setIsSearchModalOpen(false); }}
                      className="p-4 bg-emerald-50 rounded-3xl flex flex-col gap-2 items-start text-left border border-emerald-100"
                    >
                      <ShoppingBag size={20} className="text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-900">Agri Shop</span>
                    </button>
                    <button 
                      onClick={() => { onNavigate('disease'); setIsSearchModalOpen(false); }}
                      className="p-4 bg-blue-50 rounded-3xl flex flex-col gap-2 items-start text-left border border-blue-100"
                    >
                      <Camera size={20} className="text-blue-600" />
                      <span className="text-xs font-bold text-blue-900">Disease ID</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Popular Plants</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Tomato', 'Mango', 'Coconut', 'Chilli', 'Aloe Vera'].map(p => (
                      <button 
                        key={p}
                        onClick={() => {
                          setNewPlantName(p);
                          handleAddPlantSubmit({ preventDefault: () => {} } as any);
                          setIsSearchModalOpen(false);
                        }}
                        className="px-4 py-2 bg-zinc-100 rounded-2xl text-xs font-bold text-zinc-600 hover:bg-zinc-200 transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
