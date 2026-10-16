export interface LayerInfo {
  layer: number;
  cipherLetters: string[];
  arabicLetters: string[];
  description: string;
}

export interface LayerColorTheme {
  name: string;
  activeBg: string;
  activeText: string;
  activeBorder: string;
  badgeBg: string;
  badgeText: string;
  lightBg: string;
  lightBorder: string;
  accentHex: string;
}

// 7 Rainbow / Spectrum colors with high WCAG contrast
export const LAYER_RAINBOW_COLORS: Record<number, LayerColorTheme> = {
  1: {
    name: "أحمر",
    activeBg: "bg-red-600",
    activeText: "text-white",
    activeBorder: "border-red-700",
    badgeBg: "bg-red-700",
    badgeText: "text-white",
    lightBg: "bg-red-50",
    lightBorder: "border-red-200",
    accentHex: "#dc2626",
  },
  2: {
    name: "برتقالي",
    activeBg: "bg-orange-500",
    activeText: "text-white",
    activeBorder: "border-orange-600",
    badgeBg: "bg-orange-600",
    badgeText: "text-white",
    lightBg: "bg-orange-50",
    lightBorder: "border-orange-200",
    accentHex: "#f97316",
  },
  3: {
    name: "أصفر",
    activeBg: "bg-amber-400",
    activeText: "text-stone-950 font-medium",
    activeBorder: "border-amber-500",
    badgeBg: "bg-amber-500",
    badgeText: "text-stone-950 font-medium",
    lightBg: "bg-amber-50",
    lightBorder: "border-amber-200",
    accentHex: "#fbbf24",
  },
  4: {
    name: "أخضر",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
    activeBorder: "border-emerald-700",
    badgeBg: "bg-emerald-700",
    badgeText: "text-white",
    lightBg: "bg-emerald-50",
    lightBorder: "border-emerald-200",
    accentHex: "#059669",
  },
  5: {
    name: "أزرق سماوي",
    activeBg: "bg-cyan-600",
    activeText: "text-white",
    activeBorder: "border-cyan-700",
    badgeBg: "bg-cyan-700",
    badgeText: "text-white",
    lightBg: "bg-cyan-50",
    lightBorder: "border-cyan-200",
    accentHex: "#0891b2",
  },
  6: {
    name: "نيلي",
    activeBg: "bg-blue-600",
    activeText: "text-white",
    activeBorder: "border-blue-700",
    badgeBg: "bg-blue-700",
    badgeText: "text-white",
    lightBg: "bg-blue-50",
    lightBorder: "border-blue-200",
    accentHex: "#2563eb",
  },
  7: {
    name: "بنفسجي",
    activeBg: "bg-purple-600",
    activeText: "text-white",
    activeBorder: "border-purple-700",
    badgeBg: "bg-purple-700",
    badgeText: "text-white",
    lightBg: "bg-purple-50",
    lightBorder: "border-purple-200",
    accentHex: "#9333ea",
  },
};

export function getLayerColor(layerNum: number): LayerColorTheme {
  if (LAYER_RAINBOW_COLORS[layerNum]) {
    return LAYER_RAINBOW_COLORS[layerNum];
  }
  const key = ((Math.abs(layerNum) - 1) % 7) + 1;
  return LAYER_RAINBOW_COLORS[key] || LAYER_RAINBOW_COLORS[1];
}

export function createNineCipherSlots(c1 = "", c2 = ""): string[] {
  return [c1, c2].filter(Boolean);
}

export function createNineCipherSlotsFromList(chars: string[]): string[] {
  const flatChars: string[] = [];
  chars.forEach((item) => {
    if (!item) return;
    const trimmed = String(item).trim();
    // Decompose any multi-character string into individual Arabic characters
    const singleLetters = trimmed.replace(/[^ء-ي]/g, "").split("");
    if (singleLetters.length > 0) {
      flatChars.push(...singleLetters);
    }
  });
  return flatChars;
}

