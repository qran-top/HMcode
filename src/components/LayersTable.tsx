import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  ArrowUpDown,
  RotateCcw,
  Eraser,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  GripVertical,
  X,
  Key,
  MousePointerClick,
  HelpCircle,
  BookmarkPlus,
  BookmarkCheck,
  Download,
  Upload,
  FileJson,
  Trash2,
  Edit3,
  Check,
  FolderArchive,
  Clock,
  Scissors,
  Columns,
  ChevronDown,
  BookOpen,
} from 'lucide-react';
import {
  LAYER_RAINBOW_COLORS,
  PRESET_TABLES,
  ALL_ARABIC_LETTERS_28,
  NOORANI_LETTERS,
  ARABIC_PRESETS,
  NOORANI_PRESETS,
} from '../cipherData';
import { useCipherLayers, SelectedSlot } from '../context/CipherLayersContext';

interface LayersTableProps {
  highlightedLayerNumbers?: number[];
  onSelectLetter?: (char: string) => void;
}

type InteractionMode = 'edit' | 'type';

interface DragSource {
  type: 'slot' | 'bank';
  layerNum?: number;
  slotIndex?: number;
  char: string;
}

export function LayersTable({
  highlightedLayerNumbers = [],
  onSelectLetter,
}: LayersTableProps) {
  const {
    layers,
    isCustomized,
    activeTableName,
    selectedSlot,
    setSelectedSlot,
    usedLetters,
    missingLetters,
    duplicateLetters,
    letterCounts,
    totalFilledSlots,
    validCipherLetters,
    cipherLetterCounts,
    duplicateCipherLetters,
    savedTables,
    saveCurrentTable,
    loadSavedTable,
    deleteSavedTable,
    updateSavedTableName,
    exportCurrentTableAsFile,
    exportSingleSavedTableAsFile,
    exportAllSavedTablesAsFile,
    importTablesFromJson,
    savedArabicPresets,
    activeArabicPresetName,
    saveCurrentArabicPreset,
    applyArabicDistribution,
    deleteSavedArabicPreset,
    savedNooraniPresets,
    activeNooraniPresetName,
    saveCurrentNooraniPreset,
    applyNooraniDistribution,
    deleteSavedNooraniPreset,
    removeRowDuplicates,
    columnDuplicatesSummary,
    swapSlots,
    setLetterAtSlot,
    clearLetterAtSlot,
    clearAllSlots,
    setCipherLettersForLayer,
    resetToDefault,
    applyPreset,
  } = useCipherLayers();

  // Mode: 'edit' (drag & drop, swap, custom placement) or 'type' (click to append to text)
  const [mode, setMode] = useState<InteractionMode>('edit');
  const [editingCipherLayer, setEditingCipherLayer] = useState<number | null>(null);
  const [cipherInputs, setCipherInputs] = useState<string[]>(Array(9).fill(''));
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showArabicMenu, setShowArabicMenu] = useState(false);
  const [showNooraniMenu, setShowNooraniMenu] = useState(false);
  const [selectedBankLetter, setSelectedBankLetter] = useState<string | null>(null);

  // Modals & Storage states
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTableNameInput, setSaveTableNameInput] = useState('');
  const [saveTableDescInput, setSaveTableDescInput] = useState('');
  const [showSaveArabicModal, setShowSaveArabicModal] = useState(false);
  const [saveArabicNameInput, setSaveArabicNameInput] = useState('');
  const [saveArabicDescInput, setSaveArabicDescInput] = useState('');
  const [showSaveNooraniModal, setShowSaveNooraniModal] = useState(false);
  const [saveNooraniNameInput, setSaveNooraniNameInput] = useState('');
  const [saveNooraniDescInput, setSaveNooraniDescInput] = useState('');
  const [showColumnDuplicatesModal, setShowColumnDuplicatesModal] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [editingSavedTableId, setEditingSavedTableId] = useState<string | null>(null);
  const [editingSavedTableName, setEditingSavedTableName] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const arabicMenuRef = useRef<HTMLDivElement>(null);
  const nooraniMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (presetMenuRef.current && !presetMenuRef.current.contains(e.target as Node)) {
        setShowPresetMenu(false);
      }
      if (arabicMenuRef.current && !arabicMenuRef.current.contains(e.target as Node)) {
        setShowArabicMenu(false);
      }
      if (nooraniMenuRef.current && !nooraniMenuRef.current.contains(e.target as Node)) {
        setShowNooraniMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-dismiss notification after 4.5 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [notification]);

  // Drag and Drop state
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ layerNum: number; slotIndex: number } | null>(null);

  // Handle Drag Start from a Slot
  const handleSlotDragStart = (e: React.DragEvent, layerNum: number, slotIndex: number, char: string) => {
    if (!char || mode !== 'edit') return;
    const source: DragSource = { type: 'slot', layerNum, slotIndex, char };
    setDragSource(source);
    e.dataTransfer.setData('text/plain', JSON.stringify(source));
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle Drag Start from the Letter Bank
  const handleBankDragStart = (e: React.DragEvent, char: string) => {
    if (mode !== 'edit') return;
    const source: DragSource = { type: 'bank', char };
    setDragSource(source);
    e.dataTransfer.setData('text/plain', JSON.stringify(source));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Handle Drag Over a Slot
  const handleDragOver = (e: React.DragEvent, layerNum: number, slotIndex: number) => {
    if (mode !== 'edit') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOverTarget || dragOverTarget.layerNum !== layerNum || dragOverTarget.slotIndex !== slotIndex) {
      setDragOverTarget({ layerNum, slotIndex });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
  };

  // Handle Drop onto a Slot
  const handleDrop = (e: React.DragEvent, targetLayerNum: number, targetSlotIndex: number) => {
    e.preventDefault();
    setDragOverTarget(null);
    let source = dragSource;

    if (!source) {
      try {
        const data = e.dataTransfer.getData('text/plain');
        if (data) source = JSON.parse(data);
      } catch (err) {
        console.error('Drop error:', err);
      }
    }

    if (!source) return;

    if (source.type === 'slot' && source.layerNum !== undefined && source.slotIndex !== undefined) {
      // Swapping two slots
      if (source.layerNum === targetLayerNum && source.slotIndex === targetSlotIndex) return;
      swapSlots(source.layerNum, source.slotIndex, targetLayerNum, targetSlotIndex);
    } else if (source.type === 'bank') {
      // Placing from bank
      setLetterAtSlot(targetLayerNum, targetSlotIndex, source.char);
    }

    setDragSource(null);
    setSelectedBankLetter(null);
    setSelectedSlot(null);
  };

  // Handle Clicking on a Slot
  const handleSlotClick = (layerNum: number, slotIndex: number, char: string) => {
    if (mode === 'type') {
      if (char && onSelectLetter) {
        onSelectLetter(char);
      }
      return;
    }

    // In Edit mode:
    // Case 1: An unused letter from the bank was selected, place it here!
    if (selectedBankLetter) {
      setLetterAtSlot(layerNum, slotIndex, selectedBankLetter);
      setSelectedBankLetter(null);
      return;
    }

    // Case 2: A slot was already selected
    if (selectedSlot) {
      // Clicked the same slot -> deselect
      if (selectedSlot.layerNum === layerNum && selectedSlot.slotIndex === slotIndex) {
        setSelectedSlot(null);
        return;
      }
      // Clicked another slot -> swap / move!
      swapSlots(selectedSlot.layerNum, selectedSlot.slotIndex, layerNum, slotIndex);
      return;
    }

    // Case 3: No slot selected yet
    if (char) {
      setSelectedSlot({ layerNum, slotIndex, char });
    }
  };

  // Handle Clicking a letter in the Letter Bank
  const handleBankLetterClick = (char: string) => {
    if (mode !== 'edit') return;

    // If a slot is already selected, place this letter in that slot!
    if (selectedSlot) {
      setLetterAtSlot(selectedSlot.layerNum, selectedSlot.slotIndex, char);
      setSelectedSlot(null);
      setSelectedBankLetter(null);
      return;
    }

    // Otherwise toggle bank letter selection
    if (selectedBankLetter === char) {
      setSelectedBankLetter(null);
    } else {
      setSelectedBankLetter(char);
      setSelectedSlot(null);
    }
  };

  // Open Cipher key editor for slots
  const handleStartEditCipher = (layerNum: number, currentKeys: string[]) => {
    setEditingCipherLayer(layerNum);
    const targetLen = Math.max(9, (currentKeys || []).length);
    const slots = Array.from({ length: targetLen }, (_, i) =>
      currentKeys && currentKeys[i] != null ? currentKeys[i] : ''
    );
    setCipherInputs(slots);
  };

  const handleSaveCipher = (layerNum: number) => {
    setCipherLettersForLayer(layerNum, cipherInputs);
    setEditingCipherLayer(null);
  };

  // Open Save Modal with suggested default name
  const handleOpenSaveModal = () => {
    const defaultName =
      activeTableName && !Object.values(PRESET_TABLES).some((p) => p.name === activeTableName)
        ? `${activeTableName} (نسخة)`
        : `جدول مخصص #${savedTables.length + 1}`;
    setSaveTableNameInput(defaultName);
    setSaveTableDescInput('');
    setShowSaveModal(true);
  };

  // Submit Save Current Table
  const handleSaveConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveTableNameInput.trim()) return;
    const saved = saveCurrentTable(saveTableNameInput, saveTableDescInput);
    setShowSaveModal(false);
    setNotification({
      type: 'success',
      message: `تم حفظ الجدول [${saved.name}] بنجاح في مكتبتك الشخصية! يمكنك العودة إليه وتطبيقه في أي وقت.`,
    });
  };

  // File Upload Handler (.json)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const result = importTablesFromJson(content);
      if (result.success) {
        setNotification({ type: 'success', message: result.message });
      } else {
        setNotification({ type: 'error', message: result.message });
      }
    };
    reader.onerror = () => {
      setNotification({ type: 'error', message: 'تعذر قراءة الملف المختار من جهازك.' });
    };
    reader.readAsText(file);

    // Reset input so user can re-upload if needed
    e.target.value = '';
  };

  // Open Save Arabic Modal
  const handleOpenSaveArabicModal = () => {
    const defaultName = activeArabicPresetName
      ? `${activeArabicPresetName} (نسخة)`
      : `توزيعة أحرف عربية #${savedArabicPresets.length + 1}`;
    setSaveArabicNameInput(defaultName);
    setSaveArabicDescInput('');
    setShowSaveArabicModal(true);
    setShowArabicMenu(false);
  };

  // Submit Save Arabic Preset
  const handleSaveArabicConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveArabicNameInput.trim()) return;
    const saved = saveCurrentArabicPreset(saveArabicNameInput, saveArabicDescInput);
    setShowSaveArabicModal(false);
    setNotification({
      type: 'success',
      message: `تم حفظ توزيعة الأحرف العربية [${saved.name}] بنجاح في مكتبتك!`,
    });
  };

  // Open Save Noorani Modal
  const handleOpenSaveNooraniModal = () => {
    const defaultName = activeNooraniPresetName
      ? `${activeNooraniPresetName} (نسخة)`
      : `توزيعة أحرف نورانية #${savedNooraniPresets.length + 1}`;
    setSaveNooraniNameInput(defaultName);
    setSaveNooraniDescInput('');
    setShowSaveNooraniModal(true);
    setShowNooraniMenu(false);
  };

  // Submit Save Noorani Preset
  const handleSaveNooraniConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveNooraniNameInput.trim()) return;
    const saved = saveCurrentNooraniPreset(saveNooraniNameInput, saveNooraniDescInput);
    setShowSaveNooraniModal(false);
    setNotification({
      type: 'success',
      message: `تم حفظ توزيعة الأحرف النورانية [${saved.name}] بنجاح في مكتبتك!`,
    });
  };

  // Handle Remove Duplicates in Row
  const handleRemoveRowDuplicates = () => {
    const res = removeRowDuplicates();
    if (res.totalRemoved === 0) {
      setNotification({
        type: 'info',
        message: 'فحص الصفوف: لا يوجد أي تكرار لنفس الحرف في نفس الصف بالجدول الحالي.',
      });
    } else {
      setNotification({
        type: 'success',
        message: `تم بنجاح تنظيف وحذف ${res.totalRemoved} من الأحرف المكررة في نفس الصف (العربية: ${res.arabicRemoved}، التشفير: ${res.cipherRemoved}).`,
      });
    }
  };

  // Export full map (both cipher letters and arabic letters in one file)
  const handleExportCurrent = () => {
    const name = activeTableName || 'خريطة_شفرة_الفرقان_الكاملة';
    exportCurrentTableAsFile(name);
    setNotification({
      type: 'info',
      message: `تم بنجاح تصدير الخريطة الكاملة (أحرف التشفير والأحرف العربية موزعة في ملف واحد: ${name}.json).`,
    });
  };

  // Rename saved table submit
  const handleRenameSavedTable = (id: string) => {
    if (editingSavedTableName.trim()) {
      updateSavedTableName(id, editingSavedTableName.trim());
    }
    setEditingSavedTableId(null);
    setEditingSavedTableName('');
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col gap-3.5">
          {/* Row 1: Title & Status Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="layers-table-heading" className="text-base sm:text-lg font-bold text-stone-900">
                    الجدول المرجعي للطبقات السبع (تعديل كامل وسحب وإفلات)
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  اسحب الحرف بالماوس وضعه في أي خانة للتبديل، أو انقر للتحديد والتبديل المباشر. يمكنك حفظ جداولك واسترجاعها وتصديرها كملف في أي وقت.
                </p>
              </div>
            </div>

            {/* Active Table Status Badge */}
            <div className="shrink-0 self-start sm:self-center">
              {activeTableName ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>النشط: {activeTableName}</span>
                </span>
              ) : isCustomized ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span>جدول مخصص نشط</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200">
                  الجدول القياسي المعتمد
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Mode Switch & Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-stone-100">
            {/* Left: Mode Switcher Pill */}
            <div className="inline-flex items-center p-1 rounded-xl bg-stone-100 border border-stone-200 text-xs font-bold">
              <button
                type="button"
                id="mode-edit-btn"
                onClick={() => {
                  setMode('edit');
                  setSelectedSlot(null);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  mode === 'edit'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
                title="تفعيل وضع التعديل، السحب والإفلات، وتبديل الخانات"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
                <span>وضع التعديل والسحب</span>
              </button>

              <button
                type="button"
                id="mode-type-btn"
                onClick={() => {
                  setMode('type');
                  setSelectedSlot(null);
                  setSelectedBankLetter(null);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  mode === 'type'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
                title="تفعيل وضع النقر للإضافة السريعة إلى النص المراد تشفيره"
              >
                <MousePointerClick className="w-3.5 h-3.5 text-blue-600" />
                <span>وضع النقر للكتابة</span>
              </button>
            </div>

            {/* Right: Presets & Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* 1. Arabic Letters Distribution Menu */}
              <div className="relative" ref={arabicMenuRef}>
                <button
                  type="button"
                  id="arabic-distribution-menu-btn"
                  onClick={() => {
                    setShowArabicMenu(!showArabicMenu);
                    setShowNooraniMenu(false);
                    setShowPresetMenu(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-900 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  title="قوالب وتوزيعات الأحرف العربية الـ 28 مع إمكانية حفظ توزيعتك الخاصة"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>توزيعات الأحرف العربية</span>
                  {activeArabicPresetName && (
                    <span className="text-3xs font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 max-w-[110px] truncate">
                      {activeArabicPresetName}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 text-stone-400" />
                </button>

                {showArabicMenu && (
                  <div className="absolute left-0 mt-1.5 w-84 sm:w-96 max-h-[440px] overflow-y-auto bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-30 divide-y divide-stone-100">
                    <div className="px-3.5 py-2 text-2xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50/80 flex items-center justify-between">
                      <span>قوالب توزيعات الأحرف العربية (28 حرفاً)</span>
                      <button
                        type="button"
                        onClick={handleOpenSaveArabicModal}
                        className="px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-3xs font-bold transition-colors cursor-pointer"
                      >
                        + حفظ التوزيعة الحالية
                      </button>
                    </div>

                    <div className="py-1">
                      {Object.values(ARABIC_PRESETS).map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            applyArabicDistribution(preset.id);
                            setShowArabicMenu(false);
                            setNotification({
                              type: 'success',
                              message: `تم تطبيق [${preset.name}] على الأحرف العربية بنجاح!`,
                            });
                          }}
                          className="w-full text-right px-3.5 py-2 hover:bg-emerald-50/70 text-xs transition-colors cursor-pointer flex flex-col gap-0.5 group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-stone-900 group-hover:text-emerald-900">
                              {preset.name}
                            </span>
                            {activeArabicPresetName === preset.name && (
                              <span className="text-3xs font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                مفعّل
                              </span>
                            )}
                          </div>
                          <span className="text-2xs text-stone-500 line-clamp-1 group-hover:text-stone-700">
                            {preset.description}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Saved Arabic Presets Section */}
                    {savedArabicPresets.length > 0 && (
                      <div>
                        <div className="px-3.5 py-1.5 text-2xs font-bold text-stone-500 bg-stone-50">
                          توزيعاتي العربية المحفوظة ({savedArabicPresets.length})
                        </div>
                        <div className="py-1">
                          {savedArabicPresets.map((sp) => (
                            <div
                              key={sp.id}
                              className="px-3.5 py-2 hover:bg-stone-50 flex items-center justify-between gap-2 group"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  applyArabicDistribution(sp.id);
                                  setShowArabicMenu(false);
                                  setNotification({
                                    type: 'success',
                                    message: `تم تطبيق توزيعتك المحفوظة [${sp.name}] على الأحرف العربية.`,
                                  });
                                }}
                                className="flex-1 text-right text-xs cursor-pointer"
                              >
                                <div className="font-bold text-stone-900 group-hover:text-emerald-900">
                                  {sp.name}
                                </div>
                                {sp.description && (
                                  <div className="text-2xs text-stone-500 line-clamp-1">
                                    {sp.description}
                                  </div>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`هل تريد حذف توزيعة [${sp.name}]؟`)) {
                                    deleteSavedArabicPreset(sp.id);
                                  }
                                }}
                                className="text-stone-300 hover:text-rose-600 p-1 rounded cursor-pointer transition-colors"
                                title="حذف هذه التوزيعة المحفوظة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-2 bg-stone-50">
                      <button
                        type="button"
                        onClick={handleOpenSaveArabicModal}
                        className="w-full py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>حفظ ترتيب الأحرف العربية الحالي في قائمتي الخاصة</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Noorani Letters Distribution Menu */}
              <div className="relative" ref={nooraniMenuRef}>
                <button
                  type="button"
                  id="noorani-distribution-menu-btn"
                  onClick={() => {
                    setShowNooraniMenu(!showNooraniMenu);
                    setShowArabicMenu(false);
                    setShowPresetMenu(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-indigo-50 border border-indigo-300 text-indigo-900 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  title="قوالب وتوزيعات أحرف التشفير النورانية التسعة مع إمكانية حفظ توزيعتك الخاصة"
                >
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  <span>توزيعات الأحرف النورانية</span>
                  {activeNooraniPresetName && (
                    <span className="text-3xs font-black px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300 max-w-[110px] truncate">
                      {activeNooraniPresetName}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 text-stone-400" />
                </button>

                {showNooraniMenu && (
                  <div className="absolute left-0 mt-1.5 w-84 sm:w-96 max-h-[440px] overflow-y-auto bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-30 divide-y divide-stone-100">
                    <div className="px-3.5 py-2 text-2xs font-bold text-indigo-900 uppercase tracking-wider bg-indigo-50/80 flex items-center justify-between">
                      <span>قوالب توزيعات الأحرف النورانية (شفرة الفرقان)</span>
                      <button
                        type="button"
                        onClick={handleOpenSaveNooraniModal}
                        className="px-2 py-0.5 rounded bg-indigo-700 hover:bg-indigo-800 text-white text-3xs font-bold transition-colors cursor-pointer"
                      >
                        + حفظ التوزيعة الحالية
                      </button>
                    </div>

                    <div className="py-1">
                      {Object.values(NOORANI_PRESETS).map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            applyNooraniDistribution(preset.id);
                            setShowNooraniMenu(false);
                            setNotification({
                              type: 'success',
                              message: `تم تطبيق [${preset.name}] على أحرف التشفير النورانية بنجاح!`,
                            });
                          }}
                          className="w-full text-right px-3.5 py-2 hover:bg-indigo-50/70 text-xs transition-colors cursor-pointer flex flex-col gap-0.5 group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-stone-900 group-hover:text-indigo-950">
                              {preset.name}
                            </span>
                            {activeNooraniPresetName === preset.name && (
                              <span className="text-3xs font-black px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-300">
                                مفعّل
                              </span>
                            )}
                          </div>
                          <span className="text-2xs text-stone-500 line-clamp-1 group-hover:text-stone-700">
                            {preset.description}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Saved Noorani Presets Section */}
                    {savedNooraniPresets.length > 0 && (
                      <div>
                        <div className="px-3.5 py-1.5 text-2xs font-bold text-stone-500 bg-stone-50">
                          توزيعاتي النورانية المحفوظة ({savedNooraniPresets.length})
                        </div>
                        <div className="py-1">
                          {savedNooraniPresets.map((sp) => (
                            <div
                              key={sp.id}
                              className="px-3.5 py-2 hover:bg-stone-50 flex items-center justify-between gap-2 group"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  applyNooraniDistribution(sp.id);
                                  setShowNooraniMenu(false);
                                  setNotification({
                                    type: 'success',
                                    message: `تم تطبيق توزيعتك المحفوظة [${sp.name}] على أحرف التشفير النورانية.`,
                                  });
                                }}
                                className="flex-1 text-right text-xs cursor-pointer"
                              >
                                <div className="font-bold text-stone-900 group-hover:text-indigo-900">
                                  {sp.name}
                                </div>
                                {sp.description && (
                                  <div className="text-2xs text-stone-500 line-clamp-1">
                                    {sp.description}
                                  </div>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`هل تريد حذف توزيعة [${sp.name}]؟`)) {
                                    deleteSavedNooraniPreset(sp.id);
                                  }
                                }}
                                className="text-stone-300 hover:text-rose-600 p-1 rounded cursor-pointer transition-colors"
                                title="حذف هذه التوزيعة المحفوظة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-2 bg-stone-50">
                      <button
                        type="button"
                        onClick={handleOpenSaveNooraniModal}
                        className="w-full py-1.5 px-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>حفظ أحرف التشفير النورانية الحالية في قائمتي الخاصة</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Full Tables Presets Dropdown */}
              <div className="relative" ref={presetMenuRef}>
                <button
                  type="button"
                  id="presets-menu-btn"
                  onClick={() => {
                    setShowPresetMenu(!showPresetMenu);
                    setShowArabicMenu(false);
                    setShowNooraniMenu(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>قوالب كاملة</span>
                </button>

                {showPresetMenu && (
                  <div className="absolute left-0 mt-1.5 w-80 sm:w-96 max-h-[420px] overflow-y-auto bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-30 divide-y divide-stone-100">
                    <div className="px-3.5 py-2 text-2xs font-bold text-stone-400 uppercase tracking-wider bg-stone-50/70">
                      اختر قالباً لتطبيق جدول الطبقات السبع كاملاً:
                    </div>
                    {Object.values(PRESET_TABLES).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          applyPreset(preset.id as keyof typeof PRESET_TABLES);
                          setShowPresetMenu(false);
                        }}
                        className="w-full text-right px-3.5 py-2.5 hover:bg-amber-50/80 text-xs transition-colors cursor-pointer flex flex-col gap-1 group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-stone-900 group-hover:text-amber-950">
                            {preset.name}
                          </span>
                          {preset.id === 'distributionNoon' && (
                            <span className="text-3xs font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                              قالب مخصص ⬆️
                            </span>
                          )}
                          {preset.id === 'distributionAlef' && (
                            <span className="text-3xs font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300">
                              قالب مخصص ⬇️
                            </span>
                          )}
                          {preset.id === 'defaultQuranic' && (
                            <span className="text-3xs font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              الافتراضي
                            </span>
                          )}
                          {preset.id === 'abjadWestern' && (
                            <span className="text-3xs font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                              المغربي
                            </span>
                          )}
                        </div>
                        <span className="text-2xs text-stone-500 leading-relaxed group-hover:text-stone-700">
                          {preset.description}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Remove Duplicates in Rows button */}
              <button
                type="button"
                id="remove-row-duplicates-btn"
                onClick={handleRemoveRowDuplicates}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                title="حذف أي تكرار للحرف داخل نفس الصف الواحد (للأحرف العربية وأحرف التشفير)"
              >
                <Scissors className="w-3.5 h-3.5 text-amber-700" />
                <span>حذف التكرار في الصف</span>
              </button>

              {/* Clear All Slots */}
              {showClearConfirm ? (
                <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-xl">
                  <span className="text-2xs font-bold text-rose-800 px-1">متأكد؟</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearAllSlots();
                      setShowClearConfirm(false);
                    }}
                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-2xs font-bold cursor-pointer"
                  >
                    نعم، فرّغ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-1.5 py-1 text-stone-600 hover:bg-rose-100 rounded-lg text-2xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id="clear-all-slots-btn"
                  onClick={() => setShowClearConfirm(true)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-stone-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-stone-200 text-stone-600 inline-flex items-center gap-1 cursor-pointer transition-colors"
                  title="تفريغ جميع خانات الجدول للبدء من الصفر"
                >
                  <Eraser className="w-3.5 h-3.5 text-stone-500" />
                  <span>تفريغ الجدول</span>
                </button>
              )}

              {/* Reset to Default */}
              {isCustomized && (
                <button
                  type="button"
                  id="reset-to-default-btn"
                  onClick={resetToDefault}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="استعادة جدول الفرقان الافتراضي الأصلي"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>استعادة الافتراضي</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Storage, Export & Import Bar */}
        <div className="mt-3.5 pt-3 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-2.5 bg-stone-50/70 p-2.5 rounded-xl">
          {/* Left: Library & Save actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xs font-bold text-stone-500 uppercase tracking-wider ml-1">
              حفظ وتخزين الجداول:
            </span>

            {/* Save Current Table Button */}
            <button
              type="button"
              id="save-table-btn"
              onClick={handleOpenSaveModal}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all hover:scale-102 active:scale-98"
              title="تخزين هذا الجدول في مكتبتك الخاصة للرجوع إليه وتطبيقه متى شئت"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-emerald-200" />
              <span>حفظ هذا الجدول</span>
            </button>

            {/* My Saved Tables Library */}
            <button
              type="button"
              id="saved-tables-library-btn"
              onClick={() => setShowLibraryModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-amber-50/70 text-stone-900 border border-stone-300 shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              title="استعراض وإدارة جميع الجداول التي قمت بحفظها"
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>جداولي المحفوظة</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-3xs font-black">
                {savedTables.length}
              </span>
            </button>
          </div>

          {/* Right: File Export & Import actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Export Current Table / Full Map JSON */}
            <button
              type="button"
              id="export-current-json-btn"
              onClick={handleExportCurrent}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-300 shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              title="تصدير الخريطة الشاملة المتضمنة أحرف التشفير النورانية والأحرف العربية موزعة في ملف JSON واحد"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>تصدير الخريطة الكاملة (.json)</span>
            </button>

            {/* Import JSON File */}
            <button
              type="button"
              id="import-json-file-btn"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-blue-50/70 text-stone-700 hover:text-blue-900 hover:border-blue-300 border border-stone-300 shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              title="استيراد جدول أو خريطة كاملة من ملف JSON مخزن بجهازك"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>استيراد ملف (.json)</span>
            </button>

            {/* Hidden file input for import */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Optional Notification banner */}
        {notification && (
          <div
            className={`mt-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                : notification.type === 'error'
                ? 'bg-rose-50 text-rose-900 border border-rose-300'
                : 'bg-blue-50 text-blue-900 border border-blue-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : notification.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <FileJson className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-stone-400 hover:text-stone-700 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Live Validation & Status Bar */}
        <div className="mt-3.5 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {missingLetters.length === 0 && duplicateLetters.length === 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                الجدول مكتمل وسليم (28/28 حرفاً موزعة بدون تكرار)
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  تم ملء {totalFilledSlots} من 28 خانة
                </span>
                {missingLetters.length > 0 && (
                  <span className="text-stone-500 font-medium">
                    (متبقي <strong className="text-amber-700 font-bold">{missingLetters.length}</strong> حرفاً غير موزعة في بنك الحروف أدناه)
                  </span>
                )}
                {duplicateLetters.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                    تكرار في الحروف العربية: {duplicateLetters.join('، ')}
                  </span>
                )}
              </>
            )}

            {duplicateCipherLetters.length > 0 && (
              <span className="inline-flex items-center gap-1 text-purple-800 font-bold bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg" title="تكرار أحرف التشفير مسموح تماماً حسب رغبتك">
                تكرار في أحرف التشفير: {duplicateCipherLetters.map((d) => `${d.char} (${d.count})`).join('، ')} (مسموح)
              </span>
            )}

            {/* Column Duplicates Indicator & Trigger Modal */}
            {columnDuplicatesSummary.hasDuplicates ? (
              <button
                type="button"
                id="column-duplicates-summary-btn"
                onClick={() => setShowColumnDuplicatesModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                title="انقر لعرض ملخص مفصل لتكرار الأحرف بالأعمدة (بين الطبقات)"
              >
                <Columns className="w-3.5 h-3.5 text-amber-600" />
                <span>تكرار بالأعمدة ({columnDuplicatesSummary.totalDuplicatesCount})</span>
                <span className="text-3xs bg-amber-200 px-1.5 py-0.5 rounded font-black">عرض التقرير</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50/80 border border-emerald-200 px-2.5 py-1 rounded-lg">
                <Columns className="w-3.5 h-3.5 text-emerald-600" />
                <span>الأعمدة متوازنة (لا يوجد تكرار بين الطبقات)</span>
              </span>
            )}
          </div>

          <div className="text-2xs text-stone-400 flex items-center gap-1">
            <HelpCircle className="w-3 h-3" />
            <span>نصيحة: انقر على أي حرف ثم انقر على خانة أخرى للتبديل السريع فوراً</span>
          </div>
        </div>
      </div>

      {/* Interactive Selection Alert (appears when a letter or slot is actively selected) */}
      {selectedSlot && (
        <div className="bg-amber-500 text-stone-950 p-3 rounded-2xl shadow-sm border border-amber-600 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-950 text-amber-400 font-black text-lg flex items-center justify-center font-['Amiri',serif]">
              {selectedSlot.char}
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">
                الحرف المُحدد: <span className="underline decoration-2 font-black">{selectedSlot.char}</span> (الطبقة {selectedSlot.layerNum}، الخانة {selectedSlot.slotIndex + 1})
              </p>
              <p className="text-2xs text-stone-900/80 font-medium">
                انقر على أي خانة أخرى للتبديل معها أو لنقله إليها، أو استخدم الأزرار المجاورة:
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => clearLetterAtSlot(selectedSlot.layerNum, selectedSlot.slotIndex)}
              className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
            >
              تفريغ هذه الخانة
            </button>
            <button
              type="button"
              onClick={() => setSelectedSlot(null)}
              className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-stone-950 text-xs font-bold cursor-pointer transition-colors"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* Selected Bank Letter Alert */}
      {selectedBankLetter && (
        <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white text-blue-900 font-black text-lg flex items-center justify-center font-['Amiri',serif]">
              {selectedBankLetter}
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">
                حرف من بنك الحروف: <span className="underline decoration-2 font-black">{selectedBankLetter}</span>
              </p>
              <p className="text-2xs text-blue-100 font-medium">
                انقر الآن على أي خانة فارغة في الجدول أدناه لوضع الحرف فيها، أو اسحبه بالماوس.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedBankLetter(null)}
            className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            إلغاء
          </button>
        </div>
      )}

      {/* Interactive 28-Letter Bank Tray */}
      {mode === 'edit' && (
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-3.5 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <span>بنك الأحرف العربية (28 حرفاً):</span>
              <span className="text-stone-400 font-normal text-2xs">
                (الأحرف الملونة متبقية وغير مستخدمة بعد في الجدول)
              </span>
            </span>
            <span className="text-2xs font-bold text-stone-500">
              {28 - missingLetters.length} مُستخدم / {missingLetters.length} متبقي
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {ALL_ARABIC_LETTERS_28.map((char) => {
              const isUsed = usedLetters.has(char);
              const count = letterCounts[char] || 0;
              const isBankSelected = selectedBankLetter === char;

              return (
                <button
                  key={char}
                  type="button"
                  draggable={!isUsed}
                  onDragStart={(e) => handleBankDragStart(e, char)}
                  onClick={() => handleBankLetterClick(char)}
                  className={`relative min-w-8 h-8 px-2 rounded-lg font-bold text-sm flex items-center justify-center border transition-all select-none cursor-pointer font-['Amiri',serif] ${
                    isBankSelected
                      ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400 scale-110'
                      : !isUsed
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 shadow-xs hover:scale-105 active:scale-95'
                      : count > 1
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-white text-stone-400 border-stone-200 opacity-60 hover:opacity-100'
                  }`}
                  title={
                    !isUsed
                      ? `حرف [${char}] متبقٍ - اسحبه أو انقر عليه لوضعه في خانة`
                      : count > 1
                      ? `حرف [${char}] مكرر (${count} مرات في الجدول)`
                      : `حرف [${char}] موجود في الجدول`
                  }
                >
                  {char}
                  {!isUsed && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Layers Table Grid */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-stone-50 text-xs font-bold text-stone-600 border-b border-stone-200">
                <th className="py-3.5 px-4 w-28 sm:w-32">الطبقة</th>
                <th className="py-3.5 px-4 min-w-[280px]">أحرف التشفير (9 خانات للطبقة، مع إمكانية التكرار)</th>
                <th className="py-3.5 px-4">الأحرف العربية الأربعة في هذه الطبقة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {layers.map((layerItem) => {
                const isHighlighted = highlightedLayerNumbers.includes(layerItem.layer);
                const color = LAYER_RAINBOW_COLORS[layerItem.layer];
                const isEditingCipher = editingCipherLayer === layerItem.layer;

                return (
                  <tr
                    key={layerItem.layer}
                    id={`layer-row-${layerItem.layer}`}
                    className={`transition-colors duration-150 ${
                      isHighlighted
                        ? `${color.lightBg} ring-1 ring-inset ${color.lightBorder}`
                        : 'hover:bg-stone-50/60'
                    }`}
                  >
                    {/* Layer Number Badge & Group info */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-lg font-bold text-xs ${color.activeBg} ${color.activeText} shadow-xs`}
                        >
                          الطبقة {layerItem.layer}
                        </span>
                        {layerItem.description && (
                          <span
                            className="text-3xs text-stone-500 font-medium leading-tight max-w-[140px]"
                            title={layerItem.description}
                          >
                            {layerItem.description}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cipher Keys (9 slots, duplicates explicitly supported) */}
                    <td className="py-3.5 px-4 align-middle">
                      {isEditingCipher ? (
                        <div className="space-y-2 p-2 rounded-xl bg-amber-50/80 border border-amber-200 shadow-2xs max-w-md">
                          <div className="flex items-center justify-between gap-1 pb-1 border-b border-amber-200/60">
                            <span className="text-2xs font-bold text-amber-900">
                              تعديل خانات التشفير ({cipherInputs.length} خانة):
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveCipher(layerItem.layer)}
                                className="px-2.5 py-0.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                              >
                                حفظ
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCipherLayer(null)}
                                className="px-2 py-0.5 rounded-md bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-semibold cursor-pointer transition-colors"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {cipherInputs.map((val, cIdx) => (
                              <div key={cIdx} className="flex flex-col items-center gap-0.5">
                                <input
                                  type="text"
                                  maxLength={2}
                                  value={val}
                                  onChange={(e) => {
                                    const next = [...cipherInputs];
                                    next[cIdx] = e.target.value;
                                    setCipherInputs(next);
                                  }}
                                  className="w-7 h-7 rounded-md border-2 border-amber-500 bg-white text-center font-bold text-xs font-['Amiri',serif] focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  title={`خانة التشفير #${cIdx + 1}`}
                                  placeholder={`${cIdx + 1}`}
                                />
                                <span className="text-3xs text-stone-400 font-mono">
                                  {cIdx + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap group">
                          {(() => {
                            const validChars = (layerItem.cipherLetters || []).filter(
                              (c) => c && c.trim()
                            );
                            return (
                              <div className="flex items-center gap-1 flex-wrap">
                                {validChars.length > 0 ? (
                                  validChars.map((char, cIdx) => (
                                    <span
                                      key={cIdx}
                                      className="min-w-7 h-7 px-1.5 rounded-md bg-stone-100 flex items-center justify-center border border-stone-300 shadow-2xs font-['Amiri',serif] text-sm font-bold text-stone-900"
                                      title={`حرف تشفير خانة ${cIdx + 1}`}
                                    >
                                      {char}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-stone-400 italic">
                                    لا توجد أحرف تشفير محددة
                                  </span>
                                )}
                                <span className="text-2xs text-stone-400 font-medium px-1">
                                  ({validChars.length} حرف)
                                </span>
                              </div>
                            );
                          })()}

                          {mode === 'edit' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStartEditCipher(layerItem.layer, layerItem.cipherLetters)
                              }
                              className="w-7 h-7 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-200/60 flex items-center justify-center transition-colors cursor-pointer mr-1"
                              title="تعديل أحرف التشفير لهذه الطبقة"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 4 Letter Slots */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {layerItem.arabicLetters.map((arabicChar, slotIndex) => {
                          const isSelected =
                            selectedSlot?.layerNum === layerItem.layer &&
                            selectedSlot?.slotIndex === slotIndex;
                          const isDragTarget =
                            dragOverTarget?.layerNum === layerItem.layer &&
                            dragOverTarget?.slotIndex === slotIndex;
                          const count = arabicChar ? letterCounts[arabicChar] || 0 : 0;
                          const isDuplicate = count > 1;

                          return (
                            <div
                              key={slotIndex}
                              draggable={mode === 'edit' && !!arabicChar}
                              onDragStart={(e) =>
                                handleSlotDragStart(e, layerItem.layer, slotIndex, arabicChar)
                              }
                              onDragOver={(e) => handleDragOver(e, layerItem.layer, slotIndex)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, layerItem.layer, slotIndex)}
                              onClick={() => handleSlotClick(layerItem.layer, slotIndex, arabicChar)}
                              className={`relative group min-w-11 h-11 px-3 rounded-xl font-bold flex items-center justify-center transition-all select-none cursor-pointer text-lg font-['Amiri',serif] ${
                                isDragTarget
                                  ? 'border-2 border-dashed border-amber-500 bg-amber-100/80 scale-105 shadow-md ring-2 ring-amber-400'
                                  : isSelected
                                  ? 'bg-amber-400 text-stone-950 border-2 border-stone-900 shadow-md ring-2 ring-amber-300 scale-105'
                                  : !arabicChar
                                  ? 'border-2 border-dashed border-stone-300 hover:border-amber-400 bg-stone-50 hover:bg-amber-50/50 text-stone-300 hover:text-amber-600'
                                  : isDuplicate
                                  ? 'bg-rose-50 text-rose-800 border-2 border-rose-400 shadow-xs'
                                  : 'bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-900 shadow-2xs hover:scale-105 active:scale-95'
                              }`}
                              title={
                                mode === 'edit'
                                  ? arabicChar
                                    ? `اسحب ${arabicChar} أو انقر لتبديله مع خانة أخرى`
                                    : `خانة فارغة - اسحب حرفاً إليها أو انقر لوضع حرف`
                                  : `إضافة الحرف ${arabicChar} إلى النص المراد تشفيره`
                              }
                            >
                              {arabicChar ? (
                                <>
                                  <span>{arabicChar}</span>

                                  {/* Drag Handle Icon on hover in edit mode */}
                                  {mode === 'edit' && (
                                    <GripVertical className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-80 absolute -right-0.5 pointer-events-none transition-opacity" />
                                  )}

                                  {/* Quick Clear "X" on hover in edit mode */}
                                  {mode === 'edit' && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearLetterAtSlot(layerItem.layer, slotIndex);
                                      }}
                                      className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
                                      title="إفراغ الخانة"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-stone-400 font-sans font-medium">
                                  + فارغ
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. Modal: Save Current Table */}
      {/* ========================================================================= */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base">حفظ الجدول الحالي في مكتبتك</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfirm} className="p-5 space-y-4">
              <div>
                <label htmlFor="save-table-name-input" className="block text-xs font-bold text-stone-700 mb-1.5">
                  اسم الجدول <span className="text-rose-500">*</span>
                </label>
                <input
                  id="save-table-name-input"
                  type="text"
                  required
                  autoFocus
                  value={saveTableNameInput}
                  onChange={(e) => setSaveTableNameInput(e.target.value)}
                  placeholder="مثال: جدول أبحاث سورة الكهف، ترتيبي المخصص..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div>
                <label htmlFor="save-table-desc-input" className="block text-xs font-bold text-stone-700 mb-1.5">
                  ملاحظات أو وصف توضيحي (اختياري)
                </label>
                <textarea
                  id="save-table-desc-input"
                  rows={2}
                  value={saveTableDescInput}
                  onChange={(e) => setSaveTableDescInput(e.target.value)}
                  placeholder="مثال: تم ضبط حروف الراء والزاي في الطبقة الثالثة..."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-2xs text-emerald-900 leading-relaxed">
                💡 سيتم حفظ الجدول بجميع طبقاته السبع ومفاتيحه وحروفه في متصفحك بشكل دائم. يمكنك استرجاعه وتفعيله بنقرة واحدة، كما يمكنك تصديره كملف مستقل في أي وقت.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer transition-all hover:shadow"
                >
                  حفظ في مكتبتي الآن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. Modal: Saved Tables Library */}
      {/* ========================================================================= */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <BookmarkCheck className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                    <span>مكتبة جداولك المحفوظة</span>
                    <span className="text-2xs bg-stone-800 text-amber-300 px-2 py-0.5 rounded-full border border-stone-700">
                      {savedTables.length} جدول
                    </span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {savedTables.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      exportAllSavedTablesAsFile();
                      setNotification({
                        type: 'info',
                        message: 'تم تنزيل نسخة احتياطية شاملة لجميع جداولك المحفوظة كملف JSON.',
                      });
                    }}
                    className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-2xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 cursor-pointer transition-colors"
                    title="تصدير جميع الجداول المحفوظة دفعة واحدة في ملف احتياطي شامل"
                  >
                    <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
                    <span>تصدير الكل (نسخة احتياطية)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowLibraryModal(false)}
                  className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 divide-y divide-stone-100">
              {/* Quick actions top bar inside modal */}
              <div className="pb-3 mb-3 flex items-center justify-between gap-2 flex-wrap text-xs">
                <p className="text-stone-500 text-2xs sm:text-xs">
                  اختر أي جدول لتطبيقه فوراً على النظام، أو قم بتصديره كملف مستقل لحفظه أو مشاركته.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLibraryModal(false);
                      handleOpenSaveModal();
                    }}
                    className="px-2.5 py-1 rounded-lg text-2xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <BookmarkPlus className="w-3 h-3 text-emerald-600" />
                    <span>حفظ الجدول المعروض حالياً</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg text-2xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-blue-600" />
                    <span>استيراد ملف</span>
                  </button>
                </div>
              </div>

              {/* List of Saved Tables */}
              {savedTables.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-3">
                    <BookmarkCheck className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-stone-800 text-sm mb-1">لا توجد جداول محفوظة بعد</h4>
                  <p className="text-xs text-stone-500 max-w-sm mb-4 leading-relaxed">
                    يمكنك تعديل أي جدول وسحب الحروف أو اختيار قالب جاهز ثم الضغط على زر <strong className="text-stone-700 font-bold">«حفظ هذا الجدول»</strong> لتخزينه هنا والرجوع إليه دائماً.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLibraryModal(false);
                      handleOpenSaveModal();
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <BookmarkPlus className="w-4 h-4" />
                    <span>حفظ الجدول الحالي الآن</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {savedTables.map((tbl) => {
                    const isActive = activeTableName === tbl.name;
                    const layer7 = tbl.layers.find((l) => l.layer === 7);
                    const layer1 = tbl.layers.find((l) => l.layer === 1);
                    const isRenaming = editingSavedTableId === tbl.id;

                    return (
                      <div
                        key={tbl.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isActive
                            ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-300 shadow-xs'
                            : 'bg-white hover:bg-stone-50/80 border-stone-200 shadow-2xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Info Column */}
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isRenaming ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={editingSavedTableName}
                                    onChange={(e) => setEditingSavedTableName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleRenameSavedTable(tbl.id);
                                      if (e.key === 'Escape') setEditingSavedTableId(null);
                                    }}
                                    className="px-2 py-1 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRenameSavedTable(tbl.id)}
                                    className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                                    title="حفظ الاسم"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSavedTableId(null)}
                                    className="p-1 text-stone-400 hover:bg-stone-200 rounded cursor-pointer"
                                    title="إلغاء"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <h4 className="font-bold text-stone-900 text-sm truncate">
                                    {tbl.name}
                                  </h4>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSavedTableId(tbl.id);
                                      setEditingSavedTableName(tbl.name);
                                    }}
                                    className="text-stone-400 hover:text-stone-700 p-0.5 rounded cursor-pointer"
                                    title="تعديل اسم الجدول"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </>
                              )}

                              {isActive && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  <Check className="w-2.5 h-2.5 text-emerald-700" />
                                  الجدول النشط حالياً
                                </span>
                              )}
                            </div>

                            {tbl.description && (
                              <p className="text-2xs text-stone-600 line-clamp-1">{tbl.description}</p>
                            )}

                            {/* Timestamp & Micro preview */}
                            <div className="flex items-center gap-3 text-3xs text-stone-400 flex-wrap">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(tbl.createdAt).toLocaleString('ar-EG', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>

                              {layer7 && layer1 && (
                                <span className="text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                                  الطبقة 7: ({layer7.arabicLetters.filter(Boolean).join(' ')}) • الطبقة 1: ({layer1.arabicLetters.filter(Boolean).join(' ')})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            {/* Apply Table Button */}
                            <button
                              type="button"
                              onClick={() => {
                                loadSavedTable(tbl.id);
                                setShowLibraryModal(false);
                                setNotification({
                                  type: 'success',
                                  message: `تم تطبيق الجدول [${tbl.name}] بنجاح، وتحديث كافة أدوات التشفير وفك التشفير.`,
                                });
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-all ${
                                isActive
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 opacity-80'
                                  : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs hover:shadow-xs'
                              }`}
                              title="تفعيل هذا الجدول فوراً في كامل البرنامج"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isActive ? 'مطبّق حالياً' : 'تطبيق الجدول'}</span>
                            </button>

                            {/* Export Single Table JSON */}
                            <button
                              type="button"
                              onClick={() => {
                                exportSingleSavedTableAsFile(tbl.id);
                                setNotification({
                                  type: 'info',
                                  message: `تم تصدير ملف الجدول [${tbl.name}.json] بنجاح.`,
                                });
                              }}
                              className="p-1.5 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 cursor-pointer transition-colors"
                              title="تصدير هذا الجدول كملف JSON مستقل"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Delete Table Button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`هل أنت متأكد من حذف الجدول [${tbl.name}] من مكتبتك؟`)) {
                                  deleteSavedTable(tbl.id);
                                  setNotification({
                                    type: 'info',
                                    message: `تم حذف الجدول [${tbl.name}] من مكتبتك.`,
                                  });
                                }
                              }}
                              className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 cursor-pointer transition-colors"
                              title="حذف هذا الجدول من المكتبة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-2xs text-stone-500">
              <span>جميع الجداول مخزنة محلياً في متصفحك بأمان.</span>
              <button
                type="button"
                onClick={() => setShowLibraryModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-stone-200 hover:bg-stone-300 text-stone-800 cursor-pointer transition-colors"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Modal: Save Current Arabic Preset */}
      {/* ========================================================================= */}
      {showSaveArabicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base">حفظ توزيعة الأحرف العربية الحالية</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveArabicModal(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveArabicConfirm} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  اسم التوزيعة العربية <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="مثال: التوزيعة العثمانية، توزيعة الترتيب المخصص..."
                  value={saveArabicNameInput}
                  onChange={(e) => setSaveArabicNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-stone-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  وصف مختصر أو ملاحظات (اختياري)
                </label>
                <textarea
                  rows={2}
                  placeholder="أي ملاحظات حول نسق هذه التوزيعة للأحرف الـ 28..."
                  value={saveArabicDescInput}
                  onChange={(e) => setSaveArabicDescInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-stone-50/50 resize-none"
                />
              </div>

              {/* Preview of current 28 arabic letters */}
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 text-xs">
                <span className="font-bold text-emerald-950 block mb-1.5 text-2xs">
                  معاينة ترتيب الأحرف الـ 28 الحالية (من الطبقة 7 إلى 1):
                </span>
                <div className="flex flex-wrap gap-1 text-stone-800 font-['Amiri',serif] text-sm">
                  {[...layers]
                    .sort((a, b) => b.layer - a.layer)
                    .map((l) => (
                      <span
                        key={l.layer}
                        className="px-1.5 py-0.5 bg-white border border-emerald-200 rounded font-bold"
                        title={`الطبقة ${l.layer}`}
                      >
                        {l.arabicLetters.map((c) => c || '—').join(' ')}
                      </span>
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowSaveArabicModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer transition-all hover:shadow"
                >
                  حفظ في قائمة التوزيعات العربية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. Modal: Save Current Noorani Preset */}
      {/* ========================================================================= */}
      {showSaveNooraniModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 bg-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-base">حفظ توزيعة أحرف التشفير النورانية</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveNooraniModal(false)}
                className="text-indigo-200 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNooraniConfirm} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  اسم التوزيعة النورانية <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="مثال: توزيعة خاصة بالرموز القرآنية..."
                  value={saveNooraniNameInput}
                  onChange={(e) => setSaveNooraniNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-stone-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  وصف مختصر أو ملاحظات (اختياري)
                </label>
                <textarea
                  rows={2}
                  placeholder="أي تفاصيل أو ملاحظات حول أحرف التشفير..."
                  value={saveNooraniDescInput}
                  onChange={(e) => setSaveNooraniDescInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-stone-50/50 resize-none"
                />
              </div>

              {/* Preview of current cipher letters per layer */}
              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-200 text-xs">
                <span className="font-bold text-indigo-950 block mb-1.5 text-2xs">
                  معاينة أحرف التشفير الحالية بالطبقات (من الطبقة 7 إلى 1):
                </span>
                <div className="space-y-1 text-stone-800 text-2xs font-['Amiri',serif]">
                  {[...layers]
                    .sort((a, b) => b.layer - a.layer)
                    .map((l) => (
                      <div key={l.layer} className="flex items-center gap-2">
                        <span className="font-bold text-indigo-900 w-14 shrink-0 font-sans">
                          الطبقة {l.layer}:
                        </span>
                        <span className="font-bold bg-white px-2 py-0.5 rounded border border-indigo-200 flex-1 truncate">
                          {l.cipherLetters.filter(Boolean).join(' ') || '(فارغ)'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowSaveNooraniModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-800 hover:bg-indigo-900 text-white shadow-xs cursor-pointer transition-all hover:shadow"
                >
                  حفظ في قائمة التوزيعات النورانية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. Modal: Column Duplicates Summary (Cross-layer analysis) */}
      {/* ========================================================================= */}
      {showColumnDuplicatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Columns className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">ملخص تكرار الأحرف في الأعمدة (بين الطبقات)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowColumnDuplicatesModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4 text-xs">
              <p className="text-stone-600 leading-relaxed">
                يقوم هذا الفحص بمراقبة الأحرف المتطابقة التي تقع في <strong>نفس العمود رأسياً</strong> عبر مختلف طبقات الجدول (من الطبقة 1 إلى 7).
              </p>

              {/* Arabic Column Duplicates */}
              <div className="border border-stone-200 rounded-xl p-3.5 bg-stone-50/70">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-stone-900 flex items-center gap-1.5 text-xs">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span>تكرار الأحرف العربية عبر الطبقات (الأعمدة)</span>
                  </span>
                  <span className="text-3xs font-black px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                    {columnDuplicatesSummary.arabicDuplicates.length > 0
                      ? `${columnDuplicatesSummary.arabicDuplicates.length} تكرار`
                      : 'متوازنة تماماً'}
                  </span>
                </div>

                {columnDuplicatesSummary.arabicDuplicates.length === 0 ? (
                  <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>لا يوجد أي تكرار لنفس الحرف العربي عبر الطبقات المختلفة.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {columnDuplicatesSummary.arabicDuplicates.map((dup, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-white border border-amber-200 rounded-lg flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-md bg-amber-500 text-stone-950 flex items-center justify-center font-black font-['Amiri',serif] text-base">
                            {dup.char}
                          </span>
                          <div>
                            <span className="font-bold text-stone-900 block">
                              الحرف: «{dup.char}»
                            </span>
                            <span className="text-2xs text-stone-500">
                              تكرر في {dup.count} طبقات مختلفة: (الطبقة {dup.layers.join('، ')} )
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

              {/* Cipher Column Duplicates */}
              <div className="border border-stone-200 rounded-xl p-3.5 bg-stone-50/70">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-stone-900 flex items-center gap-1.5 text-xs">
                    <Key className="w-4 h-4 text-indigo-600" />
                    <span>تكرار أحرف التشفير النورانية عبر الطبقات (الأعمدة)</span>
                  </span>
                  <span className="text-3xs font-black px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                    {columnDuplicatesSummary.cipherDuplicates.length > 0
                      ? `${columnDuplicatesSummary.cipherDuplicates.length} تكرار (مسموح)`
                      : 'لا يوجد تكرار'}
                  </span>
                </div>

                {columnDuplicatesSummary.cipherDuplicates.length === 0 ? (
                  <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>لا توجد أحرف تشفير متكررة عبر الطبقات المختلفة.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {columnDuplicatesSummary.cipherDuplicates.map((dup, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-white border border-indigo-200 rounded-lg flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-md bg-indigo-700 text-white flex items-center justify-center font-black font-['Amiri',serif] text-base">
                            {dup.char}
                          </span>
                          <div>
                            <span className="font-bold text-stone-900 block">
                              حرف التشفير: «{dup.char}»
                            </span>
                            <span className="text-2xs text-stone-500">
                              تكرر في {dup.count} طبقات مختلفة: (الطبقة {dup.layers.join('، ')} )
                            </span>
                          </div>
                        </div>
                        <span className="text-3xs font-black bg-indigo-100 text-indigo-900 border border-indigo-300 px-2 py-0.5 rounded">
                          مسموح بشفرة الفرقان
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  handleRemoveRowDuplicates();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                title="تنظيف أي تكرار أفقي في الصفوف فوراً"
              >
                <Scissors className="w-3.5 h-3.5 text-amber-800" />
                <span>تنظيف التكرار بالصفوف</span>
              </button>

              <button
                type="button"
                onClick={() => setShowColumnDuplicatesModal(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-900 text-white cursor-pointer transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
