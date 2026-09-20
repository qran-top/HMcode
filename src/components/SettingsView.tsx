import React, { useRef, useState, useMemo } from 'react';
import { useCipherLayers } from '../context/CipherLayersContext';
import { useTheme } from '../context/ThemeContext';
import {
  getAllNooraniItems,
  getAllArabicItems,
  NooraniItem,
  ArabicItem,
} from '../utils/multiSystemSearch';
import {
  Sun,
  Moon,
  Download,
  Upload,
  Trash2,
  Database,
  Edit3,
  X,
  Check,
  Sparkles,
  CheckCircle2,
  Bookmark,
  Layers,
  Save,
  BookmarkPlus,
  ArrowRight,
} from 'lucide-react';

export function SettingsView() {
  const { isDark, toggleTheme } = useTheme();
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
    exportCurrentTableAsFile,
    importTablesFromJson,
  } = useCipherLayers();

  // Tab: Sky vs Earth Library
  const [activeTab, setActiveTab] = useState<'sky' | 'earth'>('sky');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Quick Save Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');

  // Dropzone drag state
  const [isDragging, setIsDragging] = useState(false);

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

  // Determine currently applied Sky table
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

  // Determine currently applied Earth table
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

  // Suggested naming according to user rule:
  // Sky: First char + " - " + last char
  // Earth: First 2 chars + " - " + last 2 chars
  const suggestedName = useMemo(() => {
    const sorted = [...layers].sort((a, b) => b.layer - a.layer);
    const topLayer = sorted[0];
    const bottomLayer = sorted[sorted.length - 1];

    if (activeTab === 'sky') {
      const topChars = (topLayer?.cipherLetters || []).filter((c) => c && c.trim() !== '');
      const bottomChars = (bottomLayer?.cipherLetters || []).filter((c) => c && c.trim() !== '');
      const first = topChars[0] || 'ن';
      const last = bottomChars[bottomChars.length - 1] || 'ر';
      return `${first} - ${last}`;
    } else {
      const topChars = (topLayer?.arabicLetters || []).filter((c) => c && c.trim() !== '');
      const bottomChars = (bottomLayer?.arabicLetters || []).filter((c) => c && c.trim() !== '');
      const firstTwo = topChars.slice(0, 2).join('') || 'اب';
      const lastTwo = bottomChars.slice(-2).join('') || 'وي';
      return `${firstTwo} - ${lastTwo}`;
    }
  }, [layers, activeTab]);

  const handleOpenSaveDialog = () => {
    setSaveName(suggestedName);
    setSaveDesc('');
    setShowSaveModal(true);
  };

  const handleSaveConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = saveName.trim() || suggestedName;
    if (activeTab === 'sky') {
      saveCurrentNooraniPreset(finalName, saveDesc.trim() || undefined);
      setNotification({
        type: 'success',
        message: `تم حفظ جدول السماء [سماء: ${finalName}] برقم تسلسل جديد بنجاح.`,
      });
    } else {
      saveCurrentArabicPreset(finalName, saveDesc.trim() || undefined);
      setNotification({
        type: 'success',
        message: `تم حفظ جدول الأرض [أرض: ${finalName}] برقم تسلسل جديد بنجاح.`,
      });
    }
    setShowSaveModal(false);
  };

  const processFileContent = (content: string) => {
    try {
      const result = importTablesFromJson(content);
      if (result.success) {
        setNotification({ type: 'success', message: result.message });
      } else {
        setNotification({
          type: 'error',
          message: result.message || 'فشل الاستيراد، يرجى التأكد من صحة الملف.',
        });
      }
    } catch {
      setNotification({ type: 'error', message: 'حدث خطأ أثناء قراءة ملف JSON.' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processFileContent(content);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processFileContent(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 max-w-5xl mx-auto" id="library-view">
      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-sm font-bold flex items-center justify-between shadow-xs transition-colors ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 rounded-md opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Primary Dual Tab Switcher: Sky Tables vs Earth Tables */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-stone-100 dark:bg-stone-850 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('sky')}
          className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'sky'
              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md ring-2 ring-amber-400/30'
              : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-white/40'
          }`}
        >
          <span className="text-base">🌌</span>
          <span>مكتبة جداول السماء ({allNoorani.length})</span>
          <span className="text-3xs px-2 py-0.5 rounded-full font-mono font-bold bg-amber-700/80 text-amber-100">
            النشط #{activeSkyItem?.index}: {activeSkyItem?.name}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('earth')}
          className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'earth'
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500/30'
              : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-white/40'
          }`}
        >
          <span className="text-base">🌍</span>
          <span>مكتبة جداول الأرض ({allArabic.length})</span>
          <span className="text-3xs px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-800 text-emerald-100">
            النشط #{activeEarthItem?.index}: {activeEarthItem?.name}
          </span>
        </button>
      </div>

      {/* 2. Top Action Bar: Save New Table & Export */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
            <span>{activeTab === 'sky' ? '🌌 جداول السماء المعتمدة والمرقمة' : '🌍 جداول الأرض المعتمدة والمرقمة'}</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {activeTab === 'sky'
              ? 'لكل جدول رقم تسلسلي ثابت لسهولة التنسيق الشفهي وتطبيقه في محرك البحث بنقرة واحدة.'
              : 'لكل جدول رقم تسلسلي ثابت لسهولة التنسيق الشفهي وتطبيقه في محرك البحث بنقرة واحدة.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenSaveDialog}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'sky' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>{activeTab === 'sky' ? 'حفظ جدول سماء جديد' : 'حفظ جدول أرض جديد'}</span>
          </button>

          <button
            type="button"
            onClick={() => exportCurrentTableAsFile()}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تصدير JSON</span>
          </button>
        </div>
      </div>

      {/* 3. The List of Tables */}
      <div className="space-y-3">
        {activeTab === 'sky' ? (
          /* SKY TABLES LIST */
          allNoorani.map((item) => {
            const isActive = activeSkyItem?.id === item.id;
            const isUserSaved = item.id.startsWith('saved_noorani_');

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-400 ring-2 ring-amber-400/30 shadow-xs'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-amber-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-amber-500 text-white font-extrabold shadow-2xs">
                        #{item.index}
                      </span>
                      <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-white">
                        سماء {item.name}
                      </h3>
                      {isActive && (
                        <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          الجدول النشط حالياً ✓
                        </span>
                      )}
                      {isUserSaved && (
                        <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                          مخصص
                        </span>
                      )}
                    </div>

                    {/* 7 Layers Preview */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {[...item.layers]
                        .sort((a, b) => b.layer - a.layer)
                        .map((l) => (
                          <span
                            key={l.layer}
                            className="px-2 py-0.5 rounded-md bg-amber-100/60 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/80 text-amber-950 dark:text-amber-200 text-2xs font-mono font-bold"
                          >
                            ط{l.layer}: {l.cipherLetters.join(' ')}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        applyNooraniDistribution(item.id.replace('saved_noorani_', ''));
                        setNotification({
                          type: 'success',
                          message: `تم تفعيل جدول السماء [سماء #${item.index}: ${item.name}] بنجاح.`,
                        });
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                      }`}
                    >
                      {isActive ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>{isActive ? 'مُفعّل' : 'تفعيل'}</span>
                    </button>

                    {isUserSaved && (
                      <button
                        type="button"
                        onClick={() => {
                          deleteSavedNooraniPreset(item.id.replace('saved_noorani_', ''));
                          setNotification({
                            type: 'info',
                            message: `تم حذف جدول السماء [${item.name}].`,
                          });
                        }}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-stone-200 dark:border-stone-700 cursor-pointer"
                        title="حذف هذا الجدول المخصص"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          /* EARTH TABLES LIST */
          allArabic.map((item) => {
            const isActive = activeEarthItem?.id === item.id;
            const isUserSaved = item.id.startsWith('saved_arabic_');

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-400/30 shadow-xs'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-emerald-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white font-extrabold shadow-2xs">
                        #{item.index}
                      </span>
                      <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-white">
                        أرض {item.name}
                      </h3>
                      {isActive && (
                        <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          الجدول النشط حالياً ✓
                        </span>
                      )}
                      {isUserSaved && (
                        <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                          مخصص
                        </span>
                      )}
                    </div>

                    {/* 7 Layers Preview */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {[...item.layers]
                        .sort((a, b) => b.layer - a.layer)
                        .map((l) => (
                          <span
                            key={l.layer}
                            className="px-2 py-0.5 rounded-md bg-emerald-100/60 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-200 text-2xs font-mono font-bold"
                          >
                            ط{l.layer}: {l.letters.join(' ')}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        applyArabicDistribution(item.id.replace('saved_arabic_', ''));
                        setNotification({
                          type: 'success',
                          message: `تم تفعيل جدول الأرض [أرض #${item.index}: ${item.name}] بنجاح.`,
                        });
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                    >
                      {isActive ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>{isActive ? 'مُفعّل' : 'تفعيل'}</span>
                    </button>

                    {isUserSaved && (
                      <button
                        type="button"
                        onClick={() => {
                          deleteSavedArabicPreset(item.id.replace('saved_arabic_', ''));
                          setNotification({
                            type: 'info',
                            message: `تم حذف جدول الأرض [${item.name}].`,
                          });
                        }}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-stone-200 dark:border-stone-700 cursor-pointer"
                        title="حذف هذا الجدول المخصص"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Drag & Drop Import Section */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-xs space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
          <Upload className="w-4 h-4 text-indigo-500" />
          <span>استيراد وتصدير الجداول (ملفات JSON)</span>
        </h3>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
              : 'border-stone-200 dark:border-stone-700 hover:border-indigo-400 bg-stone-50/50 dark:bg-stone-950/50'
          }`}
        >
          <Upload className="w-7 h-7 text-indigo-500 mb-2 opacity-80" />
          <p className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200">
            انقر لاختيار ملف منظومة أو أسقطه هنا (.json)
          </p>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* 5. Theme Settings */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              مظهر الواجهة (داكن / فاتح)
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              الوضع النشط حالياً: {isDark ? 'الوضع الليلي (الداكن)' : 'الوضع النهاري (الفاتح)'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
        >
          تبديل المظهر
        </button>
      </div>

      {/* Quick Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-white flex items-center gap-2">
                <BookmarkPlus className="w-4 h-4 text-amber-500" />
                <span>{activeTab === 'sky' ? 'حفظ جدول سماء جديد' : 'حفظ جدول أرض جديد'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfirm} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {activeTab === 'sky'
                    ? 'اسم جدول السماء (المقترح: أول حرف وآخر حرف):'
                    : 'اسم جدول الأرض (المقترح: أول حرفين وآخر حرفين):'}
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={suggestedName}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
                <p className="text-3xs text-stone-400 mt-1">
                  سيحصل الجدول على رقم تسلسلي فريد تلقائياً (مثلاً #{activeTab === 'sky' ? allNoorani.length + 1 : allArabic.length + 1}) لسهولة الإشارة إليه.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  وصف أو ملاحظة (اختياري):
                </label>
                <input
                  type="text"
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  placeholder="ملاحظات حول الجدول..."
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
                    activeTab === 'sky'
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
