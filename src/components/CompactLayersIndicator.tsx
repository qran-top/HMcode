import { LAYER_RAINBOW_COLORS } from '../cipherData';
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
    <div className="flex items-center gap-1.5 sm:gap-2">
      {layers.map((layerItem) => {
        const isUsed = activeLayerNumbers.includes(layerItem.layer);
        const color = LAYER_RAINBOW_COLORS[layerItem.layer];

        return (
          <button
            key={layerItem.layer}
            type="button"
            onClick={() => onSelectLayer && onSelectLayer(layerItem.layer)}
            title={`الطبقة ${layerItem.layer} (${color.name}): ${layerItem.cipherLetters.filter(Boolean).join(' - ')} = ${layerItem.arabicLetters.filter(Boolean).join(' ')}`}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-extrabold text-xs sm:text-sm flex items-center justify-center border transition-all select-none cursor-default ${
              isUsed
                ? `${color.activeBg} ${color.activeText} ${color.activeBorder} shadow-sm ring-2 ring-offset-1 ring-stone-400/30 scale-105`
                : 'bg-stone-100 text-stone-400 border-stone-200 hover:bg-stone-200/60'
            }`}
          >
            {layerItem.layer}
          </button>
        );
      })}
    </div>
  );
}
