import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../AppContext';
import { Droplets, Thermometer, Wind, Sun, Plus, Leaf, CloudRain, Cloud, Zap, AlertCircle, MapPin, TrendingUp, Share2, Maximize, Sparkles, Camera, Loader2, Bell, Search, ShoppingBag, X, ChevronRight, Moon, CloudSun, CloudFog, CloudLightning, Snowflake, CloudDrizzle, RefreshCw, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SensorCard = ({ title, value, unit, icon: Icon, status, subtitle, trend }: any) => {
  const { t } = useApp();
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'moderate': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'attention': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-zinc-50 text-zinc-700 border-zinc-100';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`p-4 rounded-[2rem] border-2 ${getStatusColor()} flex flex-col gap-2 transition-all relative overflow-hidden shadow-sm hover:shadow-md`}
    >
      <div className="flex justify-between items-center">
        <div className={`p-2 rounded-xl ${getStatusColor()} border-0 shadow-inner`}>
          <Icon size={18} />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{t(status)}</span>
          {trend && (
            <div className={`flex items-center gap-0.5 text-[8px] font-black uppercase ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </div>
          )}
        </div>
      </div>
      <div>
        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{title}</h3>
        <div className="flex items-baseline gap-1">
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
          <span className="text-xs font-black opacity-40">{unit}</span>
        </div>
        {subtitle && (
          <p className="text-[8px] font-bold opacity-50 mt-1.5 uppercase tracking-tighter line-clamp-1">{subtitle}</p>
        )}
      </div>
      <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
        <Icon size={60} />
      </div>
    </motion.div>
  );
};

export default function DashboardScreen({ onNavigate, onAskAI }: { onNavigate: (s: any) => void, onAskAI: (q: string) => void }) {
  const { userData, sensors, waterPlant, suggestions, allPlants, searchPlantAI, enableLiveLocation, disableLiveLocation, isLocationEnabled, cityName, expenses, addToHistory, t, reports, fetchWeatherData } = useApp();
  const [forecast, setForecast] = useState<any[]>([]);
  const [dashboardQuery, setDashboardQuery] = useState('');
  const [newPlantName, setNewPlantName] = useState('');
  const [extraSuggestions, setExtraSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [timeSinceWatered, setTimeSinceWatered] = useState<string>('');
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [showEfficiencyInfo, setShowEfficiencyInfo] = useState(false);

  const diseaseAlerts = useMemo(() => {
    const alerts = [];
    if (sensors.humidity > 75 && sensors.temp > 15 && sensors.temp < 28) {
      alerts.push({ 
        name: t('alert_blight_name'), 
        location: t('alert_blight_location'), 
        risk: t('risk_high'), 
        color: 'text-red-600', 
        bg: 'bg-red-50',
        description: t('alert_blight_desc'),
        why: t('alert_blight_why'),
        prevention: t('alert_blight_prev'),
        remedy: t('alert_blight_rem')
      });
    }

    // Warm + Dry = Powdery Mildew
    if (sensors.temp > 25 && sensors.humidity < 50) {
      alerts.push({ 
        name: t('alert_mildew_name'), 
        location: t('alert_mildew_location'), 
        risk: t('risk_medium'), 
        color: 'text-orange-600', 
        bg: 'bg-orange-50',
        description: t('alert_mildew_desc'),
        why: t('alert_mildew_why'),
        prevention: t('alert_mildew_prev'),
        remedy: t('alert_mildew_rem')
      });
    }

    // High temp = Aphid Activity
    if (sensors.temp > 32) {
      alerts.push({ 
        name: t('alert_aphid_name'), 
        location: t('alert_aphid_location'), 
        risk: t('risk_high'), 
        color: 'text-red-600', 
        bg: 'bg-red-50',
        description: t('alert_aphid_desc'),
        why: t('alert_aphid_why'),
        prevention: t('alert_aphid_prev'),
        remedy: t('alert_aphid_rem')
      });
    }

    // Default if no specific weather triggers
    if (alerts.length === 0) {
      alerts.push({
        name: t('alert_general_name'),
        location: t('alert_general_location'),
        risk: t('risk_low'),
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        description: t('alert_general_desc'),
        why: t('alert_general_why'),
        prevention: t('alert_general_prev'),
        remedy: t('alert_general_rem')
      });
    }

    return alerts;
  }, [sensors.temp, sensors.humidity, t]);

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
      addToHistory({ type: 'search', title: `AI Chat: ${globalSearchQuery}`, details: globalSearchQuery });
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
    if (isLocationEnabled && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeatherData(position.coords.latitude, position.coords.longitude);
        },
        (error) => console.error(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  return (
    <div className="px-4 pt-6 pb-24">
      {/* Header Section */}
      <header className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-lg font-bold text-emerald-950 tracking-tight">{t('hello')}, {userData?.displayName}!</h1>
          <p className="text-[10px] text-zinc-500 font-medium">{t('garden_doing_great')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-colors relative">
            <Bell size={16} />
            {userData?.settings?.notifications && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full border-2 border-white" />
            )}
          </button>
          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-emerald-100">
            {userData?.displayName?.[0]}
          </div>
        </div>
      </header>


      {/* Weather & Location Widget */}
      <div className="mb-5">
        <div className="bg-zinc-900 rounded-[1.75rem] p-4 text-white relative overflow-hidden shadow-xl shadow-zinc-200">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <MapPin size={50} />
          </div>
          
          <div className="flex justify-between items-start mb-3 relative z-10">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <h3 className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-500">{t('live_environment')}</h3>
              </div>
              <p className="text-base font-black tracking-tight truncate pr-4">{isLocationEnabled && cityName ? cityName : t('global_sync')}</p>
              {sensors.lastUpdated && (
                <p className="text-[7px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                  {t('live')} • {new Date(sensors.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <button 
                onClick={() => isLocationEnabled ? disableLiveLocation() : enableLiveLocation()}
                className={`px-2 py-0.5 rounded-md text-[7px] font-black tracking-widest transition-all shadow-lg ${isLocationEnabled ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {isLocationEnabled ? t('location_on') : t('location_off')}
              </button>
              {isLocationEnabled && (
                <button 
                  onClick={handleRefreshWeather}
                  className="p-1 bg-white/5 rounded-md text-zinc-400 hover:text-white transition-colors border border-white/5"
                >
                  <RefreshCw size={10} />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 relative z-10 mb-3">
            {forecast.map((f, i) => (
              <div key={i} className={`flex flex-col items-center text-center p-2 rounded-xl backdrop-blur-md border transition-all ${i === 0 ? 'bg-white/10 border-white/20 shadow-xl' : 'bg-white/5 border-white/5 opacity-60'}`}>
                <span className="text-[6px] font-black text-zinc-400 uppercase mb-1 tracking-widest">{f.day}</span>
                <f.icon size={16} className={f.condition === 'Rain' ? 'text-blue-400' : 'text-amber-400'} />
                <span className="text-sm font-black mt-1">{f.temp}°C</span>
                <span className="text-[7px] font-bold text-zinc-500 mt-0.5 uppercase tracking-tighter">{f.condition}</span>
              </div>
            ))}
          </div>

          {sensors.temp > 30 && (
            <div className="mt-3 p-2 bg-amber-400/10 border border-amber-400/20 rounded-lg flex items-start gap-2 text-amber-400">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <p className="text-[8px] font-bold leading-relaxed">
                {t('heatwave_alert')}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <SensorCard
          title={t('soil_moisture')}
          value={Math.round(sensors.moisture)}
          unit="%"
          icon={Droplets}
          status={getStatus('moisture', sensors.moisture)}
          subtitle={timeSinceWatered ? `${t('last_watered')}: ${timeSinceWatered}` : t('no_data')}
          trend={-5}
        />
        <SensorCard
          title={t('temperature')}
          value={Math.round(sensors.temp)}
          unit="°C"
          icon={Thermometer}
          status={getStatus('temp', sensors.temp)}
          subtitle={sensors.apparentTemp ? `${t('feels_like')} ${Math.round(sensors.apparentTemp)}°C` : undefined}
          trend={2}
        />
        <SensorCard
          title={t('humidity')}
          value={Math.round(sensors.humidity)}
          unit="%"
          icon={Wind}
          status={getStatus('humidity', sensors.humidity)}
          trend={-1}
        />
        <SensorCard
          title={t('light_level')}
          value={Math.round(sensors.light)}
          unit="%"
          icon={Sun}
          status={getStatus('light', sensors.light)}
          trend={12}
        />
      </div>

      {/* Action Button - Moved here */}
      <div className="flex justify-center mb-5">
        <button 
          onClick={waterPlant}
          className="group relative bg-white border-2 border-blue-100 text-blue-600 px-5 py-2.5 rounded-2xl text-[10px] font-bold flex items-center gap-2.5 active:scale-95 transition-all hover:bg-blue-50 hover:border-blue-200 shadow-lg shadow-blue-100/50"
        >
          <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <Droplets size={14} />
          </div>
          {t('watered_plant')}
        </button>
      </div>

      {/* Disease Alerts Section */}
      <div className="mb-6">
        <button 
          onClick={() => setIsAlertsModalOpen(true)}
          className="w-full bg-white p-4 rounded-[1.5rem] border-2 border-red-50 shadow-lg shadow-red-100/20 flex items-center justify-between group active:scale-[0.98] transition-all relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertCircle size={50} className="text-red-600" />
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 shadow-inner">
              <AlertCircle size={20} />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-zinc-900">{t('disease_alerts')}</h3>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                {diseaseAlerts.length + reports.length} {t('active_threats')}
              </p>
            </div>
          </div>
          <div className="w-7 h-7 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-400 group-hover:bg-red-500 group-hover:text-white transition-all">
            <ChevronRight size={16} />
          </div>
        </button>
      </div>

      {/* Plant Search & Suggestions */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-emerald-950">{t('plant_suitability')}</h2>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-full">
            <Leaf size={10} className="text-emerald-600" />
            <span className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">
              {Math.min(3, suggestions.length + extraSuggestions.length)} {t('analysis')}
            </span>
          </div>
        </div>

        <form onSubmit={handleAddPlantSubmit} className="mb-5 relative">
          <input
            type="text"
            value={newPlantName}
            onChange={(e) => {
              setNewPlantName(e.target.value);
              if (searchError) setSearchError(null);
            }}
            placeholder={t('search_suitability_placeholder')}
            className={`w-full bg-white border-2 ${searchError ? 'border-red-200' : 'border-zinc-100'} rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm pr-12`}
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
              className="text-[8px] text-red-500 font-bold mt-1.5 ml-2 flex items-center gap-1.5"
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
                        <h3 className="text-sm font-bold text-zinc-900">{t(plant.name.toLowerCase().replace(/\s+/g, '_').replace(/\(.*\)/, '').trim())}</h3>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest ${
                          isSuitable && !isConditional && isBalconySuitable ? 'bg-emerald-100 text-emerald-700' : 
                          (!isBalconySuitable || !isSuitable) ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {isSuitable && !isConditional && isBalconySuitable ? t('suitable') : 
                           !isBalconySuitable ? t('not_for_balcony') :
                           isConditional ? t('conditional') : t('needs_care')}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">{t(plant.name.toLowerCase().replace(/\s+/g, '_').replace(/\(.*\)/, '').trim() + '_desc')}</p>
                    </div>
                  </div>

                  {!isBalconySuitable && (
                    <div className="bg-red-50 border border-red-100 p-3 rounded-2xl flex items-start gap-3 mb-4">
                      <div className="w-7 h-7 shrink-0 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                        <AlertCircle size={14} />
                      </div>
                      <div>
                        <h5 className="text-[9px] font-black text-red-800 uppercase tracking-widest mb-0.5">
                          {t('balcony_warning')}
                        </h5>
                        <p className="text-[10px] font-medium text-red-700 leading-relaxed">
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
                        <h5 className={`text-[9px] font-black ${isConditional ? 'text-blue-800' : 'text-amber-800'} uppercase tracking-widest mb-0.5`}>
                          {isConditional ? t('seasonal_advice') : t('care_strategy')}
                        </h5>
                        <p className={`text-[10px] font-medium ${isConditional ? 'text-blue-700' : 'text-amber-700'} leading-relaxed`}>{tip}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-50">
                    <div>
                      <h4 className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('growth_cycle')}</h4>
                      <p className="text-[10px] font-bold text-zinc-800">{plant.growthTime}</p>
                    </div>
                    <div>
                      <h4 className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('best_months')}</h4>
                      <p className="text-[10px] font-bold text-zinc-800">{plant.suitableMonths}</p>
                    </div>
                    <div className="col-span-2">
                      <h4 className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('key_requirements')}</h4>
                      <p className="text-[10px] font-medium text-zinc-600 leading-relaxed italic">"{plant.needs}"</p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 p-8 rounded-2xl text-center">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-zinc-300 mx-auto mb-3 shadow-sm">
                <Leaf size={24} />
              </div>
              <p className="text-xs text-zinc-500 font-medium px-6">
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
        className="bg-emerald-950 rounded-[1.75rem] p-5 text-white cursor-pointer relative overflow-hidden shadow-xl shadow-emerald-900/40 mb-8 group"
      >
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
          <TrendingUp size={80} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500">{t('expenses_tracker')}</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <p className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-widest mb-1">{t('total_spent')}</p>
              <p className="text-2xl font-black tracking-tight">
                ₹{expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-widest mb-1">{t('estimated_yield')}</p>
              <p className="text-2xl font-black text-emerald-400 tracking-tight">
                +₹{(expenses.reduce((sum, e) => sum + e.amount, 0) * 1.45).toFixed(0)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">{t('return_on_investment')}</span>
              <span className="text-xs font-black text-emerald-400">145%</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '75%' }}
                className="h-full bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.4)]"
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{t('efficiency_score')}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEfficiencyInfo(!showEfficiencyInfo);
                  }}
                  className="text-zinc-500 hover:text-emerald-400 transition-colors"
                >
                  <HelpCircle size={10} />
                </button>
              </div>
              <span className="text-[10px] font-black text-emerald-400">{efficiencyScore}%</span>
            </div>
            
            <AnimatePresence>
              {showEfficiencyInfo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className="text-[8px] font-medium text-zinc-400 leading-relaxed bg-white/5 p-2 rounded-lg border border-white/5">
                    {t('efficiency_score_desc')}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
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
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => { onNavigate('disease'); setIsSearchModalOpen(false); }}
                      className="p-4 bg-blue-50 rounded-3xl flex flex-col gap-2 items-start text-left border border-blue-100 w-full"
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
