import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Search, CheckCircle, AlertCircle, Plus, Sparkles, Info, Loader2, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../AppContext';
import { analyzePlantDisease } from '../services/geminiService';
import { PlantAnalysisResult } from '../types';

export default function DiseaseDetectionScreen() {
  const { sensors, addToHistory, t, reportInfection } = useApp();
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<PlantAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      setError("Could not access camera. Please check permissions or use the Gallery option.");
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
        setImage(dataUrl);
        stopCamera();
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Healthy':
      case 'Beneficial Insects Found':
        return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400';
      case 'Pest Infestation':
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
        return 'bg-red-600 text-white';
      default:
        return 'bg-orange-600 text-white';
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image too large. Please select an image under 5MB.');
        return;
      }

      const reader = new FileReader();
      setAnalyzing(true);
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
        setAnalyzing(false);
      };
      reader.onerror = () => {
        setError('Error reading file');
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
      const analysis = await analyzePlantDisease(image, sensors);
      setResult(analysis);
      try {
        console.log("Saving analysis to history...");
        await addToHistory({ 
          type: 'analysis', 
          title: `Disease Scan: ${analysis.plantName}`, 
          details: `${analysis.status} - ${analysis.description}`,
          image: image 
        });
        console.log("Analysis saved to history.");
      } catch (historyErr) {
        console.error("Failed to save analysis to history:", historyErr);
      }
    } catch (err: any) {
      console.error("Analysis Error:", err);
      setError(`Analysis failed: ${err.message || 'Unknown error'}`);
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
    <div className="p-6 pb-24">
      <h2 className="text-2xl font-bold text-emerald-900 mb-2">AI Vision Scanner</h2>
      <p className="text-zinc-500 mb-8">Identify plants, diseases, and beneficial or pest insects instantly.</p>

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
              <div className="absolute inset-0 p-4 pointer-events-none">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute top-10 left-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/50 max-w-[200px] pointer-events-auto"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={16} className="text-orange-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{t('diagnosis')}</span>
                  </div>
                  <p className="text-sm font-bold text-zinc-900">{result.status}</p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="absolute top-32 left-8 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/50 max-w-[200px] pointer-events-auto"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Search size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{t('symptoms')}</span>
                  </div>
                  <p className="text-xs font-medium text-zinc-700">{result.symptoms}</p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="absolute top-56 left-12 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/50 max-w-[200px] pointer-events-auto"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw size={16} className="text-blue-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{t('treatment')}</span>
                  </div>
                  <p className="text-xs font-medium text-zinc-700">{result.treatment}</p>
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
            <div className="flex flex-col items-center text-zinc-400">
              <div className="w-16 h-16 bg-zinc-200 rounded-full flex items-center justify-center mb-3">
                <Plus size={32} className="text-zinc-500" />
              </div>
              <p className="font-bold text-zinc-500">Tap to Capture or Upload</p>
              <p className="text-xs text-zinc-400 mt-1">Camera or Gallery</p>
            </div>
          </button>
        )}
        
        {analyzing && !result && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-600"></div>
              <p className="text-emerald-800 font-bold text-sm animate-pulse">AI is analyzing...</p>
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
          <Camera size={18} /> {isLiveCamera ? 'Restart' : 'Camera'}
        </button>
        <button
          onClick={() => {
            stopCamera();
            fileInputRef.current?.click();
          }}
          className="bg-white border-2 border-emerald-600 text-emerald-600 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Upload size={18} /> Gallery
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
            <span>Analyzing...</span>
          </div>
        ) : (
          <><Search size={20} /> Analyze Plant</>
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
          <div className={`p-6 rounded-3xl border-2 ${getStatusColor(result.status)}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">AI Analysis Result</span>
                <h3 className="text-2xl font-bold text-zinc-900">{result.plantName}</h3>
              </div>
              <div className={`p-2 rounded-xl bg-white/50`}>
                {result.status === 'Healthy' || result.status === 'Beneficial Insects Found' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getBadgeColor(result.status)}`}>
                {result.status}
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                {Math.round(result.confidence * 100)}% Confidence
              </span>
            </div>

            <p className="text-zinc-600 text-sm leading-relaxed">
              {result.description}
            </p>
          </div>

          {/* Suggestions Section */}
          <div className="bg-white p-6 rounded-3xl border-2 border-zinc-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-emerald-600" />
              <h4 className="font-bold text-zinc-900">Care Suggestions</h4>
            </div>
            <div className="space-y-3 mb-6">
              {result.suggestions.map((suggestion, idx) => (
                <div key={idx} className="flex items-start gap-3 group">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    {idx + 1}
                  </div>
                  <p className="text-zinc-600 text-sm">{suggestion}</p>
                </div>
              ))}
            </div>

            {/* Report Button */}
            {result.status !== 'Healthy' && (
              <button
                onClick={handleReport}
                disabled={isReported}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                  isReported 
                    ? 'bg-zinc-100 text-zinc-400 cursor-default' 
                    : 'bg-red-50 text-red-600 border-2 border-red-100 hover:bg-red-100'
                }`}
              >
                {isReported ? (
                  <><CheckCircle size={18} /> Reported to Community</>
                ) : (
                  <><AlertCircle size={18} /> Report Infection to Community</>
                )}
              </button>
            )}
          </div>

          <div className="bg-zinc-50 p-4 rounded-2xl flex items-start gap-3">
            <Info size={18} className="text-zinc-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-500 leading-tight italic">
              AI analysis provides confirmed botanical insights based on visual and environmental data.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
