import React from 'react';
import { Search, Sparkles, Scale } from 'lucide-react';

export type AppTabType = 'gematria' | 'search' | 'fawatih_scale' | 'settings' | 'info';

interface MobileBottomNavProps {
  activeTab: AppTabType;
  setActiveTab: (tab: AppTabType) => void;
}

interface NavItem {
  id: Exclude<AppTabType, 'info' | 'settings'>;
  label: string;
  icon: React.ElementType;
  activeColor: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'gematria',
    label: 'السلاسل والجُمّل',
    icon: Sparkles,
    activeColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50',
  },
  {
    id: 'fawatih_scale',
    label: 'ميزان الفواتح',
    icon: Scale,
    activeColor: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50',
  },
  {
    id: 'search',
    label: 'الباحث والمترجم',
    icon: Search,
    activeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50',
  },
];

export function MobileBottomNav({ activeTab, setActiveTab }: MobileBottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 sm:hidden transition-colors shadow-lg"
      aria-label="التنقل السفلي للهاتف"
      dir="rtl"
    >
      <div className="grid grid-cols-2 h-15 max-w-md mx-auto px-2 items-stretch">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              id={`mobile-nav-${item.id}`}
              onClick={() => {
                setActiveTab(item.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center py-1 px-1 relative transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[44px] ${
                isActive
                  ? 'text-stone-900 dark:text-stone-100'
                  : 'text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
              title={item.label}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active pill background around icon */}
              <div
                className={`w-10 h-7 rounded-full flex items-center justify-center transition-all ${
                  isActive ? item.activeColor : 'bg-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>

              {/* Label */}
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 leading-none transition-colors truncate max-w-full ${
                  isActive ? 'font-bold text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                {item.label}
              </span>

              {/* Active top line dot */}
              {isActive && (
                <span className="absolute top-0 w-6 h-0.5 bg-amber-500 dark:bg-amber-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
