import { motion } from 'motion/react';
import { Sprout } from 'lucide-react';
import { useApp } from '../AppContext';

export default function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const { t } = useApp();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gradient-to-br from-emerald-500 to-green-700 text-white">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12 }}
        className="bg-white/20 p-6 rounded-full mb-8 backdrop-blur-md"
      >
        <Sprout size={80} className="text-white" />
      </motion.div>
      
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-4xl font-bold mb-4"
      >
        {t('welcome_title')}
      </motion.h1>
      
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-emerald-50 mb-12 max-w-xs"
      >
        {t('welcome_subtitle')}
      </motion.p>
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        className="bg-white text-emerald-700 font-bold py-4 px-12 rounded-full shadow-lg text-lg"
      >
        {t('get_started')}
      </motion.button>
    </div>
  );
}
