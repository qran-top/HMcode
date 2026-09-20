import React from 'react';
import { useNotebook } from '../context/NotebookContext';
import { BookMarked, Check } from 'lucide-react';

interface AddToNotebookButtonProps {
  word: string;
  cipher: string;
  systemName?: string;
  systemNumber?: number;
  type?: 'encryption' | 'decryption' | 'quranic' | 'dictionary' | 'manual';
  surahInfo?: string;
  ayahNum?: number;
  isReversed?: boolean;
  note?: string;
  variant?: 'icon-only' | 'badge' | 'button' | 'pill';
  label?: string;
  className?: string;
}

export function AddToNotebookButton({
  word,
  cipher,
  systemName,
  systemNumber,
  type = 'manual',
  surahInfo,
  ayahNum,
  isReversed = false,
  note,
  variant = 'icon-only',
  label = 'حفظ بالدفتر',
  className = '',
}: AddToNotebookButtonProps) {
  const { addEntry, isSaved } = useNotebook();

  const saved = isSaved(word, cipher, isReversed);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    addEntry(word, cipher, {
      systemName,
      systemNumber,
      type,
      surahInfo,
      ayahNum,
      isReversed,
      note,
    });
  };

  if (variant === 'icon-only') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`p-1 rounded-md transition-all cursor-pointer ${
          saved
            ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 shadow-2xs'
            : 'text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800'
        } ${className}`}
        title={
          saved
            ? `محفوظ في الدفتر 📓${isReversed ? ' (معكوسة)' : ''}`
            : `إضافة للدفتر 📓${isReversed ? ' (كلمة معكوسة)' : ''}`
        }
        aria-label="إضافة للدفتر"
      >
        {saved ? <Check className="w-3.5 h-3.5" /> : <BookMarked className="w-3.5 h-3.5" />}
      </button>
    );
  }

  if (variant === 'badge') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-3xs font-bold transition-all cursor-pointer ${
          saved
            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300/80'
            : 'bg-stone-100 hover:bg-amber-50 dark:bg-stone-800 dark:hover:bg-amber-950/40 text-stone-600 hover:text-amber-800 dark:text-stone-300 dark:hover:text-amber-300 border border-stone-200 dark:border-stone-700'
        } ${className}`}
        title="إضافة الكلمة وشيفرتها للدفتر"
      >
        {saved ? <Check className="w-2.5 h-2.5" /> : <BookMarked className="w-2.5 h-2.5" />}
        <span>{saved ? 'في الدفتر' : label}</span>
      </button>
    );
  }

  // button or pill
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
        saved
          ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
          : 'bg-white dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-stone-700 text-stone-700 hover:text-amber-900 dark:text-stone-200 dark:hover:text-amber-300 border border-stone-200 dark:border-stone-700'
      } ${className}`}
      title="حفظ الكلمة والشيفرة في الدفتر"
    >
      {saved ? <Check className="w-3.5 h-3.5 text-amber-600" /> : <BookMarked className="w-3.5 h-3.5 text-amber-600" />}
      <span>{saved ? 'محفوظ بالدفتر' : label}</span>
    </button>
  );
}
