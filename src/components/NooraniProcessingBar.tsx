import React from 'react';
import { Loader2, X, RotateCcw, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { NooraniAlgorithmMeta } from '../utils/gematriaEngine';

interface NooraniProcessingBarProps {
  isCalculating: boolean;
  progress: number;
  statusMessage: string;
  currentAlgorithm: NooraniAlgorithmMeta;
  onCancel: () => void;
  onRetry?: () => void;
  wasCancelled?: boolean;
  resultCount?: number;
}

export const NooraniProcessingBar: React.FC<NooraniProcessingBarProps> = ({
  isCalculating,
  progress,
  statusMessage,
  currentAlgorithm,
  onCancel,
  onRetry,
  wasCancelled = false,
  resultCount = 0,
}) => {
  if (!isCalculating && !wasCancelled) {
    return null;
  }

  if (wasCancelled) {
    return (
      <div className="my-2 p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-center justify-between gap-2 text-2xs transition-all animate-fadeIn">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <span className="font-bold">تم إلغاء معالجة الخوارزمية ({currentAlgorithm.name})</span>
            <span className="text-stone-500 dark:text-stone-400 block text-3xs">
              تم إيقاف البحث فوراً لمنع تجميد المتصفح وتوفير موارده.
            </span>
          </div>
        </div>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-2.5 py-1 rounded-md text-3xs font-bold bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-700 dark:hover:bg-amber-600 flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>إعادة المحاولة</span>
          </button>
        )}
      </div>
    );
  }

  // When actively calculating
  return (
    <div className="my-2 p-2.5 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700/80 shadow-2xs space-y-1.5 transition-all animate-fadeIn">
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-100">
              جاري المعالجة: {currentAlgorithm.name}
            </span>
            <span className="px-1.5 py-0.5 rounded-full text-3xs font-mono font-bold bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
              {Math.min(100, Math.max(0, Math.round(progress)))}%
            </span>
          </div>
        </div>

        {/* Cancellation Button */}
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1 rounded-md text-3xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100/90 hover:bg-rose-200 dark:bg-rose-950/70 dark:hover:bg-rose-900/80 border border-rose-300 dark:border-rose-800 flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95"
          title="إلغاء المعالجة فوراً لمنع الانتظار"
        >
          <X className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 stroke-[2.5]" />
          <span>إلغاء العملية</span>
        </button>
      </div>

      {/* Progress Track */}
      <div className="relative w-full h-2 bg-stone-200/80 dark:bg-stone-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-300 ease-out rounded-full"
          style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
        />
      </div>

      {/* Live Status Message & Hint */}
      <div className="flex items-center justify-between text-3xs text-stone-600 dark:text-stone-300 pt-0.5">
        <span className="font-medium text-emerald-800 dark:text-emerald-300 truncate max-w-[80%]">
          {statusMessage || 'جاري استخراج ومطابقة فواتح السور الـ 29...'}
        </span>
        <span className="text-stone-400 dark:text-stone-500 hidden sm:inline">
          معالجة لا تجمّد المتصفح
        </span>
      </div>
    </div>
  );
};
