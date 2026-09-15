import { CIPHER_LAYERS, LayerInfo } from '../cipherData';
import { Layers, ArrowLeftRight, Check, Hash } from 'lucide-react';

interface LayersTableProps {
  highlightedLayerNumbers?: number[];
  onSelectLetter?: (char: string) => void;
}

export function LayersTable({
  highlightedLayerNumbers = [],
  onSelectLetter,
}: LayersTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-stone-100 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 id="layers-table-heading" className="text-lg font-bold text-stone-900">
              الجدول المرجعي للطبقات السبع
            </h2>
            <p className="text-xs text-stone-500">
              مرتبة حسب النظام المحدد من الطبقة الأولى (ذ ض ظ غ) حتى الطبقة السابعة (أ ب ج د)
            </p>
          </div>
        </div>

        <div className="text-xs font-medium text-stone-600 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200/60 flex items-center gap-1.5 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          <span>إجمالي 28 حرفاً عربياً موزعة على 7 طبقات</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-stone-50/50 text-xs font-semibold text-stone-500 border-b border-stone-200">
              <th className="py-3.5 px-4 sm:px-6 w-28">رقم الطبقة</th>
              <th className="py-3.5 px-4 sm:px-6">حرفا التشفير (الاحتمالان)</th>
              <th className="py-3.5 px-4 sm:px-6">
                الأحرف العربية الأربعة (الترتيب الأبجدي القديم)
              </th>
              <th className="py-3.5 px-4 sm:px-6 text-center w-36">الاستبدال المشفر</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-sm">
            {CIPHER_LAYERS.map((layerItem) => {
              const isHighlighted = highlightedLayerNumbers.includes(layerItem.layer);

              return (
                <tr
                  key={layerItem.layer}
                  id={`layer-row-${layerItem.layer}`}
                  className={`transition-colors duration-150 ${
                    isHighlighted
                      ? 'bg-amber-50/80 hover:bg-amber-100/70 ring-1 ring-inset ring-amber-300'
                      : 'hover:bg-stone-50/80'
                  }`}
                >
                  {/* Layer Number Badge */}
                  <td className="py-4 px-4 sm:px-6">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isHighlighted
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-stone-100 text-stone-700 border border-stone-200'
                        }`}
                      >
                        {layerItem.layer}
                      </span>
                      <span className="font-semibold text-stone-800 text-xs sm:text-sm">
                        الطبقة {layerItem.layer}
                      </span>
                    </div>
                  </td>

                  {/* 2 Cipher Letters (Probabilities) */}
                  <td className="py-4 px-4 sm:px-6">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center justify-center min-w-9 h-9 px-2 rounded-lg bg-stone-900 text-amber-300 font-bold text-base shadow-xs"
                        title="الاحتمال الأول"
                      >
                        {layerItem.cipherLetters[0]}
                      </span>
                      <span className="text-stone-300 text-xs font-bold">أو</span>
                      <span
                        className="inline-flex items-center justify-center min-w-9 h-9 px-2 rounded-lg bg-stone-800 text-amber-300 font-bold text-base shadow-xs"
                        title="الاحتمال الثاني"
                      >
                        {layerItem.cipherLetters[1]}
                      </span>
                    </div>
                  </td>

                  {/* 4 Arabic Letters */}
                  <td className="py-4 px-4 sm:px-6">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {layerItem.arabicLetters.map((arabicChar, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onSelectLetter && onSelectLetter(arabicChar)}
                          className={`min-w-8 h-8 px-2 rounded-md font-bold text-stone-800 border transition-transform active:scale-95 ${
                            isHighlighted
                              ? 'bg-white border-amber-300 text-amber-950 shadow-xs'
                              : 'bg-stone-100/80 border-stone-200 hover:border-stone-400 hover:bg-white'
                          }`}
                          title={`انقر لتجربة الحرف: ${arabicChar}`}
                        >
                          {arabicChar}
                        </button>
                      ))}
                    </div>
                  </td>

                  {/* Substitution explanation */}
                  <td className="py-4 px-4 sm:px-6 text-center">
                    <div className="inline-flex items-center gap-1.5 text-xs text-stone-600 bg-stone-100 px-2.5 py-1.5 rounded-lg border border-stone-200">
                      <span className="font-semibold text-stone-800">
                        {layerItem.arabicLetters.join(' ')}
                      </span>
                      <ArrowLeftRight className="w-3.5 h-3.5 text-stone-400" />
                      <span className="font-bold text-amber-700">
                        [{layerItem.cipherLetters[0]} / {layerItem.cipherLetters[1]}]
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-stone-50/50 border-t border-stone-100 text-xs text-stone-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <p>
          💡 <strong>ملاحظة الترتيب:</strong> تبدأ الطبقة السابعة بـ (أ ب ج د)، وصولاً إلى الطبقة الأولى بـ (ذ ض ظ غ) وفق الترتيب الأبجدي التاريخي.
        </p>
        <span className="text-stone-400">نظام المشفر السباعي 7×4=28</span>
      </div>
    </div>
  );
}
