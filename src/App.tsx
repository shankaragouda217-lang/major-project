import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './AppContext';
import WelcomeScreen from './components/WelcomeScreen';
import AuthScreen from './components/AuthScreen';
import DashboardScreen from './components/DashboardScreen';
import DiseaseDetectionScreen from './components/DiseaseDetectionScreen';
import CareSuggestionsScreen from './components/CareSuggestionsScreen';
import GrowthTrackerScreen from './components/GrowthTrackerScreen';
import BalconyAnalysisScreen from './components/BalconyAnalysisScreen';
import CommunityScreen from './components/CommunityScreen';
import TrackerScreen from './components/TrackerScreen';
import SettingsScreen from './components/SettingsScreen';
import HelpSupportScreen from './components/HelpSupportScreen';
import Navigation from './components/Navigation';
import ChatScreen from './components/ChatScreen';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const { user, loading, isAuthReady, userData, searchPlantAI } = useApp();
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'auth' | 'dashboard' | 'disease' | 'care' | 'growth' | 'balcony' | 'community' | 'tracker' | 'settings' | 'chat' | 'help'>('welcome');
  const [chatQuery, setChatQuery] = useState('');

  useEffect(() => {
    if (isAuthReady && user && currentScreen === 'welcome') {
      setCurrentScreen('dashboard');
    }
  }, [isAuthReady, user, currentScreen]);

  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Simple routing logic
  const renderScreen = () => {
    if (!user) {
      if (currentScreen === 'auth') return <AuthScreen onBack={() => setCurrentScreen('welcome')} />;
      return <WelcomeScreen onStart={() => setCurrentScreen('auth')} />;
    }

    switch (currentScreen) {
      case 'dashboard': return <DashboardScreen onNavigate={setCurrentScreen} onAskAI={handleAskAI} />;
      case 'disease': return <DiseaseDetectionScreen />;
      case 'care': return <CareSuggestionsScreen />;
      case 'growth': return <GrowthTrackerScreen />;
      case 'balcony': return <BalconyAnalysisScreen />;
      case 'community': return <CommunityScreen />;
      case 'tracker': return <TrackerScreen onBack={() => setCurrentScreen('dashboard')} />;
      case 'settings': return <SettingsScreen onNavigate={setCurrentScreen} />;
      case 'help': return <HelpSupportScreen onBack={() => setCurrentScreen('settings')} onNavigate={setCurrentScreen} />;
      case 'chat': return <ChatScreen initialQuery={chatQuery} onBack={() => setCurrentScreen('dashboard')} />;
      default: return <DashboardScreen onNavigate={setCurrentScreen} onAskAI={handleAskAI} />;
    }
  };

  const isMainApp = user && isAuthReady && currentScreen !== 'welcome' && currentScreen !== 'auth';

  const handleAskAI = (query: string) => {
    setChatQuery(query);
    setCurrentScreen('chat');
  };

  return (
    <div className={`min-h-screen w-full relative ${userData?.settings?.darkMode ? 'dark bg-zinc-950 text-white' : 'bg-emerald-50 text-zinc-900'} font-sans transition-colors duration-300`}>
      {/* Global Background Image Layer */}
      <div 
        className="fixed inset-0 z-0 opacity-10 pointer-events-none"
        style={{ 
          backgroundImage: `url('https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=2000')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'saturate(0.5) blur(2px)'
        }}
      />

      <div className={`relative z-10 max-w-md mx-auto ${currentScreen === 'chat' ? '' : 'pb-32'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={currentScreen === 'chat' ? 'h-screen' : ''}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </div>

      {isMainApp && currentScreen !== 'chat' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4 pointer-events-none">
          <div className="max-w-md w-full pointer-events-auto">
            <Navigation current={currentScreen} onNavigate={setCurrentScreen} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
