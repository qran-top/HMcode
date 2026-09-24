import React, { useState, useEffect, useMemo } from 'react';
import { useCipherLayers } from '../context/CipherLayersContext';
import { useNotebook } from '../context/NotebookContext';
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
  Calculator
} from 'lucide-react';
import { MultiSystemScanner } from './MultiSystemScanner';
import { AddToNotebookButton } from './AddToNotebookButton';
import { SaveSystemModal } from './SaveSystemModal';
import { SearchHistoryDrawer, SearchHistoryItem } from './SearchHistoryDrawer';
import { getAllNooraniItems, getAllArabicItems, applyWawToCelestialLayers, buildCrossLayersFromPair } from '../utils/multiSystemSearch';
import { getWordGematriaValue } from '../utils/gematriaEngine';
import { useGematria } from '../context/GematriaContext';
import { GematriaResultsCard } from './GematriaResultsCard';

interface DualTranslatorProps {
  onNavigateToEncrypt?: (text: string) => void;
  onNavigateToDecrypt?: (text: string) => void;
  onNavigateToGematria?: (text: string) => void;
}

const DEFAULT_RECENT_SEARCHES = ['طسم', 'كهيعص', 'بقرة', 'يس', 'سلام'];
const STORAGE_KEY_HISTORY = 'cipher_recent_searches';

