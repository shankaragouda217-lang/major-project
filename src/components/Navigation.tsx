import { Grid, Camera, Frame, Leaf, ShoppingBag, Settings } from 'lucide-react';
import { useApp } from '../AppContext';

export default function Navigation({ current, onNavigate }: { current: string, onNavigate: (s: any) => void }) {
  const { t } = useApp();
  const items = [
    { id: 'dashboard', icon: Grid, label: t('nav_home') },
    { id: 'disease', icon: Camera, label: t('nav_scan') },
    { id: 'balcony', icon: Frame, label: t('nav_balcony') },
    { id: 'growth', icon: Leaf, label: t('nav_track') },
    { id: 'community', icon: ShoppingBag, label: t('nav_order') },
    { id: 'settings', icon: Settings, label: t('nav_settings') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-4 py-2 flex justify-around items-center z-50 max-w-md mx-auto">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = current === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center p-2 transition-all ${isActive ? 'text-emerald-600' : 'text-zinc-400'}`}
          >
            <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-emerald-50' : ''}`}>
              <Icon size={24} />
            </div>
            <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
