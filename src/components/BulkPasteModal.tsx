import React, { useState, useMemo } from 'react';
import {
  ClipboardPaste,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowDown,
  ArrowUp,
  ArrowDownToLine,
  Copy,
  Info,
} from 'lucide-react';
import { getLayerColor } from '../cipherData';
import { useCipherLayers } from '../context/CipherLayersContext';

interface BulkPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessNotification?: (message: string) => void;
  isPage?: boolean;
  initialTargetType?: 'arabic' | 'cipher';
}

type TargetType = 'arabic' | 'cipher';
type OrderMode = 'table_order' | 'layer_asc' | 'layer_desc';

const EXAMPLE_LETTERS = 'ص - ر - ف - ن - ا - ي - ه - ذ - ل - ق - س - م - ك - ث - و - ش - ج - د - ع - ت - غ - ب - ط - ح - ض - خ - ز - ظ';

export function BulkPasteModal({
  isOpen,
  onClose,
  onSuccessNotification,
  isPage = false,
  initialTargetType = 'arabic',
}: BulkPasteModalProps) {
  const { layers, bulkFillArabicLetters, bulkFillCipherLetters } = useCipherLayers();

  const [rawText, setRawText] = useState('');
  const [targetType, setTargetType] = useState<TargetType>(initialTargetType);
  const [orderMode, setOrderMode] = useState<OrderMode>('table_order');
  const [clearRemaining, setClearRemaining] = useState(true);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const [enableResize, setEnableResize] = useState(false);
  const [customRows, setCustomRows] = useState<number>(layers.length);
  const [customCols, setCustomCols] = useState<number>(4);

  React.useEffect(() => {
    if (isOpen) {
      if (initialTargetType) {
        setTargetType(initialTargetType);
      }
      setCustomRows(layers.length);
      if ((initialTargetType || targetType) === 'arabic') {
        setCustomCols(Math.max(4, ...layers.map((l) => l.arabicLetters?.length || 0)));
      } else {
        setCustomCols(Math.max(2, ...layers.map((l) => l.cipherLetters?.length || 0)));
      }
    }
  }, [layers, targetType, isOpen, initialTargetType]);

  // Extract all Arabic letters in order (\u0621-\u064A matches ء to ي and related marks)
  const parsedLetters = useMemo(() => {
    if (!rawText.trim()) return [];
    const matches = rawText.match(/[\u0621-\u064A]/g) || [];
    return matches;
  }, [rawText]);

  // Analyze duplicates in pasted letters
  const duplicates = useMemo(() => {
    const counts: Record<string, number> = {};
    parsedLetters.forEach((ch) => {
      counts[ch] = (counts[ch] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, count]) => count > 1)
      .map(([ch, count]) => `${ch} (${count})`);
  }, [parsedLetters]);

  // Calculate target layers order
  const simulatedLayers = useMemo(() => {
    let next = JSON.parse(JSON.stringify(layers)) as typeof layers;
    
    if (enableResize) {
      const rows = Math.max(1, customRows || 1);
      const cols = Math.max(1, customCols || 1);

      if (next.length > rows) {
        next = next.slice(0, rows);
      } else if (next.length < rows) {
        const existingNums = next.map((l) => l.layer);
        const currentMax = existingNums.length > 0 ? Math.max(...existingNums) : 0;
        const toAdd = rows - next.length;
        for (let i = 0; i < toAdd; i++) {
          const newNum = currentMax + i + 1;
          next.push({
            layer: newNum,
            description: `الطبقة ${newNum}`,
            arabicLetters: [],
            cipherLetters: [],
          });
        }
      }
      
      next.forEach(l => {
         if (targetType === 'arabic') {
           l.arabicLetters = Array.from({ length: cols }, (_, i) => (l.arabicLetters && l.arabicLetters[i]) || '');
         } else {
           l.cipherLetters = Array.from({ length: cols }, (_, i) => (l.cipherLetters && l.cipherLetters[i]) || '');
         }
      });
    }
    
    return next;
  }, [layers, enableResize, customRows, customCols, targetType]);

  const orderedLayers = useMemo(() => {
    const copy = [...simulatedLayers];
    if (orderMode === 'layer_asc') {
      copy.sort((a, b) => a.layer - b.layer);
    } else if (orderMode === 'layer_desc') {
      copy.sort((a, b) => b.layer - a.layer);
    }
    return copy;
  }, [layers, orderMode]);

  // Total available slots in the table
  const totalSlots = useMemo(() => {
    return orderedLayers.reduce((acc, l) => {
      const slots = targetType === 'arabic' ? l.arabicLetters : l.cipherLetters;
      return acc + (slots?.length || 0);
    }, 0);
  }, [orderedLayers, targetType]);

  // Compute live preview of which letters go into which layer
  const previewData = useMemo(() => {
    let letterIdx = 0;
    return orderedLayers.map((layerItem) => {
      const slots = targetType === 'arabic' ? layerItem.arabicLetters : layerItem.cipherLetters;
      const slotCount = slots?.length || 0;
      const assigned: string[] = [];

      for (let s = 0; s < slotCount; s++) {
        if (letterIdx < parsedLetters.length) {
          assigned.push(parsedLetters[letterIdx]);
          letterIdx++;
        } else {
          assigned.push(clearRemaining ? '—' : (slots?.[s] || '—'));
        }
      }

      return {
        layer: layerItem.layer,
        description: layerItem.description,
        assigned,
        color: getLayerColor(layerItem.layer),
      };
    });
  }, [orderedLayers, targetType, parsedLetters, clearRemaining]);

  // Handle paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setRawText(text);
        }
      }
    } catch {
      // Fallback: clipboard access denied or not supported
    }
  };

  // Apply distribution
  const handleApply = () => {
    if (parsedLetters.length === 0) return;

    const resizeConfig = enableResize ? { rows: Math.max(1, customRows || 1), cols: Math.max(1, customCols || 1) } : undefined;

    if (targetType === 'arabic') {
      const res = bulkFillArabicLetters(parsedLetters, orderMode, clearRemaining, resizeConfig);
      onSuccessNotification?.(res.message || `تم توزيع ${parsedLetters.length} حرفاً في الجدول بنجاح.`);
    } else {
      const res = bulkFillCipherLetters(parsedLetters, orderMode, clearRemaining, resizeConfig);
      onSuccessNotification?.(res.message || `تم توزيع ${parsedLetters.length} من أحرف التشفير في الجدول بنجاح.`);
    }

    onClose();
  };

  if (!isOpen) return null;

  const cardContent = (
    <div className={`bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl flex flex-col ${isPage ? 'w-full shadow-xs' : 'shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200'}`}>
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3 bg-stone-50/70 dark:bg-stone-850">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center shadow-xs shrink-0">
            <ClipboardPaste className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span>لصق وتوزيع الأحرف في جدول الطبقات</span>
              <span className="text-3xs font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                تلقائي
              </span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              الصق أي قائمة من الأحرف وسيتم استخراجها وتوزيعها بالترتيب من أول طبقة لآخر طبقة
            </p>
          </div>
        </div>

        {isPage ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-200 dark:hover:bg-stone-750 transition-colors cursor-pointer"
          >
            <span>← العودة إلى جدول الطبقات</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className={`p-4 sm:p-6 space-y-5 flex-1 text-xs ${isPage ? '' : 'overflow-y-auto'}`}>
          {/* Target Selection & Quick Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
              <button
                type="button"
                onClick={() => setTargetType('arabic')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  targetType === 'arabic'
                    ? 'bg-white dark:bg-stone-700 text-amber-800 dark:text-amber-300 shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                الأحرف العربية للتشفير
              </button>
              <button
                type="button"
                onClick={() => setTargetType('cipher')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  targetType === 'cipher'
                    ? 'bg-white dark:bg-stone-700 text-purple-800 dark:text-purple-300 shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                أحرف التشفير (الشيفرة)
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-200 font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="لصق من الحافظة مباشرة"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-amber-600" />
                <span>لصق من الحافظة</span>
              </button>

              <button
                type="button"
                onClick={() => setRawText(EXAMPLE_LETTERS)}
                className="px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="تجربة مثال بحروف مرتبة (ص ر ف ن...)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>تجربة مثال (28 حرفاً)</span>
              </button>

              {rawText && (
                <button
                  type="button"
                  onClick={() => setRawText('')}
                  className="px-2 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="مسح الحقل"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>مسح</span>
                </button>
              )}
            </div>
          </div>

          {/* Textarea Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-2xs text-stone-500 dark:text-stone-400">
              <label htmlFor="bulk-letters-textarea" className="font-bold text-stone-700 dark:text-stone-300">
                أدخل أو الصق الأحرف هنا:
              </label>
              <span>يقبل الفواصل ( - أو ، أو مسافات أو كتابة متصلة)</span>
            </div>
            <textarea
              id="bulk-letters-textarea"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="مثال: ص - ر - ف - ن - ا - ي - ه - ذ - ل - ق - س - م - ك - ث - و - ش - ج - د - ع - ت - غ - ب - ط - ح - ض - خ - ز - ظ"
              rows={4}
              className="w-full p-3 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-['Amiri',serif] text-base sm:text-lg tracking-wide focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all resize-none shadow-inner"
            />
          </div>

          {/* Real-time Status Badges */}
          <div className="p-3 bg-stone-100/70 dark:bg-stone-800/70 rounded-2xl border border-stone-200/80 dark:border-stone-700/80 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-stone-700 dark:text-stone-300">
                الحروف المستخرجة:
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-black text-xs ${
                  parsedLetters.length === totalSlots
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                    : parsedLetters.length > 0
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    : 'bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
                }`}
              >
                {parsedLetters.length} حرفاً
              </span>

              <span className="text-stone-400 dark:text-stone-500">|</span>

              <span className="text-stone-600 dark:text-stone-400">
                خانات الجدول المتاحة: <strong className="text-stone-900 dark:text-stone-100">{totalSlots}</strong>
              </span>

              {parsedLetters.length === totalSlots && totalSlots > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 text-3xs">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>تطابق تام مع خانات الجدول (100%)</span>
                </span>
              )}

              {parsedLetters.length > totalSlots && (
                <span className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800 text-3xs">
                  <Info className="w-3 h-3" />
                  <span>الأحرف أكثر من الخانات (سيتم ملء أول {totalSlots} وتجاهل الزائد)</span>
                </span>
              )}

              {parsedLetters.length > 0 && parsedLetters.length < totalSlots && (
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 text-3xs">
                  <AlertTriangle className="w-3 h-3" />
                  <span>أقل من الخانات (متبقي {totalSlots - parsedLetters.length} خانة فارغة)</span>
                </span>
              )}
            </div>

            {duplicates.length > 0 && (
              <span className="text-3xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-md">
                تكرار: {duplicates.join('، ')}
              </span>
            )}
          </div>

          {/* Table Dimensions Configuration */}
          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="flex items-start sm:items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableResize}
                onChange={(e) => setEnableResize(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 mt-0.5 sm:mt-0"
              />
              <span className="text-stone-800 dark:text-stone-200 font-bold">
                تغيير أبعاد الجدول (الصفوف والأعمدة)
              </span>
            </label>

            {enableResize && (
              <div className="flex items-center gap-4 bg-white dark:bg-stone-900 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800">
                <label className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300">
                  <span>الصفوف (الطبقات):</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={customRows}
                    onChange={(e) => setCustomRows(parseInt(e.target.value, 10) || 1)}
                    className="w-16 p-1 text-center rounded bg-stone-100 dark:bg-stone-800 border-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <div className="w-px h-6 bg-stone-200 dark:bg-stone-700"></div>
                <label className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300">
                  <span>الأعمدة (الخانات):</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={customCols}
                    onChange={(e) => setCustomCols(parseInt(e.target.value, 10) || 1)}
                    className="w-16 p-1 text-center rounded bg-stone-100 dark:bg-stone-800 border-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Options: Order mode & Clear remaining */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Order mode */}
            <div className="p-3 bg-stone-50 dark:bg-stone-850 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-1.5">
              <label className="block font-bold text-stone-700 dark:text-stone-300 text-2xs">
                تسلسل توزيع الطبقات:
              </label>
              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="orderMode"
                    value="table_order"
                    checked={orderMode === 'table_order'}
                    onChange={() => setOrderMode('table_order')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-stone-800 dark:text-stone-200 font-medium">
                    من أول صف في الجدول إلى آخره (من الأعلى للأسفل)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="orderMode"
                    value="layer_asc"
                    checked={orderMode === 'layer_asc'}
                    onChange={() => setOrderMode('layer_asc')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-stone-800 dark:text-stone-200 font-medium flex items-center gap-1">
                    <span>تصاعدياً حسب رقم الطبقة (1 ⬅ 7)</span>
                    <ArrowUp className="w-3 h-3 text-stone-400" />
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="orderMode"
                    value="layer_desc"
                    checked={orderMode === 'layer_desc'}
                    onChange={() => setOrderMode('layer_desc')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-stone-800 dark:text-stone-200 font-medium flex items-center gap-1">
                    <span>تنازلياً حسب رقم الطبقة (7 ⬅ 1)</span>
                    <ArrowDown className="w-3 h-3 text-stone-400" />
                  </span>
                </label>
              </div>
            </div>

            {/* Clear remaining slots */}
            <div className="p-3 bg-stone-50 dark:bg-stone-850 rounded-2xl border border-stone-200 dark:border-stone-800 flex flex-col justify-between">
              <label className="block font-bold text-stone-700 dark:text-stone-300 text-2xs">
                الخانات المتبقية (إن وجدت):
              </label>
              <label className="flex items-start gap-2 cursor-pointer select-none mt-2">
                <input
                  type="checkbox"
                  checked={clearRemaining}
                  onChange={(e) => setClearRemaining(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 mt-0.5"
                />
                <span className="text-stone-800 dark:text-stone-200 font-medium leading-relaxed">
                  تفريغ الخانات المتبقية في حال كانت الأحرف الملصقة أقل من إجمالي خانات الجدول
                </span>
              </label>
              <p className="text-3xs text-stone-400 dark:text-stone-500 mt-2">
                عند التفعيل، سيتم استبدال أي خانة لم يصلها حرف بفراغ للبدء النظيف.
              </p>
            </div>
          </div>

          {/* Live Preview of Distribution */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-800 dark:text-stone-200 text-xs flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>معاينة التوزيع المباشر على الطبقات:</span>
              </h4>
              <span className="text-3xs text-stone-400 dark:text-stone-500">
                هكذا ستنزل الأحرف في خانات الجدول
              </span>
            </div>

            <div className="border border-stone-200 dark:border-stone-800 rounded-2xl p-2.5 bg-stone-50/50 dark:bg-stone-850/50 divide-y divide-stone-200/60 dark:divide-stone-800/60 space-y-1 max-h-56 overflow-y-auto">
              {previewData.map((row, idx) => (
                <div key={row.layer} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`w-6 h-6 rounded-md font-extrabold text-xs flex items-center justify-center ${row.color.badgeBg} ${row.color.badgeText}`}
                    >
                      {row.layer}
                    </span>
                    <span className="text-2xs font-bold text-stone-700 dark:text-stone-300">
                      الطبقة {row.layer} ({row.color.name})
                    </span>
                  </div>

                  {/* Slot badges */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {row.assigned.map((ch, sIdx) => {
                      const isAssigned = ch !== '—' && ch !== '';
                      return (
                        <div
                          key={sIdx}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-['Amiri',serif] text-sm sm:text-base font-bold border transition-all ${
                            isAssigned
                              ? `${row.color.lightBg} ${row.color.lightBorder} text-stone-900 dark:text-stone-100 ring-1 ring-amber-400/50 shadow-2xs`
                              : 'bg-stone-200/50 dark:bg-stone-800/50 text-stone-400 dark:text-stone-600 border-dashed border-stone-300 dark:border-stone-700'
                          }`}
                        >
                          {ch || '—'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 font-bold transition-colors cursor-pointer text-xs"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={parsedLetters.length === 0}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer ${
              parsedLetters.length > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-stone-950 hover:scale-102 active:scale-98'
                : 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>تطبيق وتوزيع الأحرف في الجدول</span>
            {parsedLetters.length > 0 && (
              <span className="text-3xs bg-stone-950 text-amber-400 px-1.5 py-0.5 rounded-md font-black">
                ({parsedLetters.length} حرفاً)
              </span>
            )}
          </button>
        </div>
      </div>
  );

  if (isPage) {
    return (
      <div className="w-full space-y-4 animate-in fade-in duration-200" dir="rtl">
        {cardContent}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      {cardContent}
    </div>
  );
}