export function DualTranslator({ onNavigateToEncrypt, onNavigateToDecrypt, onNavigateToGematria }: DualTranslatorProps) {
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

  const { activeTable, activeTableId, tables, setActiveTableId, calculateWordGematria } = useGematria();

  const [inputText, setInputText] = useState('');
  const [submittedText, setSubmittedText] = useState('');
  const [viewMode, setViewMode] = useState<'both' | 'decrypt' | 'encrypt' | 'gematria'>('both');
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
    const text = inputText.trim() || submittedText.trim();
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
    const word = inputText.trim() || submittedText.trim();
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
    }
  };

  const handleComprehensiveSearchClick = () => {
    const targetText = inputText.trim() || submittedText.trim();
    if (targetText) {
      setSubmittedText(targetText);
      setInputText(targetText);
      addToHistory(targetText);
      buildShortShareUrl(true);
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
  // Analyzes the letters in the active input (or submitted text) to provide smart operational guidance
  const activeLetters = useMemo(() => {
    const raw = (inputText || submittedText || '').trim();
    return raw.replace(/[^ء-ي]/g, '').split('');
  }, [inputText, submittedText]);

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

  // Exact Quranic matches for encryption combinations
  const encQuranicMatches = useMemo(() => {
    const list: { word: string; meta: QuranicWordMeta; isReversed: boolean; original: string }[] = [];
    const seen = new Set<string>();
    for (const item of processedEncCombinations) {
      const meta = quranicDictionary.getWordDetails(item.word);
      if (meta && !seen.has(item.word)) {
        seen.add(item.word);
        list.push({ word: item.word, meta, isReversed: item.isReversed, original: item.original });
      }
    }
    return list;
  }, [processedEncCombinations, quranicCount]);

  // Nearest Quranic vocabulary matches for encryption combinations
  const encNearestQuranicMatches = useMemo(() => {
    const list: { combo: string; nearest: QuranicNearestMatch; isReversed: boolean; original: string }[] = [];
    const seen = new Set<string>();
    const exactSet = new Set(encQuranicMatches.map(m => m.word));
    let evaluated = 0;
    for (const item of processedEncCombinations) {
      if (evaluated >= 40) break;
      if (!exactSet.has(item.word) && !seen.has(item.word)) {
        const nearest = quranicDictionary.findClosestQuranicWord(item.word);
        if (nearest && nearest.similarity < 100 && nearest.similarity >= 60) {
          seen.add(item.word);
          list.push({ combo: item.word, nearest, isReversed: item.isReversed, original: item.original });
        }
        evaluated++;
      }
    }
    return list.sort((a, b) => b.nearest.similarity - a.nearest.similarity).slice(0, 10);
  }, [processedEncCombinations, encQuranicMatches, quranicCount]);

  // Confirmed Arabic dictionary matches for encryption combinations
  const encArabicDictionaryMatches = useMemo(() => {
    const list: { word: string; isReversed: boolean; original: string }[] = [];
    const quranicSet = new Set(encQuranicMatches.map(m => m.word));
    const seen = new Set<string>();
    for (const item of processedEncCombinations) {
      if (!quranicSet.has(item.word) && !seen.has(item.word) && arabicDictionary.isWord(item.word)) {
        seen.add(item.word);
        list.push({ word: item.word, isReversed: item.isReversed, original: item.original });
      }
    }
    return list;
  }, [processedEncCombinations, encQuranicMatches, dictCount]);

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
  const cleanChars = Array.from(cleanText(submittedText));
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

  const meaningfulItems = decodedItems.filter(d => !d.isSpace && d.matchingLayers.length > 0);
  const totalCombinationsCount = meaningfulItems.length > 0
    ? meaningfulItems.reduce((acc, item) => acc * Math.max(1, item.candidates.length), 1)
    : 0;

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

  // Find exact Quranic matches
  const quranicMatches = useMemo(() => {
    const list: { word: string; meta: QuranicWordMeta; isReversed: boolean }[] = [];
    const seen = new Set<string>();

    for (const word of rawCombinations) {
      // Normal direction
      const metaNormal = quranicDictionary.getWordDetails(word);
      if (metaNormal && !seen.has(word)) {
        seen.add(word);
        list.push({ word, meta: metaNormal, isReversed: false });
      }

      // Reversed direction (معكوس الكلمة)
      const reversed = word.split('').reverse().join('');
      if (reversed !== word) {
        const metaRev = quranicDictionary.getWordDetails(reversed);
        if (metaRev && !seen.has(reversed)) {
          seen.add(reversed);
          list.push({ word: reversed, meta: metaRev, isReversed: true });
        }
      }
    }
    return list;
  }, [rawCombinations, quranicCount]);

  // Find confirmed Arabic dictionary matches (excluding duplicates from quranic list)
  const arabicDictionaryMatches = useMemo(() => {
    const list: { word: string; isReversed: boolean }[] = [];
    const quranicSet = new Set(quranicMatches.map(m => m.word));
    const seen = new Set<string>();

    for (const word of rawCombinations) {
      if (!quranicSet.has(word) && !seen.has(word) && arabicDictionary.isWord(word)) {
        seen.add(word);
        list.push({ word, isReversed: false });
      }
      const reversed = word.split('').reverse().join('');
      if (reversed !== word && !quranicSet.has(reversed) && !seen.has(reversed) && arabicDictionary.isWord(reversed)) {
        seen.add(reversed);
        list.push({ word: reversed, isReversed: true });
      }
    }
    return list;
  }, [rawCombinations, quranicMatches, dictCount]);

  // Filtered list of permutations for researcher view
  const filteredPermutations = useMemo(() => {
    if (!permutationSearch.trim()) return rawCombinations;
    const search = permutationSearch.trim();
    return rawCombinations.filter(w => w.includes(search));
  }, [rawCombinations, permutationSearch]);

  // Active layers in current input (strictly reactive to inputText so clearing text immediately turns all layers off)
  const activeLayersNumbers = useMemo(() => {
    const textToAnalyze = inputText.trim();
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
  }, [inputText, effectiveLayers]);

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
          <div className="relative flex-1 flex items-center min-w-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.ctrlKey || e.metaKey) {
                    handleComprehensiveSearchClick();
                  } else {
                    handleEnterKey();
                  }
                }
              }}
              placeholder="اكتب كلمة عربية أو شفرة (طسم، كهيعص، بقرة)..."
              className={`w-full text-sm sm:text-base font-medium py-2 sm:py-2.5 px-3 pe-8 ps-14 rounded-xl border focus:outline-none focus:ring-2 bg-stone-50/50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 transition-all shadow-inner ${
                nooraniAnalysis?.isPureNoorani
                  ? 'border-amber-400/90 dark:border-amber-600/80 focus:ring-amber-500 bg-amber-50/20'
                  : 'border-stone-300 dark:border-stone-700 focus:ring-amber-500'
              }`}
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
                    }
                  } catch (err) {
                    console.warn('Clipboard read error:', err);
                  }
                }}
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
                  }}
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
            disabled={!showMultiSystemScanner && !inputText.trim() && !submittedText.trim()}
            className="p-2 sm:p-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 text-white transition-all shadow-xs flex items-center justify-center cursor-pointer shrink-0"
            title="بحث وفحص النص في المنظومة الحالية (Enter)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Comprehensive Search Button (Icon + 'شامل' Only) */}
          <button
            type="button"
            onClick={handleComprehensiveSearchClick}
            disabled={!inputText.trim() && !submittedText.trim()}
            className={`py-2 px-2.5 sm:px-3 rounded-xl font-medium text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
              showMultiSystemScanner
                ? 'bg-emerald-700 dark:bg-emerald-600 text-white ring-2 ring-emerald-400 dark:ring-emerald-500 shadow-sm'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white'
            }`}
            title="فحص شامل عبر كافة المنظومات الـ 50+ مباشرة للكلمة الحالية (Ctrl + Enter)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>شامل</span>
          </button>
        </div>

        {/* Step B: Sky Layers Bar (أزرار السماوات السبع ومسار التشفير) */}
        <div className="flex items-center justify-between gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/60 shadow-2xs transition-all flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {/* The 7 Sky Layers buttons in order 1 to 7 */}
            <CompactLayersIndicator activeLayerNumbers={activeLayersNumbers} customLayers={effectiveLayers} />

            <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 hidden sm:block shrink-0" />

            {/* Short Path Message */}
            {nooraniAnalysis ? (
              <div className="flex items-center gap-1.5 font-medium text-xs text-stone-600 dark:text-stone-400 flex-wrap font-sans">
                <span className="text-stone-500">المسار:</span>
                <span
                  className={`px-2 py-0.5 rounded font-medium text-xs inline-flex items-center gap-1 ${
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
                <span className="text-stone-500 text-xs">
                  {nooraniAnalysis.isPureNoorani
                    ? `(${nooraniAnalysis.nooraniCount} نورانية)`
                    : `(${nooraniAnalysis.nonNooraniCount} هجائية)`}
                </span>

                {dictLoading && (
                  <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium animate-pulse ms-0.5 font-sans">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>({dictProgress}%)</span>
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-stone-400 truncate font-sans">
                المسار: اكتب كلمة للتحليل
              </span>
            )}
          </div>

          {/* Unified Waw Option */}
          <div className="flex items-center gap-1.5 shrink-0 ms-auto sm:ms-0 font-sans">
            <label
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

        {/* Step C: View Modes & Compact 2-Line Recent Search History Pills */}
        <div className="pt-2 border-t border-stone-200/80 dark:border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-2">
          {/* View Mode Toggle (شامل / فك / تشفير / جُمَّل) */}
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-xs font-medium self-start shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'both'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
              title="عرض متزامن لنتائج فك التشفير والتشفير وحساب الجُمَّل"
            >
              شامل
            </button>
            <button
              type="button"
              onClick={() => setViewMode('decrypt')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'decrypt'
                  ? 'bg-white dark:bg-stone-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              فك
            </button>
            <button
              type="button"
              onClick={() => setViewMode('encrypt')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'encrypt'
                  ? 'bg-white dark:bg-stone-700 text-amber-700 dark:text-amber-300 shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              تشفير
            </button>
            <button
              type="button"
              onClick={() => setViewMode('gematria')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'gematria'
                  ? 'bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              الجُمَّل
            </button>
          </div>

          {/* Interactive Compact History Container */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-start md:justify-end">
            {/* History Drawer Toggle Button */}
            <button
              type="button"
              onClick={() => setIsHistoryDrawerOpen((prev) => !prev)}
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

            {/* Compact Single-Line Pills */}
            <div className="flex flex-nowrap items-center gap-1 overflow-hidden min-w-0 h-6">
              {searchHistoryItems.slice(0, 10).map((item) => {
                const itemChars = item.word.replace(/[^ء-ي]/g, '').split('');
                const isItemPureNoorani = itemChars.length > 0 && itemChars.every((c) => NOORANI_LETTERS_SET.has(c));

                return (
                  <button
                    key={`hist_pill_${item.id}`}
                    type="button"
                    onClick={() => handleSelectHistoryItem(item)}
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

      {/* 4. Dense Output Results Layout (عرض متزامن يمين ويسار بدون سكرول طويل) */}
      {submittedText && !showMultiSystemScanner && (
        <div className={viewMode === 'both' ? "grid grid-cols-1 lg:grid-cols-2 gap-3 items-start" : "space-y-3"}>

          {/* Top Priority: Gematria Calculation & Quranic Matches Results (تُعرض أولاً بتصميم فائق الإيجاز) */}
          {(viewMode === 'both' || viewMode === 'gematria') && (
            <div className={viewMode === 'both' ? 'col-span-1 lg:col-span-2' : ''}>
              <GematriaResultsCard
                query={submittedText}
                onNavigateToGematria={onNavigateToGematria}
                onSelectWord={(w) => {
                  setInputText(w);
                  setSubmittedText(w);
                  addToHistory(w);
                }}
              />
            </div>
          )}

          {/* Section A: Decryption Results (فك التشفير - Indigo Theme) */}
          {(viewMode === 'both' || viewMode === 'decrypt') && (
            <div
              className={`bg-white dark:bg-stone-900 rounded-xl p-3 sm:p-4 shadow-2xs space-y-3 transition-all duration-300 ${
                nooraniAnalysis?.isPureNoorani
                  ? 'border-2 border-indigo-500 shadow-md ring-4 ring-indigo-500/10 dark:ring-indigo-500/20 bg-indigo-50/5 dark:bg-indigo-950/10'
                  : 'border border-stone-200 dark:border-stone-800 opacity-95'
              }`}
            >
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-semibold text-xs">
                    <Unlock className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 font-sans">
                    فك التشفير
                  </h3>
                </div>

                {onNavigateToDecrypt && (
                  <button
                    onClick={() => onNavigateToDecrypt(submittedText)}
                    className="p-1 rounded-md text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors inline-flex items-center cursor-pointer"
                    title="عرض فك التشفير"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Priority 1: Exact Quranic Matches */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>مفردات قرآنية ({quranicMatches.length})</span>
                  </h4>
                </div>

                {quranicMatches.length === 0 ? (
                  <div className="py-2.5 px-3 bg-stone-50/60 dark:bg-stone-950/40 rounded-lg border border-stone-200 dark:border-stone-800 text-xs text-stone-500 text-center">
                    لا توجد ألفاظ قرآنية مباشرة في هذا الاحتمال
                  </div>
                ) : (
                  /* Standardized Quranic Chips Grid - Matches Gematria & Encrypt */
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {quranicMatches.map((item, idx) => {
                      const url = getQuranTopWordUrl(item.word, item.meta.surahNumber, item.meta.ayahNum, item.meta.occurrences);
                      const isCopied = copiedText === `q_${idx}`;
                      return (
                        <div
                          key={`quran_${item.word}_${idx}`}
                          onClick={() => handleCopy(item.word, `q_${idx}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/70 border-2 border-emerald-500 dark:border-emerald-400 flex items-center justify-between gap-1.5 shadow-2xs hover:border-emerald-600 dark:hover:border-emerald-300 transition-all cursor-pointer select-none group"
                          title={`انقر لنسخ [${item.word}]`}
                        >
                          <div className="flex items-baseline gap-1.5 min-w-0">
                            <span className="text-sm sm:text-base font-semibold font-quran text-indigo-950 dark:text-indigo-100 leading-tight">
                              {item.word}
                            </span>
                            {isCopied ? (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                تم النسخ
                              </span>
                            ) : (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-indigo-700 dark:text-indigo-300 hover:text-indigo-950 dark:hover:text-white font-sans truncate hover:underline"
                                title="عرض السورة والآيات"
                              >
                                {item.meta.surahName} {item.meta.occurrences > 1 ? `(${item.meta.occurrences}×)` : ''}
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {item.isReversed && (
                              <RotateCcw
                                className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0"
                                title="معكوس الكلمة"
                              />
                            )}
                            <AddToNotebookButton
                              word={submittedText}
                              cipher={item.word}
                              systemName={activeTableName}
                              surahInfo={item.meta.surahName}
                              ayahNum={item.meta.ayahNum}
                              isReversed={item.isReversed}
                              type="quranic"
                              variant="icon-only"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Priority 2: Confirmed Arabic Lexicon Matches */}
              {(arabicDictionaryMatches.length > 0 || dictLoading) && (
                <div className="space-y-2 pt-1 border-t border-stone-100 dark:border-stone-800">
                  <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>معجمية ({arabicDictionaryMatches.length})</span>
                    </div>
                    {dictLoading && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 animate-pulse me-1">
                        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                        <span>جاري فحص المعجم ({dictProgress}%)...</span>
                      </span>
                    )}
                  </h4>

                  {arabicDictionaryMatches.length === 0 && dictLoading ? (
                    <div className="py-2.5 px-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-between gap-2 text-xs text-indigo-900 dark:text-indigo-200 font-medium animate-pulse">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="truncate">جاري معالجة وفحص المعجم العربي الشامل...</span>
                      </div>
                      <span className="text-xs font-mono bg-indigo-200/60 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full font-medium shrink-0">
                        {dictProgress}%
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 rounded-lg bg-stone-50/50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800">
                      {arabicDictionaryMatches.slice(0, 60).map((item, idx) => (
                        <div
                          key={`dict_${item.word}_${idx}`}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-stone-300 dark:border-stone-700 text-xs font-medium hover:scale-102 transition-all inline-flex items-center gap-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => handleCopy(item.word, `d_${idx}`)}
                            className="inline-flex items-center gap-1 cursor-pointer"
                            title="انقر لنسخ الكلمة"
                          >
                            <span>{item.word}</span>
                            {item.isReversed && (
                              <RotateCcw className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" title="معكوس الكلمة" />
                            )}
                            {copiedText === `d_${idx}` ? <Check className="w-3 h-3 text-indigo-600" /> : null}
                          </button>
                          <a
                            href={getArabicDictSearchUrl(item.word)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-700 dark:text-indigo-300 hover:text-indigo-950 dark:hover:text-indigo-100 p-0.5"
                            title={`البحث عن "${item.word}" في Google`}
                          >
                            <ExternalLink className="w-3 h-3 opacity-70 hover:opacity-100" />
                          </a>
                          <AddToNotebookButton
                            word={submittedText}
                            cipher={item.word}
                            systemName={activeTableName}
                            isReversed={item.isReversed}
                            type="dictionary"
                            variant="icon-only"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {arabicDictionaryMatches.length === 0 && dictLoading && (
                <div className="pt-1 border-t border-stone-100 dark:border-stone-800">
                  <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-between gap-2 text-xs text-indigo-900 dark:text-indigo-200 font-medium animate-pulse">
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>جاري تحميل المعجم العربي الشامل واكتشاف الكلمات المعجمية...</span>
                    </div>
                    <span className="text-xs bg-indigo-200/60 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full font-medium">
                      {dictProgress}%
                    </span>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Section B: Encryption Results (التشفير - Amber Theme) */}
          {(viewMode === 'both' || viewMode === 'encrypt') && (
            <div
              className={`bg-white dark:bg-stone-900 rounded-xl p-3 sm:p-4 shadow-2xs space-y-3 transition-all duration-300 ${
                !nooraniAnalysis?.isPureNoorani
                  ? 'border-2 border-amber-500 shadow-md ring-4 ring-amber-500/10 dark:ring-amber-500/20 bg-amber-50/5 dark:bg-amber-950/10'
                  : 'border border-stone-200 dark:border-stone-800 opacity-95'
              }`}
            >
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-semibold text-xs">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 font-sans">
                    التشفير
                  </h3>
                </div>

                {onNavigateToEncrypt && (
                  <button
                    onClick={() => onNavigateToEncrypt(submittedText)}
                    className="p-1 rounded-md text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors inline-flex items-center cursor-pointer"
                    title="عرض التشفير"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {hasMissingArabic ? (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-center text-xs font-medium text-rose-700 dark:text-rose-300">
                  بعض أحرف هذه الكلمة غير موجودة في جدول التشفير الحالي.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Dense Letter Breakdown with Color Micro Tiles: Clear Letter in Colored Box & Pure Ciphers without Waw */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {encryptionDetails.map((detail, idx) => {
                      if (detail.isSpecialOrSpace) return null;
                      const layerNum = detail.layer ? detail.layer.layer : 0;
                      const color = LAYER_RAINBOW_COLORS[layerNum] || {
                        name: 'رمادي',
                        activeBg: 'bg-stone-800',
                        activeText: 'text-white',
                        activeBorder: 'border-stone-900',
                        lightBg: 'bg-stone-50',
                        lightBorder: 'border-stone-200',
                      };
                      // Strictly filter out letter 'و' (Waw) as requested
                      const ciphers = detail.layer
                        ? (detail.layer.cipherLetters || []).filter((c) => Boolean(c) && c !== 'و')
                        : [];
                      const displayChar = detail.originalChar || detail.normalizedChar || '';

                      return (
                        <div
                          key={`char_${idx}`}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-2xs text-xs"
                          title={`الحرف [${displayChar}] - سماء ${layerNum} (${color.name})`}
                        >
                          {/* Colored box containing the letter with high clarity */}
                          <span
                            className={`w-6.5 h-6.5 rounded-md font-bold text-xs sm:text-sm font-quran flex items-center justify-center shrink-0 shadow-2xs ${color.activeBg} ${color.activeText} border ${color.activeBorder}`}
                          >
                            {displayChar}
                          </span>
                          {/* Cipher letters in individual gray square boxes without separators */}
                          <div className="flex items-center gap-1">
                            {ciphers.map((cipherChar, cIdx) => (
                              <span
                                key={cIdx}
                                className="w-6.5 h-6.5 rounded-md font-bold text-xs sm:text-sm font-quran flex items-center justify-center shrink-0 bg-stone-100 dark:bg-stone-700/90 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-600 shadow-2xs"
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

                  {/* Priority 1: Exact Quranic Matches from Encryption Combinations */}
                  {encQuranicMatches.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                          <span>مفردات قرآنية ({encQuranicMatches.length})</span>
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {encQuranicMatches.map((item, idx) => {
                          const url = getQuranTopWordUrl(item.word, item.meta.surahNumber, item.meta.ayahNum, item.meta.occurrences);
                          const isCopied = copiedText === `enc_q_${idx}`;
                          return (
                            <div
                              key={`enc_quran_${item.word}_${idx}`}
                              onClick={() => handleCopy(item.word, `enc_q_${idx}`)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/70 border-2 border-emerald-500 dark:border-emerald-400 flex items-center justify-between gap-1.5 shadow-2xs hover:border-emerald-600 dark:hover:border-emerald-300 transition-all cursor-pointer select-none group"
                              title={`انقر لنسخ [${item.word}]`}
                            >
                              <div className="flex items-baseline gap-1.5 min-w-0">
                                <span className="text-sm sm:text-base font-semibold font-quran text-amber-950 dark:text-amber-100 leading-tight">
                                  {item.word}
                                </span>
                                {isCopied ? (
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                    تم النسخ
                                  </span>
                                ) : (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs text-amber-800 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-200 font-sans truncate hover:underline"
                                    title="عرض السورة والآيات"
                                  >
                                    {item.meta.surahName} {item.meta.occurrences > 1 ? `(${item.meta.occurrences}×)` : ''}
                                  </a>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {item.isReversed && (
                                  <RotateCcw
                                    className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0"
                                    title="معكوس التوليفة"
                                  />
                                )}
                                <AddToNotebookButton
                                  word={submittedText}
                                  cipher={item.word}
                                  systemName={activeTableName}
                                  surahInfo={item.meta.surahName}
                                  ayahNum={item.meta.ayahNum}
                                  isReversed={item.isReversed}
                                  type="quranic"
                                  variant="icon-only"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Priority 2: Distinct Nearest Quranic Vocabulary Matches (سحاب قابل للطي والفتح مع تذكر الخيار) */}
                  {encNearestQuranicMatches.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-sky-100 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={toggleNearestQuranicOpen}
                        className="w-full flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-stone-100/70 dark:hover:bg-stone-800/60 transition-colors cursor-pointer group text-start"
                      >
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                            أقرب المفردات شبهاً ({encNearestQuranicMatches.length})
                          </h4>
                        </div>
                        {isNearestQuranicOpen ? (
                          <ChevronUp className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 dark:text-stone-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 dark:text-stone-500" />
                        )}
                      </button>

                      {isNearestQuranicOpen && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {encNearestQuranicMatches.map((item, idx) => {
                            const isCopied = copiedText === `enc_near_${idx}`;
                            return (
                              <div
                                key={`enc_near_${item.combo}_${idx}`}
                                className="px-2.5 py-1 rounded-lg bg-sky-50/70 dark:bg-sky-950/30 border-2 border-sky-300/80 dark:border-sky-700/70 hover:border-sky-500 flex items-center gap-1.5 text-xs transition-all shadow-2xs"
                                title={`احتمال الشفرة: [${item.combo}] ← أقرب مفردة قرآنية: [${item.nearest.word}] في ${item.nearest.surahName}`}
                              >
                                <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-sky-200 dark:bg-sky-900 text-sky-900 dark:text-sky-200">
                                  {item.nearest.similarity}%
                                </span>
                                <span
                                  onClick={() => handleCopy(item.nearest.word, `enc_near_${idx}`)}
                                  className="font-semibold font-quran text-stone-900 dark:text-stone-100 text-sm cursor-pointer hover:underline"
                                >
                                  {item.nearest.word}
                                </span>
                                <span className="text-xs text-stone-400 font-mono">
                                  ← {item.combo}
                                </span>
                                {item.isReversed && (
                                  <RotateCcw className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" title="معكوس" />
                                )}
                                {isCopied && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                <AddToNotebookButton
                                  word={submittedText}
                                  cipher={item.nearest.word}
                                  systemName={activeTableName}
                                  surahInfo={item.nearest.surahName}
                                  isReversed={item.isReversed}
                                  type="quranic"
                                  variant="icon-only"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Priority 3: Confirmed Arabic Lexicon Matches */}
                  {encArabicDictionaryMatches.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                      <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>معجمية ({encArabicDictionaryMatches.length})</span>
                        </div>
                        {dictLoading && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 animate-pulse me-1">
                            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                            <span>جاري فحص المعجم ({dictProgress}%)...</span>
                          </span>
                        )}
                      </h4>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 rounded-lg bg-stone-50/50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800">
                        {encArabicDictionaryMatches.map((item, idx) => (
                          <div
                            key={`enc_dict_${item.word}_${idx}`}
                            className="px-2.5 py-1 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-stone-300 dark:border-stone-700 text-xs font-medium hover:scale-102 transition-all inline-flex items-center gap-1.5"
                          >
                            <button
                              type="button"
                              onClick={() => handleCopy(item.word, `enc_d_${idx}`)}
                              className="inline-flex items-center gap-1 cursor-pointer"
                              title="انقر لنسخ الكلمة"
                            >
                              <span>{item.word}</span>
                              {item.isReversed && (
                                <RotateCcw className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" title="معكوس الكلمة" />
                              )}
                              {copiedText === `enc_d_${idx}` ? <Check className="w-3 h-3 text-amber-600" /> : null}
                            </button>
                            <a
                              href={getArabicDictSearchUrl(item.word)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-700 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-100 p-0.5"
                              title={`البحث عن "${item.word}" في Google`}
                            >
                              <ExternalLink className="w-3 h-3 opacity-70 hover:opacity-100" />
                            </a>
                            <AddToNotebookButton
                              word={submittedText}
                              cipher={item.word}
                              systemName={activeTableName}
                              isReversed={item.isReversed}
                              type="dictionary"
                              variant="icon-only"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {encArabicDictionaryMatches.length === 0 && dictLoading && (
                    <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                      <div className="p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-between gap-2 text-2xs text-amber-900 dark:text-amber-200 font-bold animate-pulse">
                        <div className="flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>جاري تحميل المعجم العربي الشامل واكتشاف الكلمات المعجمية...</span>
                        </div>
                        <span className="text-3xs bg-amber-200/60 dark:bg-amber-900/60 px-1.5 py-0.5 rounded-full font-black">
                          {dictProgress}%
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

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
