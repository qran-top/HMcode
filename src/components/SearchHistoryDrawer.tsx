import { useState } from 'react';
import {
  History,
  X,
  Trash2,
  Star,
  Search,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Globe,
  RotateCcw,
} from 'lucide-react';

export interface SearchHistoryItem {
  id: string;
  word: string;
  timestamp: number;
  nooraniId: string;
  nooraniName: string;
  arabicId: string;
  arabicName: string;
  isNooraniReversed?: boolean;
  isArabicReversed?: boolean;
  includeWaw?: boolean;
  isFavorite?: boolean;
}

interface SearchHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: SearchHistoryItem[];
  onSelectItem: (item: SearchHistoryItem) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
}

export function SearchHistoryDrawer({
  isOpen,
  onClose,
  items,
  onSelectItem,
  onToggleFavorite,
  onDeleteItem,
  onClearHistory,
}: SearchHistoryDrawerProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredItems = items
    .filter((item) => {
      if (filterMode === 'favorites' && !item.isFavorite) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          item.word.toLowerCase().includes(q) ||
          item.nooraniName.toLowerCase().includes(q) ||
          item.arabicName.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return b.timestamp - a.timestamp;
    });

  const favoritesCount = items.filter((i) => i.isFavorite).length;

  const formatDate = (timestamp: number) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className="relative w-full max-w-md bg-white dark:bg-stone-900 h-full shadow-2xl flex flex-col z-10 border-s border-stone-200 dark:border-stone-800 transition-transform duration-300"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 bg-stone-50/70 dark:bg-stone-950/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-white flex items-center gap-1.5">
                <span>سجل عمليات البحث</span>
                <span className="text-2xs font-mono px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold">
                  {items.length}
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                يحفظ كل كلمة مع منظومة التشفير المستخدمة لها
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer text-xs"
                title="مسح كل السجل"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title="إغلاق السجل"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 border-b border-stone-200 dark:border-stone-800 space-y-2 bg-white dark:bg-stone-900">
          {/* Tabs: All vs Favorites */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`py-1 px-2 rounded-md transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              الكل ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('favorites')}
              className={`py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                filterMode === 'favorites'
                  ? 'bg-amber-500 text-white shadow-2xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>المفضلة ({favoritesCount})</span>
            </button>
          </div>

          {/* Quick Filter Search */}
          {items.length > 5 && (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الكلمات أو المنظومات..."
                className="w-full text-xs py-1.5 px-2.5 ps-7 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute start-2 top-1/2 -translate-y-1/2" />
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
                {filterMode === 'favorites' ? (
                  <Star className="w-6 h-6" />
                ) : (
                  <History className="w-6 h-6" />
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-stone-700 dark:text-stone-300">
                {filterMode === 'favorites'
                  ? 'لا توجد كلمات في المفضلة بعد'
                  : 'سجل البحث فارغ حالياً'}
              </h3>
              <p className="text-xs text-stone-400 dark:text-stone-500 max-w-xs mx-auto">
                {filterMode === 'favorites'
                  ? 'انقر على رمز النجمة بجانب أي كلمة بحث لتثبيتها في المفضلة للعودة إليها سريعاً'
                  : 'كل كلمة تبحث عنها ستُحفظ هنا مع نوع الشيفرة المستخدمة تلقائياً'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl border border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-600 bg-white dark:bg-stone-850 hover:bg-stone-50 dark:hover:bg-stone-800/80 p-2.5 transition-all shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Clickable Area to Restore Search & Cipher */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectItem(item);
                      onClose();
                    }}
                    className="flex-1 text-right cursor-pointer"
                    title="انقر لاسترجاع الكلمة ومنظومة التشفير والبحث فوراً"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-stone-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {item.word}
                      </span>
                      {item.timestamp && (
                        <span className="text-xs text-stone-400 font-mono">
                          {formatDate(item.timestamp)}
                        </span>
                      )}
                    </div>

                    {/* Cipher Systems Details */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5 text-2xs font-medium">
                      {/* Sky System */}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>سماء:</span>
                        <span>{item.nooraniName || item.nooraniId}</span>
                        {item.isNooraniReversed && (
                          <RotateCcw className="w-3 h-3 text-rose-500" title="معكوس" />
                        )}
                      </span>

                      {/* Earth System */}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Globe className="w-3 h-3 text-emerald-600" />
                        <span>أرض:</span>
                        <span>{item.arabicName || item.arabicId}</span>
                        {item.isArabicReversed && (
                          <RotateCcw className="w-3 h-3 text-rose-500" title="معكوس" />
                        )}
                      </span>

                      {/* Waw Option */}
                      {item.includeWaw && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          +و
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Actions: Favorite Star & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        item.isFavorite
                          ? 'text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/60'
                          : 'text-stone-300 dark:text-stone-600 hover:text-amber-500'
                      }`}
                      title={item.isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                    >
                      <Star
                        className={`w-4 h-4 ${item.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item.id);
                      }}
                      className="p-1.5 rounded-lg text-stone-300 dark:text-stone-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="حذف من السجل"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-center">
          <span className="text-3xs text-stone-400 dark:text-stone-500">
            النقر على أي كلمة يعيد ضبط المنظومة ويبحث تلقائياً
          </span>
        </div>
      </div>
    </div>
  );
}
