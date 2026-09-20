import * as fs from 'fs';

let content = fs.readFileSync('src/components/DualTranslator.tsx', 'utf-8');

const ribbonText = `            {/* Info Ribbon */}
            <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs font-bold bg-stone-50 dark:bg-stone-950/50 p-2 rounded-lg border border-stone-200 dark:border-stone-800 mb-2">
              <div className="flex items-center gap-1">
                <span className="text-indigo-600 dark:text-indigo-400">القالب:</span>
                <span className="text-stone-700 dark:text-stone-300">{activeTableName ? (PRESET_TABLES[activeTableName as keyof typeof PRESET_TABLES]?.name || activeTableName) : 'مخصص'}</span>
              </div>
              <div className="hidden sm:block w-px h-3 bg-stone-300 dark:bg-stone-700 mx-1 mt-0.5"></div>
              <div className="flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400">العربي:</span>
                <span className="text-stone-700 dark:text-stone-300">{activeArabicPresetName ? (ARABIC_PRESETS[activeArabicPresetName]?.name || activeArabicPresetName) : 'مخصص'}</span>
              </div>
              <div className="hidden sm:block w-px h-3 bg-stone-300 dark:bg-stone-700 mx-1 mt-0.5"></div>
              <div className="flex items-center gap-1">
                <span className="text-amber-600 dark:text-amber-400">التشفير:</span>
                <span className="text-stone-700 dark:text-stone-300">{activeNooraniPresetName ? (NOORANI_PRESETS[activeNooraniPresetName]?.name || activeNooraniPresetName) : 'مخصص'}</span>
              </div>
            </div>`;

content = content.replace(ribbonText, '');

const insertionTarget = `{isKeypadOpen && (
          <div className="p-3 pt-0 space-y-3 border-t border-stone-100 dark:border-stone-800">`;

content = content.replace(
  insertionTarget, 
  `        <div className="px-3 pb-3">
${ribbonText}
        </div>
        ${insertionTarget}`
);

fs.writeFileSync('src/components/DualTranslator.tsx', content);
