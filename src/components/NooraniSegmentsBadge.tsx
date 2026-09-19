import React from 'react';
import { QuranicSegmentationResult } from '../cipherData';

interface NooraniSegmentsBadgeProps {
  segmentation: QuranicSegmentationResult;
  className?: string;
}

export function NooraniSegmentsBadge({ segmentation, className = '' }: NooraniSegmentsBadgeProps) {
  if (!segmentation || segmentation.segments.length === 0) return null;

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {segmentation.segments.map((seg, sIdx) => {
        if (seg.isMultiLetter && seg.isQuranicWord) {
          // Distinct Quranic multi-letter word (e.g. الم, طسم, حم, كهيعص)
          return (
            <span
              key={sIdx}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-black bg-emerald-600 text-white shadow-2xs border border-emerald-700"
              title={`فاتحة وتركيب شيفرة: (${seg.text})`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse" />
              {seg.text}
            </span>
          );
        }

        if (seg.isQuranicWord) {
          // Single-letter Quranic word (ق, ص, ن)
          return (
            <span
              key={sIdx}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-extrabold bg-teal-100 dark:bg-teal-950/70 text-teal-900 dark:text-teal-300 border border-teal-300 dark:border-teal-700"
              title={`فاتحة قرآنية مفردة: (${seg.text})`}
            >
              {seg.text}
            </span>
          );
        }

        if (seg.isNooraniChar) {
          // Individual Noorani letter
          return (
            <span
              key={sIdx}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-700"
              title={`رمز شيفرة: (${seg.text})`}
            >
              {seg.text}
            </span>
          );
        }

        // Normal letter
        return (
          <span
            key={sIdx}
            className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800"
          >
            {seg.text}
          </span>
        );
      })}
    </div>
  );
}
