import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  RotateCcw,
  Eraser,
  CheckCircle2,
  AlertTriangle,
  X,
  Key,
  BookmarkPlus,
  BookmarkCheck,
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
  Settings2,
  RefreshCw,
  ArrowUpDown,
  HelpCircle,
  Clock,
  FileText,
  ArrowRight,
} from 'lucide-react';
import {
  getLayerColor,
  PRESET_TABLES,
  ALL_ARABIC_LETTERS_28,
} from '../cipherData';
import { useCipherLayers } from '../context/CipherLayersContext';
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
    activeTableName,
    usedLetters,
    missingLetters,
    duplicateLetters,
    letterCounts,
    totalFilledSlots,
    duplicateCipherLetters,
    savedTables,
    saveCurrentTable,
    loadSavedTable,
    deleteSavedTable,
    deleteAllSavedTables,
    restoreOptionalPresets,
    updateSavedTableName,
    updateSavedTable,
    exportCurrentTableAsFile,
    exportCurrentTableAsTextFile,
    exportSingleSavedTableAsFile,
    exportSingleSavedTableAsTextFile,
    importTablesFromJson,
    removeRowDuplicates,
    columnDuplicatesSummary,
    setLetterAtSlot,
    clearLetterAtSlot,
    clearAllSlots,
    setCipherLettersForLayer,
    addArabicSlotToLayer,
    removeArabicSlotFromLayer,
    addCipherSlotToLayer,
    removeCipherSlotFromLayer,
    reverseAllLayersArabicLetters,
    reverseAllLayersCipherLetters,
    resetToDefault,
    applyPreset,
  } = useCipherLayers();

  // Active cell being edited via keyboard
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sub-view page navigation (replaces popups for clean mobile UX)
  type TableSubView = 'grid' | 'text-editor' | 'bulk-paste' | 'manage-profiles' | 'save-table' | 'column-duplicates';
  const [tableSubView, setTableSubView] = useState<TableSubView>('grid');

  // Dropdown & Sub-view States
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [saveTableNameInput, setSaveTableNameInput] = useState('');
  const [saveTableDescInput, setSaveTableDescInput] = useState('');

  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingTableName, setEditingTableName] = useState('');

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-dismiss notification
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4500);
    return () => clearTimeout(timer);
  }, [notification]);

  // Focus input whenever active cell changes
  useEffect(() => {
    if (activeCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [activeCell]);

  // --- Direct Cell Keyboard Navigation & Typing ---
  const handleCellClick = (type: 'arabic' | 'cipher', layerNum: number, slotIndex: number) => {
    setActiveCell({ type, layerNum, slotIndex });
  };

  const getSortedLayers = () => [...layers].sort((a, b) => b.layer - a.layer);

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

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: 'arabic' | 'cipher',
    layerNum: number,
    slotIndex: number
  ) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        moveToPrevCell({ type, layerNum, slotIndex });
      } else {
        moveToNextCell({ type, layerNum, slotIndex });
      }
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
      // Handled in onChange or if empty, go to prev
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

  // --- Profile Actions ---
  const handleOpenSaveModal = () => {
    const defaultName =
      activeTableName && !Object.values(PRESET_TABLES).some((p) => p.name === activeTableName)
        ? `${activeTableName} (معدّل)`
        : `منظومة مخصصة #${savedTables.length + 1}`;
    setSaveTableNameInput(defaultName);
    setSaveTableDescInput('');
    setTableSubView('save-table');
    setShowProfileMenu(false);
  };

  const handleSaveConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveTableNameInput.trim()) return;
    const saved = saveCurrentTable(saveTableNameInput, saveTableDescInput);
    setTableSubView('grid');
    setNotification({
      type: 'success',
      message: `تم حفظ المنظومة [${saved.name}] بنجاح في مكتبتك!`,
    });
  };

  const handleExportCurrentText = () => {
    exportCurrentTableAsTextFile();
    setNotification({
      type: 'info',
      message: 'جاري تنزيل ملف المنظومة النصي المبسط (.txt)...',
    });
  };

  const handleUpdateProfileWithCurrent = (id: string, name: string) => {
    updateSavedTable(id, { updateWithCurrentLayers: true });
    setNotification({
      type: 'success',
      message: `تم تحديث منظومة [${name}] بحالة الجدول الحالية بنجاح.`,
    });
  };

  const handleDeleteProfile = (id: string, name: string) => {
    deleteSavedTable(id);
    setNotification({
      type: 'info',
      message: `تم حذف منظومة [${name}].`,
    });
  };

  const handleDeleteAllProfiles = () => {
    deleteAllSavedTables();
    setNotification({
      type: 'info',
      message: 'تم حذف كافة المنظومات الإضافية من المتصفح بنجاح، ولم يتبقَ سوى المنظومة المعيارية رقم 4.',
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const result = importTablesFromJson(content);
        if (result.success) {
          setNotification({
            type: 'success',
            message: result.message || 'تم استيراد المنظومة وتطبيقها بنجاح!',
          });
        } else {
          setNotification({
            type: 'error',
            message: result.message || 'تعذر استيراد الملف، يرجى التحقق من توافق البيانات.',
          });
        }
      } catch (err) {
        setNotification({
          type: 'error',
          message: 'حدث خطأ أثناء قراءة ملف المنظومة.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportCurrent = () => {
    exportCurrentTableAsFile();
    setNotification({
      type: 'info',
      message: 'جاري تنزيل ملف منظومة التشفير (JSON)...',
    });
  };

  const handleRemoveRowDuplicates = () => {
    const res = removeRowDuplicates();
    if (res.totalRemoved === 0) {
      setNotification({
        type: 'info',
        message: 'فحص الصفوف: لا يوجد أي تكرار لنفس الحرف في نفس الصف.',
      });
    } else {
      setNotification({
        type: 'success',
        message: `تم تنظيف ${res.totalRemoved} حرفاً مكرراً بالصف نفسه.`,
      });
    }
  };

  // Render sorted layers (7 down to 1)
  const sortedLayers = getSortedLayers();

  return (
    <div className="space-y-3.5">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".txt,.json,text/plain,application/json"
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* SUB-VIEW NAVIGATION TABS (صفحات مستقلة مريحة للموبايل وبدون نوافذ منبثقة) */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-x-auto scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => setTableSubView('grid')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            tableSubView === 'grid'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>جدول الطبقات التفاعلي</span>
        </button>

        <button
          type="button"
          onClick={() => setTableSubView('text-editor')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            tableSubView === 'text-editor'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>المحرر النصي (سطر بسطر)</span>
          <span
            className={`text-3xs px-1.5 py-0.5 rounded-md font-extrabold ${
              tableSubView === 'text-editor'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            الأسهل للموبايل
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTableSubView('bulk-paste')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            tableSubView === 'bulk-paste'
              ? 'bg-amber-500 text-stone-950 shadow-2xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <ClipboardPaste className="w-4 h-4 text-amber-500" />
          <span>لصق وتوزيع الأحرف</span>
        </button>

        <button
          type="button"
          onClick={() => setTableSubView('manage-profiles')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            tableSubView === 'manage-profiles'
              ? 'bg-stone-900 text-white dark:bg-stone-700 shadow-2xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <Settings2 className="w-4 h-4 text-stone-400" />
          <span>مكتبة المنظومات ({savedTables.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTableSubView('column-duplicates')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            tableSubView === 'column-duplicates'
              ? 'bg-stone-900 text-white dark:bg-stone-700 shadow-2xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <Columns className="w-4 h-4 text-stone-400" />
          <span>فحص التكرارات بالأعمدة</span>
          {columnDuplicatesSummary.hasDuplicates && (
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          )}
        </button>
      </div>

      {/* Sub-view: Plain Text Line-by-Line Editor (سطر شيفرة وسطر عربي) */}
      {tableSubView === 'text-editor' && (
        <TextEditorView
          onBackToGrid={() => setTableSubView('grid')}
          onNotification={(type, msg) => setNotification({ type, message: msg })}
        />
      )}

      {/* Sub-view: Bulk Paste Full-Page */}
      {tableSubView === 'bulk-paste' && (
        <BulkPasteModal
          isOpen={true}
          isPage={true}
          onClose={() => setTableSubView('grid')}
          onSuccessNotification={(msg) => {
            setNotification({ type: 'success', message: msg });
            setTableSubView('grid');
          }}
        />
      )}

      {/* Sub-view: Interactive Grid and Controls */}
      {tableSubView === 'grid' && (
        <>
          {/* ========================================================================= */}
          {/* 1. MAIN UNIFIED CONTROL CARD */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs p-4 sm:p-5 space-y-3.5">
            
            {/* ROW 1: PROFILE & FILE MANAGEMENT (شريط المنظومة والملفات) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
              
              {/* Profile Selector Dropdown */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="h-10 px-3.5 rounded-xl bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-stone-500 dark:text-stone-400 font-normal">المنظومة:</span>
                    <span className="text-stone-900 dark:text-white max-w-[180px] sm:max-w-[240px] truncate">
                      {activeTableName || 'المنظومة المعيارية القياسية'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400 mr-1" />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {showProfileMenu && (
                    <div className="absolute top-full right-0 mt-1.5 w-80 sm:w-96 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[80vh] overflow-y-auto">
                      
                      {/* Standard Presets */}
                      <div className="px-3 py-1.5 text-3xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                        المنظومات القياسية المعيارية
                      </div>
                      {Object.entries(PRESET_TABLES).map(([key, preset]) => {
                        const isActive = activeTableName === preset.name;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              applyPreset(key as keyof typeof PRESET_TABLES);
                              setShowProfileMenu(false);
                              setNotification({
                                type: 'success',
                                message: `تم تطبيق [${preset.name}] بنجاح.`,
                              });
                            }}
                            className={`w-full px-3 py-2 text-right text-xs flex items-center justify-between gap-2 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer transition-colors ${
                              isActive
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 font-bold'
                                : 'text-stone-700 dark:text-stone-200 font-medium'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="truncate">{preset.name}</div>
                              <div className="text-3xs text-stone-400 truncate">{preset.description}</div>
                            </div>
                            {isActive && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                          </button>
                        );
                      })}

                      {/* Saved User Profiles */}
                      <div className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                        <div className="px-3 py-1.5 flex items-center justify-between text-3xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                          <span>منظوماتك المحفوظة ({savedTables.length})</span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowProfileMenu(false);
                              setTableSubView('manage-profiles');
                            }}
                            className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            إدارة الكل
                          </button>
                        </div>

                    {savedTables.length === 0 ? (
                      <div className="px-3 py-2.5 text-center text-stone-400 text-xs italic">
                        لا توجد منظومات محفوظة بعد
                      </div>
                    ) : (
                      savedTables.map((tbl) => {
                        const isActive = activeTableName === tbl.name;
                        return (
                          <div
                            key={tbl.id}
                            className={`px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors ${
                              isActive ? 'bg-emerald-50/70 dark:bg-emerald-950/30 font-bold' : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                loadSavedTable(tbl.id);
                                setShowProfileMenu(false);
                                setNotification({
                                  type: 'success',
                                  message: `تم تطبيق المنظومة [${tbl.name}].`,
                                });
                              }}
                              className="flex-1 text-right text-xs text-stone-800 dark:text-stone-200 truncate cursor-pointer"
                            >
                              <div className="truncate">{tbl.name}</div>
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* Quick update with current table */}
                              <button
                                type="button"
                                onClick={() => handleUpdateProfileWithCurrent(tbl.id, tbl.name)}
                                className="p-1 text-stone-400 hover:text-emerald-600 rounded cursor-pointer"
                                title="تحديث هذه المنظومة بحالة الجدول الحالي"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              {/* Quick delete */}
                              <button
                                type="button"
                                onClick={() => handleDeleteProfile(tbl.id, tbl.name)}
                                className="p-1 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
                                title="حذف المنظومة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              {isActive && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Bottom Action in dropdown */}
                  <div className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-800 px-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleOpenSaveModal}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>حفظ المنظومة الحالية</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        restoreOptionalPresets();
                        setNotification({
                          type: 'success',
                          message: 'تمت استعادة المنظومات المقترحة إلى مكتبة المتصفح بنجاح.',
                        });
                      }}
                      className="py-1.5 px-2 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 text-2xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      title="استعادة المنظومات المقترحة الإضافية للمتصفح"
                    >
                      <RotateCcw className="w-3 h-3 text-emerald-600" />
                      <span>استعادة المقترحات</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Save Profile Button */}
            <button
              type="button"
              onClick={handleOpenSaveModal}
              className="h-10 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              title="حفظ المنظومة الحالية وتخزينها في مكتبتك"
            >
              <Save className="w-4 h-4" />
              <span>حفظ المنظومة</span>
            </button>

            {/* Manage Saved Profiles */}
            <button
              type="button"
              onClick={() => setTableSubView('manage-profiles')}
              className="h-10 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="إدارة وتعديل وحذف المنظومات المحفوظة"
            >
              <Settings2 className="w-4 h-4 text-stone-500" />
              <span>إدارة المنظومات</span>
            </button>
          </div>

          {/* Import / Export Controls */}
          <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-10 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="استيراد ملف منظومة تشفير (TXT مبسط أو JSON)"
            >
              <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>استيراد</span>
            </button>

            {/* Export as Simple Line-by-Line Text */}
            <button
              type="button"
              onClick={handleExportCurrentText}
              className="h-10 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              title="تصدير المنظومة كملف نصي مبسط (.txt) سطر منفرد للشيفرة وسطر منفرد للعربي"
            >
              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>تصدير نصي (.txt)</span>
            </button>

            {/* Export JSON */}
            <button
              type="button"
              onClick={handleExportCurrent}
              className="h-10 px-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-600 dark:text-stone-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              title="تصدير كامل كملف JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* ROW 2: TABLE ACTIONS (أدوات التحكم بالجدول) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Plain Text Editor Button */}
            <button
              type="button"
              onClick={() => setTableSubView('text-editor')}
              className="h-9 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="فتح المحرر النصي سطر-بسطر السهل للتعديل اليدوي"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>المحرر النصي (سطر بسطر)</span>
            </button>

            {/* Bulk Paste */}
            <button
              type="button"
              onClick={() => setTableSubView('bulk-paste')}
              className="h-9 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="لصق نص وتوزيعه مباشرة على الخانات"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-amber-600" />
              <span>لصق وتوزيع الأحرف</span>
            </button>

            {/* Clean row duplicates */}
            <button
              type="button"
              onClick={handleRemoveRowDuplicates}
              className="h-9 px-3 rounded-xl bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              title="حذف أي تكرار لنفس الحرف في السطر الواحد"
            >
              <span>تنظيف تكرار الصف</span>
            </button>

            {/* Clear table */}
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="h-9 px-3 rounded-xl bg-stone-50 dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-stone-200 dark:border-stone-700 hover:border-rose-300 text-stone-600 dark:text-stone-400 hover:text-rose-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              title="تفريغ خانات الأحرف في الجدول"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>تفريغ الجدول</span>
            </button>

            {/* Reset to default */}
            {isCustomized && (
              <button
                type="button"
                onClick={() => {
                  resetToDefault();
                  setNotification({
                    type: 'info',
                    message: 'تمت استعادة الجدول الافتراضي الأصلي.',
                  });
                }}
                className="h-9 px-3 rounded-xl bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                title="الرجوع لجدول المنظومة المعيارية الأصلي"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الافتراضي</span>
              </button>
            )}
          </div>

          {/* Quick flip actions */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => {
                reverseAllLayersArabicLetters();
                setNotification({
                  type: 'success',
                  message: 'تم عكس ترتيب الأحرف العربية عامودياً بين الطبقات.',
                });
              }}
              className="h-8 px-2.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 text-2xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              title="عكس ترتيب الأحرف العربية بين الطبقات (الطبقة 7 تصبح 1 وهكذا)"
            >
              <ArrowUpDown className="w-3 h-3 text-emerald-600" />
              <span>عكس الأحرف العربية</span>
            </button>

            <button
              type="button"
              onClick={() => {
                reverseAllLayersCipherLetters();
                setNotification({
                  type: 'success',
                  message: 'تم عكس ترتيب أحرف التشفير عامودياً بين الطبقات.',
                });
              }}
              className="h-8 px-2.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 text-2xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              title="عكس ترتيب أحرف التشفير بين الطبقات"
            >
              <ArrowUpDown className="w-3 h-3 text-indigo-600" />
              <span>عكس أحرف التشفير</span>
            </button>
          </div>
        </div>

        {/* ROW 3: STATUS SUMMARY & TIP (ملخص الحالة والنصيحة الهادئة) */}
        <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Pill */}
            {missingLetters.length === 0 && duplicateLetters.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>الجدول مكتمل (28/28 حرفاً موزعة بدون تكرار)</span>
              </span>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-amber-800 dark:text-amber-200 font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>تم ملء {totalFilledSlots} من 28 خانة</span>
                  {missingLetters.length > 0 && (
                    <span className="font-normal text-stone-500 dark:text-stone-400">
                      (متبقي {missingLetters.length} حرفاً)
                    </span>
                  )}
                </span>

                {duplicateLetters.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300 font-bold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-lg text-2xs">
                    تكرار: {duplicateLetters.join('، ')}
                  </span>
                )}
              </div>
            )}

            {/* Column Duplicates Link (only if exists) */}
            {columnDuplicatesSummary.hasDuplicates && (
              <button
                type="button"
                onClick={() => setTableSubView('column-duplicates')}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-amber-50 text-amber-900 dark:text-amber-300 border border-stone-200 dark:border-stone-700 rounded-lg text-2xs font-bold cursor-pointer transition-colors"
                title="عرض تقرير تكرار الأحرف بالأعمدة بين الطبقات"
              >
                <Columns className="w-3 h-3 text-amber-600" />
                <span>تكرار بالأعمدة ({columnDuplicatesSummary.totalDuplicatesCount})</span>
                <span className="underline text-3xs font-normal">عرض</span>
              </button>
            )}
          </div>

          {/* Clean Helpful Tip */}
          <div className="text-stone-400 dark:text-stone-500 text-2xs flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-stone-400" />
            <span>انقر على أي خانة واكتب الحرف بالكيبورد للتعديل الفوري.</span>
          </div>
        </div>

        {/* Inline Confirmation: Clear Table */}
        {showClearConfirm && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <h4 className="font-bold text-rose-900 dark:text-rose-200 text-xs sm:text-sm">
                  هل تريد بالتأكيد تفريغ خانات الأحرف في الجدول؟
                </h4>
                <p className="text-2xs text-rose-700 dark:text-rose-300 mt-0.5">
                  سيتم تفريغ جميع الأحرف العربية في الجدول لتتمكن من بنائه من الصفر، ويمكنك استعادة الافتراضي بأي وقت.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllSlots();
                  setShowClearConfirm(false);
                  setNotification({
                    type: 'info',
                    message: 'تم تفريغ الجدول بنجاح.',
                  });
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs"
              >
                تفريغ الآن
              </button>
            </div>
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                : notification.type === 'error'
                ? 'bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                : 'bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 border border-blue-300 dark:border-blue-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : notification.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. STREAMLINED 3-COLUMN TABLE ("كذا مقابله كذا") */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-850 text-xs font-bold text-stone-600 dark:text-stone-300 border-b border-stone-200 dark:border-stone-800">
                <th className="py-3 px-4 w-28 sm:w-32 whitespace-nowrap">الطبقة</th>
                <th className="py-3 px-4 w-1/3 min-w-[200px]">أحرف التشفير المقابلة</th>
                <th className="py-3 px-4">الأحرف العربية في الطبقة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-sm">
              {sortedLayers.map((layerItem) => {
                const isHighlighted = highlightedLayerNumbers.includes(layerItem.layer);
                const color = getLayerColor(layerItem.layer);

                return (
                  <tr
                    key={layerItem.layer}
                    className={`transition-colors duration-150 ${
                      isHighlighted
                        ? `${color.lightBg} ring-1 ring-inset ${color.lightBorder}`
                        : 'hover:bg-stone-50/50 dark:hover:bg-stone-850/40'
                    }`}
                  >
                    {/* COLUMN 1: LAYER NUMBER BADGE ONLY (بدون نصوص أو أوصاف مشتتة) */}
                    <td className="py-3 px-4 align-middle whitespace-nowrap">
                      <span
                        className={`inline-flex items-center justify-center px-3 py-1 rounded-xl font-bold text-xs ${color.activeBg} ${color.activeText} shadow-xs`}
                      >
                        الطبقة {layerItem.layer}
                      </span>
                    </td>

                    {/* COLUMN 2: CIPHER LETTERS (أحرف التشفير المقابلة) */}
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {layerItem.cipherLetters.map((char, cIdx) => {
                          const isCurrentActive =
                            activeCell?.type === 'cipher' &&
                            activeCell?.layerNum === layerItem.layer &&
                            activeCell?.slotIndex === cIdx;

                          return (
                            <div
                              key={cIdx}
                              onClick={() => handleCellClick('cipher', layerItem.layer, cIdx)}
                              className={`relative group min-w-8 h-9 px-1.5 rounded-lg flex items-center justify-center border font-['Amiri',serif] text-base font-bold transition-all cursor-pointer select-none ${
                                isCurrentActive
                                  ? 'bg-amber-100 dark:bg-amber-950 border-2 border-amber-500 ring-2 ring-amber-300 dark:ring-amber-700 text-amber-950 dark:text-amber-100 scale-105'
                                  : char
                                  ? 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs hover:border-amber-400'
                                  : 'border-dashed border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 text-stone-300 hover:border-stone-400'
                              }`}
                              title={char ? `انقر لتعديل حرف التشفير [${char}]` : 'خانة فارغة - انقر للكتابة'}
                            >
                              {isCurrentActive ? (
                                <input
                                  ref={inputRef}
                                  type="text"
                                  value={char || ''}
                                  onChange={(e) =>
                                    handleCellChange(e.target.value, 'cipher', layerItem.layer, cIdx)
                                  }
                                  onKeyDown={(e) =>
                                    handleCellKeyDown(e, 'cipher', layerItem.layer, cIdx)
                                  }
                                  onBlur={() => setActiveCell(null)}
                                  className="w-full h-full text-center bg-transparent outline-none font-bold text-base font-['Amiri',serif]"
                                />
                              ) : (
                                <span>{char || '—'}</span>
                              )}

                              {/* Hover remove slot button if > 1 slots */}
                              {layerItem.cipherLetters.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeCipherSlotFromLayer(layerItem.layer, cIdx);
                                  }}
                                  className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
                                  title="حذف هذه الخانة"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {/* Add Cipher Slot button */}
                        <button
                          type="button"
                          onClick={() => {
                            addCipherSlotToLayer(layerItem.layer, '');
                            setActiveCell({
                              type: 'cipher',
                              layerNum: layerItem.layer,
                              slotIndex: layerItem.cipherLetters.length,
                            });
                          }}
                          className="w-7 h-9 rounded-lg border border-dashed border-stone-300 dark:border-stone-700 hover:border-stone-400 text-stone-400 hover:text-stone-700 flex items-center justify-center cursor-pointer transition-colors"
                          title="إضافة خانة حرف تشفير إضافية لهذه الطبقة"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* COLUMN 3: ARABIC LETTERS (الأحرف العربية في الطبقة) */}
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-2 flex-wrap">
                        {layerItem.arabicLetters.map((arabicChar, slotIndex) => {
                          const isCurrentActive =
                            activeCell?.type === 'arabic' &&
                            activeCell?.layerNum === layerItem.layer &&
                            activeCell?.slotIndex === slotIndex;

                          const count = arabicChar ? letterCounts[arabicChar] || 0 : 0;
                          const isDuplicate = count > 1;

                          return (
                            <div
                              key={slotIndex}
                              onClick={() => handleCellClick('arabic', layerItem.layer, slotIndex)}
                              className={`relative group min-w-11 h-11 px-2.5 rounded-xl flex items-center justify-center border font-['Amiri',serif] text-xl font-bold transition-all cursor-pointer select-none ${
                                isCurrentActive
                                  ? 'bg-amber-100 dark:bg-amber-950 border-2 border-amber-500 ring-2 ring-amber-300 dark:ring-amber-700 text-amber-950 dark:text-amber-100 scale-105 shadow-sm'
                                  : isDuplicate
                                  ? 'bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-400 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                                  : arabicChar
                                  ? 'bg-stone-100 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-stone-300 dark:border-stone-700 hover:border-amber-400 text-stone-900 dark:text-stone-100 shadow-2xs'
                                  : 'border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-400 bg-stone-50 dark:bg-stone-850 text-stone-300'
                              }`}
                              title={
                                arabicChar
                                  ? `انقر لتعديل الحرف [${arabicChar}] بالكيبورد`
                                  : 'خانة فارغة - انقر للكتابة فوراً'
                              }
                            >
                              {isCurrentActive ? (
                                <input
                                  ref={inputRef}
                                  type="text"
                                  value={arabicChar || ''}
                                  onChange={(e) =>
                                    handleCellChange(e.target.value, 'arabic', layerItem.layer, slotIndex)
                                  }
                                  onKeyDown={(e) =>
                                    handleCellKeyDown(e, 'arabic', layerItem.layer, slotIndex)
                                  }
                                  onBlur={() => setActiveCell(null)}
                                  className="w-full h-full text-center bg-transparent outline-none font-bold text-xl font-['Amiri',serif]"
                                />
                              ) : (
                                <span>{arabicChar || '—'}</span>
                              )}

                              {/* Hover quick remove slot if > 1 slots */}
                              {layerItem.arabicLetters.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeArabicSlotFromLayer(layerItem.layer, slotIndex);
                                  }}
                                  className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
                                  title="حذف هذه الخانة"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {/* Add Arabic Slot button */}
                        <button
                          type="button"
                          onClick={() => {
                            addArabicSlotToLayer(layerItem.layer, '');
                            setActiveCell({
                              type: 'arabic',
                              layerNum: layerItem.layer,
                              slotIndex: layerItem.arabicLetters.length,
                            });
                          }}
                          className="h-11 px-2.5 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-500 text-stone-400 hover:text-emerald-600 flex items-center justify-center cursor-pointer transition-colors text-xs font-bold gap-1"
                          title="إضافة خانة حرف عربي جديدة لهذه الطبقة"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">خانة</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* ========================================================================= */}
      {/* 2. SUB-VIEW PAGE: SAVE PROFILE (صفحة حفظ المنظومة) */}
      {/* ========================================================================= */}
      {tableSubView === 'save-table' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden animate-in fade-in duration-150">
          <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BookmarkPlus className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm sm:text-base">حفظ المنظومة الحالية في مكتبة المتصفح</h3>
                <p className="text-2xs text-stone-400 mt-0.5">تُحفظ المنظومة محلياً وتظهر في قائمتك للاستخدام بأي وقت</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTableSubView('grid')}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الرجوع للجدول</span>
            </button>
          </div>

          <form onSubmit={handleSaveConfirm} className="p-5 sm:p-6 space-y-5 max-w-xl mx-auto">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                اسم المنظومة <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={saveTableNameInput}
                onChange={(e) => setSaveTableNameInput(e.target.value)}
                placeholder="مثال: منظومتي الخاصة، دراسة سورة الإسراء..."
                className="w-full px-4 py-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                ملاحظات أو وصف توضيحي (اختياري)
              </label>
              <textarea
                rows={3}
                value={saveTableDescInput}
                onChange={(e) => setSaveTableDescInput(e.target.value)}
                placeholder="ملاحظات حول توزيع الأحرف أو أحرف التشفير..."
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setTableSubView('grid')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer transition-all hover:shadow"
              >
                حفظ المنظومة الآن
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUB-VIEW PAGE: MANAGE PROFILES (صفحة إدارة المنظومات) */}
      {/* ========================================================================= */}
      {tableSubView === 'manage-profiles' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden animate-in fade-in duration-150">
          <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <Settings2 className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm sm:text-base">
                  إدارة المنظومات المحفوظة بالمتصفح ({savedTables.length})
                </h3>
                <p className="text-2xs text-stone-400 mt-0.5">
                  المنظومات الإضافية مخزنة على متصفحك ويمكنك حذفها أو استيراد وتصدير ملفاتها بسهولة
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {savedTables.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAllProfiles}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors border border-rose-800/60"
                  title="حذف كافة المنظومات الإضافية والإبقاء على المنظومة 4 فقط"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>حذف كافة المنظومات (الإبقاء على 4 فقط)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setTableSubView('grid')}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>الرجوع للجدول</span>
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 divide-y divide-stone-100 dark:divide-stone-800 space-y-3">
            {savedTables.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <BookmarkCheck className="w-12 h-12 text-stone-300 dark:text-stone-600 mb-2" />
                <p className="text-stone-700 dark:text-stone-200 text-sm font-bold">لا توجد منظومات إضافية في مكتبة المتصفح حالياً.</p>
                <p className="text-stone-400 text-xs mt-1 max-w-md mx-auto mb-5 leading-relaxed">
                  المنظومة المعيارية القياسية (رقم 4 - المعتمدة) هي المقياس الأساسي الثابت في البرنامج، ويمكنك حذف المنظومات الأخرى أو استعادتها بأي وقت.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    restoreOptionalPresets();
                    setNotification({
                      type: 'success',
                      message: 'تمت استعادة المنظومات المقترحة إلى مكتبة المتصفح بنجاح.',
                    });
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-colors border border-emerald-200 dark:border-emerald-800 shadow-2xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>استعادة المنظومات المقترحة للمتصفح</span>
                </button>
              </div>
            ) : (
              savedTables.map((tbl) => {
                const isActive = activeTableName === tbl.name;
                const isRenaming = editingTableId === tbl.id;

                return (
                  <div
                    key={tbl.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 shadow-2xs'
                        : 'bg-stone-50/60 dark:bg-stone-850/60 border-stone-200 dark:border-stone-750'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Title & Info */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isRenaming ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                autoFocus
                                value={editingTableName}
                                onChange={(e) => setEditingTableName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (editingTableName.trim()) {
                                      updateSavedTableName(tbl.id, editingTableName.trim());
                                    }
                                    setEditingTableId(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingTableId(null);
                                  }
                                }}
                                className="px-2.5 py-1 text-xs border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingTableName.trim()) {
                                    updateSavedTableName(tbl.id, editingTableName.trim());
                                  }
                                  setEditingTableId(null);
                                }}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-md cursor-pointer"
                                title="تأكيد الاسم"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTableId(null)}
                                className="p-1.5 text-stone-400 hover:bg-stone-200 rounded-md cursor-pointer"
                                title="إلغاء"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-bold text-stone-900 dark:text-white text-sm truncate">
                                {tbl.name}
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTableId(tbl.id);
                                  setEditingTableName(tbl.name);
                                }}
                                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1 rounded-md cursor-pointer"
                                title="تعديل اسم المنظومة"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                              <Check className="w-3 h-3 text-emerald-700" />
                              نشطة حالياً
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-3xs text-stone-400 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(tbl.createdAt).toLocaleString('ar-EG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          {tbl.description && <span>• {tbl.description}</span>}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center flex-wrap">
                        {/* Apply */}
                        <button
                          type="button"
                          onClick={() => {
                            loadSavedTable(tbl.id);
                            setTableSubView('grid');
                            setNotification({
                              type: 'success',
                              message: `تم تطبيق [${tbl.name}] على النظام بنجاح.`,
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition-colors shadow-2xs"
                        >
                          تطبيق على الجدول
                        </button>

                        {/* Overwrite with current table */}
                        <button
                          type="button"
                          onClick={() => handleUpdateProfileWithCurrent(tbl.id, tbl.name)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="تحديث محتوى هذه المنظومة بالجدول المعروض حالياً"
                        >
                          <RefreshCw className="w-3 h-3 text-emerald-600" />
                          <span>تحديث بالحالي</span>
                        </button>

                        {/* Export text line-by-line */}
                        <button
                          type="button"
                          onClick={() => exportSingleSavedTableAsTextFile(tbl.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1 cursor-pointer"
                          title="تصدير هذه المنظومة كملف نصي مبسط (.txt) سطر بسطر"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                          <span>TXT</span>
                        </button>

                        {/* Export JSON */}
                        <button
                          type="button"
                          onClick={() => exportSingleSavedTableAsFile(tbl.id)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                          title="تصدير هذه المنظومة كملف JSON"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteProfile(tbl.id, tbl.name)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                          title="حذف هذه المنظومة نهائياً من المتصفح"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-5 py-3.5 bg-stone-50 dark:bg-stone-850 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                restoreOptionalPresets();
                setNotification({
                  type: 'success',
                  message: 'تمت استعادة المنظومات المقترحة إلى مكتبة المتصفح بنجاح.',
                });
              }}
              className="text-xs text-stone-600 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
              <span>استعادة المنظومات المقترحة</span>
            </button>

            <button
              type="button"
              onClick={() => setTableSubView('grid')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100 cursor-pointer transition-colors"
            >
              الرجوع للجدول
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUB-VIEW PAGE: COLUMN DUPLICATES SUMMARY (فحص التكرارات بالأعمدة) */}
      {/* ========================================================================= */}
      {tableSubView === 'column-duplicates' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden animate-in fade-in duration-150">
          <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Columns className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-sm sm:text-base">ملخص تكرار الأحرف في الأعمدة (بين الطبقات)</h3>
                <p className="text-2xs text-stone-400 mt-0.5">مراقبة الأحرف المتطابقة التي تقع في نفس العمود رأسياً</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTableSubView('grid')}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الرجوع للجدول</span>
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-4 text-xs max-w-3xl mx-auto">
            <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
              يقوم هذا الفحص بمراقبة الأحرف المتطابقة التي تقع في <strong>نفس العمود رأسياً</strong> عبر مختلف طبقات الجدول.
            </p>

            {/* Arabic duplicates */}
            <div className="border border-stone-200 dark:border-stone-750 rounded-xl p-4 bg-stone-50/70 dark:bg-stone-850/50">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-stone-900 dark:text-white flex items-center gap-2 text-xs sm:text-sm">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>تكرار الأحرف العربية عبر الأعمدة</span>
                </span>
                <span className="text-3xs font-black px-2.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                  {columnDuplicatesSummary.arabicDuplicates.length > 0
                    ? `${columnDuplicatesSummary.arabicDuplicates.length} تكرار`
                    : 'متوازنة'}
                </span>
              </div>

              {columnDuplicatesSummary.arabicDuplicates.length === 0 ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>لا يوجد أي تكرار لنفس الحرف العربي عبر الأعمدة بين الطبقات. التوزيع سليم ومتوازن!</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {columnDuplicatesSummary.arabicDuplicates.map((dup, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-stone-800 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-black font-['Amiri',serif] text-lg">
                          {dup.char}
                        </span>
                        <div>
                          <span className="font-bold text-stone-900 dark:text-white block text-sm">
                            «{dup.char}»
                          </span>
                          <span className="text-2xs text-stone-500 dark:text-stone-400">
                            تكرر في: الطبقة {dup.layers.join('، ')}
                          </span>
                        </div>
                      </div>
                      <span className="text-3xs font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                        مكرر عمودياً
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-5 py-3.5 bg-stone-50 dark:bg-stone-850 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setTableSubView('grid')}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-900 text-white cursor-pointer transition-colors"
            >
              الرجوع للجدول
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
