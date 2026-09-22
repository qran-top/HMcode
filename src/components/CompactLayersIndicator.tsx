import { getLayerColor } from '../cipherData';
import { useCipherLayers } from '../context/CipherLayersContext';

interface CompactLayersIndicatorProps {
  activeLayerNumbers: number[];
  onSelectLayer?: (layerNum: number) => void;
}

export function CompactLayersIndicator({
  activeLayerNumbers,
  onSelectLayer,
}: CompactLayersIndicatorProps) {
  const { layers } = useCipherLayers();
  // Reverse order from 7 down to 1 (الطبقة السابعة إلى الأولى)
  const displayLayers = [7, 6, 5, 4, 3, 2, 1].map(
    (num) => layers.find((l) => l.layer === num) || { layer: num, cipherLetters: [], arabicLetters: [] }
  );

  return (
    <div className="flex items-center gap-1 flex-wrap shrink-0" dir="rtl">
      {displayLayers.map((layerItem) => {
        const isUsed = activeLayerNumbers.includes(layerItem.layer);
        const color = getLayerColor(layerItem.layer);

        return (
          <button
            key={layerItem.layer}
            type="button"
            onClick={() => onSelectLayer && onSelectLayer(layerItem.layer)}
            title={`الطبقة ${layerItem.layer} (${color.name}): سماء [${(layerItem.cipherLetters || []).filter(Boolean).join(' ')}] | أرض [${(layerItem.arabicLetters || []).filter(Boolean).join(' ')}]`}
            className={`w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-md font-extrabold text-2xs flex items-center justify-center border transition-all select-none cursor-pointer shrink-0 ${
              isUsed
                ? `${color.activeBg} ${color.activeText} ${color.activeBorder} shadow-2xs ring-1 ring-offset-1 ring-stone-400/30 dark:ring-offset-stone-900 scale-105`
                : 'bg-stone-100 dark:bg-stone-850 text-stone-400 dark:text-stone-500 border-stone-200 dark:border-stone-800 hover:bg-stone-200/60 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            {layerItem.layer}
          </button>
        );
      })}
    </div>
  );
}
