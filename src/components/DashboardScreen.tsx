import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../AppContext';
import { Droplets, Thermometer, Wind, Sun, Plus, Leaf, CloudRain, Cloud, Zap, AlertCircle, MapPin, TrendingUp, Share2, Maximize, Sparkles, Camera, Loader2, Bell, Search, ShoppingBag, X, ChevronRight, Moon, CloudSun, CloudFog, CloudLightning, Snowflake, CloudDrizzle, RefreshCw, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SensorCard = ({ title, value, unit, icon: Icon, status, subtitle }: any) => {
  const { t } = useApp();
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'moderate': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'attention': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-zinc-50 text-zinc-900 border-zinc-100';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`p-4 rounded-[2rem] border-2 ${getStatusColor()} flex flex-col gap-1 transition-all relative overflow-hidden shadow-sm hover:shadow-md`}
    >
      <div className="flex justify-between items-center">
        <div className={`p-2 rounded-xl ${getStatusColor()} border-0 shadow-inner`}>
          <Icon size={18} />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{t(status)}</span>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-black text-zinc-600 uppercase tracking-widest mb-0.5">{title}</h3>
        <div className="flex items-baseline gap-0.5">
          <AnimatePresence mode="wait">
            <motion.p
              key={value}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-2xl font-black tracking-tight"
            >
              {value}
            </motion.p>
          </AnimatePresence>
          <span className="text-sm font-black opacity-40">{unit}</span>
        </div>
        {subtitle && (
          <p className="text-[10px] font-bold opacity-50 mt-1 uppercase tracking-tighter line-clamp-1">{subtitle}</p>
        )}
      </div>
      <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
        <Icon size={60} />
      </div>
    </motion.div>
  );
};

