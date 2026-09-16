import { CIPHER_LAYERS, LAYER_RAINBOW_COLORS } from '../cipherData';
import { Layers, ArrowLeftRight } from 'lucide-react';

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
      <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <h2 id="layers-table-heading" className="text-base font-bold text-stone-900">
            الجدول المرجعي للطبقات السبع (28 حرفاً)
          </h2>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-stone-50 text-xs font-bold text-stone-600 border-b border-stone-200">
              <th className="py-3 px-4 w-28">الطبقة</th>
              <th className="py-3 px-4">حرفا التشفير</th>
              <th className="py-3 px-4">الأحرف العربية الأربعة</th>
              <th className="py-3 px-4 text-center w-36">الاستبدال</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-sm">
            {CIPHER_LAYERS.map((layerItem) => {
              const isHighlighted = highlightedLayerNumbers.includes(layerItem.layer);
              const color = LAYER_RAINBOW_COLORS[layerItem.layer];

              return (
                <tr
                  key={layerItem.layer}
                  id={`layer-row-${layerItem.layer}`}
                  className={`transition-colors duration-150 ${
                    isHighlighted ? `${color.lightBg} ring-1 ring-inset ${color.lightBorder}` : 'hover:bg-stone-50/70'
                  }`}
                >
                  {/* Layer Number Badge */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg font-bold text-xs ${color.activeBg} ${color.activeText} shadow-xs`}
                    >
                      الطبقة {layerItem.layer}
                    </span>
                  </td>

                  {/* 2 Cipher Letters */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 font-black text-base text-stone-900">
                      <span className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center border border-stone-300">
                        {layerItem.cipherLetters[0]}
                      </span>
                      <span className="text-stone-400 text-xs">أو</span>
                      <span className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center border border-stone-300">
                        {layerItem.cipherLetters[1]}
                      </span>
                    </div>
                  </td>

                  {/* 4 Arabic Letters */}
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {layerItem.arabicLetters.map((arabicChar, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onSelectLetter && onSelectLetter(arabicChar)}
                          className="min-w-8 h-8 px-2 rounded-md font-bold text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-300 transition-transform active:scale-95 cursor-pointer"
                          title={`إضافة الحرف ${arabicChar}`}
                        >
                          {arabicChar}
                        </button>
                      ))}
                    </div>
                  </td>

                  {/* Substitution explanation */}
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5 text-xs text-stone-600 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
                      <span className="font-semibold text-stone-900">
                        {layerItem.arabicLetters.join(' ')}
                      </span>
                      <ArrowLeftRight className="w-3 h-3 text-stone-400" />
                      <span className="font-bold text-stone-900">
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
    </div>
  );
}
