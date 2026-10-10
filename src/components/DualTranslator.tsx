import React, { useState, useEffect, useMemo } from 'react';
import { useCipherLayers } from '../context/CipherLayersContext';
import { useNotebook } from '../context/NotebookContext';
import { useTheme } from '../context/ThemeContext';
import { useHint } from '../context/HintContext';
import { PRESET_TABLES, cleanText, normalizeArabicChar, getLayerColor, getAllCombinations, segmentIntoQuranicWords, LAYER_RAINBOW_COLORS, NOORANI_LETTERS_SET, analyzeWord, NOORANI_PRESETS, ARABIC_PRESETS, getShortPresetId, getExpandedPresetId } from '../cipherData';
import { CompactLayersIndicator } from './CompactLayersIndicator';
import { arabicDictionary } from '../utils/arabicDictionary';
import { 
  quranicDictionary, 
  QuranicWordMeta, 
  QuranicNearestMatch,
  getQuranTopWordUrl,
  getQuranTopSearchUrl,
  getArabicDictSearchUrl
} from '../utils/quranicDictionary';
import { NooraniSegmentsBadge } from './NooraniSegmentsBadge';
import { 
  Sparkles, 
  KeyRound, 
  Lock,
  Unlock,
  Copy, 
  Check, 
  Download, 
  Upload,
  Save, 
  ExternalLink, 
  BookOpen, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Eraser,
  Search,
  Filter,
  History,
  Trash2,
  RotateCcw,
  Globe,
  CheckCircle,
  BookmarkPlus,
  BookMarked,
  Share2,
  ClipboardPaste,
  ArrowDownUp,
  Loader2,
  Star,
  Settings2,
  Calculator,
  LayoutGrid
} from 'lucide-react';
import { MultiSystemScanner } from './MultiSystemScanner';
import { AddToNotebookButton } from './AddToNotebookButton';
import { SaveSystemModal } from './SaveSystemModal';
import { SearchHistoryDrawer, SearchHistoryItem } from './SearchHistoryDrawer';
import { getAllNooraniItems, getAllArabicItems, applyWawToCelestialLayers, buildCrossLayersFromPair } from '../utils/multiSystemSearch';
import { DosBlinkBlockInput } from './DosBlinkBlockInput';

function highlightWordInAyah(ayahText: string, targetWord: string, highlightClass: string): React.ReactNode {
  if (!ayahText || !targetWord) return ayahText;
  const cleanTarget = normalizeArabicChar(targetWord).replace(/[^ء-ي]/g, '');
  if (!cleanTarget) return ayahText;

  const tokens = ayahText.split(/(\s+)/);
  return (
    <>
      {tokens.map((token, idx) => {
        const cleanToken = normalizeArabicChar(token).replace(/[^ء-ي]/g, '');
        const matches =
          cleanToken === cleanTarget ||
          (cleanTarget.length >= 3 && cleanToken.includes(cleanTarget)) ||
          (cleanToken.length >= 3 && cleanTarget.includes(cleanToken));

        if (matches) {
          return (
            <mark
              key={idx}
              className={`${highlightClass} px-1.5 py-0.5 rounded font-bold mx-0.5 inline-block shadow-2xs`}
            >
              {token}
            </mark>
          );
        }
        return <React.Fragment key={idx}>{token}</React.Fragment>;
      })}
    </>
  );
}

interface DualTranslatorProps {
  onNavigateToEncrypt?: (text: string) => void;
  onNavigateToDecrypt?: (text: string) => void;
  onNavigateToGematria?: (text: string) => void;
  onNavigateToMatcher?: (text: string) => void;
  mode?: 'decrypt' | 'encrypt' | 'both';
  inputText?: string;
  onInputTextChange?: (text: string) => void;
}

const DEFAULT_RECENT_SEARCHES = ['طسم', 'كهيعص', 'بقرة', 'يس', 'سلام'];
const STORAGE_KEY_HISTORY = 'cipher_recent_searches';

