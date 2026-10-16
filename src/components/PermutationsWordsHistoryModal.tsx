import React, { useState } from 'react';
import {
  History,
  X,
  Trash2,
  Star,
  Search,
  Sparkles,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export interface PermutationsHistoryWordItem {
  id: string;
  word: string;
  timestamp: number;
  matchMode: 'stem' | 'exact' | 'contains';
  totalPermutations: number;
  quranicCount: number;
  occurrencesCount: number;
  versesCount: number;
  gematria: number;
  isFavorite?: boolean;
}

interface PermutationsWordsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PermutationsHistoryWordItem[];
  onSelectWord: (word: string, matchMode: 'stem' | 'exact' | 'contains') => void;
  onToggleFavorite: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
}

export function PermutationsWordsHistoryModal({
  isOpen,
  onClose,
  items,
  onSelectWord,
  onToggleFavorite,
  onDeleteItem,
  onClearHistory,
}: PermutationsWordsHistoryModalProps) {
  const { playDosBeep } = useTheme();
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
          item.word.toLowerCase().includes(q) ||
          String(item.gematria).includes(q)
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
      return (
        d.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
        }) +
        ' ' +
        d.toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' })
      );
    } catch {
      return '';
    }
  };

  const getModeLabel = (mode: 'stem' | 'exact' | 'contains') => {
    switch (mode) {
      case 'stem':
        return 'جذع ومشتقات';
      case 'exact':
        return 'مجرد تام';
      case 'contains':
        return 'شامل';
      default:
        return mode;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs font-mono select-none"
      onClick={onClose}
      dir="rtl"
    >
      <div
        style={{
          backgroundColor: 'var(--dos-bg, #0000a8)',
          borderColor: 'var(--dos-border, #aaaaaa)',
        }}
        className="w-full max-w-xl text-[#ffffff] border-4 shadow-[8px_8px_0px_#000000] p-0 overflow-hidden text-xs flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* DOS Window Title Bar */}
        <div className="bg-[#aaaaaa] text-[#000080] px-3 py-1.5 flex items-center justify-between font-bold border-b-2 border-[#555555] shrink-0">
          <div className="flex items-center gap-2">
            <span className="bg-[#000080] text-[#ffffff] px-1 text-xs font-mono">≡</span>
            <span className="tracking-wide flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#000080]" />
              <span>MS-DOS 6.22 - سجل الكلمات والتقاليب المفحوصة</span>
            </span>
          </div>
          <button
            onClick={() => {
              if (playDosBeep) playDosBeep(450, 30);
              onClose();
            }}
            className="bg-[#aa0000] text-white hover:bg-[#ff5555] px-2 py-0.5 text-xs font-bold transition-none cursor-pointer"
            title="إغلاق [Esc]"
          >
            [X]
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3 border-b border-[var(--dos-border)] space-y-2 shrink-0 bg-black/40">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 flex items-center bg-black border border-[#00aaaa] px-2 py-1 shadow-inner focus-within:border-[#ffff55]">
              <Search className="w-3.5 h-3.5 text-[#55ffff] ml-1 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في سجل الكلمات..."
                className="w-full bg-transparent text-[#ffff55] text-xs font-bold focus:outline-none placeholder:text-stone-500 font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-stone-400 hover:text-white text-3xs px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter mode: all or favorites */}
            <div className="flex items-center gap-1 shrink-0 text-3xs font-bold">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2 py-1 border cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-[#ffff55] text-black border-white font-black'
                    : 'bg-black/60 text-stone-300 border-stone-700'
                }`}
              >
                الكل ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('favorites')}
                className={`px-2 py-1 border cursor-pointer flex items-center gap-1 ${
                  filterMode === 'favorites'
                    ? 'bg-[#ffff55] text-black border-white font-black'
                    : 'bg-black/60 text-stone-300 border-stone-700'
                }`}
              >
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>المفضلة ({favoritesCount})</span>
              </button>
            </div>
          </div>

          {/* Clear history button or confirmation */}
          <div className="flex items-center justify-between text-3xs text-stone-300 pt-1 border-t border-white/10">
            <span>
              إجمالي الكلمات المسجلة: <strong className="text-[#ffff55]">{items.length}</strong> كلمة
            </span>

            {items.length > 0 && (
              <div>
                {!showClearConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="text-[#ff5555] hover:text-white cursor-pointer inline-flex items-center gap-1 font-bold"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>[مسح السجل بالكامل]</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#ff5555] font-bold">تأكيد المسح؟</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClearHistory();
                        setShowClearConfirm(false);
                        if (playDosBeep) playDosBeep(500, 40);
                      }}
                      className="px-1.5 py-0.5 bg-[#aa0000] text-white hover:bg-red-600 font-bold border border-white cursor-pointer"
                    >
                      نعم، امسح
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="px-1.5 py-0.5 bg-black text-stone-300 border border-stone-600 cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* History Items List */}
        <div className="p-3 overflow-y-auto space-y-1.5 flex-1 max-h-[60vh]">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectWord(item.word, item.matchMode);
                  if (playDosBeep) playDosBeep(900, 20);
                  onClose();
                }}
                style={{
                  backgroundColor: 'var(--dos-panel, #000088)',
                  borderColor: 'var(--dos-border, #00aaaa)',
                }}
                className="px-2.5 py-2 border shadow-2xs select-none group flex items-center justify-between gap-2 cursor-pointer transition-none hover:border-[#ffff55] hover:bg-[#002244]"
              >
                {/* Right side: Word and metrics */}
                <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                  <span className="text-base sm:text-lg font-black text-[#ffff55] font-quran tracking-wide shrink-0">
                    «{item.word}»
                  </span>

                  <span className="bg-black/70 border border-[#55ffff]/50 px-1.5 py-0.2 text-3xs text-[#55ff55] font-mono shrink-0">
                    جُمّل: {item.gematria}
                  </span>

                  <span className="bg-[#003300] border border-[#55ff55]/50 px-1.5 py-0.2 text-3xs text-[#55ff55] font-mono shrink-0">
                    الوارد: {item.quranicCount}/{item.totalPermutations}
                  </span>

                  <span className="bg-black/70 border border-stone-700 px-1.5 py-0.2 text-3xs text-stone-300 font-mono shrink-0">
                    {item.occurrencesCount} موضعاً ({item.versesCount} آية)
                  </span>

                  <span className="text-4xs text-[#55ffff] font-sans shrink-0">
                    [{getModeLabel(item.matchMode)}]
                  </span>
                </div>

                {/* Left side: Time, favorite toggle, and delete item */}
                <div
                  className="flex items-center gap-1.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-4xs text-stone-400 font-mono">
                    {formatDate(item.timestamp)}
                  </span>

                  {/* Favorite button */}
                  <button
                    type="button"
                    onClick={() => {
                      onToggleFavorite(item.id);
                      if (playDosBeep) playDosBeep(950, 30);
                    }}
                    className="p-1 hover:bg-white hover:text-black rounded text-stone-300 transition-none cursor-pointer"
                    title={item.isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        item.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-stone-400'
                      }`}
                    />
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteItem(item.id);
                      if (playDosBeep) playDosBeep(600, 20);
                    }}
                    className="p-1 hover:bg-[#aa0000] hover:text-white rounded text-stone-400 transition-none cursor-pointer"
                    title="حذف من السجل"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-stone-400 text-xs space-y-1">
              <History className="w-6 h-6 mx-auto text-stone-500 opacity-60" />
              <div>
                {searchQuery
                  ? 'لا توجد كلمات مطابقة للبحث في السجل.'
                  : filterMode === 'favorites'
                  ? 'لا توجد كلمات مفضلة حتى الآن.'
                  : 'السجل فارغ. الكلمات التي تقوم بفحصها ستظهر تلقائياً هنا.'}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-2 border-t border-[var(--dos-border)] bg-black/60 flex items-center justify-between text-3xs text-stone-400 shrink-0">
          <span>انقر على أي كلمة لإعادة فحصها فوراً واستعراض كافة تقاليبها وشواهدها</span>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-0.5 bg-[#aaaaaa] text-black hover:bg-white font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

export default PermutationsWordsHistoryModal;
