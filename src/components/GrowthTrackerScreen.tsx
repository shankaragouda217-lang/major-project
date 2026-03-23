import { useState, useRef, useMemo, useEffect } from 'react';
import { Calendar, Timer, Leaf, Sparkles, Camera, Upload, Save, Loader2, CheckCircle2, Search, Trash2, X, ChevronRight, History as HistoryIcon, Filter, MoreHorizontal, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../AppContext';
import { getGrowthSuggestions, analyzeGrowthFromImage } from '../services/geminiService';

const COMMON_PLANTS = ['Tulsi', 'Chilli', 'Tomato', 'Curry Leaves', 'Bhindi', 'Palak', 'Marigold', 'Aloe Vera'];

export default function GrowthTrackerScreen() {
  const { addToHistory, history, deleteHistoryItem, deleteMultipleHistoryItems, clearHistory } = useApp();
  const [plantName, setPlantName] = useState('');
  const [harvestDays, setHarvestDays] = useState(80);
  const [daysPlanted, setDaysPlanted] = useState(0);
  const [plantImage, setPlantImage] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
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
      setError("Could not access camera. Please check permissions or use the Gallery option.");
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

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPlantImage(dataUrl);
        stopCamera();
        handleAnalyzeGrowth(dataUrl);
      }
    }
  };

  const progress = Math.min(100, (daysPlanted / harvestDays) * 100);
  const daysLeft = Math.max(0, harvestDays - daysPlanted);

  // Calculate harvest date
  const harvestDate = new Date();
  harvestDate.setDate(harvestDate.getDate() + daysLeft);
  const harvestDateStr = harvestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setPlantImage(dataUrl);
        handleAnalyzeGrowth(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeGrowth = async (imageData: string) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const result = await analyzeGrowthFromImage(imageData, plantName);
      setPlantName(result.plantName);
      setHarvestDays(result.estimatedHarvestDays);
      setAiSuggestions(result.suggestions);
      setAnalysisResult({
        growthStage: result.growthStage,
        healthStatus: result.healthStatus,
        confidence: result.confidence
      });
      
      // Save analysis to history
      await addToHistory({
        type: 'growth_log',
        title: `AI Growth Analysis: ${result.plantName}`,
        details: `Stage: ${result.growthStage} | Health: ${result.healthStatus} | Harvest: ${result.estimatedHarvestDays} days`,
        image: imageData
      });
    } catch (err: any) {
      console.error("Growth Analysis Error:", err);
      setError(`Analysis failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGetSuggestions = async () => {
    if (!plantName.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await getGrowthSuggestions(plantName);
      setAiSuggestions(result.suggestions);
      setHarvestDays(result.harvestDays);
      
      // Save search to history
      await addToHistory({
        type: 'growth_search',
        title: `Plant Search: ${plantName}`,
        details: `Harvest Cycle: ${result.harvestDays} days | Suggestions: ${result.suggestions.slice(0, 2).join(', ')}...`
      });
    } catch (error) {
      console.error("Failed to get suggestions:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveHistory = async () => {
    setIsSaving(true);
    try {
      await addToHistory({
        type: 'growth_log',
        title: `Growth Log: ${plantName}`,
        details: `Progress: ${Math.round(progress)}% | Days Left: ${daysLeft} | Suggestions: ${aiSuggestions.join(', ')}`,
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
    if (window.confirm("Are you sure you want to clear all growth history?")) {
      const idsToDelete = filteredHistory.map(item => item.id);
      if (idsToDelete.length > 0) {
        await deleteMultipleHistoryItems(idsToDelete);
      }
    }
  };

  return (
    <div className="p-6 pb-24">
      <header className="mb-8">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-3xl font-black text-emerald-900 tracking-tighter uppercase">Track Growth</h2>
            <p className="text-zinc-500 font-medium">Monitor your garden's progress.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => document.getElementById('growth-history')?.scrollIntoView({ behavior: 'smooth' })}
              className="p-3 rounded-2xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-all flex items-center gap-2"
            >
              <HistoryIcon size={20} />
              <span className="text-xs font-bold">View History</span>
            </button>
            <button 
              onClick={handleSaveHistory}
              disabled={isSaving}
              className={`p-3 rounded-2xl flex items-center gap-2 transition-all shadow-sm ${
                saveSuccess 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-zinc-900 text-white hover:bg-zinc-800'
              }`}
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : saveSuccess ? <CheckCircle2 size={20} /> : <Save size={20} />}
              <span className="text-xs font-bold">{saveSuccess ? 'Saved' : 'Save Log'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Tracker Dashboard */}
      <div className="space-y-6 mb-12">
        <div className="bg-white p-6 rounded-[2.5rem] border-2 border-zinc-100 shadow-sm">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-3 tracking-widest">Plant Selection</label>
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Leaf className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                  <input 
                    type="text"
                    value={plantName}
                    onChange={(e) => setPlantName(e.target.value)}
                    placeholder="Enter any plant name..."
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold text-emerald-800 transition-all"
                  />
                </div>
                <button 
                  onClick={handleGetSuggestions}
                  disabled={isAnalyzing}
                  className="p-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
                  title="Get AI Suggestions"
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {COMMON_PLANTS.map(p => (
                  <button
                    key={p}
                    onClick={() => setPlantName(p)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                      plantName === p 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase mb-1 tracking-wider">Harvest Cycle</h4>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={harvestDays}
                        onChange={(e) => setHarvestDays(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 bg-transparent font-black text-2xl text-emerald-900 outline-none"
                      />
                      <span className="text-xs font-bold text-zinc-400 uppercase">days</span>
                    </div>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase mb-1 tracking-wider">Days Planted</h4>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={daysPlanted}
                        onChange={(e) => setDaysPlanted(Math.min(harvestDays, parseInt(e.target.value) || 0))}
                        className="w-16 bg-transparent font-black text-2xl text-emerald-900 outline-none"
                      />
                      <span className="text-xs font-bold text-zinc-400 uppercase">days</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-3">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Growth Progress</h4>
                    <span className="text-3xl font-black text-emerald-600">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full h-8 bg-zinc-100 rounded-full overflow-hidden p-1.5 border border-zinc-50 mb-4">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-emerald-500 rounded-full flex items-center justify-end px-2"
                    >
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </motion.div>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={harvestDays} 
                    value={daysPlanted}
                    onChange={(e) => setDaysPlanted(parseInt(e.target.value))}
                    className="w-full h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Growth Documentation</label>
                <div className="aspect-video bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center overflow-hidden relative group transition-all shadow-inner">
                  {isLiveCamera ? (
                    <div className="relative w-full h-full bg-black">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-6">
                        <button 
                          onClick={stopCamera}
                          className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30"
                        >
                          <X size={20} />
                        </button>
                        <button 
                          onClick={capturePhoto}
                          className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-xl border-4 border-emerald-100"
                        >
                          <div className="w-10 h-10 rounded-full border-2 border-emerald-600 flex items-center justify-center">
                            <div className="w-6 h-6 bg-emerald-600 rounded-full" />
                          </div>
                        </button>
                        <div className="w-10 h-10" />
                      </div>
                    </div>
                  ) : plantImage ? (
                    <div className="relative w-full h-full">
                      <img src={plantImage} alt="Plant" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button 
                          onClick={() => setPlantImage(null)}
                          className="w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => !isAnalyzing && startCamera()}
                      className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-200 transition-colors"
                    >
                      <div className="text-center p-6">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-500 mx-auto mb-4">
                          <Camera size={32} />
                        </div>
                        <p className="text-sm font-bold text-zinc-600">Capture Growth</p>
                        <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold tracking-tighter">Camera or Upload for AI Analysis</p>
                      </div>
                    </button>
                  )}
                  
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-20">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-600"></div>
                        <p className="text-emerald-800 font-bold text-sm animate-pulse">AI is analyzing growth...</p>
                      </div>
                    </div>
                  )}
                  
                  <canvas ref={canvasRef} className="hidden" />
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    ref={cameraInputRef}
                    onChange={handleImageUpload}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={startCamera}
                    className="bg-white border-2 border-emerald-600 text-emerald-600 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all text-xs"
                  >
                    <Camera size={16} /> {isLiveCamera ? 'Restart' : 'Camera'}
                  </button>
                  <button
                    onClick={() => {
                      stopCamera();
                      fileInputRef.current?.click();
                    }}
                    className="bg-white border-2 border-emerald-600 text-emerald-600 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all text-xs"
                  >
                    <Upload size={16} /> Gallery
                  </button>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
                    <AlertCircle size={16} />
                    <p className="text-[10px] font-bold">{error}</p>
                  </div>
                )}

                {analysisResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">AI Growth Analysis</h5>
                      <span className="text-[9px] font-bold text-emerald-600 bg-white px-2 py-0.5 rounded-full border border-emerald-100">
                        {Math.round(analysisResult.confidence * 100)}% Confidence
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] font-bold text-emerald-600 uppercase mb-0.5">Stage</p>
                        <p className="text-xs font-black text-emerald-900">{analysisResult.growthStage}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-emerald-600 uppercase mb-0.5">Health</p>
                        <p className="text-xs font-black text-emerald-900">{analysisResult.healthStatus}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 text-white p-6 rounded-[2.5rem] relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <Calendar size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Harvest Prediction</h4>
                  <p className="text-xl font-black text-emerald-400">{harvestDateStr}</p>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                Your {plantName || 'plant'} is expected to reach maturity in <span className="text-white font-bold">{daysLeft} days</span>. This estimate is based on standard growth cycles.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 w-fit px-4 py-2 rounded-full border border-emerald-500/20 uppercase tracking-widest">
                <Sparkles size={12} />
                AI Optimized Cycle
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 p-6 rounded-[2.5rem] border-2 border-emerald-100 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-emerald-200 rounded-xl flex items-center justify-center text-emerald-700">
                <Sparkles size={18} />
              </div>
              <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-widest">Growth Suggestions</h3>
            </div>
            
            <div className="flex-1">
              {aiSuggestions.length > 0 ? (
                <ul className="space-y-3">
                  {aiSuggestions.map((suggestion, i) => (
                    <motion.li 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 bg-white/50 p-3 rounded-2xl border border-emerald-100/50"
                    >
                      <div className="mt-1 w-4 h-4 rounded-full bg-emerald-500 flex-shrink-0 flex items-center justify-center">
                        <CheckCircle2 size={10} className="text-white" />
                      </div>
                      <p className="text-xs text-emerald-900 font-medium leading-relaxed">{suggestion}</p>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-6">
                  <p className="text-xs text-emerald-800 font-bold mb-2">Need expert advice?</p>
                  <p className="text-[10px] text-emerald-600 mb-6 px-4">Get AI-powered care tips tailored to your {plantName}.</p>
                  <button 
                    onClick={handleGetSuggestions}
                    disabled={isAnalyzing}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    Generate Suggestions
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div id="growth-history" className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HistoryIcon className="text-zinc-400" size={20} />
            <h3 className="text-lg font-bold text-zinc-900">Growth History</h3>
          </div>
          <div className="flex gap-2">
            {isSelectionMode ? (
              <>
                <button 
                  onClick={handleDeleteSelected}
                  disabled={selectedHistoryItems.length === 0}
                  className="px-3 py-1.5 bg-red-100 text-red-600 rounded-xl text-[10px] font-bold hover:bg-red-200 transition-all disabled:opacity-50"
                >
                  Delete ({selectedHistoryItems.length})
                </button>
                <button 
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedHistoryItems([]);
                  }}
                  className="px-3 py-1.5 bg-zinc-100 text-zinc-600 rounded-xl text-[10px] font-bold hover:bg-zinc-200 transition-all"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setIsSelectionMode(true)}
                  className="px-3 py-1.5 bg-zinc-100 text-zinc-600 rounded-xl text-[10px] font-bold hover:bg-zinc-200 transition-all"
                >
                  Select
                </button>
                <button 
                  onClick={handleClearAll}
                  className="px-3 py-1.5 bg-zinc-100 text-red-500 rounded-xl text-[10px] font-bold hover:bg-red-50 transition-all"
                >
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Search history..."
            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-zinc-100 rounded-2xl focus:border-emerald-500 outline-none transition-all text-sm"
          />
        </div>

        <div className="space-y-3">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item) => (
              <motion.div 
                key={item.id}
                layout
                className={`bg-white border-2 rounded-3xl p-4 flex items-center gap-4 group transition-all ${
                  selectedHistoryItems.includes(item.id) ? 'border-emerald-500 bg-emerald-50/30' : 'border-zinc-100 hover:border-zinc-200'
                }`}
                onClick={() => isSelectionMode && toggleSelection(item.id)}
              >
                {isSelectionMode && (
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedHistoryItems.includes(item.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-200'
                  }`}>
                    {selectedHistoryItems.includes(item.id) && <CheckCircle2 size={14} />}
                  </div>
                )}
                
                {item.image && (
                  <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border border-zinc-100">
                    <img src={item.image} alt="Log" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {item.type === 'growth_search' ? <Search size={12} className="text-blue-500" /> : <Sparkles size={12} className="text-emerald-500" />}
                    <h4 className="font-bold text-zinc-900 truncate">{item.title}</h4>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">
                    {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-zinc-500 line-clamp-1">{item.details}</p>
                </div>

                {!isSelectionMode && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteHistoryItem(item.id);
                    }}
                    className="p-2 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 bg-zinc-50 rounded-[2.5rem] border-2 border-dashed border-zinc-200">
              <HistoryIcon className="mx-auto text-zinc-300 mb-2" size={32} />
              <p className="text-zinc-500 text-sm font-medium">No history found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