export const DEFAULT_CIPHER_LAYERS: LayerInfo[] = [
  {
    layer: 1,
    cipherLetters: createNineCipherSlotsFromList(["ر", "ص"]),
    arabicLetters: ["ر", "ز", "ص", "ض"],
    description: "السماء 1: ر ص | ر ز ص ض",
  },
  {
    layer: 2,
    cipherLetters: createNineCipherSlotsFromList(["م", "ق"]),
    arabicLetters: ["م", "ب", "ق", "د"],
    description: "السماء 2: م ق | م ب ق د",
  },
  {
    layer: 3,
    cipherLetters: createNineCipherSlotsFromList(["ح", "س"]),
    arabicLetters: ["ن", "ذ", "س", "ش"],
    description: "السماء 3: ح س | ن ذ س ش",
  },
  {
    layer: 4,
    cipherLetters: createNineCipherSlotsFromList(["ن", "ع"]),
    arabicLetters: ["ح", "خ", "ع", "غ"],
    description: "السماء 4: ن ع | ح خ ع غ",
  },
  {
    layer: 5,
    cipherLetters: createNineCipherSlotsFromList(["ي", "ل"]),
    arabicLetters: ["ي", "ج", "ل", "ث"],
    description: "السماء 5: ي ل | ي ج ل ث",
  },
  {
    layer: 6,
    cipherLetters: createNineCipherSlotsFromList(["ه", "ا"]),
    arabicLetters: ["ه", "ف", "ا", "و"],
    description: "السماء 6: هـ ا | ه ف ا و",
  },
  {
    layer: 7,
    cipherLetters: createNineCipherSlotsFromList(["ط", "ك"]),
    arabicLetters: ["ط", "ظ", "ك", "ت"],
    description: "السماء 7: ط ك | ط ظ ك ت",
  },
];

export const BENCHMARK_TABLE_NAME =
  "سماء 1: رص مق حس نع يل ها طك × أرض 4: رزصض - مبقد";

export const CIPHER_LAYERS: LayerInfo[] = DEFAULT_CIPHER_LAYERS;

export const ALL_ARABIC_LETTERS_28: string[] = [
  "أ",
  "ب",
  "ت",
  "ث",
  "ج",
  "ح",
  "خ",
  "د",
  "ذ",
  "ر",
  "ز",
  "س",
  "ش",
  "ص",
  "ض",
  "ط",
  "ظ",
  "ع",
  "غ",
  "ف",
  "ق",
  "ك",
  "ل",
  "م",
  "ن",
  "ه",
  "و",
  "ي",
];

export interface ArabicDistributionPreset {
  id: string;
  name: string;
  badge?: string;
  description: string;
  arabicLayers: { layer: number; letters: [string, string, string, string] }[];
}

export interface NooraniDistributionPreset {
  id: string;
  name: string;
  badge?: string;
  description: string;
  nooraniLayers: {
    layer: number;
    cipherLetters: string[];
    description?: string;
  }[];
}

