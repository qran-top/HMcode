import { BookmarkPlus, AlertTriangle, X, Check, ArrowRight } from 'lucide-react';

interface ConfirmSaveCustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSave: () => void;
  onProceedWithoutSaving: () => void;
  customType?: 'sky' | 'earth' | 'both';
}

export function ConfirmSaveCustomModal({
  isOpen,
  onClose,
  onConfirmSave,
  onProceedWithoutSaving,
  customType = 'both',
}: ConfirmSaveCustomModalProps) {
  if (!isOpen) return null;

  const typeLabel =
    customType === 'sky'
      ? 'منظومة السماء المخصصة'
      : customType === 'earth'
      ? 'منظومة الأرض المخصصة'
      : 'الشيفرة المخصصة (سماء / أرض)';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-md w-full overflow-hidden transition-all transform animate-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 flex items-start gap-3 bg-amber-50/60 dark:bg-amber-950/30">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <BookmarkPlus className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold text-stone-900 dark:text-white">
              هل تريد حفظ {typeLabel}؟
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-relaxed">
              أنت تعمل على شيفرة معدلة أو مستوردة لم يتم حفظها في المنظومات بعد. إذا قمت بالتبديل الآن فستفقد هذا التعديل.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Actions */}
        <div className="p-4 sm:p-5 space-y-3">
          <button
            type="button"
            onClick={onConfirmSave}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>نعم، حفظ وتسمية الشيفرة الآن</span>
          </button>

          <button
            type="button"
            onClick={onProceedWithoutSaving}
            className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>متابعة التبديل دون حفظ</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 text-center text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 font-medium cursor-pointer"
          >
            البقاء على الشيفرة الحالية (إلغاء)
          </button>
        </div>
      </div>
    </div>
  );
}
