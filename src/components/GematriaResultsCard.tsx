import React, { useState, useMemo } from 'react';
import {
  useGematria,
  MASHRIQI_VALUES,
  MAGHRIBI_VALUES,
  JAFR_MASHRIQI_VALUES,
  JAFR_MAGHRIBI_VALUES,
  BAYAT_MASHRIQI_VALUES,
  BAYAT_MAGHRIBI_VALUES,
} from '../context/GematriaContext';
import { getQuranTopWordUrl } from '../utils/quranicDictionary';
import { deriveAamiriyaFromText } from '../utils/gematriaEngine';
import { AddToNotebookButton } from './AddToNotebookButton';
import { findLayerForChar, LAYER_RAINBOW_COLORS } from '../cipherData';
import {
  Calculator,
  BookOpen,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  Sparkles,
  HelpCircle,
  Wand2,
} from 'lucide-react';

interface GematriaResultsCardProps {
  word?: string;
  query?: string;
  onNavigateToGematria?: (text: string) => void;
  onNavigateToMatcher?: (text: string) => void;
  onSelectWord?: (word: string) => void;
}

export const SYSTEM_TOOLTIPS = {
  mashriqi: 'النموذج المشرقي: حساب الجُمَّل التقليدي وفق الترتيب الأبجدي الشائع (أبجد هوز حطي كلمن سعفص قرشت ثخذ ضظغ)',
  maghribi: 'النموذج المغربي: حساب الجُمَّل الأصيل (أبجد هوز حطي كلمن صعفض قرست ثخذ ظغش حيث ص=60، ض=90، س=300، ش=1000، ظ=800، غ=900)',
  jafr_mashriqi: 'الجفر الشرقي (جفر ش): جعل كل حرف مقطعاً بذاته مبسوطاً بأسمائه (مثلاً: ع-ل-م = عين لام ميم) ثم حسابها على المشرقي',
  jafr_maghribi: 'الجفر المغربي (جفر غ): بسط الحروف لأسماء حروفها (عين لام ميم) وحساب قيمها ومجموعها على المغربي',
  bayat_mashriqi: 'البيات الشرقي (بيات ش): بسط الحروف مع حذف الحرف الأول من كل اسم (العين تصبح ين، لام تصبح ام، ميم تصبح يم) وحسابها على المشرقي',
  bayat_maghribi: 'البيات المغربي (بيات غ): بسط الحروف مع حذف الحرف الأول من كل اسم (ين، ام، يم) وحساب قيمها ومجموعها على المغربي',
  amiriyyah: 'الطريقة العامرية: بسط الحروف لأسمائها؛ أخذ الحرف 1 من اسم الحرف الأول، والحرف 2 من اسم الحرف الثاني، والحرف الأخير من باقي الأسماء (مثل: علم -> عام، محمد -> مامل)',
};

