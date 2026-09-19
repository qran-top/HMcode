import React, { useRef, useState } from 'react';
import { useCipherLayers } from '../context/CipherLayersContext';
import { useTheme } from '../context/ThemeContext';
import { PRESET_TABLES } from '../cipherData';
import { 
  Sun, Moon, Download, Upload, Trash2, Database, Settings, 
  Edit3, X, Check, Sparkles, CheckCircle2, Bookmark, Smartphone, 
  HelpCircle, Layers
} from 'lucide-react';

export function SettingsView() {
  const { isDark, toggleTheme } = useTheme();
  const {
    savedTables,
    activeTableName,
    layers,
    deleteSavedTable,
    loadSavedTable,
    saveCurrentTable,
    updateSavedTableName,
    exportCurrentTableAsFile,
    exportSingleSavedTableAsFile,
    exportAllSavedTablesAsFile,
    importTablesFromJson,
    applyPreset,
  } = useCipherLayers();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newProfileName, setNewProfileName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const saveEdit = () => {
    if (!editValue.trim() || !editingId) return;
    updateSavedTableName(editingId, editValue);
    setEditingId(null);
    setEditValue('');
    setNotification({ type: 'success', message: 'تم تحديث اسم المنظومة بنجاح.' });
  };

  const handleSaveCurrentAsProfile = () => {
    if (!newProfileName.trim()) return;
    saveCurrentTable(newProfileName.trim(), 'منظومة مخصصة محفوظة من الإعدادات');
    setNewProfileName('');
    setShowSaveModal(false);
    setNotification({ type: 'success', message: 'تم حفظ المنظومة الحالية في مكتبتك بنجاح.' });
  };

  const processFileContent = (content: string) => {
    try {
      const result = importTablesFromJson(content);
      if (result.success) {
        setNotification({ type: 'success', message: result.message });
      } else {
        setNotification({ type: 'error', message: result.message || 'فشل الاستيراد، يرجى التأكد من صحة الملف.' });
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
    if (!file.name.endsWith('.json')) {
      setNotification({ type: 'error', message: 'يرجى إسقاط ملف بصيغة JSON فقط.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processFileContent(content);
    };
    reader.readAsText(file);
  };

  // Compute stats of active profile
  const totalArabicConfigured = layers.reduce((acc, l) => acc + (l.arabicLetters || []).filter(Boolean).length, 0);
  const totalCipherConfigured = layers.reduce((acc, l) => acc + (l.cipherLetters || []).filter(Boolean).length, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-sm font-bold flex items-center justify-between shadow-xs transition-colors ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
              : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Active Profile Card */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-5">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                  المنظومة النشطة حالياً
                </span>
                <span className="text-xs text-stone-400 dark:text-stone-500">
                  7 طبقات متزامنة
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 mt-1">
                {activeTableName || 'المنظومة المعيارية القياسية'}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                تتضمن {totalArabicConfigured} حرفاً عربياً و {totalCipherConfigured} موضعاً للشيفرة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => exportCurrentTableAsFile()}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs inline-flex items-center gap-2 transition-all cursor-pointer"
              title="تصدير المنظومة المطبقة حالياً في ملف JSON"
            >
              <Download className="w-4 h-4" />
              <span>تصدير المنظومة النشطة</span>
            </button>

            <button
              onClick={() => setShowSaveModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Bookmark className="w-4 h-4 text-stone-500" />
              <span>حفظ نسخة في المكتبة</span>
            </button>
          </div>
        </div>

        {/* Modal / In-place Save Prompt */}
        {showSaveModal && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="اكتب اسماً مخصصاً لحفظ المنظومة..."
              className="flex-1 px-3 py-2 text-sm font-bold rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
            <button
              onClick={handleSaveCurrentAsProfile}
              disabled={!newProfileName.trim()}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg cursor-pointer transition-colors"
            >
              تأكيد الحفظ
            </button>
            <button
              onClick={() => setShowSaveModal(false)}
              className="px-3 py-2 text-xs sm:text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        )}
      </div>

      {/* 2. Import & Backup Section (Drag & Drop Zone) */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-500" />
          استيراد وتصدير المنظومات (JSON)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* Dropzone for Import */}
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
                : 'border-stone-200 dark:border-stone-700 hover:border-indigo-400 bg-stone-50/50 dark:bg-stone-950/50 hover:bg-stone-50 dark:hover:bg-stone-950'
            }`}
          >
            <Upload className="w-8 h-8 text-indigo-500 mb-2 opacity-80" />
            <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
              انقر لاختيار ملف منظومة أو أسقطه هنا
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
              يدعم ملفات المنظومات الفردية، الخرائط الكاملة، أو النسخ الاحتياطية (.json)
            </p>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Full Backup Export & Info */}
          <div className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">
                نسخة احتياطية شاملة
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                يمكنك تحميل ملف واحد يحتوي على جميع المنظومات والقوالب المحفوظة في مكتبتك لنقلها إلى جهاز آخر أو استعادتها لاحقاً.
              </p>
            </div>
            <button
              onClick={exportAllSavedTablesAsFile}
              className="mt-4 w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 shadow-2xs inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 text-indigo-500" />
              <span>تحميل نسخة احتياطية لكافة القوالب ({savedTables.length} منظومة)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Saved Custom Profiles Library */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-500" />
            مكتبة المنظومات المحفوظة ({savedTables.length})
          </h3>
        </div>

        {savedTables.length === 0 ? (
          <div className="text-center py-8 bg-stone-50 dark:bg-stone-950/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 p-4">
            <Bookmark className="w-8 h-8 text-stone-400 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-stone-700 dark:text-stone-300">لا توجد منظومات محفوظة بعد</p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
              عند تخصيص جدول الطبقات، يمكنك حفظه كمنظومة في هذه المكتبة لسهولة استدعائه في أي وقت.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {savedTables.map((tbl) => {
              const isActive = activeTableName === tbl.name;
              return (
                <div
                  key={tbl.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isActive
                      ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/80 shadow-xs'
                      : 'bg-white dark:bg-stone-800/80 border-stone-200 dark:border-stone-700/70 hover:border-stone-300 dark:hover:border-stone-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      {isActive && (
                        <span className="text-2xs font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                          النشطة حالياً
                        </span>
                      )}
                      <span className="text-2xs text-stone-400 ms-auto">
                        {new Date(tbl.createdAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>

                    {editingId === tbl.id ? (
                      <div className="flex items-center gap-1 mt-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 text-xs px-2 py-1 rounded border border-indigo-400 bg-white dark:bg-stone-900 font-bold"
                          autoFocus
                        />
                        <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-stone-400 hover:bg-stone-100 rounded">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 mt-2 truncate" title={tbl.name}>
                        {tbl.name}
                      </h4>
                    )}

                    {tbl.description && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2" title={tbl.description}>
                        {tbl.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-1 mt-4 pt-3 border-t border-stone-100 dark:border-stone-700/50">
                    <button
                      onClick={() => {
                        loadSavedTable(tbl.id);
                        setNotification({ type: 'success', message: `تم تفعيل المنظومة [${tbl.name}] بنجاح.` });
                      }}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-extrabold'
                          : 'bg-stone-100 dark:bg-stone-700 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 text-stone-700 dark:text-stone-200'
                      }`}
                    >
                      {isActive ? 'مفعلة الآن' : 'تفعيل'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(tbl.id, tbl.name)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                        title="تعديل الاسم"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => exportSingleSavedTableAsFile(tbl.id)}
                        className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                        title="تصدير JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف [${tbl.name}]؟`)) {
                            deleteSavedTable(tbl.id);
                            setNotification({ type: 'info', message: `تم حذف المنظومة [${tbl.name}].` });
                          }
                        }}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Built-in Standard Profiles */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-500" />
          المنظومات المعيارية المدمجة
        </h3>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          منظومات جاهزة مبنية على فواتح السور والترتيب الأبجدي الشرقي والغربي يمكنك تفعيلها بنقرة واحدة:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(PRESET_TABLES).map(([key, preset]) => {
            const isCurrent = activeTableName === preset.name;
            return (
              <div
                key={key}
                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/80 shadow-2xs'
                    : 'bg-stone-50/40 dark:bg-stone-950/40 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-stone-800 dark:text-stone-200">
                    {preset.name}
                  </h4>
                  <p className="text-2xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2" title={preset.description}>
                    {preset.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 flex items-center justify-between border-t border-stone-200/60 dark:border-stone-800">
                  {isCurrent ? (
                    <span className="text-2xs font-extrabold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      المنظومة المطبقة حالياً
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        applyPreset(key as any);
                        setNotification({ type: 'success', message: `تم تطبيق [${preset.name}] بنجاح.` });
                      }}
                      className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors cursor-pointer"
                    >
                      تطبيق وتفعيل
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Theme & App Preferences */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-stone-500" />
          تفضيلات المظهر والنظام
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">وضع الألوان (الثيم)</h4>
              <p className="text-xs text-stone-400 mt-0.5">التبديل بين الوضع الليلي والنهاري</p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-2xs hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors font-bold text-xs cursor-pointer"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>الوضع النهاري</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span>الوضع الليلي</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">العمل بدون إنترنت</h4>
              <p className="text-xs text-stone-400 mt-0.5">التطبيق يعمل كلياً أوفلاين مع المعاجم</p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              جاهز 100%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