export const ARABIC_PRESETS: Record<string, ArabicDistributionPreset> = {
  arabic_1_az: {
    id: "arabic_1_az",
    name: "أبجد - ذضظغ (الترتيب المشرقي)",
    badge: "أرض 1: أبجد - ذضظغ",
    description:
      "الترتيب المشرقي التقليدي: أبجد هوز حطي كلمن سعفص قرشت ثخذ ضظغ",
    arabicLayers: [
      { layer: 1, letters: ["أ", "ب", "ج", "د"] },
      { layer: 2, letters: ["ه", "و", "ز", "ح"] },
      { layer: 3, letters: ["ط", "ي", "ك", "ل"] },
      { layer: 4, letters: ["م", "ن", "س", "ع"] },
      { layer: 5, letters: ["ف", "ص", "ق", "ر"] },
      { layer: 6, letters: ["ش", "ت", "ث", "خ"] },
      { layer: 7, letters: ["ذ", "ض", "ظ", "غ"] },
    ],
  },
  arabic_2_az: {
    id: "arabic_2_az",
    name: "أبجد - ذظغش (الترتيب المغربي)",
    badge: "أرض 2: أبجد - ذظغش",
    description: "الترتيب المغربي الأصيل: أبجد هوز حطي كلمن صعفض قرست ثخذ ظغش",
    arabicLayers: [
      { layer: 1, letters: ["أ", "ب", "ج", "د"] },
      { layer: 2, letters: ["ه", "و", "ز", "ح"] },
      { layer: 3, letters: ["ط", "ي", "ك", "ل"] },
      { layer: 4, letters: ["م", "ن", "ص", "ع"] },
      { layer: 5, letters: ["ف", "ض", "ق", "ر"] },
      { layer: 6, letters: ["س", "ت", "ث", "خ"] },
      { layer: 7, letters: ["ذ", "ظ", "غ", "ش"] },
    ],
  },
  arabic_3_bsm: {
    id: "arabic_3_bsm",
    name: "رصمق - حسنع - يلهاطك (جدول الأرض 3 الدوري)",
    badge: "أرض 3: رصمق - حسنع",
    description:
      "توزيع أرضي دوري (14 حرف كرر مرتين): ر ص م ق ح س ن ع ي ل هـ ا ط ك ر ص م ق ح س ن ع ي ل هـ ا ط ك",
    arabicLayers: [
      { layer: 1, letters: ["ر", "ص", "م", "ق"] },
      { layer: 2, letters: ["ح", "س", "ن", "ع"] },
      { layer: 3, letters: ["ي", "ل", "ه", "ا"] },
      { layer: 4, letters: ["ط", "ك", "ر", "ص"] },
      { layer: 5, letters: ["م", "ق", "ح", "س"] },
      { layer: 6, letters: ["ن", "ع", "ي", "ل"] },
      { layer: 7, letters: ["ه", "ا", "ط", "ك"] },
    ],
  },
  arabic_4_srqm: {
    id: "arabic_4_srqm",
    name: "رزصض - مبقد (جدول الأرض 4)",
    badge: "أرض 4: رزصض - مبقد",
    description:
      "توزيع أرض رقم 4: ر ز ص ض م ب ق د ن ذ س ش ح خ ع غ ي ج ل ث ه ف ا و ط ظ ك ت",
    arabicLayers: [
      { layer: 1, letters: ["ر", "ز", "ص", "ض"] },
      { layer: 2, letters: ["م", "ب", "ق", "د"] },
      { layer: 3, letters: ["ن", "ذ", "س", "ش"] },
      { layer: 4, letters: ["ح", "خ", "ع", "غ"] },
      { layer: 5, letters: ["ي", "ج", "ل", "ث"] },
      { layer: 6, letters: ["ه", "ف", "ا", "و"] },
      { layer: 7, letters: ["ط", "ظ", "ك", "ت"] },
    ],
  },
};

