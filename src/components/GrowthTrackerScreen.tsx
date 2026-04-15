import { useState, useRef, useMemo, useEffect } from 'react';
import { Calendar, Timer, Leaf, Sparkles, Camera, Upload, Save, Loader2, CheckCircle2, Search, Trash2, X, ChevronRight, History as HistoryIcon, Filter, MoreHorizontal, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
    <div className="min-h-screen p-3 pb-32 max-w-4xl mx-auto text-zinc-900 dark:text-zinc-900">
      <header className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100/50 pb-4">
        <div className="flex-shrink-0">
          <h1 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tighter uppercase leading-none mb-1 whitespace-nowrap">
            {t('track_growth')}
          </h1>
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
            <p className="text-zinc-950 font-bold uppercase tracking-widest text-[9px]">{t('ai_cultivation_intelligence')}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
        {/* Left Column: Input & Documentation */}
        <div className="lg:col-span-7 space-y-4">
          <section className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                <Leaf size={16} />
              </div>
              <h3 className="text-[9px] font-black text-zinc-950 uppercase tracking-[0.2em]">{t('plant_config')}</h3>
            </div>

            <div className="space-y-3">
              <div className="relative group">
                <input 
                  type="text"
                  value={plantName}
                  onChange={(e) => setPlantName(e.target.value)}
                  placeholder={t('what_growing')}
                  className="w-full pl-4 pr-12 py-2.5 bg-zinc-50 rounded-xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none font-black text-base text-emerald-950 transition-all placeholder:text-zinc-900"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-1">
                  {plantName && (
                    <button 
                      onClick={() => setPlantName('')}
                      className="p-1.5 text-zinc-500 hover:text-zinc-700 transition-all"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <button 
                    onClick={handleGetSuggestions}
                    disabled={isAnalyzing || !plantName}
                    className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {COMMON_PLANTS.map(p => {
                  const plantKey = p.toLowerCase().replace(/\s+/g, '_');
                  const translatedName = t(plantKey) !== plantKey ? t(plantKey) : p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPlantName(translatedName)}
                      className={`px-2 py-0.5 rounded-md text-xs font-medium uppercase tracking-normal transition-all ${
                        plantName === translatedName 
                          ? 'bg-emerald-950 text-white shadow-sm' 
                          : 'bg-zinc-100 text-zinc-950 hover:bg-zinc-200'
                      }`}
                    >
                      {translatedName}
                    </button>
                  );
                })}
              </div>

              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer size={14} className="text-emerald-500" />
                    <span className="text-[8px] font-black text-zinc-950 uppercase tracking-widest">{t('growth_progress')}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <span className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">
                      {daysLeft !== null ? `${daysLeft} ${t('days_left')}` : t('waiting_for_data')}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-950 uppercase tracking-widest block">{t('days_planted')}</label>
                    <div className="flex items-baseline gap-1">
                      <input 
                        type="number" 
                        value={daysPlanted}
                        onChange={(e) => setDaysPlanted(e.target.value)}
                        placeholder=""
                        className="w-20 bg-white px-2 py-1 rounded-lg border border-zinc-200 font-black text-xl text-emerald-950 outline-none focus:border-emerald-500 transition-all placeholder:text-zinc-800"
                      />
                      <span className="text-[8px] font-bold text-zinc-950 uppercase">{t('days')}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-950 uppercase tracking-widest block">{t('total_cycle')}</label>
                    <div className="flex items-baseline gap-1">
                      <input 
                        type="text"
                        readOnly
                        value={harvestDays}
                        placeholder="--"
                        className="w-20 bg-zinc-100 px-2 py-1 rounded-lg border border-zinc-200 font-black text-xl text-emerald-900 outline-none cursor-default"
                      />
                      <span className="text-[8px] font-bold text-zinc-950 uppercase">{t('days')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-emerald-950 p-4 rounded-2xl text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-0.5">{t('growth_status')}</h4>
                  <p className="text-base font-black text-white">{Math.round(progress)}% {t('complete')}</p>
                </div>
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                  <Leaf size={16} />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                  />
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-center">
                    <p className="text-[6px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">{t('planted')}</p>
                    <p className="text-xs font-black">{daysPlanted}d</p>
                  </div>
                  <div className="text-center border-x border-white/10">
                    <p className="text-[6px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">{t('remaining')}</p>
                    <p className="text-xs font-black text-emerald-400">{daysLeft}d</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[6px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">{t('harvest')}</p>
                    <p className="text-xs font-black">{harvestDateStr.split(',')[0]}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: AI Insights & Documentation */}
        <div className="lg:col-span-5 space-y-4">
          <section className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                  <Camera size={16} />
                </div>
                <h3 className="text-[9px] font-black text-zinc-950 uppercase tracking-[0.2em]">{t('visual_log')}</h3>
              </div>
              <div className="flex gap-1">
                <button onClick={startCamera} className="p-1.5 bg-zinc-100 rounded-md text-zinc-800 hover:bg-emerald-100 hover:text-emerald-600 transition-all">
                  <Camera size={14} />
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="p-1.5 bg-zinc-100 rounded-md text-zinc-800 hover:bg-emerald-100 hover:text-emerald-600 transition-all">
                  <Upload size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 aspect-[4/3] bg-zinc-50 rounded-xl border-2 border-dashed border-zinc-200 overflow-hidden relative group shadow-inner">
              {isLiveCamera ? (
                <div className="relative w-full h-full bg-black">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-3">
                    <button onClick={stopCamera} className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30">
                      <X size={16} />
                    </button>
                    <button onClick={capturePhoto} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-lg border-2 border-emerald-100">
                      <div className="w-7 h-7 rounded-full border border-emerald-600 flex items-center justify-center">
                        <div className="w-4 h-4 bg-emerald-600 rounded-full" />
                      </div>
                    </button>
                  </div>
                </div>
              ) : plantImage ? (
                <div className="relative w-full h-full">
                  <img src={plantImage} alt="Plant" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button onClick={() => setPlantImage(null)} className="absolute top-2 right-2 w-6 h-6 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-zinc-500 mb-2">
                    <Camera size={24} />
                  </div>
                  <p className="text-[9px] font-black text-zinc-950 uppercase tracking-widest">{t('no_visual_data')}</p>
                </div>
              )}
              
              {isAnalyzing && (
                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md flex items-center justify-center z-20">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-emerald-400 font-black text-[8px] uppercase tracking-[0.3em] animate-pulse">{t('analyzing_text')}</p>
                  </div>
                </div>
              )}
            </div>

            {analysisResult && (
              <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[7px] font-black text-emerald-700 uppercase tracking-widest">{t('ai_analysis')}</span>
                  <span className="text-[7px] font-black text-emerald-600 bg-white px-1.5 py-0.5 rounded-full shadow-sm">
                    {Math.round(analysisResult.confidence * 100)}% {t('match')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[7px] font-bold text-emerald-800/80 uppercase mb-0.5">{t('health')}</p>
                    <p className="text-[10px] font-black text-emerald-900">{analysisResult.healthStatus}</p>
                  </div>
                  <div>
                    <p className="text-[7px] font-bold text-emerald-800/80 uppercase mb-0.5">{t('stage')}</p>
                    <p className="text-[10px] font-black text-emerald-900">{analysisResult.growthStage}</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* AI Deep Suggestions Section */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-[1px] flex-1 bg-zinc-100" />
          <div className="flex items-center gap-2 px-3">
            <Sparkles className="text-emerald-500" size={20} />
            <h2 className="text-base font-black text-emerald-950 tracking-tight uppercase">{t('cultivation_intelligence')}</h2>
          </div>
          <div className="h-[1px] flex-1 bg-zinc-100" />
        </div>

        {aiAdvice.stage ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdviceCard 
              title={t('growth_stage')} 
              content={aiAdvice.stage} 
              icon={<Leaf size={16} />} 
              color="emerald" 
            />
            <AdviceCard 
              title={t('fertilizer_plan')} 
              content={aiAdvice.fertilizer || ''} 
              icon={<Sparkles size={16} />} 
              color="blue" 
            />
            <AdviceCard 
              title={t('hydration')} 
              content={aiAdvice.watering || ''} 
              icon={<RefreshCw size={16} />} 
              color="cyan" 
            />
            <AdviceCard 
              title={t('protection')} 
              content={aiAdvice.pest || ''} 
              icon={<AlertCircle size={16} />} 
              color="rose" 
            />
          </div>
        ) : (
          <div className="bg-zinc-50 rounded-[2rem] p-8 text-center border border-dashed border-zinc-200">
            <div className="max-w-sm mx-auto">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-500 mx-auto mb-4">
                <Info size={28} />
              </div>
              <h3 className="text-sm font-black text-emerald-950 mb-2">{t('deep_insights_req')}</h3>
              <p className="text-[11px] text-zinc-950 font-medium mb-6 leading-relaxed">
                {t('deep_insights_desc')}
              </p>
              <button 
                onClick={handleGetSuggestions}
                disabled={isAnalyzing || !plantName}
                className="px-6 py-3.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white p-4 rounded-2xl border ${isError ? 'border-rose-200 bg-rose-50/30' : 'border-zinc-100'} shadow-sm flex flex-col hover:border-emerald-200 transition-all group`}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 border shadow-sm transition-all group-hover:scale-110 ${colorClasses[color]}`}>
        {isError ? <AlertCircle size={16} /> : icon}
      </div>
      <h4 className={`text-[8px] font-black ${isError ? 'text-rose-400' : 'text-zinc-950'} uppercase tracking-widest mb-1.5`}>{title}</h4>
      <p className={`text-[11px] ${isError ? 'text-rose-700' : 'text-zinc-950'} font-bold leading-relaxed flex-1`}>{displayContent}</p>
    </motion.div>
  );
}