export default function DashboardScreen({ onNavigate, onAskAI }: { onNavigate: (s: any) => void, onAskAI: (q: string) => void }) {
  const { 
    userData, sensors, waterPlant, suggestions, allPlants, searchPlantAI, 
    enableLiveLocation, disableLiveLocation, isLocationEnabled, cityName, isIPLocation,
    expenses, addToHistory, t, refreshLocation,
    inAppNotifications, markNotificationsAsRead, clearNotifications
  } = useApp();
  const [forecast, setForecast] = useState<any[]>([]);
  const [dashboardQuery, setDashboardQuery] = useState('');
  const [newPlantName, setNewPlantName] = useState('');
  const [extraSuggestions, setExtraSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [timeSinceWatered, setTimeSinceWatered] = useState<string>('');
  const [showEfficiencyInfo, setShowEfficiencyInfo] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = inAppNotifications.filter(n => !n.read).length;

  useEffect(() => {
    if (userData?.lastWatered) {
      const updateTime = () => {
        const diff = Date.now() - userData.lastWatered;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        if (hours > 0) setTimeSinceWatered(`${hours}${t('hours_short')} ${mins % 60}${t('minutes_short')} ${t('ago')}`);
        else setTimeSinceWatered(`${mins}${t('minutes_short')} ${t('ago')}`);
      };
      updateTime();
      const interval = setInterval(updateTime, 60000);
      return () => clearInterval(interval);
    }
  }, [userData?.lastWatered]);

  const handleDashboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dashboardQuery.trim()) {
      addToHistory({ type: 'search', title: `${t('ai_chat_prefix')}: ${dashboardQuery}`, details: dashboardQuery });
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
          addToHistory({ type: 'search', title: `${t('plant_search_prefix')}: ${plant.name}`, details: plant.description });
          setExtraSuggestions(prev => [plant, ...prev]);
        }
      } catch (error: any) {
        console.error("Search Error:", error);
        const errorMsg = error.message?.startsWith('ai_error_') ? t(error.message) : (error.message || t('unknown_error'));
        setSearchError(errorMsg);
      } finally {
        setIsSearching(false);
        setNewPlantName('');
      }
    }
  };

  useEffect(() => {
    const getConditionIcon = (condition: string) => {
      const cond = condition.toLowerCase();
      if (cond === 'thunderstorm') return CloudLightning;
      if (cond === 'rain showers' || cond === 'rain') return CloudRain;
      if (cond === 'drizzle') return CloudDrizzle;
      if (cond === 'foggy') return CloudFog;
      if (cond === 'snowy') return Snowflake;
      if (cond === 'cloudy') return Cloud;
      if (cond === 'partly cloudy') return CloudSun;
      if (cond === 'clear') return Moon;
      if (cond === 'sunny') return Sun;
      return Sun;
    };

    // Mock forecast data
    setForecast([
      { day: t('today'), temp: Math.round(sensors.temp), condition: t(sensors.condition.toLowerCase().replace(/\s+/g, '_')), icon: getConditionIcon(sensors.condition) },
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
    
    // Balcony suitability check
    const unsuitableForBalcony = ['coconut', 'mango', 'banyan', 'peepal', 'teak', 'mahogany', 'jackfruit', 'tamarind', 'neem'];
    const isBalconySuitable = !unsuitableForBalcony.some(p => plant.name.toLowerCase().includes(p));

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

    return { isSuitable, isConditional, isBalconySuitable, reason, tip };
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
      addToHistory({ type: 'search', title: `${t('ai_chat_prefix')}: ${globalSearchQuery}`, details: globalSearchQuery });
      onAskAI(globalSearchQuery);
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

  const handleRefreshWeather = () => {
    refreshLocation();
  };

  return (
    <div className="min-h-screen px-4 pt-6 pb-32 text-zinc-900 dark:text-zinc-900">
      {/* Header Section */}
      <header className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md border border-emerald-100 overflow-hidden">
            <img
              src="https://iili.io/qD8Qbig.png"
              alt="Logo"
              className="w-12 h-12 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-emerald-950 tracking-tight leading-tight">{t('hello')}, {userData?.displayName}!</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setShowNotifications(true);
              markNotificationsAsRead();
            }}
            className="w-10 h-10 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-zinc-800 hover:bg-zinc-50 transition-colors relative shadow-sm"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </button>
          <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-emerald-100">
            {userData?.displayName?.[0]}
          </div>
        </div>
      </header>


      {/* Weather & Location Widget */}
      {/* Weather & Location Widget */}
<div className="mb-4">
  <div className="bg-zinc-900 rounded-[1.75rem] p-4 text-white relative overflow-hidden shadow-xl shadow-zinc-200">
    
    <div className="absolute top-0 right-0 p-4 opacity-10">
      <MapPin size={50} />
    </div>

    <div className="flex justify-between items-start mb-2 relative z-10">
      <div className="flex-1">
        <div className="flex items-center gap-1 mb-0.5">
          <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">
            {t('live_environment')}
          </h3>
        </div>

        <p className="text-base font-black tracking-tight truncate pr-4 text-white flex items-center gap-2">
          {isLocationEnabled ? (
            cityName ? (
              <>
                {cityName}
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full uppercase font-black tracking-tighter border animate-pulse ${
                  isIPLocation 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}>
                  {isIPLocation ? t('ip_label') : t('gps_label')}
                </span>
              </>
            ) : (
              <span className="text-zinc-400 animate-pulse">{t('detecting_location')}</span>
            )
          ) : t('global_sync')}
        </p>

        
      </div>

      <div className="flex flex-col items-end gap-1">
        <button 
          onClick={() => isLocationEnabled ? disableLiveLocation() : enableLiveLocation()}
          className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-widest transition-all shadow-lg ${
            isLocationEnabled 
              ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {isLocationEnabled ? t('location_on') : t('location_off')}
        </button>

        {isLocationEnabled && (
          <button 
            onClick={handleRefreshWeather}
            className="p-1 bg-white/10 rounded-md text-zinc-300 hover:text-white transition-colors border border-white/10"
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>
    </div>

    {/* FORECAST */}
    <div className="grid grid-cols-3 gap-2 relative z-10 mb-2">
      {forecast.map((f, i) => (
        <div 
          key={i} 
          className={`flex flex-col items-center text-center p-2 rounded-xl backdrop-blur-md border transition-all ${
            i === 0 
              ? 'bg-white/15 border-white/30 shadow-xl' 
              : 'bg-white/10 border-white/20 opacity-90'
          }`}
        >
          <span className="text-[10px] font-black text-zinc-300 uppercase mb-0.5 tracking-widest">
            {f.day}
          </span>

          <f.icon size={16} className="text-amber-400" />

          <span className="text-sm font-black mt-0.5 text-white">
            {f.temp}°C
          </span>

          <span className="text-[10px] font-bold text-zinc-400 mt-0.5 uppercase tracking-tighter">
            {f.condition}
          </span>
        </div>
      ))}
    </div>

    {sensors.temp > 30 && (
      <div className="mt-2 p-2 bg-amber-400/10 border border-amber-400/20 rounded-lg flex items-start gap-2 text-amber-400">
        <AlertCircle size={12} className="mt-0.5 shrink-0" />
        <p className="text-xs font-bold leading-relaxed">
          {t('heatwave_alert')}
        </p>
      </div>
    )}
  </div>
</div>

      <div className="grid grid-cols-2 gap-3 mb-4">
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

      {/* Action Button - Moved here */}
      <div className="flex justify-center mb-4">
        <button 
          onClick={waterPlant}
          className="group relative bg-white border-2 border-blue-100 text-blue-600 px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 active:scale-95 transition-all hover:bg-blue-50 hover:border-blue-200 shadow-lg shadow-blue-100/50"
        >
          <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <Droplets size={14} />
          </div>
          {t('watered_plant')}
        </button>
      </div>

      {/* Plant Search & Suggestions */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-emerald-950">{t('plant_suitability')}</h2>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-full">
            <Leaf size={10} className="text-emerald-600" />
            <span className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">
              {Math.min(3, suggestions.length + extraSuggestions.length)} {t('analysis')}
            </span>
          </div>
        </div>

        <form onSubmit={handleAddPlantSubmit} className="mb-4 relative">
          <input
            type="text"
            value={newPlantName}
            onChange={(e) => {
              setNewPlantName(e.target.value);
              if (searchError) setSearchError(null);
            }}
            placeholder={t('search_suitability_placeholder')}
            className={`w-full bg-white border-2 ${searchError ? 'border-red-200' : 'border-zinc-100'} rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-900 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm pr-12`}
          />
          <button
            type="submit"
            disabled={!newPlantName.trim() || isSearching}
            className="absolute right-1 top-1 bottom-1 bg-zinc-900 text-white px-3 rounded-lg shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          </button>
          {searchError && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] text-red-500 font-bold mt-1 ml-2 flex items-center gap-1.5"
            >
              <AlertCircle size={10} /> {searchError}
            </motion.p>
          )}
        </form>
        
        <div className="space-y-3">
          {(suggestions.length > 0 || extraSuggestions.length > 0 || allPlants.length > 0) ? (
            [...extraSuggestions, ...(suggestions.length > 0 ? suggestions : allPlants.slice(0, 2))].slice(0, 3).map((plant: any, idx: number) => {
              const { isSuitable, isConditional, isBalconySuitable, reason, tip } = getSuitabilityInfo(plant);
              return (
                <motion.div
                  key={plant.name + idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 shrink-0 ${
                      isSuitable && !isConditional && isBalconySuitable ? 'bg-emerald-50 text-emerald-600' : 
                      (!isBalconySuitable || !isSuitable) ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                    } rounded-2xl flex items-center justify-center shadow-inner`}>
                      <Leaf size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="text-base font-bold text-zinc-900">
                          {t(plant.name)}
                        </h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest ${
                          isSuitable && !isConditional && isBalconySuitable ? 'bg-emerald-100 text-emerald-700' : 
                          (!isBalconySuitable || !isSuitable) ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {isSuitable && !isConditional && isBalconySuitable ? t('suitable') : 
                           !isBalconySuitable ? t('not_for_balcony') :
                           isConditional ? t('conditional') : t('needs_care')}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-900 font-medium leading-relaxed">
                        {t(plant.description)}
                      </p>
                    </div>
                  </div>

                  {!isBalconySuitable && (
                    <div className="bg-red-50 border border-red-100 p-3 rounded-2xl flex items-start gap-3 mb-4">
                      <div className="w-7 h-7 shrink-0 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                        <AlertCircle size={14} />
                      </div>
                      <div>
                        <h5 className="text-[10px] font-black text-red-950 uppercase tracking-widest mb-0.5">
                          {t('balcony_warning')}
                        </h5>
                        <p className="text-sm font-medium text-red-900 leading-relaxed">
                          {t('balcony_warning_desc')}
                        </p>
                      </div>
                    </div>
                  )}

                  {(isConditional || (!isSuitable && isBalconySuitable)) && (
                    <div className={`${isConditional ? 'bg-blue-50/50 border-blue-100' : 'bg-amber-50/50 border-amber-100'} border p-3 rounded-2xl flex items-start gap-3 mb-4`}>
                      <div className={`w-7 h-7 shrink-0 ${isConditional ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'} rounded-xl flex items-center justify-center`}>
                        {isConditional ? <Sparkles size={14} /> : <AlertCircle size={14} />}
                      </div>
                      <div>
                        <h5 className={`text-[10px] font-black ${isConditional ? 'text-blue-950' : 'text-amber-950'} uppercase tracking-widest mb-0.5`}>
                          {isConditional ? t('seasonal_advice') : t('care_strategy')}
                        </h5>
                        <p className={`text-sm font-medium ${isConditional ? 'text-blue-900' : 'text-amber-900'} leading-relaxed`}>{tip}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-50">
                    <div>
                      <h4 className="text-sm font-black text-zinc-800 uppercase tracking-widest mb-0.5">{t('growth_cycle')}</h4>
                      <p className="text-base font-bold text-zinc-800">
                        {t(plant.growthTime)}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-zinc-800 uppercase tracking-widest mb-0.5">{t('best_months')}</h4>
                      <p className="text-base font-bold text-zinc-800">
                        {t(plant.suitableMonths)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <h4 className="text-sm font-black text-zinc-800 uppercase tracking-widest mb-0.5">{t('key_requirements')}</h4>
                      <p className="text-sm font-medium text-zinc-800 leading-relaxed italic">
                        "{t(plant.needs)}"
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 p-8 rounded-2xl text-center">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-zinc-500 mx-auto mb-3 shadow-sm">
                <Leaf size={24} />
              </div>
              <p className="text-sm text-zinc-900 font-medium px-6">
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
        className="bg-emerald-950 rounded-[1.75rem] p-5 text-white cursor-pointer relative overflow-hidden shadow-xl shadow-emerald-900/40 mb-6 group"
      >
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
          <TrendingUp size={80} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">{t('expenses_tracker')}</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-6 mb-3">
            <div>
              <p className="text-[10px] font-bold text-emerald-300/80 uppercase tracking-widest mb-1">{t('total_spent')}</p>
              <p className="text-3xl font-black tracking-tight">
                ₹{expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating AI Button */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onAskAI('')}
        className="fixed bottom-24 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-900/40 z-40 border-4 border-white"
      >
        <Sparkles size={24} />
      </motion.button>

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
                <h3 className="text-xl font-bold text-zinc-900">{t('search_garden')}</h3>
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
                  placeholder={t('search_placeholder')}
                  className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-3xl pl-12 pr-4 py-4 text-sm font-medium text-zinc-900 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </form>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">{t('quick_links')}</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => { onNavigate('disease'); setIsSearchModalOpen(false); }}
                      className="p-4 bg-blue-50 rounded-3xl flex flex-col gap-2 items-start text-left border border-blue-100 w-full"
                    >
                      <Camera size={20} className="text-blue-600" />
                      <span className="text-xs font-bold text-blue-900">{t('disease_id')}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">{t('popular_plants')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Tomato', 'Mango', 'Coconut', 'Chilli', 'Aloe Vera'].map(p => (
                      <button 
                        key={p}
                        onClick={() => {
                          setNewPlantName(p);
                          handleAddPlantSubmit({ preventDefault: () => {} } as any);
                          setIsSearchModalOpen(false);
                        }}
                        className="px-4 py-2 bg-zinc-100 rounded-2xl text-xs font-bold text-zinc-800 hover:bg-zinc-200 transition-colors"
                      >
                        {t(p.toLowerCase().replace(/\s+/g, '_'))}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Notifications Modal */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowNotifications(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-emerald-950">{t('notifications')}</h3>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{inAppNotifications.length} {t('alerts')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {inAppNotifications.length > 0 && (
                    <button 
                      onClick={clearNotifications}
                      className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {t('clear_all')}
                    </button>
                  )}
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="p-2 bg-zinc-100 rounded-full text-zinc-500 hover:bg-zinc-200 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {inAppNotifications.length === 0 ? (
                  <div className="py-20 flex flex-col items-center text-center px-10">
                    <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mb-4">
                      <Bell size={32} />
                    </div>
                    <h4 className="text-lg font-bold text-zinc-900 mb-1">{t('no_notifications')}</h4>
                    <p className="text-sm font-medium text-zinc-500">{t('no_notifications_desc')}</p>
                  </div>
                ) : (
                  inAppNotifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        notif.read ? 'bg-zinc-50 border-zinc-100 opacity-80' : 'bg-emerald-50 border-emerald-100'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-black text-emerald-950 text-sm">{notif.title}</h4>
                        <span className="text-[10px] font-bold text-zinc-400">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-zinc-600 leading-relaxed">{notif.body}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
