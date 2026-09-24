// Client dispatcher for Gematria Web Worker Multithreading

export interface GematriaWorkerResultItem {
  text: string;
  letters: string[];
  values: number[];
  length: number;
  phonotacticScore: number;
  isPlausibleArabic: boolean;
}

let workerInstance: Worker | null = null;
let activeCallbacks = new Map<string, {
  resolve: (res: GematriaWorkerResultItem[]) => void;
  reject: (err: any) => void;
}>();

function getWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }
  if (!workerInstance) {
    try {
      workerInstance = new Worker(
        new URL('../workers/gematriaWorker.ts', import.meta.url),
        { type: 'module' }
      );

      workerInstance.onmessage = (e: MessageEvent) => {
        const { id, success, results, error } = e.data;
        const cb = activeCallbacks.get(id);
        if (cb) {
          activeCallbacks.delete(id);
          if (success) {
            cb.resolve(results);
          } else {
            cb.reject(new Error(error));
          }
        }
      };

      workerInstance.onerror = (err) => {
        console.error('Gematria Worker error:', err);
      };
    } catch (e) {
      console.warn('Web Worker initialization failed, fallback to main thread:', e);
      workerInstance = null;
    }
  }
  return workerInstance;
}

export async function runGematriaWorkerCalculation(
  targetValue: number,
  letterValues: { char: string; val: number }[],
  maxResults = 5000
): Promise<GematriaWorkerResultItem[]> {
  const worker = getWorker();
  const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  if (worker) {
    return new Promise((resolve, reject) => {
      activeCallbacks.set(id, { resolve, reject });
      worker.postMessage({
        id,
        targetValue,
        letterValues,
        maxResults,
      });
    });
  }

  // Fallback if worker not supported
  const { checkArabicPhonotactics } = await import('./arabicPhonotactics');
  const sortedLetters = [...letterValues].sort((a, b) => a.val - b.val);
  const n = sortedLetters.length;
  const results: GematriaWorkerResultItem[] = [];
  const seen = new Set<string>();

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
        const perms = [
          a.char + b.char + c.char,
          a.char + c.char + b.char,
          b.char + a.char + c.char,
          b.char + c.char + a.char,
          c.char + a.char + b.char,
          c.char + b.char + a.char,
        ];
        for (const p of perms) {
          if (!seen.has(p)) {
            seen.add(p);
            const ph = checkArabicPhonotactics(p);
            if (ph.isValid) {
              results.push({
                text: p,
                letters: [a.char, b.char, c.char],
                values: [a.val, b.val, c.val],
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
    }
  }

  return results;
}
