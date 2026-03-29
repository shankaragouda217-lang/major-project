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
    <nav className="bg-white border-2 border-zinc-900 rounded-full px-2 py-2 flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = current === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex-1 flex flex-col items-center px-1 py-1.5 transition-all relative ${isActive ? 'text-emerald-700' : 'text-zinc-600 hover:text-zinc-900'}`}
          >
            {isActive && (
              <motion.div 
                layoutId="nav-active"
                className="absolute inset-0 bg-emerald-100 rounded-2xl -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Icon size={22} strokeWidth={isActive ? 3 : 2} />
            <span className={`text-[9px] font-black mt-1 uppercase tracking-wider text-center ${isActive ? 'opacity-100' : 'opacity-100'}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
