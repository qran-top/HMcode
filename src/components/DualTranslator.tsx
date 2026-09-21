import React, { useState, useEffect, useMemo } from 'react';
import { useCipherLayers } from '../context/CipherLayersContext';
import { useNotebook } from '../context/NotebookContext';
import { PRESET_TABLES, cleanText, getLayerColor, getAllCombinations, segmentIntoQuranicWords, LAYER_RAINBOW_COLORS, NOORANI_LETTERS_SET, analyzeWord, NOORANI_PRESETS, ARABIC_PRESETS } from '../cipherData';
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
  ArrowDownUp
} from 'lucide-react';
import { MultiSystemScanner } from './MultiSystemScanner';
import { AddToNotebookButton } from './AddToNotebookButton';
import { SaveSystemModal } from './SaveSystemModal';
import { getAllNooraniItems, getAllArabicItems, applyWawToCelestialLayers, buildCrossLayersFromPair } from '../utils/multiSystemSearch';

interface DualTranslatorProps {
  onNavigateToEncrypt?: (text: string) => void;
  onNavigateToDecrypt?: (text: string) => void;
}

const DEFAULT_RECENT_SEARCHES = ['طسم', 'كهيعص', 'بقرة', 'يس', 'سلام'];
const STORAGE_KEY_HISTORY = 'cipher_recent_searches';

