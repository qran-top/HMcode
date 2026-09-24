// Web Worker for High-Performance Multithreaded Gematria Calculation
// يقوم بتوليد التباديل والتراكيب الحسابية في خيط معالجة خلفي مستقل دون تجميد المتصفح

import { checkArabicPhonotactics } from '../utils/arabicPhonotactics';

interface WorkerRequest {
  id: string;
  targetValue: number;
  maxResults?: number;
  includeThreeLetters?: boolean;
  includeFourLetters?: boolean;
  letterValues: { char: string; val: number }[];
}

interface WorkerResultItem {
  text: string;
  letters: string[];
  values: number[];
  length: number;
  phonotacticScore: number;
  isPlausibleArabic: boolean;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, targetValue, maxResults = 5000, letterValues } = e.data;

  try {
    const sortedLetters = [...letterValues].sort((a, b) => a.val - b.val);
    const n = sortedLetters.length;
    const results: WorkerResultItem[] = [];
    const seen = new Set<string>();

    // 1. Exact 2-Letter Combinations (Two-Pointer Method O(N))
    let left = 0;
    let right = n - 1;
    while (left < right) {
      const a = sortedLetters[left];
      const b = sortedLetters[right];
      const sum = a.val + b.val;

      if (sum === targetValue) {
        // Permutation 1
        const p1 = a.char + b.char;
        if (!seen.has(p1)) {
          seen.add(p1);
          const ph = checkArabicPhonotactics(p1);
          if (ph.isValid) {
            results.push({
              text: p1,
              letters: [a.char, b.char],
              values: [a.val, b.val],
              length: 2,
              phonotacticScore: ph.score,
              isPlausibleArabic: ph.isValid,
            });
          }
        }

        // Permutation 2
        const p2 = b.char + a.char;
        if (!seen.has(p2)) {
          seen.add(p2);
          const ph = checkArabicPhonotactics(p2);
          if (ph.isValid) {
            results.push({
              text: p2,
              letters: [b.char, a.char],
              values: [b.val, a.val],
              length: 2,
              phonotacticScore: ph.score,
              isPlausibleArabic: ph.isValid,
            });
          }
        }
        left++;
        right--;
      } else if (sum < targetValue) {
        left++;
      } else {
        right--;
      }
    }

    // 2. Exact 3-Letter Combinations (3-Sum O(N^2))
    for (let i = 0; i < n - 2; i++) {
      const a = sortedLetters[i];
      if (a.val >= targetValue) break;

      let l = i + 1;
      let r = n - 1;

      while (l < r) {
        const b = sortedLetters[l];
        const c = sortedLetters[r];
        const sum = a.val + b.val + c.val;

        if (sum === targetValue) {
          const chars = [a.char, b.char, c.char];
          const vals = [a.val, b.val, c.val];

          // All 6 distinct permutations
          const perms = [
            chars[0] + chars[1] + chars[2],
            chars[0] + chars[2] + chars[1],
            chars[1] + chars[0] + chars[2],
            chars[1] + chars[2] + chars[0],
            chars[2] + chars[0] + chars[1],
            chars[2] + chars[1] + chars[0],
          ];

          for (const p of perms) {
            if (!seen.has(p)) {
              seen.add(p);
              const ph = checkArabicPhonotactics(p);
              if (ph.isValid) {
                results.push({
                  text: p,
                  letters: chars,
                  values: vals,
                  length: 3,
                  phonotacticScore: ph.score,
                  isPlausibleArabic: true,
                });
              }
            }
          }

          l++;
          r--;
        } else if (sum < targetValue) {
          l++;
        } else {
          r--;
        }

        if (results.length >= maxResults) break;
      }
      if (results.length >= maxResults) break;
    }

    // Sort by phonotactic plausibility score descending
    results.sort((a, b) => b.phonotacticScore - a.phonotacticScore);

    self.postMessage({
      id,
      success: true,
      results,
      count: results.length,
    });
  } catch (err: any) {
    self.postMessage({
      id,
      success: false,
      error: err?.message || 'Worker computation error',
    });
  }
};
