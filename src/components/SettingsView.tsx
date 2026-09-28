import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  Layers,
  Calculator,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Info,
  ArrowRightLeft,
  Sliders,
  Sparkles,
  HelpCircle,
  Hash,
  Sun,
  Moon,
  Terminal,
  Monitor,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCipherLayers } from '../context/CipherLayersContext';
import { useGematria, ARABIC_28_CANONICAL, MASHRIQI_VALUES, MAGHRIBI_VALUES } from '../context/GematriaContext';
import { DEFAULT_CIPHER_LAYERS, LayerInfo } from '../cipherData';
import { useTheme } from '../context/ThemeContext';

export function SettingsView() {
  const {
    theme,
    setTheme,
    isDos,
    dosScanlines,
    setDosScanlines,
    dosSound,
    setDosSound,
    playDosBeep,
  } = useTheme();

  const {
    layers,
    updateAllLayers,
    resetToDefault: resetLayersToDefault,
    savedTables: savedLayerTables,
    saveCustomLayersTable,
    deleteSavedTable: deleteSavedLayerTable,
    loadSavedTable: loadSavedLayerTable,
  } = useCipherLayers();

  const {
    tables: gematriaTables,
    activeTableId,
    activeTable,
    setActiveTableId,
    addCustomTable,
    updateTable,
    deleteTable,
    resetToDefaults: resetGematriaToDefaults,
    calculationOptions,
    updateCalculationOptions,
  } = useGematria();

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // -------------------------------------------------------------
  // PART 1: Sky & Earth Layers Management
  // -------------------------------------------------------------
  // Local state for layers editing
  const [localLayers, setLocalLayers] = useState<LayerInfo[]>(() => JSON.parse(JSON.stringify(layers)));
  const [activeLayerTableId, setActiveLayerTableId] = useState<string>('default');

  // Sync when context layers change
  useEffect(() => {
    setLocalLayers(JSON.parse(JSON.stringify(layers)));
  }, [layers]);

  // Extract bulk strings from localLayers
  const skyString = useMemo(() => {
    const chars: string[] = [];
    localLayers.forEach((l) => {
      const c = l.cipherLetters || [];
      c.slice(0, 2).forEach((ch) => {
        if (ch && ch.trim()) chars.push(ch.trim());
      });
    });
    return chars.join(' ');
  }, [localLayers]);

  const earthString = useMemo(() => {
    const chars: string[] = [];
    localLayers.forEach((l) => {
      const a = l.arabicLetters || [];
      a.slice(0, 2).forEach((ch) => {
        if (ch && ch.trim()) chars.push(ch.trim());
      });
    });
    return chars.join(' ');
  }, [localLayers]);

  // Text inputs for bulk editing
  const [bulkSkyInput, setBulkSkyInput] = useState<string>(skyString);
  const [bulkEarthInput, setBulkEarthInput] = useState<string>(earthString);

  // Sync bulk inputs when localLayers change from table edits
  useEffect(() => {
    setBulkSkyInput(skyString);
  }, [skyString]);

  useEffect(() => {
    setBulkEarthInput(earthString);
  }, [earthString]);

  // Clean letters helper
  const extractArabicChars = (text: string): string[] => {
    return text.replace(/[^ء-ي]/g, '').split('');
  };

  // Apply bulk strings into local layers
  const handleApplyBulkStrings = (skyRaw?: string, earthRaw?: string) => {
    const targetSky = extractArabicChars(skyRaw !== undefined ? skyRaw : bulkSkyInput);
    const targetEarth = extractArabicChars(earthRaw !== undefined ? earthRaw : bulkEarthInput);

    setLocalLayers((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as LayerInfo[];
      // Distribute 2 letters per layer across 7 layers
      for (let i = 0; i < 7; i++) {
        if (!next[i]) {
          next[i] = {
            layer: i + 1,
            description: `الطبقة ${i + 1}`,
            cipherLetters: ['', ''],
            arabicLetters: ['', ''],
          };
        }
        // Sky
        const s1 = targetSky[i * 2] || '';
        const s2 = targetSky[i * 2 + 1] || '';
        next[i].cipherLetters = [s1, s2];

        // Earth
        const e1 = targetEarth[i * 2] || '';
        const e2 = targetEarth[i * 2 + 1] || '';
        next[i].arabicLetters = [e1, e2];
      }
      return next;
    });

    showFeedback('تم تطبيق السلاسل على جدول الطبقات بنجاح');
  };

  // Handle cell edit in the individual table
  const handleUpdateLayerChar = (
    layerIndex: number,
    type: 'sky' | 'earth',
    slotIndex: number,
    value: string
  ) => {
    const clean = value.replace(/[^ء-ي]/g, '').slice(-1); // Take single Arabic letter
    setLocalLayers((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as LayerInfo[];
      if (!next[layerIndex]) return prev;
      if (type === 'sky') {
        if (!Array.isArray(next[layerIndex].cipherLetters)) next[layerIndex].cipherLetters = ['', ''];
        next[layerIndex].cipherLetters[slotIndex] = clean;
      } else {
        if (!Array.isArray(next[layerIndex].arabicLetters)) next[layerIndex].arabicLetters = ['', ''];
        next[layerIndex].arabicLetters[slotIndex] = clean;
      }
      return next;
    });
  };

  // Save current layers
  const handleSaveLayers = (customName?: string) => {
    updateAllLayers(localLayers, customName || 'منظومة مخصصة');
    if (customName) {
      saveCustomLayersTable(customName, customName, localLayers, 'تم الحفظ من لوحة الإعدادات');
    }
    showFeedback('تم حفظ وتفعيل جدول الطبقات بنجاح');
  };

  // Reset layers to default
  const handleResetLayers = () => {
    resetLayersToDefault();
    setLocalLayers(JSON.parse(JSON.stringify(DEFAULT_CIPHER_LAYERS)));
    setActiveLayerTableId('default');
    showFeedback('تمت استعادة جدول الطبقات الافتراضي');
  };

  // -------------------------------------------------------------
  // PART 2: Gematria Tables Management
  // -------------------------------------------------------------
  const [selectedGematriaTableId, setSelectedGematriaTableId] = useState<string>(activeTableId);
  const [gematriaEditingValues, setGematriaEditingValues] = useState<Record<string, number>>({});
  const [gematriaEditingName, setGematriaEditingName] = useState<string>('');

  const currentGematriaTable = gematriaTables.find((t) => t.id === selectedGematriaTableId) || activeTable;

  useEffect(() => {
    setSelectedGematriaTableId(activeTableId);
  }, [activeTableId]);

  useEffect(() => {
    if (currentGematriaTable) {
      setGematriaEditingValues({ ...currentGematriaTable.values });
      setGematriaEditingName(currentGematriaTable.name);
    }
  }, [currentGematriaTable]);

  const handleGematriaValueChange = (char: string, val: number) => {
    setGematriaEditingValues((prev) => ({
      ...prev,
      [char]: isNaN(val) ? 0 : val,
    }));
  };

  const handleSaveGematriaTable = () => {
    if (currentGematriaTable.isPreset) {
      // Create custom copy
      const newId = addCustomTable({
        name: `${gematriaEditingName} (مخصص)`,
        description: `نسخة مخصصة مبنية على ${currentGematriaTable.name}`,
        values: gematriaEditingValues,
        letterOrder: currentGematriaTable.letterOrder || ARABIC_28_CANONICAL,
      });
      setSelectedGematriaTableId(newId);
      setActiveTableId(newId);
      showFeedback('تم حفظ جدول الجُمَّل المخصص وتفعيله');
    } else {
      updateTable(selectedGematriaTableId, {
        name: gematriaEditingName,
        values: gematriaEditingValues,
      });
      setActiveTableId(selectedGematriaTableId);
      showFeedback('تم تحديث جدول الجُمَّل بنجاح');
    }
  };

  const handleResetGematriaDefaults = () => {
    resetGematriaToDefaults();
    showFeedback('تمت استعادة جداول وخيارات الجُمَّل الافتراضية');
  };

  // Count characters
  const skyCharCount = extractArabicChars(bulkSkyInput).length;
  const earthCharCount = extractArabicChars(bulkEarthInput).length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Page Title & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100">
              الإعدادات وإدارة الجداول
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              تخصيص وتعديل منظومة السماوات والأرض (الطبقات السبع) وجداول حساب الجُمَّل في صفحة واحدة
            </p>
          </div>
        </div>

        {/* Global Feedback notification */}
        {feedbackMessage && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium shadow-xs">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 0: المظهر والثيمات وأنظمة العرض (نهاري / ليلي / دوس التسعينات)   */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              نمط العرض والمظهر العام (Themes & Visual Modes)
            </h2>
          </div>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            يمكنك أيضاً التبديل السريع بضغطة واحدة من شريط العنوان العلوي أو عبر مفتاح <kbd className="px-1.5 py-0.5 font-mono text-[11px] bg-stone-100 dark:bg-stone-800 border rounded">F9</kbd>
          </span>
        </div>

        {/* 3 Theme Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Light Mode */}
          <button
            type="button"
            onClick={() => {
              setTheme('light');
              showFeedback('تم تفعيل الوضع النهاري');
            }}
            className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              theme === 'light'
                ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-stone-50 dark:bg-stone-950/40 border-stone-200 dark:border-stone-800 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>الوضع النهاري (Light)</span>
              </span>
              {theme === 'light' && <Check className="w-4 h-4 text-amber-600" />}
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              واجهة فاتحة ناصعة ذات تباين عالٍ ومريحة للقراءة في الإضاءة القوية.
            </p>
          </button>

          {/* Dark Mode */}
          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              showFeedback('تم تفعيل الوضع الليلي');
            }}
            className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              theme === 'dark'
                ? 'bg-stone-850 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-stone-50 dark:bg-stone-950/40 border-stone-200 dark:border-stone-800 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-amber-400" />
                <span>الوضع الليلي (Dark)</span>
              </span>
              {theme === 'dark' && <Check className="w-4 h-4 text-amber-400" />}
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              واجهة مظلمة أنيقة ومريحة للعين في الإضاءة المنخفضة مع إبراز النتائج.
            </p>
          </button>

          {/* DOS 90s Mode */}
          <button
            type="button"
            onClick={() => {
              setTheme('dos');
              playDosBeep(880, 50);
              showFeedback('تم تفعيل ثيم دوس التسعينات MS-DOS v6.22 بنجاح');
            }}
            className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              theme === 'dos'
                ? 'bg-[#0000a8] text-white border-2 border-[#55ffff] shadow-[4px_4px_0px_#000000]'
                : 'bg-stone-50 dark:bg-stone-950/40 border-stone-200 dark:border-stone-800 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-bold flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-[#55ff55]" />
                <span className={theme === 'dos' ? 'text-[#ffff55]' : 'text-stone-900 dark:text-stone-100'}>
                  دوس التسعينات (MS-DOS)
                </span>
              </span>
              {theme === 'dos' && <span className="text-xs font-mono bg-[#55ff55] text-black px-1 font-bold">نشط</span>}
            </div>
            <p className={`text-xs ${theme === 'dos' ? 'text-[#55ffff]' : 'text-stone-500 dark:text-stone-400'}`}>
              محاكاة كاملة لأنظمة 1995: أزرق نورتون كوماندر، خط مونو سبيس، مؤشر وامض، وأزرار F1-F10.
            </p>
          </button>
        </div>

        {/* Extended DOS Options */}
        {isDos && (
          <div className="p-3.5 border-2 border-[#55ffff] bg-[#000055] space-y-3 font-mono text-xs text-white">
            <div className="flex items-center justify-between border-b border-[#0000aa] pb-2">
              <span className="text-[#ffff55] font-bold flex items-center gap-1.5">
                <span>[ خيارات إضافية لشاشة DOS ومؤثرات التسعينات ]</span>
              </span>
              <span className="text-[#55ff55]">
                <span>BIOS READY</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between bg-[#000080] p-2 border border-[#55ffff]">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-[#55ffff]" />
                  <span>خطوط المسح الضوئي CRT Scanlines:</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDosScanlines(!dosScanlines);
                    playDosBeep(920, 30);
                  }}
                  className={`px-3 py-1 font-bold border ${
                    dosScanlines ? 'bg-[#55ff55] text-black border-white' : 'bg-stone-700 text-stone-300 border-stone-500'
                  }`}
                >
                  {dosScanlines ? 'مُفعّلة (ON)' : 'معطلة (OFF)'}
                </button>
              </div>

              <div className="flex items-center justify-between bg-[#000080] p-2 border border-[#55ffff]">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-[#ffff55]" />
                  <span>صوت مكبر DOS الداخلي (PC Speaker):</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDosSound(!dosSound);
                      playDosBeep(880, 40);
                    }}
                    className={`px-3 py-1 font-bold border ${
                      dosSound ? 'bg-[#55ff55] text-black border-white' : 'bg-stone-700 text-stone-300 border-stone-500'
                    }`}
                  >
                    {dosSound ? 'شغال (ON)' : 'صامت (OFF)'}
                  </button>

                  {dosSound && (
                    <button
                      type="button"
                      onClick={() => playDosBeep(1000, 60)}
                      className="px-2 py-1 bg-[#aaaaaa] text-black hover:bg-white font-bold border"
                      title="تجربة طنين مكبر الصوت"
                    >
                      تجربة ♫
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: منظومة السماوات والأرض (جدول الطبقات المتناظرة)                 */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              1. جداول منظومة السماوات والأرض (الطبقات السبع المتناظرة)
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleResetLayers}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-750 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الافتراضي</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveLayers()}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>تطبيق وحفظ المنظومة</span>
            </button>
          </div>
        </div>

        {/* --- Bulk Editing Mode (التحرير بالكمية) --- */}
        <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>التحرير بالكمية (كتابة أو تعديل السلسلة الكاملة دفعة واحدة)</span>
            </span>
            <span className="text-3xs text-stone-500 dark:text-stone-400">
              يتم تقسيم الحروف تلقائياً إلى 7 طبقات متناظرة (حرفان لكل طبقة)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Sky Input (سلسلة السماوات) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-1">
                  <span>سلسلة حروف السماوات (حروف التشفير)</span>
                </label>
                <span className={`text-3xs font-mono font-bold px-1.5 py-0.5 rounded-md ${
                  skyCharCount === 14
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                }`}>
                  {skyCharCount} / 14 حرف
                </span>
              </div>
              <input
                type="text"
                dir="rtl"
                value={bulkSkyInput}
                onChange={(e) => {
                  setBulkSkyInput(e.target.value);
                  handleApplyBulkStrings(e.target.value, bulkEarthInput);
                }}
                placeholder="ا ج ه ز ط ك م س ف ق ث ذ ظ غ"
                className="w-full px-3 py-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
              />
              <p className="text-3xs text-stone-500">
                الحروف المعتمدة: ا ج ه ز ط ك م س ف ق ث ذ ظ غ
              </p>
            </div>

            {/* Earth Input (سلسلة الأرض) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <span>سلسلة حروف الأرض (الحروف العربية المقابلة)</span>
                </label>
                <span className={`text-3xs font-mono font-bold px-1.5 py-0.5 rounded-md ${
                  earthCharCount === 14
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                }`}>
                  {earthCharCount} / 14 حرف
                </span>
              </div>
              <input
                type="text"
                dir="rtl"
                value={bulkEarthInput}
                onChange={(e) => {
                  setBulkEarthInput(e.target.value);
                  handleApplyBulkStrings(bulkSkyInput, e.target.value);
                }}
                placeholder="ب د و ح ي ل ن ع ص ر ت خ ض ش"
                className="w-full px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
              <p className="text-3xs text-stone-500">
                الحروف المعتمدة: ب د و ح ي ل ن ع ص ر ت خ ض ش
              </p>
            </div>
          </div>
        </div>

        {/* --- Individual Table Editing (التحرير الفردي بالجدول) --- */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
              التحرير الفردي (تعديل كل طبقة وحرف على حدة):
            </span>
            <span className="text-3xs text-stone-500">
              التعديل في الجدول يُحدّث السلسلة بالكمية تلقائياً
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xs">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-stone-100 dark:bg-stone-850 text-stone-700 dark:text-stone-300 text-xs font-semibold">
                  <th className="py-2.5 px-3 text-right">رقم الطبقة</th>
                  <th className="py-2.5 px-3 text-sky-700 dark:text-sky-300">حروف السماء (1 و 2)</th>
                  <th className="py-2.5 px-2 text-stone-400">التقابل</th>
                  <th className="py-2.5 px-3 text-emerald-700 dark:text-emerald-300">حروف الأرض (1 و 2)</th>
                  <th className="py-2.5 px-3 text-left">التوصيف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-xs">
                {localLayers.slice(0, 7).map((layer, idx) => {
                  const sky1 = (layer.cipherLetters && layer.cipherLetters[0]) || '';
                  const sky2 = (layer.cipherLetters && layer.cipherLetters[1]) || '';
                  const earth1 = (layer.arabicLetters && layer.arabicLetters[0]) || '';
                  const earth2 = (layer.arabicLetters && layer.arabicLetters[1]) || '';

                  return (
                    <tr key={`layer_row_${idx}`} className="hover:bg-stone-50 dark:hover:bg-stone-850/50 transition-colors">
                      {/* Layer Number */}
                      <td className="py-2 px-3 text-right font-bold text-stone-900 dark:text-stone-100">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-stone-200 dark:bg-stone-800 text-3xs font-mono">
                          {layer.layer || idx + 1}
                        </span>
                      </td>

                      {/* Sky Letters Inputs */}
                      <td className="py-2 px-3">
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="text"
                            maxLength={1}
                            value={sky1}
                            onChange={(e) => handleUpdateLayerChar(idx, 'sky', 0, e.target.value)}
                            className="w-8 h-8 text-center text-sm font-bold font-mono rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                          />
                          <input
                            type="text"
                            maxLength={1}
                            value={sky2}
                            onChange={(e) => handleUpdateLayerChar(idx, 'sky', 1, e.target.value)}
                            className="w-8 h-8 text-center text-sm font-bold font-mono rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                          />
                        </div>
                      </td>

                      {/* Arrow */}
                      <td className="py-2 px-2 text-stone-400">
                        <ArrowRightLeft className="w-3.5 h-3.5 mx-auto" />
                      </td>

                      {/* Earth Letters Inputs */}
                      <td className="py-2 px-3">
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="text"
                            maxLength={1}
                            value={earth1}
                            onChange={(e) => handleUpdateLayerChar(idx, 'earth', 0, e.target.value)}
                            className="w-8 h-8 text-center text-sm font-bold font-mono rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                          />
                          <input
                            type="text"
                            maxLength={1}
                            value={earth2}
                            onChange={(e) => handleUpdateLayerChar(idx, 'earth', 1, e.target.value)}
                            className="w-8 h-8 text-center text-sm font-bold font-mono rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                          />
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-2 px-3 text-left text-3xs text-stone-500 dark:text-stone-400">
                        {layer.description || `الطبقة ${idx + 1}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: جداول حساب الجُمَّل (أقيام الحروف الـ 28)                         */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              2. جداول حساب الجُمَّل (أقيام الحروف الـ 28)
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleResetGematriaDefaults}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-750 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الافتراضي</span>
            </button>

            <button
              type="button"
              onClick={handleSaveGematriaTable}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ وتفعيل جدول الجُمَّل</span>
            </button>
          </div>
        </div>

        {/* Table Selector bar */}
        <div className="flex items-center gap-2 flex-wrap p-2.5 rounded-xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800">
          <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
            الجدول المعتمد:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {gematriaTables.map((tbl) => (
              <button
                key={tbl.id}
                type="button"
                onClick={() => {
                  setSelectedGematriaTableId(tbl.id);
                  setActiveTableId(tbl.id);
                  showFeedback(`تم اعتماد جدول: ${tbl.name}`);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedGematriaTableId === tbl.id
                    ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-750'
                }`}
              >
                {tbl.name}
              </button>
            ))}
          </div>
        </div>

        {/* 28 Letters Numeric Values Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
              تعديل قيم الحروف الـ 28 للجدول الحالي ({currentGematriaTable.name}):
            </span>
            <span className="text-3xs text-stone-500">
              يمكنك كتابة القيمة العددية المخصصة لأي حرف وحفظها كجدول جديد
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-14 gap-1.5">
            {ARABIC_28_CANONICAL.map((item) => {
              const char = typeof item === 'string' ? item : item.char;
              const val = gematriaEditingValues[char] ?? currentGematriaTable.values[char] ?? 0;
              return (
                <div
                  key={`gem_char_${char}`}
                  className="p-1.5 rounded-xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-750 text-center shadow-2xs hover:border-amber-400 dark:hover:border-amber-600 transition-all flex flex-col items-center justify-between gap-1"
                >
                  <span className="text-base font-bold font-serif text-stone-900 dark:text-stone-100">
                    {char}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={val}
                    onChange={(e) => handleGematriaValueChange(char, parseInt(e.target.value, 10))}
                    className="w-full text-center text-xs font-mono font-bold py-0.5 rounded bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-amber-700 dark:text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Calculation Rules */}
        <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 dark:text-stone-200">
            <Sliders className="w-4 h-4 text-amber-600" />
            <span>قواعد احتساب الحروف في محرك الجُمَّل</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Dagger Alif */}
            <div className="space-y-1">
              <label className="text-3xs text-stone-500">الألف الخنجرية:</label>
              <select
                value={calculationOptions.daggerAlif}
                onChange={(e) =>
                  updateCalculationOptions({ daggerAlif: e.target.value as any })
                }
                className="w-full px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-xs"
              >
                <option value="count_as_1">احتساب = 1 (مثل الرحمن)</option>
                <option value="ignore_0">إهمال = 0</option>
              </select>
            </div>

            {/* Ta Marbuta */}
            <div className="space-y-1">
              <label className="text-3xs text-stone-500">التاء المربوطة (ة):</label>
              <select
                value={calculationOptions.taMarbuta}
                onChange={(e) =>
                  updateCalculationOptions({ taMarbuta: e.target.value as any })
                }
                className="w-full px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-xs"
              >
                <option value="as_ha_5">حسابها كهاء = 5 (الأكثر شيوعاً)</option>
                <option value="as_ta_400">حسابها كتاء = 400</option>
              </select>
            </div>

            {/* Shaddah */}
            <div className="space-y-1">
              <label className="text-3xs text-stone-500">الشدة (التضعيف):</label>
              <select
                value={calculationOptions.shaddah}
                onChange={(e) =>
                  updateCalculationOptions({ shaddah: e.target.value as any })
                }
                className="w-full px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-xs"
              >
                <option value="single">حرف مفرد (الرسم المكتوب)</option>
                <option value="double">تضعيف الحرف = 2× القيمة</option>
              </select>
            </div>

            {/* Silent Waw */}
            <div className="space-y-1">
              <label className="text-3xs text-stone-500">الواو الصامتة (أولو/أولئك):</label>
              <select
                value={calculationOptions.silentWawMode}
                onChange={(e) =>
                  updateCalculationOptions({ silentWawMode: e.target.value as any })
                }
                className="w-full px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-xs"
              >
                <option value="count_as_6">احتساب الواو = 6</option>
                <option value="ignore_0">إهمال الواو = 0</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default SettingsView;
