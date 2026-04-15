import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Search, CheckCircle, AlertCircle, Plus, Sparkles, Info, Loader2, X, RefreshCw, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../AppContext';
import { analyzePlantDisease } from '../services/geminiService';
import { PlantAnalysisResult } from '../types';
import { resizeImage } from '../lib/utils';

export default function DiseaseDetectionScreen() {
  const { sensors, addToHistory, t, reportInfection, currentLanguage } = useApp();
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [isReported, setIsReported] = useState(false);
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
      setImage(null);
      setResult(null);
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(t('camera_error'));
      // Fallback to file input if camera fails
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
        setImage(resized);
        stopCamera();
      }
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case 'Healthy': return t('status_healthy');
      case 'Beneficial Insects Found': return t('status_beneficial');
      case 'Pest Infestation': return t('status_pest');
      case 'Infected': return t('status_infected');
      case 'Leaf Spot': return t('status_leaf_spot');
      case 'Yellow Leaf': return t('status_yellow_leaf');
      case 'Fungus': return t('status_fungus');
      case 'Unknown': return t('status_unknown');
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Healthy':
      case 'Beneficial Insects Found':
        return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400';
      case 'Pest Infestation':
      case 'Infected':
        return 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400';
      default:
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30 text-orange-600 dark:text-orange-400';
    }
  };

  const getBadgeColor = (status: string) => {
    switch (status) {
      case 'Healthy':
      case 'Beneficial Insects Found':
        return 'bg-emerald-600 text-white';
      case 'Pest Infestation':
      case 'Infected':
        return 'bg-red-600 text-white';
      default:
        return 'bg-orange-600 text-white';
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError(t('image_too_large'));
        return;
      }

      const reader = new FileReader();
      setAnalyzing(true);
      reader.onloadend = async () => {
        const resized = await resizeImage(reader.result as string);
        setImage(resized);
        setResult(null);
        setError(null);
        setAnalyzing(false);
      };
      reader.onerror = () => {
        setError(t('error_reading_file'));
        setAnalyzing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setAnalyzing(true);
    setResult(null);
    setError(null);
    setIsReported(false);
    try {
      const analysis = await analyzePlantDisease(image, sensors, currentLanguage);
      
      // If description is an error key, translate it
      if (analysis.description.startsWith('ai_error_')) {
        setError(t(analysis.description as any));
        setAnalyzing(false);
        return;
      }

      setResult(analysis);
      const newAnalysisId = `analysis_${Date.now()}`;
      setAnalysisId(newAnalysisId);

      try {
        await addToHistory({ 
          type: 'analysis', 
          title: `${t('disease_scan_title')}: ${analysis.plantName}`, 
          details: t('disease_scan_details', {
            status: translateStatus(analysis.status),
            description: analysis.description
          }),
          image: image 
        });
      } catch (historyErr) {
        console.error("Failed to save analysis to history:", historyErr);
      }
    } catch (err: any) {
      console.error("Analysis Error:", err);
      const errorMsg = err.message?.startsWith('ai_error_') ? t(err.message) : (err.message || t('unknown_error'));
      setError(`${t('analysis_failed')}: ${errorMsg}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReport = async () => {
    if (!result || isReported) return;
    try {
      await reportInfection({
        plantName: result.plantName,
        status: result.status,
        description: result.description,
        image: image
      });
      setIsReported(true);
    } catch (err) {
      console.error("Failed to report:", err);
    }
  };

  return (
    <div className="min-h-screen p-6 pb-32">
      <h2 className="text-2xl font-bold text-emerald-900 mb-2">{t('disease_scanner_title')}</h2>
      <p className="text-zinc-900 mb-8">{t('disease_scanner_desc')}</p>

      <div className="aspect-square w-full bg-zinc-100 rounded-3xl border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center overflow-hidden relative mb-6 shadow-inner">
        {isLiveCamera ? (
          <div className="relative w-full h-full bg-black">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 px-6">
              <button 
                onClick={stopCamera}
                className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30"
              >
                <X size={24} />
              </button>
              <button 
                onClick={capturePhoto}
                className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-xl border-4 border-emerald-100"
              >
                <div className="w-12 h-12 rounded-full border-2 border-emerald-600 flex items-center justify-center">
                  <div className="w-8 h-8 bg-emerald-600 rounded-full" />
                </div>
              </button>
              <div className="w-12 h-12" /> {/* Spacer for balance */}
            </div>
          </div>
        ) : image ? (
          <div className="relative w-full h-full">
            <img src={image} alt="Plant" className="w-full h-full object-cover" />
            
            {/* Floating Result Cards */}
            {result && !analyzing && (
              <div className="absolute inset-0 p-4 pointer-events-none flex flex-col gap-2 items-start overflow-y-auto max-h-full scrollbar-hide">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/50 max-w-[220px] pointer-events-auto"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={16} className="text-orange-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-800">{t('diagnosis')}</span>
                  </div>
                  <p className="text-sm font-bold text-zinc-900">{result.status}</p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/50 max-w-[220px] pointer-events-auto"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Search size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-800">{t('symptoms')}</span>
                  </div>
                  <p className="text-xs font-medium text-zinc-900 leading-tight">{result.symptoms}</p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/50 max-w-[220px] pointer-events-auto"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw size={16} className="text-blue-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-800">{t('treatment')}</span>
                  </div>
                  <p className="text-xs font-medium text-zinc-900 leading-tight">{result.treatment}</p>
                </motion.div>
              </div>
            )}

            <button 
              onClick={() => setImage(null)}
              className="absolute top-4 right-4 w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => !analyzing && startCamera()}
            className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-200 transition-colors"
          >
            <div className="flex flex-col items-center text-zinc-800">
              <div className="w-16 h-16 bg-zinc-200 rounded-full flex items-center justify-center mb-3">
                <Plus size={32} className="text-zinc-900" />
              </div>
              <p className="font-bold text-zinc-900">{t('tap_to_capture')}</p>
              <p className="text-xs text-zinc-800 mt-1">{t('camera_gallery')}</p>
            </div>
          </button>
        )}
        
        {analyzing && !result && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-600"></div>
              <p className="text-emerald-800 font-bold text-sm animate-pulse">{t('analyzing')}</p>
            </div>
          </div>
        )}
        
        <canvas ref={canvasRef} className="hidden" />
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImageUpload}
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

      <div className="grid grid-cols-2 gap-3 mb-3">
        <button
          onClick={startCamera}
          className="bg-white border-2 border-emerald-600 text-emerald-600 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Camera size={18} /> {isLiveCamera ? t('restart') : t('camera')}
        </button>
        <button
          onClick={() => {
            stopCamera();
            fileInputRef.current?.click();
          }}
          className="bg-white border-2 border-emerald-600 text-emerald-600 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Upload size={18} /> {t('gallery')}
        </button>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={!image || analyzing}
        className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50 mb-8 active:scale-[0.98] transition-all"
      >
        {analyzing ? (
          <div className="flex items-center gap-2">
            <Loader2 size={20} className="animate-spin" />
            <span>{t('analyzing')}</span>
          </div>
        ) : (
          <><Search size={20} /> {t('analyze_plant')}</>
        )}
      </button>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 mb-8">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Main Result Card */}
          <div className={`p-6 rounded-3xl border-2 ${getStatusColor(result.status)} shadow-sm relative overflow-hidden`}>
            {result.confidence && (
              <div className="absolute top-6 right-6 flex flex-col items-end">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-800 mb-1">{t('confidence')}</span>
                <span className="text-lg font-black text-emerald-600">{Math.round(result.confidence * 100)}%</span>
              </div>
            )}
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-800 mb-1 block">{t('analysis_result')}</span>
                <h3 className="text-2xl font-bold text-zinc-900 leading-tight">{result.plantName}</h3>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${getBadgeColor(result.status)}`}>
                {translateStatus(result.status)}
              </span>
            </div>

            {result.why && (
              <div className="mb-6 p-4 bg-white/50 rounded-2xl border border-white/20">
                <h4 className="text-[10px] font-black text-zinc-800 uppercase tracking-widest mb-2">{t('why_diagnosis')}</h4>
                <p className="text-xs font-medium text-zinc-900 leading-relaxed">{result.why}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div>
                <h4 className="text-[10px] font-black text-zinc-800 uppercase tracking-widest mb-2">{t('symptoms')}</h4>
                <p className="text-xs font-medium text-zinc-800 leading-relaxed">{result.symptoms}</p>
              </div>
              <div>
                <h4 className="text-[10px] font-black text-zinc-800 uppercase tracking-widest mb-2">{t('treatment')}</h4>
                <p className="text-xs font-bold text-zinc-800 leading-relaxed">{result.treatment}</p>
              </div>
            </div>
          </div>

          {/* Action Checklist */}
          {result.checklist && (
            <div className="bg-white p-6 rounded-[2.5rem] border-2 border-zinc-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Zap size={20} />
                </div>
                <h3 className="text-lg font-bold text-zinc-900">{t('action_checklist')}</h3>
              </div>
              <div className="space-y-4">
                {result.checklist.map((item: string, i: number) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-5 h-5 rounded-full border-2 border-emerald-200 flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    </div>
                    <p className="text-sm font-medium text-zinc-900 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expert Recommendations Section */}
          <div className="space-y-4">
            {/* Fertilizer & Soil Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.fertilizerSuggestion && (
                <div className="bg-white p-6 rounded-3xl border-2 border-zinc-100 shadow-sm hover:border-emerald-100 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Sparkles size={20} />
                    </div>
                    <h4 className="font-bold text-zinc-900">{t('fertilizer_guide')}</h4>
                  </div>
                  <p className="text-zinc-800 text-sm leading-relaxed">
                    {result.fertilizerSuggestion}
                  </p>
                </div>
              )}

              {result.soilAdvice && (
                <div className="bg-white p-6 rounded-3xl border-2 border-zinc-100 shadow-sm hover:border-blue-100 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <Info size={20} />
                    </div>
                    <h4 className="font-bold text-zinc-900">{t('soil_health')}</h4>
                  </div>
                  <p className="text-zinc-800 text-sm leading-relaxed">
                    {result.soilAdvice}
                  </p>
                </div>
              )}
            </div>

            {/* Suggestions Checklist */}
            <div className="bg-zinc-900 p-6 rounded-3xl shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400">
                  <CheckCircle size={20} />
                </div>
                <h4 className="font-bold text-white">{t('action_checklist')}</h4>
              </div>
              <div className="space-y-4">
                {result.suggestions.map((suggestion, idx) => (
                  <div key={idx} className="flex items-start gap-4 group">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 border border-emerald-500/30">
                      {idx + 1}
                    </div>
                    <p className="text-zinc-300 text-sm leading-snug font-medium">{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Report Button */}
          {result.status !== 'Healthy' && (
            <button
              onClick={handleReport}
              disabled={isReported}
              className={`w-full py-5 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-lg active:scale-[0.98] ${
                isReported 
                  ? 'bg-zinc-100 text-zinc-400 cursor-default border-2 border-zinc-200' 
                  : 'bg-red-600 text-white hover:bg-red-700 shadow-red-200'
              }`}
            >
              {isReported ? (
                <><CheckCircle size={18} /> {t('reported_to_community')}</>
              ) : (
                <><AlertCircle size={18} /> {t('alert_community')}</>
              )}
            </button>
          )}

          <div className="bg-zinc-50 p-5 rounded-3xl flex items-start gap-4 border border-zinc-100">
            <Info size={20} className="text-zinc-800 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-900 leading-relaxed font-medium">
              <span className="font-black uppercase tracking-tighter mr-1">{t('note')}:</span>
              {t('ai_note')}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
