import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import {
  LAYER_RAINBOW_COLORS,
  PRESET_TABLES,
  ALL_ARABIC_LETTERS_28,
  NOORANI_LETTERS,
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
    selectedSlot,
    setSelectedSlot,
    usedLetters,
    missingLetters,
    duplicateLetters,
    letterCounts,
    totalFilledSlots,
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
  const [cipherInput1, setCipherInput1] = useState('');
  const [cipherInput2, setCipherInput2] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [selectedBankLetter, setSelectedBankLetter] = useState<string | null>(null);

  // Drag and Drop state
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ layerNum: number; slotIndex: number } | null>(null);

  const presetMenuRef = useRef<HTMLDivElement>(null);

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

  // Open Cipher key editor
  const handleStartEditCipher = (layerNum: number, currentKeys: [string, string] | string[]) => {
    setEditingCipherLayer(layerNum);
    setCipherInput1(currentKeys[0] || '');
    setCipherInput2(currentKeys[1] || '');
  };

  const handleSaveCipher = (layerNum: number) => {
    if (cipherInput1 && cipherInput2) {
      setCipherLettersForLayer(layerNum, cipherInput1, cipherInput2);
    }
    setEditingCipherLayer(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Description */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center font-bold shrink-0 shadow-xs mt-0.5">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="layers-table-heading" className="text-base sm:text-lg font-bold text-stone-900">
                  الجدول المرجعي للطبقات السبع (تعديل كامل وسحب وإفلات)
                </h2>
                {isCustomized ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    جدول مخصص نشط
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-stone-100 text-stone-600 border border-stone-200">
                    الجدول القياسي المعتمد
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                اسحب الحرف بالماوس وضعه في أي خانة للتبديل، أو انقر للتحديد والتبديل المباشر. جميع أدوات التشفير وفك التشفير تعمل فوراً وفق تعديلاتك.
              </p>
            </div>
          </div>

          {/* Mode Switch & Global Actions */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* Mode Switcher Pill */}
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

            {/* Presets Dropdown */}
            <div className="relative" ref={presetMenuRef}>
              <button
                type="button"
                id="presets-menu-btn"
                onClick={() => setShowPresetMenu(!showPresetMenu)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>قوالب جاهزة</span>
              </button>

              {showPresetMenu && (
                <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-stone-200 py-1.5 z-30 divide-y divide-stone-100">
                  {Object.values(PRESET_TABLES).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        applyPreset(preset.id as keyof typeof PRESET_TABLES);
                        setShowPresetMenu(false);
                      }}
                      className="w-full text-right px-3 py-2 hover:bg-amber-50/70 text-xs transition-colors cursor-pointer flex flex-col gap-0.5"
                    >
                      <span className="font-bold text-stone-900">{preset.name}</span>
                      <span className="text-2xs text-stone-500">{preset.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                className="px-2.5 py-2 rounded-xl text-xs font-bold bg-stone-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-stone-200 text-stone-600 inline-flex items-center gap-1 cursor-pointer transition-colors"
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
                className="px-2.5 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="استعادة جدول الفرقان الافتراضي الأصلي"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                <span>استعادة الافتراضي</span>
              </button>
            )}
          </div>
        </div>

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
                    تكرار في الحروف: {duplicateLetters.join('، ')}
                  </span>
                )}
              </>
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
                <th className="py-3.5 px-4 w-52">حرفا التشفير (مفتاحا الطبقة)</th>
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
                    {/* Layer Number Badge */}
                    <td className="py-3.5 px-4 align-middle">
                      <span
                        className={`inline-flex items-center justify-center px-3 py-1 rounded-lg font-bold text-xs ${color.activeBg} ${color.activeText} shadow-xs`}
                      >
                        الطبقة {layerItem.layer}
                      </span>
                    </td>

                    {/* 2 Cipher Keys (Editable) */}
                    <td className="py-3.5 px-4 align-middle">
                      {isEditingCipher ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            maxLength={1}
                            value={cipherInput1}
                            onChange={(e) => setCipherInput1(e.target.value)}
                            className="w-8 h-8 rounded-lg border-2 border-amber-500 text-center font-bold text-base font-['Amiri',serif]"
                          />
                          <span className="text-stone-400 text-xs">أو</span>
                          <input
                            type="text"
                            maxLength={1}
                            value={cipherInput2}
                            onChange={(e) => setCipherInput2(e.target.value)}
                            className="w-8 h-8 rounded-lg border-2 border-amber-500 text-center font-bold text-base font-['Amiri',serif]"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCipher(layerItem.layer)}
                            className="px-2 py-1 rounded-md bg-amber-600 text-white text-xs font-bold cursor-pointer"
                          >
                            حفظ
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 font-black text-base text-stone-900 group">
                          <span className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center border border-stone-300 shadow-2xs font-['Amiri',serif] text-lg">
                            {layerItem.cipherLetters[0] || '؟'}
                          </span>
                          <span className="text-stone-400 text-xs font-normal">أو</span>
                          <span className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center border border-stone-300 shadow-2xs font-['Amiri',serif] text-lg">
                            {layerItem.cipherLetters[1] || '؟'}
                          </span>

                          {mode === 'edit' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStartEditCipher(layerItem.layer, layerItem.cipherLetters)
                              }
                              className="w-7 h-7 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-200/60 flex items-center justify-center transition-colors cursor-pointer mr-1"
                              title="تعديل حرفي التشفير لهذه الطبقة"
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
    </div>
  );
}
