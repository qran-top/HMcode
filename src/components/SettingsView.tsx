import React, { useState, useEffect, useMemo } from "react";
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
  Palette,
  Calendar,
} from "lucide-react";
import { useCipherLayers } from "../context/CipherLayersContext";
import {
  useGematria,
  ARABIC_28_CANONICAL,
  MASHRIQI_VALUES,
  MAGHRIBI_VALUES,
} from "../context/GematriaContext";
import {
  DEFAULT_CIPHER_LAYERS,
  LayerInfo,
  NOORANI_PRESETS,
  ARABIC_PRESETS,
  LAYER_RAINBOW_COLORS,
} from "../cipherData";
import { useTheme, DOS_PALETTES } from "../context/ThemeContext";
import { getCurrentHijriLunarDay } from "../utils/gematriaEngine";

export function SettingsView() {
  const {
    theme,
    setTheme,
    isDos,
    dosScanlines,
    setDosScanlines,
    dosSound,
    setDosSound,
    dosPalette,
    setDosPalette,
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
    applyArabicDistribution,
    applyNooraniDistribution,
    activeArabicPresetName,
    activeNooraniPresetName,
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
  const [localLayers, setLocalLayers] = useState<LayerInfo[]>(() =>
    JSON.parse(JSON.stringify(layers)),
  );
  const [activeLayerTableId, setActiveLayerTableId] =
    useState<string>("default");

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
    return chars.join(" ");
  }, [localLayers]);

  const earthString = useMemo(() => {
    const chars: string[] = [];
    localLayers.forEach((l) => {
      const a = l.arabicLetters || [];
      a.slice(0, 4).forEach((ch) => {
        if (ch && ch.trim()) chars.push(ch.trim());
      });
    });
    return chars.join(" ");
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
    return text.replace(/[^ء-ي]/g, "").split("");
  };

  // Apply bulk strings into local layers
  const handleApplyBulkStrings = (skyRaw?: string, earthRaw?: string) => {
    const targetSky = extractArabicChars(
      skyRaw !== undefined ? skyRaw : bulkSkyInput,
    );
    const targetEarth = extractArabicChars(
      earthRaw !== undefined ? earthRaw : bulkEarthInput,
    );

    setLocalLayers((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as LayerInfo[];
      // Distribute 2 letters per layer for Sky (14 total) and 4 letters per layer for Earth (28 total)
      for (let i = 0; i < 7; i++) {
        if (!next[i]) {
          next[i] = {
            layer: i + 1,
            description: `الطبقة ${i + 1}`,
            cipherLetters: ["", ""],
            arabicLetters: ["", "", "", ""],
          };
        }
        // Sky (2 letters per layer)
        const s1 = targetSky[i * 2] || "";
        const s2 = targetSky[i * 2 + 1] || "";
        next[i].cipherLetters = [s1, s2];

        // Earth (4 letters per layer)
        const e1 = targetEarth[i * 4] || "";
        const e2 = targetEarth[i * 4 + 1] || "";
        const e3 = targetEarth[i * 4 + 2] || "";
        const e4 = targetEarth[i * 4 + 3] || "";
        next[i].arabicLetters = [e1, e2, e3, e4];
      }
      return next;
    });

    showFeedback("تم تطبيق السلاسل على جدول الطبقات بنجاح");
  };

  // Handle cell edit in the individual table
  const handleUpdateLayerChar = (
    layerIndex: number,
    type: "sky" | "earth",
    slotIndex: number,
    value: string,
  ) => {
    const clean = value.replace(/[^ء-ي]/g, "").slice(-1); // Take single Arabic letter
    setLocalLayers((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as LayerInfo[];
      if (!next[layerIndex]) return prev;
      if (type === "sky") {
        if (!Array.isArray(next[layerIndex].cipherLetters))
          next[layerIndex].cipherLetters = ["", ""];
        next[layerIndex].cipherLetters[slotIndex] = clean;
      } else {
        if (!Array.isArray(next[layerIndex].arabicLetters))
          next[layerIndex].arabicLetters = ["", ""];
        next[layerIndex].arabicLetters[slotIndex] = clean;
      }
      return next;
    });
  };

  // Save current layers
  const handleSaveLayers = (customName?: string) => {
    updateAllLayers(localLayers, customName || "منظومة مخصصة");
    if (customName) {
      saveCustomLayersTable(
        customName,
        customName,
        localLayers,
        "تم الحفظ من لوحة الإعدادات",
      );
    }
    showFeedback("تم حفظ وتفعيل جدول الطبقات بنجاح");
  };

  // Reset layers to default
  const handleResetLayers = () => {
    resetLayersToDefault();
    setLocalLayers(JSON.parse(JSON.stringify(DEFAULT_CIPHER_LAYERS)));
    setActiveLayerTableId("default");
    showFeedback("تمت استعادة جدول الطبقات الافتراضي");
  };

  // -------------------------------------------------------------
  // PART 2: Gematria Tables Management
  // -------------------------------------------------------------
  const [selectedGematriaTableId, setSelectedGematriaTableId] =
    useState<string>(activeTableId);
  const [gematriaEditingValues, setGematriaEditingValues] = useState<
    Record<string, number>
  >({});
  const [gematriaEditingName, setGematriaEditingName] = useState<string>("");

  const currentGematriaTable =
    gematriaTables.find((t) => t.id === selectedGematriaTableId) || activeTable;

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
      showFeedback("تم حفظ جدول الجُمَّل المخصص وتفعيله");
    } else {
      updateTable(selectedGematriaTableId, {
        name: gematriaEditingName,
        values: gematriaEditingValues,
      });
      setActiveTableId(selectedGematriaTableId);
      showFeedback("تم تحديث جدول الجُمَّل بنجاح");
    }
  };

  const handleResetGematriaDefaults = () => {
    resetGematriaToDefaults();
    showFeedback("تمت استعادة جداول وخيارات الجُمَّل الافتراضية");
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
              تخصيص وتعديل منظومة السماوات والأرض (الطبقات السبع) وجداول حساب
              الجُمَّل في صفحة واحدة
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
            يمكنك أيضاً التبديل السريع بضغطة واحدة من شريط العنوان العلوي أو عبر
            مفتاح{" "}
            <kbd className="px-1.5 py-0.5 font-mono text-[11px] bg-stone-100 dark:bg-stone-800 border rounded">
              F9
            </kbd>
          </span>
        </div>

        {/* 3 Theme Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Light Mode */}
          <button
            type="button"
            onClick={() => {
              setTheme("light");
              showFeedback("تم تفعيل الوضع النهاري");
            }}
            className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              theme === "light"
                ? "bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
                : "bg-stone-50 dark:bg-stone-950/40 border-stone-200 dark:border-stone-800 hover:border-stone-300"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>الوضع النهاري (Light)</span>
              </span>
              {theme === "light" && (
                <Check className="w-4 h-4 text-amber-600" />
              )}
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              واجهة فاتحة ناصعة ذات تباين عالٍ ومريحة للقراءة في الإضاءة القوية.
            </p>
          </button>

          {/* Dark Mode */}
          <button
            type="button"
            onClick={() => {
              setTheme("dark");
              showFeedback("تم تفعيل الوضع الليلي");
            }}
            className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              theme === "dark"
                ? "bg-stone-850 border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
                : "bg-stone-50 dark:bg-stone-950/40 border-stone-200 dark:border-stone-800 hover:border-stone-300"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-amber-400" />
                <span>الوضع الليلي (Dark)</span>
              </span>
              {theme === "dark" && <Check className="w-4 h-4 text-amber-400" />}
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              واجهة مظلمة أنيقة ومريحة للعين في الإضاءة المنخفضة مع إبراز
              النتائج.
            </p>
          </button>

          {/* DOS 90s Mode */}
          <button
            type="button"
            onClick={() => {
              setTheme("dos");
              playDosBeep(880, 50);
              showFeedback("تم تفعيل ثيم دوس التسعينات MS-DOS v6.22 بنجاح");
            }}
            className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              theme === "dos"
                ? "bg-[#0000a8] text-white border-2 border-[#55ffff] shadow-[4px_4px_0px_#000000]"
                : "bg-stone-50 dark:bg-stone-950/40 border-stone-200 dark:border-stone-800 hover:border-amber-400"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-bold flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-[#55ff55]" />
                <span
                  className={
                    theme === "dos"
                      ? "text-[#ffff55]"
                      : "text-stone-900 dark:text-stone-100"
                  }
                >
                  دوس التسعينات (MS-DOS)
                </span>
              </span>
              {theme === "dos" && (
                <span className="text-xs font-mono bg-[#55ff55] text-black px-1 font-bold">
                  نشط
                </span>
              )}
            </div>
            <p
              className={`text-xs ${theme === "dos" ? "text-[#55ffff]" : "text-stone-500 dark:text-stone-400"}`}
            >
              محاكاة كاملة لأنظمة 1995: أزرق نورتون كوماندر، خط مونو سبيس، مؤشر
              وامض، وأزرار F1-F10.
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
                    dosScanlines
                      ? "bg-[#55ff55] text-black border-white"
                      : "bg-stone-700 text-stone-300 border-stone-500"
                  }`}
                >
                  {dosScanlines ? "مُفعّلة (ON)" : "معطلة (OFF)"}
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
                      dosSound
                        ? "bg-[#55ff55] text-black border-white"
                        : "bg-stone-700 text-stone-300 border-stone-500"
                    }`}
                  >
                    {dosSound ? "شغال (ON)" : "صامت (OFF)"}
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

            {/* DOS 5 Color Palettes Section */}
            <div className="pt-2 border-t border-[#0000aa] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#ffff55] font-bold flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-[#55ffff]" />
                  <span>
                    بالتات ألوان نظام دوس (اضغط F8 للتبديل السريع من أي مكان):
                  </span>
                </span>
                <span className="text-3xs text-[#aaaaaa]">
                  [مفتاح الاختصار: F8]
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {DOS_PALETTES.map((pal) => {
                  const isActive = dosPalette === pal.id;
                  return (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => {
                        setDosPalette(pal.id);
                        playDosBeep(850, 40);
                      }}
                      className={`p-2 text-right border-2 transition-none cursor-pointer flex flex-col justify-between ${
                        isActive
                          ? "border-[#ffff55] bg-[#000033] shadow-md"
                          : "border-[#555555] bg-[#000066] hover:border-[#55ffff]"
                      }`}
                      style={{
                        backgroundColor: isActive ? pal.bgHex : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-3.5 h-3.5 inline-block border border-white"
                            style={{ backgroundColor: pal.textHex }}
                          />
                          <span
                            className="font-bold text-xs"
                            style={{ color: pal.textHex }}
                          >
                            {pal.name}
                          </span>
                        </div>
                        {isActive && (
                          <span className="bg-[#ffff55] text-black px-1 font-black text-3xs">
                            [نشط]
                          </span>
                        )}
                      </div>
                      <p className="text-3xs text-[#cccccc] leading-tight font-mono">
                        {pal.description}
                      </p>
                    </button>
                  );
                })}
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
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                1. جداول منظومة السماوات والأرض (الطبقات السبع المتناظرة)
              </h2>
              <p className="text-3xs text-stone-500 dark:text-stone-400 mt-0.5">
                توزيع حروف السماوات الـ 14 (حرفان لكل طبقة) وحروف الأرض الـ 28
                (4 أحرف لكل طبقة) عبر 7 طبقات متناظرة.
              </p>
            </div>
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

        {/* --- Sky Presets Selector --- */}
        <div className="p-3.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-850 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
              <span>
                🌌 جداول حروف السماء (الحروف النورانية - 14 حرفاً / حرفان لكل
                طبقة):
              </span>
            </span>
            <span className="text-3xs text-sky-700 dark:text-sky-300 font-mono font-bold bg-sky-100 dark:bg-sky-900/60 px-2 py-0.5 rounded-md border border-sky-300 dark:border-sky-800">
              الجدول النشط:{" "}
              {activeNooraniPresetName ||
                "ر ص - م ق - ح س - ن ع - ي ل - هـ ا - ط ك (حروف السماء)"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {Object.values(NOORANI_PRESETS).map((preset) => {
              const isActive =
                activeNooraniPresetName === preset.name ||
                activeNooraniPresetName === preset.badge;
              const formattedLetters = preset.nooraniLayers
                .map((l) => l.cipherLetters.join(""))
                .join(" - ");
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    applyNooraniDistribution(preset);
                    // Update local layers directly for immediate UI preview
                    setLocalLayers((prev) => {
                      const next = JSON.parse(
                        JSON.stringify(prev),
                      ) as LayerInfo[];
                      preset.nooraniLayers.forEach((nl, idx) => {
                        if (next[idx]) {
                          next[idx].cipherLetters = [
                            nl.cipherLetters[0] || "",
                            nl.cipherLetters[1] || "",
                          ];
                        }
                      });
                      return next;
                    });
                    showFeedback(`تم اعتماد جدول السماء: ${preset.name}`);
                  }}
                  className={`p-3 rounded-xl text-right border transition-all cursor-pointer flex flex-col justify-between gap-2 text-xs shadow-2xs ${
                    isActive
                      ? "bg-sky-600 text-white border-sky-700 shadow-xs ring-2 ring-sky-400 dark:ring-sky-500"
                      : "bg-white dark:bg-stone-900 border-sky-200 dark:border-sky-800/60 text-stone-800 dark:text-stone-200 hover:border-sky-400 hover:bg-sky-50/50 dark:hover:bg-stone-850"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs">
                      {preset.badge || preset.name}
                    </span>
                    {isActive && (
                      <Check className="w-4 h-4 text-white shrink-0" />
                    )}
                  </div>
                  <div
                    className={`p-1.5 rounded-lg text-3xs font-mono font-bold tracking-wider text-center dir-rtl ${
                      isActive
                        ? "bg-sky-700/80 text-white"
                        : "bg-sky-100/60 dark:bg-stone-800 text-sky-900 dark:text-sky-300"
                    }`}
                  >
                    {formattedLetters}
                  </div>
                  <p
                    className={`text-3xs leading-relaxed ${isActive ? "text-sky-100" : "text-stone-500 dark:text-stone-400"}`}
                  >
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- Earth Presets Selector (All 4 Earth Tables) --- */}
        <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-850 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <span>
                🌍 جداول حروف الأرض (الحروف العربية الـ 28 كاملة / 4 أحرف لكل
                طبقة):
              </span>
            </span>
            <span className="text-3xs text-emerald-700 dark:text-emerald-300 font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800">
              الجدول النشط:{" "}
              {activeArabicPresetName || "رزصض - مبقد (جدول الأرض 4)"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {Object.values(ARABIC_PRESETS).map((preset) => {
              const isActive =
                activeArabicPresetName === preset.name ||
                activeArabicPresetName === preset.badge;
              const formattedLayers = preset.arabicLayers
                .map((l) => l.letters.join(" "))
                .join(" | ");
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    applyArabicDistribution(preset);
                    // Update local layers directly for immediate UI preview
                    setLocalLayers((prev) => {
                      const next = JSON.parse(
                        JSON.stringify(prev),
                      ) as LayerInfo[];
                      preset.arabicLayers.forEach((al, idx) => {
                        if (next[idx]) {
                          next[idx].arabicLetters = [
                            al.letters[0] || "",
                            al.letters[1] || "",
                            al.letters[2] || "",
                            al.letters[3] || "",
                          ];
                        }
                      });
                      return next;
                    });
                    showFeedback(`تم اعتماد جدول الأرض: ${preset.name}`);
                  }}
                  className={`p-3 rounded-xl text-right border transition-all cursor-pointer flex flex-col justify-between gap-2 text-xs shadow-2xs ${
                    isActive
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400 dark:ring-emerald-500"
                      : "bg-white dark:bg-stone-900 border-emerald-200 dark:border-emerald-800/60 text-stone-800 dark:text-stone-200 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-stone-850"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs">
                      {preset.badge || preset.name}
                    </span>
                    {isActive && (
                      <Check className="w-4 h-4 text-white shrink-0" />
                    )}
                  </div>
                  <div
                    className={`p-1.5 rounded-lg text-3xs font-mono font-bold tracking-wider text-center dir-rtl ${
                      isActive
                        ? "bg-emerald-700/80 text-white"
                        : "bg-emerald-100/60 dark:bg-stone-800 text-emerald-900 dark:text-emerald-300"
                    }`}
                  >
                    {formattedLayers}
                  </div>
                  <p
                    className={`text-3xs leading-relaxed ${isActive ? "text-emerald-100" : "text-stone-500 dark:text-stone-400"}`}
                  >
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- Direct Bulk Input Rectangles (مستطيلا الإدخال المباشر للسلاسل) --- */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-stone-50/80 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                الإدخال المباشر للسلاسل والأكواد (حروف السماء 14 + حروف الأرض
                28):
              </span>
            </div>
            <span className="text-3xs text-stone-500 dark:text-stone-400 font-mono">
              يمكنك لصق سلسلة الحروف مباشرة مع أو بدون فواصل وسيتم توزيعها
              تلقائياً على الطبقات السبع
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Box 1: Sky Bulk Input (14 letters) */}
            <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-sky-300 dark:border-sky-800/80 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                  <span>🌌 حروف السماء (14 حرفاً):</span>
                </span>
                {(() => {
                  const cnt = extractArabicChars(bulkSkyInput).length;
                  return (
                    <span
                      className={`text-3xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                        cnt === 14
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                          : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                      }`}
                    >
                      {cnt} / 14 حرفاً {cnt === 14 ? "✓" : ""}
                    </span>
                  );
                })()}
              </div>

              <textarea
                rows={2}
                value={bulkSkyInput}
                onChange={(e) => setBulkSkyInput(e.target.value)}
                placeholder="مثال: ص ر ق م س ن ع ح ي ل ه ا ك ط"
                className="w-full p-2.5 rounded-lg border border-sky-200 dark:border-sky-800/60 bg-sky-50/40 dark:bg-sky-950/20 text-xs font-mono font-bold text-sky-950 dark:text-sky-100 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none leading-relaxed tracking-wider dir-rtl"
              />

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setBulkSkyInput(skyString)}
                  className="px-2 py-1 rounded-lg text-3xs font-medium text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  title="استعادة السلسلة من الجدول الحالي"
                >
                  استعادة من الجدول
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyBulkStrings(bulkSkyInput, undefined)
                  }
                  className="px-3 py-1 rounded-lg text-3xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>تطبيق حروف السماء</span>
                </button>
              </div>
            </div>

            {/* Box 2: Earth Bulk Input (28 letters) */}
            <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-800/80 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <span>🌍 حروف الأرض (28 حرفاً):</span>
                </span>
                {(() => {
                  const cnt = extractArabicChars(bulkEarthInput).length;
                  return (
                    <span
                      className={`text-3xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                        cnt === 28
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                          : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                      }`}
                    >
                      {cnt} / 28 حرفاً {cnt === 28 ? "✓" : ""}
                    </span>
                  );
                })()}
              </div>

              <textarea
                rows={2}
                value={bulkEarthInput}
                onChange={(e) => setBulkEarthInput(e.target.value)}
                placeholder="مثال: ب س م ا ل ه ر ح ي ن د ع ك و ص ط ت غ ض ق ذ ف ز خ ش ظ ث ج"
                className="w-full p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs font-mono font-bold text-emerald-950 dark:text-emerald-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed tracking-wider dir-rtl"
              />

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setBulkEarthInput(earthString)}
                  className="px-2 py-1 rounded-lg text-3xs font-medium text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  title="استعادة السلسلة من الجدول الحالي"
                >
                  استعادة من الجدول
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyBulkStrings(undefined, bulkEarthInput)
                  }
                  className="px-3 py-1 rounded-lg text-3xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>تطبيق حروف الأرض</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* --- 7 Symmetric Layers Inspection & Real-time Live Editing Table --- */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
              معاينة وتعديل الطبقات السبع المتناظرة (حرفان للسماء و 4 حروف للأرض
              لكل طبقة):
            </span>
            <span className="text-3xs text-stone-500">
              يمكنك تعديل أي حرف فردي في الجدول مباشرةً
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xs">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-stone-100 dark:bg-stone-850 text-stone-700 dark:text-stone-300 text-xs font-semibold">
                  <th className="py-2.5 px-3 text-right">الطبقة ولونها</th>
                  <th className="py-2.5 px-3 text-sky-700 dark:text-sky-300">
                    حروف السماء (2)
                  </th>
                  <th className="py-2.5 px-2 text-stone-400">التقابل</th>
                  <th className="py-2.5 px-3 text-emerald-700 dark:text-emerald-300">
                    حروف الأرض المقابلة (4)
                  </th>
                  <th className="py-2.5 px-3 text-left">التوصيف والمدلول</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-xs">
                {localLayers.slice(0, 7).map((layer, idx) => {
                  const sky1 =
                    (layer.cipherLetters && layer.cipherLetters[0]) || "";
                  const sky2 =
                    (layer.cipherLetters && layer.cipherLetters[1]) || "";
                  const earth1 =
                    (layer.arabicLetters && layer.arabicLetters[0]) || "";
                  const earth2 =
                    (layer.arabicLetters && layer.arabicLetters[1]) || "";
                  const earth3 =
                    (layer.arabicLetters && layer.arabicLetters[2]) || "";
                  const earth4 =
                    (layer.arabicLetters && layer.arabicLetters[3]) || "";
                  const layerColor =
                    LAYER_RAINBOW_COLORS[
                      (idx + 1) as keyof typeof LAYER_RAINBOW_COLORS
                    ];
                  const bgAccent = layerColor?.accentHex || "#0284c7";

                  return (
                    <tr
                      key={`layer_row_${idx}`}
                      className="hover:bg-stone-50 dark:hover:bg-stone-850/50 transition-colors"
                    >
                      {/* Layer Number & Rainbow Color */}
                      <td className="py-2 px-3 text-right font-bold text-stone-900 dark:text-stone-100">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-white text-3xs font-mono font-bold shadow-2xs"
                            style={{ backgroundColor: bgAccent }}
                          >
                            {layer.layer || idx + 1}
                          </span>
                          <span className="text-3xs text-stone-500 dark:text-stone-400">
                            {layerColor.name}
                          </span>
                        </div>
                      </td>

                      {/* Sky Letters Inputs */}
                      <td className="py-2 px-3">
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="text"
                            maxLength={1}
                            value={sky1}
                            onChange={(e) =>
                              handleUpdateLayerChar(
                                idx,
                                "sky",
                                0,
                                e.target.value,
                              )
                            }
                            className="w-8 h-8 text-center text-sm font-bold font-mono rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                          />
                          <input
                            type="text"
                            maxLength={1}
                            value={sky2}
                            onChange={(e) =>
                              handleUpdateLayerChar(
                                idx,
                                "sky",
                                1,
                                e.target.value,
                              )
                            }
                            className="w-8 h-8 text-center text-sm font-bold font-mono rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                          />
                        </div>
                      </td>

                      {/* Arrow */}
                      <td className="py-2 px-2 text-stone-400">
                        <ArrowRightLeft className="w-3.5 h-3.5 mx-auto" />
                      </td>

                      {/* Earth Letters Inputs (4 slots) */}
                      <td className="py-2 px-3">
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="text"
                            maxLength={1}
                            value={earth1}
                            onChange={(e) =>
                              handleUpdateLayerChar(
                                idx,
                                "earth",
                                0,
                                e.target.value,
                              )
                            }
                            className="w-8 h-8 text-center text-sm font-bold font-mono rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                          />
                          <input
                            type="text"
                            maxLength={1}
                            value={earth2}
                            onChange={(e) =>
                              handleUpdateLayerChar(
                                idx,
                                "earth",
                                1,
                                e.target.value,
                              )
                            }
                            className="w-8 h-8 text-center text-sm font-bold font-mono rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                          />
                          <input
                            type="text"
                            maxLength={1}
                            value={earth3}
                            onChange={(e) =>
                              handleUpdateLayerChar(
                                idx,
                                "earth",
                                2,
                                e.target.value,
                              )
                            }
                            className="w-8 h-8 text-center text-sm font-bold font-mono rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                          />
                          <input
                            type="text"
                            maxLength={1}
                            value={earth4}
                            onChange={(e) =>
                              handleUpdateLayerChar(
                                idx,
                                "earth",
                                3,
                                e.target.value,
                              )
                            }
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

        {/* Table Selector bar (Mashriqi & Maghribi Only) */}
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
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedGematriaTableId === tbl.id
                    ? "bg-amber-600 text-white font-semibold shadow-2xs"
                    : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-750"
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
              تعديل قيم الحروف الـ 28 للجدول الحالي ({currentGematriaTable.name}
              ):
            </span>
            <span className="text-3xs text-stone-500">
              يمكنك كتابة القيمة العددية المخصصة لأي حرف وحفظها كجدول جديد
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-14 gap-1.5">
            {ARABIC_28_CANONICAL.map((item) => {
              const char = typeof item === "string" ? item : item.char;
              const val =
                gematriaEditingValues[char] ??
                currentGematriaTable.values[char] ??
                0;
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
                    onChange={(e) =>
                      handleGematriaValueChange(
                        char,
                        parseInt(e.target.value, 10),
                      )
                    }
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
              <label className="text-3xs text-stone-500 font-bold">
                الألف الخنجرية:
              </label>
              <select
                value={calculationOptions.daggerAlif}
                onChange={(e) =>
                  updateCalculationOptions({
                    daggerAlif: e.target.value as any,
                  })
                }
                className="w-full px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-xs font-medium"
              >
                <option value="ignore_0">إهمال = 0 (الافتراضي)</option>
                <option value="count_as_1">احتساب = 1 (مثل الرحمن)</option>
              </select>
            </div>

            {/* Ta Marbuta */}
            <div className="space-y-1">
              <label className="text-3xs text-stone-500 font-bold">
                التاء المربوطة (ة):
              </label>
              <select
                value={calculationOptions.taMarbuta}
                onChange={(e) =>
                  updateCalculationOptions({ taMarbuta: e.target.value as any })
                }
                className="w-full px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-xs font-medium"
              >
                <option value="ta_400">حسابها كتاء = 400 (الافتراضي)</option>
                <option value="ha_5">حسابها كهاء = 5</option>
              </select>
            </div>

            {/* Shaddah */}
            <div className="space-y-1">
              <label className="text-3xs text-stone-500 font-bold">
                الشدة (التضعيف):
              </label>
              <select
                value={calculationOptions.shaddahMode}
                onChange={(e) =>
                  updateCalculationOptions({
                    shaddahMode: e.target.value as any,
                  })
                }
                className="w-full px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-xs font-medium"
              >
                <option value="double_2x">
                  تضعيف الحرف = 2× القيمة (الافتراضي)
                </option>
                <option value="single_1x">حرف مفرد (الرسم المكتوب)</option>
              </select>
            </div>

            {/* Silent Waw */}
            <div className="space-y-1">
              <label className="text-3xs text-stone-500 font-bold">
                الواو الصامتة (أولو/أولئك):
              </label>
              <select
                value={calculationOptions.silentWawMode}
                onChange={(e) =>
                  updateCalculationOptions({
                    silentWawMode: e.target.value as any,
                  })
                }
                className="w-full px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-xs font-medium"
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
