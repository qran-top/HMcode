import React, { useRef, useState } from 'react';
import { useCipherLayers } from '../context/CipherLayersContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Download, Upload, Trash2, Database, Key, BookOpen, Settings } from 'lucide-react';

export function SettingsView() {
  const { isDark, toggleTheme } = useTheme();
  const {
    savedTables,
    deleteSavedTable,
    exportSingleSavedTableAsFile,
    exportAllSavedTablesAsFile,
    importTablesFromJson,
    savedArabicPresets,
    deleteSavedArabicPreset,
    savedNooraniPresets,
    deleteSavedNooraniPreset,
  } = useCipherLayers();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const result = importTablesFromJson(content);
        if (result.success) {
          setNotification({ type: 'success', message: result.message });
        } else {
          setNotification({ type: 'error', message: result.message || 'فشل الاستيراد' });
        }
      } catch (err) {
        setNotification({ type: 'error', message: 'حدث خطأ أثناء قراءة الملف.' });
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-stone-500" />
          الإعدادات وإدارة البيانات
        </h2>

        {notification && (
          <div
            className={`p-3 rounded-lg mb-4 text-sm font-bold flex items-center justify-between transition-colors \${
              notification.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : notification.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}
          >
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100 text-lg">&times;</button>
          </div>
        )}

        <div className="space-y-8">
          {/* Theme Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300 border-b border-stone-100 dark:border-stone-800 pb-2">
              المظهر
            </h3>
            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800">
              <span className="text-sm font-bold text-stone-700 dark:text-stone-300">وضع الألوان (ثيم)</span>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors font-bold text-sm"
              >
                {isDark ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-500" />
                    الوضع الفاتح
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-500" />
                    الوضع الداكن
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Data Export / Import */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300 border-b border-stone-100 dark:border-stone-800 pb-2">
              النسخ الاحتياطي واستيراد البيانات
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportAllSavedTablesAsFile}
                className="px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 shadow-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>تصدير نسخة احتياطية (للقوالب المحفوظة)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 shadow-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>استيراد ملف JSON</span>
              </button>
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Manage Saved Tables */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300 border-b border-stone-100 dark:border-stone-800 pb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-stone-500" />
              إدارة القوالب (الخرائط) المحفوظة
            </h3>
            
            {savedTables.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400 py-4 text-center bg-stone-50 dark:bg-stone-950 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
                لا توجد قوالب أو خرائط محفوظة حالياً.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedTables.map((tbl) => (
                  <div key={tbl.id} className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200 truncate" title={tbl.name}>{tbl.name}</h4>
                      {tbl.description && <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2" title={tbl.description}>{tbl.description}</p>}
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-stone-100 dark:border-stone-700">
                      <button
                        onClick={() => exportSingleSavedTableAsFile(tbl.id)}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-colors"
                        title="تصدير"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteSavedTable(tbl.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manage Saved Arabic / Noorani Layers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 border-b border-stone-100 dark:border-stone-800 pb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                إدارة توزيعات الأحرف العربية المخصصة
              </h3>
              
              {savedArabicPresets.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400 py-4 text-center bg-stone-50 dark:bg-stone-950 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
                  لا توجد توزيعات أحرف عربية محفوظة.
                </p>
              ) : (
                <div className="space-y-2">
                  {savedArabicPresets.map((preset) => (
                    <div key={preset.id} className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                      <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200 truncate">{preset.name}</h4>
                      <button
                        onClick={() => deleteSavedArabicPreset(preset.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 border-b border-stone-100 dark:border-stone-800 pb-2 flex items-center gap-2">
                <Key className="w-4 h-4" />
                إدارة توزيعات أحرف التشفير المخصصة
              </h3>
              
              {savedNooraniPresets.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400 py-4 text-center bg-stone-50 dark:bg-stone-950 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
                  لا توجد توزيعات أحرف تشفير محفوظة.
                </p>
              ) : (
                <div className="space-y-2">
                  {savedNooraniPresets.map((preset) => (
                    <div key={preset.id} className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                      <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200 truncate">{preset.name}</h4>
                      <button
                        onClick={() => deleteSavedNooraniPreset(preset.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