export const NOORANI_PRESETS: Record<string, NooraniDistributionPreset> = {
  noorani_1_sr: {
    id: "noorani_1_sr",
    name: "ر ص - م ق - ح س - ن ع - ي ل - هـ ا - ط ك (حروف السماء)",
    badge: "حروف السماء: ر ص م ق ح س ن ع ي ل ه ا ط ك",
    description: "ترتيب حروف السماء: ر ص م ق ح س ن ع ي ل هـ ا ط ك",
    nooraniLayers: [
      {
        layer: 1,
        cipherLetters: createNineCipherSlotsFromList(["ر", "ص"]),
        description: "السماء 1: ر ص",
      },
      {
        layer: 2,
        cipherLetters: createNineCipherSlotsFromList(["م", "ق"]),
        description: "السماء 2: م ق",
      },
      {
        layer: 3,
        cipherLetters: createNineCipherSlotsFromList(["ح", "س"]),
        description: "السماء 3: ح س",
      },
      {
        layer: 4,
        cipherLetters: createNineCipherSlotsFromList(["ن", "ع"]),
        description: "السماء 4: ن ع",
      },
      {
        layer: 5,
        cipherLetters: createNineCipherSlotsFromList(["ي", "ل"]),
        description: "السماء 5: ي ل",
      },
      {
        layer: 6,
        cipherLetters: createNineCipherSlotsFromList(["ه", "ا"]),
        description: "السماء 6: هـ ا",
      },
      {
        layer: 7,
        cipherLetters: createNineCipherSlotsFromList(["ط", "ك"]),
        description: "السماء 7: ط ك",
      },
    ],
  },
  noorani_2_sq: {
    id: "noorani_2_sq",
    name: "ر ص - م ق - ن س - ح ع - ي ل - هـ ا - ط ك (سماء 2 - البديل)",
    badge: "سماء 2: رص - مق - نس - حع",
    description: "جدول السماء البديل: ر ص م ق ن س ح ع ي ل هـ ا ط ك",
    nooraniLayers: [
      {
        layer: 1,
        cipherLetters: createNineCipherSlotsFromList(["ر", "ص"]),
        description: "السماء 1: ر ص",
      },
      {
        layer: 2,
        cipherLetters: createNineCipherSlotsFromList(["م", "ق"]),
        description: "السماء 2: م ق",
      },
      {
        layer: 3,
        cipherLetters: createNineCipherSlotsFromList(["ن", "س"]),
        description: "السماء 3: ن س",
      },
      {
        layer: 4,
        cipherLetters: createNineCipherSlotsFromList(["ح", "ع"]),
        description: "السماء 4: ح ع",
      },
      {
        layer: 5,
        cipherLetters: createNineCipherSlotsFromList(["ي", "ل"]),
        description: "السماء 5: ي ل",
      },
      {
        layer: 6,
        cipherLetters: createNineCipherSlotsFromList(["ه", "ا"]),
        description: "السماء 6: هـ ا",
      },
      {
        layer: 7,
        cipherLetters: createNineCipherSlotsFromList(["ط", "ك"]),
        description: "السماء 7: ط ك",
      },
    ],
  },
};

// Short alias maps for ultra-compact URL sharing
export const PRESET_SHORT_MAP: Record<string, string> = {
  // Noorani (Sky)
  noorani_1_sr: "n1",
  noorani_1_nl: "n1",
  noorani_2_sq: "n1",
  noorani_3_sh: "n1",
  noorani_4_am: "n1",
  noorani_5_al: "n1",
  noorani_6_as: "n1",
  noorani_7_mc: "n1",
  // Backwards compatibility aliases:
  noorani_an: "n1",
  noorani_kn: "n1",
  noorani_nr: "n1",
  noorani_nr_alt: "n1",
  // Arabic (Earth)
  arabic_1_az: "a1",
  arabic_2_az: "a2",
  arabic_3_bsm: "a3",
  arabic_4_srtg: "a4",
  arabic_4_mth: "a4",
  arabic_4_mtn: "a4",
  arabic_5_srqm: "a5",
  arabic_5_am: "a5_old",
  arabic_8_be: "a8",
  arabic_9_dr: "a9",
  arabic_10_at: "a10",
  arabic_11_ak: "a11",
  arabic_12_hy: "a12",
  // Backwards compatibility aliases:
  arabic_abjad_sheen: "a1",
  arabic_alphabetical: "a3",
  arabic_abjad_ghain: "a2",
  arabic_sowti: "a5",
  arabic_noorani: "ano",
  arabic_ehsa_i: "a11",
  arabic_al_togh: "aat",
  arabic_sar_zaza: "asz",
  arabic_mar_daza: "amd",
  arabic_zal_dagh: "azd",
};

// Reverse map for URL parsing
export const PRESET_EXPAND_MAP: Record<string, string> = Object.entries(
  PRESET_SHORT_MAP,
).reduce(
  (acc, [longId, shortCode]) => {
    acc[shortCode] = longId;
    return acc;
  },
  {} as Record<string, string>,
);

export function getShortPresetId(id: string): string {
  return PRESET_SHORT_MAP[id] || id;
}

export function getExpandedPresetId(idOrShort: string): string {
  return PRESET_EXPAND_MAP[idOrShort] || idOrShort;
}

