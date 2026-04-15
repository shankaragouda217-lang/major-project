import { Droplets, Sun, Thermometer, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../AppContext';

const SuggestionCard = ({ title, advice, icon: Icon, color }: any) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className={`p-6 rounded-3xl border-2 flex gap-4 mb-4 ${color}`}
  >
    <div className="p-3 bg-white/50 rounded-2xl h-fit">
      <Icon size={24} />
    </div>
    <div>
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="text-sm opacity-90">{advice}</p>
    </div>
  </motion.div>
);

export default function CareSuggestionsScreen() {
  const { sensors, t } = useApp();

  const getWateringAdvice = () => {
    const value = Math.round(sensors.moisture);
    if (sensors.moisture < 30) return t('moisture_low', { value });
    if (sensors.moisture < 50) return t('moisture_moderate', { value });
    return t('moisture_good', { value });
  };

  const getSunlightAdvice = () => {
    const value = Math.round(sensors.light);
    if (sensors.light < 30) return t('light_low', { value });
    return t('light_optimal', { value });
  };

  const getTempAdvice = () => {
    const value = Math.round(sensors.temp);
    if (sensors.temp > 30) return t('temp_warm', { value });
    if (sensors.temp < 18) return t('temp_cool', { value });
    return t('temp_perfect', { value });
  };

  return (
    <div className="min-h-screen p-6 pb-32">
      <h2 className="text-2xl font-bold text-emerald-900 mb-2">{t('care_suggestions_title')}</h2>
      <p className="text-zinc-700 mb-8">{t('care_suggestions_desc')}</p>

      <SuggestionCard
        title={t('watering_advice_title')}
        advice={getWateringAdvice()}
        icon={Droplets}
        color="bg-blue-100 text-blue-900 border-blue-200"
      />

      <SuggestionCard
        title={t('sunlight_advice_title')}
        advice={getSunlightAdvice()}
        icon={Sun}
        color="bg-amber-100 text-amber-900 border-amber-200"
      />

      <SuggestionCard
        title={t('temp_advice_title')}
        advice={getTempAdvice()}
        icon={Thermometer}
        color="bg-emerald-100 text-emerald-900 border-emerald-200"
      />

      <div className="mt-8 p-6 bg-zinc-100 rounded-3xl flex gap-4">
        <Info className="text-zinc-600 shrink-0" />
        <p className="text-sm text-zinc-800 italic">
          {t('dusty_leaves_tip')}
        </p>
      </div>
    </div>
  );
}
