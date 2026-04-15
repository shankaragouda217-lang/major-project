import { useState, useRef, useMemo, useEffect } from 'react';
import { Calendar, Timer, Leaf, Sparkles, Camera, Upload, Save, Loader2, CheckCircle2, Search, Trash2, X, ChevronRight, History as HistoryIcon, Filter, MoreHorizontal, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { useApp } from '../AppContext';
import { getGrowthSuggestions, analyzeGrowthFromImage } from '../services/geminiService';
import { resizeImage } from '../lib/utils';

const COMMON_PLANTS = ['Tulsi', 'Chilli', 'Tomato', 'Curry Leaves', 'Bhindi', 'Palak', 'Marigold', 'Aloe Vera'];

export default function GrowthTrackerScreen() {
  const { addToHistory, history, deleteHistoryItem, deleteMultipleHistoryItems, clearHistory, currentLanguage, t, allPlants } = useApp();
  const [plantName, setPlantName] = useState('');
  const [harvestDays, setHarvestDays] = useState<number | string>('');
  const [daysPlanted, setDaysPlanted] = useState<number | string>('');
  const [plantImage, setPlantImage] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<{
    stage?: string;
    fertilizer?: string;
    watering?: string;
    pest?: string;
  }>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistoryItems, setSelectedHistoryItems] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    growthStage: string;
    healthStatus: string;
    confidence: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isLiveCamera, setIsLiveCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsLiveCamera(true);
      setPlantImage(null);
      setAnalysisResult(null);
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(t('camera_access_error'));
      cameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsLiveCamera(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const resized = await resizeImage(dataUrl);
        setPlantImage(resized);
        stopCamera();
        handleAnalyzeGrowth(resized);
      }
    }
  };

  const progress = useMemo(() => {
    const d = Number(daysPlanted) || 0;
    const h = Number(harvestDays) || 1;
    return Math.min(100, (d / h) * 100);
  }, [daysPlanted, harvestDays]);

  const daysLeft = useMemo(() => {
    if (!harvestDays || harvestDays === 0) return null;
    const d = Number(daysPlanted) || 0;
    const h = Number(harvestDays) || 0;
    return Math.max(0, h - d);
  }, [daysPlanted, harvestDays]);

  // Auto-lookup harvest days when plant name changes
  useEffect(() => {
    if (!plantName || plantName.length < 2) return;
    
    const lowerName = plantName.toLowerCase().trim();
    const match = allPlants.find(p => 
      t(p.name).toLowerCase() === lowerName || 
      p.name.toLowerCase() === lowerName
    );

    if (match) {
      const growthStr = t(match.growthTime);
      const matchNum = growthStr.match(/\d+/);
      if (matchNum) {
        setHarvestDays(Number(matchNum[0]));
      }
    }
  }, [plantName, allPlants, t]);

  // Calculate harvest date
  const harvestDateStr = useMemo(() => {
    if (!harvestDays || harvestDays === 0) return t('not_available');
    const date = new Date();
    date.setDate(date.getDate() + daysLeft);
    return date.toLocaleDateString(currentLanguage === 'kn' ? 'kn-IN' : currentLanguage === 'hi' ? 'hi-IN' : currentLanguage === 'ta' ? 'ta-IN' : currentLanguage === 'te' ? 'te-IN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [daysLeft, harvestDays, currentLanguage, t]);

  const filteredHistory = useMemo(() => {
    return history
      .filter(item => item.type === 'growth_log' || item.type === 'growth_search')
      .filter(item => item.title.toLowerCase().includes(historySearch.toLowerCase()) || 
        (item.details && item.details.toLowerCase().includes(historySearch.toLowerCase()))
      );
  }, [history, historySearch]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        const resized = await resizeImage(dataUrl);
        setPlantImage(resized);
        handleAnalyzeGrowth(resized);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeGrowth = async (imageData: string) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const result = await analyzeGrowthFromImage(imageData, plantName, currentLanguage);
      setPlantName(result.plantName);
      setHarvestDays(result.estimatedHarvestDays);
      setAiAdvice({
        stage: result.growthStage,
        fertilizer: result.suggestions[0] || '',
        watering: result.suggestions[1] || '',
        pest: result.suggestions[2] || ''
      });
      setAnalysisResult({
        growthStage: result.growthStage,
        healthStatus: result.healthStatus,
        confidence: result.confidence
      });
      
      // Save analysis to history
      await addToHistory({
        type: 'growth_log',
        title: `${t('ai_growth_analysis_title')}: ${result.plantName}`,
        details: t('ai_growth_analysis_details', {
          stage: result.growthStage,
          health: result.healthStatus,
          harvest: result.estimatedHarvestDays
        }),
        image: imageData
      });
    } catch (err: any) {
      console.error("Growth Analysis Error:", err);
      const errorMsg = err.message?.startsWith('ai_error_') ? t(err.message) : (err.message || t('unknown_error'));
      setError(`${t('analysis_failed')}: ${errorMsg}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGetSuggestions = async () => {
    if (!plantName.trim()) return;
    setIsAnalyzing(true);
    try {
      const d = Number(daysPlanted) || 0;
      const result = await getGrowthSuggestions(plantName, d, currentLanguage);
      setAiAdvice({
        stage: result.stageAdvice,
        fertilizer: result.fertilizerAdvice,
        watering: result.wateringAdvice,
        pest: result.pestAdvice
      });
      setHarvestDays(result.harvestDays);
      
      // Save search to history
      await addToHistory({
        type: 'growth_search',
        title: `${t('plant_search_title')}: ${plantName}`,
        details: t('plant_search_details', {
          days: d,
          harvestDays: result.harvestDays,
          fertilizer: result.fertilizerAdvice.substring(0, 50)
        })
      });
    } catch (error) {
      console.error("Failed to get suggestions:", error);
    } finally {
      setIsAnalyzing(true); // Keep analyzing state for a bit for UI feel
      setTimeout(() => setIsAnalyzing(false), 500);
    }
  };

  const handleSaveHistory = async () => {
    setIsSaving(true);
    try {
      const d = Number(daysPlanted) || 0;
      await addToHistory({
        type: 'growth_log',
        title: `${t('growth_log_title')}: ${plantName}`,
        details: t('growth_log_details', {
          days: d,
          progress: Math.round(progress),
          daysLeft: daysLeft,
          fertilizer: aiAdvice.fertilizer?.substring(0, 50) || t('none')
        }),
        image: plantImage || undefined
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save history:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  const toggleSelection = (id: string) => {
    setSelectedHistoryItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedHistoryItems.length === 0) return;
    await deleteMultipleHistoryItems(selectedHistoryItems);
    setSelectedHistoryItems([]);
    setIsSelectionMode(false);
  };

  const handleClearAll = async () => {
    const idsToDelete = filteredHistory.map(item => item.id);
    if (idsToDelete.length > 0) {
      await deleteMultipleHistoryItems(idsToDelete);
    }
  };

  return (
    <div className="min-h-screen p-4 pb-32 max-w-5xl mx-auto text-zinc-900">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-emerald-950 tracking-tight leading-none mb-2">
            {t('track_growth')}
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-emerald-500/40 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <p className="text-emerald-800 font-bold uppercase tracking-[0.2em] text-[10px]">{t('ai_cultivation_intelligence')}</p>
          </div>
        </div>
      </header>

      {/* Main Vertical Layout */}
      <div className="flex flex-col gap-6 mb-12">
        {/* 1. Plant Configuration */}
        <section className="bg-white p-6 rounded-[2.5rem] border border-zinc-100 shadow-xl shadow-emerald-900/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
          
          <div className="flex items-center gap-3 mb-6 relative">
            <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Leaf size={20} />
            </div>
            <div>
              <h3 className="text-xs font-black text-emerald-900 uppercase tracking-widest">{t('plant_config')}</h3>
              <p className="text-[10px] text-zinc-500 font-medium">{t('setup_your_garden_profile')}</p>
            </div>
          </div>

          <div className="space-y-6 relative">
            <div className="relative">
              <input 
                type="text"
                value={plantName}
                onChange={(e) => setPlantName(e.target.value)}
                placeholder={t('what_growing')}
                className="w-full pl-6 pr-14 py-4 bg-zinc-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold text-lg text-emerald-950 transition-all placeholder:text-zinc-400"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                {plantName && (
                  <button 
                    onClick={() => setPlantName('')}
                    className="p-2 text-zinc-400 hover:text-zinc-600 transition-all"
                  >
                    <X size={18} />
                  </button>
                )}
                <button 
                  onClick={handleGetSuggestions}
                  disabled={isAnalyzing || !plantName}
                  className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 active:scale-95"
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {COMMON_PLANTS.map(p => {
                const plantKey = p.toLowerCase().replace(/\s+/g, '_');
                const translatedName = t(plantKey) !== plantKey ? t(plantKey) : p;
                return (
                  <button
                    key={p}
                    onClick={() => setPlantName(translatedName)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      plantName === translatedName 
                        ? 'bg-emerald-900 text-white shadow-md' 
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {translatedName}
                  </button>
                );
              })}
            </div>

            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100/50 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
                    <Timer size={16} />
                  </div>
                  <span className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">{t('growth_progress')}</span>
                </div>
                {daysLeft !== null && (
                  <div className="bg-white px-3 py-1 rounded-full shadow-sm border border-emerald-100">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      {daysLeft} {t('days_left')}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">{t('days_planted')}</label>
                  <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-zinc-100 shadow-sm">
                    <input 
                      type="number" 
                      value={daysPlanted}
                      onChange={(e) => setDaysPlanted(e.target.value)}
                      className="w-full bg-transparent font-black text-2xl text-emerald-950 outline-none"
                    />
                    <span className="text-[10px] font-black text-zinc-400 uppercase">{t('days')}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">{t('total_cycle')}</label>
                  <div className="flex items-center gap-3 bg-zinc-100/50 p-3 rounded-2xl border border-zinc-100">
                    <input 
                      type="text"
                      readOnly
                      value={harvestDays}
                      className="w-full bg-transparent font-black text-2xl text-emerald-900/50 outline-none cursor-default"
                    />
                    <span className="text-[10px] font-black text-zinc-400 uppercase">{t('days')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Growth Status */}
        <section className="bg-emerald-950 p-6 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl transition-all group-hover:bg-emerald-500/20" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-1">{t('growth_status')}</h4>
                <p className="text-3xl font-black text-white tracking-tight">{Math.round(progress)}% {t('complete')}</p>
              </div>
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-emerald-400 border border-white/20 shadow-inner">
                <Leaf size={24} />
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="h-3 bg-white/10 rounded-full overflow-hidden p-1 shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full shadow-[0_0_15px_rgba(52,211,153,0.5)]"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                  <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">{t('planted')}</p>
                  <p className="text-sm font-black">{daysPlanted || 0}d</p>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                  <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">{t('remaining')}</p>
                  <p className="text-sm font-black text-emerald-300">{daysLeft || 0}d</p>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                  <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">{t('harvest')}</p>
                  <p className="text-sm font-black">{harvestDateStr.split(',')[0]}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Visual Log */}
        <section className="bg-white p-6 rounded-[2.5rem] border border-zinc-100 shadow-xl shadow-emerald-900/5 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                <Camera size={20} />
              </div>
              <div>
                <h3 className="text-xs font-black text-emerald-900 uppercase tracking-widest">{t('visual_log')}</h3>
                <p className="text-[10px] text-zinc-500 font-medium">{t('track_with_photos')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={startCamera} className="p-2.5 bg-zinc-50 rounded-xl text-zinc-600 hover:bg-emerald-600 hover:text-white transition-all active:scale-90">
                <Camera size={18} />
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-zinc-50 rounded-xl text-zinc-600 hover:bg-emerald-600 hover:text-white transition-all active:scale-90">
                <Upload size={18} />
              </button>
            </div>
          </div>

          <div className="aspect-video bg-zinc-50 rounded-[2rem] border-2 border-dashed border-zinc-200 overflow-hidden relative group shadow-inner transition-all hover:border-emerald-300">
            {isLiveCamera ? (
              <div className="relative w-full h-full bg-black">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 px-3">
                  <button onClick={stopCamera} className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 active:scale-90">
                    <X size={20} />
                  </button>
                  <button onClick={capturePhoto} className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-2xl border-4 border-emerald-50 active:scale-90">
                    <div className="w-8 h-8 rounded-full border-2 border-emerald-600 flex items-center justify-center">
                      <div className="w-5 h-5 bg-emerald-600 rounded-full" />
                    </div>
                  </button>
                </div>
              </div>
            ) : plantImage ? (
              <div className="relative w-full h-full">
                <img src={plantImage} alt="Plant" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button onClick={() => setPlantImage(null)} className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all">
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm flex items-center justify-center text-zinc-300 mb-4 group-hover:scale-110 transition-all">
                  <Camera size={40} />
                </div>
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t('no_visual_data')}</p>
                <p className="text-[10px] text-zinc-300 mt-2 font-medium">{t('snap_a_photo_to_start')}</p>
              </div>
            )}
            
            {isAnalyzing && (
              <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xl flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">{t('analyzing_text')}</p>
                </div>
              </div>
            )}
          </div>

          {analysisResult && (
            <div className="mt-6 p-5 bg-emerald-50 rounded-3xl border border-emerald-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{t('ai_analysis')}</span>
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full shadow-sm">
                  <Sparkles size={10} className="text-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase">
                    {Math.round(analysisResult.confidence * 100)}% {t('match')}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/50 p-3 rounded-2xl border border-emerald-100/50">
                  <p className="text-[8px] font-bold text-emerald-800/60 uppercase mb-1 tracking-wider">{t('health')}</p>
                  <p className="text-xs font-black text-emerald-900">{analysisResult.healthStatus}</p>
                </div>
                <div className="bg-white/50 p-3 rounded-2xl border border-emerald-100/50">
                  <p className="text-[8px] font-bold text-emerald-800/60 uppercase mb-1 tracking-wider">{t('stage')}</p>
                  <p className="text-xs font-black text-emerald-900">{analysisResult.growthStage}</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 4. AI Deep Suggestions Section (Cultivation Intelligence) */}
      <section className="mb-20">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-emerald-950 tracking-tight uppercase">{t('cultivation_intelligence')}</h2>
            <p className="text-xs text-zinc-500 font-medium">{t('personalized_growth_strategies')}</p>
          </div>
          <div className="h-[1px] flex-1 bg-zinc-100 ml-4" />
        </div>

        {aiAdvice.stage ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AdviceCard 
              title={t('growth_stage')} 
              content={aiAdvice.stage} 
              icon={<Leaf size={20} />} 
              color="emerald" 
            />
            <AdviceCard 
              title={t('fertilizer_plan')} 
              content={aiAdvice.fertilizer || ''} 
              icon={<Sparkles size={20} />} 
              color="blue" 
            />
            <AdviceCard 
              title={t('hydration')} 
              content={aiAdvice.watering || ''} 
              icon={<RefreshCw size={20} />} 
              color="cyan" 
            />
            <AdviceCard 
              title={t('protection')} 
              content={aiAdvice.pest || ''} 
              icon={<AlertCircle size={20} />} 
              color="rose" 
            />
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] p-12 text-center border border-zinc-100 shadow-xl shadow-emerald-900/5">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] shadow-inner flex items-center justify-center text-emerald-500 mx-auto mb-6">
                <Info size={40} />
              </div>
              <h3 className="text-xl font-black text-emerald-950 mb-3">{t('deep_insights_req')}</h3>
              <p className="text-sm text-zinc-500 font-medium mb-8 leading-relaxed">
                {t('deep_insights_desc')}
              </p>
              <button 
                onClick={handleGetSuggestions}
                disabled={isAnalyzing || !plantName}
                className="w-full sm:w-auto px-10 py-5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-3 mx-auto disabled:opacity-50 active:scale-95"
              >
                {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                {t('generate_deep_report')}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Hidden inputs */}
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
      <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleImageUpload} />
    </div>
  );
}

function AdviceCard({ title, content, icon, color }: { title: string; content: string; icon: React.ReactNode; color: 'emerald' | 'blue' | 'cyan' | 'rose' }) {
  const { t } = useApp();
  const isError = content.startsWith('ai_error_');
  const displayContent = isError ? t(content as any) : content;
  
  const colorClasses = {
    emerald: isError ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: isError ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100',
    cyan: isError ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-cyan-50 text-cyan-600 border-cyan-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100'
  };

  const iconColors = {
    emerald: 'bg-emerald-600 text-white shadow-emerald-200',
    blue: 'bg-blue-600 text-white shadow-blue-200',
    cyan: 'bg-cyan-600 text-white shadow-cyan-200',
    rose: 'bg-rose-600 text-white shadow-rose-200'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white p-6 rounded-[2rem] border ${isError ? 'border-rose-200 bg-rose-50/30' : 'border-zinc-100'} shadow-xl shadow-emerald-900/5 flex flex-col hover:border-emerald-200 transition-all group`}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all group-hover:scale-110 ${isError ? 'bg-rose-600 text-white shadow-rose-200' : iconColors[color]}`}>
          {isError ? <AlertCircle size={20} /> : icon}
        </div>
        <h4 className={`text-[10px] font-black ${isError ? 'text-rose-400' : 'text-emerald-900'} uppercase tracking-[0.2em]`}>{title}</h4>
      </div>
      <div className={`text-sm ${isError ? 'text-rose-700' : 'text-zinc-700'} font-medium leading-relaxed flex-1 markdown-body`}>
        <Markdown>{displayContent}</Markdown>
      </div>
    </motion.div>
  );
}