export const BENCHMARK_PRESET = {
  id: "noorani_1_sr_arabic_4_srqm",
  name: "سماء 1: رص مق حس نع يل ها طك × أرض 4: رزصض - مبقد",
  badge: "افتراضي",
  description:
    "منظومة متقاطعة: [سماء 1: رص مق حس نع يل ها طك] × [أرض 4: رزصض - مبقد]",
  createLayers: (): LayerInfo[] =>
    JSON.parse(JSON.stringify(DEFAULT_CIPHER_LAYERS)),
};

export function createPresetLayersFromNoorani(
  nooraniKey: keyof typeof NOORANI_PRESETS,
): LayerInfo[] {
  const np = NOORANI_PRESETS[nooraniKey];
  if (!np) return JSON.parse(JSON.stringify(DEFAULT_CIPHER_LAYERS));
  const baseLayers: LayerInfo[] = JSON.parse(
    JSON.stringify(DEFAULT_CIPHER_LAYERS),
  );
  const layerMap = new Map(np.nooraniLayers.map((nl) => [nl.layer, nl]));
  return baseLayers.map((bl) => {
    const nl = layerMap.get(bl.layer);
    if (!nl) return bl;
    return {
      ...bl,
      cipherLetters: createNineCipherSlotsFromList(nl.cipherLetters),
      description: nl.description || bl.description,
    };
  });
}

export function createPresetLayersFromArabic(
  arabicKey: keyof typeof ARABIC_PRESETS,
): LayerInfo[] {
  const ap = ARABIC_PRESETS[arabicKey];
  if (!ap) return JSON.parse(JSON.stringify(DEFAULT_CIPHER_LAYERS));
  const baseLayers: LayerInfo[] = JSON.parse(
    JSON.stringify(DEFAULT_CIPHER_LAYERS),
  );
  const layerMap = new Map(ap.arabicLayers.map((al) => [al.layer, al]));
  return baseLayers.map((bl) => {
    const al = layerMap.get(bl.layer);
    if (!al) return bl;
    return {
      ...bl,
      arabicLetters: [...al.letters],
    };
  });
}

// Generate all 18 combinations (3 Noorani × 6 Arabic)
export const PRESET_TABLES: Record<
  string,
  {
    id: string;
    name: string;
    badge: string;
    description: string;
    createLayers: () => LayerInfo[];
  }
> = {};

Object.values(NOORANI_PRESETS).forEach((noorani) => {
  Object.values(ARABIC_PRESETS).forEach((arabic) => {
    const id = `${noorani.id}_${arabic.id}`;
    const name = `سماء: ${noorani.name} × أرض: ${arabic.name}`;
    PRESET_TABLES[id] = {
      id,
      name,
      badge: `${noorani.name} × ${arabic.name}`,
      description: `منظومة متقاطعة: [سماء: ${noorani.name}] × [أرض: ${arabic.name}]`,
      createLayers: () => {
        const nooraniMap = new Map(
          noorani.nooraniLayers.map((nl) => [nl.layer, nl.cipherLetters]),
        );
        const arabicMap = new Map(
          arabic.arabicLayers.map((al) => [al.layer, al.letters]),
        );
        const layers: LayerInfo[] = [];
        for (let l = 7; l >= 1; l--) {
          const ciphers = nooraniMap.get(l) || [];
          const arabics = arabicMap.get(l) || ["", "", "", ""];
          layers.push({
            layer: l,
            cipherLetters: createNineCipherSlotsFromList(ciphers),
            arabicLetters: [...arabics],
            description: `السماء ${l}: [سماء: ${noorani.name}] × [أرض: ${arabic.name}]`,
          });
        }
        return layers;
      },
    };
  });
});

export interface InitialBrowserTable {
  id: string;
  name: string;
  description: string;
  layers: LayerInfo[];
}

export const INITIAL_OPTIONAL_BROWSER_TABLES: InitialBrowserTable[] = [];

