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

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap max-w-full">
      {layers.map((layerItem) => {
        const isUsed = activeLayerNumbers.includes(layerItem.layer);
        const color = getLayerColor(layerItem.layer);

        return (
          <button
            key={layerItem.layer}
            type="button"
            onClick={() => onSelectLayer && onSelectLayer(layerItem.layer)}
            title={`الطبقة ${layerItem.layer} (${color.name}): ${layerItem.cipherLetters.filter(Boolean).join(' - ')} = ${layerItem.arabicLetters.filter(Boolean).join(' ')}`}
            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md font-extrabold text-2xs sm:text-xs flex items-center justify-center border transition-all select-none cursor-default shrink-0 ${
              isUsed
                ? `${color.activeBg} ${color.activeText} ${color.activeBorder} shadow-2xs ring-1 ring-offset-1 ring-stone-400/30 dark:ring-offset-stone-900 scale-105`
                : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 border-stone-200 dark:border-stone-700 hover:bg-stone-200/60 dark:hover:bg-stone-700'
            }`}
          >
            {layerItem.layer}
          </button>
        );
      })}
    </div>
  );
}
