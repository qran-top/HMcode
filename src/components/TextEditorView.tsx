import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Download,
  Upload,
  Copy,
  Check,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';
import { useCipherLayers } from '../context/CipherLayersContext';
import { parseLayersFromText, serializeLayersToText } from '../context/CipherLayersContext';
import { ALL_ARABIC_LETTERS_28, BENCHMARK_TABLE_NAME } from '../cipherData';

interface TextEditorViewProps {
  onBackToGrid: () => void;
  onNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function TextEditorView({ onBackToGrid, onNotification }: TextEditorViewProps) {
  const {
    layers,
    activeTableName,
    applyTableFromText,
    exportCurrentTableAsTextFile,
    exportCurrentTableAsFile,
    importTablesFromJson,
    resetToDefault,
  } = useCipherLayers();

  const [textContent, setTextContent] = useState<string>(() =>
    serializeLayersToText(activeTableName || BENCHMARK_TABLE_NAME, layers)
  );
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep text synced when layers change externally, unless user is typing
  const lastSyncedTableName = useRef(activeTableName);
  useEffect(() => {
    if (activeTableName !== lastSyncedTableName.current) {
      lastSyncedTableName.current = activeTableName;
      setTextContent(serializeLayersToText(activeTableName || BENCHMARK_TABLE_NAME, layers));
    }
  }, [activeTableName, layers]);

  // Real-time parsing and validation of the text content
  const validation = useMemo(() => {
    const parsed = parseLayersFromText(textContent);
    if (!parsed || parsed.layers.length === 0) {
      return {
        isValid: false,
        layerCount: 0,
        arabicCount: 0,
        uniqueArabicLetters: new Set<string>(),
        missingArabicLetters: ALL_ARABIC_LETTERS_28,
        duplicateArabicLetters: [] as string[],
        message: 'لم يتم التعرف على بنية الطبقات. تأكد من وجود أرقام الطبقات والشيفرة والأحرف.',
      };
    }

    const uniqueArabic = new Set<string>();
    const arabicFreq: Record<string, number> = {};
    let totalArabicLetters = 0;

    parsed.layers.forEach((l) => {
      (l.arabicLetters || []).forEach((c) => {
        const ch = (c || '').trim();
        if (ch) {
          totalArabicLetters++;
          uniqueArabic.add(ch);
          arabicFreq[ch] = (arabicFreq[ch] || 0) + 1;
        }
      });
    });

    const duplicates = Object.entries(arabicFreq)
      .filter(([_, count]) => count > 1)
      .map(([char]) => char);

    const missing = ALL_ARABIC_LETTERS_28.filter((char) => !uniqueArabic.has(char));

    return {
      isValid: true,
      tableName: parsed.name,
      layerCount: parsed.layers.length,
      arabicCount: totalArabicLetters,
      uniqueArabicLetters: uniqueArabic,
      missingArabicLetters: missing,
      duplicateArabicLetters: duplicates,
      message: `تم التعرف على ${parsed.layers.length} طبقات و ${totalArabicLetters} حرف عربي.`,
    };
  }, [textContent]);

  const handleApply = () => {
    const result = applyTableFromText(textContent);
    if (result.success) {
      onNotification?.('success', result.message);
    } else {
      onNotification?.('error', result.message);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      onNotification?.('success', 'تم نسخ محتوى المنظومة النصي إلى الحافظة بنجاح.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onNotification?.('error', 'تعذر النسخ إلى الحافظة.');
    }
  };

  const handleReset = () => {
    resetToDefault();
    const defaultText = serializeLayersToText(BENCHMARK_TABLE_NAME, layers);
    setTextContent(defaultText);
    onNotification?.('info', 'تم استعادة المنظومة القياسية رقم 4.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setTextContent(content);
        const result = importTablesFromJson(content);
        if (result.success) {
          onNotification?.('success', result.message);
        } else {
          onNotification?.('error', result.message);
        }
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-200" id="text-editor-page">
      {/* Hidden file input for uploading .txt or .json */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.json,text/plain,application/json"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Top Header Card */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                type="button"
                onClick={onBackToGrid}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة إلى جدول الطبقات</span>
              </button>
              <span className="text-stone-300 dark:text-stone-700">•</span>
              <span className="text-3xs bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                سطر بسطر باللغة العربية
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>المحرر النصي المباشر للمنظومة</span>
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
              كل سطر منفرد بذاته (الشيفرة بسطر والعربي بسطر) لتعديل فائق السهولة على الهاتف أو المفكرة دون أي تداخل في اتجاه الكتابة.
            </p>
          </div>

          {/* Action Buttons Group */}
          <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-101"
              title="تطبيق النص المكتوب على جدول التشفير وحفظه في المتصفح"
            >
              <Check className="w-4 h-4" />
              <span>تطبيق التعديلات على الجدول</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              title="نسخ النص كاملاً إلى الحافظة"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ النص'}</span>
            </button>
          </div>
        </div>

        {/* Second Action Bar: Export / Import / Reset */}
        <div className="flex items-center gap-2 flex-wrap pt-3 mt-3 border-t border-stone-100 dark:border-stone-800 text-xs">
          <span className="font-bold text-stone-500 dark:text-stone-400 text-3xs sm:text-2xs">التصدير والاستيراد:</span>

          <button
            type="button"
            onClick={() => exportCurrentTableAsTextFile()}
            className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 font-bold rounded-lg border border-amber-200/80 dark:border-amber-800/60 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="تنزيل كملف نصي عادي (.txt) يسهل فتحه في أي مفكرة"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>تنزيل ملف نصي (.txt)</span>
          </button>

          <button
            type="button"
            onClick={() => exportCurrentTableAsFile()}
            className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
            title="تنزيل كملف JSON قياسي"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>تنزيل ملف (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
            title="استيراد ملف نصي .txt أو ملف .json"
          >
            <Upload className="w-3.5 h-3.5 text-stone-500" />
            <span>استيراد ملف (.txt أو .json)</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="mr-auto px-2.5 py-1.5 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
            title="استعادة المنظومة القياسية الافتراضية"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة المنظومة القياسية</span>
          </button>
        </div>
      </div>

      {/* Real-time Status Banner */}
      <div
        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors ${
          validation.isValid
            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
            : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
        }`}
      >
        <div className="flex items-center gap-2">
          {validation.isValid ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-bold">{validation.message}</span>
          {validation.isValid && (
            <span className="text-3xs bg-emerald-200/60 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md font-mono">
              الأحرف العربية: {validation.arabicCount} من 28
            </span>
          )}
        </div>

        {validation.isValid && (
          <div className="flex items-center gap-2 flex-wrap text-3xs font-semibold">
            {validation.duplicateArabicLetters.length > 0 && (
              <span className="text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                أحرف مكررة ({validation.duplicateArabicLetters.length}): {validation.duplicateArabicLetters.join(' ')}
              </span>
            )}
            {validation.missingArabicLetters.length > 0 && (
              <span className="text-stone-700 dark:text-stone-300 bg-stone-200/60 dark:bg-stone-800 px-2 py-0.5 rounded-md">
                أحرف ناقصة ({validation.missingArabicLetters.length}): {validation.missingArabicLetters.join(' ')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Text Editor Area */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
          <span className="font-bold flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>نص المنظومة (قابل للتعديل المباشر)</span>
          </span>
          <span className="font-mono text-3xs">
            {textContent.split('\n').length} سطر • {textContent.length} حرف
          </span>
        </div>

        <textarea
          dir="rtl"
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          rows={20}
          className="w-full p-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-950 font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base leading-relaxed resize-y selection:bg-emerald-200 dark:selection:bg-emerald-900"
          placeholder="اكتب أو الصق نص المنظومة هنا..."
        />

        {/* Helpful Explanation Footer */}
        <div className="p-3.5 bg-stone-50 dark:bg-stone-850 rounded-xl border border-stone-200/70 dark:border-stone-800 flex items-start gap-2.5 text-xs text-stone-600 dark:text-stone-400">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-normal">
            <p className="font-bold text-stone-800 dark:text-stone-200">
              قواعد كتابة التنسيق البسيط:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-2xs text-stone-600 dark:text-stone-400">
              <li>
                <strong>اسم المنظومة:</strong> يُكتب في أول سطر بالشكل <code className="bg-stone-200 dark:bg-stone-800 px-1 rounded">المنظومة: اسم المنظومة</code>
              </li>
              <li>
                <strong>رقم الطبقة:</strong> يُكتب <code className="bg-stone-200 dark:bg-stone-800 px-1 rounded">[الطبقة 7]</code> أو <code className="bg-stone-200 dark:bg-stone-800 px-1 rounded">الطبقة 7</code>
              </li>
              <li>
                <strong>سطر الشيفرة:</strong> يُكتب <code className="bg-stone-200 dark:bg-stone-800 px-1 rounded">الشيفرة: الم المص</code> (كل كلمة تشفير مفصولة بمسافة)
              </li>
              <li>
                <strong>سطر العربي:</strong> يُكتب <code className="bg-stone-200 dark:bg-stone-800 px-1 rounded">العربي: أ ب ج د</code> (الأحرف مفصولة بمسافات)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
