import { getLayerColor, LayerInfo } from '../cipherData';
import { useCipherLayers } from '../context/CipherLayersContext';

interface CompactLayersIndicatorProps {
  activeLayerNumbers: number[];
  customLayers?: LayerInfo[];
  onSelectLayer?: (layerNum: number) => void;
}

export function CompactLayersIndicator({
  activeLayerNumbers,
  customLayers,
  onSelectLayer,
}: CompactLayersIndicatorProps) {
  const { layers: contextLayers } = useCipherLayers();
  const currentLayers = customLayers || contextLayers;

  // Natural order from 1 to 7 (السماء الأولى إلى السابعة)
  // In RTL, [1] is rendered at the start (right) and [7] at the end (left)
  const displayLayers = [1, 2, 3, 4, 5, 6, 7].map(
    (num) => currentLayers.find((l) => l.layer === num) || { layer: num, cipherLetters: [], arabicLetters: [] }
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
            title={`السماء ${layerItem.layer} (${color.name}): سماء [${(layerItem.cipherLetters || []).filter(Boolean).join(' ')}] | أرض [${(layerItem.arabicLetters || []).filter(Boolean).join(' ')}]`}
            className={`w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-md font-medium text-xs flex items-center justify-center border transition-all select-none cursor-pointer shrink-0 ${
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
