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
  const { sensors } = useApp();

  const getWateringAdvice = () => {
    if (sensors.moisture < 30) return `Soil moisture is low (${Math.round(sensors.moisture)}%). Water your plants immediately.`;
    if (sensors.moisture < 50) return `Soil moisture is moderate (${Math.round(sensors.moisture)}%). Check again tomorrow before watering.`;
    return `Soil moisture is good (${Math.round(sensors.moisture)}%). No need to water today.`;
  };

  const getSunlightAdvice = () => {
    if (sensors.light < 30) return `Light levels are low (${Math.round(sensors.light)}%). Consider moving plants closer to a window.`;
    return `Light levels are optimal (${Math.round(sensors.light)}%). Ensure plants get 6 hours of this light.`;
  };

  const getTempAdvice = () => {
    if (sensors.temp > 30) return `It's quite warm (${Math.round(sensors.temp)}°C). Ensure good ventilation and check moisture more often.`;
    if (sensors.temp < 18) return `It's getting cool (${Math.round(sensors.temp)}°C). Protect sensitive plants from cold drafts.`;
    return `Temperature is perfect (${Math.round(sensors.temp)}°C) for most urban plants.`;
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-emerald-900 mb-2">Care Suggestions</h2>
      <p className="text-zinc-500 mb-8">Smart advice based on your garden data.</p>

      <SuggestionCard
        title="Watering Advice"
        advice={getWateringAdvice()}
        icon={Droplets}
        color="bg-blue-100 text-blue-700 border-blue-200"
      />

      <SuggestionCard
        title="Sunlight Advice"
        advice={getSunlightAdvice()}
        icon={Sun}
        color="bg-amber-100 text-amber-700 border-amber-200"
      />

      <SuggestionCard
        title="Temperature Advice"
        advice={getTempAdvice()}
        icon={Thermometer}
        color="bg-emerald-100 text-emerald-700 border-emerald-200"
      />

      <div className="mt-8 p-6 bg-zinc-100 rounded-3xl flex gap-4">
        <Info className="text-zinc-400 shrink-0" />
        <p className="text-sm text-zinc-600 italic">
          Tip: Urban environments can get dusty. Wipe your plant leaves with a damp cloth once a week to help them breathe better.
        </p>
      </div>
    </div>
  );
}
