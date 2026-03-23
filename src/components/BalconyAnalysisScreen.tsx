import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Send, Leaf, Info, MapPin, Sun, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../AppContext';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function BalconyAnalysisScreen() {
  const { addToHistory } = useApp();
  const [image, setImage] = useState<string | null>(null);
  const [plantInput, setPlantInput] = useState('');
  const [balconyDetails, setBalconyDetails] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isLiveCamera, setIsLiveCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      setAnalysisResult(null);
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please check permissions or use the Gallery option.");
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeBalcony = async () => {
    if (!image || !plantInput.trim()) return;

    setIsAnalyzing(true);
    try {
      const base64Data = image.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data
            }
          },
          {
            text: `You are a professional landscape architect and structural engineer. Analyze this balcony image and provide a definitive assessment for growing these plants: ${plantInput}. 
            ${balconyDetails ? `The user provided these additional details about their balcony: ${balconyDetails}. Use this information to refine your assessment.` : ''}
            
            1. Estimate the balcony dimensions (width, depth) based on visual cues (tiles, railings, furniture). If the user provided dimensions, verify them against the image and use them as the primary source of truth.
            2. Determine if it is physically and environmentally FEASIBLE to grow these specific plants (especially large ones like Mango trees) in this space.
            3. If a plant is NOT feasible (e.g., a standard Mango tree in a 2ft balcony, or a sun-loving plant in a full-shade balcony), you MUST state it is "Not Feasible" and explain why.
            4. For feasible plants, provide precise placement and sunlight levels.
            
            Avoid using hedging language. State your measurements and feasibility as expert-level facts.`
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              estimatedDimensions: { type: Type.STRING, description: "Estimated width and depth of the balcony" },
              isFeasible: { type: Type.BOOLEAN, description: "Whether the requested plants can actually grow here" },
              feasibilityReason: { type: Type.STRING, description: "Detailed explanation if not feasible, or confirmation if it is" },
              overallAssessment: { type: Type.STRING, description: "General assessment of the balcony's sunlight and space" },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    plantName: { type: Type.STRING },
                    placement: { type: Type.STRING, description: "Specific location on the balcony" },
                    explanation: { type: Type.STRING, description: "Why this spot is optimal or why it's the only choice" },
                    sunlightLevel: { type: Type.STRING, description: "Expected sunlight in this spot" },
                    isPossible: { type: Type.BOOLEAN, description: "Is this specific plant possible in this specific space?" }
                  },
                  required: ["plantName", "placement", "explanation", "sunlightLevel", "isPossible"]
                }
              },
              tips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "General balcony gardening tips based on the layout"
              }
            },
            required: ["estimatedDimensions", "isFeasible", "feasibilityReason", "overallAssessment", "recommendations", "tips"]
          }
        }
      });

      if (response.text) {
        const result = JSON.parse(response.text);
        setAnalysisResult(result);
        addToHistory({ 
          type: 'analysis', 
          title: `Balcony Plan: ${plantInput}`, 
          details: `${balconyDetails ? `User Details: ${balconyDetails} | ` : ''}${result.overallAssessment}`,
          image: image 
        });
      }
    } catch (error) {
      console.error("Balcony Analysis Error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-6 pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-zinc-900 leading-tight whitespace-nowrap">Balcony Planner</h1>
        <p className="text-zinc-500 text-sm mt-2">AI-powered spatial & sunlight analysis for your plants.</p>
      </header>

      <div className="space-y-6">
        {/* Image Upload Section */}
        <section>
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">1. Balcony Photo</h2>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button 
              onClick={startCamera}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${isLiveCamera ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white border-zinc-100 text-zinc-600 hover:border-zinc-200'}`}
            >
              <Camera size={24} />
              <span className="text-[10px] font-bold uppercase">Camera</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-2xl border-2 bg-white border-zinc-100 text-zinc-600 hover:border-zinc-200 flex flex-col items-center gap-2 transition-all"
            >
              <Upload size={24} />
              <span className="text-[10px] font-bold uppercase">Gallery</span>
            </button>
          </div>

          <div className={`aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden relative ${image || isLiveCamera ? 'border-emerald-500' : 'border-zinc-200 bg-zinc-50'}`}>
            {isLiveCamera ? (
              <div className="relative w-full h-full bg-black">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
                  <button 
                    onClick={stopCamera}
                    className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all"
                  >
                    <X size={20} />
                  </button>
                  <button 
                    onClick={capturePhoto}
                    className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
                  >
                    <div className="w-10 h-10 rounded-full border-2 border-zinc-900" />
                  </button>
                  <button 
                    onClick={startCamera}
                    className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all"
                  >
                    <RefreshCw size={20} />
                  </button>
                </div>
              </div>
            ) : image ? (
              <>
                <img src={image} alt="Balcony" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setImage(null)}
                  className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-all"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <div className="text-center px-6">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-zinc-400 mx-auto mb-3">
                  <Camera size={24} />
                </div>
                <p className="text-xs font-bold text-zinc-500">Capture or upload a photo of your balcony</p>
                <p className="text-[10px] text-zinc-400 mt-1">AI needs a clear view to analyze space & sunlight</p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          
          {error && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600">
              <Info size={14} />
              <p className="text-[10px] font-bold">{error}</p>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </section>

        {/* Plant Input Section */}
        <section>
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">2. Which plants do you want to grow?</h2>
          <div className="relative">
            <input
              type="text"
              value={plantInput}
              onChange={(e) => setPlantInput(e.target.value)}
              placeholder="e.g. Tomato, Basil, Cucumber..."
              className="w-full bg-white border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-emerald-500 transition-all shadow-sm"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300">
              <Leaf size={18} />
            </div>
          </div>
          <p className="text-[10px] text-zinc-400 mt-2 ml-1 italic">Separate multiple plants with commas</p>
        </section>

        {/* Optional Balcony Details Section */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">3. Balcony Details (Optional)</h2>
            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Optional</span>
          </div>
          <div className="relative">
            <textarea
              value={balconyDetails}
              onChange={(e) => setBalconyDetails(e.target.value)}
              placeholder="e.g. Length: 10ft, Width: 4ft, East facing, high wind area..."
              rows={3}
              className="w-full bg-white border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-emerald-500 transition-all shadow-sm resize-none"
            />
          </div>
          <p className="text-[10px] text-zinc-400 mt-2 ml-1 italic">Provide dimensions or orientation for a more accurate plan</p>
        </section>

        {/* Action Button */}
        <button
          onClick={analyzeBalcony}
          disabled={!image || !plantInput.trim() || isAnalyzing}
          className={`w-full py-4 rounded-3xl font-bold flex items-center justify-center gap-2 transition-all ${
            !image || !plantInput.trim() || isAnalyzing
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              : 'bg-zinc-900 text-white shadow-xl shadow-zinc-200 active:scale-95'
          }`}
        >
          {isAnalyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing Space...
            </>
          ) : (
            <>
              <Send size={18} />
              Get Placement Plan
            </>
          )}
        </button>

        {/* Results Section */}
        <AnimatePresence>
          {analysisResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 pt-4"
            >
              <div className="flex gap-4">
                <div className="flex-1 bg-zinc-900 p-4 rounded-3xl text-white">
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mb-1">Estimated Size</p>
                  <p className="text-lg font-black">{analysisResult.estimatedDimensions}</p>
                </div>
                <div className={`flex-1 p-4 rounded-3xl border-2 ${analysisResult.isFeasible ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-rose-50 border-rose-100 text-rose-900'}`}>
                  <p className="text-[10px] uppercase font-bold tracking-widest mb-1">Feasibility</p>
                  <p className="text-lg font-black">{analysisResult.isFeasible ? 'Possible' : 'Not Possible'}</p>
                </div>
              </div>

              <div className={`${analysisResult.isFeasible ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'} p-6 rounded-3xl border`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${analysisResult.isFeasible ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    <Info size={18} />
                  </div>
                  <h3 className={`font-bold ${analysisResult.isFeasible ? 'text-emerald-900' : 'text-rose-900'}`}>
                    {analysisResult.isFeasible ? 'Expert Assessment' : 'Why it won\'t work'}
                  </h3>
                </div>
                <p className={`text-sm leading-relaxed ${analysisResult.isFeasible ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {analysisResult.feasibilityReason}
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Plant-by-Plant Breakdown</h2>
                {analysisResult.recommendations.map((rec: any, idx: number) => (
                  <motion.div
                    key={rec.plantName}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`p-5 rounded-3xl border shadow-sm ${rec.isPossible ? 'bg-white border-zinc-100' : 'bg-zinc-50 border-zinc-200 opacity-80'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${rec.isPossible ? 'bg-zinc-50 text-emerald-600' : 'bg-zinc-200 text-zinc-400'}`}>
                          <Leaf size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900">{rec.plantName}</h4>
                          {!rec.isPossible && <span className="text-[9px] font-black text-rose-500 uppercase">Not Recommended</span>}
                        </div>
                      </div>
                      {rec.isPossible && (
                        <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full text-amber-600">
                          <Sun size={14} />
                          <span className="text-[10px] font-bold uppercase">{rec.sunlightLevel}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-start gap-3 mb-3">
                      <MapPin size={16} className={`${rec.isPossible ? 'text-emerald-500' : 'text-zinc-400'} mt-0.5 flex-shrink-0`} />
                      <div>
                        <p className={`text-xs font-bold ${rec.isPossible ? 'text-zinc-900' : 'text-zinc-500'}`}>{rec.placement}</p>
                        <p className="text-xs text-zinc-500 leading-relaxed mt-1">{rec.explanation}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="bg-zinc-900 p-6 rounded-3xl text-white">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  Pro Tips
                </h3>
                <ul className="space-y-3">
                  {analysisResult.tips.map((tip: string, idx: number) => (
                    <li key={idx} className="text-xs text-zinc-400 flex gap-3">
                      <span className="text-emerald-400 font-bold">{idx + 1}.</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
