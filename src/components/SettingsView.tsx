import React, { useState, useMemo } from 'react';
import { useCipherLayers } from '../context/CipherLayersContext';
import {
  getAllNooraniItems,
  getAllArabicItems,
  NooraniItem,
  ArabicItem,
} from '../utils/multiSystemSearch';
import {
  LAYER_RAINBOW_COLORS,
  getLayerColor,
} from '../cipherData';
import {
  Layers,
  Sparkles,
  CheckCircle2,
  Trash2,
  X,
  Search,
  BookmarkPlus,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

export function SettingsView() {
  const {
    layers,
    savedNooraniPresets,
    savedArabicPresets,
    savedTables,
    applyNooraniDistribution,
    applyArabicDistribution,
    saveCurrentNooraniPreset,
    saveCurrentArabicPreset,
    deleteSavedNooraniPreset,
    deleteSavedArabicPreset,
  } = useCipherLayers();

  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Search/filter states for Sky and Earth
  const [skyFilter, setSkyFilter] = useState('');
  const [earthFilter, setEarthFilter] = useState('');

  // Save Modal
  const [showSaveModal, setShowSaveModal] = useState<'sky' | 'earth' | null>(null);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');

  // All numbered Sky tables
  const allNoorani = useMemo(
    () => getAllNooraniItems(savedNooraniPresets, savedTables),
    [savedNooraniPresets, savedTables]
  );

  // All numbered Earth tables
  const allArabic = useMemo(
    () => getAllArabicItems(savedArabicPresets, savedTables),
    [savedArabicPresets, savedTables]
  );

  // Determine currently active Sky table
  const activeSkyItem = useMemo(() => {
    const currentCipherKeys = layers
      .map((l) => (l.cipherLetters || []).filter((c) => c && c.trim() !== '').join(''))
      .join('|');

    const match = allNoorani.find((item) => {
      const itemKeys = item.layers
        .map((l) => (l.cipherLetters || []).filter((c) => c && c.trim() !== '').join(''))
        .join('|');
      return itemKeys === currentCipherKeys;
    });

    return match || allNoorani[0];
  }, [layers, allNoorani]);

  // Determine currently active Earth table
  const activeEarthItem = useMemo(() => {
    const currentArabicKeys = layers
      .map((l) => (l.arabicLetters || []).filter((c) => c && c.trim() !== '').join(''))
      .join('|');

    const match = allArabic.find((item) => {
      const itemKeys = item.layers
        .map((l) => (l.letters || []).filter((c) => c && c.trim() !== '').join(''))
        .join('|');
      return itemKeys === currentArabicKeys;
    });

    return match || allArabic[0];
  }, [layers, allArabic]);

  // Filtered lists
  const filteredSky = useMemo(() => {
    if (!skyFilter.trim()) return allNoorani;
    const q = skyFilter.trim().toLowerCase();
    return allNoorani.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        String(item.index).includes(q)
    );
  }, [allNoorani, skyFilter]);

  const filteredEarth = useMemo(() => {
    if (!earthFilter.trim()) return allArabic;
    const q = earthFilter.trim().toLowerCase();
    return allArabic.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        String(item.index).includes(q)
    );
  }, [allArabic, earthFilter]);

  const handleSelectSky = (item: NooraniItem) => {
    applyNooraniDistribution(item.name || item.id);
    setNotification({
      type: 'success',
      message: `تم تطبيق منظومة السماء [سماء #${item.index}: ${item.name}] بنجاح ✓`,
    });
  };

  const handleSelectEarth = (item: ArabicItem) => {
    applyArabicDistribution(item.name || item.id);
    setNotification({
      type: 'success',
      message: `تم تطبيق منظومة الأرض [أرض #${item.index}: ${item.name}] بنجاح ✓`,
    });
  };

  const handleOpenSaveDialog = (type: 'sky' | 'earth') => {
    const sorted = [...layers].sort((a, b) => b.layer - a.layer);
    const topLayer = sorted[0];
    const bottomLayer = sorted[sorted.length - 1];

    let suggested = '';
    if (type === 'sky') {
      const topChars = (topLayer?.cipherLetters || []).filter((c) => c && c.trim() !== '');
      const bottomChars = (bottomLayer?.cipherLetters || []).filter((c) => c && c.trim() !== '');
      const first = topChars[0] || 'ن';
      const last = bottomChars[bottomChars.length - 1] || 'ر';
      suggested = `${first} - ${last}`;
    } else {
      const topChars = (topLayer?.arabicLetters || []).filter((c) => c && c.trim() !== '');
      const bottomChars = (bottomLayer?.arabicLetters || []).filter((c) => c && c.trim() !== '');
      const firstTwo = topChars.slice(0, 2).join('') || 'اب';
      const lastTwo = bottomChars.slice(-2).join('') || 'وي';
      suggested = `${firstTwo} - ${lastTwo}`;
    }

    setSaveName(suggested);
    setSaveDesc('');
    setShowSaveModal(type);
  };

  const handleSaveConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSaveModal) return;
    const finalName = saveName.trim();
    if (!finalName) return;

    if (showSaveModal === 'sky') {
      saveCurrentNooraniPreset(finalName, saveDesc.trim() || undefined);
      setNotification({
        type: 'success',
        message: `تم حفظ منظومة السماء [سماء: ${finalName}] في الخزانة برقم تسلسلي جديد.`,
      });
    } else {
      saveCurrentArabicPreset(finalName, saveDesc.trim() || undefined);
      setNotification({
        type: 'success',
        message: `تم حفظ منظومة الأرض [أرض: ${finalName}] في الخزانة برقم تسلسلي جديد.`,
      });
    }
    setShowSaveModal(null);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 max-w-7xl mx-auto" id="systems-depot-view">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 sm:p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs transition-colors ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
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

      {/* Top Header & Active Status Bar */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>خزانة المنظومات</span>
          </h2>
          <p className="text-2xs sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            المنظومات السماوية (مكعبات ملونة) ومنظومات الأرض (مكعبات رمادية) — اختر ما تشاء بنقرة واحدة
          </p>
        </div>

        {/* Current Active Pair Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-xs font-bold">
            <span className="text-sm">🌌</span>
            <span className="text-indigo-800 dark:text-indigo-200">
              سماء #{activeSkyItem?.index}: {activeSkyItem?.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
            <span className="text-sm">🌍</span>
            <span className="text-emerald-800 dark:text-emerald-200">
              أرض #{activeEarthItem?.index}: {activeEarthItem?.name}
            </span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Dual Depot: Right = Sky Cubes (Colored), Left = Earth Cubes (Gray) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        
        {/* ========================================================================= */}
        {/* COLUMN 1: SKY SYSTEMS (منظومات السماء - مكعبات ملونة بـ 7 طبقات) */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          {/* Column Header & Filter */}
          <div className="bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-850 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌌</span>
                <div>
                  <h3 className="text-sm font-black text-indigo-950 dark:text-indigo-100 flex items-center gap-1.5">
                    <span>منظومات السماء (الأحرف النورانية)</span>
                    <span className="text-3xs font-mono font-bold px-1.5 py-0.5 rounded-full bg-indigo-200/80 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200">
                      {allNoorani.length}
                    </span>
                  </h3>
                  <span className="text-3xs text-indigo-700/80 dark:text-indigo-300">
                    مستطيلات ملونة بـ 7 طبقات متناظرة
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenSaveDialog('sky')}
                className="px-2.5 py-1 rounded-lg text-2xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                title="حفظ التوزيع الحالي كمنظومة سماء جديدة"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>حفظ سماء</span>
              </button>
            </div>

            {/* Sky Search Input */}
            <div className="relative">
              <input
                type="text"
                value={skyFilter}
                onChange={(e) => setSkyFilter(e.target.value)}
                placeholder="بحث في منظومات السماء بالرقم أو الأحرف..."
                className="w-full text-xs py-1.5 px-2.5 ps-7 rounded-lg border border-indigo-200/80 dark:border-indigo-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-indigo-400 absolute start-2 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Sky Cards List */}
          <div className="space-y-3 max-h-[75vh] overflow-y-auto pe-1">
            {filteredSky.map((item) => {
              const isActive = activeSkyItem?.id === item.id;
              const isUserSaved = item.id.startsWith('saved_noorani_');
              // Sort layers 7 to 1
              const sortedLayers = [...item.layers].sort((a, b) => b.layer - a.layer);

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectSky(item)}
                  className={`group rounded-2xl border p-3 sm:p-3.5 transition-all cursor-pointer shadow-2xs ${
                    isActive
                      ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-400 ring-2 ring-amber-400/40 shadow-sm'
                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-xs'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-stone-100 dark:border-stone-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xs px-2 py-0.5 rounded-md bg-amber-500 text-white font-black shadow-2xs">
                        #{item.index}
                      </span>
                      <h4 className="text-xs sm:text-sm font-black text-stone-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        سماء {item.name}
                      </h4>
                      {isUserSaved && (
                        <span className="text-3xs px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 font-bold">
                          مخصص
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isActive ? (
                        <span className="text-3xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>النشطة حالياً</span>
                        </span>
                      ) : (
                        <span className="text-3xs text-stone-400 group-hover:text-amber-600 font-bold transition-colors">
                          انقر للتفعيل
                        </span>
                      )}

                      {isUserSaved && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`هل تريد حذف منظومة السماء المخصصة "${item.name}"؟`)) {
                              deleteSavedNooraniPreset(item.id.replace('saved_noorani_', ''));
                            }
                          }}
                          className="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 7 Horizontal Colored Layer Stripes (المستطيلات الملونة) */}
                  <div className="space-y-1">
                    {sortedLayers.map((layerItem) => {
                      const color = LAYER_RAINBOW_COLORS[layerItem.layer] || getLayerColor(layerItem.layer);
                      const ciphers = (layerItem.cipherLetters || []).filter(Boolean);

                      return (
                        <div
                          key={layerItem.layer}
                          className="flex items-center gap-1.5 p-1 px-1.5 rounded-lg border text-2xs transition-transform hover:translate-x-0.5"
                          style={{
                            backgroundColor: color.accentHex ? `${color.accentHex}15` : undefined,
                            borderColor: color.accentHex ? `${color.accentHex}40` : undefined,
                          }}
                        >
                          {/* Layer Badge Cube */}
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center font-mono font-black text-3xs text-white shrink-0 shadow-2xs"
                            style={{ backgroundColor: color.accentHex || '#d97706' }}
                          >
                            {layerItem.layer}
                          </div>

                          {/* Cipher Letters */}
                          <div className="flex items-center gap-1 flex-wrap min-w-0 flex-1">
                            {ciphers.length === 0 ? (
                              <span className="text-3xs text-stone-400 italic">فارغة</span>
                            ) : (
                              ciphers.map((char, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="w-5 h-5 rounded flex items-center justify-center font-black text-2xs bg-white/80 dark:bg-stone-850 border border-stone-200/80 dark:border-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs"
                                >
                                  {char}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: EARTH SYSTEMS (منظومات الأرض - مكعبات رمادية بـ 4 أحرف لكل صف) */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          {/* Column Header & Filter */}
          <div className="bg-stone-100/90 dark:bg-stone-850 rounded-xl border border-stone-300 dark:border-stone-750 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌍</span>
                <div>
                  <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <span>منظومات الأرض (الأبجدية العربية)</span>
                    <span className="text-3xs font-mono font-bold px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200">
                      {allArabic.length}
                    </span>
                  </h3>
                  <span className="text-3xs text-stone-500 dark:text-stone-400">
                    مكعبات رمادية بـ 4 أحرف في كل صف (28 حرفاً)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenSaveDialog('earth')}
                className="px-2.5 py-1 rounded-lg text-2xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                title="حفظ التوزيع الحالي كمنظومة أرض جديدة"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>حفظ أرض</span>
              </button>
            </div>

            {/* Earth Search Input */}
            <div className="relative">
              <input
                type="text"
                value={earthFilter}
                onChange={(e) => setEarthFilter(e.target.value)}
                placeholder="بحث في منظومات الأرض بالرقم أو الأحرف..."
                className="w-full text-xs py-1.5 px-2.5 ps-7 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute start-2 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Earth Cards List */}
          <div className="space-y-3 max-h-[75vh] overflow-y-auto pe-1">
            {filteredEarth.map((item) => {
              const isActive = activeEarthItem?.id === item.id;
              const isUserSaved = item.id.startsWith('saved_arabic_');
              // Sort layers 7 to 1
              const sortedLayers = [...item.layers].sort((a, b) => b.layer - a.layer);

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectEarth(item)}
                  className={`group rounded-2xl border p-3 sm:p-3.5 transition-all cursor-pointer shadow-2xs ${
                    isActive
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/40 shadow-sm'
                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-xs'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-stone-100 dark:border-stone-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xs px-2 py-0.5 rounded-md bg-stone-700 dark:bg-stone-600 text-white font-black shadow-2xs">
                        #{item.index}
                      </span>
                      <h4 className="text-xs sm:text-sm font-black text-stone-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        أرض {item.name}
                      </h4>
                      {isUserSaved && (
                        <span className="text-3xs px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 font-bold">
                          مخصص
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isActive ? (
                        <span className="text-3xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>النشطة حالياً</span>
                        </span>
                      ) : (
                        <span className="text-3xs text-stone-400 group-hover:text-emerald-600 font-bold transition-colors">
                          انقر للتفعيل
                        </span>
                      )}

                      {isUserSaved && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`هل تريد حذف منظومة الأرض المخصصة "${item.name}"؟`)) {
                              deleteSavedArabicPreset(item.id.replace('saved_arabic_', ''));
                            }
                          }}
                          className="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 7 Rows of 4 Letters Each = 28 Arabic Letters in subtle gray cubes */}
                  <div className="space-y-1">
                    {sortedLayers.map((layerItem) => {
                      const letters = (layerItem.letters || []).filter(Boolean);

                      return (
                        <div
                          key={layerItem.layer}
                          className="flex items-center justify-between gap-1 p-1 px-1.5 rounded-lg bg-stone-50/70 dark:bg-stone-950/50 border border-stone-200/70 dark:border-stone-800 text-2xs"
                        >
                          {/* Row Index Badge */}
                          <span className="font-mono text-3xs font-bold text-stone-400 w-4 text-center">
                            ط{layerItem.layer}
                          </span>

                          {/* 4 Gray Cubes for Arabic Letters */}
                          <div className="grid grid-cols-4 gap-1 flex-1 max-w-[200px] sm:max-w-[220px]">
                            {[0, 1, 2, 3].map((slotIdx) => {
                              const char = letters[slotIdx];
                              return (
                                <div
                                  key={slotIdx}
                                  className={`h-6 rounded-md flex items-center justify-center font-bold text-xs border transition-all ${
                                    char
                                      ? 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-700 shadow-2xs font-["Amiri",serif]'
                                      : 'bg-transparent border-dashed border-stone-200 dark:border-stone-800 text-stone-300'
                                  }`}
                                >
                                  {char || '·'}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-md w-full p-5 space-y-4" dir="rtl">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-amber-500" />
                <span>
                  {showSaveModal === 'sky'
                    ? 'حفظ منظومة سماء جديدة في الخزانة'
                    : 'حفظ منظومة أرض جديدة في الخزانة'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSaveModal(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfirm} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  اسم المنظومة:
                </label>
                <input
                  type="text"
                  required
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="مثال: ن - ر أو اب - وي"
                  className="w-full text-sm font-bold p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  ملاحظات أو وصف (اختياري):
                </label>
                <input
                  type="text"
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  placeholder="أضف وصفاً توضيحياً..."
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-sm cursor-pointer"
                >
                  حفظ في الخزانة
                </button>
                <button
                  type="button"
                  onClick={() => setShowSaveModal(null)}
                  className="py-2 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