export function DualTranslator({ onNavigateToEncrypt, onNavigateToDecrypt }: DualTranslatorProps) {
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
    analyzeText,
    validCipherLetters
  } = useCipherLayers();

  const [inputText, setInputText] = useState('');
  const [submittedText, setSubmittedText] = useState('');
  const [viewMode, setViewMode] = useState<'both' | 'decrypt' | 'encrypt'>('both');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showMultiSystemScanner, setShowMultiSystemScanner] = useState(false);

  // Feature Options: Consider 'و' (Waw) in all cipher layers (افتراضياً مفعل)
  const [includeWawInAllLayers, setIncludeWawInAllLayers] = useState(true);

  // Reverse / Inversion toggles for Sky and Earth selectors
  const [isNooraniReversed, setIsNooraniReversed] = useState(false);
  const [isArabicReversed, setIsArabicReversed] = useState(false);

  // Fast Sentence Translation Mode state
  const [fastTranslationMode, setFastTranslationMode] = useState(false);
  const [selectedWordCandidates, setSelectedWordCandidates] = useState<Record<number, string>>({});

  // Dictionary loaded counts for reactive re-evaluations
  const [dictCount, setDictCount] = useState<number>(arabicDictionary.getWordCount());
  const [quranicCount, setQuranicCount] = useState<number>(quranicDictionary.getWordCount());

  useEffect(() => {
    const unsubDict = arabicDictionary.subscribe((_prog, _done, count) => {
      setDictCount(count || arabicDictionary.getWordCount());
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
  
  // Persistent Search History
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_RECENT_SEARCHES;
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
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item !== trimmed);
      const updated = [trimmed, ...filtered].slice(0, 15);
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch {
      // ignore
    }
  };

  const [copiedShareLink, setCopiedShareLink] = useState(false);

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
        // Fallback for legacy 'r' suffix if skyRevParam wasn't explicitly supplied
        if (
          !skyRevParam &&
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
        if (
          !earthRevParam &&
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

  // Copy concise configuration URL to share with friends
  const handleCopyShareLink = () => {
    try {
      const url = new URL(window.location.origin + window.location.pathname);
      const text = inputText.trim() || submittedText.trim();
      if (text) {
        url.searchParams.set('q', text);
      }

      // Sky (سماء) parameter: preset ID or custom layer sequence
      if (currentNooraniItem && currentNooraniItem.id) {
        url.searchParams.set('s', currentNooraniItem.id);
      } else if (selectedNooraniId) {
        url.searchParams.set('s', selectedNooraniId);
      } else {
        const customCipherSeq = layers.map((l) => (l.cipherLetters || []).filter(Boolean).join('')).join('-');
        if (customCipherSeq) {
          url.searchParams.set('s', customCipherSeq);
        }
      }

      // Earth (أرض) parameter: preset ID or custom layer sequence
      if (currentArabicItem && currentArabicItem.id) {
        url.searchParams.set('e', currentArabicItem.id);
      } else if (selectedArabicId) {
        url.searchParams.set('e', selectedArabicId);
      } else {
        const customArabicSeq = layers.map((l) => (l.arabicLetters || []).filter(Boolean).join('')).join('-');
        if (customArabicSeq) {
          url.searchParams.set('e', customArabicSeq);
        }
      }

      // Explicit flags for reversals
      url.searchParams.set('sr', isNooraniReversed ? '1' : '0');
      url.searchParams.set('er', isArabicReversed ? '1' : '0');

      if (showMultiSystemScanner) {
        url.searchParams.set('scan', '1');
      }
      url.searchParams.set('w', includeWawInAllLayers ? '1' : '0');
      if (viewMode === 'decrypt') {
        url.searchParams.set('v', 'd');
      } else if (viewMode === 'encrypt') {
        url.searchParams.set('v', 'e');
      } else {
        url.searchParams.set('v', 'b');
      }

      // Update current URL quietly without reloads
      window.history.replaceState({}, '', url.toString());

      navigator.clipboard.writeText(url.toString());
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2500);
    } catch (err) {
      console.warn('Share link copy error:', err);
    }
  };

  const [showSaveCurrentSystemModal, setShowSaveCurrentSystemModal] = useState(false);
  const [multiScannerTrigger, setMultiScannerTrigger] = useState(0);

  const handleNormalSearchClick = () => {
    // Automatically close comprehensive scanner unconditionally when clicking normal search button
    setShowMultiSystemScanner(false);
    const targetText = inputText.trim() || submittedText.trim();
    if (targetText) {
      setSubmittedText(targetText);
      addToHistory(targetText);
    }
  };

  const handleComprehensiveSearchClick = () => {
    const targetText = inputText.trim() || submittedText.trim();
    if (targetText) {
      setSubmittedText(targetText);
      setInputText(targetText);
      addToHistory(targetText);
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
  };

  const handleGenerate = handleNormalSearchClick;

  const handleSelectHistory = (term: string) => {
    setInputText(term);
    setSubmittedText(term);
    addToHistory(term);
    setShowMultiSystemScanner(false);
  };

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
      if (d.isSpecialOrSpace) return d.char;
      if (d.layer && d.layer.cipherLetters && d.layer.cipherLetters.length > 0) {
        const active = d.layer.cipherLetters.filter(Boolean);
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

  // Fast Sentence / Word-by-Word Translation Analysis
  const sentenceWords = useMemo(() => {
    const raw = (submittedText || inputText).trim();
    if (!raw) return [];
    return raw.split(/\s+/).filter(Boolean);
  }, [submittedText, inputText]);

  // Compute Quranic word candidates for each word in sentence
  const sentenceWordCandidates = useMemo(() => {
    if (!fastTranslationMode || sentenceWords.length === 0) return [];

    return sentenceWords.map((word) => {
      const candidatesList: {
        word: string;
        meta?: QuranicWordMeta;
        type: 'exact' | 'quranic' | 'dictionary';
        operation: 'decryption' | 'encryption' | 'plain';
        isShaddah: boolean;
      }[] = [];

      const seen = new Set<string>();

      // 1. Direct Quranic lookup for word (plain text)
      const directMeta = quranicDictionary.getWordDetails(word);
      if (directMeta) {
        seen.add(directMeta.word);
        candidatesList.push({
          word: directMeta.word,
          meta: directMeta,
          type: 'exact',
          operation: 'plain',
          isShaddah: Boolean(
            directMeta.isShaddahVariant ||
            directMeta.word.includes('\u0651') ||
            (directMeta.originalQuranicWord && directMeta.originalQuranicWord.includes('\u0651'))
          ),
        });
      }

      // 2. Decryption permutations for word (فك التشفير: تحويل الرموز السماوية لأحرف أرضية)
      const cleanWChars = Array.from(cleanText(word));
      const wDecoded = cleanWChars.map((char) => {
        const m = effectiveLayers.filter(
          (l) => Array.isArray(l.cipherLetters) && l.cipherLetters.filter(Boolean).includes(char)
        );
        return Array.from(new Set(m.flatMap((l) => l.arabicLetters).filter(Boolean)));
      });

      if (wDecoded.length > 0 && wDecoded.every((c) => c.length > 0)) {
        const combos: string[] = [];
        function build(idx: number, cur: string) {
          if (combos.length >= 150) return;
          if (idx === wDecoded.length) {
            combos.push(cur);
            return;
          }
          for (const ch of wDecoded[idx]) {
            build(idx + 1, cur + ch);
            if (combos.length >= 150) return;
          }
        }
        build(0, '');

        for (const cb of combos) {
          const meta = quranicDictionary.getWordDetails(cb);
          if (meta && !seen.has(cb)) {
            seen.add(cb);
            candidatesList.push({
              word: cb,
              meta,
              type: 'quranic',
              operation: 'decryption',
              isShaddah: Boolean(
                meta.isShaddahVariant ||
                cb.includes('\u0651') ||
                (meta.originalQuranicWord && meta.originalQuranicWord.includes('\u0651'))
              ),
            });
          }
          const rev = cb.split('').reverse().join('');
          if (rev !== cb) {
            const metaRev = quranicDictionary.getWordDetails(rev);
            if (metaRev && !seen.has(rev)) {
              seen.add(rev);
              candidatesList.push({
                word: rev,
                meta: metaRev,
                type: 'quranic',
                operation: 'decryption',
                isShaddah: Boolean(
                  metaRev.isShaddahVariant ||
                  rev.includes('\u0651') ||
                  (metaRev.originalQuranicWord && metaRev.originalQuranicWord.includes('\u0651'))
                ),
              });
            }
          }
        }
      }

      // 3. Encryption permutations for word (التشفير: تحويل الأحرف الأرضية لأحرف سماوية)
      const wEncDetails = analyzeWord(word, effectiveLayers);
      if (wEncDetails.length > 0 && !wEncDetails.some((d) => d.layer === null && !d.isSpecialOrSpace)) {
        const encCombos = getAllCombinations(wEncDetails, 150, true);
        for (const ec of encCombos) {
          const meta = quranicDictionary.getWordDetails(ec);
          if (meta && !seen.has(ec)) {
            seen.add(ec);
            candidatesList.push({
              word: ec,
              meta,
              type: 'quranic',
              operation: 'encryption',
              isShaddah: Boolean(
                meta.isShaddahVariant ||
                ec.includes('\u0651') ||
                (meta.originalQuranicWord && meta.originalQuranicWord.includes('\u0651'))
              ),
            });
          }
        }
      }

      // If no candidates found, fallback to closest Quranic word or the word itself
      if (candidatesList.length === 0) {
        const nearest = quranicDictionary.findClosestQuranicWord(word);
        if (nearest) {
          const nMeta = quranicDictionary.getWordDetails(nearest.word);
          if (nMeta) {
            candidatesList.push({
              word: nearest.word,
              meta: nMeta,
              type: 'dictionary',
              operation: 'plain',
              isShaddah: Boolean(nMeta.isShaddahVariant || nearest.word.includes('\u0651')),
            });
          }
        }
        if (candidatesList.length === 0) {
          candidatesList.push({
            word,
            type: 'exact',
            operation: 'plain',
            isShaddah: word.includes('\u0651'),
          });
        }
      }

      return {
        originalWord: word,
        candidates: candidatesList,
      };
    });
  }, [fastTranslationMode, sentenceWords, effectiveLayers, quranicCount]);

  // Assembled full sentence
  const assembledSentence = useMemo(() => {
    if (sentenceWords.length === 0) return '';
    return sentenceWords
      .map((orig, i) => {
        if (selectedWordCandidates[i]) return selectedWordCandidates[i];
        const item = sentenceWordCandidates[i];
        if (item && item.candidates.length > 0) {
          return item.candidates[0].word;
        }
        return orig;
      })
      .join(' ');
  }, [sentenceWords, selectedWordCandidates, sentenceWordCandidates]);

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

  // Active layers in current input
  const activeLayersNumbers = useMemo(() => {
    const set = new Set<number>();
    decodedItems.forEach(d => {
      d.matchingLayers.forEach(l => set.add(l.layer));
    });
    encryptionDetails.forEach(d => {
      if (d.layer) set.add(d.layer.layer);
    });
    return Array.from(set);
  }, [decodedItems, encryptionDetails]);

  // Extract all Sky and Earth items with serial numbers
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

  const currentSystemSuggestedName = useMemo(() => {
    if (activeTableName) return activeTableName;
    const nName = currentNooraniItem ? `سماء ${currentNooraniItem.index}` : 'سماء';
    const aName = currentArabicItem ? `أرض ${currentArabicItem.index}` : 'أرض';
    return `${nName} مع ${aName}`;
  }, [activeTableName, currentNooraniItem, currentArabicItem]);

  const isCurrentSystemSaved = isSystemSaved(currentSystemSuggestedName);

  return (
    <div className="space-y-3 sm:space-y-3.5 max-w-6xl mx-auto">
      
      {/* 1. Dual Profile Bar (قائمة السماء وقائمة الأرض مع الأرقام التسلسلية) */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 px-3 py-2 sm:py-2.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          
          {/* Two Independent Selectors: Sky & Earth */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-w-0">
            {/* Sky Table Selector (سماء - اللون النيلي / السماوي الموحد لفك التشفير والسماء) */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-2xs sm:text-xs font-black text-indigo-700 dark:text-indigo-400 shrink-0 flex items-center gap-1">
                <span>🌌</span>
                <span>سماء:</span>
              </span>
              <select
                value={selectedNooraniId}
                onChange={(e) => {
                  applyNooraniDistribution(e.target.value);
                }}
                className="flex-1 min-w-0 text-xs font-bold py-1.5 px-2 rounded-lg bg-indigo-50/70 dark:bg-stone-800 border border-indigo-300/80 dark:border-indigo-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
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
                className={`p-1.5 rounded-lg border text-2xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                  isNooraniReversed
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                    : 'bg-white dark:bg-stone-800 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                }`}
                title={isNooraniReversed ? 'عكس طبقات السماء مفعل (من الطبقة 1 إلى 7)' : 'انقر لعكس طبقات السماء (من الطبقة 1 إلى 7)'}
              >
                <ArrowDownUp className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Earth Table Selector (أرض - اللون الكهرماني / البرتقالي الموحد للتشفير والأرض) */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-2xs sm:text-xs font-black text-amber-700 dark:text-amber-400 shrink-0 flex items-center gap-1">
                <span>🌍</span>
                <span>أرض:</span>
              </span>
              <select
                value={selectedArabicId}
                onChange={(e) => {
                  applyArabicDistribution(e.target.value);
                }}
                className="flex-1 min-w-0 text-xs font-bold py-1.5 px-2 rounded-lg bg-amber-50/70 dark:bg-stone-800 border border-amber-300/80 dark:border-amber-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
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
                className={`p-1.5 rounded-lg border text-2xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                  isArabicReversed
                    ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                    : 'bg-white dark:bg-stone-800 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
                title={isArabicReversed ? 'عكس طبقات الأرض مفعل (من الطبقة 1 إلى 7)' : 'انقر لعكس طبقات الأرض (من الطبقة 1 إلى 7)'}
              >
                <ArrowDownUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Actions & Rainbow Indicators */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0 flex-wrap">
            <CompactLayersIndicator activeLayerNumbers={activeLayersNumbers.length > 0 ? activeLayersNumbers : [1, 2, 3, 4, 5, 6, 7]} />

            {/* Share Configuration Link Button */}
            <button
              type="button"
              onClick={handleCopyShareLink}
              className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer text-2xs font-bold border ${
                copiedShareLink
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border-indigo-200 dark:border-indigo-800'
              }`}
              title={copiedShareLink ? 'تم نسخ الرابط! ✓' : 'نسخ رابط مباشر ينقل جميع إعدادات الشاشة الحالية لأصدقائك'}
            >
              {copiedShareLink ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <Share2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              )}
            </button>

            {/* Save Current System to Notebook */}
            <button
              type="button"
              onClick={() => setShowSaveCurrentSystemModal(true)}
              className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer text-2xs font-bold border ${
                isCurrentSystemSaved
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 shadow-2xs'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-200 border-stone-300 dark:border-stone-700'
              }`}
              title={isCurrentSystemSaved ? 'محفوظة بالمفكرة ✓' : 'حفظ هذه المنظومة وملاحظاتك عنها في مفكرة الشيفرات'}
            >
              <BookmarkPlus className={`w-4 h-4 ${isCurrentSystemSaved ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400 dark:text-stone-500'}`} />
            </button>

            {/* Open Systems Notebook Button */}
            <button
              type="button"
              onClick={() => openDrawer('systems')}
              className="p-1.5 sm:p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer text-2xs font-bold relative"
              title="فتح مفكرة الشيفرات والمنظومات المحفوظة"
            >
              <BookMarked className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              {savedSystems.length > 0 && (
                <span className="absolute -top-1 -right-1 font-mono text-3xs px-1 py-0.1 rounded-full bg-amber-500 text-white font-black leading-none min-w-[14px] text-center">
                  {savedSystems.length}
                </span>
              )}
            </button>

            <button
              onClick={() => exportCurrentTableAsTextFile()}
              className="px-2 py-1.5 rounded-lg text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer text-2xs font-bold"
              title="تصدير المنظومة كملف نصي مبسط (.txt) سطر بسطر"
            >
              TXT
            </button>

            <button
              onClick={() => exportCurrentTableAsFile()}
              className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
              title="تصدير المنظومة كملف JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Compact Smart Input Card */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-3 sm:p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-end gap-2">
          {/* Compact View Mode Selector */}
          <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-2xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'both'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              عرض متزامن
            </button>
            <button
              type="button"
              onClick={() => setViewMode('decrypt')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'decrypt'
                  ? 'bg-white dark:bg-stone-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              فك التشفير
            </button>
            <button
              type="button"
              onClick={() => setViewMode('encrypt')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'encrypt'
                  ? 'bg-white dark:bg-stone-700 text-amber-700 dark:text-amber-300 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              التشفير
            </button>
          </div>
        </div>

        {/* Input and Generate Button */}
        <div className="flex items-stretch gap-2">
          <div className="relative flex-1 flex items-center">
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
              className={`w-full text-sm sm:text-base font-bold py-2 px-3 pe-8 ps-14 rounded-lg border focus:outline-none focus:ring-2 bg-stone-50/50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 transition-all shadow-inner ${
                nooraniAnalysis?.isPureNoorani
                  ? 'border-amber-400/90 dark:border-amber-600/80 focus:ring-amber-500 bg-amber-50/20'
                  : 'border-stone-300 dark:border-stone-700 focus:ring-amber-500'
              }`}
            />
            
            {/* Quick Action Controls Inside Input (Left Side in RTL) */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {/* Paste Button: Clears and Pastes directly */}
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

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!showMultiSystemScanner && !inputText.trim() && !submittedText.trim()}
            className="p-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 text-white transition-all shadow-2xs flex items-center justify-center cursor-pointer shrink-0"
            title="بحث وفحص النص في المنظومة الحالية"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleComprehensiveSearchClick}
            disabled={!inputText.trim() && !submittedText.trim()}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
              showMultiSystemScanner
                ? 'bg-emerald-700 dark:bg-emerald-600 text-white ring-2 ring-emerald-400 dark:ring-emerald-500 shadow-sm'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white'
            }`}
            title="بحث وفحص شامل عبر كافة المنظومات الـ 50+ مباشرة للكلمة الحالية (Ctrl + Enter)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>البحث الشامل</span>
          </button>
        </div>

        {/* Dynamic Operational Hint & Unified Waw Option (شريط التوجيه الذكي وخيار حرف الواو الموحد) */}
        {nooraniAnalysis ? (
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-2xs px-3 py-1.5 rounded-lg border transition-all ${
              nooraniAnalysis.isPureNoorani
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div
                className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                  nooraniAnalysis.isPureNoorani
                    ? 'bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200'
                    : 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                }`}
              >
                {nooraniAnalysis.isPureNoorani ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
              </div>

              <span className="font-extrabold">
                {nooraniAnalysis.isPureNoorani
                  ? `أحرف نورانية خالصة (${nooraniAnalysis.nooraniCount} من 14)`
                  : `أحرف عامة (${nooraniAnalysis.nonNooraniCount} غير نوراني من 28)`}
              </span>
              <span className="opacity-40">•</span>
              <span className="font-bold inline-flex items-center gap-1">
                <span>المسار الأنسب:</span>
                <span
                  className={`px-1.5 py-0.5 rounded font-black inline-flex items-center gap-1 ${
                    nooraniAnalysis.isPureNoorani
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                      : 'bg-amber-600 text-white dark:bg-amber-500'
                  }`}
                >
                  {nooraniAnalysis.isPureNoorani ? (
                    <>
                      <Unlock className="w-2.5 h-2.5" />
                      <span>فك تشفير</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-2.5 h-2.5" />
                      <span>تشفير</span>
                    </>
                  )}
                </span>
              </span>
            </div>

            {/* Unified Waw Option & Quick Filter */}
            <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto shrink-0">
              <label
                className="inline-flex items-center gap-1.5 cursor-pointer select-none group"
                title="اعتبار حرف الواو (و) مع الأحرف السماوية (ن، ق، ص)"
              >
                <input
                  type="checkbox"
                  checked={includeWawInAllLayers}
                  onChange={(e) => setIncludeWawInAllLayers(e.target.checked)}
                  className="rounded border-stone-300 dark:border-stone-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span className={`font-bold transition-colors text-2xs ${includeWawInAllLayers ? 'text-indigo-800 dark:text-indigo-300' : 'text-stone-600 dark:text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-200'}`}>
                  اعتبار (و) سماوياً
                </span>
                {includeWawInAllLayers && (
                  <span className="px-1.5 py-0.2 rounded-full text-3xs font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300/60">
                    سماوي ✨
                  </span>
                )}
              </label>

              {/* Quick Filter Switch if in single tab view */}
              {viewMode !== 'both' && (
                <button
                  type="button"
                  onClick={() => setViewMode(nooraniAnalysis.recommendedMode)}
                  className="text-3xs font-bold px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 hover:scale-105 transition-all cursor-pointer shrink-0 shadow-2xs"
                >
                  تطبيق المسار
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-2xs px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 text-stone-600 dark:text-stone-400">
            <span className="text-3xs text-stone-400 dark:text-stone-500">
              اكتب كلمة في مربع البحث لعرض التوجيه الذكي ومسار التشفير
            </span>
            <label
              className="inline-flex items-center gap-1.5 cursor-pointer select-none group"
              title="اعتبار حرف الواو (و) مع الأحرف السماوية (ن، ق، ص)"
            >
              <input
                type="checkbox"
                checked={includeWawInAllLayers}
                onChange={(e) => setIncludeWawInAllLayers(e.target.checked)}
                className="rounded border-stone-300 dark:border-stone-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className={`font-bold transition-colors text-2xs ${includeWawInAllLayers ? 'text-indigo-800 dark:text-indigo-300' : 'text-stone-600 dark:text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-200'}`}>
                اعتبار (و) سماوياً
              </span>
            </label>
          </div>
        )}

        {/* Multi-System Full Scanner */}
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

        {/* 3. Interactive Recent Search History (سجل البحث السابق) */}
        <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 text-2xs font-extrabold text-stone-500 dark:text-stone-400 shrink-0">
            <History className="w-3 h-3 text-stone-500 dark:text-stone-400" />
            <span>السجل:</span>
          </div>

          {searchHistory.length === 0 ? (
            <span className="text-2xs text-stone-400 italic">لا يوجد بحث سابق</span>
          ) : (
            <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap">
              {searchHistory.map((item) => {
                const itemChars = item.replace(/[^ء-ي]/g, '').split('');
                const isItemPureNoorani = itemChars.length > 0 && itemChars.every((c) => NOORANI_LETTERS_SET.has(c));

                return (
                  <button
                    key={`hist_${item}`}
                    type="button"
                    onClick={() => handleSelectHistory(item)}
                    className={`text-2xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer shrink-0 inline-flex items-center font-['Amiri',serif] border ${
                      submittedText === item
                        ? isItemPureNoorani
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : isItemPureNoorani
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 border-amber-200 dark:border-amber-800 hover:border-amber-400'
                    }`}
                    title={`البحث عن: ${item} (${isItemPureNoorani ? 'أحرف نورانية / فك تشفير' : 'أبجدية عامة / تشفير'})`}
                  >
                    <span>{item}</span>
                  </button>
                );
              })}

              {searchHistory.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="p-1 text-stone-400 hover:text-rose-500 rounded transition-colors shrink-0"
                  title="مسح سجل البحث"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Feature Options: Fast Translation toggle */}
        <div className="pt-2 border-t border-stone-200/80 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Fast Translation option */}
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={fastTranslationMode}
                onChange={(e) => setFastTranslationMode(e.target.checked)}
                className="rounded border-stone-300 dark:border-stone-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className={`font-bold transition-colors text-2xs sm:text-xs ${fastTranslationMode ? 'text-indigo-700 dark:text-indigo-300' : 'text-stone-600 dark:text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-200'}`}>
                الترجمة السريعة للجمل (كلمة بكلمة)
              </span>
              {fastTranslationMode && (
                <span className="px-1.5 py-0.2 rounded-full text-3xs font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300/60">
                  جمل متتابعة ⚡
                </span>
              )}
            </label>
          </div>
        </div>
      </div>

      {/* 3. Fast Sentence Translation Panel (الترجمة السريعة للجمل) */}
      {fastTranslationMode && !showMultiSystemScanner && (
        <div className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 shadow-sm space-y-3.5 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>الترجمة السريعة للجمل (كلمة بكلمة)</span>
                  <span className="px-2 py-0.5 rounded-full text-3xs font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {sentenceWords.length} كلمة
                  </span>
                </h3>
                <p className="text-3xs text-stone-500 dark:text-stone-400">
                  انقر على خيار الترجمة لكل كلمة لتكوين الجملة المترجمة الصريحة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {assembledSentence && (
                <button
                  type="button"
                  onClick={() => {
                    addEntry(
                      assembledSentence,
                      (submittedText || inputText).trim(),
                      { type: 'quranic', note: 'ترجمة سريعة للجملة كلمة بكلمة' }
                    );
                    handleCopy(assembledSentence, 'fast-sentence-saved');
                  }}
                  className="px-3 py-1.5 rounded-xl text-2xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{copiedText === 'fast-sentence-saved' ? 'تم الحفظ بالدفتر! ✓' : 'حفظ بالدفتر 📓'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Legend for Fast Translation (المفتاح) */}
          <div className="flex items-center gap-3 flex-wrap text-2xs p-2.5 rounded-xl bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400">
            <span className="font-extrabold text-stone-700 dark:text-stone-300 shrink-0">المفتاح:</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold">
              <span>خلفية زرقاء: فك تشفير</span>
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold">
              <span>خلفية برتقالية: تشفير</span>
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold">
              <span>خلفية رمادية: أصلية</span>
            </span>
          </div>

          {/* Words breakdown list */}
          {sentenceWords.length === 0 ? (
            <div className="text-center py-5 text-stone-400 dark:text-stone-500 text-xs">
              ادخل كلمة أو سطر كامل في صندوق البحث أعلاه لعرض الترجمة كلمة بكلمة
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pe-1 custom-scrollbar">
              {sentenceWordCandidates.map((item, idx) => {
                const selectedWord = selectedWordCandidates[idx] || (item.candidates[0]?.word || item.originalWord);

                return (
                  <div
                    key={idx}
                    className="bg-stone-50 dark:bg-stone-950/70 rounded-xl p-3 border border-stone-200 dark:border-stone-800 space-y-2 hover:border-stone-300 dark:hover:border-stone-700 transition-all"
                  >
                    <div className="flex items-center justify-between text-2xs">
                      <span className="font-extrabold text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-amber-400 flex items-center justify-center font-mono font-bold text-3xs">
                          {idx + 1}
                        </span>
                        <span>الكلمة:</span>
                        <span className="text-amber-700 dark:text-amber-300 font-black text-sm font-['Amiri',serif]">{item.originalWord}</span>
                      </span>

                      <span className="text-stone-500 dark:text-stone-400 text-3xs">
                        المختار: <strong className="text-emerald-700 dark:text-emerald-400 font-['Amiri',serif] text-xs font-black">{selectedWord}</strong>
                      </span>
                    </div>

                    {/* Candidate pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.candidates.map((cand, cIdx) => {
                        const isSelected = selectedWord === cand.word;

                        return (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={() => setSelectedWordCandidates((prev) => ({ ...prev, [idx]: cand.word }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 font-['Amiri',serif] border ${
                              isSelected
                                ? cand.operation === 'decryption'
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/40'
                                  : cand.operation === 'encryption'
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-500/40'
                                  : 'bg-stone-700 text-white border-stone-700 shadow-sm ring-2 ring-stone-500/40'
                                : cand.operation === 'decryption'
                                ? 'bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400'
                                : cand.operation === 'encryption'
                                ? 'bg-amber-50/90 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 border-amber-200 dark:border-amber-800 hover:border-amber-400'
                                : 'bg-stone-100 dark:bg-stone-850 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-750 hover:border-stone-400'
                            }`}
                          >
                            <span className="text-sm font-bold">{cand.word}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Assembled Result Sentence Banner */}
          {assembledSentence && (
            <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-3xs text-amber-800 dark:text-amber-300 font-bold">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>الجملة المترجمة الصريحة:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedWordCandidates({})}
                  className="text-3xs text-stone-500 hover:text-amber-700 dark:text-stone-400 dark:hover:text-amber-300 underline cursor-pointer"
                >
                  إعادة ضبط
                </button>
              </div>

              <div className="text-base sm:text-lg font-bold text-amber-950 dark:text-amber-100 font-['Amiri',serif] leading-relaxed tracking-wide bg-white dark:bg-stone-900 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/40 text-center select-all shadow-2xs">
                {assembledSentence}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Dense Output Results Layout (عرض متزامن يمين ويسار بدون سكرول طويل) */}
      {submittedText && !showMultiSystemScanner && (
        <div className={viewMode === 'both' ? "grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start" : "space-y-3"}>

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
                  <div className="w-5 h-5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                    <Unlock className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
                    نتائج فك التشفير
                  </h3>
                  {nooraniAnalysis?.isPureNoorani && (
                    <span className="px-2 py-0.5 rounded-full text-3xs font-black bg-indigo-600 text-white flex items-center gap-0.5 shadow-2xs">
                      <Unlock className="w-2.5 h-2.5" />
                      <span>المسار المقترح</span>
                    </span>
                  )}
                </div>

                {onNavigateToDecrypt && (
                  <button
                    onClick={() => onNavigateToDecrypt(submittedText)}
                    className="text-2xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>التفاصيل الكاملة</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Priority 1: Exact Quranic Matches (المطابقات القرآنية المؤكدة - خلفية نيلية فك تشفير وإطار زمردي قرآني) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>المطابقات القرآنية المؤكدة ({quranicMatches.length})</span>
                  </h4>
                </div>

                {quranicMatches.length === 0 ? (
                  <div className="py-2 px-3 bg-stone-50/60 dark:bg-stone-950/40 rounded-lg border border-stone-200 dark:border-stone-800 text-2xs text-stone-500 text-center">
                    لا توجد ألفاظ قرآنية مباشرة في هذا الاحتمال
                  </div>
                ) : (
                  /* High Density Quranic Chips Grid - Indigo Decryption with Emerald Quranic Border */
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {quranicMatches.map((item, idx) => {
                      const url = getQuranTopWordUrl(item.word, item.meta.surahNumber, item.meta.ayahNum, item.meta.occurrences);
                      const isCopied = copiedText === `q_${idx}`;
                      return (
                        <div
                          key={`quran_${item.word}_${idx}`}
                          onClick={() => handleCopy(item.word, `q_${idx}`)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/70 border-2 border-emerald-500 dark:border-emerald-400 flex items-center justify-between gap-1.5 shadow-2xs hover:border-emerald-600 dark:hover:border-emerald-300 transition-all cursor-pointer select-none group"
                          title={`انقر لنسخ [${item.word}]`}
                        >
                          <div className="flex items-baseline gap-1.5 min-w-0">
                            <span className="text-base sm:text-lg font-black font-['Amiri',serif] text-indigo-950 dark:text-indigo-100 leading-tight">
                              {item.word}
                            </span>
                            {isCopied ? (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                تم النسخ
                              </span>
                            ) : (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10.5px] text-indigo-700 dark:text-indigo-300 hover:text-indigo-950 dark:hover:text-white font-sans truncate hover:underline"
                                title="عرض السورة والآيات"
                              >
                                {item.meta.surahName} {item.meta.occurrences > 1 ? `(${item.meta.occurrences}×)` : ''}
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {item.isReversed && (
                              <RotateCcw
                                className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0"
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

              {/* Priority 2: Confirmed Arabic Lexicon Matches (خلفية نيلية فك تشفير وإطار رمادي معجمي) */}
              {arabicDictionaryMatches.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-stone-100 dark:border-stone-800">
                  <h4 className="text-xs font-black text-stone-700 dark:text-stone-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>الكلمات المعجمية ({arabicDictionaryMatches.length})</span>
                  </h4>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1.5 rounded-lg bg-stone-50/50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800">
                    {arabicDictionaryMatches.slice(0, 60).map((item, idx) => (
                      <div
                        key={`dict_${item.word}_${idx}`}
                        className="px-2 py-0.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-stone-300 dark:border-stone-700 text-2xs font-bold hover:scale-105 transition-all inline-flex items-center gap-1"
                      >
                        <button
                          type="button"
                          onClick={() => handleCopy(item.word, `d_${idx}`)}
                          className="inline-flex items-center gap-1 cursor-pointer"
                          title="انقر لنسخ الكلمة"
                        >
                          <span>{item.word}</span>
                          {item.isReversed && (
                            <RotateCcw className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400 shrink-0" title="معكوس الكلمة" />
                          )}
                          {copiedText === `d_${idx}` ? <Check className="w-2.5 h-2.5 text-indigo-600" /> : null}
                        </button>
                        <a
                          href={getArabicDictSearchUrl(item.word)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-700 dark:text-indigo-300 hover:text-indigo-950 dark:hover:text-indigo-100 p-0.5"
                          title={`البحث عن "${item.word}" في المعجم على موقع قرآن توب`}
                        >
                          <ExternalLink className="w-2.5 h-2.5 opacity-70 hover:opacity-100" />
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

              {/* Priority 3: Permutations Bank */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAllPermutations(!showAllPermutations)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-stone-50 dark:bg-stone-950/60 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors cursor-pointer text-2xs sm:text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-stone-500" />
                    <span className="font-bold text-stone-700 dark:text-stone-300">
                      بنك الاحتمالات ({rawCombinations.length})
                    </span>
                  </div>
                  {showAllPermutations ? <ChevronUp className="w-3.5 h-3.5 text-stone-500" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-500" />}
                </button>

                {showAllPermutations && (
                  <div className="mt-2 p-2.5 rounded-lg bg-stone-50/50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          value={permutationSearch}
                          onChange={(e) => setPermutationSearch(e.target.value)}
                          placeholder="تصفية الاحتمالات..."
                          className="w-full text-2xs py-1 px-2 pe-7 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(filteredPermutations.join('\n'), 'all_perms')}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors shrink-0 cursor-pointer shadow-2xs"
                        title="نسخ كافة الاحتمالات"
                      >
                        {copiedText === 'all_perms' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="max-h-40 overflow-y-auto p-1.5 rounded bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-wrap gap-1">
                      {filteredPermutations.map((word, i) => (
                        <span
                          key={`perm_${word}_${i}`}
                          onClick={() => handleCopy(word, `perm_${i}`)}
                          className="px-1.5 py-0.5 rounded text-2xs font-mono font-bold bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-amber-100 dark:hover:bg-amber-950 cursor-pointer"
                          title="انقر للنسخ"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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
                  <div className="w-5 h-5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
                    نتائج التشفير
                  </h3>
                  {!nooraniAnalysis?.isPureNoorani && (
                    <span className="px-2 py-0.5 rounded-full text-3xs font-black bg-amber-600 text-white flex items-center gap-0.5 shadow-2xs">
                      <Lock className="w-2.5 h-2.5" />
                      <span>المسار المقترح</span>
                    </span>
                  )}
                </div>

                {onNavigateToEncrypt && (
                  <button
                    onClick={() => onNavigateToEncrypt(submittedText)}
                    className="text-2xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>التفاصيل الكاملة</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              {hasMissingArabic ? (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-center text-xs font-bold text-rose-700 dark:text-rose-300">
                  بعض أحرف هذه الكلمة غير موجودة في جدول التشفير الحالي.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Dense Output Banner */}
                  <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xs font-black text-amber-600 dark:text-amber-400 shrink-0">
                        الشفرة:
                      </span>
                      <div className="text-xl font-black font-['Amiri',serif] tracking-wider text-stone-900 dark:text-stone-100 truncate">
                        {primaryCipherOutput}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <AddToNotebookButton
                        word={submittedText}
                        cipher={primaryCipherOutput}
                        systemName={activeTableName}
                        type="encryption"
                        variant="button"
                        label="حفظ بالدفتر"
                      />

                      <button
                        onClick={() => handleCopy(primaryCipherOutput, 'enc_res')}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer shrink-0"
                      >
                        {copiedText === 'enc_res' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>نسخ</span>
                      </button>
                    </div>
                  </div>

                  {/* Noorani Segments if any */}
                  {encCipherSegmentation && encCipherSegmentation.segments.length > 0 && (
                    <div className="p-1.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 flex items-center gap-1.5 flex-wrap">
                      <span className="text-3xs font-bold text-amber-800 dark:text-amber-300">
                        فواتح السور:
                      </span>
                      <NooraniSegmentsBadge segmentation={encCipherSegmentation} />
                    </div>
                  )}

                  {/* Dense Letter Breakdown with Color-Only Micro Tiles (No redundant layer number labels) */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {encryptionDetails.map((detail, idx) => {
                      if (detail.isSpecialOrSpace) return null;
                      const layerNum = detail.layer ? detail.layer.layer : 0;
                      const color = LAYER_RAINBOW_COLORS[layerNum] || {
                        activeBg: 'bg-stone-800',
                        activeText: 'text-white',
                        activeBorder: 'border-stone-900',
                        lightBg: 'bg-stone-50',
                        lightBorder: 'border-stone-200',
                      };
                      const ciphers = detail.layer ? detail.layer.cipherLetters.filter(Boolean) : [];

                      return (
                        <div
                          key={`char_${idx}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-2xs text-xs"
                          title={`الحرف [${detail.char}]`}
                        >
                          <span className={`w-5 h-5 rounded font-black text-xs font-['Amiri',serif] flex items-center justify-center shrink-0 ${color.activeBg} ${color.activeText} border ${color.activeBorder}`}>
                            {detail.char}
                          </span>
                          <span className="text-2xs font-mono font-bold text-stone-600 dark:text-stone-300">
                            {ciphers.join('/')}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Priority 1: Exact Quranic Matches from Encryption Combinations (خلفية كهرمانية تشفير وإطار زمردي قرآني) */}
                  {encQuranicMatches.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                          <span>المطابقات القرآنية المؤكدة للشفرة ({encQuranicMatches.length})</span>
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
                              className="px-2.5 py-1 rounded-lg bg-amber-50/80 dark:bg-amber-950/70 border-2 border-emerald-500 dark:border-emerald-400 flex items-center justify-between gap-1.5 shadow-2xs hover:border-emerald-600 dark:hover:border-emerald-300 transition-all cursor-pointer select-none group"
                              title={`انقر لنسخ [${item.word}]`}
                            >
                              <div className="flex items-baseline gap-1.5 min-w-0">
                                <span className="text-base sm:text-lg font-black font-['Amiri',serif] text-amber-950 dark:text-amber-100 leading-tight">
                                  {item.word}
                                </span>
                                {isCopied ? (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                    تم النسخ
                                  </span>
                                ) : (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10.5px] text-amber-800 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-200 font-sans truncate hover:underline"
                                    title="عرض السورة والآيات"
                                  >
                                    {item.meta.surahName} {item.meta.occurrences > 1 ? `(${item.meta.occurrences}×)` : ''}
                                  </a>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {item.isReversed && (
                                  <RotateCcw
                                    className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0"
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

                  {/* Priority 2: Distinct Nearest Quranic Vocabulary Matches (Sky Blue Border & Distinct Color) */}
                  {encNearestQuranicMatches.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-sky-100 dark:border-stone-800">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                          <span>أقرب المفردات شبهاً ({encNearestQuranicMatches.length})</span>
                        </h4>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {encNearestQuranicMatches.map((item, idx) => {
                          const isCopied = copiedText === `enc_near_${idx}`;
                          return (
                            <div
                              key={`enc_near_${item.combo}_${idx}`}
                              className="px-2 py-1 rounded-lg bg-sky-50/70 dark:bg-sky-950/30 border-2 border-sky-300/80 dark:border-sky-700/70 hover:border-sky-500 flex items-center gap-1.5 text-xs transition-all shadow-2xs"
                              title={`احتمال الشفرة: [${item.combo}] ← أقرب مفردة قرآنية: [${item.nearest.word}] في ${item.nearest.surahName}`}
                            >
                              <span className="text-3xs font-black px-1.5 py-0.5 rounded bg-sky-200 dark:bg-sky-900 text-sky-900 dark:text-sky-200">
                                {item.nearest.similarity}%
                              </span>
                              <span
                                onClick={() => handleCopy(item.nearest.word, `enc_near_${idx}`)}
                                className="font-bold font-['Amiri',serif] text-stone-900 dark:text-stone-100 text-sm cursor-pointer hover:underline"
                              >
                                {item.nearest.word}
                              </span>
                              <span className="text-3xs text-stone-400 font-mono">
                                ← {item.combo}
                              </span>
                              {item.isReversed && (
                                <RotateCcw className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400 shrink-0" title="معكوس" />
                              )}
                              {isCopied && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
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
                    </div>
                  )}

                  {/* Priority 3: Confirmed Arabic Lexicon Matches (خلفية كهرمانية تشفير وإطار رمادي معجمي) */}
                  {encArabicDictionaryMatches.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                      <h4 className="text-xs font-black text-stone-700 dark:text-stone-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>الكلمات المعجمية ({encArabicDictionaryMatches.length})</span>
                      </h4>
                      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1.5 rounded-lg bg-stone-50/50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800">
                        {encArabicDictionaryMatches.map((item, idx) => (
                          <div
                            key={`enc_dict_${item.word}_${idx}`}
                            className="px-2 py-0.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-stone-300 dark:border-stone-700 text-2xs font-bold hover:scale-105 transition-all inline-flex items-center gap-1"
                          >
                            <button
                              type="button"
                              onClick={() => handleCopy(item.word, `enc_d_${idx}`)}
                              className="inline-flex items-center gap-1 cursor-pointer"
                              title="انقر لنسخ الكلمة"
                            >
                              <span>{item.word}</span>
                              {item.isReversed && (
                                <RotateCcw className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400 shrink-0" title="معكوس الكلمة" />
                              )}
                              {copiedText === `enc_d_${idx}` ? <Check className="w-2.5 h-2.5 text-amber-600" /> : null}
                            </button>
                            <a
                              href={getArabicDictSearchUrl(item.word)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-700 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-100 p-0.5"
                              title={`البحث عن "${item.word}" في المعجم على موقع قرآن توب`}
                            >
                              <ExternalLink className="w-2.5 h-2.5 opacity-70 hover:opacity-100" />
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

                  {/* Priority 4: Encryption Permutations Bank */}
                  {rawEncCombinations.length > 0 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAllEncPermutations(!showAllEncPermutations)}
                        className="w-full flex items-center justify-between p-2 rounded-lg bg-stone-50 dark:bg-stone-950/60 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors cursor-pointer text-2xs sm:text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          <Filter className="w-3.5 h-3.5 text-stone-500" />
                          <span className="font-bold text-stone-700 dark:text-stone-300">
                            بنك الاحتمالات ({rawEncCombinations.length})
                          </span>
                        </div>
                        {showAllEncPermutations ? <ChevronUp className="w-3.5 h-3.5 text-stone-500" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-500" />}
                      </button>

                      {showAllEncPermutations && (
                        <div className="mt-2 p-2.5 rounded-lg bg-stone-50/50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="relative flex-1">
                              <Search className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                              <input
                                type="text"
                                value={encPermutationSearch}
                                onChange={(e) => setEncPermutationSearch(e.target.value)}
                                placeholder="تصفية الاحتمالات..."
                                className="w-full text-2xs py-1 px-2 pe-7 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(filteredEncPermutations.join('\n'), 'all_enc_perms')}
                              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors shrink-0 cursor-pointer shadow-2xs"
                              title="نسخ كافة الاحتمالات"
                            >
                              {copiedText === 'all_enc_perms' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="max-h-40 overflow-y-auto p-1.5 rounded bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-wrap gap-1">
                            {filteredEncPermutations.map((word, i) => (
                              <span
                                key={`enc_perm_${word}_${i}`}
                                onClick={() => handleCopy(word, `enc_perm_${i}`)}
                                className="px-1.5 py-0.5 rounded text-2xs font-mono font-bold bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-amber-100 dark:hover:bg-amber-950 cursor-pointer"
                                title="انقر للنسخ"
                              >
                                {word}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
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

    </div>
  );
}
