import * as fs from 'fs';

let content = fs.readFileSync('src/components/DualTranslator.tsx', 'utf-8');

// 1. Imports
content = content.replace(
  "import { Layers, ArrowLeftRight, ChevronDown } from 'lucide-react';",
  "import { Layers, ArrowLeftRight, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';"
);

// 2. State & Context
content = content.replace(
  'const { applyPreset, applyArabicDistribution, applyNooraniDistribution } = useCipherLayers();',
  `const { 
    applyPreset, applyArabicDistribution, applyNooraniDistribution,
    activeTableName, activeArabicPresetName, activeNooraniPresetName
  } = useCipherLayers();`
);

content = content.replace(
  "const [submittedText, setSubmittedText] = useState('');",
  `const [submittedText, setSubmittedText] = useState('');
  const [isKeypadOpen, setIsKeypadOpen] = useState(() => {
    const saved = localStorage.getItem('dual_keypad_open');
    return saved !== null ? saved === 'true' : false;
  });

  useEffect(() => {
    localStorage.setItem('dual_keypad_open', String(isKeypadOpen));
  }, [isKeypadOpen]);`
);

// 3. Input & Button sizing
content = content.replace(
  'p-3.5 sm:p-4 rounded-xl',
  'p-2.5 sm:p-3 rounded-xl'
);
content = content.replace(
  'text-lg sm:text-xl',
  'text-base sm:text-lg'
);
content = content.replace(
  'py-3.5 sm:py-4 rounded-xl',
  'py-2.5 sm:py-3 rounded-xl'
);
content = content.replace(
  'text-white font-bold text-base',
  'text-white font-bold text-sm'
);

// 4. Keypad Accordion & Active Names Ribbon
const keypadStartTarget = `{/* 3-Row Numeric Keypad for Quick Settings */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">لوحة التحكم السريعة الجبرية</h3>
        
        {/* Row 1: Preset Templates */}`;

const keypadStartReplace = `{/* 3-Row Numeric Keypad for Quick Settings */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden transition-all">
        <button
          onClick={() => setIsKeypadOpen(!isKeypadOpen)}
          className="w-full flex items-center justify-between p-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">لوحة التحكم السريعة الجبرية</h3>
          </div>
          {isKeypadOpen ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
        </button>

        {isKeypadOpen && (
          <div className="p-3 pt-0 space-y-3 border-t border-stone-100 dark:border-stone-800">
            {/* Info Ribbon */}
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
            </div>

            {/* Row 1: Preset Templates */}`;

content = content.replace(keypadStartTarget, keypadStartReplace);

const keypadEndTarget = `            </div>
          </div>
        </div>
      </div>
      {/* Unified Results Section */}`;

const keypadEndReplace = `            </div>
          </div>
        </div>
        )}
      </div>
      {/* Unified Results Section */}`;

content = content.replace(keypadEndTarget, keypadEndReplace);


// 5. Results badges sizing and text
const amberBadgeTarget = `<div className="inline-flex items-center justify-between px-4 py-2 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 rounded-xl font-bold border border-amber-200 dark:border-amber-800/50">
               <div className="flex items-center gap-2">
                 <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                 في حال كانت الكلمة عربية (نتائج التشفير):
               </div>
             </div>`;

const amberBadgeReplace = `<div className="inline-flex items-center px-3 py-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 rounded-lg font-bold border border-amber-200 dark:border-amber-800/50 text-xs">
               <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-1.5"></span>
               نتائج التشفير
             </div>`;

content = content.replace(amberBadgeTarget, amberBadgeReplace);

const indigoBadgeTarget = `<div className="inline-flex items-center justify-between px-4 py-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100 rounded-xl font-bold border border-indigo-200 dark:border-indigo-800/50">
               <div className="flex items-center gap-2">
                 <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                 في حال كانت الكلمة شفرة (نتائج فك التشفير):
               </div>
             </div>`;

const indigoBadgeReplace = `<div className="inline-flex items-center px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100 rounded-lg font-bold border border-indigo-200 dark:border-indigo-800/50 text-xs">
               <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse ml-1.5"></span>
               نتائج فك التشفير
             </div>`;

content = content.replace(indigoBadgeTarget, indigoBadgeReplace);

fs.writeFileSync('src/components/DualTranslator.tsx', content);
