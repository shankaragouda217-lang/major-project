import { useState, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { Sparkles, ArrowLeft, Bot, User, Loader2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";

export default function ChatScreen({ initialQuery, onBack }: { initialQuery: string, onBack: () => void }) {
  const { allPlants } = useApp();
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<any>(null);
  const hasInitialized = useRef(false);
  const isProcessing = useRef(false);

  const getValidKeys = () => {
    const keys = [
      process.env.GEMINI_API_KEY,
      process.env.VITE_GEMINI_API_KEY,
      process.env.API_KEY,
      (import.meta as any).env?.VITE_GEMINI_API_KEY
    ];
    
    return keys
      .map(k => String(k || '').trim())
      .filter(val => 
        val !== '' && 
        val !== 'undefined' && 
        val !== 'null' && 
        val !== 'YOUR_API_KEY'
      );
  };

  const handleOpenKeySelector = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
    } else {
      alert("Please open Settings (gear icon) -> Secrets in AI Studio to add your GEMINI_API_KEY.");
    }
  };

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const validKeys = getValidKeys();
    if (validKeys.length === 0) {
      setMessages([{ 
        role: 'assistant', 
        content: "### ⚠️ AI Key Missing\n\nThe AI Assistant is currently unavailable because a valid Gemini API key was not found. Your current key might be set to a placeholder like 'AI Studio Free Tier'.\n\n**To fix this:**\n1. Get a real key from [ai.google.dev](https://ai.google.dev/).\n2. Click the button below or open **Settings** (gear icon) -> **Secrets** in AI Studio.\n3. Add a secret named `GEMINI_API_KEY` and paste your actual key string." 
      }]);
      return;
    }

    if (initialQuery) {
      handleAsk(initialQuery);
    }
  }, []);

  const handleAsk = async (query: string) => {
    if (!query.trim() || isProcessing.current) return;
    isProcessing.current = true;
    
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setIsTyping(true);
    setInput('');

    const validKeys = getValidKeys();

    // Local fallback for common plant questions
    const lowerQuery = query.toLowerCase();
    const plantMatch = (allPlants || []).find((p: any) => 
      lowerQuery.includes(p.name.toLowerCase())
    );

    if (plantMatch && (lowerQuery.includes('how to grow') || lowerQuery.includes('care') || lowerQuery.includes('about'))) {
      const localResponse = `### Expert Advice on ${plantMatch.name}\n\n${plantMatch.description}\n\n**Growth Time:** ${plantMatch.growthTime}\n**Requirements:** ${plantMatch.needs}\n**Best Months:** ${plantMatch.suitableMonths}\n\n*Note: This information is from our local botanical database.*`;
      setMessages(prev => [...prev, { role: 'assistant', content: localResponse }]);
      setIsTyping(false);
      isProcessing.current = false;
      return;
    }

    if (validKeys.length === 0) {
      setMessages(prev => [...prev, { role: 'assistant', content: "The AI Assistant is currently unavailable because the Gemini API key is missing. To fix this: 1. Get a key from ai.google.dev. 2. Open Settings (gear icon) -> Secrets in AI Studio. 3. Add 'GEMINI_API_KEY' with your key value. (v3.1)" }]);
      setIsTyping(false);
      isProcessing.current = false;
      return;
    }

    let lastError = null;
    let success = false;

    for (const apiKey of validKeys) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const chat = ai.chats.create({
          model: "gemini-3-flash-preview",
          config: {
            systemInstruction: "You are a highly experienced professional gardening expert. Provide detailed, factual, and definitive advice on growing plants, fruits, and vegetables. When asked about a specific plant, provide its exact requirements (sun, water, soil) and confirmed pest management solutions. Always speak with absolute authority and avoid using hedging language like 'I think', 'maybe', or 'it seems'. Present your advice as confirmed, expert-level solutions.",
          },
        });
        
        const response = await chat.sendMessage({ message: query });
        const text = response.text;
        
        if (!text) {
          throw new Error("Empty response from AI");
        }
        
        setMessages(prev => [...prev, { role: 'assistant', content: text }]);
        success = true;
        break; // Stop after first successful key
      } catch (error: any) {
        console.error(`Chat Error with key starting with ${apiKey.substring(0, 4)}:`, error);
        lastError = error;
        // Continue to next key
      }
    }

    if (!success) {
      const originalMsg = lastError?.message || String(lastError);
      let errorMessage = `Sorry, I encountered an error: ${originalMsg}`;
      
      if (originalMsg.includes('API_KEY_INVALID')) {
        errorMessage = `INVALID_KEY: The API key is not valid or restricted. (${originalMsg})`;
      } else if (originalMsg.includes('PERMISSION_DENIED')) {
        errorMessage = `PERMISSION_DENIED: Gemini API might not be enabled for these keys. (${originalMsg})`;
      } else if (originalMsg.includes('quota')) {
        errorMessage = `QUOTA_EXCEEDED: AI search limit reached on all keys. (${originalMsg})`;
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
    }

    setIsTyping(false);
    isProcessing.current = false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(input);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="p-4 border-b border-zinc-100 flex items-center gap-4 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
            <Sparkles size={18} />
          </div>
          <h1 className="font-bold text-zinc-900">Garden AI Assistant</h1>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 mb-4">
              <Bot size={32} />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">How can I help you today?</h2>
            <p className="text-zinc-500 text-sm">Ask me about any plant, fruit, or vegetable you'd like to grow!</p>
          </div>
        )}
        
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
              <div className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-zinc-900 text-white rounded-tr-none' : 'bg-zinc-50 text-zinc-800 rounded-tl-none border border-zinc-100'}`}>
                <div className="markdown-body">
                  <Markdown>{msg.content}</Markdown>
                </div>
              </div>
            </div>
            
            {msg.content.includes("AI Key Missing") && (
              <button 
                onClick={handleOpenKeySelector}
                className="ml-11 mt-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2"
              >
                <Sparkles size={14} />
                Setup Gemini API Key
              </button>
            )}
          </motion.div>
        ))}
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
              <span className="text-xs text-zinc-500 font-medium">AI is thinking...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-zinc-100 max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up question..."
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
