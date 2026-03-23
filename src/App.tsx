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
import Navigation from './components/Navigation';
import ChatScreen from './components/ChatScreen';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const { user, loading, isAuthReady, userData, searchPlantAI } = useApp();
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'auth' | 'dashboard' | 'disease' | 'care' | 'growth' | 'balcony' | 'community' | 'tracker' | 'settings' | 'chat'>('welcome');
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
      case 'tracker': return <TrackerScreen />;
      case 'settings': return <SettingsScreen />;
      case 'chat': return <ChatScreen initialQuery={chatQuery} onBack={() => setCurrentScreen('dashboard')} />;
      default: return <DashboardScreen onNavigate={setCurrentScreen} onAskAI={handleAskAI} />;
    }
  };

  const isMainApp = user && currentScreen !== 'welcome' && currentScreen !== 'auth';

  const handleAskAI = (query: string) => {
    setChatQuery(query);
    setCurrentScreen('chat');
  };

  return (
    <div className={`min-h-screen ${userData?.settings?.darkMode ? 'dark bg-zinc-950 text-white' : 'bg-emerald-50 text-zinc-900'} font-sans pb-20 transition-colors duration-300`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="max-w-md mx-auto min-h-screen"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>

      {isMainApp && currentScreen !== 'chat' && (
        <>
          <Navigation current={currentScreen} onNavigate={setCurrentScreen} />
        </>
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
