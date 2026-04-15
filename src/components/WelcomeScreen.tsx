import { motion } from 'motion/react';
import { useApp } from '../AppContext';

export default function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const { t } = useApp();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gradient-to-br from-emerald-50 to-green-50 text-zinc-900">

      {/* 🔥 LOGO ANIMATION */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12 }}
        className="bg-white w-32 h-32 rounded-full flex items-center justify-center mb-8 shadow-xl border border-emerald-50"
      >
        <img
          src="https://iili.io/qD8Qbig.png"
          alt="Smart Urban Farming Logo"
          className="w-28 h-28 object-contain"
          referrerPolicy="no-referrer"
        />
      </motion.div>

      {/* 🔥 TITLE ANIMATION */}
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-4xl font-bold mb-4"
      >
        {t('app_title')}
      </motion.h1>

      {/* 🔥 SUBTITLE */}
      <motion.p
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-emerald-800 mb-12 max-w-xs"
      >
        {t('app_subtitle')}
      </motion.p>

      {/* 🔥 BUTTON ANIMATION */}
      <motion.button
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        className="bg-emerald-600 text-white font-bold py-4 px-12 rounded-full shadow-lg text-lg"
      >
        {t('get_started')}
      </motion.button>

    </div>
  );
}