export const VALID_CIPHER_LETTERS = new Set<string>([
  "ك",
  "ر",
  "ط",
  "ه",
  "ا",
  "ل",
  "ص",
  "ي",
  "ع",
  "س",
  "ح",
  "م",
  "ن",
  "ق",
]);

// Normalize Arabic letters (stripping diacritics, unifying forms of alef, etc.)
export function normalizeArabicChar(char: string): string {
  // Strip Tashkeel
  const stripped = char.replace(/[\u064B-\u065F\u0670]/g, "");
  if (!stripped) return "";

  const c = stripped[0];
  if (["أ", "إ", "آ", "ا", "ء", "ى"].includes(c)) return "أ"; // ى and ء mapped to أ (Layer 1) phonetically
  if (c === "ة") return "ه";
  if (c === "ؤ") return "و";
  if (c === "ئ") return "ي";
  return c;
}

export function getCipherBaseString(word: string): string {
  return Array.from(cleanText(word)).map(normalizeArabicChar).join("");
}

export function cleanText(text: string): string {
  // Remove Tashkeel from full string
  return text.replace(/[\u064B-\u065F\u0670]/g, "");
}

export interface EncryptedLetterDetail {
  originalChar: string;
  normalizedChar: string;
  layer: LayerInfo | null;
  prob1: string;
  prob2: string;
  cipherOptions: string[];
  isSpecialOrSpace: boolean;
}

export function findLayerForChar(
  char: string,
  layers: LayerInfo[] = CIPHER_LAYERS,
): LayerInfo | null {
  if (!char || !layers || layers.length === 0) return null;
  const norm = normalizeArabicChar(char);
  for (const l of layers) {
    if (!l || !Array.isArray(l.arabicLetters)) continue;

    // 1. Direct match with exact character
    if (l.arabicLetters.includes(char)) {
      return l;
    }

    // 2. Direct match with normalized character
    if (norm && l.arabicLetters.includes(norm)) {
      return l;
    }

    // 3. Match normalized character against normalized characters in the layer
    if (norm && l.arabicLetters.some((c) => normalizeArabicChar(c) === norm)) {
      return l;
    }

    // 4. Match any Alef / Hamza variation (ا, أ, إ, آ, ء, ى)
    const isAlefVar = ["ا", "أ", "إ", "آ", "ء", "ى"].includes(char);
    if (
      isAlefVar &&
      l.arabicLetters.some((c) => ["ا", "أ", "إ", "آ", "ء", "ى"].includes(c))
    ) {
      return l;
    }

    // 5. Match Ta Marbuta / Ha variations (ة / ه)
    if (
      (char === "ة" || char === "ه") &&
      l.arabicLetters.some((c) => c === "ه" || c === "ة")
    ) {
      return l;
    }
  }
  return null;
}

export function analyzeWord(
  text: string,
  layers: LayerInfo[] = CIPHER_LAYERS,
): EncryptedLetterDetail[] {
  const chars = Array.from(cleanText(text));
  return chars.map((char) => {
    if (char === " " || char === "\n" || char === "\t") {
      return {
        originalChar: char,
        normalizedChar: char,
        layer: null,
        prob1: char,
        prob2: char,
        cipherOptions: [char],
        isSpecialOrSpace: true,
      };
    }

    const layer = findLayerForChar(char, layers);
    if (!layer) {
      const isArabic = /[ء-ي]/.test(char);
      return {
        originalChar: char,
        normalizedChar: normalizeArabicChar(char),
        layer: null,
        prob1: isArabic ? "؟" : char,
        prob2: isArabic ? "؟" : char,
        cipherOptions: isArabic ? ["؟"] : [char],
        isSpecialOrSpace: !isArabic,
      };
    }

    const filledCiphers = (
      Array.isArray(layer.cipherLetters) ? layer.cipherLetters : []
    )
      .map((c) => (c || "").trim())
      .filter(Boolean);
    const options = filledCiphers.length > 0 ? filledCiphers : ["؟"];

    return {
      originalChar: char,
      normalizedChar: normalizeArabicChar(char),
      layer,
      prob1: options[0] || "؟",
      prob2: options[1] || options[0] || "؟",
      cipherOptions: options,
      isSpecialOrSpace: false,
    };
  });
}

