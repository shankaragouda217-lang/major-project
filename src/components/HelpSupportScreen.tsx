import { useState } from 'react';
import { useApp } from '../AppContext';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { HelpCircle, Search, ChevronRight, MessageSquare, Mail, Phone, ExternalLink, Book, Shield, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-zinc-100 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-center justify-between text-left group"
      >
        <span className="font-bold text-zinc-800 group-hover:text-emerald-600 transition-colors">{question}</span>
        <ChevronRight size={18} className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pb-4 text-sm text-zinc-500 leading-relaxed markdown-body">
              <Markdown>{answer}</Markdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function HelpSupportScreen({ onBack, onNavigate }: { onBack: () => void, onNavigate: (s: any) => void }) {
  const { t, user, userData } = useApp();
  const [activeGuide, setActiveGuide] = useState<'getting-started' | 'plant-safety' | null>(null);
  const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: "Hello! I'm your Garden Support Assistant. How can I help you today?" }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const faqs = [
    {
      question: "Support AI vs. Garden AI: What's the difference?",
      answer: "Support AI (here) is for app help, troubleshooting, and general gardening tips. 'Ask Garden AI' (on the home screen) is for deep analysis of your specific plants, identifying diseases from photos, and detailed care plans."
    },
    {
      question: "How does the Soil Moisture sensor work?",
      answer: "Our system uses advanced algorithms to simulate real-time soil moisture based on your last watering time, local temperature, and humidity. For the best accuracy, ensure you tap 'I just watered my plant' whenever you water."
    },
    {
      question: "How do I use the AI Plant Detection?",
      answer: "Go to the 'Track Growth' screen and tap the camera icon. You can either take a live photo or upload one from your gallery. Our AI will analyze the plant's health and provide expert advice."
    },
    {
      question: "What are Disease Alerts?",
      answer: "Disease Alerts are real-time notifications based on local weather patterns and community reports. If conditions in your area favor specific pests or diseases (like high humidity for Blight), we'll warn you instantly."
    },
    {
      question: "Can I use the app offline?",
      answer: "While some features like basic sensor tracking work offline using cached data, AI analysis and community features require an active internet connection."
    },
    {
      question: "How do I change the app language?",
      answer: "You can change the language in Settings > Language. We currently support English, Hindi, Tamil, Telugu, and Kannada."
    }
  ];

  const guideContent = {
    'getting-started': {
      title: 'Getting Started',
      icon: <Zap size={32} className="text-emerald-600" />,
      color: 'bg-emerald-50',
      steps: [
        { title: 'Add your first plant', desc: 'Use the search bar on the home screen to find your plant and add it to your garden.' },
        { title: 'Track growth', desc: 'Take photos of your plant regularly to see its progress over time.' },
        { title: 'Monitor sensors', desc: 'Keep an eye on moisture, temperature, and light levels to keep your plant happy.' }
      ]
    },
    'plant-safety': {
      title: 'Plant Safety',
      icon: <Shield size={32} className="text-blue-600" />,
      color: 'bg-blue-50',
      steps: [
        { title: 'Avoid overwatering', desc: 'Check the soil moisture sensor before watering. Most plants prefer to dry out slightly.' },
        { title: 'Watch for pests', desc: 'Check under leaves regularly for small insects or unusual spots.' },
        { title: 'Check Disease Alerts', desc: 'We notify you when local conditions are risky for common plant diseases.' }
      ]
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMsg,
        config: {
          systemInstruction: "You are a helpful Garden Support Assistant for the 'Garden Intelligence' app. Answer questions about gardening and how to use the app. Keep responses concise and friendly."
        }
      });
      
      setChatMessages(prev => [...prev, { role: 'ai', text: response.text || "I'm sorry, I couldn't process that. How else can I help?" }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'ai', text: "I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      <header className="p-6 flex items-center gap-4 border-b border-zinc-50 sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button onClick={onBack} className="p-2 bg-zinc-100 rounded-full text-zinc-600 active:scale-90 transition-transform">
          <ChevronRight size={20} className="rotate-180" />
        </button>
        <h1 className="text-xl font-bold text-zinc-900">{t('help_support')}</h1>
      </header>

      <div className="p-6 space-y-8">
        {/* Quick Guides */}
        <section>
          <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 ml-1">Quick Guides</h2>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setActiveGuide('getting-started')}
              className="p-4 bg-emerald-50 rounded-[2rem] border border-emerald-100 text-left group active:scale-95 transition-all"
            >
              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm mb-3">
                <Zap size={20} />
              </div>
              <h3 className="font-bold text-emerald-900 text-sm mb-1">Getting Started</h3>
              <p className="text-[10px] text-emerald-700/60 font-medium leading-tight">Learn the basics of garden tracking.</p>
            </button>
            <button 
              onClick={() => setActiveGuide('plant-safety')}
              className="p-4 bg-blue-50 rounded-[2rem] border border-blue-100 text-left group active:scale-95 transition-all"
            >
              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm mb-3">
                <Shield size={20} />
              </div>
              <h3 className="font-bold text-blue-900 text-sm mb-1">Plant Safety</h3>
              <p className="text-[10px] text-blue-700/60 font-medium leading-tight">How to protect your plants from pests.</p>
            </button>
          </div>
        </section>

        {/* FAQs */}
        <section>
          <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2 ml-1">Frequently Asked Questions</h2>
          <div className="bg-white rounded-3xl border border-zinc-100 px-5 shadow-sm">
            {faqs.map((faq, idx) => (
              <FAQItem key={idx} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </section>

        {/* Contact Support */}
        <section>
          <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 ml-1">Contact Support</h2>
          <div className="space-y-3">
            <button 
              onClick={() => setIsLiveChatOpen(true)}
              className="w-full flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 active:scale-[0.98] transition-all relative"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-600 shadow-sm">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-800 text-sm">Live Chat</h4>
                  <p className="text-[10px] text-zinc-500 font-medium">Chat with Support AI</p>
                </div>
              </div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </button>
          </div>
        </section>

        {/* Community Links */}
        <section className="bg-zinc-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <HelpCircle size={80} />
          </div>
          <h3 className="text-xl font-bold mb-2 relative z-10">Still need help?</h3>
          <p className="text-sm text-zinc-400 mb-6 relative z-10">Join our community of 50,000+ gardeners and get advice from experts.</p>
          <button 
            onClick={() => onNavigate('community')}
            className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all relative z-10"
          >
            Join Community
          </button>
        </section>
      </div>

      {/* Guide Modal */}
      <AnimatePresence>
        {activeGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className={`p-8 ${guideContent[activeGuide].color} flex flex-col items-center text-center relative`}>
                <button 
                  onClick={() => setActiveGuide(null)}
                  className="absolute top-4 left-4 p-2 bg-white/50 rounded-full text-zinc-600 hover:bg-white transition-colors"
                >
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-4">
                  {guideContent[activeGuide].icon}
                </div>
                <h3 className="text-xl font-bold text-zinc-900">{guideContent[activeGuide].title}</h3>
              </div>
              <div className="p-8 space-y-6">
                {guideContent[activeGuide].steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center text-[10px] font-black text-zinc-400">
                      0{idx + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-800 text-sm mb-1">{step.title}</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => setActiveGuide(null)}
                  className="w-full py-4 bg-zinc-900 text-white font-bold rounded-2xl mt-4 active:scale-95 transition-all"
                >
                  Got it!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Chat Modal */}
      <AnimatePresence>
        {isLiveChatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md h-[70vh] rounded-[40px] flex flex-col overflow-hidden shadow-2xl"
            >
              <header className="p-6 bg-emerald-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold">Support AI</h3>
                    <p className="text-[10px] opacity-80">Always active</p>
                  </div>
                </div>
                <button onClick={() => setIsLiveChatOpen(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                  <X size={20} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-3xl text-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-zinc-800 border border-zinc-100 rounded-tl-none shadow-sm'}`}>
                      <div className="markdown-body">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-zinc-100 shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-zinc-100 flex gap-2">
                <input 
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                />
                <button 
                  type="submit"
                  disabled={!inputMessage.trim() || isTyping}
                  className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50"
                >
                  <ChevronRight size={24} />
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
