import React, { useState } from 'react';
import { ARABIC_PRESETS, NOORANI_PRESETS, LAYER_RAINBOW_COLORS } from '../cipherData';
import { useCipherLayers } from '../context/CipherLayersContext';
import { Sparkles, Edit3, Check, Layers, ArrowRight, BookmarkPlus, Play, CheckCircle2 } from 'lucide-react';

interface MatrixMixerViewProps {
  onBackToGrid: () => void;
}

export const MatrixMixerView: React.FC<MatrixMixerViewProps> = ({ onBackToGrid }) => {
  const { updateAllLayers, saveCurrentTable, savedTables } = useCipherLayers();

  // Custom Editable Names State for Noorani Orders ("لغة السماء")
  const [nooraniNames, setNooraniNames] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    Object.values(NOORANI_PRESETS).forEach((p) => {
      initial[p.id] = p.name;
    });
    return initial;
  });

  // Custom Editable Names State for Arabic Orders ("لغة الأرض")
  const [arabicNames, setArabicNames] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    Object.values(ARABIC_PRESETS).forEach((p) => {
      initial[p.id] = p.name;
    });
    return initial;
  });

  // Selection states
  const [selectedNooraniId, setSelectedNooraniId] = useState<string>('noorani_nr');
  const [selectedArabicId, setSelectedArabicId] = useState<string>('arabic_alphabetical');

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  // Save Modal state
  const [newTableName, setNewTableName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Active Selected Presets
  const activeNooraniPreset = NOORANI_PRESETS[selectedNooraniId] || Object.values(NOORANI_PRESETS)[0];
  const activeArabicPreset = ARABIC_PRESETS[selectedArabicId] || Object.values(ARABIC_PRESETS)[0];

  const currentNooraniName = nooraniNames[selectedNooraniId] || activeNooraniPreset.name;
  const currentArabicName = arabicNames[selectedArabicId] || activeArabicPreset.name;
  const combinedSystemName = `سماء: ${currentNooraniName} × أرض: ${currentArabicName}`;

  // Build combined hybrid layers
  const buildHybridLayers = () => {
    const nooraniMap = new Map(activeNooraniPreset.nooraniLayers.map((nl) => [nl.layer, nl.cipherLetters]));
    const arabicMap = new Map(activeArabicPreset.arabicLayers.map((al) => [al.layer, al.letters]));

    const layers = [];
    for (let layerNum = 7; layerNum >= 1; layerNum--) {
      const ciphers = nooraniMap.get(layerNum) || [];
      const arabics = arabicMap.get(layerNum) || ['', '', '', ''];
      layers.push({
        layer: layerNum,
        cipherLetters: [...ciphers],
        arabicLetters: [...arabics],
        description: `السماء ${layerNum}: [لغة السماء: ${currentNooraniName}] × [لغة الأرض: ${currentArabicName}]`,
      });
    }
    return layers;
  };

  // Apply directly to active workspace
  const handleApplyToWorkspace = () => {
    const hybrid = buildHybridLayers();
    updateAllLayers(hybrid, combinedSystemName);
    onBackToGrid();
  };

  // Confirm save
  const handleConfirmSaveTable = (e: React.FormEvent) => {
    e.preventDefault();

    const hybrid = buildHybridLayers();
    // Temporarily set active layers to save
    updateAllLayers(hybrid, combinedSystemName);
    const saved = saveCurrentTable(
      currentNooraniName,
      currentArabicName,
      `منظومة متقاطعة [لغة السماء: ${currentNooraniName}] × [لغة الأرض: ${currentArabicName}]`
    );

    setIsSaving(false);
    setSaveSuccessMsg(`تم حفظ جدول الذِّكْر المتقاطع [${saved.name}] بنجاح في مكتبتك!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden animate-in fade-in duration-200">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
            ⚡
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
              <span>مصفوفة التناغم (لغة السماء × لغة الأرض)</span>
              <span className="text-3xs bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono">
                2D Matrix
              </span>
            </h3>
            <p className="text-2xs text-stone-300 mt-0.5">
              اختر ترتيباً للأحرف النورانية (لغة السماء) وترتيباً للأحرف الأبجدية (لغة الأرض) لدمجهما فوراً بدقة وسرعة
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToGrid}
          className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors border border-stone-700"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرجوع للجدول</span>
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="m-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      <div className="p-4 sm:p-6 space-y-8">
        {/* ========================================================================= */}
        {/* SECTION 1: NOORANI ORDERS ("لغة السماء") */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-200 dark:border-indigo-900/50 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <h4 className="text-xs sm:text-sm font-extrabold text-indigo-900 dark:text-indigo-300">
                1. ترتيبات الأحرف النورانية (لغة السماء)
              </h4>
            </div>
            <span className="text-3xs text-stone-400 font-semibold">
              اختر نمطاً واحداً لتمثيل لغة السماء
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(NOORANI_PRESETS).map((preset) => {
              const isSelected = selectedNooraniId === preset.id;
              const displayName = nooraniNames[preset.id] || preset.name;
              const isEditingThis = editingId === `n_${preset.id}`;

              return (
                <div
                  key={preset.id}
                  onClick={() => setSelectedNooraniId(preset.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 relative ${
                    isSelected
                      ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs'
                      : 'bg-stone-50/80 dark:bg-stone-850/60 border-stone-200 dark:border-stone-800 hover:border-indigo-300 dark:hover:border-indigo-800'
                  }`}
                >
                  <div className="space-y-1.5">
                    {/* Title with edit button */}
                    <div className="flex items-center justify-between gap-1">
                      {isEditingThis ? (
                        <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            autoFocus
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (tempName.trim()) {
                                  setNooraniNames((prev) => ({ ...prev, [preset.id]: tempName.trim() }));
                                }
                                setEditingId(null);
                              }
                            }}
                            className="px-2 py-0.5 text-xs rounded border border-amber-400 bg-white dark:bg-stone-800 text-stone-900 dark:text-white w-full"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (tempName.trim()) {
                                setNooraniNames((prev) => ({ ...prev, [preset.id]: tempName.trim() }));
                              }
                              setEditingId(null);
                            }}
                            className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h5 className="font-extrabold text-xs text-stone-900 dark:text-stone-100 truncate flex items-center gap-1.5">
                            <span>✨ {displayName}</span>
                          </h5>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(`n_${preset.id}`);
                              setTempName(displayName);
                            }}
                            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1 rounded cursor-pointer"
                            title="تعديل اسم هذا الترتيب النوراني"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>

                    <p className="text-3xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>

                    {/* Mini visual letters preview across Heavens */}
                    <div className="bg-white/80 dark:bg-stone-900/80 p-2 rounded-lg border border-stone-200/60 dark:border-stone-800 space-y-1">
                      {preset.nooraniLayers.slice(0, 3).map((l) => (
                        <div key={l.layer} className="flex items-center justify-between text-3xs">
                          <span className="text-stone-400 font-bold">السماء {l.layer}:</span>
                          <div className="flex gap-1 flex-wrap">
                            {l.cipherLetters.slice(0, 5).map((char, idx) => (
                              <span
                                key={idx}
                                className="px-1 py-0.2 bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 rounded font-bold font-['Amiri',serif]"
                              >
                                {char}
                              </span>
                            ))}
                            {l.cipherLetters.length > 5 && (
                              <span className="text-3xs text-stone-400 font-bold">+{l.cipherLetters.length - 5}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="text-3xs text-indigo-600 dark:text-indigo-400 font-bold text-center pt-0.5">
                        ... بقية السماوات الـ 7 متوفرة بالكامل
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-stone-200/50 dark:border-stone-800">
                    <span className="text-3xs font-bold text-stone-400">
                      {isSelected ? 'محدد حالياً' : 'اضغط للاختيار'}
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-700 text-white'
                          : 'border-stone-300 dark:border-stone-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: ARABIC ORDERS ("لغة الأرض") */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-900/50 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <h4 className="text-xs sm:text-sm font-extrabold text-amber-900 dark:text-amber-300">
                2. ترتيبات الأحرف الأبجدية الـ 28 (لغة الأرض)
              </h4>
            </div>
            <span className="text-3xs text-stone-400 font-semibold">
              اختر نمط توزيع لغة الأرض عبر السماوات الـ 7
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(ARABIC_PRESETS).map((preset) => {
              const isSelected = selectedArabicId === preset.id;
              const displayName = arabicNames[preset.id] || preset.name;
              const isEditingThis = editingId === `a_${preset.id}`;

              return (
                <div
                  key={preset.id}
                  onClick={() => setSelectedArabicId(preset.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 relative ${
                    isSelected
                      ? 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/30 shadow-xs'
                      : 'bg-stone-50/80 dark:bg-stone-850/60 border-stone-200 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-800'
                  }`}
                >
                  <div className="space-y-1.5">
                    {/* Title with edit button */}
                    <div className="flex items-center justify-between gap-1">
                      {isEditingThis ? (
                        <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            autoFocus
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (tempName.trim()) {
                                  setArabicNames((prev) => ({ ...prev, [preset.id]: tempName.trim() }));
                                }
                                setEditingId(null);
                              }
                            }}
                            className="px-2 py-0.5 text-xs rounded border border-emerald-400 bg-white dark:bg-stone-800 text-stone-900 dark:text-white w-full"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (tempName.trim()) {
                                setArabicNames((prev) => ({ ...prev, [preset.id]: tempName.trim() }));
                              }
                              setEditingId(null);
                            }}
                            className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h5 className="font-extrabold text-xs text-stone-900 dark:text-stone-100 truncate flex items-center gap-1.5">
                            <span>🔤 {displayName}</span>
                          </h5>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(`a_${preset.id}`);
                              setTempName(displayName);
                            }}
                            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1 rounded cursor-pointer"
                            title="تعديل اسم هذا الترتيب الأبجدي"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>

                    <p className="text-3xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>

                    {/* Mini visual boxes showing letters in heavens */}
                    <div className="bg-white/80 dark:bg-stone-900/80 p-2 rounded-lg border border-stone-200/60 dark:border-stone-800 space-y-1">
                      {preset.arabicLayers.slice(0, 3).map((l) => (
                        <div key={l.layer} className="flex items-center justify-between text-3xs">
                          <span className="text-stone-400 font-bold">السماء {l.layer}:</span>
                          <div className="flex gap-1">
                            {l.letters.map((char, idx) => {
                              const theme = LAYER_RAINBOW_COLORS[l.layer];
                              return (
                                <span
                                  key={idx}
                                  className={`w-5 h-5 flex items-center justify-center rounded font-bold text-3xs ${theme.badgeBg} ${theme.badgeText}`}
                                >
                                  {char || '-'}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <div className="text-3xs text-amber-600 dark:text-amber-400 font-bold text-center pt-0.5">
                        ... بقية السماوات الـ 7 متوفرة بالكامل
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-stone-200/50 dark:border-stone-800">
                    <span className="text-3xs font-bold text-stone-400">
                      {isSelected ? 'محدد حالياً' : 'اضغط للاختيار'}
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'bg-amber-600 border-amber-700 text-white'
                          : 'border-stone-300 dark:border-stone-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: HYBRID SYNTHESIZER ACTION BAR */}
        {/* ========================================================================= */}
        <div className="bg-stone-900 text-white rounded-2xl p-5 shadow-lg border border-stone-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-amber-400 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
                <span>تركيب وتقاطع المنظومة المختار</span>
              </h4>
              <p className="text-2xs text-stone-400 mt-0.5">
                تدمج لغة السماء مع لغة الأرض فوراً دون تكرار أو زيادة في حجم البرنامج
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-950 text-amber-300 border border-amber-800 px-3 py-1 rounded-xl text-xs font-bold">
                ✨ لغة السماء: {currentNooraniName}
              </span>
              <span className="text-stone-500 font-bold">×</span>
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-xl text-xs font-bold">
                🔤 لغة الأرض: {currentArabicName}
              </span>
            </div>
          </div>

          {/* Save input box if saving */}
          {isSaving && (
            <form onSubmit={handleConfirmSaveTable} className="bg-stone-850 p-4 rounded-xl border border-stone-700 space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-200 mb-1">
                  اسم جدول الذِّكْر الجديد:
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="مثال: سماء: ترتيب ك ن × أرض: الفبائي..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-700 bg-stone-800 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSaving(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-stone-400 hover:bg-stone-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
                >
                  تأكيد الحفظ في المكتبة
                </button>
              </div>
            </form>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            {!isSaving && (
              <button
                type="button"
                onClick={() => {
                  setNewTableName(`سماء: ${currentNooraniName} × أرض: ${currentArabicName}`);
                  setIsSaving(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <BookmarkPlus className="w-4 h-4 text-amber-400" />
                <span>حفظ في المكتبة 💾</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleApplyToWorkspace}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-white text-xs font-black flex items-center gap-2 shadow-md cursor-pointer transition-all hover:scale-102"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>تطبيق واختبار هذه الخلطة المتقاطعة فوراً 🚀</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
