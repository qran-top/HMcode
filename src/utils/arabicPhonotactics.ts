// Arabic Morphological Trie & Phonotactic Rules Filter
// فلاتر الممنوعات الصوتية وقواعد الائتلاف والتنافر الصوتي وشجرة الأوزان الصرفية العربية

/**
 * أحرف الحلق الستة (ء، هـ، ع، ح، غ، خ)
 * القاعدة: لا يجتمع حرفان حلقيان متقاربان في أصل الكلمة العربية إلا نادراً بشروط مخصوصة
 */
const GUTTURAL_LETTERS = new Set(['ء', 'أ', 'إ', 'آ', 'ه', 'هـ', 'ع', 'ح', 'غ', 'خ']);

/**
 * أزواج التنافر الحلقي الممنوعة قطعياً في الجذور العربية
 */
const INADMISSIBLE_GUTTURAL_PAIRS = new Set([
  'عح', 'حع', 'عخ', 'خع', 'عغ', 'غع',
  'حه', 'هح', 'خح', 'حخ', 'غه', 'هغ',
  'ءع', 'عء', 'ءح', 'حاء', 'ءخ', 'خء'
]);

/**
 * أحرف الصفير والأسلية (س، ص، ز)
 * القاعدة: لا يجتمع حرفا صفير في جذر عربي
 */
const SIBILANT_LETTERS = new Set(['س', 'ص', 'ز']);

/**
 * أحرف النطعية (ط، د، ت)
 * القاعدة: لا يجتمع حرفان نطعيان متتاليان في جذر واحد
 */
const CORONAL_LETTERS = new Set(['ط', 'د', 'ت']);

/**
 * أحرف اللثوية (ظ، ذ، ث)
 * القاعدة: لا تجتمع الأحرف اللثوية معاً في جذر واحد
 */
const INTERDENTAL_LETTERS = new Set(['ظ', 'ذ', 'ث']);

/**
 * أحرف الشفة (ب، ف، م، و)
 */
const LABIAL_LETTERS = new Set(['ب', 'ف', 'م']);

/**
 * أشهر أوزان وقوالب الأسماء والأفعال العربية الثلاثية والرباعية
 */
export const ARABIC_MORPHOLOGICAL_PATTERNS: string[] = [
  'فَعَل', 'فُعِل', 'فَعِل', 'فَعُل',
  'فَعْل', 'فُعْل', 'فِعْل', 'فَعَلَة',
  'فَاعِل', 'مَفْعُول', 'فَعِيل', 'فَعُول',
  'فَعَّال', 'مِفْعَال', 'أَفْعَل', 'فُعْلَان',
  'فِعْلَان', 'مَفْعَل', 'مَفْعِل', 'فُعَيْل',
  'افْتَعَل', 'انْفَعَل', 'تَفَاعَل', 'تَفَعَّل', 'اسْتَفْعَل'
];

/**
 * فحص التنافر الصوتي في تركيب الحروف العربية (Phonotactic Constraints)
 * يعيد درجة القبول (0 = مستحيل لغوياً / متنافر، 1-100 = سليم ومقبول صوتياً في اللسان العربي)
 */
export function checkArabicPhonotactics(word: string): {
  isValid: boolean;
  score: number;
  rejectReason?: string;
} {
  if (!word || word.length < 2) {
    return { isValid: true, score: 50 };
  }

  const chars = Array.from(word.replace(/[\u064B-\u065F\u0670\s]/g, ''));
  const len = chars.length;

  // 1. فحص التكرار الثلاثي لنفس الحرف (مثل: ب ب ب)
  for (let i = 0; i < len - 2; i++) {
    if (chars[i] === chars[i + 1] && chars[i + 1] === chars[i + 2]) {
      return { isValid: false, score: 0, rejectReason: 'تكرار متطابق لثلاثة أحرف صامتة' };
    }
  }

  let penalty = 0;

  // 2. فحص تنافر الحروف الحلقية المتجاورة
  for (let i = 0; i < len - 1; i++) {
    const pair = chars[i] + chars[i + 1];
    if (INADMISSIBLE_GUTTURAL_PAIRS.has(pair)) {
      return { isValid: false, score: 0, rejectReason: `تنافر حلقي بين (${chars[i]} و ${chars[i + 1]})` };
    }

    if (GUTTURAL_LETTERS.has(chars[i]) && GUTTURAL_LETTERS.has(chars[i + 1]) && chars[i] !== chars[i + 1]) {
      penalty += 35;
    }
  }

  // 3. فحص أحرف الصفير (س، ص، ز)
  let sibilantCount = 0;
  for (const c of chars) {
    if (SIBILANT_LETTERS.has(c)) sibilantCount++;
  }
  if (sibilantCount >= 2 && len <= 3) {
    return { isValid: false, score: 5, rejectReason: 'اجتماع حرفي صفير في جذر ثلاثي' };
  }

  // 4. فحص الأحرف النطعية (ط، د، ت)
  let coronalCount = 0;
  for (const c of chars) {
    if (CORONAL_LETTERS.has(c)) coronalCount++;
  }
  if (coronalCount >= 2 && len <= 3 && chars[0] !== chars[1]) {
    penalty += 30;
  }

  // 5. فحص الأحرف اللثوية (ظ، ذ، ث)
  let interdentalCount = 0;
  for (const c of chars) {
    if (INTERDENTAL_LETTERS.has(c)) interdentalCount++;
  }
  if (interdentalCount >= 2 && len <= 3) {
    return { isValid: false, score: 5, rejectReason: 'اجتماع حرفين لثويين' };
  }

  // 6. فحص أحرف الشفة (ب، ف، م)
  let labialCount = 0;
  for (const c of chars) {
    if (LABIAL_LETTERS.has(c)) labialCount++;
  }
  if (labialCount >= 3) {
    penalty += 25;
  }

  // حساب النتيجة النهائية
  const finalScore = Math.max(10, 100 - penalty);
  return {
    isValid: finalScore >= 30,
    score: finalScore,
  };
}

/**
 * Radix Trie Node للأوزان والجذور الصرفية
 */
class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEndOfWord: boolean = false;
  weightName?: string;
}

export class MorphologicalRadixTrie {
  private root = new TrieNode();

  constructor(patterns: string[] = ARABIC_MORPHOLOGICAL_PATTERNS) {
    for (const pat of patterns) {
      this.insert(pat);
    }
  }

  insert(pattern: string) {
    const clean = pattern.replace(/[\u064B-\u065F\u0670\s]/g, '');
    let node = this.root;
    for (const ch of clean) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode());
      }
      node = node.children.get(ch)!;
    }
    node.isEndOfWord = true;
    node.weightName = pattern;
  }

  matchWeight(word: string): boolean {
    const clean = word.replace(/[\u064B-\u065F\u0670\s]/g, '');
    let node = this.root;
    for (const ch of clean) {
      if (!node.children.has(ch)) {
        return false;
      }
      node = node.children.get(ch)!;
    }
    return node.isEndOfWord;
  }
}

export const globalMorphologicalTrie = new MorphologicalRadixTrie();
