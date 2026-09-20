import React from 'react';
import { Sparkles, Repeat, ArrowLeftRight } from 'lucide-react';
import { NooraniPurityInfo, MirrorAnalysisInfo } from '../utils/advancedCipherAnalysis';

interface NooraniPurityBadgeProps {
  purity: NooraniPurityInfo;
  size?: 'sm' | 'xs';
}

export function NooraniPurityBadge({ purity, size = 'xs' }: NooraniPurityBadgeProps) {
  if (purity.totalLetters === 0) return null;

  if (purity.isPure) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-black rounded-md px-1.5 py-0.5 border shadow-2xs transition-all ${
          size === 'sm' ? 'text-xs' : 'text-3xs'
        } bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-300`}
        title="كلمة نورانية خالصة 100% مبنية حصراً من حروف الفواتح الـ 14 المشتركة"
      >
        <Sparkles className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
        <span>100% نورانية (14 حرفاً)</span>
      </span>
    );
  }

  if (purity.percentage >= 60) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 font-bold rounded-md px-1 py-0.5 border ${
          size === 'sm' ? 'text-xs' : 'text-3xs'
        } bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300`}
        title={`نسبة الحروف النورانية الـ 14: ${purity.percentage}% (${purity.nooraniCount}/${purity.totalLetters})`}
      >
        <span>نورانية: {purity.percentage}%</span>
      </span>
    );
  }

  return null;
}

interface BidirectionalLoopBadgeProps {
  isClosedLoop: boolean;
  size?: 'sm' | 'xs';
}

export function BidirectionalLoopBadge({ isClosedLoop, size = 'xs' }: BidirectionalLoopBadgeProps) {
  if (!isClosedLoop) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 font-black rounded-md px-1.5 py-0.5 border shadow-2xs transition-all ${
        size === 'sm' ? 'text-xs' : 'text-3xs'
      } bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-300`}
      title="حلقة تبادلية مغلقة ♾️: فك أو تشفير الناتج يعيد الأصل بدقة عبر نفس المنظومة"
    >
      <Repeat className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400 shrink-0" />
      <span>حلقة مغلقة ♾️</span>
    </span>
  );
}

interface MirrorSymmetryBadgeProps {
  mirror: MirrorAnalysisInfo;
  size?: 'sm' | 'xs';
}

export function MirrorSymmetryBadge({ mirror, size = 'xs' }: MirrorSymmetryBadgeProps) {
  if (mirror.isTwinMatch) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-black rounded-md px-1.5 py-0.5 border shadow-2xs transition-all ${
          size === 'sm' ? 'text-xs' : 'text-3xs'
        } bg-cyan-50 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-700 text-cyan-900 dark:text-cyan-300`}
        title={`توأم مرآتي متكامل ⇄: الكلمة ومعكوسها ("${mirror.reversed}") كلاهما مفردات ذات معنى محقق`}
      >
        <ArrowLeftRight className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
        <span>توأم مرآتي ⇄ ({mirror.reversed})</span>
      </span>
    );
  }

  if (mirror.isPalindrome) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-black rounded-md px-1.5 py-0.5 border shadow-2xs transition-all ${
          size === 'sm' ? 'text-xs' : 'text-3xs'
        } bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-300`}
        title="تناظر ذاتي (Palindrome): تقرأ من اليمين لليسار ومن اليسار لليمن بنفس اللفظ"
      >
        <ArrowLeftRight className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span>تناظر ذاتي 🪞</span>
      </span>
    );
  }

  return null;
}