// Generate all combinations (up to a safe limit), optionally omitting spaces
export function getAllCombinations(
  details: EncryptedLetterDetail[],
  maxCombinations = 500,
  omitSpaces = true,
): string[] {
  const meaningful = details.filter((d) => !d.isSpecialOrSpace);
  if (meaningful.length === 0) return [];

  const items = omitSpaces
    ? details.filter(
        (d) =>
          d.originalChar !== " " &&
          d.originalChar !== "\n" &&
          d.originalChar !== "\t",
      )
    : details;

  if (items.length === 0) return [];

  const results: string[] = [];

  function backtrack(index: number, currentStr: string) {
    if (results.length >= maxCombinations) return;
    if (index === items.length) {
      results.push(currentStr);
      return;
    }

    const item = items[index];
    if (item.isSpecialOrSpace || !item.layer) {
      backtrack(index + 1, currentStr + item.originalChar);
    } else {
      // Use unique options to avoid producing duplicate identical permutations if user duplicates cipher letters
      const opts =
        item.cipherOptions && item.cipherOptions.length > 0
          ? Array.from(new Set(item.cipherOptions))
          : [item.prob1, item.prob2];

      for (const opt of opts) {
        if (results.length >= maxCombinations) return;
        backtrack(index + 1, currentStr + opt);
      }
    }
  }

  backtrack(0, "");
  return results;
}

export interface DecryptedLetterDetail {
  cipherChar: string;
  matchedLayers: LayerInfo[];
  possibleLetters: string[];
}

export function decryptCipherChar(
  char: string,
  layers: LayerInfo[] = CIPHER_LAYERS,
): DecryptedLetterDetail {
  const matchingLayers = layers.filter(
    (l) =>
      Array.isArray(l.cipherLetters) &&
      l.cipherLetters
        .map((c) => (c || "").trim())
        .filter(Boolean)
        .includes(char),
  );

  const possibleLetters = Array.from(
    new Set(matchingLayers.flatMap((l) => l.arabicLetters).filter(Boolean)),
  );

  return {
    cipherChar: char,
    matchedLayers: matchingLayers,
    possibleLetters,
  };
}

export function getDecryptionCombinations(
  items: { char: string; isSpace: boolean; candidates: string[] }[],
  maxCombinations = 500,
  omitSpaces = true,
): string[] {
  const meaningful = items.filter((d) => !d.isSpace && d.candidates.length > 0);
  if (meaningful.length === 0) return [];

  const candidateItems = omitSpaces ? meaningful : items;
  const results: string[] = [];

  function backtrack(index: number, currentStr: string) {
    if (results.length >= maxCombinations) return;
    if (index === candidateItems.length) {
      results.push(currentStr);
      return;
    }

    const item = candidateItems[index];
    if (item.isSpace || item.candidates.length === 0) {
      backtrack(index + 1, currentStr + item.char);
    } else {
      for (const cand of item.candidates) {
        if (results.length >= maxCombinations) break;
        backtrack(index + 1, currentStr + cand);
      }
    }
  }

  backtrack(0, "");
  return results;
}

// -------------------------------------------------------------------
// Quranic Initials / Noorani Letters & Words Dictionary
// -------------------------------------------------------------------

// The 14 unique Noorani / Quranic Initial Letters arranged by current tables (ر ص م ق ح س ن ع ي ل ه ا ط ك):
export const NOORANI_LETTERS = [
  "ر",
  "ص",
  "م",
  "ق",
  "ح",
  "س",
  "ن",
  "ع",
  "ي",
  "ل",
  "ه",
  "ا",
  "ط",
  "ك",
];
export const NOORANI_LETTERS_SET = new Set(NOORANI_LETTERS);

