import React, { useState, useEffect } from 'react';
import { useCipherLayers } from '../context/CipherLayersContext';
import { Layers, ArrowLeftRight, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { cleanText } from '../cipherData';
import { PRESET_TABLES, ARABIC_PRESETS, NOORANI_PRESETS } from '../cipherData';
import { EncryptionResults } from './EncryptionResults';
import { DecryptView } from './DecryptView';

interface DualTranslatorProps {
  onNavigateToEncrypt?: (text: string) => void;
  onNavigateToDecrypt?: (text: string) => void;
}

export function DualTranslator({ onNavigateToEncrypt, onNavigateToDecrypt }: DualTranslatorProps) {
  const { 
    applyPreset, applyArabicDistribution, applyNooraniDistribution,
    activeTableName, activeArabicPresetName, activeNooraniPresetName
  } = useCipherLayers();

  const [inputText, setInputText] = useState('');
  const [submittedText, setSubmittedText] = useState('');
  const [isKeypadOpen, setIsKeypadOpen] = useState(() => {
    const saved = localStorage.getItem('dual_keypad_open');
    return saved !== null ? saved === 'true' : false;
  });

  useEffect(() => {
    localStorage.setItem('dual_keypad_open', String(isKeypadOpen));
  }, [isKeypadOpen]);

  const handleGenerate = () => {
    setSubmittedText(inputText.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Unified Input Section */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2 mb-4">
          <ArrowLeftRight className="w-5 h-5 text-indigo-500" />
          المترجم المزدوج
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب كلمة أو كلمتين هنا (اضغط Enter للتوليد)..."
            className="flex-1 w-full text-base text-right font-bold p-2 sm:p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-stone-50/50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 transition-all shadow-inner"
          />
          <button
            onClick={handleGenerate}
            disabled={!inputText.trim()}
            className="w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-bold text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900 flex items-center justify-center shrink-0"
          >
            توليد وعرض النتائج
          </button>
        </div>
      </div>

      
      {/* 3-Row Numeric Keypad for Quick Settings */}
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

                <div className="px-3 pb-3">
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
        </div>
        {isKeypadOpen && (
          <div className="p-3 pt-0 space-y-3 border-t border-stone-100 dark:border-stone-800">


            {/* Row 1: Preset Templates */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold w-32 text-indigo-700 dark:text-indigo-400 shrink-0">القوالب الجاهزة:</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(PRESET_TABLES).map((key, i) => (
              <button
                key={key}
                onClick={() => applyPreset(key as any)}
                title={PRESET_TABLES[key as keyof typeof PRESET_TABLES].name}
                className="w-7 h-7 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 font-bold hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors flex items-center justify-center text-xs"
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
                className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-bold hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors flex items-center justify-center text-xs"
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
                className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-bold hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors flex items-center justify-center text-xs"
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
            </div>
          )}
        </div>

      {/* Unified Results Section */}
      {submittedText && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* 1. As Arabic -> Shows Encryption Results Component */}
          <div className="flex flex-col gap-3">
             <div className="inline-flex items-center px-3 py-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 rounded-lg font-bold border border-amber-200 dark:border-amber-800/50 text-xs">
               <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-1.5"></span>
               نتائج التشفير
             </div>
             
             <div className="bg-stone-50/50 dark:bg-stone-950/50 rounded-2xl p-4 border border-stone-200 dark:border-stone-800">
               <DualEncryptionWrapper text={submittedText} />
             </div>

             <button
               onClick={() => onNavigateToEncrypt && onNavigateToEncrypt(submittedText)}
               className="mt-2 w-full px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 transition-colors font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
             >
               التفاصيل
             </button>
          </div>

          {/* 2. As Cipher -> Shows Decryption Results Component */}
          <div className="flex flex-col gap-3">
             <div className="inline-flex items-center px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100 rounded-lg font-bold border border-indigo-200 dark:border-indigo-800/50 text-xs">
               <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse ml-1.5"></span>
               نتائج فك التشفير
             </div>
             
             <div className="bg-stone-50/50 dark:bg-stone-950/50 rounded-2xl p-4 border border-stone-200 dark:border-stone-800">
                <DualDecryptionWrapper text={submittedText} />
             </div>

             <button
               onClick={() => onNavigateToDecrypt && onNavigateToDecrypt(submittedText)}
               className="mt-2 w-full px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 transition-colors font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
             >
               التفاصيل
             </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DualEncryptionWrapper({ text }: { text: string }) {
  const { analyzeText } = useCipherLayers();
  // Simple view replicating top portion of encryption without all the bulky UI
  const details = analyzeText(text);
  const [selectedProbabilities, setSelectedProbabilities] = useState<number[]>([]);
  
  useEffect(() => {
     setSelectedProbabilities(details.map(() => 0));
  }, [text]);

  const hasMissingArabic = details.length > 0 && details.some(d => d.layer === null && !d.isSpecialOrSpace);

  if (hasMissingArabic) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 text-center text-red-600 dark:text-red-400 font-bold text-lg">
        لا توجد حروف في الجدول تقابل هذه الكلمة
      </div>
    );
  }

  return (
    <div className="scale-95 origin-top">
      <EncryptionResults 
        details={details} 
        selectedProbabilities={selectedProbabilities}
        onSetSelectedProbabilities={setSelectedProbabilities}
        onToggleProbability={() => {}}
        generateSignal={0}
        onGenerationStateChange={() => {}}
        isDualMode={true}
      />
    </div>
  );
}

function DualDecryptionWrapper({ text }: { text: string }) {
  // Use DecryptView but override its internal input state
  return (
    <div className="scale-95 origin-top">
       <DecryptView cipherInput={text} isDualMode={true} />
    </div>
  );
}
