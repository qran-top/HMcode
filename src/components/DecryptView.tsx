import { useState } from 'react';
import { CIPHER_LAYERS, cleanText, decryptCipherChar } from '../cipherData';
import { KeyRound, ArrowLeftRight, HelpCircle, Copy, Check } from 'lucide-react';

export function DecryptView() {
  const [cipherInput, setCipherInput] = useState('ن ص ع');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const cleanChars = Array.from(cleanText(cipherInput));

  const decodedItems = cleanChars.map((char) => {
    if (char === ' ' || char === '\n' || char === '\t') {
      return {
        char,
        isSpace: true,
        matchingLayer: null,
        candidates: [],
      };
    }

    const matchingLayer = CIPHER_LAYERS.find((l) =>
      l.cipherLetters.includes(char)
    );

    return {
      char,
      isSpace: false,
      matchingLayer,
      candidates: matchingLayer ? matchingLayer.arabicLetters : [],
    };
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Input Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center font-bold">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 id="decrypt-view-heading" className="text-lg font-bold text-stone-900">
              فك تشفير المشفر السباعي والكشف عن الحروف المحتملة
            </h2>
            <p className="text-xs text-stone-500">
              أدخل النص المشفر (المتكون من أحرف الطبقات) لاكتشاف الطبقة المقابلة والمرشحين الأربعة لكل موضع
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="cipher-input" className="text-xs font-bold text-stone-700 block">
            النص المشفر:
          </label>
          <input
            id="cipher-input"
            type="text"
            value={cipherInput}
            onChange={(e) => setCipherInput(e.target.value)}
            placeholder="مثال: ن ص ع..."
            className="w-full text-xl font-bold p-3.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right bg-stone-50/50"
          />
        </div>

        {/* Preset quick test cipher strings */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-xs text-stone-500">أمثلة مشفرة سريعة:</span>
          {['ن ص ع', 'ا ص ا', 'ك ط ا ص', 'ر ه ل ي'].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => setCipherInput(sample)}
              className="text-xs px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium transition-colors cursor-pointer"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* Breakdown per letter */}
      {decodedItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5">
          <h3 className="text-base font-bold text-stone-900 mb-4 pb-2 border-b border-stone-100 flex items-center justify-between">
            <span>تحليل رموز التشفير إلى الطبقات والأحرف المحتملة</span>
            <span className="text-xs text-stone-500 font-normal">
              كل حرف مشفر يعود إلى طبقة واحدة تضم 4 أحرف أصلية محتملة
            </span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {decodedItems.map((item, idx) => {
              if (item.isSpace) {
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-dashed border-stone-200 bg-stone-50/50 flex items-center justify-between text-stone-400"
                  >
                    <span className="text-xs">مسافة / فاصل</span>
                    <span className="text-xs font-mono">␣</span>
                  </div>
                );
              }

              if (!item.matchingLayer) {
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 text-rose-800 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-lg bg-rose-100 font-bold flex items-center justify-center">
                        {item.char}
                      </span>
                      <span className="text-[10px] bg-rose-200/80 px-1.5 py-0.5 rounded font-bold">
                        غير موجود
                      </span>
                    </div>
                    <span className="text-[11px] text-rose-600">
                      هذا الرمز ليس ضمن أحرف التشفير الـ 14 للطبقات السبع
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-9 h-9 rounded-lg bg-stone-900 text-amber-300 font-extrabold text-lg flex items-center justify-center shadow-xs">
                        {item.char}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-stone-900">
                          الطبقة {item.matchingLayer.layer}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          حرفا الطبقة: [{item.matchingLayer.cipherLetters.join(' - ')}]
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-stone-400 font-bold">
                      الموضع {idx + 1}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-stone-200/70">
                    <div className="text-[11px] font-semibold text-stone-600 mb-1.5">
                      الأحرف الأصلية الأربعة المحتملة:
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      {item.candidates.map((cand, cIdx) => (
                        <div
                          key={cIdx}
                          className="py-1.5 rounded-lg bg-white border border-stone-200 text-stone-900 font-bold text-base shadow-2xs"
                        >
                          {cand}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