export function DualTranslator({
  onNavigateToEncrypt,
  onNavigateToDecrypt,
  onNavigateToGematria,
  onNavigateToMatcher,
  mode = 'both',
  inputText: externalInputText,
  onInputTextChange,
}: DualTranslatorProps) {
  const { addEntry, openDrawer, isSystemSaved, savedSystems } = useNotebook();
  const {
    layers,
    activeTableName,
    savedTables,
    applyPreset,
    loadSavedTable,
    saveCurrentTable,
    activeNooraniPresetName,
    activeArabicPresetName,
    applyNooraniDistribution,
    applyArabicDistribution,
    savedNooraniPresets,
    savedArabicPresets,
    exportCurrentTableAsFile,
    exportCurrentTableAsTextFile,
    importTablesFromJson,
    analyzeText,
    validCipherLetters
  } = useCipherLayers();

  const importFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [importStatusMessage, setImportStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { isDos, playDosBeep } = useTheme();
  const { setHintText, clearHint } = useHint();

  const [inputText, setInputText] = useState(externalInputText || '');
  const [submittedText, setSubmittedText] = useState(externalInputText || '');
  const [viewMode, setViewMode] = useState<'both' | 'decrypt' | 'encrypt'>('both');
  const [expandedQuranicKey, setExpandedQuranicKey] = useState<string | null>(null);

  const toggleQuranicAccordion = (key: string) => {
    setExpandedQuranicKey((prev) => (prev === key ? null : key));
  };

  // Track externalInputText updates from parent (e.g. clicking links or tab transfers)
  const prevExternalRef = React.useRef(externalInputText);
  useEffect(() => {
    if (externalInputText !== undefined && externalInputText !== prevExternalRef.current) {
      prevExternalRef.current = externalInputText;
      setInputText(externalInputText);
      setSubmittedText(externalInputText);
    }
  }, [externalInputText]);

  // Sync mode if changed from parent
  useEffect(() => {
    if (mode && (mode === 'decrypt' || mode === 'encrypt' || mode === 'both')) {
      setViewMode(mode);
    }
  }, [mode]);

  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showMultiSystemScanner, setShowMultiSystemScanner] = useState(false);

  // Collapsible Tools & System drawer toggle state ("سحاب الأدوات والمنظومة")
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);

  // Feature Options: Consider 'و' (Waw) in all cipher layers (افتراضياً مفعل)
  const [includeWawInAllLayers, setIncludeWawInAllLayers] = useState(true);

  // Collapsible Nearest Quranic Vocabulary drawer ("سحاب أقرب المفردات شبهاً" مع حفظ الحالة في المتصفح)
  const [isNearestQuranicOpen, setIsNearestQuranicOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('hmcode_nearest_quranic_open');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleNearestQuranicOpen = () => {
    setIsNearestQuranicOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('hmcode_nearest_quranic_open', String(next));
      } catch {}
      return next;
    });
  };

  // Reverse / Inversion toggles for Sky and Earth selectors
  const [isNooraniReversed, setIsNooraniReversed] = useState(false);
  const [isArabicReversed, setIsArabicReversed] = useState(false);

  // Dictionary loaded counts & background loading state for reactive re-evaluations
  const [dictCount, setDictCount] = useState<number>(arabicDictionary.getWordCount());
  const [dictLoading, setDictLoading] = useState<boolean>(arabicDictionary.isLoading());
  const [dictProgress, setDictProgress] = useState<number>(arabicDictionary.getProgress());
  const [quranicCount, setQuranicCount] = useState<number>(quranicDictionary.getWordCount());

  useEffect(() => {
    const unsubDict = arabicDictionary.subscribe((prog, done, count) => {
      setDictCount(count || arabicDictionary.getWordCount());
      setDictProgress(prog);
      setDictLoading(!done || prog < 100);
    });
    const unsubQuranic = quranicDictionary.subscribe((_loaded, count) => {
      setQuranicCount(count || quranicDictionary.getWordCount());
    });
    return () => {
      unsubDict();
      unsubQuranic();
    };
  }, []);

  // Dynamic layers applying reversal (if toggled) and optional Waw inclusion
  const effectiveLayers = useMemo(() => {
    let currentLayers = layers;
    if (isNooraniReversed || isArabicReversed) {
      currentLayers = layers.map((layer) => {
        const matchingLayerNum = 8 - layer.layer;
        const nooraniLayer = isNooraniReversed ? layers.find((l) => l.layer === matchingLayerNum) : layer;
        const arabicLayer = isArabicReversed ? layers.find((l) => l.layer === matchingLayerNum) : layer;
        return {
          ...layer,
          cipherLetters: nooraniLayer ? [...nooraniLayer.cipherLetters] : [...layer.cipherLetters],
          arabicLetters: arabicLayer ? [...arabicLayer.arabicLetters] : [...layer.arabicLetters],
        };
      });
    }
    if (!includeWawInAllLayers) return currentLayers;
    return applyWawToCelestialLayers(currentLayers);
  }, [layers, isNooraniReversed, isArabicReversed, includeWawInAllLayers]);
  
  // Combine Presets + Saved Custom Tables for Sky & Earth
  const allNooraniItems = useMemo(() => {
    return getAllNooraniItems(savedNooraniPresets, savedTables);
  }, [savedNooraniPresets, savedTables]);

  const allArabicItems = useMemo(() => {
    return getAllArabicItems(savedArabicPresets, savedTables);
  }, [savedArabicPresets, savedTables]);

  // Selected Noorani ID
  const selectedNooraniId = useMemo(() => {
    if (activeNooraniPresetName) {
      const match = allNooraniItems.find((n) => n.name === activeNooraniPresetName);
      if (match) return match.id;
    }
    return allNooraniItems[0]?.id || '';
  }, [activeNooraniPresetName, allNooraniItems]);

  // Selected Arabic ID
  const selectedArabicId = useMemo(() => {
    if (activeArabicPresetName) {
      const match = allArabicItems.find((a) => a.name === activeArabicPresetName);
      if (match) return match.id;
    }
    return allArabicItems[0]?.id || '';
  }, [activeArabicPresetName, allArabicItems]);

  const currentNooraniItem = useMemo(() => {
    return allNooraniItems.find((n) => n.id === selectedNooraniId) || null;
  }, [allNooraniItems, selectedNooraniId]);

  const currentArabicItem = useMemo(() => {
    return allArabicItems.find((a) => a.id === selectedArabicId) || null;
  }, [allArabicItems, selectedArabicId]);

  // Persistent Search and Cipher History
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [searchHistoryItems, setSearchHistoryItems] = useState<SearchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('cipher_search_history_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Migrate from old simple search history if present
      const oldSaved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (oldSaved) {
        const oldParsed = JSON.parse(oldSaved);
        if (Array.isArray(oldParsed) && oldParsed.length > 0) {
          return oldParsed.map((term: string, idx: number) => ({
            id: `legacy-${idx}-${Date.now()}`,
            word: typeof term === 'string' ? term : String(term),
            timestamp: Date.now() - idx * 60000,
            nooraniId: '1',
            nooraniName: 'منظومة 1',
            arabicId: '1',
            arabicName: 'منظومة 1',
            isFavorite: false,
          }));
        }
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'hist-init-1',
        word: 'طسم',
        timestamp: Date.now() - 3600000,
        nooraniId: '1',
        nooraniName: 'منظومة 1',
        arabicId: '1',
        arabicName: 'منظومة 1',
        isFavorite: true,
      },
      {
        id: 'hist-init-2',
        word: 'كهيعص',
        timestamp: Date.now() - 7200000,
        nooraniId: '1',
        nooraniName: 'منظومة 1',
        arabicId: '1',
        arabicName: 'منظومة 1',
        isFavorite: false,
      },
      {
        id: 'hist-init-3',
        word: 'سلام',
        timestamp: Date.now() - 10800000,
        nooraniId: '1',
        nooraniName: 'منظومة 1',
        arabicId: '1',
        arabicName: 'منظومة 1',
        isFavorite: false,
      },
    ];
  });

  // Save profile modal state
  const [isSaving, setIsSaving] = useState(false);
  const [saveNooraniName, setSaveNooraniName] = useState('');
  const [saveArabicName, setSaveArabicName] = useState('');
  
  // Full permutations collapse (Decryption)
  const [showAllPermutations, setShowAllPermutations] = useState(false);
  const [permutationSearch, setPermutationSearch] = useState('');

  // Full permutations collapse (Encryption)
  const [showAllEncPermutations, setShowAllEncPermutations] = useState(false);
  const [encPermutationSearch, setEncPermutationSearch] = useState('');

  // Handle copy
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const addToHistory = (word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;
    setSearchHistoryItems((prev) => {
      const existing = prev.find((item) => item.word === trimmed);
      const isFav = existing?.isFavorite || false;
      const filtered = prev.filter((item) => item.word !== trimmed);

      const newItem: SearchHistoryItem = {
        id: existing?.id || `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        word: trimmed,
        timestamp: Date.now(),
        nooraniId: selectedNooraniId || '1',
        nooraniName: currentNooraniItem?.name || activeNooraniPresetName || 'منظومة 1',
        arabicId: selectedArabicId || '1',
        arabicName: currentArabicItem?.name || activeArabicPresetName || 'منظومة 1',
        isNooraniReversed: isNooraniReversed,
        isArabicReversed: isArabicReversed,
        includeWaw: includeWawInAllLayers,
        isFavorite: isFav,
      };

      const updated = [newItem, ...filtered].slice(0, 50);
      try {
        localStorage.setItem('cipher_search_history_v2', JSON.stringify(updated));
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated.map((u) => u.word)));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setSearchHistoryItems([]);
    try {
      localStorage.removeItem('cipher_search_history_v2');
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch {
      // ignore
    }
  };

  const handleSelectHistoryItem = (item: SearchHistoryItem) => {
    setInputText(item.word);
    setSubmittedText(item.word);
    if (item.nooraniId) {
      applyNooraniDistribution(item.nooraniId);
    }
    if (item.arabicId) {
      applyArabicDistribution(item.arabicId);
    }
    if (typeof item.isNooraniReversed === 'boolean') {
      setIsNooraniReversed(item.isNooraniReversed);
    }
    if (typeof item.isArabicReversed === 'boolean') {
      setIsArabicReversed(item.isArabicReversed);
    }
    if (typeof item.includeWaw === 'boolean') {
      setIncludeWawInAllLayers(item.includeWaw);
    }
    setShowMultiSystemScanner(false);
    setIsHistoryDrawerOpen(false);
    buildShortShareUrl(true);
  };

  const handleToggleFavoriteHistoryItem = (id: string) => {
    setSearchHistoryItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      );
      try {
        localStorage.setItem('cipher_search_history_v2', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleDeleteHistoryItem = (id: string) => {
    setSearchHistoryItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('cipher_search_history_v2', JSON.stringify(updated));
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated.map((u) => u.word)));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [copiedSummaryLink, setCopiedSummaryLink] = useState(false);

  // Initialize state from URL params on mount if present
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const textParam = params.get('q') || params.get('text');
      const skyParam = params.get('s') || params.get('sky') || params.get('noorani');
      const earthParam = params.get('e') || params.get('earth') || params.get('arabic');
      const skyRevParam = params.get('skyRev') || params.get('sr');
      const earthRevParam = params.get('earthRev') || params.get('er');
      const scannerParam = params.get('scan') || params.get('scanner') || params.get('all');
      const wawParam = params.get('w') || params.get('waw');
      const viewParam = params.get('v') || params.get('view');

      if (textParam) {
        setInputText(textParam);
        setSubmittedText(textParam);
      }

      if (skyParam) {
        let isRev = skyRevParam === '1' || skyRevParam === 'true';
        let cleanSky = skyParam.trim();
        const expandedSky = getExpandedPresetId(cleanSky);
        if (expandedSky !== cleanSky) {
          cleanSky = expandedSky;
        } else if (cleanSky.endsWith('r')) {
          const baseShort = cleanSky.slice(0, -1);
          const expandedBase = getExpandedPresetId(baseShort);
          if (expandedBase !== baseShort) {
            cleanSky = expandedBase;
            isRev = true;
          }
        }
        // Fallback for legacy 'r' suffix if skyRevParam wasn't explicitly supplied
        if (
          !skyRevParam &&
          !isRev &&
          cleanSky.length > 1 &&
          cleanSky.toLowerCase().endsWith('r') &&
          !NOORANI_PRESETS[cleanSky] &&
          !Object.values(NOORANI_PRESETS).some((p) => p.id === cleanSky || p.name === cleanSky)
        ) {
          isRev = true;
          cleanSky = cleanSky.slice(0, -1).trim();
        }
        applyNooraniDistribution(cleanSky);
        setIsNooraniReversed(isRev);
      }

      if (earthParam) {
        let isRev = earthRevParam === '1' || earthRevParam === 'true';
        let cleanEarth = earthParam.trim();
        const expandedEarth = getExpandedPresetId(cleanEarth);
        if (expandedEarth !== cleanEarth) {
          cleanEarth = expandedEarth;
        } else if (cleanEarth.endsWith('r')) {
          const baseShort = cleanEarth.slice(0, -1);
          const expandedBase = getExpandedPresetId(baseShort);
          if (expandedBase !== baseShort) {
            cleanEarth = expandedBase;
            isRev = true;
          }
        }
        if (
          !earthRevParam &&
          !isRev &&
          cleanEarth.length > 1 &&
          cleanEarth.toLowerCase().endsWith('r') &&
          !ARABIC_PRESETS[cleanEarth] &&
          !Object.values(ARABIC_PRESETS).some((p) => p.id === cleanEarth || p.name === cleanEarth)
        ) {
          isRev = true;
          cleanEarth = cleanEarth.slice(0, -1).trim();
        }
        applyArabicDistribution(cleanEarth);
        setIsArabicReversed(isRev);
      }

      if (wawParam !== null) {
        setIncludeWawInAllLayers(wawParam !== '0' && wawParam !== 'false');
      }
      if (scannerParam === '1' || scannerParam === 'true') {
        setShowMultiSystemScanner(true);
      }
      if (viewParam) {
        if (viewParam === 'd' || viewParam === 'decrypt') {
          setViewMode('decrypt');
        } else if (viewParam === 'e' || viewParam === 'encrypt') {
          setViewMode('encrypt');
        } else if (viewParam === 'b' || viewParam === 'both') {
          setViewMode('both');
        }
      }
    } catch {
      // ignore URL parsing errors
    }
  }, []);

  // Listen for browser Back/Forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const textParam = params.get('q') || params.get('text') || '';
        const skyParam = params.get('s') || params.get('sky') || params.get('noorani');
        const earthParam = params.get('e') || params.get('earth') || params.get('arabic');
        const skyRevParam = params.get('skyRev') || params.get('sr');
        const earthRevParam = params.get('earthRev') || params.get('er');
        const scannerParam = params.get('scan') || params.get('scanner') || params.get('all');
        const wawParam = params.get('w') || params.get('waw');
        const viewParam = params.get('v') || params.get('view');

        setInputText(textParam);
        setSubmittedText(textParam);

        if (skyParam) {
          let isRev = skyRevParam === '1' || skyRevParam === 'true';
          let cleanSky = skyParam.trim();
          const expandedSky = getExpandedPresetId(cleanSky);
          if (expandedSky !== cleanSky) {
            cleanSky = expandedSky;
          } else if (cleanSky.endsWith('r')) {
            const baseShort = cleanSky.slice(0, -1);
            const expandedBase = getExpandedPresetId(baseShort);
            if (expandedBase !== baseShort) {
              cleanSky = expandedBase;
              isRev = true;
            }
          }
          applyNooraniDistribution(cleanSky);
          setIsNooraniReversed(isRev);
        }

        if (earthParam) {
          let isRev = earthRevParam === '1' || earthRevParam === 'true';
          let cleanEarth = earthParam.trim();
          const expandedEarth = getExpandedPresetId(cleanEarth);
          if (expandedEarth !== cleanEarth) {
            cleanEarth = expandedEarth;
          } else if (cleanEarth.endsWith('r')) {
            const baseShort = cleanEarth.slice(0, -1);
            const expandedBase = getExpandedPresetId(baseShort);
            if (expandedBase !== baseShort) {
              cleanEarth = expandedBase;
              isRev = true;
            }
          }
          applyArabicDistribution(cleanEarth);
          setIsArabicReversed(isRev);
        }

        if (wawParam !== null) {
          setIncludeWawInAllLayers(wawParam !== '0' && wawParam !== 'false');
        } else {
          setIncludeWawInAllLayers(true);
        }

        setShowMultiSystemScanner(scannerParam === '1' || scannerParam === 'true');

        if (viewParam) {
          if (viewParam === 'd' || viewParam === 'decrypt') {
            setViewMode('decrypt');
          } else if (viewParam === 'e' || viewParam === 'encrypt') {
            setViewMode('encrypt');
          } else {
            setViewMode('both');
          }
        } else {
          setViewMode('both');
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Construct ultra-short, highly readable share URL and sync with browser address bar/history
  const buildShortShareUrl = (pushHistory = false): string => {
    const url = new URL(window.location.origin + window.location.pathname);
    const text = submittedText.trim();
    if (text) {
      url.searchParams.set('q', text);
    }

    // Sky preset parameter
    let skyVal = '';
    const isStandardSky = currentNooraniItem && Object.values(NOORANI_PRESETS).some((p) => p.id === currentNooraniItem.id || p.name === currentNooraniItem.name);
    if (isStandardSky && currentNooraniItem) {
      skyVal = getShortPresetId(currentNooraniItem.id);
    } else {
      skyVal = [7, 6, 5, 4, 3, 2, 1]
        .map((num) => {
          const l = layers.find((x) => x.layer === num);
          return (l?.cipherLetters || []).filter(Boolean).join('');
        })
        .join('-');
    }

    if (skyVal) {
      if (isNooraniReversed) {
        skyVal += 'r';
      }
      url.searchParams.set('s', skyVal);
    }

    // Earth preset parameter
    let earthVal = '';
    const isStandardEarth = currentArabicItem && Object.values(ARABIC_PRESETS).some((p) => p.id === currentArabicItem.id || p.name === currentArabicItem.name);
    if (isStandardEarth && currentArabicItem) {
      earthVal = getShortPresetId(currentArabicItem.id);
    } else {
      earthVal = [7, 6, 5, 4, 3, 2, 1]
        .map((num) => {
          const l = layers.find((x) => x.layer === num);
          return (l?.arabicLetters || []).filter(Boolean).join('');
        })
        .join('-');
    }

    if (earthVal) {
      if (isArabicReversed) {
        earthVal += 'r';
      }
      url.searchParams.set('e', earthVal);
    }

    // Omit default flags (waw=1, view=b, sr=0, er=0) to keep URL ultra minimal
    if (!includeWawInAllLayers) {
      url.searchParams.set('w', '0');
    }
    if (showMultiSystemScanner) {
      url.searchParams.set('scan', '1');
    }
    if (viewMode === 'decrypt') {
      url.searchParams.set('v', 'd');
    } else if (viewMode === 'encrypt') {
      url.searchParams.set('v', 'e');
    }

    const fullUrlString = decodeURIComponent(url.toString());

    // Update browser address bar & push to history stack if search performed
    try {
      if (fullUrlString !== decodeURIComponent(window.location.href)) {
        if (pushHistory) {
          window.history.pushState({ q: text }, '', fullUrlString);
        } else {
          window.history.replaceState({ q: text }, '', fullUrlString);
        }
      }
    } catch {
      // ignore
    }

    return fullUrlString;
  };

  // Copy concise configuration URL to share with friends
  const handleCopyShareLink = () => {
    try {
      const shortUrl = buildShortShareUrl();
      navigator.clipboard.writeText(shortUrl);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2500);
    } catch (err) {
      console.warn('Share link copy error:', err);
    }
  };

  // Generate a rich, compact result summary string optimized for WhatsApp / Telegram
  const generateShareSummaryText = (): string => {
    const shortUrl = buildShortShareUrl();
    const word = submittedText.trim();
    if (!word) {
      return `🔐 التشفير العربي | نظام الطبقات السبع المتناظرة\n🔗 ${shortUrl}`;
    }

    const qCount = quranicMatches.length;
    const dictCount = arabicDictionaryMatches.length;

    let text = `🔐 التشفير العربي | النص: (${word})\n`;
    if (qCount > 0 || dictCount > 0) {
      text += `📖 المطابقات: ${qCount} قرآنية | ${dictCount} معجمية\n`;
    }
    text += `🔗 ${shortUrl}`;
    return text;
  };

  // Native share or copy formatted summary text
  const handleShareWithSummary = async () => {
    try {
      const summaryText = generateShareSummaryText();
      // Always write to clipboard first so user can paste immediately
      await navigator.clipboard.writeText(summaryText);
      setCopiedSummaryLink(true);
      setTimeout(() => setCopiedSummaryLink(false), 2500);

      // On mobile devices where native share is natural (WhatsApp, Telegram, etc.), invoke navigator.share
      const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && navigator.share) {
        await navigator.share({
          title: 'التشفير العربي',
          text: summaryText,
        });
      }
    } catch (err) {
      console.warn('Share summary handled:', err);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = importTablesFromJson(content);
        if (result.success) {
          setImportStatusMessage({ type: 'success', text: result.message });
          setTimeout(() => setImportStatusMessage(null), 5000);
        } else {
          setImportStatusMessage({ type: 'error', text: result.message });
          setTimeout(() => setImportStatusMessage(null), 6000);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const [showSaveCurrentSystemModal, setShowSaveCurrentSystemModal] = useState(false);
  const [multiScannerTrigger, setMultiScannerTrigger] = useState(0);

  const handleNormalSearchClick = () => {
    // Automatically close comprehensive scanner unconditionally when clicking normal search button
    setShowMultiSystemScanner(false);
    const targetText = inputText.trim() || submittedText.trim();
    if (targetText) {
      setSubmittedText(targetText);
      setInputText(targetText);
      addToHistory(targetText);
      buildShortShareUrl(true);
      if (onInputTextChange) {
        prevExternalRef.current = targetText;
        onInputTextChange(targetText);
      }
    }
  };

  const handleComprehensiveSearchClick = () => {
    const targetText = inputText.trim() || submittedText.trim();
    if (targetText) {
      setSubmittedText(targetText);
      setInputText(targetText);
      addToHistory(targetText);
      buildShortShareUrl(true);
      if (onInputTextChange) {
        prevExternalRef.current = targetText;
        onInputTextChange(targetText);
      }
    }
    setMultiScannerTrigger(Date.now());
    setShowMultiSystemScanner(true);
  };

  const handleEnterKey = () => {
    const trimmed = inputText.trim() || submittedText.trim();
    if (!trimmed) return;

    // Normal search on Enter: close scanner immediately and execute normal search
    setShowMultiSystemScanner(false);
    setSubmittedText(trimmed);
    addToHistory(trimmed);
    buildShortShareUrl(true);
    if (onInputTextChange) {
      prevExternalRef.current = trimmed;
      onInputTextChange(trimmed);
    }
  };

  const handleGenerate = handleNormalSearchClick;

  const handleSelectHistory = (term: string) => {
    const matched = searchHistoryItems.find((i) => i.word === term);
    if (matched) {
      handleSelectHistoryItem(matched);
    } else {
      setInputText(term);
      setSubmittedText(term);
      addToHistory(term);
      setShowMultiSystemScanner(false);
      buildShortShareUrl(true);
      if (onInputTextChange) {
        prevExternalRef.current = term;
        onInputTextChange(term);
      }
    }
  };

  // Global Ctrl+Enter shortcut for comprehensive search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleComprehensiveSearchClick();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [inputText, submittedText]);

  // Listener to reset to clean home state when user clicks title/logo
  useEffect(() => {
    const handleResetHome = () => {
      setInputText('');
      setSubmittedText('');
      setShowMultiSystemScanner(false);
      if (window.location.search) {
        window.history.pushState({}, '', window.location.pathname);
      }
      document.title = 'التشفير العربي – نظام الطبقات السبع المتناظرة';
    };
    window.addEventListener('app-reset-home', handleResetHome);
    return () => window.removeEventListener('app-reset-home', handleResetHome);
  }, []);

  const handleStartSave = () => {
    setSaveNooraniName(activeNooraniPresetName || 'ترتيب ك ن');
    setSaveArabicName(activeArabicPresetName || 'الفبائي');
    setIsSaving(true);
  };

  const handleSaveProfile = () => {
    if (!saveNooraniName.trim() || !saveArabicName.trim()) return;
    saveCurrentTable(saveNooraniName.trim(), saveArabicName.trim(), 'منظومة محفوظة من المترجم الذكي');
    setIsSaving(false);
  };

  // ------------------- NOORANI / ALPHABET SMART DETECTION -------------------
  // Analyzes the letters in the submitted search text (only upon Enter / Search button) to ensure zero lag while typing
  const activeLetters = useMemo(() => {
    const raw = (submittedText || '').trim();
    return raw.replace(/[^ء-ي]/g, '').split('');
  }, [submittedText]);

  const nooraniAnalysis = useMemo(() => {
    if (activeLetters.length === 0) return null;
    const nooraniChars = activeLetters.filter((c) => NOORANI_LETTERS_SET.has(c));
    const nonNooraniChars = activeLetters.filter((c) => !NOORANI_LETTERS_SET.has(c));
    const isPureNoorani = nonNooraniChars.length === 0;

    return {
      isPureNoorani,
      totalCount: activeLetters.length,
      nooraniCount: nooraniChars.length,
      nonNooraniCount: nonNooraniChars.length,
      recommendedMode: isPureNoorani ? ('decrypt' as const) : ('encrypt' as const),
    };
  }, [activeLetters]);

  // ------------------- ENCRYPTION ANALYSIS -------------------
  const encryptionDetails = useMemo(() => {
    return analyzeWord(submittedText, effectiveLayers);
  }, [submittedText, effectiveLayers]);

  const hasMissingArabic = encryptionDetails.length > 0 && encryptionDetails.some(d => d.layer === null && !d.isSpecialOrSpace);

  // Default cipher output (taking first available cipher letter for each layer)
  const primaryCipherOutput = useMemo(() => {
    return encryptionDetails.map(d => {
      if (d.isSpecialOrSpace) return d.originalChar;
      if (d.layer && d.layer.cipherLetters && d.layer.cipherLetters.length > 0) {
        const active = d.layer.cipherLetters.filter(c => Boolean(c) && c !== 'و');
        return active[0] || '?';
      }
      return '?';
    }).join('');
  }, [encryptionDetails]);

  // Encryption combinations (Tawafiq & Permutations of cipher options)
  const rawEncCombinations = useMemo(() => {
    if (encryptionDetails.length === 0 || hasMissingArabic) return [];
    return getAllCombinations(encryptionDetails, 1500, true);
  }, [encryptionDetails, hasMissingArabic]);

  // Processed encryption combinations (both normal and reversed)
  const processedEncCombinations = useMemo(() => {
    const list: { word: string; isReversed: boolean; original: string }[] = [];
    const seen = new Set<string>();
    for (const combo of rawEncCombinations) {
      if (!seen.has(combo)) {
        list.push({ word: combo, isReversed: false, original: combo });
        seen.add(combo);
      }
      const rev = combo.split('').reverse().join('');
      if (rev !== combo && !seen.has(rev)) {
        list.push({ word: rev, isReversed: true, original: combo });
        seen.add(rev);
      }
    }
    return list;
  }, [rawEncCombinations]);

  // ----------------- SEQUENTIAL SEARCH ENGINE (المصحف الشريف -> المعجم العربي) -----------------
  const [isDecryptSearching, setIsDecryptSearching] = useState<boolean>(false);
  const [decryptSearchPhase, setDecryptSearchPhase] = useState<'idle' | 'quran' | 'lexicon' | 'complete'>('idle');
  const [decryptProgress, setDecryptProgress] = useState<number>(0);
  const [decryptStatusText, setDecryptStatusText] = useState<string>('');
  const [streamedQuranicMatches, setStreamedQuranicMatches] = useState<{ word: string; meta: QuranicWordMeta; isReversed: boolean }[]>([]);
  const [streamedArabicMatches, setStreamedArabicMatches] = useState<{ word: string; isReversed: boolean; meta?: any }[]>([]);

  const [isEncSearching, setIsEncSearching] = useState<boolean>(false);
  const [encSearchPhase, setEncSearchPhase] = useState<'idle' | 'quran' | 'lexicon' | 'complete'>('idle');
  const [encProgress, setEncProgress] = useState<number>(0);
  const [encStatusText, setEncStatusText] = useState<string>('');
  const [streamedEncQuranicMatches, setStreamedEncQuranicMatches] = useState<{ word: string; meta: QuranicWordMeta; isReversed: boolean; original: string }[]>([]);
  const [streamedEncArabicMatches, setStreamedEncArabicMatches] = useState<{ word: string; isReversed: boolean; original: string; meta?: any }[]>([]);

  // Sequential Search Effect for Encryption
  useEffect(() => {
    let isCancelled = false;
    if (processedEncCombinations.length === 0) {
      setStreamedEncQuranicMatches([]);
      setStreamedEncArabicMatches([]);
      setEncSearchPhase('idle');
      setEncProgress(0);
      return;
    }

    const runSequentialEnc = async () => {
      setIsEncSearching(true);
      setEncSearchPhase('quran');
      setEncProgress(10);
      setEncStatusText('جاري مسح آيات المصحف الشريف وقواعد الرسم العثماني (الألف الخنجرية، التضعيف، السوابق)...');

      // Phase 1: Search Quranic Corpus & Orthography Rules (0% -> 50%)
      const qMatches = await quranicDictionary.searchQuranicWordsAsync(processedEncCombinations, (percent, item) => {
        if (!isCancelled) {
          setEncProgress(Math.round(percent * 0.5));
          if (item) setEncStatusText(`مسح قرآني: [${item}]`);
        }
      });

      if (isCancelled) return;

      // Emit Quranic matches to UI first!
      setStreamedEncQuranicMatches(qMatches);
      setEncProgress(50);
      setEncSearchPhase('lexicon');
      setEncStatusText('جاري مطابقة المعاجم العربية والجذور الصرفية والاشتقاق...');

      // Phase 2: Search Lexicon for non-quranic matches (50% -> 100%)
      const quranSet = new Set(qMatches.map((m) => m.word));
      const nonQuranic = processedEncCombinations.filter((c) => !quranSet.has(c.word));

      const dictMatches = await arabicDictionary.searchDictionaryAsync(nonQuranic, (percent, item) => {
        if (!isCancelled) {
          setEncProgress(50 + Math.round(percent * 0.5));
          if (item) setEncStatusText(`فحص معجمي: [${item}]`);
        }
      });

      if (isCancelled) return;

      setStreamedEncArabicMatches(dictMatches);
      setEncProgress(100);
      setEncSearchPhase('complete');
      setEncStatusText('اكتملت المطابقة القرآنية والمعجمية بنجاح');
      setIsEncSearching(false);
    };

    runSequentialEnc();

    return () => {
      isCancelled = true;
    };
  }, [processedEncCombinations]);

  // Exact Quranic matches for encryption combinations (derived from streamed results or immediate lookup)
  // Automatically sorted from most matching to least matching:
  // 1. Highest match confidence descending (100% direct exact matches first, then non-exact < 100%)
  // 2. Direct matches before reversed
  // 3. Occurrences descending
  const encQuranicMatches = useMemo(() => {
    return [...streamedEncQuranicMatches].sort((a, b) => {
      const targetA = a.meta.originalQuranicWord || a.meta.word || a.word;
      const targetB = b.meta.originalQuranicWord || b.meta.word || b.word;
      const isDirectA = !!a.meta.isDirectExact && a.word === targetA;
      const isDirectB = !!b.meta.isDirectExact && b.word === targetB;
      const confA = isDirectA ? 100 : Math.min(a.meta.confidence || 90, 95);
      const confB = isDirectB ? 100 : Math.min(b.meta.confidence || 90, 95);
      if (confB !== confA) {
        return confB - confA;
      }
      if (a.isReversed !== b.isReversed) {
        return a.isReversed ? 1 : -1;
      }
      return (b.meta.occurrences || 0) - (a.meta.occurrences || 0);
    });
  }, [streamedEncQuranicMatches]);

  // Nearest Quranic vocabulary matches for encryption combinations
  // Automatically sorted from most matching to least matching: highest similarity descending
  const encNearestQuranicMatches = useMemo(() => {
    const list: { combo: string; nearest: QuranicNearestMatch; isReversed: boolean; original: string }[] = [];
    const seen = new Set<string>();
    const exactSet = new Set(encQuranicMatches.map(m => m.word));
    let evaluated = 0;
    for (const item of processedEncCombinations) {
      if (evaluated >= 120) break;
      if (!exactSet.has(item.word) && !seen.has(item.word)) {
        const nearest = quranicDictionary.findClosestQuranicWord(item.word);
        if (nearest && nearest.similarity < 100 && nearest.similarity >= 45) {
          seen.add(item.word);
          list.push({ combo: item.word, nearest, isReversed: item.isReversed, original: item.original });
        }
        evaluated++;
      }
    }
    return list.sort((a, b) => {
      if (b.nearest.similarity !== a.nearest.similarity) {
        return b.nearest.similarity - a.nearest.similarity;
      }
      if (a.isReversed !== b.isReversed) {
        return a.isReversed ? 1 : -1;
      }
      return (b.nearest.occurrences || 0) - (a.nearest.occurrences || 0);
    }).slice(0, 25);
  }, [processedEncCombinations, encQuranicMatches]);

  // Confirmed Arabic dictionary matches for encryption combinations
  const encArabicDictionaryMatches = streamedEncArabicMatches;

  // Noorani openings / segmentation for the primary cipher output
  const encCipherSegmentation = useMemo(() => {
    if (!primaryCipherOutput || primaryCipherOutput.includes('?')) return null;
    return segmentIntoQuranicWords(primaryCipherOutput);
  }, [primaryCipherOutput]);

  // Filtered list of encryption permutations
  const filteredEncPermutations = useMemo(() => {
    if (!encPermutationSearch.trim()) return rawEncCombinations;
    const search = encPermutationSearch.trim();
    return rawEncCombinations.filter(w => w.includes(search));
  }, [rawEncCombinations, encPermutationSearch]);

  // ------------------- DECRYPTION ANALYSIS -------------------
  const cleanChars = useMemo(() => Array.from(cleanText(submittedText)), [submittedText]);

  const decodedItems = useMemo(() => {
    return cleanChars.map((char) => {
      if (char === ' ' || char === '\n' || char === '\t') {
        return {
          char,
          isSpace: true,
          matchingLayers: [] as typeof effectiveLayers,
          candidates: [] as string[],
        };
      }
      const matchingLayers = effectiveLayers.filter(
        (l) => Array.isArray(l.cipherLetters) && l.cipherLetters.filter(Boolean).includes(char)
      );
      const candidates = Array.from(
        new Set(matchingLayers.flatMap((l) => l.arabicLetters).filter(Boolean))
      );
      return {
        char,
        isSpace: false,
        matchingLayers,
        candidates,
      };
    });
  }, [cleanChars, effectiveLayers]);

  const meaningfulItems = useMemo(() => {
    return decodedItems.filter(d => !d.isSpace && d.matchingLayers.length > 0);
  }, [decodedItems]);

  const totalCombinationsCount = useMemo(() => {
    return meaningfulItems.length > 0
      ? meaningfulItems.reduce((acc, item) => acc * Math.max(1, item.candidates.length), 1)
      : 0;
  }, [meaningfulItems]);

  // Generate permutations (capped for instant zero-lag response)
  const rawCombinations = useMemo(() => {
    if (meaningfulItems.length === 0) return [];
    const results: string[] = [];
    const maxCombos = Math.min(totalCombinationsCount, 1500);

    function buildWord(index: number, current: string) {
      if (results.length >= maxCombos) return;
      if (index === meaningfulItems.length) {
        results.push(current);
        return;
      }
      const candidates = meaningfulItems[index].candidates;
      for (const char of candidates) {
        buildWord(index + 1, current + char);
        if (results.length >= maxCombos) return;
      }
    }

    buildWord(0, '');
    return results;
  }, [meaningfulItems, totalCombinationsCount]);

  // Sequential Search Effect for Decryption
  useEffect(() => {
    let isCancelled = false;
    if (rawCombinations.length === 0) {
      setStreamedQuranicMatches([]);
      setStreamedArabicMatches([]);
      setDecryptSearchPhase('idle');
      setDecryptProgress(0);
      return;
    }

    const runSequentialDecrypt = async () => {
      setIsDecryptSearching(true);
      setDecryptSearchPhase('quran');
      setDecryptProgress(10);
      setDecryptStatusText('جاري مسح آيات المصحف الشريف وقواعد الرسم العثماني (الألف الخنجرية، التضعيف، السوابق)...');

      const candidates: { word: string; isReversed: boolean }[] = [];
      const seen = new Set<string>();
      for (const word of rawCombinations) {
        if (!seen.has(word)) {
          candidates.push({ word, isReversed: false });
          seen.add(word);
        }
        const rev = word.split('').reverse().join('');
        if (rev !== word && !seen.has(rev)) {
          candidates.push({ word: rev, isReversed: true });
          seen.add(rev);
        }
      }

      // Phase 1: Search Quranic Corpus & Orthography Rules (0% -> 50%)
      const qMatches = await quranicDictionary.searchQuranicWordsAsync(candidates, (percent, item) => {
        if (!isCancelled) {
          setDecryptProgress(Math.round(percent * 0.5));
          if (item) setDecryptStatusText(`مسح قرآني: [${item}]`);
        }
      });

      if (isCancelled) return;

      // Emit Quranic matches to UI first!
      setStreamedQuranicMatches(qMatches);
      setDecryptProgress(50);
      setDecryptSearchPhase('lexicon');
      setDecryptStatusText('جاري البحث في المعجم العربي اللغوي والجذور الصرفية والاشتقاق...');

      // Phase 2: Search Lexicon for non-quranic matches (50% -> 100%)
      const quranSet = new Set(qMatches.map((m) => m.word));
      const nonQuranicCandidates = candidates.filter((c) => !quranSet.has(c.word));

      const dictMatches = await arabicDictionary.searchDictionaryAsync(nonQuranicCandidates, (percent, item) => {
        if (!isCancelled) {
          setDecryptProgress(50 + Math.round(percent * 0.5));
          if (item) setDecryptStatusText(`فحص معجمي: [${item}]`);
        }
      });

      if (isCancelled) return;

      setStreamedArabicMatches(dictMatches);
      setDecryptProgress(100);
      setDecryptSearchPhase('complete');
      setDecryptStatusText('اكتمل البحث والتحقق القرآني والمعجمي بنجاح');
      setIsDecryptSearching(false);
    };

    runSequentialDecrypt();

    return () => {
      isCancelled = true;
    };
  }, [rawCombinations]);

  // Quranic matches from sequential search
  // Automatically sorted from most matching to least matching:
  // 1. Highest match confidence descending (100% direct exact matches first, then non-exact < 100%)
  // 2. Direct matches before reversed
  // 3. Occurrences descending
  const quranicMatches = useMemo(() => {
    return [...streamedQuranicMatches].sort((a, b) => {
      const targetA = a.meta.originalQuranicWord || a.meta.word || a.word;
      const targetB = b.meta.originalQuranicWord || b.meta.word || b.word;
      const isDirectA = !!a.meta.isDirectExact && a.word === targetA;
      const isDirectB = !!b.meta.isDirectExact && b.word === targetB;
      const confA = isDirectA ? 100 : Math.min(a.meta.confidence || 90, 95);
      const confB = isDirectB ? 100 : Math.min(b.meta.confidence || 90, 95);
      if (confB !== confA) {
        return confB - confA;
      }
      if (a.isReversed !== b.isReversed) {
        return a.isReversed ? 1 : -1;
      }
      return (b.meta.occurrences || 0) - (a.meta.occurrences || 0);
    });
  }, [streamedQuranicMatches]);

  // Nearest Quranic vocabulary matches for decryption combinations
  const nearestQuranicMatches = useMemo(() => {
    const list: { combo: string; nearest: QuranicNearestMatch; isReversed: boolean; original: string }[] = [];
    const seen = new Set<string>();
    const exactSet = new Set(quranicMatches.map(m => m.word));
    let evaluated = 0;
    for (const item of rawCombinations) {
      if (evaluated >= 120) break;
      if (!exactSet.has(item) && !seen.has(item)) {
        const nearest = quranicDictionary.findClosestQuranicWord(item);
        if (nearest && nearest.similarity < 100 && nearest.similarity >= 45) {
          seen.add(item);
          list.push({ combo: item, nearest, isReversed: false, original: item });
        }
        evaluated++;
      }
      const rev = item.split('').reverse().join('');
      if (rev !== item && !exactSet.has(rev) && !seen.has(rev) && evaluated < 120) {
        const nearest = quranicDictionary.findClosestQuranicWord(rev);
        if (nearest && nearest.similarity < 100 && nearest.similarity >= 45) {
          seen.add(rev);
          list.push({ combo: rev, nearest, isReversed: true, original: item });
        }
        evaluated++;
      }
    }
    return list.sort((a, b) => {
      if (b.nearest.similarity !== a.nearest.similarity) {
        return b.nearest.similarity - a.nearest.similarity;
      }
      if (a.isReversed !== b.isReversed) {
        return a.isReversed ? 1 : -1;
      }
      return (b.nearest.occurrences || 0) - (a.nearest.occurrences || 0);
    }).slice(0, 25);
  }, [rawCombinations, quranicMatches]);

  // Arabic dictionary matches from sequential search
  const arabicDictionaryMatches = streamedArabicMatches;

  // Filtered list of permutations for researcher view
  const filteredPermutations = useMemo(() => {
    if (!permutationSearch.trim()) return rawCombinations;
    const search = permutationSearch.trim();
    return rawCombinations.filter(w => w.includes(search));
  }, [rawCombinations, permutationSearch]);

  // Active layers in submitted search text (only calculated on Enter or Search button)
  const activeLayersNumbers = useMemo(() => {
    const textToAnalyze = submittedText.trim();
    if (!textToAnalyze) return [];

    const chars = Array.from(cleanText(textToAnalyze)).filter((c) => c && c.trim() !== '');
    if (chars.length === 0) return [];

    const set = new Set<number>();
    const isNooraniInput = chars.every((c) => NOORANI_LETTERS_SET.has(c));

    chars.forEach((rawChar) => {
      const normChar = normalizeArabicChar(rawChar);
      effectiveLayers.forEach((l) => {
        if (isNooraniInput) {
          // Decryption: Match against sky / cipher letters
          const cSlots = (l.cipherLetters || []).filter(Boolean);
          if (cSlots.includes(rawChar) || cSlots.includes(normChar)) {
            set.add(l.layer);
          }
        } else {
          // Encryption: Match against earth / arabic letters
          const aSlots = (l.arabicLetters || []).filter(Boolean);
          if (
            aSlots.includes(rawChar) ||
            aSlots.includes(normChar) ||
            (rawChar === 'ا' && aSlots.includes('أ')) ||
            (normChar === 'أ' && aSlots.includes('ا'))
          ) {
            set.add(l.layer);
          }
        }
      });
    });

    return Array.from(set);
  }, [submittedText, effectiveLayers]);

  // Dynamic page title and OpenGraph metadata synchronization + Browser URL Address Bar Sync
  useEffect(() => {
    if (submittedText) {
      const pageTitle = `التشفير العربي – (${submittedText})`;
      document.title = pageTitle;

      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', pageTitle);
      }
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) {
        const qCount = quranicMatches.length;
        const dictCount = arabicDictionaryMatches.length;
        ogDesc.setAttribute(
          'content',
          `نتائج تشفير وتحليل الكلمة (${submittedText}) في المنظومة: ${qCount} مطابقة قرآنية | ${dictCount} كلمة معجمية.`
        );
      }

      // Sync browser address bar with replaceState for passive updates (native sharing & no history depth recursion)
      buildShortShareUrl(false);
    } else {
      document.title = 'التشفير العربي – نظام الطبقات السبع المتناظرة';
    }
  }, [submittedText, quranicMatches.length, arabicDictionaryMatches.length, activeNooraniPresetName, activeArabicPresetName, isNooraniReversed, isArabicReversed, includeWawInAllLayers, viewMode, showMultiSystemScanner]);


  const currentSystemSuggestedName = useMemo(() => {
    if (activeTableName) return activeTableName;
    const nName = currentNooraniItem ? `سماء ${currentNooraniItem.index}` : 'سماء';
    const aName = currentArabicItem ? `أرض ${currentArabicItem.index}` : 'أرض';
    return `${nName} مع ${aName}`;
  }, [activeTableName, currentNooraniItem, currentArabicItem]);

  const isCurrentSystemSaved = isSystemSaved(currentSystemSuggestedName);

  return (
    <div className="space-y-3 sm:space-y-3.5 max-w-6xl mx-auto">
      
      {/* 1. Direct Dual Profile Bar & Collapsible Quick Tools (اختيار السماء والأرض مباشرة مع زر المنظومات وزر الأدوات) */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-2 sm:p-2.5 shadow-2xs space-y-2 transition-all">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2">
          
          {/* Two Selectors: Sky (سماء) & Earth (أرض) directly visible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 flex-1 min-w-0">
            {/* Sky Selector */}
            <div className="flex items-center gap-1.5 min-w-0 bg-indigo-50/40 dark:bg-stone-850 p-1 rounded-lg border border-indigo-100 dark:border-indigo-950/80">
              <span className="text-2xs sm:text-xs font-semibold text-indigo-700 dark:text-indigo-400 shrink-0 flex items-center gap-1 ps-1 font-sans">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>سماء:</span>
              </span>
              <select
                value={selectedNooraniId}
                onChange={(e) => {
                  applyNooraniDistribution(e.target.value);
                }}
                onMouseEnter={() => setHintText('تحديد جدول السماء: اختيار توزيع الأحرف النورانية الـ 14 على الطبقات السبع')}
                onMouseLeave={clearHint}
                className="flex-1 min-w-0 text-xs font-medium py-1 px-1.5 rounded-md bg-white dark:bg-stone-800 border border-indigo-200 dark:border-indigo-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-sans"
                title="اختيار منظومة السماء (الأحرف النورانية)"
              >
                {allNooraniItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    سماء #{item.index}: {item.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsNooraniReversed(!isNooraniReversed)}
                onMouseEnter={() => setHintText(isNooraniReversed ? 'إلغاء عكس طبقات السماء (العودة للترتيب 1 إلى 7)' : 'عكس طبقات السماء (الترتيب 7 إلى 1)')}
                onMouseLeave={clearHint}
                className={`p-1.5 rounded-md border text-2xs font-medium transition-all shrink-0 cursor-pointer ${
                  isNooraniReversed
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                    : 'bg-white dark:bg-stone-800 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                }`}
                title={isNooraniReversed ? 'عكس طبقات السماء مفعل (7 إلى 1)' : 'انقر لعكس طبقات السماء'}
              >
                <ArrowDownUp className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Earth Selector */}
            <div className="flex items-center gap-1.5 min-w-0 bg-amber-50/40 dark:bg-stone-850 p-1 rounded-lg border border-amber-100 dark:border-amber-950/80">
              <span className="text-2xs sm:text-xs font-semibold text-amber-700 dark:text-amber-400 shrink-0 flex items-center gap-1 ps-1 font-sans">
                <Globe className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>أرض:</span>
              </span>
              <select
                value={selectedArabicId}
                onChange={(e) => {
                  applyArabicDistribution(e.target.value);
                }}
                onMouseEnter={() => setHintText('تحديد جدول الأرض: اختيار توزيع الأبجدية العربية الـ 28 (مشرقي / مغربي / بسملة)')}
                onMouseLeave={clearHint}
                className="flex-1 min-w-0 text-xs font-medium py-1 px-1.5 rounded-md bg-white dark:bg-stone-800 border border-amber-200 dark:border-amber-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer font-sans"
                title="اختيار منظومة الأرض (الأحرف الهجائية)"
              >
                {allArabicItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    أرض #{item.index}: {item.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsArabicReversed(!isArabicReversed)}
                onMouseEnter={() => setHintText(isArabicReversed ? 'إلغاء عكس طبقات الأرض (العودة للترتيب 1 إلى 7)' : 'عكس طبقات الأرض (الترتيب 7 إلى 1)')}
                onMouseLeave={clearHint}
                className={`p-1.5 rounded-md border text-2xs font-medium transition-all shrink-0 cursor-pointer ${
                  isArabicReversed
                    ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                    : 'bg-white dark:bg-stone-800 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
                title={isArabicReversed ? 'عكس طبقات الأرض مفعل (7 إلى 1)' : 'انقر لعكس طبقات الأرض'}
              >
                <ArrowDownUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action buttons on same row: [ مفكرة المنظومات ] and [ حفظ المنظومة ] and [ الأدوات ] */}
          <div className="flex items-center gap-1.5 justify-end shrink-0">
            {/* Open Systems Notebook Button (Icon Only) */}
            <button
              type="button"
              onClick={() => openDrawer('systems')}
              onMouseEnter={() => setHintText(`فتح مفكرة المنظومات (${savedSystems.length} منظومة محفوظة)`)}
              onMouseLeave={clearHint}
              className="p-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800 shadow-2xs relative"
              title="مفكرة المنظومات"
            >
              <BookMarked className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              {savedSystems.length > 0 && (
                <span className="font-mono text-3xs px-1 py-0.2 rounded-full bg-amber-500 text-white font-medium leading-none min-w-[14px] text-center absolute -top-1.5 -right-1.5 shadow-2xs">
                  {savedSystems.length}
                </span>
              )}
            </button>

            {/* Save Current System to Notebook Button (Icon Only) */}
            <button
              type="button"
              onClick={() => setShowSaveCurrentSystemModal(true)}
              onMouseEnter={() => setHintText('حفظ توزيع المنظومة الحالية (سماء وأرض) في المفكرة للرجوع إليها')}
              onMouseLeave={clearHint}
              className={`p-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                isCurrentSystemSaved
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-stone-50 dark:bg-stone-850 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-amber-300'
              }`}
              title="حفظ المنظومة الحالية في المفكرة"
            >
              <BookmarkPlus className={`w-3.5 h-3.5 ${isCurrentSystemSaved ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
            </button>

            {/* Collapsible Tools Toggle Button */}
            <button
              type="button"
              onClick={() => setShowToolsDrawer((prev) => !prev)}
              onMouseEnter={() => setHintText(showToolsDrawer ? 'إغلاق شريط أدوات المنظومة' : 'فتح أدوات المنظومة والمشاركة والتصدير والاستيراد')}
              onMouseLeave={clearHint}
              className={`p-1.5 rounded-lg border text-2xs font-medium transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                showToolsDrawer
                  ? 'bg-stone-800 text-white border-stone-900 dark:bg-stone-700 dark:border-stone-600'
                  : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
              }`}
              title="أدوات المنظومة والتصدير والمفكرة"
            >
              <Settings2 className="w-3.5 h-3.5" />
              {showToolsDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Collapsible Tools Bar (Icon-only buttons with tooltips) */}
        {showToolsDrawer && (
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 flex-wrap animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Copy Share Link */}
              <button
                type="button"
                onClick={handleCopyShareLink}
                className={`p-1.5 rounded-lg transition-all cursor-pointer border ${
                  copiedShareLink
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 border-stone-200 dark:border-stone-700'
                }`}
                title={copiedShareLink ? 'تم نسخ الرابط! ✓' : 'نسخ رابط مباشر للمنظومة والكلمة'}
              >
                {copiedShareLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Share Summary */}
              <button
                type="button"
                onClick={handleShareWithSummary}
                className={`p-1.5 rounded-lg transition-all cursor-pointer border ${
                  copiedSummaryLink
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-2xs'
                }`}
                title={copiedSummaryLink ? 'تم نسخ الملخص! ✓' : 'مشاركة ملخص الشيفرة والنتائج'}
              >
                {copiedSummaryLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              </button>

              {/* Open Notebook */}
              <button
                type="button"
                onClick={() => openDrawer('systems')}
                className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer relative"
                title="فتح مفكرة المنظومات والشيفرات"
              >
                <BookMarked className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                {savedSystems.length > 0 && (
                  <span className="absolute -top-1 -right-1 font-mono text-3xs px-1 py-0.1 rounded-full bg-amber-500 text-white font-black leading-none min-w-[14px] text-center">
                    {savedSystems.length}
                  </span>
                )}
              </button>

              {/* Open History Drawer */}
              <button
                type="button"
                onClick={() => setIsHistoryDrawerOpen((prev) => !prev)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer border relative ${
                  isHistoryDrawerOpen
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                    : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                }`}
                title="سجل الكلمات والمنظومات المستخدمة"
              >
                <History className={`w-3.5 h-3.5 ${isHistoryDrawerOpen ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
                {searchHistoryItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 font-mono text-3xs px-1 py-0.2 rounded-full bg-indigo-600 text-white font-black leading-none min-w-[14px] text-center">
                    {searchHistoryItems.length}
                  </span>
                )}
              </button>
            </div>

            {/* Export & Import Icon Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => exportCurrentTableAsTextFile()}
                className="p-1.5 rounded-lg text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                title="تصدير المنظومة كملف نصي (.txt)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => exportCurrentTableAsFile()}
                className="p-1.5 rounded-lg text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 transition-colors cursor-pointer"
                title="تصدير المنظومة كملف JSON"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" />
              </button>

              <input
                type="file"
                ref={importFileInputRef}
                onChange={handleImportFile}
                accept=".txt,.json"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => importFileInputRef.current?.click()}
                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer"
                title="استيراد منظومة (.txt أو .json)"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Notification Banner */}
      {importStatusMessage && (
        <div
          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 shadow-2xs animate-in fade-in slide-in-from-top-2 ${
            importStatusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
              : 'bg-rose-50 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {importStatusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <Eraser className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{importStatusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportStatusMessage(null)}
            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-xs px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Simplified Clean Search Card (مستطيل البحث المتكامل والأزرار المدمجة) */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-2.5 sm:p-3.5 shadow-2xs space-y-2.5">
        
        {/* Step A: Search Input Box with Inline Compact Search Buttons */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <DosBlinkBlockInput
              autoFocus={true}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onMouseEnter={() => setHintText('مربع إدخال الكلمة أو الشفرة: اكتب أو الصق النص ثم اضغط Enter للبحث والمطابقة الفورية')}
              onMouseLeave={clearHint}
              onFocus={() => {
                if (isDos) playDosBeep(980, 20);
                setHintText('مربع الإدخال النشط: اكتب كلمة أو شفرة نورانية ثم اضغط Enter');
              }}
              onBlur={clearHint}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (isDos) playDosBeep(880, 40);
                  if (e.ctrlKey || e.metaKey) {
                    handleComprehensiveSearchClick();
                  } else {
                    handleEnterKey();
                  }
                }
              }}
              placeholder={
                isDos
                  ? "C:\\> اكتب كلمة أو شفرة واضغط Enter..."
                  : "اكتب كلمة أو شفرة ثم اضغط Enter أو زر البحث..."
              }
              className="w-full text-sm sm:text-base font-medium py-2 sm:py-2.5 px-3 pe-8 ps-14 rounded-xl border border-stone-300 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50/50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 transition-all shadow-inner"
            />
            
            {/* Quick Action Controls Inside Input (Left Side in RTL) */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              {/* Paste Button */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                      const cleaned = text.trim();
                      setInputText(cleaned);
                      setSubmittedText(cleaned);
                      addToHistory(cleaned);
                      if (onInputTextChange) {
                        prevExternalRef.current = cleaned;
                        onInputTextChange(cleaned);
                      }
                    }
                  } catch (err) {
                    console.warn('Clipboard read error:', err);
                  }
                }}
                onMouseEnter={() => setHintText('لصق فوري للنص من الحافظة وبدء التحليل مباشرة')}
                onMouseLeave={clearHint}
                className="p-1 rounded-md text-stone-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                title="لصق مباشر ومسح السابق"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
              </button>

              {/* Clear Eraser Button */}
              {inputText && (
                <button
                  type="button"
                  onClick={() => {
                    setInputText('');
                    setSubmittedText('');
                    if (onInputTextChange) {
                      prevExternalRef.current = '';
                      onInputTextChange('');
                    }
                  }}
                  onMouseEnter={() => setHintText('مسح النص الحالي وإعادة تعيين حقل البحث')}
                  onMouseLeave={clearHint}
                  className="p-1 rounded-md text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  title="مسح النص"
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Normal Search Button (Icon Only - Saves space) */}
          <button
            type="button"
            onClick={handleGenerate}
            onMouseEnter={() => setHintText('تنفيذ البحث وفك التشفير ومطابقة القرآن والمعجم في المنظومة الحالية (Enter)')}
            onMouseLeave={clearHint}
            disabled={!showMultiSystemScanner && !inputText.trim() && !submittedText.trim()}
            className="p-2 sm:p-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 text-white transition-all shadow-xs flex items-center justify-center cursor-pointer shrink-0"
            title="بحث وفحص النص في المنظومة الحالية (Enter)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Comprehensive Search Button (Icon Only - Saves space) */}
          <button
            type="button"
            onClick={handleComprehensiveSearchClick}
            onMouseEnter={() => setHintText('الفحص الشامل: مسح الكلمة والشفرة عبر كافة المنظومات الـ 50+ دفعة واحدة (Ctrl + Enter)')}
            onMouseLeave={clearHint}
            disabled={!inputText.trim() && !submittedText.trim()}
            className={`p-2 sm:p-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center cursor-pointer shrink-0 min-w-[40px] min-h-[40px] ${
              showMultiSystemScanner
                ? 'bg-emerald-700 dark:bg-emerald-600 text-white ring-2 ring-emerald-400 dark:ring-emerald-500 shadow-sm'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white'
            }`}
            title="فحص شامل عبر كافة المنظومات الـ 50+ (Ctrl + Enter)"
            aria-label="فحص شامل عبر كافة المنظومات الـ 50+"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>

        {/* Step B: Sky Layers Bar (أزرار السماوات السبع ومسار التشفير - تصميم متكيف بنسبة 100%) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/60 shadow-2xs transition-all w-full max-w-full">
          {/* Row 1 on mobile / Left group on desktop */}
          <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
            {/* The 7 Sky Layers buttons in order 1 to 7 */}
            <CompactLayersIndicator activeLayerNumbers={activeLayersNumbers} customLayers={effectiveLayers} />

            {/* Mobile Waw Option */}
            <div className="flex items-center gap-1.5 shrink-0 sm:hidden font-sans">
              <label
                onMouseEnter={() => setHintText('تضمين حرف الواو (و) كعنصر رابط في جميع طبقات السماء السبع')}
                onMouseLeave={clearHint}
                className="inline-flex items-center gap-1 cursor-pointer select-none group px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                title="اعتبار حرف الواو (و) مع الأحرف السماوية (ن، ق، ص)"
              >
                <input
                  type="checkbox"
                  checked={includeWawInAllLayers}
                  onChange={(e) => setIncludeWawInAllLayers(e.target.checked)}
                  className="rounded border-stone-300 dark:border-stone-700 text-indigo-600 focus:ring-indigo-500 w-3 h-3 cursor-pointer"
                />
                <span className={`transition-colors text-3xs ${includeWawInAllLayers ? 'text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-stone-500'}`}>
                  +(و)
                </span>
              </label>
            </div>
          </div>

          {/* Row 2 on mobile / Right group on desktop */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto min-w-0 border-t sm:border-t-0 border-stone-200/80 dark:border-stone-800 pt-1 sm:pt-0">
            {/* Short Path Message */}
            {nooraniAnalysis ? (
              <div
                onMouseEnter={() => setHintText(nooraniAnalysis.isPureNoorani ? 'المدخل بأحرف نورانية: المسار التلقائي هو فك التشفير إلى معانٍ وألفاظ' : 'المدخل بأحرف هجائية: المسار التلقائي هو التشفير إلى حروف نورانية')}
                onMouseLeave={clearHint}
                className="flex items-center gap-1.5 font-medium text-xs text-stone-600 dark:text-stone-400 font-sans min-w-0 flex-wrap"
              >
                <span className="text-stone-500 text-2xs sm:text-xs shrink-0">المسار:</span>
                <span
                  className={`px-1.5 sm:px-2 py-0.5 rounded font-medium text-2xs sm:text-xs inline-flex items-center gap-1 shrink-0 ${
                    nooraniAnalysis.isPureNoorani
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                      : 'bg-amber-600 text-white dark:bg-amber-500'
                  }`}
                >
                  {nooraniAnalysis.isPureNoorani ? (
                    <>
                      <Unlock className="w-3 h-3" />
                      <span>فك تشفير</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>تشفير</span>
                    </>
                  )}
                </span>
                <span className="text-stone-500 text-2xs sm:text-xs truncate">
                  {nooraniAnalysis.isPureNoorani
                    ? `(${nooraniAnalysis.nooraniCount} نورانية)`
                    : `(${nooraniAnalysis.nonNooraniCount} هجائية)`}
                </span>

                {dictLoading && (
                  isDos ? (
                    <span className="font-mono text-2xs text-[#ffff55] bg-[#0000aa] px-1 ms-0.5 border border-[#55ffff]">
                      [WAIT {dictProgress}%]
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-2xs text-indigo-600 dark:text-indigo-400 font-medium animate-pulse ms-0.5 font-sans shrink-0">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>({dictProgress}%)</span>
                    </span>
                  )
                )}
              </div>
            ) : (
              <span className="text-2xs sm:text-xs text-stone-400 truncate font-sans">
                المسار: اكتب كلمة للتحليل
              </span>
            )}

            {/* Desktop Waw Option */}
            <div className="hidden sm:flex items-center gap-1.5 shrink-0 font-sans">
              <label
                onMouseEnter={() => setHintText('تضمين حرف الواو (و) كعنصر رابط في كافة طبقات السماء السبع')}
                onMouseLeave={clearHint}
                className="inline-flex items-center gap-1.5 cursor-pointer select-none group px-2 py-0.5 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-750 transition-colors"
                title="اعتبار حرف الواو (و) مع الأحرف السماوية (ن، ق، ص)"
              >
                <input
                  type="checkbox"
                  checked={includeWawInAllLayers}
                  onChange={(e) => setIncludeWawInAllLayers(e.target.checked)}
                  className="rounded border-stone-300 dark:border-stone-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span className={`transition-colors text-xs ${includeWawInAllLayers ? 'text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-stone-500 dark:text-stone-400 font-medium'}`}>
                  + (و) سماوي
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Multi-System Full Scanner UI (When triggered) */}
        {showMultiSystemScanner && (
          <div className="pt-2">
            <MultiSystemScanner
              initialQuery={submittedText || inputText}
              scanTrigger={multiScannerTrigger}
              includeWawInCelestial={includeWawInAllLayers}
              onToggleIncludeWaw={(val) => setIncludeWawInAllLayers(val)}
              onApplySystemPair={(nooraniId, arabicId, nooraniRev, arabicRev) => {
                applyNooraniDistribution(nooraniId);
                applyArabicDistribution(arabicId);
                setIsNooraniReversed(nooraniRev);
                setIsArabicReversed(arabicRev);
              }}
              onClose={() => setShowMultiSystemScanner(false)}
            />
          </div>
        )}

        {/* Step C: View Modes & Compact Swipable Recent Search History Pills */}
        <div className="pt-2 border-t border-stone-200/80 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 max-w-full overflow-hidden">
          {/* View Mode Toggle: Dual mode switcher (الكل / فك التشفير / التشفير) */}
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-850 p-1 rounded-xl text-xs font-medium self-start shrink-0 border border-stone-200/80 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setViewMode('both')}
              onMouseEnter={() => setHintText('عرض متزامن: إظهار فك التشفير والتشفير جنباً إلى جنب')}
              onMouseLeave={clearHint}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 min-h-[34px] ${
                viewMode === 'both'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
              title="عرض فك التشفير والتشفير جنباً إلى جنب مع تمييز المسار النشط"
              aria-label="عرض فك التشفير والتشفير معاً"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300" />
              <span className="text-2xs hidden xs:inline">الكل (فك وتشفير)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('decrypt')}
              onMouseEnter={() => setHintText('عرض فك التشفير فقط: تحويل الحروف النورانية إلى مفردات عربية وقرآنية مطابقة')}
              onMouseLeave={clearHint}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 min-h-[34px] ${
                viewMode === 'decrypt'
                  ? 'bg-white dark:bg-stone-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
              title="عرض نتائج فك التشفير فقط"
              aria-label="عرض نتائج فك التشفير فقط"
            >
              <Unlock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-2xs hidden xs:inline">فك التشفير</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('encrypt')}
              onMouseEnter={() => setHintText('عرض التشفير فقط: تحويل الكلمات العربية إلى شفرات نورانية مطابقة للطبقات')}
              onMouseLeave={clearHint}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 min-h-[34px] ${
                viewMode === 'encrypt'
                  ? 'bg-white dark:bg-stone-700 text-amber-700 dark:text-amber-300 shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
              title="عرض نتائج التشفير فقط"
              aria-label="عرض نتائج التشفير فقط"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-2xs hidden xs:inline">التشفير</span>
            </button>
          </div>

          {/* Interactive Compact History Container (Smooth swipable row without causing page horizontal scroll) */}
          <div className="flex items-center gap-1.5 min-w-0 max-w-full flex-1 justify-start sm:justify-end overflow-hidden">
            {/* History Drawer Toggle Button */}
            <button
              type="button"
              onClick={() => setIsHistoryDrawerOpen((prev) => !prev)}
              onMouseEnter={() => setHintText(`فتح سجل الكلمات الكامل (${searchHistoryItems.length} كلمة محفوظة في السجل)`)}
              onMouseLeave={clearHint}
              className={`p-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shrink-0 relative ${
                isHistoryDrawerOpen
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                  : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
              }`}
              title="فتح سجل الكلمات الكامل"
            >
              <History className={`w-3.5 h-3.5 ${isHistoryDrawerOpen ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
              {searchHistoryItems.length > 0 && (
                <span className="absolute -top-1 -right-1 font-mono text-2xs px-1 py-0.1 rounded-full bg-indigo-600 text-white font-semibold leading-none min-w-[12px] text-center">
                  {searchHistoryItems.length}
                </span>
              )}
            </button>

            {/* Smooth Swipable Single-Line Pills */}
            <div className="flex flex-nowrap items-center gap-1 overflow-x-auto min-w-0 max-w-full py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {searchHistoryItems.slice(0, 10).map((item) => {
                const itemChars = item.word.replace(/[^ء-ي]/g, '').split('');
                const isItemPureNoorani = itemChars.length > 0 && itemChars.every((c) => NOORANI_LETTERS_SET.has(c));

                return (
                  <button
                    key={`hist_pill_${item.id}`}
                    type="button"
                    onClick={() => handleSelectHistoryItem(item)}
                    onMouseEnter={() => setHintText(`سجل البحث: استرجاع الكلمة [${item.word}] وفحصها فوراً`)}
                    onMouseLeave={clearHint}
                    className={`text-xs font-medium px-2 py-0.5 rounded-md transition-all cursor-pointer shrink-0 inline-flex items-center gap-1 font-sans border whitespace-nowrap ${
                      submittedText === item.word
                        ? isItemPureNoorani
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-semibold'
                          : 'bg-amber-600 text-white border-amber-600 shadow-2xs font-semibold'
                        : isItemPureNoorani
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 border-amber-200 dark:border-amber-800 hover:border-amber-400'
                    }`}
                    title={`استرجاع: ${item.word}`}
                  >
                    {item.isFavorite && (
                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500 shrink-0" />
                    )}
                    <span>{item.word}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Dense Output Results Layout (توزيع متوازن لفك التشفير والتشفير جنباً إلى جنب مع إطار مميز للمسار النشط) */}
      {submittedText && !showMultiSystemScanner && (
        <div className={viewMode === 'both' ? "grid grid-cols-1 md:grid-cols-2 gap-4 items-start" : "space-y-4"}>

          {/* Column 1: Decryption Results (فك التشفير - Indigo Theme) */}
          {(viewMode === 'both' || viewMode === 'decrypt') && (() => {
            const isDecryptionActive = viewMode === 'decrypt' || (viewMode === 'both' && Boolean(nooraniAnalysis?.isPureNoorani));

            return (
              <div
                className={`bg-white dark:bg-stone-900 rounded-2xl p-4 shadow-sm space-y-3 transition-all duration-300 ${
                  isDecryptionActive
                    ? 'border-2 border-indigo-500 ring-4 ring-indigo-500/20 shadow-md bg-indigo-50/15 dark:bg-indigo-950/20 relative'
                    : 'border border-stone-200 dark:border-stone-800 opacity-80 hover:opacity-100 transition-opacity'
                }`}
              >
                {/* Active Path Header Banner */}
                {viewMode === 'both' && isDecryptionActive && (
                  <div className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                      <span>المسار المختار: فك التشفير (مدخل بأحرف نورانية)</span>
                    </div>
                    <span className="text-indigo-200 text-3xs font-mono">← اقرأ هنا</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-xs shadow-2xs font-bold">
                      <Unlock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 font-sans flex items-center gap-1.5">
                        <span>فك التشفير</span>
                        {isDecryptionActive && (
                          <span className="text-3xs px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 font-normal">
                            نشط
                          </span>
                        )}
                      </h3>
                      <p className="text-3xs text-stone-500 dark:text-stone-400">
                        استخراج الاحتمالات والمطابقات القرآنية والمعجمية
                      </p>
                    </div>
                  </div>

                  {onNavigateToDecrypt && (
                    <button
                      onClick={() => onNavigateToDecrypt(submittedText)}
                      className="p-1 rounded text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors inline-flex items-center cursor-pointer"
                      title="عرض فك التشفير في صفحة مخصصة"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sequential Search Progress Bar for Decryption */}
                {isDecryptSearching && (
                  <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-950 dark:text-indigo-200">
                        <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />
                        <span className="truncate">{decryptStatusText || 'جاري المسح المتتابع...'}</span>
                      </div>
                      <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 text-xs shrink-0">
                        {decryptProgress}%
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full bg-indigo-100 dark:bg-indigo-900/60 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 transition-all duration-300 rounded-full"
                        style={{ width: `${decryptProgress}%` }}
                      />
                    </div>

                    {/* 2 Sequential Stages */}
                    <div className="grid grid-cols-2 gap-1.5 text-3xs pt-0.5">
                      <div
                        className={`flex items-center justify-between px-2 py-1 rounded-lg border transition-all ${
                          decryptSearchPhase === 'quran'
                            ? 'bg-indigo-100/90 dark:bg-indigo-900/80 border-indigo-400 text-indigo-950 dark:text-indigo-100 font-bold shadow-2xs'
                            : quranicMatches.length > 0 || decryptProgress >= 50
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-medium'
                            : 'bg-stone-100 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-500'
                        }`}
                      >
                        <span>١. مسح المصحف وقواعد الرسم</span>
                        <span>{decryptSearchPhase === 'quran' ? '⏳ جاري' : `✅ (${quranicMatches.length})`}</span>
                      </div>

                      <div
                        className={`flex items-center justify-between px-2 py-1 rounded-lg border transition-all ${
                          decryptSearchPhase === 'lexicon'
                            ? 'bg-indigo-100/90 dark:bg-indigo-900/80 border-indigo-400 text-indigo-950 dark:text-indigo-100 font-bold shadow-2xs'
                            : decryptSearchPhase === 'complete'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-medium'
                            : 'bg-stone-100 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-400'
                        }`}
                      >
                        <span>٢. المعجم اللغوي والجذور</span>
                        <span>
                          {decryptSearchPhase === 'lexicon'
                            ? '⏳ جاري'
                            : decryptSearchPhase === 'complete'
                            ? `✅ (${arabicDictionaryMatches.length})`
                            : '⏱️ بالانتظار'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Exact Quranic Matches with Interactive Ayah Accordion */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4
                      onMouseEnter={() => setHintText(`المفردات القرآنية المتطابقة كلياً (${quranicMatches.length} مفردة) مع نصوص الآيات والرسم العثماني`)}
                      onMouseLeave={clearHint}
                      className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5 cursor-default"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>مفردات قرآنية مطابقة ({quranicMatches.length})</span>
                    </h4>
                    <span className="text-3xs text-stone-500 dark:text-stone-400">
                      اضغط على المفردة لفتح الآية الكريمة
                    </span>
                  </div>

                  {quranicMatches.length === 0 ? (
                    <div className="py-3 px-3 bg-stone-50/60 dark:bg-stone-950/40 rounded-xl border border-stone-200 dark:border-stone-800 text-xs text-stone-500 text-center font-normal">
                      {isDecryptSearching && decryptSearchPhase === 'quran'
                        ? 'جاري فحص المصحف الشريف والرسم العثماني...'
                        : 'لا توجد ألفاظ قرآنية مباشرة من هذه التوليفة'}
                    </div>
                  ) : (
                    <div className="space-y-1.5 w-full">
                      {quranicMatches.map((item, idx) => {
                        const itemKey = `dec_q_${idx}`;
                        const isExpanded = expandedQuranicKey === itemKey;
                        const isCopied = copiedText === itemKey;
                        const targetWord = item.meta.originalQuranicWord || item.meta.word || item.word;
                        const isDirectExact = !!item.meta.isDirectExact && item.word === targetWord;
                        const displayPercentage = isDirectExact ? 100 : Math.min(item.meta.confidence || 90, 95);
                        const displayText = isDirectExact ? item.word : `${item.word} = ${targetWord}`;
                        const ayahInfo = quranicDictionary.getAyahForWord(targetWord, item.meta.surahName, item.meta.ayahNum);
                        const fullAyahText = ayahInfo?.ayahText || item.meta.ayahText || item.meta.sampleAyahText || '';
                        const surahName = ayahInfo?.surahName || item.meta.surahName || 'القرآن الكريم';
                        const ayahNum = ayahInfo?.ayahNum || item.meta.ayahNum || 1;
                        const isCopiedAyah = copiedText === `ayah_${itemKey}`;
                        const url = getQuranTopWordUrl(targetWord, item.meta.surahNumber, ayahNum, item.meta.occurrences);

                        return (
                          <div
                            key={`quran_${item.word}_${idx}`}
                            onMouseEnter={() => setHintText(isDirectExact ? `لفظ قرآني مباشر (100%): [${item.word}] في سورة ${surahName} الآية [${ayahNum}] - انقر لعرض الآية الكاملة` : `${item.meta.matchRule || 'لفظ قرآني مقارِب'}: (${displayText}) بنسبة تطابق ${displayPercentage}% في سورة ${surahName} [الآية ${ayahNum}]`)}
                            onMouseLeave={clearHint}
                            className="flex flex-col rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/30 overflow-hidden shadow-2xs transition-all"
                          >
                            {/* Card Summary Header (Clickable to toggle accordion) */}
                            <div
                              onClick={() => toggleQuranicAccordion(itemKey)}
                              className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors select-none ${
                                isExpanded
                                  ? 'bg-indigo-100/90 dark:bg-indigo-900/60 border-b border-indigo-200 dark:border-indigo-800'
                                  : 'hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`text-3xs font-mono font-bold px-1.5 py-0.5 rounded shadow-2xs shrink-0 ${
                                    isDirectExact
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-indigo-200/90 dark:bg-indigo-900/90 text-indigo-950 dark:text-indigo-200'
                                  }`}
                                >
                                  {displayPercentage}%
                                </span>
                                <span className="text-sm font-bold font-quran text-indigo-950 dark:text-indigo-100 leading-tight">
                                  {displayText}
                                </span>
                                {isCopied && (
                                  <span className="text-3xs text-emerald-600 dark:text-emerald-400 font-normal">
                                    تم النسخ
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                {item.isReversed && (
                                  <RotateCcw
                                    className="w-3 h-3 text-rose-500 dark:text-rose-400 shrink-0"
                                    title="معكوس الكلمة"
                                  />
                                )}
                                <button
                                  type="button"
                                  onClick={() => toggleQuranicAccordion(itemKey)}
                                  onMouseEnter={() => setHintText(isExpanded ? 'إغلاق عرض نص الآية الكريمة' : 'عرض نص الآية الكريمة كاملة مع تمييز الموضع')}
                                  onMouseLeave={clearHint}
                                  className="p-1 rounded-md text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200/60 dark:hover:bg-indigo-800/60 transition-colors cursor-pointer"
                                  title={isExpanded ? "إغلاق الآية" : "عرض الآية الكريمة كاملة"}
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(targetWord, itemKey)}
                                  onMouseEnter={() => setHintText(`نسخ الكلمة [${targetWord}] إلى الحافظة`)}
                                  onMouseLeave={clearHint}
                                  className="p-1 text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                                  title="نسخ الكلمة"
                                >
                                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                <AddToNotebookButton
                                  word={submittedText}
                                  cipher={item.word}
                                  systemName={activeTableName}
                                  surahInfo={surahName}
                                  ayahNum={ayahNum}
                                  isReversed={item.isReversed}
                                  type="quranic"
                                  variant="icon-only"
                                />
                              </div>
                            </div>

                            {/* Accordion Expanded Content (Full Ayah display with highlighted word) */}
                            {isExpanded && (
                              <div className="p-3 bg-white/90 dark:bg-stone-900/90 space-y-2.5 animate-in fade-in zoom-in-95 duration-150 border-t border-indigo-100 dark:border-indigo-900">
                                <div className="flex items-center justify-between text-2xs">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md font-semibold text-2xs bg-indigo-600 text-white">
                                      سورة {surahName} — الآية [{ayahNum}]
                                    </span>
                                    {item.meta.occurrences > 0 && (
                                      <span className="text-stone-500 text-3xs">
                                        (تكرار اللفظ: {item.meta.occurrences} مرة في القرآن)
                                      </span>
                                    )}
                                    {item.meta.matchRule && (
                                      <span className="text-amber-700 dark:text-amber-300 text-3xs font-medium">
                                        • {item.meta.matchRule}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {fullAyahText ? (
                                  <div className="font-quran text-base sm:text-lg leading-loose text-center text-stone-900 dark:text-stone-100 p-3 rounded-xl bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 select-text">
                                    {highlightWordInAyah(
                                      fullAyahText,
                                      targetWord,
                                      'bg-indigo-200 dark:bg-indigo-900 text-indigo-950 dark:text-indigo-100 border border-indigo-400'
                                    )}
                                    <span className="text-amber-600 dark:text-amber-400 font-bold ms-1.5">
                                      ﴿{ayahNum}﴾
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-xs text-stone-500 text-center py-2">
                                    المفردة واردة في سورة {surahName} الآية {ayahNum}
                                  </div>
                                )}

                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-200/60 dark:border-stone-800 text-xs">
                                  <div className="flex items-center gap-1.5">
                                    {fullAyahText && (
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(fullAyahText, `ayah_${itemKey}`)}
                                        onMouseEnter={() => setHintText('نسخ نص الآية الكريمة كاملة مع رقمها')}
                                        onMouseLeave={clearHint}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer text-2xs font-medium"
                                        title="نسخ الآية الكريمة كاملة"
                                      >
                                        {isCopiedAyah ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                        <span>{isCopiedAyah ? 'تم نسخ الآية' : 'نسخ الآية'}</span>
                                      </button>
                                    )}
                                  </div>

                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onMouseEnter={() => setHintText('فتح صفحة الآية في المصحف الإلكتروني القرآني')}
                                    onMouseLeave={clearHint}
                                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline text-2xs font-medium"
                                    title="عرض الآية في المصحف الإلكتروني"
                                  >
                                    <span>عرض في المصحف</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Nearest Quranic Vocabulary Matches (أقرب المفردات القرآنية شبهاً) */}
                <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={toggleNearestQuranicOpen}
                    onMouseEnter={() => setHintText(`أقرب الألفاظ القرآنية شبهاً بالاحتمالات (${nearestQuranicMatches.length} مفردة) مع نسبة التشابه وسياق الآيات`)}
                    onMouseLeave={clearHint}
                    className="w-full flex items-center justify-between py-1 px-1 rounded-lg hover:bg-stone-100/70 dark:hover:bg-stone-800/60 transition-colors cursor-pointer text-start"
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                        أقرب المفردات القرآنية شبهاً ({nearestQuranicMatches.length})
                      </h4>
                    </div>
                    {isNearestQuranicOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                    )}
                  </button>

                  {isNearestQuranicOpen && (
                    nearestQuranicMatches.length === 0 ? (
                      <div className="py-2.5 px-3 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50 text-xs text-stone-500 text-center">
                        {isDecryptSearching ? 'جاري فحص أقرب المفردات القرآنية شبهاً...' : 'لا توجد ألفاظ قرآنية قريبة بنسبة تقارب تتجاوز 45%'}
                      </div>
                    ) : (
                      <div className="space-y-1.5 pt-1">
                        {nearestQuranicMatches.map((item, idx) => {
                          const itemKey = `dec_near_${idx}`;
                          const isExpanded = expandedQuranicKey === itemKey;
                          const isCopied = copiedText === itemKey;
                          const ayahInfo = quranicDictionary.getAyahForWord(item.nearest.word, item.nearest.surahName, item.nearest.ayahNum);
                          const fullAyahText = ayahInfo?.ayahText || item.nearest.ayahText || item.nearest.sampleAyahText || '';
                          const surahName = ayahInfo?.surahName || item.nearest.surahName || 'القرآن الكريم';
                          const ayahNum = ayahInfo?.ayahNum || item.nearest.ayahNum || 1;
                          const isCopiedAyah = copiedText === `ayah_${itemKey}`;
                          const url = getQuranTopWordUrl(item.nearest.word, item.nearest.surahNumber, ayahNum);

                          return (
                            <div
                              key={`dec_near_${item.combo}_${idx}`}
                              onMouseEnter={() => setHintText(`لفظ قرآني قريب: [${item.nearest.word}] بنسبة تطابق ${Math.round(item.nearest.similarity)}% (${item.combo} = ${item.nearest.word}) - انقر لفتح الآية الكريمة`)}
                              onMouseLeave={clearHint}
                              className="flex flex-col rounded-xl border border-indigo-200/70 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/30 overflow-hidden shadow-2xs transition-all"
                            >
                              <div
                                onClick={() => toggleQuranicAccordion(itemKey)}
                                className={`px-3 py-1.5 flex items-center justify-between gap-1.5 cursor-pointer transition-colors select-none ${
                                  isExpanded
                                    ? 'bg-indigo-100/90 dark:bg-indigo-900/60 border-b border-indigo-200 dark:border-indigo-800'
                                    : 'hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-3xs font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-200/90 dark:bg-indigo-900/90 text-indigo-950 dark:text-indigo-200 shrink-0">
                                    {Math.round(item.nearest.similarity)}%
                                  </span>
                                  <span className="font-bold font-quran text-stone-900 dark:text-stone-100 text-xs sm:text-sm tracking-wide">
                                    {item.combo} = {item.nearest.word}
                                  </span>
                                  {isCopied && (
                                    <span className="text-3xs text-emerald-600 dark:text-emerald-400 font-normal">
                                      تم النسخ
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {item.isReversed && (
                                    <RotateCcw className="w-2.5 h-2.5 text-rose-500 dark:text-rose-400 shrink-0" title="معكوس" />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => toggleQuranicAccordion(itemKey)}
                                    onMouseEnter={() => setHintText(isExpanded ? 'إغلاق الآية' : 'عرض سياق الآية الكريمة')}
                                    onMouseLeave={clearHint}
                                    className="p-1 rounded text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200/60 dark:hover:bg-indigo-800/60 transition-colors cursor-pointer"
                                    title={isExpanded ? "إغلاق الآية" : "عرض الآية الكريمة"}
                                  >
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(item.nearest.word, itemKey)}
                                    onMouseEnter={() => setHintText(`نسخ اللفظ القرآني [${item.nearest.word}]`)}
                                    onMouseLeave={clearHint}
                                    className="p-1 rounded text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                                    title="نسخ الكلمة"
                                  >
                                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                  <AddToNotebookButton
                                    word={submittedText}
                                    cipher={item.nearest.word}
                                    systemName={activeTableName}
                                    surahInfo={surahName}
                                    ayahNum={ayahNum}
                                    isReversed={item.isReversed}
                                    type="quranic"
                                    variant="icon-only"
                                  />
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="p-3 bg-white/90 dark:bg-stone-900/90 space-y-2.5 animate-in fade-in zoom-in-95 duration-150 border-t border-indigo-100 dark:border-indigo-900">
                                  <div className="flex items-center justify-between text-2xs">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="px-2 py-0.5 rounded-md font-semibold text-2xs bg-indigo-600 text-white">
                                        سورة {surahName} — الآية [{ayahNum}]
                                      </span>
                                      <span className="text-3xs text-stone-500">
                                        نسبة التقارب الصوتي: {item.nearest.similarity}%
                                      </span>
                                    </div>
                                  </div>

                                  {fullAyahText ? (
                                    <div className="font-quran text-base sm:text-lg leading-loose text-center text-stone-900 dark:text-stone-100 p-3 rounded-xl bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 select-text">
                                      {highlightWordInAyah(
                                        fullAyahText,
                                        item.nearest.word,
                                        'bg-indigo-200 dark:bg-indigo-900 text-indigo-950 dark:text-indigo-100 border border-indigo-400'
                                      )}
                                      <span className="text-amber-600 dark:text-amber-400 font-bold ms-1.5">
                                        ﴿{ayahNum}﴾
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-stone-500 text-center py-2">
                                      المفردة واردة في سورة {surahName} الآية {ayahNum}
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-200/60 dark:border-stone-800 text-xs">
                                    <div className="flex items-center gap-1.5">
                                      {fullAyahText && (
                                        <button
                                          type="button"
                                          onClick={() => handleCopy(fullAyahText, `ayah_${itemKey}`)}
                                          onMouseEnter={() => setHintText('نسخ نص الآية الكريمة كاملة')}
                                          onMouseLeave={clearHint}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer text-2xs font-medium"
                                          title="نسخ الآية الكريمة كاملة"
                                        >
                                          {isCopiedAyah ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                          <span>{isCopiedAyah ? 'تم نسخ الآية' : 'نسخ الآية'}</span>
                                        </button>
                                      )}
                                    </div>

                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onMouseEnter={() => setHintText('عرض موقع المفردة في المصحف الإلكتروني')}
                                      onMouseLeave={clearHint}
                                      className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline text-2xs font-medium"
                                      title="عرض الآية في المصحف الإلكتروني"
                                    >
                                      <span>عرض في المصحف</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>

                {/* Confirmed Arabic Lexicon Matches with Root and Category */}
                {(arabicDictionaryMatches.length > 0 || isDecryptSearching) && (
                  <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <h4
                      onMouseEnter={() => setHintText(`المطابقات المعجمية العربية الموثقة (${arabicDictionaryMatches.length} مفردة) مع الجذور والأوزان الصرفية`)}
                      onMouseLeave={clearHint}
                      className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between gap-1 cursor-default"
                    >
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>مطابقات معجمية ولغوية ({arabicDictionaryMatches.length})</span>
                      </div>
                      {isDecryptSearching && decryptSearchPhase === 'lexicon' && (
                        <span className="inline-flex items-center gap-1 text-3xs font-normal text-indigo-600 dark:text-indigo-400 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                          <span>جاري البحث المعجمي...</span>
                        </span>
                      )}
                    </h4>

                    {arabicDictionaryMatches.length === 0 && isDecryptSearching && decryptSearchPhase === 'lexicon' ? (
                      <div className="py-2 px-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between gap-1 text-xs text-indigo-900 dark:text-indigo-200 animate-pulse">
                        <span>جاري فحص المعجم العربي والجذور...</span>
                        <span className="font-mono bg-indigo-200/60 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded">
                          {decryptProgress}%
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 w-full p-2 rounded-xl bg-stone-50/50 dark:bg-stone-950/40 border border-stone-200/60 dark:border-stone-800 max-h-40 overflow-y-auto">
                        {arabicDictionaryMatches.slice(0, 50).map((item, idx) => (
                          <div
                            key={`dict_${item.word}_${idx}`}
                            onMouseEnter={() => setHintText(`مفردة معجمية: [${item.word}] - الجذر: [${item.meta?.root || '—'}]`)}
                            onMouseLeave={clearHint}
                            className="px-2 py-1 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-normal hover:scale-102 transition-all inline-flex items-center gap-1 shadow-2xs"
                          >
                            <button
                              type="button"
                              onClick={() => handleCopy(item.word, `d_${idx}`)}
                              className="inline-flex items-center gap-1 cursor-pointer font-quran text-xs font-medium"
                              title="انقر لنسخ الكلمة"
                            >
                              <span>{item.word}</span>
                              {item.meta?.root && (
                                <span className="text-3xs text-indigo-600 dark:text-indigo-400 font-sans opacity-80">
                                  ({item.meta.root})
                                </span>
                              )}
                              {item.isReversed && (
                                <RotateCcw
                                  className="w-2.5 h-2.5 text-rose-500 dark:text-rose-400 shrink-0"
                                  title="معكوس الكلمة"
                                />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.word, `d_${idx}`)}
                              onMouseEnter={() => setHintText(`نسخ المفردة [${item.word}]`)}
                              onMouseLeave={clearHint}
                              className="text-stone-400 hover:text-indigo-600 transition-colors p-0.5"
                              title="نسخ"
                            >
                              {copiedText === `d_${idx}` ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Column 2: Encryption Results (التشفير - Amber Theme) */}
          {(viewMode === 'both' || viewMode === 'encrypt') && (() => {
            const isEncryptionActive = viewMode === 'encrypt' || (viewMode === 'both' && !Boolean(nooraniAnalysis?.isPureNoorani));

            return (
              <div
                className={`bg-white dark:bg-stone-900 rounded-2xl p-4 shadow-sm space-y-3 transition-all duration-300 ${
                  isEncryptionActive
                    ? 'border-2 border-amber-500 ring-4 ring-amber-500/20 shadow-md bg-amber-50/15 dark:bg-amber-950/20 relative'
                    : 'border border-stone-200 dark:border-stone-800 opacity-80 hover:opacity-100 transition-opacity'
                }`}
              >
                {/* Active Path Header Banner */}
                {viewMode === 'both' && isEncryptionActive && (
                  <div className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-semibold flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-200 animate-pulse" />
                      <span>المسار المختار: التشفير (مدخل بأحرف هجائية)</span>
                    </div>
                    <span className="text-amber-200 text-3xs font-mono">← اقرأ هنا</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xs shadow-2xs font-bold">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 font-sans flex items-center gap-1.5">
                        <span>التشفير</span>
                        {isEncryptionActive && (
                          <span className="text-3xs px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-900/70 text-amber-700 dark:text-amber-300 font-normal">
                            نشط
                          </span>
                        )}
                      </h3>
                      <p className="text-3xs text-stone-500 dark:text-stone-400">
                        تحويل الأحرف إلى رموز السماوات السبع وتوليد المقابلات
                      </p>
                    </div>
                  </div>

                  {onNavigateToEncrypt && (
                    <button
                      onClick={() => onNavigateToEncrypt(submittedText)}
                      className="p-1 rounded text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors inline-flex items-center cursor-pointer"
                      title="عرض التشفير في صفحة مخصصة"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sequential Search Progress Bar for Encryption */}
                {isEncSearching && (
                  <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950 dark:text-amber-200">
                        <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
                        <span className="truncate">{encStatusText || 'جاري المسح المتتابع للتشفير...'}</span>
                      </div>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-300 text-xs shrink-0">
                        {encProgress}%
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full bg-amber-100 dark:bg-amber-900/60 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 transition-all duration-300 rounded-full"
                        style={{ width: `${encProgress}%` }}
                      />
                    </div>

                    {/* 2 Sequential Stages */}
                    <div className="grid grid-cols-2 gap-1.5 text-3xs pt-0.5">
                      <div
                        className={`flex items-center justify-between px-2 py-1 rounded-lg border transition-all ${
                          encSearchPhase === 'quran'
                            ? 'bg-amber-100/90 dark:bg-amber-900/80 border-amber-400 text-amber-950 dark:text-amber-100 font-bold shadow-2xs'
                            : encQuranicMatches.length > 0 || encProgress >= 50
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-medium'
                            : 'bg-stone-100 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-500'
                        }`}
                      >
                        <span>١. مسح المصحف وقواعد الرسم</span>
                        <span>{encSearchPhase === 'quran' ? '⏳ جاري' : `✅ (${encQuranicMatches.length})`}</span>
                      </div>

                      <div
                        className={`flex items-center justify-between px-2 py-1 rounded-lg border transition-all ${
                          encSearchPhase === 'lexicon'
                            ? 'bg-amber-100/90 dark:bg-amber-900/80 border-amber-400 text-amber-950 dark:text-amber-100 font-bold shadow-2xs'
                            : encSearchPhase === 'complete'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-medium'
                            : 'bg-stone-100 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-400'
                        }`}
                      >
                        <span>٢. المعجم اللغوي والجذور</span>
                        <span>
                          {encSearchPhase === 'lexicon'
                            ? '⏳ جاري'
                            : encSearchPhase === 'complete'
                            ? `✅ (${encArabicDictionaryMatches.length})`
                            : '⏱️ بالانتظار'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {hasMissingArabic ? (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-center text-xs font-normal text-rose-700 dark:text-rose-300">
                    بعض أحرف هذه الكلمة غير موجودة في جدول التشفير الحالي.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Dense Letter Breakdown with Color Micro Tiles */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {encryptionDetails.map((detail, idx) => {
                        if (detail.isSpecialOrSpace) return null;
                        const layerNum = detail.layer ? detail.layer.layer : 0;
                        const color = LAYER_RAINBOW_COLORS[layerNum] || {
                          name: 'رمادي',
                          activeBg: 'bg-stone-800',
                          activeText: 'text-white',
                          activeBorder: 'border-stone-900',
                        };
                        const ciphers = detail.layer
                          ? (detail.layer.cipherLetters || []).filter((c) => Boolean(c) && c !== 'و')
                          : [];
                        const displayChar = detail.originalChar || detail.normalizedChar || '';

                        return (
                          <div
                            key={`char_${idx}`}
                            className="inline-flex items-center gap-1 px-1.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-2xs text-xs"
                            title={`الحرف [${displayChar}] - سماء ${layerNum}`}
                          >
                            <span
                              className={`w-6 h-6 rounded font-semibold text-xs font-quran flex items-center justify-center shrink-0 shadow-2xs ${color.activeBg} ${color.activeText} border ${color.activeBorder}`}
                            >
                              {displayChar}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {ciphers.map((cipherChar, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="w-6 h-6 rounded font-semibold text-xs font-quran flex items-center justify-center shrink-0 bg-stone-100 dark:bg-stone-700/90 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-600 shadow-2xs"
                                  title={`رمز التشفير: [${cipherChar}]`}
                                >
                                  {cipherChar}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Priority 1: Exact Quranic Matches from Encryption with Interactive Ayah Accordion */}
                    {encQuranicMatches.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                        <div className="flex items-center justify-between">
                          <h4
                            onMouseEnter={() => setHintText(`المفردات القرآنية المطابقة لشفرة النص (${encQuranicMatches.length} مفردة) مع نصوص الآيات والسور`)}
                            onMouseLeave={clearHint}
                            className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5 cursor-default"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                            <span>مفردات قرآنية من التشفير ({encQuranicMatches.length})</span>
                          </h4>
                          <span className="text-3xs text-stone-500 dark:text-stone-400">
                            اضغط على المفردة لعرض الآية الكريمة
                          </span>
                        </div>

                        <div className="space-y-1.5 w-full">
                          {encQuranicMatches.map((item, idx) => {
                            const itemKey = `enc_q_${idx}`;
                            const isExpanded = expandedQuranicKey === itemKey;
                            const isCopied = copiedText === itemKey;
                            const targetWord = item.meta.originalQuranicWord || item.meta.word || item.word;
                            const isDirectExact = !!item.meta.isDirectExact && item.word === targetWord;
                            const displayPercentage = isDirectExact ? 100 : Math.min(item.meta.confidence || 90, 95);
                            const displayText = isDirectExact ? item.word : `${item.word} = ${targetWord}`;
                            const ayahInfo = quranicDictionary.getAyahForWord(targetWord, item.meta.surahName, item.meta.ayahNum);
                            const fullAyahText = ayahInfo?.ayahText || item.meta.ayahText || item.meta.sampleAyahText || '';
                            const surahName = ayahInfo?.surahName || item.meta.surahName || 'القرآن الكريم';
                            const ayahNum = ayahInfo?.ayahNum || item.meta.ayahNum || 1;
                            const isCopiedAyah = copiedText === `ayah_${itemKey}`;
                            const url = getQuranTopWordUrl(targetWord, item.meta.surahNumber, ayahNum, item.meta.occurrences);

                            return (
                              <div
                                key={`enc_quran_${item.word}_${idx}`}
                                onMouseEnter={() => setHintText(isDirectExact ? `مفردة قرآنية مشفرة (100%): [${item.word}] في سورة ${surahName} الآية [${ayahNum}]` : `${item.meta.matchRule || 'مفردة قرآنية مقارِبة'}: (${displayText}) بنسبة تطابق ${displayPercentage}% في سورة ${surahName} [الآية ${ayahNum}]`)}
                                onMouseLeave={clearHint}
                                className="flex flex-col rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/30 overflow-hidden shadow-2xs transition-all"
                              >
                                <div
                                  onClick={() => toggleQuranicAccordion(itemKey)}
                                  className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors select-none ${
                                    isExpanded
                                      ? 'bg-amber-100/90 dark:bg-amber-900/60 border-b border-amber-200 dark:border-amber-800'
                                      : 'hover:bg-amber-100/50 dark:hover:bg-amber-900/40'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`text-3xs font-mono font-bold px-1.5 py-0.5 rounded shadow-2xs shrink-0 ${
                                        isDirectExact
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-amber-200/90 dark:bg-amber-900/90 text-amber-950 dark:text-amber-200'
                                      }`}
                                    >
                                      {displayPercentage}%
                                    </span>
                                    <span className="text-sm font-bold font-quran text-amber-950 dark:text-amber-100 leading-tight">
                                      {displayText}
                                    </span>
                                    {isCopied && (
                                      <span className="text-3xs text-emerald-600 dark:text-emerald-400 font-normal">
                                        تم النسخ
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    {item.isReversed && (
                                      <RotateCcw
                                        className="w-3 h-3 text-rose-500 dark:text-rose-400 shrink-0"
                                        title="معكوس التوليفة"
                                      />
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => toggleQuranicAccordion(itemKey)}
                                      onMouseEnter={() => setHintText(isExpanded ? 'إغلاق الآية' : 'عرض نص الآية الكريمة كاملة')}
                                      onMouseLeave={clearHint}
                                      className="p-1 rounded-md text-amber-700 dark:text-amber-300 hover:bg-amber-200/60 dark:hover:bg-amber-800/60 transition-colors cursor-pointer"
                                      title={isExpanded ? "إغلاق الآية" : "عرض الآية الكريمة كاملة"}
                                    >
                                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(targetWord, itemKey)}
                                      onMouseEnter={() => setHintText(`نسخ الكلمة [${targetWord}]`)}
                                      onMouseLeave={clearHint}
                                      className="p-1 text-stone-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer"
                                      title="نسخ الكلمة"
                                    >
                                      {isCopied ? <Check className="w-3.5 h-3.5 text-amber-600" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                    <AddToNotebookButton
                                      word={submittedText}
                                      cipher={item.word}
                                      systemName={activeTableName}
                                      surahInfo={surahName}
                                      ayahNum={ayahNum}
                                      isReversed={item.isReversed}
                                      type="quranic"
                                      variant="icon-only"
                                    />
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="p-3 bg-white/90 dark:bg-stone-900/90 space-y-2.5 animate-in fade-in zoom-in-95 duration-150 border-t border-amber-100 dark:border-amber-900">
                                    <div className="flex items-center justify-between text-2xs">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="px-2 py-0.5 rounded-md font-semibold text-2xs bg-amber-600 text-white">
                                          سورة {surahName} — الآية [{ayahNum}]
                                        </span>
                                        {item.meta.occurrences > 0 && (
                                          <span className="text-stone-500 text-3xs">
                                            (تكرار اللفظ: {item.meta.occurrences} مرة في القرآن)
                                          </span>
                                        )}
                                        {item.meta.matchRule && (
                                          <span className="text-amber-700 dark:text-amber-300 text-3xs font-medium">
                                            • {item.meta.matchRule}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {fullAyahText ? (
                                      <div className="font-quran text-base sm:text-lg leading-loose text-center text-stone-900 dark:text-stone-100 p-3 rounded-xl bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 select-text">
                                        {highlightWordInAyah(
                                          fullAyahText,
                                          targetWord,
                                          'bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 border border-amber-400'
                                        )}
                                        <span className="text-amber-600 dark:text-amber-400 font-bold ms-1.5">
                                          ﴿{ayahNum}﴾
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-stone-500 text-center py-2">
                                        المفردة واردة في سورة {surahName} الآية {ayahNum}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-200/60 dark:border-stone-800 text-xs">
                                      <div className="flex items-center gap-1.5">
                                        {fullAyahText && (
                                          <button
                                            type="button"
                                            onClick={() => handleCopy(fullAyahText, `ayah_${itemKey}`)}
                                            onMouseEnter={() => setHintText('نسخ نص الآية الكريمة كاملة')}
                                            onMouseLeave={clearHint}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer text-2xs font-medium"
                                            title="نسخ الآية الكريمة كاملة"
                                          >
                                            {isCopiedAyah ? <Check className="w-3 h-3 text-amber-600" /> : <Copy className="w-3 h-3" />}
                                            <span>{isCopiedAyah ? 'تم نسخ الآية' : 'نسخ الآية'}</span>
                                          </button>
                                        )}
                                      </div>

                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onMouseEnter={() => setHintText('عرض الآية الكريمة في المصحف الإلكتروني')}
                                        onMouseLeave={clearHint}
                                        className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline text-2xs font-medium"
                                        title="عرض الآية في المصحف الإلكتروني"
                                      >
                                        <span>عرض في المصحف</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Priority 2: Nearest Quranic Vocabulary with Accordion */}
                    {encNearestQuranicMatches.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                        <button
                          type="button"
                          onClick={toggleNearestQuranicOpen}
                          onMouseEnter={() => setHintText(`أقرب الألفاظ القرآنية شبهاً بنواتج التشفير (${encNearestQuranicMatches.length} مفردة) مع نسبة التقارب والسياق`)}
                          onMouseLeave={clearHint}
                          className="w-full flex items-center justify-between py-1 px-1 rounded-lg hover:bg-stone-100/70 dark:hover:bg-stone-800/60 transition-colors cursor-pointer text-start"
                        >
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                            <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                              أقرب المفردات القرآنية شبهاً ({encNearestQuranicMatches.length})
                            </h4>
                          </div>
                          {isNearestQuranicOpen ? (
                            <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                          )}
                        </button>

                        {isNearestQuranicOpen && (
                          <div className="space-y-1.5 pt-1">
                            {encNearestQuranicMatches.map((item, idx) => {
                              const itemKey = `enc_near_${idx}`;
                              const isExpanded = expandedQuranicKey === itemKey;
                              const isCopied = copiedText === itemKey;
                              const ayahInfo = quranicDictionary.getAyahForWord(item.nearest.word, item.nearest.surahName, item.nearest.ayahNum);
                              const fullAyahText = ayahInfo?.ayahText || item.nearest.ayahText || item.nearest.sampleAyahText || '';
                              const surahName = ayahInfo?.surahName || item.nearest.surahName || 'القرآن الكريم';
                              const ayahNum = ayahInfo?.ayahNum || item.nearest.ayahNum || 1;
                              const isCopiedAyah = copiedText === `ayah_${itemKey}`;
                              const url = getQuranTopWordUrl(item.nearest.word, item.nearest.surahNumber, ayahNum);

                              return (
                                <div
                                  key={`enc_near_${item.combo}_${idx}`}
                                  onMouseEnter={() => setHintText(`لفظ قرآني قريب: [${item.nearest.word}] بنسبة تطابق ${Math.round(item.nearest.similarity)}% (${item.combo} = ${item.nearest.word}) - انقر لفتح الآية الكريمة`)}
                                  onMouseLeave={clearHint}
                                  className="flex flex-col rounded-xl border border-sky-200/70 dark:border-sky-800/60 bg-sky-50/40 dark:bg-sky-950/30 overflow-hidden shadow-2xs transition-all"
                                >
                                  <div
                                    onClick={() => toggleQuranicAccordion(itemKey)}
                                    className={`px-3 py-1.5 flex items-center justify-between gap-1.5 cursor-pointer transition-colors select-none ${
                                      isExpanded
                                        ? 'bg-sky-100/90 dark:bg-sky-900/60 border-b border-sky-200 dark:border-sky-800'
                                        : 'hover:bg-sky-100/50 dark:hover:bg-sky-900/40'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-3xs font-mono font-bold px-1.5 py-0.5 rounded bg-sky-200/80 dark:bg-sky-900/80 text-sky-900 dark:text-sky-200 shrink-0">
                                        {Math.round(item.nearest.similarity)}%
                                      </span>
                                      <span className="font-bold font-quran text-stone-900 dark:text-stone-100 text-xs sm:text-sm tracking-wide">
                                        {item.combo} = {item.nearest.word}
                                      </span>
                                      {isCopied && (
                                        <span className="text-3xs text-emerald-600 dark:text-emerald-400 font-normal">
                                          تم النسخ
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                      {item.isReversed && (
                                        <RotateCcw className="w-2.5 h-2.5 text-rose-500 dark:text-rose-400 shrink-0" title="معكوس" />
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => toggleQuranicAccordion(itemKey)}
                                        onMouseEnter={() => setHintText(isExpanded ? 'إغلاق الآية' : 'عرض نص وسياق الآية الكريمة')}
                                        onMouseLeave={clearHint}
                                        className="p-1 rounded text-sky-700 dark:text-sky-300 hover:bg-sky-200/60 dark:hover:bg-sky-800/60 transition-colors cursor-pointer"
                                        title={isExpanded ? "إغلاق الآية" : "عرض الآية الكريمة"}
                                      >
                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(item.nearest.word, itemKey)}
                                        onMouseEnter={() => setHintText(`نسخ اللفظ [${item.nearest.word}]`)}
                                        onMouseLeave={clearHint}
                                        className="p-0.5 text-stone-400 hover:text-sky-600 transition-colors"
                                        title="نسخ الكلمة"
                                      >
                                        {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                      </button>
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="p-3 bg-white/90 dark:bg-stone-900/90 space-y-2 animate-in fade-in zoom-in-95 duration-150 border-t border-sky-100 dark:border-sky-900">
                                      <div className="flex items-center justify-between text-2xs">
                                        <span className="px-2 py-0.5 rounded font-semibold text-2xs bg-sky-600 text-white">
                                          سورة {surahName} [الآية {ayahNum}] — تقارب {item.nearest.similarity}%
                                        </span>
                                      </div>

                                      {fullAyahText ? (
                                        <div className="font-quran text-sm sm:text-base leading-relaxed text-center text-stone-900 dark:text-stone-100 p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 select-text">
                                          {highlightWordInAyah(
                                            fullAyahText,
                                            item.nearest.word,
                                            'bg-sky-200 dark:bg-sky-900 text-sky-950 dark:text-sky-100 border border-sky-400'
                                          )}
                                          <span className="text-amber-600 dark:text-amber-400 font-bold ms-1">
                                            ﴿{ayahNum}﴾
                                          </span>
                                        </div>
                                      ) : null}

                                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-200/60 dark:border-stone-800 text-2xs">
                                        {fullAyahText && (
                                          <button
                                            type="button"
                                            onClick={() => handleCopy(fullAyahText, `ayah_${itemKey}`)}
                                            onMouseEnter={() => setHintText('نسخ نص الآية الكريمة')}
                                            onMouseLeave={clearHint}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 font-medium"
                                          >
                                            {isCopiedAyah ? <Check className="w-2.5 h-2.5 text-sky-600" /> : <Copy className="w-2.5 h-2.5" />}
                                            <span>{isCopiedAyah ? 'تم النسخ' : 'نسخ الآية'}</span>
                                          </button>
                                        )}
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onMouseEnter={() => setHintText('عرض موقع المفردة في المصحف الإلكتروني')}
                                          onMouseLeave={clearHint}
                                          className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline font-medium"
                                        >
                                          <span>عرض في المصحف</span>
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Priority 3: Confirmed Arabic Lexicon Matches */}
                    {encArabicDictionaryMatches.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                        <h4
                          onMouseEnter={() => setHintText(`المطابقات المعجمية العربية لنواتج التشفير (${encArabicDictionaryMatches.length} مفردة) مع الجذور`)}
                          onMouseLeave={clearHint}
                          className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between gap-1 cursor-default"
                        >
                          <div className="flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>مطابقات معجمية ({encArabicDictionaryMatches.length})</span>
                          </div>
                        </h4>
                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 rounded-xl bg-stone-50/50 dark:bg-stone-950/40 border border-stone-200/60 dark:border-stone-800">
                          {encArabicDictionaryMatches.slice(0, 50).map((item, idx) => (
                            <div
                              key={`enc_dict_${item.word}_${idx}`}
                              onMouseEnter={() => setHintText(`مفردة معجمية: [${item.word}] - الجذر: [${item.meta?.root || '—'}]`)}
                              onMouseLeave={clearHint}
                              className="px-2 py-1 rounded-lg bg-amber-50/70 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/60 text-xs font-normal hover:scale-102 transition-all inline-flex items-center gap-1 shadow-2xs"
                            >
                              <button
                                type="button"
                                onClick={() => handleCopy(item.word, `enc_d_${idx}`)}
                                className="inline-flex items-center gap-1 cursor-pointer font-quran text-xs font-medium"
                                title="انقر لنسخ الكلمة"
                              >
                                <span>{item.word}</span>
                                {item.meta?.root && (
                                  <span className="text-3xs text-amber-700 dark:text-amber-300 font-sans opacity-80">
                                    ({item.meta.root})
                                  </span>
                                )}
                                {item.isReversed && (
                                  <RotateCcw className="w-2.5 h-2.5 text-rose-500 dark:text-rose-400 shrink-0" title="معكوس الكلمة" />
                                )}
                                {copiedText === `enc_d_${idx}` ? <Check className="w-3 h-3 text-amber-600" /> : null}
                              </button>
                              <a
                                href={getArabicDictSearchUrl(item.word)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onMouseEnter={() => setHintText(`البحث عن جذر ومعنى "${item.word}" في معجم المعاني الجامع`)}
                                onMouseLeave={clearHint}
                                className="text-stone-400 hover:text-amber-600 dark:hover:text-amber-300 p-0.5"
                                title={`البحث عن "${item.word}" في المعاجم`}
                              >
                                <ExternalLink className="w-2.5 h-2.5 opacity-70 hover:opacity-100" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })()}

        </div>
      )}

      {/* Save Current System to Notebook Modal */}
      {showSaveCurrentSystemModal && (
        <SaveSystemModal
          isOpen={showSaveCurrentSystemModal}
          onClose={() => setShowSaveCurrentSystemModal(false)}
          defaultName={currentSystemSuggestedName}
          nooraniName={currentNooraniItem?.name}
          arabicName={currentArabicItem?.name}
          includeWaw={includeWawInAllLayers}
          layers={effectiveLayers}
        />
      )}

      {/* Search and Cipher History Side Drawer */}
      <SearchHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        items={searchHistoryItems}
        onSelectItem={handleSelectHistoryItem}
        onToggleFavorite={handleToggleFavoriteHistoryItem}
        onDeleteItem={handleDeleteHistoryItem}
        onClearHistory={handleClearHistory}
      />

    </div>
  );
}
