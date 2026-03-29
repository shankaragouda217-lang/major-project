import { useState, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { Sparkles, ArrowLeft, Bot, User, Loader2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { getAIErrorKey } from '../services/geminiService';

export default function ChatScreen({ initialQuery, onBack }: { initialQuery: string, onBack: () => void }) {
  const { allPlants, sensors, cityName, currentLanguage, t } = useApp();
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const isProcessing = useRef(false);

  const handleOpenKeySelector = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
    }
  };

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (initialQuery) {
      handleAsk(initialQuery);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleAsk = async (query: string) => {
    if (!query.trim() || isProcessing.current) return;
    isProcessing.current = true;
    
    const userMessage = { role: 'user' as const, content: query };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setInput('');

    // Local fallback for common plant questions
    const lowerQuery = query.toLowerCase();
    const plantMatch = (allPlants || []).find((p: any) => 
      lowerQuery.includes(p.name.toLowerCase())
    );

    if (plantMatch && (lowerQuery.includes('how to grow') || lowerQuery.includes('care') || lowerQuery.includes('about'))) {
      const plantKey = plantMatch.name.toLowerCase().replace(/\s+/g, '_').replace(/\(.*\)/, '').trim();
      const expertAdviceHeader = currentLanguage === 'en' 
        ? `${t('expert_advice')} ${t(plantKey)}`
        : `${t(plantKey)} ${t('expert_advice')}`;
      const localResponse = `### ${expertAdviceHeader}\n\n${t(plantKey + '_desc')}\n\n**${t('growth_cycle')}**: ${plantMatch.growthTime}\n**${t('key_requirements')}**: ${plantMatch.needs}\n**${t('best_months')}**: ${plantMatch.suitableMonths}\n\n*${t('local_database_note')}*`;
      setMessages(prev => [...prev, { role: 'assistant', content: localResponse }]);
      setIsTyping(false);
      isProcessing.current = false;
      return;
    }

    const systemInstruction = `You are a highly experienced professional gardening expert. Provide detailed, factual, and definitive advice on growing plants, fruits, and vegetables. 
    
    IMPORTANT: Respond ONLY in ${currentLanguage === 'kn' ? 'Kannada' : currentLanguage === 'hi' ? 'Hindi' : currentLanguage === 'ta' ? 'Tamil' : 'English'}.
    
    CURRENT CONTEXT:
    - Location: ${cityName || 'Unknown'}
    - Temperature: ${sensors.temp}°C
    - Humidity: ${sensors.humidity}%
    - Light Level: ${sensors.light}%
    - Weather Condition: ${sensors.condition}
    
    When asked about a specific plant, provide its exact requirements (sun, water, soil) and confirmed pest management solutions. Use the current weather and sensor data to provide more accurate, localized advice. Always speak with absolute authority and avoid using hedging language like 'I think', 'maybe', or 'it seems'. Present your advice as confirmed, expert-level solutions.`;

    if (!process.env.GEMINI_API_KEY) {
      const errorMessage = t('ai_error_api_key');
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${errorMessage}` }]);
      setIsTyping(false);
      isProcessing.current = false;
      return;
    }

    const history = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    let assistantContent = "";
    setMessages(prev => [...prev, { role: 'assistant', content: "" }]);
    setIsTyping(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const streamResponse = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: [
          ...history,
          { role: 'user', parts: [{ text: query }] }
        ],
        config: {
          systemInstruction: systemInstruction
        }
      });

      for await (const chunk of streamResponse) {
        if (chunk.text) {
          assistantContent += chunk.text;
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = assistantContent;
            return newMessages;
          });
        }
      }
    } catch (error: any) {
      console.error("Chat Stream Error:", error);
      const errorKey = getAIErrorKey(error);
      const errorMessage = t(errorKey as any);
      
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = `Sorry, I encountered an error: ${errorMessage}`;
        return newMessages;
      });
    }

    setIsTyping(false);
    isProcessing.current = false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(input);
  };

  return (
    <div className="flex flex-col bg-white h-full">
      <header className="p-4 border-b border-zinc-100 flex items-center gap-4 bg-white shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-emerald-100 shadow-sm">
            <img 
              src="https://iili.io/qD8Qbig.png" 
              alt="Logo" 
              className="w-8 h-8 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">{t('garden_ai_assistant')}</h1>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 p-4 space-y-6 overflow-y-auto">
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center text-center p-4 pt-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 mb-4">
              <Bot size={32} />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">{t('how_can_i_help')}</h2>
            <p className="text-zinc-900 text-base">{t('ask_about_plant')}</p>
          </div>
        )}
        
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col gap-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} w-full`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-zinc-100 text-zinc-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`max-w-[85%] p-4 rounded-3xl text-base leading-relaxed ${msg.role === 'user' ? 'bg-zinc-900 text-white rounded-tr-none' : 'bg-zinc-50 text-zinc-800 rounded-tl-none border border-zinc-100'}`}>
                  <div className="markdown-body">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              </div>
              
              {msg.role === 'assistant' && (msg.content.includes(t('ai_error_api_key')) || msg.content.includes("API Key Missing")) && (
                <button 
                  onClick={handleOpenKeySelector}
                  className="ml-11 mt-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2"
                >
                  <Sparkles size={14} />
                  {t('setup_gemini_key')}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="bg-zinc-50 p-4 rounded-3xl rounded-tl-none border border-zinc-100 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-emerald-600" />
              <span className="text-xs text-zinc-900 font-medium">{t('ai_thinking')}</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */} 
      <div className="p-4 bg-white border-t border-zinc-100">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('ask_follow_up')}
            className="flex-1 bg-zinc-100 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={isTyping || !input.trim()}
            className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:bg-zinc-300"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
