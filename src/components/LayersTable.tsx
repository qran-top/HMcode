import { CIPHER_LAYERS, LAYER_RAINBOW_COLORS } from '../cipherData';
import { Layers } from 'lucide-react';

interface LayersTableProps {
  highlightedLayerNumbers?: number[];
  onSelectLetter?: (char: string) => void;
}

export function LayersTable({
  highlightedLayerNumbers = [],
  onSelectLetter,
}: LayersTableProps) {
  // Display order: Layer 7 at the top (أ ب ج د) down to Layer 1 (ذ ض ظ غ) at the bottom
  const displayLayers = CIPHER_LAYERS;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 id="layers-table-heading" className="text-base font-bold text-stone-900">
              الجدول المرجعي للطبقات السبع (28 حرفاً)
            </h2>
            <p className="text-2xs text-stone-500 mt-0.5">
              مرتبة من الطبقة 7 في الأعلى (أ ب ج د) نزولاً إلى الطبقة 1 (ذ ض ظ غ) في الأسفل
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-stone-50 text-xs font-bold text-stone-600 border-b border-stone-200">
              <th className="py-3 px-4 w-32">الطبقة</th>
              <th className="py-3 px-4 w-48">حرفا التشفير</th>
              <th className="py-3 px-4">الأحرف العربية الأربعة في الطبقة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-sm">
            {displayLayers.map((layerItem) => {
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
                      className={`inline-flex items-center justify-center px-3 py-1 rounded-lg font-bold text-xs ${color.activeBg} ${color.activeText} shadow-xs`}
                    >
                      الطبقة {layerItem.layer}
                    </span>
                  </td>

                  {/* 2 Cipher Letters */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 font-black text-base text-stone-900">
                      <span className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center border border-stone-300 shadow-2xs font-['Amiri',serif] text-lg">
                        {layerItem.cipherLetters[0]}
                      </span>
                      <span className="text-stone-400 text-xs font-normal">أو</span>
                      <span className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center border border-stone-300 shadow-2xs font-['Amiri',serif] text-lg">
                        {layerItem.cipherLetters[1]}
                      </span>
                    </div>
                  </td>

                  {/* 4 Arabic Letters */}
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {layerItem.arabicLetters.map((arabicChar, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onSelectLetter && onSelectLetter(arabicChar)}
                          className="min-w-9 h-9 px-2.5 rounded-lg font-bold text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-300 transition-transform active:scale-95 cursor-pointer shadow-2xs text-base font-['Amiri',serif]"
                          title={`إضافة الحرف ${arabicChar}`}
                        >
                          {arabicChar}
                        </button>
                      ))}
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
