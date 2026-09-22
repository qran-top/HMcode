import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Layers,
  RotateCcw,
  Eraser,
  CheckCircle2,
  AlertTriangle,
  X,
  BookmarkPlus,
  Save,
  Download,
  Upload,
  Trash2,
  Edit3,
  Check,
  Columns,
  ChevronDown,
  BookOpen,
  Plus,
  ClipboardPaste,
  ArrowUpDown,
  HelpCircle,
  FileText,
  ArrowRight,
  Sparkles,
  Globe,
  Info,
} from 'lucide-react';
import {
  getLayerColor,
  ALL_ARABIC_LETTERS_28,
  LayerInfo,
} from '../cipherData';
import { useCipherLayers } from '../context/CipherLayersContext';
import {
  getAllNooraniItems,
  getAllArabicItems,
  NooraniItem,
  ArabicItem,
} from '../utils/multiSystemSearch';
import { BulkPasteModal } from './BulkPasteModal';
import { TextEditorView } from './TextEditorView';

interface LayersTableProps {
  highlightedLayerNumbers?: number[];
  onSelectLetter?: (char: string) => void;
}

interface ActiveCell {
  type: 'arabic' | 'cipher';
  layerNum: number;
  slotIndex: number;
}

export function LayersTable({
  highlightedLayerNumbers = [],
  onSelectLetter,
}: LayersTableProps) {
  const {
    layers,
    isCustomized,
    usedLetters,
    missingLetters,
    duplicateLetters,
    totalFilledSlots,
    duplicateCipherLetters,
    savedNooraniPresets,
    savedArabicPresets,
    savedTables,
    saveCurrentNooraniPreset,
    applyNooraniDistribution,
    deleteSavedNooraniPreset,
    saveCurrentArabicPreset,
    applyArabicDistribution,
    deleteSavedArabicPreset,
    setLetterAtSlot,
    clearLetterAtSlot,
    setCipherLettersForLayer,
    addArabicSlotToLayer,
    removeArabicSlotFromLayer,
    addCipherSlotToLayer,
    removeCipherSlotFromLayer,
    reverseAllLayersArabicLetters,
    reverseAllLayersCipherLetters,
    clearSkyLetters,
    clearEarthLetters,
    resetToDefault,
    columnDuplicatesSummary,
  } = useCipherLayers();

  // Primary Table Tab: Dual (سماء وأرض معاً) vs Sky (نورانية) vs Earth (عربية)
  const [activeTableTab, setActiveTableTab] = useState<'dual' | 'sky' | 'earth'>('dual');

  // Sub-view: Grid, Text Editor, Bulk Paste, Duplicates
  type TableSubView = 'grid' | 'text-editor' | 'bulk-paste' | 'duplicates';
  const [tableSubView, setTableSubView] = useState<TableSubView>('grid');

  // Active keyboard editing cell
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dropdown states
  const [showSkyMenu, setShowSkyMenu] = useState(false);
  const [showEarthMenu, setShowEarthMenu] = useState(false);
  const skyMenuRef = useRef<HTMLDivElement>(null);
  const earthMenuRef = useRef<HTMLDivElement>(null);

  // Quick Save Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState('');
  const [saveDescInput, setSaveDescInput] = useState('');

  // Clear confirmation
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Toast Notification
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (skyMenuRef.current && !skyMenuRef.current.contains(e.target as Node)) {
        setShowSkyMenu(false);
      }
      if (earthMenuRef.current && !earthMenuRef.current.contains(e.target as Node)) {
        setShowEarthMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-dismiss notification
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Focus input when active cell changes
  useEffect(() => {
    if (activeCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [activeCell]);

  // Retrieve numbered lists of Sky & Earth tables
  const allNooraniItems = useMemo(
    () => getAllNooraniItems(savedNooraniPresets, savedTables),
    [savedNooraniPresets, savedTables]
  );

  const allArabicItems = useMemo(
    () => getAllArabicItems(savedArabicPresets, savedTables),
    [savedArabicPresets, savedTables]
  );

  // Determine currently selected Sky item
  const activeSkyItem = useMemo(() => {
    const currentCipherKeys = layers
      .map((l) => (l.cipherLetters || []).filter((c) => c && c.trim() !== '').join(''))
      .join('|');

    const match = allNooraniItems.find((item) => {
      const itemKeys = item.layers
        .map((l) => (l.cipherLetters || []).filter((c) => c && c.trim() !== '').join(''))
        .join('|');
      return itemKeys === currentCipherKeys;
    });

    return match || allNooraniItems[0];
  }, [layers, allNooraniItems]);

  // Determine currently selected Earth item
  const activeEarthItem = useMemo(() => {
    const currentArabicKeys = layers
      .map((l) => (l.arabicLetters || []).filter((c) => c && c.trim() !== '').join(''))
      .join('|');

    const match = allArabicItems.find((item) => {
      const itemKeys = item.layers
        .map((l) => (l.letters || []).filter((c) => c && c.trim() !== '').join(''))
        .join('|');
      return itemKeys === currentArabicKeys;
    });

    return match || allArabicItems[0];
  }, [layers, allArabicItems]);

  // Suggest naming according to rule:
  // Sky: First char of layer 1 + " - " + last char of layer 7
  // Earth: First 2 chars of layer 1 + " - " + last 2 chars of layer 7
  const suggestedName = useMemo(() => {
    const sorted = [...layers].sort((a, b) => a.layer - b.layer);
    const firstLayer = sorted[0];
    const lastLayer = sorted[sorted.length - 1];

    if (activeTableTab === 'sky') {
      const firstChars = (firstLayer?.cipherLetters || []).filter((c) => c && c.trim() !== '');
      const lastChars = (lastLayer?.cipherLetters || []).filter((c) => c && c.trim() !== '');
      const firstChar = firstChars[0] || 'ا';
      const lastChar = lastChars[lastChars.length - 1] || 'ن';
      return `${firstChar} - ${lastChar}`;
    } else {
      const firstChars = (firstLayer?.arabicLetters || []).filter((c) => c && c.trim() !== '');
      const lastChars = (lastLayer?.arabicLetters || []).filter((c) => c && c.trim() !== '');
      const firstTwo = firstChars.slice(0, 2).join('') || 'اب';
      const lastTwo = lastChars.slice(-2).join('') || 'ظغ';
      return `${firstTwo} - ${lastTwo}`;
    }
  }, [layers, activeTableTab]);

  // Keyboard navigation across slots
  const getSortedLayers = () => [...layers].sort((a, b) => a.layer - b.layer);

  const moveToNextCell = (current: ActiveCell) => {
    const sorted = getSortedLayers();
    const currentLayerIdx = sorted.findIndex((l) => l.layer === current.layerNum);
    if (currentLayerIdx === -1) return;

    const currentLayer = sorted[currentLayerIdx];
    const slots = current.type === 'arabic' ? currentLayer.arabicLetters : currentLayer.cipherLetters;

    if (current.slotIndex + 1 < (slots?.length || 0)) {
      setActiveCell({ ...current, slotIndex: current.slotIndex + 1 });
    } else if (currentLayerIdx + 1 < sorted.length) {
      const nextLayer = sorted[currentLayerIdx + 1];
      setActiveCell({ type: current.type, layerNum: nextLayer.layer, slotIndex: 0 });
    }
  };

  const moveToPrevCell = (current: ActiveCell) => {
    const sorted = getSortedLayers();
    const currentLayerIdx = sorted.findIndex((l) => l.layer === current.layerNum);
    if (currentLayerIdx === -1) return;

    if (current.slotIndex > 0) {
      setActiveCell({ ...current, slotIndex: current.slotIndex - 1 });
    } else if (currentLayerIdx > 0) {
      const prevLayer = sorted[currentLayerIdx - 1];
      const prevSlots = current.type === 'arabic' ? prevLayer.arabicLetters : prevLayer.cipherLetters;
      setActiveCell({
        type: current.type,
        layerNum: prevLayer.layer,
        slotIndex: Math.max(0, (prevSlots?.length || 1) - 1),
      });
    }
  };

  const moveToAdjacentLayer = (current: ActiveCell, direction: 'up' | 'down') => {
    const sorted = getSortedLayers();
    const currentLayerIdx = sorted.findIndex((l) => l.layer === current.layerNum);
    if (currentLayerIdx === -1) return;

    const targetIdx = direction === 'up' ? currentLayerIdx - 1 : currentLayerIdx + 1;
    if (targetIdx >= 0 && targetIdx < sorted.length) {
      const targetLayer = sorted[targetIdx];
      const targetSlots = current.type === 'arabic' ? targetLayer.arabicLetters : targetLayer.cipherLetters;
      const targetSlotIdx = Math.min(current.slotIndex, Math.max(0, (targetSlots?.length || 1) - 1));
      setActiveCell({ type: current.type, layerNum: targetLayer.layer, slotIndex: targetSlotIdx });
    }
  };

  const handleCellClick = (type: 'arabic' | 'cipher', layerNum: number, slotIndex: number) => {
    setActiveCell({ type, layerNum, slotIndex });
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: 'arabic' | 'cipher',
    layerNum: number,
    slotIndex: number
  ) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) moveToPrevCell({ type, layerNum, slotIndex });
      else moveToNextCell({ type, layerNum, slotIndex });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      moveToNextCell({ type, layerNum, slotIndex });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      moveToPrevCell({ type, layerNum, slotIndex });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveToAdjacentLayer({ type, layerNum, slotIndex }, 'up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveToAdjacentLayer({ type, layerNum, slotIndex }, 'down');
    } else if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault();
      setActiveCell(null);
    } else if (e.key === 'Backspace') {
      const layer = layers.find((l) => l.layer === layerNum);
      const val = type === 'arabic' ? layer?.arabicLetters[slotIndex] : layer?.cipherLetters[slotIndex];
      if (!val) {
        e.preventDefault();
        moveToPrevCell({ type, layerNum, slotIndex });
      }
    }
  };

  const handleCellChange = (
    val: string,
    type: 'arabic' | 'cipher',
    layerNum: number,
    slotIndex: number
  ) => {
    const trimmed = val.trim();
    if (type === 'arabic') {
      if (!trimmed) {
        clearLetterAtSlot(layerNum, slotIndex);
      } else {
        const lastChar = trimmed.slice(-1);
        setLetterAtSlot(layerNum, slotIndex, lastChar);
        if (onSelectLetter) onSelectLetter(lastChar);
        moveToNextCell({ type, layerNum, slotIndex });
      }
    } else {
      const layer = layers.find((l) => l.layer === layerNum);
      const currentCiphers = [...(layer?.cipherLetters || [])];
      if (!trimmed) {
        currentCiphers[slotIndex] = '';
      } else {
        const lastChar = trimmed.slice(-1);
        currentCiphers[slotIndex] = lastChar;
        moveToNextCell({ type, layerNum, slotIndex });
      }
      setCipherLettersForLayer(layerNum, currentCiphers);
    }
  };

  // Open Quick Save Dialog
  const handleOpenSaveDialog = () => {
    setSaveNameInput(suggestedName);
    setSaveDescInput('');
    setShowSaveModal(true);
  };

  const handleConfirmSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = saveNameInput.trim() || suggestedName;
    if (activeTableTab === 'sky') {
      saveCurrentNooraniPreset(finalName, saveDescInput.trim() || undefined);
      setNotification({
        type: 'success',
        message: `تم حفظ جدول السماء [سماء: ${finalName}] برقم تسلسل جديد بنجاح.`,
      });
    } else if (activeTableTab === 'earth') {
      saveCurrentArabicPreset(finalName, saveDescInput.trim() || undefined);
      setNotification({
        type: 'success',
        message: `تم حفظ جدول الأرض [أرض: ${finalName}] برقم تسلسل جديد بنجاح.`,
      });
    } else {
      saveCurrentNooraniPreset(finalName + ' (سماء)', saveDescInput.trim() || undefined);
      saveCurrentArabicPreset(finalName + ' (أرض)', saveDescInput.trim() || undefined);
      setNotification({
        type: 'success',
        message: `تم حفظ منظومتي السماء والأرض [${finalName}] برقم تسلسل جديد بنجاح.`,
      });
    }
    setShowSaveModal(false);
  };

  // Compute sky letter statistics
  const skyStats = useMemo(() => {
    let filled = 0;
    const freq: Record<string, number> = {};
    layers.forEach((l) => {
      (l.cipherLetters || []).forEach((c) => {
        const ch = (c || '').trim();
        if (ch) {
          filled++;
          freq[ch] = (freq[ch] || 0) + 1;
        }
      });
    });
    const dupes = Object.entries(freq).filter(([_, count]) => count > 1).map(([ch]) => ch);
    return { filled, duplicates: dupes };
  }, [layers]);

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-200" id="layers-table-module">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs transition-colors ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 rounded-md opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. PRIMARY TABS: DUAL (عرض متزامن) VS SKY TABLE (سماء) VS EARTH TABLE (أرض) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1.5 bg-stone-100 dark:bg-stone-850 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-inner">
        {/* Dual Tab (سماء وأرض معاً) */}
        <button
          type="button"
          onClick={() => {
            setActiveTableTab('dual');
            setActiveCell(null);
          }}
          className={`py-2.5 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTableTab === 'dual'
              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md ring-2 ring-amber-500/30'
              : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-stone-800'
          }`}
        >
          <Columns className="w-4 h-4" />
          <div className="flex items-center gap-1">
            <span>عرض متزامن</span>
            <span className="text-2xs opacity-90">(سماء وأرض)</span>
          </div>
          <span
            className={`text-2xs px-1.5 py-0.5 rounded-full font-medium ${
              activeTableTab === 'dual' ? 'bg-amber-800 text-amber-100' : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
            }`}
          >
            ملخص
          </span>
        </button>

        {/* Sky Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveTableTab('sky');
            setActiveCell(null);
          }}
          className={`py-2.5 px-3 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTableTab === 'sky'
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md ring-2 ring-indigo-500/30'
              : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-stone-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <div className="flex items-center gap-1">
            <span>جدول السماء</span>
            <span className="hidden sm:inline text-2xs opacity-90">(النورانية)</span>
          </div>
          <span
            className={`text-2xs px-1.5 py-0.5 rounded-full font-mono font-medium ${
              activeTableTab === 'sky' ? 'bg-indigo-800 text-indigo-100' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
            }`}
          >
            #{activeSkyItem?.index || 1}
          </span>
        </button>

        {/* Earth Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveTableTab('earth');
            setActiveCell(null);
          }}
          className={`py-2.5 px-3 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTableTab === 'earth'
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500/30'
              : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-stone-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <div className="flex items-center gap-1">
            <span>جدول الأرض</span>
            <span className="hidden sm:inline text-2xs opacity-90">(العربية)</span>
          </div>
          <span
            className={`text-2xs px-1.5 py-0.5 rounded-full font-mono font-medium ${
              activeTableTab === 'earth' ? 'bg-emerald-800 text-emerald-100' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
            }`}
          >
            #{activeEarthItem?.index || 1}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUB-VIEW NAVIGATION (الجدول، المحرر النصي، لصق، فحص التكرار) */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-0.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTableSubView('grid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              tableSubView === 'grid'
                ? activeTableTab === 'sky'
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'bg-amber-600 text-white shadow-2xs font-semibold'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>عرض الجدول التفاعلي</span>
          </button>

          <button
            type="button"
            onClick={() => setTableSubView('text-editor')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              tableSubView === 'text-editor'
                ? activeTableTab === 'sky'
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'bg-amber-600 text-white shadow-2xs font-semibold'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>المحرر النصي</span>
          </button>

          <button
            type="button"
            onClick={() => setTableSubView('bulk-paste')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              tableSubView === 'bulk-paste'
                ? activeTableTab === 'sky'
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'bg-amber-600 text-white shadow-2xs font-semibold'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>لصق وتوزيع الأحرف</span>
          </button>

          <button
            type="button"
            onClick={() => setTableSubView('duplicates')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              tableSubView === 'duplicates'
                ? activeTableTab === 'sky'
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'bg-amber-600 text-white shadow-2xs font-semibold'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>فحص التكرارات</span>
            {activeTableTab === 'sky'
              ? skyStats.duplicates.length > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              : (duplicateLetters.length > 0 || columnDuplicatesSummary.hasDuplicates) && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                )}
          </button>
        </div>

        {/* Quick Reset Button */}
        {isCustomized && (
          <button
            type="button"
            onClick={() => {
              resetToDefault();
              setNotification({ type: 'info', message: 'تمت استعادة الإعدادات الافتراضية للجداول.' });
            }}
            className="px-2.5 py-1 text-xs font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center gap-1 cursor-pointer shrink-0"
            title="استعادة الجداول الافتراضية"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الافتراضي</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. SUB-VIEW: TEXT EDITOR */}
      {/* ========================================================================= */}
      {tableSubView === 'text-editor' && (
        <TextEditorView
          onBackToGrid={() => setTableSubView('grid')}
          onNotification={(type, msg) => setNotification({ type, message: msg })}
        />
      )}

      {/* ========================================================================= */}
      {/* 4. SUB-VIEW: BULK PASTE */}
      {/* ========================================================================= */}
      {tableSubView === 'bulk-paste' && (
        <BulkPasteModal
          isOpen={true}
          isPage={true}
          initialTargetType={activeTableTab === 'sky' ? 'cipher' : 'arabic'}
          onClose={() => setTableSubView('grid')}
          onSuccessNotification={(msg) => {
            setNotification({ type: 'success', message: msg });
            setTableSubView('grid');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 5. SUB-VIEW: DUPLICATES INSPECTOR */}
      {/* ========================================================================= */}
      {tableSubView === 'duplicates' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white flex items-center gap-2">
              <Columns className="w-4 h-4 text-amber-500" />
              <span>
                {activeTableTab === 'sky' ? 'تقرير تكرار أحرف السماء النورانية' : 'تقرير تكرار وجرد الأحرف العربية (28)'}
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setTableSubView('grid')}
              className="text-xs font-bold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center gap-1 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للجدول</span>
            </button>
          </div>

          {activeTableTab === 'sky' ? (
            <div className="space-y-3">
              <div className="text-xs text-stone-600 dark:text-stone-300">
                إجمالي الخانات الممتلئة: <strong className="font-mono text-amber-600">{skyStats.filled}</strong> موضعاً.
              </div>
              {skyStats.duplicates.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>لا يوجد أي تكرار لأحرف السماء بين الطبقات!</span>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>تم العثور على أحرف مكررة في جدول السماء:</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {skyStats.duplicates.map((ch) => (
                      <span key={ch} className="px-2.5 py-1 bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 rounded-lg font-bold font-mono">
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* 28 Letters Grid Status */}
              <div>
                <div className="text-xs font-bold text-stone-700 dark:text-stone-300 mb-2">
                  جرد الأحرف الأبجدية الـ 28:
                </div>
                <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 text-center">
                  {ALL_ARABIC_LETTERS_28.map((char) => {
                    const isUsed = usedLetters.has(char);
                    const isDupe = duplicateLetters.includes(char);
                    return (
                      <div
                        key={char}
                        className={`p-2 rounded-xl border text-xs font-black transition-all ${
                          isDupe
                            ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-400 text-rose-900 dark:text-rose-100 ring-1 ring-rose-400'
                            : isUsed
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                            : 'bg-stone-50 dark:bg-stone-850 border-stone-200 dark:border-stone-700 text-stone-400 opacity-60'
                        }`}
                      >
                        <div>{char}</div>
                        <div className="text-3xs font-normal mt-0.5">
                          {isDupe ? 'مكرر' : isUsed ? '✓' : 'ناقص'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Column Duplicates Detail */}
              {columnDuplicatesSummary.hasDuplicates && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs space-y-1.5">
                  <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <Columns className="w-4 h-4 text-amber-600" />
                    <span>تكرارات بنفس العمود الرأسي عبر الطبقات:</span>
                  </div>
                  <div className="space-y-1 text-stone-600 dark:text-stone-300 text-2xs">
                    {columnDuplicatesSummary.arabicDuplicates.map((item, idx) => (
                      <div key={idx}>
                        الحرف <strong className="text-stone-900 dark:text-white">({item.char})</strong> مكرر في الطبقات:{' '}
                        {item.layers.join('، ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SUB-VIEW: INTERACTIVE GRID (FOR SKY OR EARTH INDEPENDENTLY) */}
      {/* ========================================================================= */}
      {tableSubView === 'grid' && (
        <div className="space-y-3.5">
          {/* Main Controls Card */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
              {/* Active Table Selector */}
              <div className="flex items-center gap-2 flex-wrap">
                {activeTableTab === 'dual' ? (
                  <>
                    {/* Sky Selector in Dual Mode */}
                    <div className="relative" ref={skyMenuRef}>
                      <button
                        type="button"
                        onClick={() => setShowSkyMenu(!showSkyMenu)}
                        className="h-10 px-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100/60 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      >
                        <span>🌌</span>
                        <span className="text-stone-500 dark:text-stone-400 font-normal">سماء:</span>
                        <span className="text-indigo-900 dark:text-indigo-200 font-extrabold max-w-[140px] truncate">
                          #{activeSkyItem?.index || 1}: {activeSkyItem?.name}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-stone-400 mr-1" />
                      </button>

                      {showSkyMenu && (
                        <div className="absolute top-full right-0 mt-1.5 w-80 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[70vh] overflow-y-auto">
                          <div className="px-3 py-1.5 text-3xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                            قائمة جداول السماء المرقمة
                          </div>
                          {allNooraniItems.map((item) => {
                            const isActive = activeSkyItem?.id === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  applyNooraniDistribution(item.id.replace('saved_noorani_', ''));
                                  setShowSkyMenu(false);
                                  setNotification({
                                    type: 'success',
                                    message: `تم تفعيل جدول السماء [سماء #${item.index}: ${item.name}].`,
                                  });
                                }}
                                className={`w-full px-3 py-2 text-right text-xs flex items-center justify-between gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer transition-colors ${
                                  isActive ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-bold' : 'text-stone-700 dark:text-stone-200'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-3xs px-1.5 py-0.5 rounded bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 font-bold">
                                    #{item.index}
                                  </span>
                                  <span className="truncate">{item.name}</span>
                                </div>
                                {isActive && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Earth Selector in Dual Mode */}
                    <div className="relative" ref={earthMenuRef}>
                      <button
                        type="button"
                        onClick={() => setShowEarthMenu(!showEarthMenu)}
                        className="h-10 px-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/60 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      >
                        <span>🌍</span>
                        <span className="text-stone-500 dark:text-stone-400 font-normal">أرض:</span>
                        <span className="text-emerald-900 dark:text-emerald-200 font-extrabold max-w-[140px] truncate">
                          #{activeEarthItem?.index || 1}: {activeEarthItem?.name}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-stone-400 mr-1" />
                      </button>

                      {showEarthMenu && (
                        <div className="absolute top-full right-0 mt-1.5 w-80 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[70vh] overflow-y-auto">
                          <div className="px-3 py-1.5 text-3xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                            قائمة جداول الأرض المرقمة
                          </div>
                          {allArabicItems.map((item) => {
                            const isActive = activeEarthItem?.id === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  applyArabicDistribution(item.id.replace('saved_arabic_', ''));
                                  setShowEarthMenu(false);
                                  setNotification({
                                    type: 'success',
                                    message: `تم تفعيل جدول الأرض [أرض #${item.index}: ${item.name}].`,
                                  });
                                }}
                                className={`w-full px-3 py-2 text-right text-xs flex items-center justify-between gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer transition-colors ${
                                  isActive ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold' : 'text-stone-700 dark:text-stone-200'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-3xs px-1.5 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-bold">
                                    #{item.index}
                                  </span>
                                  <span className="truncate">{item.name}</span>
                                </div>
                                {isActive && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : activeTableTab === 'sky' ? (
                  <div className="relative" ref={skyMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowSkyMenu(!showSkyMenu)}
                      className="h-10 px-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100/60 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-100 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
                    >
                      <span className="text-sm">🌌</span>
                      <span className="text-stone-500 dark:text-stone-400 font-normal">جدول السماء:</span>
                      <span className="text-indigo-900 dark:text-indigo-200 font-extrabold max-w-[200px] truncate">
                        #{activeSkyItem?.index || 1}: {activeSkyItem?.name}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-stone-400 mr-1" />
                    </button>

                    {/* Sky Dropdown Menu */}
                    {showSkyMenu && (
                      <div className="absolute top-full right-0 mt-1.5 w-80 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[70vh] overflow-y-auto">
                        <div className="px-3 py-1.5 text-3xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                          قائمة جداول السماء المرقمة
                        </div>
                        {allNooraniItems.map((item) => {
                          const isActive = activeSkyItem?.id === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                applyNooraniDistribution(item.id.replace('saved_noorani_', ''));
                                setShowSkyMenu(false);
                                setNotification({
                                   type: 'success',
                                   message: `تم تفعيل جدول السماء [سماء #${item.index}: ${item.name}].`,
                                });
                              }}
                              className={`w-full px-3 py-2 text-right text-xs flex items-center justify-between gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer transition-colors ${
                                isActive ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-bold' : 'text-stone-700 dark:text-stone-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-3xs px-1.5 py-0.5 rounded bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 font-bold">
                                  #{item.index}
                                </span>
                                <span className="truncate">{item.name}</span>
                              </div>
                              {isActive && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative" ref={earthMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowEarthMenu(!showEarthMenu)}
                      className="h-10 px-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/60 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
                    >
                      <span className="text-sm">🌍</span>
                      <span className="text-stone-500 dark:text-stone-400 font-normal">جدول الأرض:</span>
                      <span className="text-amber-900 dark:text-amber-200 font-extrabold max-w-[200px] truncate">
                        #{activeEarthItem?.index || 1}: {activeEarthItem?.name}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-stone-400 mr-1" />
                    </button>

                    {/* Earth Dropdown Menu */}
                    {showEarthMenu && (
                      <div className="absolute top-full right-0 mt-1.5 w-80 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[70vh] overflow-y-auto">
                        <div className="px-3 py-1.5 text-3xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                          قائمة جداول الأرض المرقمة
                        </div>
                        {allArabicItems.map((item) => {
                          const isActive = activeEarthItem?.id === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                applyArabicDistribution(item.id.replace('saved_arabic_', ''));
                                setShowEarthMenu(false);
                                setNotification({
                                  type: 'success',
                                  message: `تم تفعيل جدول الأرض [أرض #${item.index}: ${item.name}].`,
                                });
                              }}
                              className={`w-full px-3 py-2 text-right text-xs flex items-center justify-between gap-2 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer transition-colors ${
                                isActive ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 font-bold' : 'text-stone-700 dark:text-stone-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-3xs px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold">
                                  #{item.index}
                                </span>
                                <span className="truncate">{item.name}</span>
                              </div>
                              {isActive && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Save Table as New Preset */}
                <button
                  type="button"
                  onClick={handleOpenSaveDialog}
                  className={`h-10 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                    activeTableTab === 'sky'
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : activeTableTab === 'earth'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                  title={activeTableTab === 'dual' ? 'حفظ المنظومة المشتركة (سماء وأرض)' : activeTableTab === 'sky' ? 'حفظ جدول السماء الحالي في قائمة الجداول المرقمة' : 'حفظ جدول الأرض الحالي في قائمة الجداول المرقمة'}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{activeTableTab === 'dual' ? 'حفظ المنظومة' : activeTableTab === 'sky' ? 'حفظ جدول سماء' : 'حفظ جدول أرض'}</span>
                </button>
              </div>

              {/* Action Buttons: Reverse & Clear */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Reverse Order Action */}
                <button
                  type="button"
                  onClick={() => {
                    if (activeTableTab === 'sky') {
                      reverseAllLayersCipherLetters();
                      setNotification({
                        type: 'success',
                        message: 'تم عكس ترتيب أحرف السماء عامودياً بين الطبقات.',
                      });
                    } else {
                      reverseAllLayersArabicLetters();
                      setNotification({
                        type: 'success',
                        message: 'تم عكس ترتيب الأحرف العربية عامودياً بين الطبقات.',
                      });
                    }
                  }}
                  className="h-10 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title={activeTableTab === 'sky' ? 'عكس أحرف السماء بين الطبقات (الطبقة 7 تصبح 1 وهكذا)' : 'عكس أحرف الأرض بين الطبقات'}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
                  <span>{activeTableTab === 'sky' ? 'عكس أحرف السماء' : 'عكس أحرف الأرض'}</span>
                </button>

                {/* Clear Active Table */}
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="h-10 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-600 dark:text-stone-400 hover:text-rose-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title={activeTableTab === 'sky' ? 'مسح أحرف السماء في كافة الطبقات' : 'مسح أحرف الأرض في كافة الطبقات'}
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>{activeTableTab === 'sky' ? 'مسح أحرف السماء' : 'مسح أحرف الأرض'}</span>
                </button>
              </div>
            </div>

            {/* Clear Confirmation Inline Alert */}
            {showClearConfirm && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-100">
                <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    هل تريد بالتأكيد تفريغ أحرف {activeTableTab === 'sky' ? 'السماء (الشيفرة)' : 'الأرض (العربية)'}؟
                  </span>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3 py-1 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTableTab === 'sky') clearSkyLetters();
                      else clearEarthLetters();
                      setShowClearConfirm(false);
                      setNotification({
                        type: 'info',
                        message: `تم تفريغ أحرف ${activeTableTab === 'sky' ? 'السماء' : 'الأرض'}.`,
                      });
                    }}
                    className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                  >
                    تأكيد المسح
                  </button>
                </div>
              </div>
            )}

            {/* Quick Helper Tip */}
            <div className="flex items-center justify-between text-2xs text-stone-400 dark:text-stone-500 pt-1">
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-stone-400" />
                <span>
                  {activeTableTab === 'sky'
                    ? 'يمكنك النقر على خانات أحرف السماء والكتابة مباشرة، أو استخدام أزرار (+) و(-) لإضافة أو إزالة خانات.'
                    : 'يمكنك النقر على خانات أحرف الأرض والكتابة مباشرة، وتوزيع الـ 28 حرفاً بين الطبقات السبع.'}
                </span>
              </span>
              <span className="font-mono">
                {activeTableTab === 'sky'
                  ? `الأحرف المدخلة: ${skyStats.filled}`
                  : `الأحرف المدخلة: ${totalFilledSlots} / 28`}
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 7. THE INTERACTIVE 7-LAYER CARDS */}
          {/* ========================================================================= */}
          <div className="space-y-2.5">
            {getSortedLayers().map((layerInfo) => {
              const theme = getLayerColor(layerInfo.layer);
              const isHighlighted = highlightedLayerNumbers.includes(layerInfo.layer);

              return (
                <div
                  key={layerInfo.layer}
                  className={`rounded-xl border p-2 sm:p-2.5 transition-all duration-200 ${
                    isHighlighted
                      ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/20 shadow-md'
                      : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-900'
                  }`}
                >
                  {activeTableTab === 'dual' ? (
                    /* DUAL SIDE-BY-SIDE VIEW FOR THIS LAYER */
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-stone-100 dark:border-stone-800">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-xs shadow-xs shrink-0"
                            style={{ backgroundColor: theme.accentHex, color: '#fff' }}
                          >
                            {layerInfo.layer}
                          </div>
                          <h4 className="text-xs font-extrabold text-stone-900 dark:text-white">
                            الطبقة {layerInfo.layer} (سماء وأرض)
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-3xs text-stone-400 font-mono">
                          <span>سماء: {(layerInfo.cipherLetters || []).filter(Boolean).length}</span>
                          <span>•</span>
                          <span>أرض: {(layerInfo.arabicLetters || []).filter(Boolean).length}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {/* Sky Side */}
                        <div className="p-2 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-850 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs">🌌</span>
                            <span className="text-2xs font-bold text-indigo-950 dark:text-indigo-200">سماء {layerInfo.layer}:</span>
                          </div>

                          <div className="flex items-center gap-1 flex-wrap">
                            {(layerInfo.cipherLetters || []).map((char, slotIdx) => {
                              const isSelected =
                                activeCell?.type === 'cipher' &&
                                activeCell.layerNum === layerInfo.layer &&
                                activeCell.slotIndex === slotIdx;

                              return (
                                <div key={slotIdx} className="relative">
                                  <button
                                    type="button"
                                    onClick={() => handleCellClick('cipher', layerInfo.layer, slotIdx)}
                                    className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center transition-all cursor-pointer border ${
                                      isSelected
                                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/40'
                                        : char
                                        ? 'border-indigo-300 dark:border-indigo-700 bg-white dark:bg-stone-850 text-indigo-950 dark:text-indigo-200 shadow-2xs hover:bg-indigo-50'
                                        : 'border-dashed border-stone-300 dark:border-stone-700 text-stone-300 hover:border-indigo-400'
                                    }`}
                                    title={`خانة سماء ${slotIdx + 1} بالطبقة ${layerInfo.layer}`}
                                  >
                                    {isSelected ? (
                                      <input
                                        ref={inputRef}
                                        type="text"
                                        value={char}
                                        onChange={(e) =>
                                          handleCellChange(e.target.value, 'cipher', layerInfo.layer, slotIdx)
                                        }
                                        onKeyDown={(e) =>
                                          handleCellKeyDown(e, 'cipher', layerInfo.layer, slotIdx)
                                        }
                                        className="w-full h-full text-center bg-transparent text-white font-black text-xs focus:outline-none"
                                      />
                                    ) : (
                                      char || '·'
                                    )}
                                  </button>
                                </div>
                              );
                            })}

                            <div className="flex items-center gap-0.5 ms-1">
                              <button
                                type="button"
                                onClick={() => addCipherSlotToLayer(layerInfo.layer)}
                                className="w-5 h-5 rounded border border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 text-indigo-500 flex items-center justify-center text-3xs cursor-pointer"
                                title="إضافة خانة سماء"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                              {(layerInfo.cipherLetters || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeCipherSlotFromLayer(
                                      layerInfo.layer,
                                      (layerInfo.cipherLetters || []).length - 1
                                    )
                                  }
                                  className="w-5 h-5 rounded border border-stone-200 dark:border-stone-700 hover:border-rose-400 text-stone-400 hover:text-rose-500 flex items-center justify-center text-3xs cursor-pointer"
                                  title="إزالة خانة سماء"
                                >
                                  -
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Earth Side */}
                        <div className="p-2 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-850 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs">🌍</span>
                            <span className="text-2xs font-bold text-emerald-950 dark:text-emerald-200">أرض {layerInfo.layer}:</span>
                          </div>

                          <div className="flex items-center gap-1 flex-wrap">
                            {(layerInfo.arabicLetters || []).map((char, slotIdx) => {
                              const isSelected =
                                activeCell?.type === 'arabic' &&
                                activeCell.layerNum === layerInfo.layer &&
                                activeCell.slotIndex === slotIdx;

                              return (
                                <div key={slotIdx} className="relative">
                                  <button
                                    type="button"
                                    onClick={() => handleCellClick('arabic', layerInfo.layer, slotIdx)}
                                    className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center transition-all cursor-pointer border ${
                                      isSelected
                                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/40'
                                        : char
                                        ? 'border-emerald-300 dark:border-emerald-700 bg-white dark:bg-stone-850 text-emerald-950 dark:text-emerald-200 shadow-2xs hover:bg-emerald-50'
                                        : 'border-dashed border-stone-300 dark:border-stone-700 text-stone-300 hover:border-emerald-400'
                                    }`}
                                    title={`خانة أرض ${slotIdx + 1} بالطبقة ${layerInfo.layer}`}
                                  >
                                    {isSelected ? (
                                      <input
                                        ref={inputRef}
                                        type="text"
                                        value={char}
                                        onChange={(e) =>
                                          handleCellChange(e.target.value, 'arabic', layerInfo.layer, slotIdx)
                                        }
                                        onKeyDown={(e) =>
                                          handleCellKeyDown(e, 'arabic', layerInfo.layer, slotIdx)
                                        }
                                        className="w-full h-full text-center bg-transparent text-white font-black text-xs focus:outline-none"
                                      />
                                    ) : (
                                      char || '·'
                                    )}
                                  </button>
                                </div>
                              );
                            })}

                            <div className="flex items-center gap-0.5 ms-1">
                              <button
                                type="button"
                                onClick={() => addArabicSlotToLayer(layerInfo.layer)}
                                className="w-5 h-5 rounded border border-dashed border-emerald-300 dark:border-emerald-700 hover:border-emerald-500 text-emerald-500 flex items-center justify-center text-3xs cursor-pointer"
                                title="إضافة خانة أرض"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                              {(layerInfo.arabicLetters || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeArabicSlotFromLayer(
                                      layerInfo.layer,
                                      (layerInfo.arabicLetters || []).length - 1
                                    )
                                  }
                                  className="w-5 h-5 rounded border border-stone-200 dark:border-stone-700 hover:border-rose-400 text-stone-400 hover:text-rose-500 flex items-center justify-center text-3xs cursor-pointer"
                                  title="إزالة خانة أرض"
                                >
                                  -
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* SINGLE TABLE VIEW (SKY OR EARTH) */
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* Layer Header Badge */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-xs shadow-xs shrink-0"
                        style={{ backgroundColor: theme.accentHex, color: '#fff' }}
                      >
                        {layerInfo.layer}
                      </div>

                      <div>
                        <h4 className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1">
                          <span>{activeTableTab === 'sky' ? `السماء ${layerInfo.layer}` : `الأرض ${layerInfo.layer}`}</span>
                        </h4>
                        <span className="text-3xs text-stone-400 dark:text-stone-500">
                          {activeTableTab === 'sky'
                            ? `الخانات: ${(layerInfo.cipherLetters || []).filter(Boolean).length}`
                            : `الأحرف: ${(layerInfo.arabicLetters || []).filter(Boolean).length}`}
                        </span>
                      </div>
                    </div>

                    {/* Slots Row */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {activeTableTab === 'sky' ? (
                        /* SKY SLOTS */
                        <div className="flex items-center gap-1 flex-wrap">
                          {(layerInfo.cipherLetters || []).map((char, slotIdx) => {
                            const isSelected =
                              activeCell?.type === 'cipher' &&
                              activeCell.layerNum === layerInfo.layer &&
                              activeCell.slotIndex === slotIdx;

                            return (
                              <div key={slotIdx} className="relative">
                                <button
                                  type="button"
                                  onClick={() => handleCellClick('cipher', layerInfo.layer, slotIdx)}
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-black flex items-center justify-center transition-all cursor-pointer border ${
                                    isSelected
                                      ? 'border-amber-500 bg-amber-500 text-white shadow-md ring-2 ring-amber-400/40'
                                      : char
                                      ? 'border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                                      : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 text-stone-400 hover:border-amber-400'
                                  }`}
                                  title={`خانة سماء ${slotIdx + 1} بالطبقة ${layerInfo.layer}`}
                                >
                                  {isSelected ? (
                                    <input
                                      ref={inputRef}
                                      type="text"
                                      value={char}
                                      onChange={(e) =>
                                        handleCellChange(e.target.value, 'cipher', layerInfo.layer, slotIdx)
                                      }
                                      onKeyDown={(e) =>
                                        handleCellKeyDown(e, 'cipher', layerInfo.layer, slotIdx)
                                      }
                                      className="w-full h-full text-center bg-transparent text-white font-black text-xs sm:text-sm focus:outline-none"
                                    />
                                  ) : (
                                    char || '·'
                                  )}
                                </button>
                              </div>
                            );
                          })}

                          {/* Add / Remove Sky Slot Buttons */}
                          <div className="flex items-center gap-1 ms-1">
                            <button
                              type="button"
                              onClick={() => addCipherSlotToLayer(layerInfo.layer)}
                              className="w-6 h-6 rounded-md border border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500 text-stone-500 hover:text-amber-600 flex items-center justify-center text-xs cursor-pointer transition-colors"
                              title="إضافة خانة سماء جديدة لهذه الطبقة"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            {(layerInfo.cipherLetters || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeCipherSlotFromLayer(
                                    layerInfo.layer,
                                    (layerInfo.cipherLetters || []).length - 1
                                  )
                                }
                                className="w-6 h-6 rounded-md border border-stone-200 dark:border-stone-750 hover:border-rose-400 text-stone-400 hover:text-rose-600 flex items-center justify-center text-xs cursor-pointer transition-colors"
                                title="إزالة آخر خانة سماء من هذه الطبقة"
                              >
                                -
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* EARTH SLOTS */
                        <div className="flex items-center gap-1 flex-wrap">
                          {(layerInfo.arabicLetters || []).map((char, slotIdx) => {
                            const isSelected =
                              activeCell?.type === 'arabic' &&
                              activeCell.layerNum === layerInfo.layer &&
                              activeCell.slotIndex === slotIdx;

                            return (
                              <div key={slotIdx} className="relative">
                                <button
                                  type="button"
                                  onClick={() => handleCellClick('arabic', layerInfo.layer, slotIdx)}
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-black flex items-center justify-center transition-all cursor-pointer border ${
                                    isSelected
                                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/40'
                                      : char
                                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                                      : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 text-stone-400 hover:border-emerald-400'
                                  }`}
                                  title={`خانة أرض ${slotIdx + 1} بالطبقة ${layerInfo.layer}`}
                                >
                                  {isSelected ? (
                                    <input
                                      ref={inputRef}
                                      type="text"
                                      value={char}
                                      onChange={(e) =>
                                        handleCellChange(e.target.value, 'arabic', layerInfo.layer, slotIdx)
                                      }
                                      onKeyDown={(e) =>
                                        handleCellKeyDown(e, 'arabic', layerInfo.layer, slotIdx)
                                      }
                                      className="w-full h-full text-center bg-transparent text-white font-black text-xs sm:text-sm focus:outline-none"
                                    />
                                  ) : (
                                    char || '·'
                                  )}
                                </button>
                              </div>
                            );
                          })}

                          {/* Add / Remove Arabic Slot Buttons */}
                          <div className="flex items-center gap-1 ms-1">
                            <button
                              type="button"
                              onClick={() => addArabicSlotToLayer(layerInfo.layer)}
                              className="w-6 h-6 rounded-md border border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-500 text-stone-500 hover:text-emerald-600 flex items-center justify-center text-xs cursor-pointer transition-colors"
                              title="إضافة خانة أرض جديدة لهذه الطبقة"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            {(layerInfo.arabicLetters || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeArabicSlotFromLayer(
                                    layerInfo.layer,
                                    (layerInfo.arabicLetters || []).length - 1
                                  )
                                }
                                className="w-6 h-6 rounded-md border border-stone-200 dark:border-stone-750 hover:border-rose-400 text-stone-400 hover:text-rose-600 flex items-center justify-center text-xs cursor-pointer transition-colors"
                                title="إزالة آخر خانة أرض من هذه الطبقة"
                              >
                                -
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. QUICK SAVE MODAL (SAVE SKY TABLE OR EARTH TABLE) */}
      {/* ========================================================================= */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-white flex items-center gap-2">
                <BookmarkPlus className="w-4 h-4 text-amber-500" />
                <span>
                  {activeTableTab === 'sky' ? 'حفظ جدول سماء جديد' : 'حفظ جدول أرض جديد'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {activeTableTab === 'sky'
                    ? 'اسم جدول السماء (المقترح: أول حرف وآخر حرف):'
                    : 'اسم جدول الأرض (المقترح: أول حرفين وآخر حرفين):'}
                </label>
                <input
                  type="text"
                  value={saveNameInput}
                  onChange={(e) => setSaveNameInput(e.target.value)}
                  placeholder={suggestedName}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
                <p className="text-3xs text-stone-400 mt-1">
                  سيتم تعيين رقم تسلسلي فريد لهذا الجدول تلقائياً لسهولة استدعائه لاحقاً.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  وصف أو ملاحظة (اختياري):
                </label>
                <input
                  type="text"
                  value={saveDescInput}
                  onChange={(e) => setSaveDescInput(e.target.value)}
                  placeholder="مثال: ترتيب خاص حسب السور، أو قراءة تجريبية..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs cursor-pointer ${
                    activeTableTab === 'sky'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  تأكيد الحفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