export function GematriaResultsCard({
  word,
  query,
  onNavigateToGematria,
  onNavigateToMatcher,
  onSelectWord,
}: GematriaResultsCardProps) {
  const {
    activeTable,
    activeTableId,
    tables,
    setActiveTableId,
    calculateWordGematria,
    getLetterBreakdown,
    findQuranicMatches,
  } = useGematria();

  const [quranFilter, setQuranFilter] = useState<
    'all' | 'mashriqi' | 'maghribi' | 'jafr_mash' | 'jafr_magh' | 'bayat_mash' | 'bayat_magh' | 'noorani'
  >('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'primary' | 'jafr_bayat' | 'amiriyyah'>('all');

  const cleanWord = useMemo(() => (word || query || '').trim(), [word, query]);
  const isDirectNumber = useMemo(() => /^[0-9]+$/.test(cleanWord), [cleanWord]);

  // 1. Calculations across 6 Systems
  const mashriqiValue = useMemo(() => {
    if (isDirectNumber) return parseInt(cleanWord, 10) || 0;
    return calculateWordGematria(cleanWord, 'mashriqi');
  }, [cleanWord, isDirectNumber, calculateWordGematria]);

  const maghribiValue = useMemo(() => {
    if (isDirectNumber) return parseInt(cleanWord, 10) || 0;
    return calculateWordGematria(cleanWord, 'maghribi');
  }, [cleanWord, isDirectNumber, calculateWordGematria]);

  const jafrMashriqiValue = useMemo(() => {
    if (isDirectNumber) return parseInt(cleanWord, 10) || 0;
    return calculateWordGematria(cleanWord, 'jafr_mashriqi');
  }, [cleanWord, isDirectNumber, calculateWordGematria]);

  const jafrMaghribiValue = useMemo(() => {
    if (isDirectNumber) return parseInt(cleanWord, 10) || 0;
    return calculateWordGematria(cleanWord, 'jafr_maghribi');
  }, [cleanWord, isDirectNumber, calculateWordGematria]);

  const bayatMashriqiValue = useMemo(() => {
    if (isDirectNumber) return parseInt(cleanWord, 10) || 0;
    return calculateWordGematria(cleanWord, 'bayat_mashriqi');
  }, [cleanWord, isDirectNumber, calculateWordGematria]);

  const bayatMaghribiValue = useMemo(() => {
    if (isDirectNumber) return parseInt(cleanWord, 10) || 0;
    return calculateWordGematria(cleanWord, 'bayat_maghribi');
  }, [cleanWord, isDirectNumber, calculateWordGematria]);

  // Al-Amiriyyah derived result
  const amiriyyahResult = useMemo(() => {
    if (!cleanWord || isDirectNumber) return null;
    return deriveAamiriyaFromText(cleanWord);
  }, [cleanWord, isDirectNumber]);

  const isIdenticalPrimary = mashriqiValue === maghribiValue;
  const isIdenticalJafr = jafrMashriqiValue === jafrMaghribiValue;
  const isIdenticalBayat = bayatMashriqiValue === bayatMaghribiValue;

  // Breakdowns
  const breakdownMashriqi = useMemo(() => {
    if (isDirectNumber || !cleanWord) return [];
    return getLetterBreakdown(cleanWord, 'mashriqi');
  }, [cleanWord, isDirectNumber, getLetterBreakdown]);

  const breakdownMaghribi = useMemo(() => {
    if (isDirectNumber || !cleanWord) return [];
    return getLetterBreakdown(cleanWord, 'maghribi');
  }, [cleanWord, isDirectNumber, getLetterBreakdown]);

  const breakdownJafrMashriqi = useMemo(() => {
    if (isDirectNumber || !cleanWord) return [];
    return getLetterBreakdown(cleanWord, 'jafr_mashriqi');
  }, [cleanWord, isDirectNumber, getLetterBreakdown]);

  const breakdownJafrMaghribi = useMemo(() => {
    if (isDirectNumber || !cleanWord) return [];
    return getLetterBreakdown(cleanWord, 'jafr_maghribi');
  }, [cleanWord, isDirectNumber, getLetterBreakdown]);

  const breakdownBayatMashriqi = useMemo(() => {
    if (isDirectNumber || !cleanWord) return [];
    return getLetterBreakdown(cleanWord, 'bayat_mashriqi');
  }, [cleanWord, isDirectNumber, getLetterBreakdown]);

  const breakdownBayatMaghribi = useMemo(() => {
    if (isDirectNumber || !cleanWord) return [];
    return getLetterBreakdown(cleanWord, 'bayat_maghribi');
  }, [cleanWord, isDirectNumber, getLetterBreakdown]);

  // Differing letters
  const differingLetters = useMemo(() => {
    if (isDirectNumber || !cleanWord) return new Set<string>();
    const diff = new Set<string>();
    for (let i = 0; i < breakdownMashriqi.length; i++) {
      const char = breakdownMashriqi[i]?.char;
      const mashVal = breakdownMashriqi[i]?.value;
      const magVal = breakdownMaghribi[i]?.value;
      if (mashVal !== magVal && char) {
        diff.add(char);
      }
    }
    return diff;
  }, [isDirectNumber, cleanWord, breakdownMashriqi, breakdownMaghribi]);

  // Quranic Matches
  const matchesMashriqi = useMemo(() => {
    if (!mashriqiValue || mashriqiValue <= 0) return [];
    return findQuranicMatches(mashriqiValue, { filterType: 'all', maxResults: 100 });
  }, [mashriqiValue, findQuranicMatches]);

  const matchesMaghribi = useMemo(() => {
    if (!maghribiValue || maghribiValue <= 0 || isIdenticalPrimary) return [];
    return findQuranicMatches(maghribiValue, { filterType: 'all', maxResults: 100 });
  }, [maghribiValue, isIdenticalPrimary, findQuranicMatches]);

  const matchesJafrMash = useMemo(() => {
    if (!jafrMashriqiValue || jafrMashriqiValue <= 0) return [];
    return findQuranicMatches(jafrMashriqiValue, { filterType: 'all', maxResults: 100 });
  }, [jafrMashriqiValue, findQuranicMatches]);

  const matchesJafrMagh = useMemo(() => {
    if (!jafrMaghribiValue || jafrMaghribiValue <= 0 || isIdenticalJafr) return [];
    return findQuranicMatches(jafrMaghribiValue, { filterType: 'all', maxResults: 100 });
  }, [jafrMaghribiValue, isIdenticalJafr, findQuranicMatches]);

  const matchesBayatMash = useMemo(() => {
    if (!bayatMashriqiValue || bayatMashriqiValue <= 0) return [];
    return findQuranicMatches(bayatMashriqiValue, { filterType: 'all', maxResults: 100 });
  }, [bayatMashriqiValue, findQuranicMatches]);

  const matchesBayatMagh = useMemo(() => {
    if (!bayatMaghribiValue || bayatMaghribiValue <= 0 || isIdenticalBayat) return [];
    return findQuranicMatches(bayatMaghribiValue, { filterType: 'all', maxResults: 100 });
  }, [bayatMaghribiValue, isIdenticalBayat, findQuranicMatches]);

  const displayedQuranMatches = useMemo(() => {
    if (quranFilter === 'mashriqi') return matchesMashriqi;
    if (quranFilter === 'maghribi') return matchesMaghribi;
    if (quranFilter === 'jafr_mash') return matchesJafrMash;
    if (quranFilter === 'jafr_magh') return matchesJafrMagh;
    if (quranFilter === 'bayat_mash') return matchesBayatMash;
    if (quranFilter === 'bayat_magh') return matchesBayatMagh;
    if (quranFilter === 'noorani') {
      const mashNoorani = matchesMashriqi.filter((m) => m.isNooraniOnly);
      const magNoorani = matchesMaghribi.filter((m) => m.isNooraniOnly);
      const seen = new Set<string>();
      const combined = [...mashNoorani];
      mashNoorani.forEach((m) => seen.add(m.text));
      magNoorani.forEach((m) => {
        if (!seen.has(m.text)) {
          seen.add(m.text);
          combined.push(m);
        }
      });
      return combined;
    }

    // Default 'all'
    const seen = new Set<string>();
    const combined: typeof matchesMashriqi = [];
    matchesMashriqi.forEach((m) => {
      seen.add(m.text);
      combined.push(m);
    });
    matchesMaghribi.forEach((m) => {
      if (!seen.has(m.text)) {
        seen.add(m.text);
        combined.push(m);
      }
    });
    return combined;
  }, [
    quranFilter,
    matchesMashriqi,
    matchesMaghribi,
    matchesJafrMash,
    matchesJafrMagh,
    matchesBayatMash,
    matchesBayatMagh,
  ]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 1800);
  };

  if (!cleanWord || (mashriqiValue <= 0 && maghribiValue <= 0)) {
    return null;
  }

  // Render a calculation strip with letter pills and sum button
  const renderSystemStrip = (
    label: string,
    subLabel: string,
    totalVal: number,
    breakdown: { char: string; value: number }[],
    colorScheme: {
      bg: string;
      border: string;
      btnBg: string;
      btnBorder: string;
      titleColor: string;
      pillActiveBg: string;
      pillActiveText: string;
      pillValueBg: string;
    },
    tooltipText: string
  ) => {
    return (
      <div
        className={`px-2.5 py-1.5 rounded-lg ${colorScheme.bg} border ${colorScheme.border} flex items-center justify-between gap-1.5 flex-wrap text-xs shadow-2xs transition-all hover:shadow-xs`}
        title={tooltipText}
      >
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <div className="flex items-center gap-1 shrink-0" title={tooltipText}>
            <span className={`font-quran font-bold text-xs ${colorScheme.titleColor}`}>
              {cleanWord}
            </span>
            <span className="text-3xs font-semibold px-1 rounded bg-white/70 dark:bg-stone-800/80 border border-stone-200/60 dark:border-stone-700 select-none text-stone-600 dark:text-stone-300">
              {subLabel}
            </span>
          </div>
          <span className="text-stone-400 font-mono select-none">:</span>

          {!isDirectNumber && breakdown.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {breakdown.map((item, idx) => {
                const isDiff = differingLetters.has(item.char);
                return (
                  <React.Fragment key={`strip_${subLabel}_${idx}`}>
                    <div
                      className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-md border shadow-2xs text-xs bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700`}
                      title={`الحرف [${item.char}] = ${item.value} (${label})`}
                    >
                      <span
                        className={`w-5 h-5 rounded font-normal text-xs font-quran flex items-center justify-center shrink-0 shadow-2xs ${
                          isDiff
                            ? `${colorScheme.pillActiveBg} ${colorScheme.pillActiveText} font-bold`
                            : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200'
                        }`}
                      >
                        {item.char}
                      </span>
                      <span
                        className={`h-5 min-w-[20px] px-1 rounded font-mono font-medium text-xs flex items-center justify-center shrink-0 ${
                          isDiff
                            ? `${colorScheme.pillValueBg} font-bold`
                            : 'bg-stone-100 dark:bg-stone-700/80 text-stone-800 dark:text-stone-200'
                        }`}
                      >
                        {item.value}
                      </span>
                    </div>
                    {idx < breakdown.length - 1 && (
                      <span className="text-stone-400 font-mono text-xs px-0.5 select-none">+</span>
                    )}
                  </React.Fragment>
                );
              })}
              <span className="text-stone-400 font-mono text-xs px-0.5 select-none">=</span>
            </div>
          )}
        </div>

        {/* Total Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const q = encodeURIComponent(`ما هي قواسم العدد ${totalVal}`);
            window.open(`https://www.google.com/search?q=${q}`, '_blank', 'noopener,noreferrer');
          }}
          className={`h-6 min-w-[34px] px-2 rounded-md ${colorScheme.btnBg} text-white font-mono font-bold text-xs flex items-center justify-center gap-1 shrink-0 shadow-2xs border ${colorScheme.btnBorder} cursor-pointer transition-transform active:scale-95`}
          title={`${label}: ${totalVal} - انقر للبحث عن قواسمه في جوجل\n\n💡 شرح الطريقة:\n${tooltipText}`}
        >
          <span>{totalVal}</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-80" />
        </button>
      </div>
    );
  };

  return (
    <div
      id="gematria-results-card"
      className="bg-white dark:bg-stone-900 rounded-xl p-3 shadow-2xs space-y-2.5 transition-all duration-300 border border-emerald-500/80 shadow-xs ring-2 ring-emerald-500/10 dark:ring-emerald-500/20 bg-emerald-50/5 dark:bg-emerald-950/10"
    >
      {/* 1. Header: Title, Preset Tabs & Model Switcher */}
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-1.5 flex-wrap gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs shadow-2xs">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100 font-sans flex items-center gap-1">
            <span>حساب الجُمَّل والأوزان</span>
            <span
              className="cursor-help text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400"
              title="أشر بمؤشر الفأرة على أي جدول أو مجموع لعرض شرح دقيق وموجز لطريقة الحساب"
            >
              <HelpCircle className="w-3 h-3" />
            </span>
          </h3>

          {/* Sub-Tabs: عرض الكل / المشرقي والمغربي / الجفر والبيات / الطريقة العامرية */}
          <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 p-0.5 rounded text-3xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              الكل (6 جداول)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('primary')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                activeTab === 'primary'
                  ? 'bg-sky-600 text-white shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              شرقي وغربي
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('jafr_bayat')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                activeTab === 'jafr_bayat'
                  ? 'bg-fuchsia-600 text-white shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              جفر وبيات (ش وغ)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('amiriyyah')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                activeTab === 'amiriyyah'
                  ? 'bg-amber-600 text-white shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              العامرية ✨
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Quick Model Selector for custom tables */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="px-1.5 py-0.5 rounded text-3xs font-normal bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-750 transition-colors inline-flex items-center gap-0.5 cursor-pointer border border-stone-200 dark:border-stone-700"
              title="تغيير النموذج النشط"
            >
              <span className="text-2xs">النموذج:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {activeTable.id === 'mashriqi'
                  ? 'شرقي'
                  : activeTable.id === 'maghribi'
                  ? 'غربي'
                  : activeTable.id === 'jafr_mashriqi'
                  ? 'جفر ش'
                  : activeTable.id === 'jafr_maghribi'
                  ? 'جفر غ'
                  : activeTable.id === 'bayat_mashriqi'
                  ? 'بيات ش'
                  : activeTable.id === 'bayat_maghribi'
                  ? 'بيات غ'
                  : activeTable.name.replace(/\(.*\)/, '').replace('النموذج', '').trim()}
              </span>
              <ChevronDown className="w-2.5 h-2.5 opacity-70" />
            </button>

            {showModelPicker && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95">
                {tables.map((tbl) => {
                  const shortName =
                    tbl.id === 'mashriqi'
                      ? 'الشرقي التقليدي'
                      : tbl.id === 'maghribi'
                      ? 'المغربي (صعفض)'
                      : tbl.id === 'jafr_mashriqi'
                      ? 'جفر ش (بسط شرقي)'
                      : tbl.id === 'jafr_maghribi'
                      ? 'جفر غ (بسط مغربي)'
                      : tbl.id === 'bayat_mashriqi'
                      ? 'بيات ش (إسقاط شرقي)'
                      : tbl.id === 'bayat_maghribi'
                      ? 'بيات غ (إسقاط مغربي)'
                      : tbl.name.replace(/\(.*\)/, '').replace('النموذج', '').trim();
                  return (
                    <button
                      key={tbl.id}
                      type="button"
                      onClick={() => {
                        setActiveTableId(tbl.id);
                        setShowModelPicker(false);
                      }}
                      className={`w-full text-right px-2 py-1 rounded-md text-3xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                        activeTableId === tbl.id
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      <span className="truncate">{shortName}</span>
                      {activeTableId === tbl.id && <Check className="w-2.5 h-2.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {onNavigateToGematria && (
            <button
              type="button"
              onClick={() => onNavigateToGematria(cleanWord)}
              className="p-1 rounded text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors inline-flex items-center cursor-pointer"
              title="الانتقال إلى واجهة الجُمَّل الموسعة"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Calculation Strips according to active tab */}
      <div className="space-y-1.5">
        {/* 1. MASHRIQI */}
        {(activeTab === 'all' || activeTab === 'primary') &&
          renderSystemStrip(
            'حساب الجُمَّل المشرقي',
            'شرقي',
            mashriqiValue,
            breakdownMashriqi,
            {
              bg: 'bg-sky-50/70 dark:bg-sky-950/30',
              border: 'border-sky-300 dark:border-sky-800/80',
              btnBg: 'bg-sky-600 hover:bg-sky-700',
              btnBorder: 'border-sky-700',
              titleColor: 'text-sky-950 dark:text-sky-200',
              pillActiveBg: 'bg-sky-600',
              pillActiveText: 'text-white',
              pillValueBg: 'bg-sky-200/80 dark:bg-sky-950 text-sky-950 dark:text-sky-100',
            },
            SYSTEM_TOOLTIPS.mashriqi
          )}

        {/* 2. MAGHRIBI */}
        {(activeTab === 'all' || activeTab === 'primary') &&
          renderSystemStrip(
            'حساب الجُمَّل المغربي',
            'غربي',
            maghribiValue,
            breakdownMaghribi,
            {
              bg: 'bg-amber-50/70 dark:bg-amber-950/30',
              border: 'border-amber-300 dark:border-amber-800/80',
              btnBg: 'bg-amber-600 hover:bg-amber-700',
              btnBorder: 'border-amber-700',
              titleColor: 'text-amber-950 dark:text-amber-200',
              pillActiveBg: 'bg-amber-600',
              pillActiveText: 'text-white',
              pillValueBg: 'bg-amber-200/80 dark:bg-amber-950 text-amber-950 dark:text-amber-100',
            },
            SYSTEM_TOOLTIPS.maghribi
          )}

        {/* 3. JAFR MASHRIQI */}
        {(activeTab === 'all' || activeTab === 'jafr_bayat') &&
          renderSystemStrip(
            'حساب الجفر الشرقي (بسط الحروف ش)',
            'جفر ش',
            jafrMashriqiValue,
            breakdownJafrMashriqi,
            {
              bg: 'bg-fuchsia-50/70 dark:bg-fuchsia-950/30',
              border: 'border-fuchsia-300 dark:border-fuchsia-800/80',
              btnBg: 'bg-fuchsia-600 hover:bg-fuchsia-700',
              btnBorder: 'border-fuchsia-700',
              titleColor: 'text-fuchsia-950 dark:text-fuchsia-200',
              pillActiveBg: 'bg-fuchsia-600',
              pillActiveText: 'text-white',
              pillValueBg: 'bg-fuchsia-200/80 dark:bg-fuchsia-950 text-fuchsia-950 dark:text-fuchsia-100',
            },
            SYSTEM_TOOLTIPS.jafr_mashriqi
          )}

        {/* 4. JAFR MAGHRIBI */}
        {(activeTab === 'all' || activeTab === 'jafr_bayat') &&
          renderSystemStrip(
            'حساب الجفر المغربي (بسط الحروف غ)',
            'جفر غ',
            jafrMaghribiValue,
            breakdownJafrMaghribi,
            {
              bg: 'bg-purple-50/70 dark:bg-purple-950/30',
              border: 'border-purple-300 dark:border-purple-800/80',
              btnBg: 'bg-purple-600 hover:bg-purple-700',
              btnBorder: 'border-purple-700',
              titleColor: 'text-purple-950 dark:text-purple-200',
              pillActiveBg: 'bg-purple-600',
              pillActiveText: 'text-white',
              pillValueBg: 'bg-purple-200/80 dark:bg-purple-950 text-purple-950 dark:text-purple-100',
            },
            SYSTEM_TOOLTIPS.jafr_maghribi
          )}

        {/* 5. BAYAT MASHRIQI */}
        {(activeTab === 'all' || activeTab === 'jafr_bayat') &&
          renderSystemStrip(
            'حساب البيات الشرقي (بيات ش)',
            'بيات ش',
            bayatMashriqiValue,
            breakdownBayatMashriqi,
            {
              bg: 'bg-teal-50/70 dark:bg-teal-950/30',
              border: 'border-teal-300 dark:border-teal-800/80',
              btnBg: 'bg-teal-600 hover:bg-teal-700',
              btnBorder: 'border-teal-700',
              titleColor: 'text-teal-950 dark:text-teal-200',
              pillActiveBg: 'bg-teal-600',
              pillActiveText: 'text-white',
              pillValueBg: 'bg-teal-200/80 dark:bg-teal-950 text-teal-950 dark:text-teal-100',
            },
            SYSTEM_TOOLTIPS.bayat_mashriqi
          )}

        {/* 6. BAYAT MAGHRIBI */}
        {(activeTab === 'all' || activeTab === 'jafr_bayat') &&
          renderSystemStrip(
            'حساب البيات المغربي (بيات غ)',
            'بيات غ',
            bayatMaghribiValue,
            breakdownBayatMaghribi,
            {
              bg: 'bg-cyan-50/70 dark:bg-cyan-950/30',
              border: 'border-cyan-300 dark:border-cyan-800/80',
              btnBg: 'bg-cyan-600 hover:bg-cyan-700',
              btnBorder: 'border-cyan-700',
              titleColor: 'text-cyan-950 dark:text-cyan-200',
              pillActiveBg: 'bg-cyan-600',
              pillActiveText: 'text-white',
              pillValueBg: 'bg-cyan-200/80 dark:bg-cyan-950 text-cyan-950 dark:text-cyan-100',
            },
            SYSTEM_TOOLTIPS.bayat_maghribi
          )}

        {/* 7. AL-AMIRIYYAH DEDICATED PANEL */}
        {(activeTab === 'all' || activeTab === 'amiriyyah') && amiriyyahResult && (
          <div
            className="p-2 rounded-lg bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-emerald-500/10 border border-amber-300/80 dark:border-amber-700/80 space-y-1.5 shadow-2xs"
            title={SYSTEM_TOOLTIPS.amiriyyah}
          >
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-amber-500 text-white flex items-center justify-center text-3xs font-bold shadow-2xs">
                  ع
                </span>
                <span className="text-2xs font-bold text-amber-950 dark:text-amber-200">
                  الطريقة العامرية (اشتقاق بسط الحروف):
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-2xs">
                <span className="text-stone-500 dark:text-stone-400">الكلمة المشتقة:</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-100 font-quran font-bold text-xs border border-amber-300 dark:border-amber-700">
                  {amiriyyahResult.derivedText}
                </span>

                <span className="text-stone-400 font-mono">|</span>
                <span className="text-stone-600 dark:text-stone-300 font-mono text-3xs">
                  شرقي: <strong className="text-sky-700 dark:text-sky-300">{amiriyyahResult.mashriqiSum}</strong>
                </span>
                <span className="text-stone-400 font-mono">/</span>
                <span className="text-stone-600 dark:text-stone-300 font-mono text-3xs">
                  غربي: <strong className="text-amber-700 dark:text-amber-300">{amiriyyahResult.maghribiSum}</strong>
                </span>
              </div>
            </div>

            {/* Step-by-step breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1 pt-1 border-t border-amber-200/60 dark:border-amber-800/40">
              {amiriyyahResult.words.map((wRes, wIdx) =>
                wRes.steps.map((st, sIdx) => (
                  <div
                    key={`amiri_step_${wIdx}_${sIdx}`}
                    className="px-1.5 py-1 rounded bg-white/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-3xs flex items-center justify-between gap-1 shadow-2xs"
                    title={st.ruleExplanation}
                  >
                    <span className="text-stone-600 dark:text-stone-300 font-quran">
                      [{st.char}] <span className="text-stone-400">({st.letterName})</span>
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">←</span>
                    <span className="px-1 py-0.2 rounded bg-amber-500 text-white font-bold font-quran">
                      {st.selectedChar}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Link to Chain Matcher for Noorani Formulas if onNavigateToMatcher is provided */}
      {onNavigateToMatcher && cleanWord && (
        <button
          type="button"
          onClick={() => onNavigateToMatcher(cleanWord)}
          className="w-full py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-2xs font-medium flex items-center justify-between cursor-pointer transition-colors shadow-2xs group"
          title="فتح مطابق السلاسل لاستكشاف صيغ وتراكيب الأحرف المقطعة ومصحف السور الـ 29"
        >
          <span className="flex items-center gap-1.5 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>صيغ وتراكيب الأحرف المقطعة ومصحف السور الـ 29</span>
          </span>
          <span className="flex items-center gap-1 text-3xs font-bold text-emerald-700 dark:text-emerald-300">
            <span>فتح في مطابق السلاسل</span>
            <span>←</span>
          </span>
        </button>
      )}

      {/* 4. Quranic Words Matches Filter and Grid */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-2xs font-semibold text-stone-700 dark:text-stone-300 font-sans">
              مفردات قرآنية مطابقة ({displayedQuranMatches.length})
            </h4>
          </div>

          {/* Minimal Filter Tabs */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 p-0.5 rounded text-3xs font-medium flex-wrap">
              <button
                type="button"
                onClick={() => setQuranFilter('all')}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                  quranFilter === 'all'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                الكل
              </button>

              <button
                type="button"
                onClick={() => setQuranFilter('mashriqi')}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                  quranFilter === 'mashriqi'
                    ? 'bg-sky-600 text-white shadow-2xs font-bold'
                    : 'text-sky-700 dark:text-sky-300 hover:bg-sky-100'
                }`}
                title={`مفردات مطابقة لوزن المشرقي (= ${mashriqiValue})\n${SYSTEM_TOOLTIPS.mashriqi}`}
              >
                شرقي ({matchesMashriqi.length})
              </button>

              {!isIdenticalPrimary && (
                <button
                  type="button"
                  onClick={() => setQuranFilter('maghribi')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                    quranFilter === 'maghribi'
                      ? 'bg-amber-600 text-white shadow-2xs font-bold'
                      : 'text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                  }`}
                  title={`مفردات مطابقة لوزن المغربي (= ${maghribiValue})\n${SYSTEM_TOOLTIPS.maghribi}`}
                >
                  غربي ({matchesMaghribi.length})
                </button>
              )}

              <button
                type="button"
                onClick={() => setQuranFilter('jafr_mash')}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                  quranFilter === 'jafr_mash'
                    ? 'bg-fuchsia-600 text-white shadow-2xs font-bold'
                    : 'text-fuchsia-700 dark:text-fuchsia-300 hover:bg-fuchsia-100'
                }`}
                title={`مفردات مطابقة لوزن الجفر الشرقي (= ${jafrMashriqiValue})\n${SYSTEM_TOOLTIPS.jafr_mashriqi}`}
              >
                جفر ش ({matchesJafrMash.length})
              </button>

              {!isIdenticalJafr && (
                <button
                  type="button"
                  onClick={() => setQuranFilter('jafr_magh')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                    quranFilter === 'jafr_magh'
                      ? 'bg-purple-600 text-white shadow-2xs font-bold'
                      : 'text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                  }`}
                  title={`مفردات مطابقة لوزن الجفر المغربي (= ${jafrMaghribiValue})\n${SYSTEM_TOOLTIPS.jafr_maghribi}`}
                >
                  جفر غ ({matchesJafrMagh.length})
                </button>
              )}

              <button
                type="button"
                onClick={() => setQuranFilter('bayat_mash')}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                  quranFilter === 'bayat_mash'
                    ? 'bg-teal-600 text-white shadow-2xs font-bold'
                    : 'text-teal-700 dark:text-teal-300 hover:bg-teal-100'
                }`}
                title={`مفردات مطابقة لوزن البيات الشرقي (= ${bayatMashriqiValue})\n${SYSTEM_TOOLTIPS.bayat_mashriqi}`}
              >
                بيات ش ({matchesBayatMash.length})
              </button>

              {!isIdenticalBayat && (
                <button
                  type="button"
                  onClick={() => setQuranFilter('bayat_magh')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                    quranFilter === 'bayat_magh'
                      ? 'bg-cyan-600 text-white shadow-2xs font-bold'
                      : 'text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100'
                  }`}
                  title={`مفردات مطابقة لوزن البيات المغربي (= ${bayatMaghribiValue})\n${SYSTEM_TOOLTIPS.bayat_maghribi}`}
                >
                  بيات غ ({matchesBayatMagh.length})
                </button>
              )}

              <button
                type="button"
                onClick={() => setQuranFilter('noorani')}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                  quranFilter === 'noorani'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/40'
                }`}
              >
                نورانية
              </button>
            </div>
          </div>
        </div>

        {/* Quranic Matches Grid */}
        {displayedQuranMatches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-64 overflow-y-auto pr-0.5">
            {displayedQuranMatches.map((item, idx) => {
              const qMeta = item.quranicMeta;
              const isCopied = copiedText === `gem_m_${idx}`;
              const quranUrl = getQuranTopWordUrl(
                item.text,
                qMeta?.surahName || '',
                qMeta?.ayahNum || 1,
                qMeta?.occurrences || 1
              );

              // Check which system match belongs to
              const isMash = item.gematriaValue === mashriqiValue;
              const isMag = item.gematriaValue === maghribiValue;

              return (
                <div
                  key={`gem_match_${item.text}_${idx}`}
                  className="px-2 py-1 rounded-md bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-1 shadow-2xs hover:border-emerald-400 dark:hover:border-emerald-600 transition-all select-none group"
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <a
                      href={quranUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium font-quran text-emerald-950 dark:text-emerald-100 hover:text-emerald-600 dark:hover:text-emerald-300 hover:underline leading-tight"
                      title={`البحث عن [${item.text}] في المصحف`}
                    >
                      {item.text}
                    </a>

                    {/* Surah Name link */}
                    {qMeta?.surahName && (
                      <a
                        href={quranUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-4xs px-1 rounded font-sans text-stone-500 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline inline-flex items-center gap-0.5"
                        title={`البحث عن «${item.text}» في سورة ${qMeta.surahName} والمصحف الشريف`}
                      >
                        <span>
                          ({qMeta.surahName}
                          {qMeta.ayahNum ? `:${qMeta.ayahNum}` : ''})
                        </span>
                      </a>
                    )}

                    {/* System Origin Tag */}
                    <span
                      className={`text-4xs px-1 rounded font-sans font-medium ${
                        isMash && isMag
                          ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200'
                          : isMash
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                      }`}
                    >
                      {isMash && isMag ? 'مشترك' : isMash ? 'شرقي' : 'غربي'}
                    </span>

                    {isCopied && (
                      <span className="text-3xs text-emerald-600 dark:text-emerald-400 font-normal">
                        تم
                      </span>
                    )}
                  </div>

                  {/* Actions: Copy & Add to Notebook */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.text, `gem_m_${idx}`)}
                      className="p-0.5 text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                      title="نسخ الكلمة"
                    >
                      {isCopied ? (
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-2.5 h-2.5" />
                      )}
                    </button>
                    <AddToNotebookButton
                      word={cleanWord}
                      cipher={item.text}
                      systemName={`جُمَّل (${isMash && isMag ? 'شرقي وغربي' : isMash ? 'شرقي' : 'غربي'})`}
                      surahInfo={qMeta?.surahName}
                      ayahNum={qMeta?.ayahNum}
                      type="quranic"
                      variant="icon-only"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-2 px-2 text-center rounded-md bg-stone-50/50 dark:bg-stone-950/40 border border-stone-200/60 dark:border-stone-800 text-stone-500 dark:text-stone-400 text-3xs font-normal">
            لا توجد مفردات قرآنية مطابقة لهذا الوزن في هذا التصنيف.
          </div>
        )}
      </div>
    </div>
  );
}