// The 14 Quranic Opening Words / Combinations (الفواتح القرآنية المقطعة) arranged by current tables (صرقم 1 / جدول السماء):
export const QURANIC_WORDS = [
  "ص",
  "ق",
  "ن",
  "حم",
  "يس",
  "عسق",
  "حم عسق",
  "الر",
  "الم",
  "المر",
  "المص",
  "طس",
  "طسم",
  "طه",
  "كهيعص",
];

export const QURANIC_WORDS_SET = new Set(QURANIC_WORDS);

export interface QuranicSegment {
  text: string;
  isQuranicWord: boolean; // Matches one of the 14 opening words (e.g., حم, طسم, كهيعص)
  isMultiLetter: boolean; // Has length >= 2
  isNooraniChar: boolean; // Matches individual Noorani letter
}

export interface QuranicSegmentationResult {
  score: number;
  multiWordCount: number;
  quranicCoveredChars: number;
  segments: QuranicSegment[];
  formattedDisplay: string;
}

/**
 * Segments any Arabic text into Quranic Initial Words (الم، طسم، حم، كهيعص...) as much as possible
 * using dynamic programming with preference for longer Quranic multi-letter words.
 */
export function segmentIntoQuranicWords(
  text: string,
): QuranicSegmentationResult {
  const n = text.length;
  if (n === 0) {
    return {
      score: 0,
      multiWordCount: 0,
      quranicCoveredChars: 0,
      segments: [],
      formattedDisplay: "",
    };
  }

  const memo = new Map<
    number,
    {
      score: number;
      multiWordCount: number;
      quranicCoveredChars: number;
      segments: QuranicSegment[];
    }
  >();

  function dp(i: number): {
    score: number;
    multiWordCount: number;
    quranicCoveredChars: number;
    segments: QuranicSegment[];
  } {
    if (i >= n) {
      return {
        score: 0,
        multiWordCount: 0,
        quranicCoveredChars: 0,
        segments: [],
      };
    }
    if (memo.has(i)) {
      return memo.get(i)!;
    }

    let best: {
      score: number;
      multiWordCount: number;
      quranicCoveredChars: number;
      segments: QuranicSegment[];
    } | null = null;

    // 1. Try matching any of the 14 Quranic Opening Words at position i
    for (const qw of QURANIC_WORDS) {
      if (text.startsWith(qw, i)) {
        const next = dp(i + qw.length);
        const isMulti = qw.length > 1;
        // Prioritize longer multi-letter Quranic words heavily (e.g. كهيعص=250, المص=160, طسم=90, حم=40)
        const wordWeight = isMulti ? qw.length * qw.length * 15 : 3;
        const score = wordWeight + next.score;
        const multiWordCount = (isMulti ? 1 : 0) + next.multiWordCount;
        const quranicCoveredChars = qw.length + next.quranicCoveredChars;

        if (!best || score > best.score) {
          best = {
            score,
            multiWordCount,
            quranicCoveredChars,
            segments: [
              {
                text: qw,
                isQuranicWord: true,
                isMultiLetter: isMulti,
                isNooraniChar: true,
              },
              ...next.segments,
            ],
          };
        }
      }
    }

    // 2. Fallback to single character
    const singleChar = text[i];
    const isSingleNoorani = NOORANI_LETTERS_SET.has(singleChar);
    const isSingleQuranicWord = QURANIC_WORDS_SET.has(singleChar);
    const nextSingle = dp(i + 1);
    const singleScore = (isSingleNoorani ? 2 : 0) + nextSingle.score;

    if (!best || singleScore > best.score) {
      best = {
        score: singleScore,
        multiWordCount: nextSingle.multiWordCount,
        quranicCoveredChars:
          (isSingleNoorani ? 1 : 0) + nextSingle.quranicCoveredChars,
        segments: [
          {
            text: singleChar,
            isQuranicWord: isSingleQuranicWord,
            isMultiLetter: false,
            isNooraniChar: isSingleNoorani,
          },
          ...nextSingle.segments,
        ],
      };
    }

    memo.set(i, best);
    return best;
  }

  const result = dp(0);
  const formattedDisplay = result.segments.map((s) => s.text).join(" - ");

  return {
    ...result,
    formattedDisplay,
  };
}
