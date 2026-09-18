import * as fs from 'fs';

let content = fs.readFileSync('src/components/DualTranslator.tsx', 'utf-8');

// Imports to add
const imports = `import { PRESET_TABLES, ARABIC_PRESETS, NOORANI_PRESETS } from '../cipherData';`;
content = content.replace("import { cleanText } from '../cipherData';", `import { cleanText } from '../cipherData';\n${imports}`);

// Add methods to destructuring
content = content.replace(
  'const { analyzeText } = useCipherLayers();',
  'const { analyzeText, applyPreset, applyArabicDistribution, applyNooraniDistribution } = useCipherLayers();'
);

// We need to add them to DualTranslator as well, because `useCipherLayers` might be called there, or we can just call it in DualTranslator.
// Wait, `analyzeText` is called in `DualEncryptionWrapper`. DualTranslator doesn't call useCipherLayers!
content = content.replace(
  'export function DualTranslator({ onNavigateToEncrypt, onNavigateToDecrypt }: DualTranslatorProps) {',
  `export function DualTranslator({ onNavigateToEncrypt, onNavigateToDecrypt }: DualTranslatorProps) {
  const { applyPreset, applyArabicDistribution, applyNooraniDistribution } = useCipherLayers();`
);

// The keypad UI
const keypadUI = `
      {/* 3-Row Numeric Keypad for Quick Settings */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">لوحة التحكم السريعة الجبرية</h3>
        
        {/* Row 1: Preset Templates */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold w-32 text-indigo-700 dark:text-indigo-400 shrink-0">القوالب الجاهزة:</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(PRESET_TABLES).map((key, i) => (
              <button
                key={key}
                onClick={() => applyPreset(key as any)}
                title={PRESET_TABLES[key as keyof typeof PRESET_TABLES].name}
                className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 font-bold hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors flex items-center justify-center text-sm"
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Arabic Distributions */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold w-32 text-emerald-700 dark:text-emerald-400 shrink-0">طبقات العربي:</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(ARABIC_PRESETS).map((key, i) => (
              <button
                key={key}
                onClick={() => applyArabicDistribution(key)}
                title={ARABIC_PRESETS[key].name}
                className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-bold hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors flex items-center justify-center text-sm"
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Noorani Distributions */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold w-32 text-amber-700 dark:text-amber-400 shrink-0">طبقات التشفير:</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(NOORANI_PRESETS).map((key, i) => (
              <button
                key={key}
                onClick={() => applyNooraniDistribution(key)}
                title={NOORANI_PRESETS[key].name}
                className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-bold hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors flex items-center justify-center text-sm"
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
`;

content = content.replace(
  '{/* Unified Results Section */}',
  keypadUI + '\n      {/* Unified Results Section */}'
);

fs.writeFileSync('src/components/DualTranslator.tsx', content);
