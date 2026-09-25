import React, { useState } from 'react';
import {
  History,
  X,
  Trash2,
  Star,
  Search,
  ArrowRightLeft,
  Sparkles,
  RotateCcw,
  Check,
  ChevronDown,
} from 'lucide-react';

export interface QuranicChainHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  scope: 'all' | 'verses_and_chains' | 'chains_only' | 'single_words';
  onlyNoorani: boolean;
  targetMaghribi: number;
  targetMashriqi: number;
  isIdentical: boolean;
  matchesCount?: number;
  isFavorite?: boolean;
}

interface QuranicChainHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  items: QuranicChainHistoryItem[];
  onSelectItem: (item: QuranicChainHistoryItem) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
}

export function QuranicChainHistory({
  isOpen,
  onClose,
  items,
  onSelectItem,
  onToggleFavorite,
  onDeleteItem,
  onClearHistory,
}: QuranicChainHistoryProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

  const filteredItems = items
    .filter((item) => {
      if (filterMode === 'favorites' && !item.isFavorite) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          item.query.toLowerCase().includes(q) ||
          item.targetMaghribi.toString().includes(q) ||
          item.targetMashriqi.toString().includes(q)
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

  const getScopeLabel = (scope: QuranicChainHistoryItem['scope']) => {
    switch (scope) {
      case 'verses_and_chains':
        return 'سلاسل وآيات';
      case 'single_words':
        return 'مفردات فقط';
      case 'chains_only':
        return 'سلاسل فقط';
      case 'all':
      default:
        return 'الكل';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/75 backdrop-blur-xs flex justify-start transition-opacity animate-in fade-in duration-200"
      dir="rtl"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-stone-900 h-full shadow-2xl flex flex-col border-l border-stone-200 dark:border-stone-800 animate-in slide-in-from-right duration-250"
      >
        {/* Header */}
        <div className="p-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 bg-stone-50/70 dark:bg-stone-900/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center border border-emerald-300/70 dark:border-emerald-700/60 shadow-2xs">
              <History className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5 font-sans">
                <span>سجل مطابق السلاسل</span>
                <span className="text-3xs font-mono px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 font-semibold">
                  {items.length}
                </span>
              </h3>
              <p className="text-3xs text-stone-600 dark:text-stone-400">
                البحوث والمطابقات القرآنية السابقة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            title="إغلاق السجل"
            aria-label="إغلاق السجل"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-3 border-b border-stone-200 dark:border-stone-800 space-y-2 bg-white dark:bg-stone-900">
          {/* Search in history */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في السجل (كلمة أو رقم)..."
              className="w-full text-xs py-1.5 pr-8 pl-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick Filter Pills & Clear Action */}
          <div className="flex items-center justify-between gap-1 text-xs">
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg font-sans">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 rounded-md text-3xs font-medium transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                الكل ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('favorites')}
                className={`px-2 py-0.5 rounded-md text-3xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                  filterMode === 'favorites'
                    ? 'bg-white dark:bg-stone-700 text-amber-700 dark:text-amber-300 shadow-2xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>المفضلة ({favoritesCount})</span>
              </button>
            </div>

            {items.length > 0 && (
              <div>
                {showClearConfirm ? (
                  <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/70 p-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                    <button
                      type="button"
                      onClick={() => {
                        onClearHistory();
                        setShowClearConfirm(false);
                      }}
                      className="px-1.5 py-0.5 rounded text-3xs font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
                    >
                      تأكيد المسح
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="px-1 py-0.5 rounded text-3xs text-stone-600 dark:text-stone-400 hover:text-stone-900"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition-colors cursor-pointer text-3xs flex items-center gap-1"
                    title="مسح كامل السجل"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>مسح</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* List of search items */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 divide-y divide-stone-100 dark:divide-stone-800/40">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-stone-400 space-y-2">
              <History className="w-8 h-8 mx-auto opacity-30 text-emerald-500" />
              <p className="text-xs">
                {filterMode === 'favorites' ? 'لا توجد بحوث مفضلة بعد' : 'سجل مطابق السلاسل فارغ'}
              </p>
              <p className="text-3xs text-stone-500">
                كل عملية مسح تجريها في مطابق السلاسل ستُحفظ هنا تلقائياً لسرعة الرجوع إليها.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="pt-1.5 first:pt-0 group flex items-stretch gap-1.5 p-2 rounded-xl hover:bg-emerald-50/40 dark:hover:bg-stone-850/60 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-950/80 transition-all cursor-pointer"
                onClick={() => {
                  onSelectItem(item);
                  onClose();
                }}
              >
                {/* Main click area */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-quran font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100 truncate">
                      {item.query}
                    </span>

                    <span className="text-3xs font-mono text-stone-400 dark:text-stone-500 shrink-0">
                      {formatDate(item.timestamp)}
                    </span>
                  </div>

                  {/* Badges row */}
                  <div className="flex items-center gap-1.5 flex-wrap text-3xs font-sans">
                    {/* Value Badge */}
                    <span className="px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-mono">
                      {item.isIdentical
                        ? `قيمة = ${item.targetMaghribi}`
                        : `غربي = ${item.targetMaghribi} | شرقي = ${item.targetMashriqi}`}
                    </span>

                    {/* Scope Badge */}
                    <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {getScopeLabel(item.scope)}
                    </span>

                    {/* Noorani Badge */}
                    {item.onlyNoorani && (
                      <span className="px-1 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        نورانية
                      </span>
                    )}

                    {/* Match count if available */}
                    {typeof item.matchesCount === 'number' && (
                      <span className="font-mono text-stone-500 dark:text-stone-400">
                        {item.matchesCount} مطابقة
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick actions (Favorite & Delete) */}
                <div
                  className="flex flex-col items-center justify-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(item.id)}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      item.isFavorite
                        ? 'text-amber-500 hover:text-amber-600'
                        : 'text-stone-300 dark:text-stone-600 hover:text-amber-500'
                    }`}
                    title={item.isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                  >
                    <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-amber-500' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1 text-stone-300 dark:text-stone-600 hover:text-rose-500 rounded-md transition-colors cursor-pointer opacity-40 group-hover:opacity-100"
                    title="حذف من السجل"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
