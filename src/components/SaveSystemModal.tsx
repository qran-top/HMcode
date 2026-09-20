import React, { useState, useEffect } from 'react';
import { useNotebook, SavedCipherSystem } from '../context/NotebookContext';
import { X, BookmarkPlus, Sparkles, Tag, Check } from 'lucide-react';
import { LayerInfo } from '../cipherData';

interface SaveSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName: string;
  nooraniName?: string;
  arabicName?: string;
  includeWaw?: boolean;
  layers: LayerInfo[];
  existingSystemId?: string; // If editing an existing saved system
  existingNotes?: string;
  existingTags?: string[];
  onSaved?: (system: SavedCipherSystem) => void;
}

const PRESET_TAG_SUGGESTIONS = [
  'ممتازة ⭐',
  'توافق قرآني 📖',
  'قوية بفك التشفير 🔓',
  'شديدة التماسك 💎',
  'متوازنة ⚖️',
  'تحت التجربة 🧪',
];

export function SaveSystemModal({
  isOpen,
  onClose,
  defaultName,
  nooraniName,
  arabicName,
  includeWaw = false,
  layers,
  existingSystemId,
  existingNotes = '',
  existingTags = [],
  onSaved,
}: SaveSystemModalProps) {
  const { addSavedSystem, updateSavedSystem } = useNotebook();

  const [name, setName] = useState(defaultName);
  const [notes, setNotes] = useState(existingNotes);
  const [selectedTags, setSelectedTags] = useState<string[]>(existingTags);
  const [customTagInput, setCustomTagInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setNotes(existingNotes);
      setSelectedTags(existingTags || []);
      setCustomTagInput('');
    }
  }, [isOpen, defaultName, existingNotes, existingTags]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customTagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
      setCustomTagInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || defaultName || 'منظومة شيفرة مخصصة';

    if (existingSystemId) {
      updateSavedSystem(existingSystemId, {
        name: finalName,
        notes: notes.trim(),
        tags: selectedTags,
      });
      onClose();
    } else {
      const saved = addSavedSystem({
        name: finalName,
        notes: notes.trim(),
        nooraniName,
        arabicName,
        includeWaw,
        layers,
        tags: selectedTags,
      });
      if (onSaved) {
        onSaved(saved);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div
        className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-lg w-full overflow-hidden text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <BookmarkPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100">
                {existingSystemId ? 'تعديل ملاحظات المنظومة في المفكرة' : 'حفظ المنظومة في مفكرة الشيفرات'}
              </h3>
              <p className="text-3xs sm:text-2xs text-stone-500 dark:text-stone-400">
                احفظ تشكيلة الشيفرة مع ملاحظاتك للرجوع وتفعيلها بضغطة زر لاحقاً
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Identity Badges */}
          {(nooraniName || arabicName) && (
            <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center gap-2 flex-wrap text-2xs">
              {nooraniName && (
                <span className="inline-flex items-center gap-1 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 font-bold">
                  <span>🌌 السماء:</span>
                  <strong>{nooraniName}</strong>
                </span>
              )}
              {arabicName && (
                <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 font-bold">
                  <span>🌍 الأرض:</span>
                  <strong>{arabicName}</strong>
                </span>
              )}
              {includeWaw && (
                <span className="inline-flex items-center gap-1 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 px-2 py-0.5 rounded-md border border-indigo-300 dark:border-indigo-700 text-3xs font-extrabold">
                  ✨ ضم حرف (و) في صفوف (ن، ق، ص)
                </span>
              )}
            </div>
          )}

          {/* System Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
              عنوان المنظومة في المفكرة:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: سماء 1 مع أرض 7 (منظومة طسم)"
              required
              className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Personal Observations / Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
              ملاحظاتك وانطباعك عن هذه المنظومة:
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب ملاحظاتك وتجاربك... مثلاً: أعطت نتائج مذهلة في فك تشفير الحروف المقطعة، توافق عالٍ مع كلمات سورة الكهف، تفكيك كلمة (يس) أعطى مفردات معجمية واضحة..."
              className="w-full text-xs font-medium p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="block text-2xs font-bold text-stone-500 dark:text-stone-400">
              تصنيفات سريعة (اختياري):
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESET_TAG_SUGGESTIONS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-3xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-amber-400'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span>{existingSystemId ? 'حفظ التعديلات' : 'حفظ في المفكرة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
