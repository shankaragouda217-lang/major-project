import { Grid, Camera, Frame, Leaf, Users, Settings } from 'lucide-react';
import { useApp } from '../AppContext';
import { motion } from 'motion/react';

export default function Navigation({ current, onNavigate }: { current: string, onNavigate: (s: any) => void }) {
  const { t } = useApp();
  const items = [
    { id: 'dashboard', icon: Grid, label: t('nav_home') },
    { id: 'disease', icon: Camera, label: t('nav_scan') },
    { id: 'balcony', icon: Frame, label: t('nav_balcony') },
    { id: 'growth', icon: Leaf, label: t('nav_track') },
    { id: 'community', icon: Users, label: t('nav_community') },
    { id: 'settings', icon: Settings, label: t('nav_settings') },
  ];

  return (
    <nav className="bg-white/90 backdrop-blur-2xl border border-zinc-200/50 rounded-3xl px-1 py-1.5 flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = current === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex-1 flex flex-col items-center px-1 py-1 transition-all relative ${isActive ? 'text-emerald-600' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            {isActive && (
              <motion.div 
                layoutId="nav-active"
                className="absolute inset-0 bg-emerald-50 rounded-2xl -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[7px] font-black mt-1 uppercase tracking-wider text-center ${isActive ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
