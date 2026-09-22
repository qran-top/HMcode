import { NotebookEntry } from '../context/NotebookContext';

export interface WordGroup {
  id: string;
  originalWord: string;
  candidates: {
    resultWord: string;
    isReversed?: boolean;
    systemName?: string;
    surahInfo?: string;
    type?: string;
    note?: string;
  }[];
}

/**
 * Groups raw notebook entries by their original input word sequence.
 * Preserves the chronological order of unique original words.
 */
export function groupNotebookEntriesByOriginalWord(entries: NotebookEntry[]): WordGroup[] {
  if (!entries || entries.length === 0) return [];

  const groupsMap = new Map<string, WordGroup>();
  const orderedKeys: string[] = [];

  for (const entry of entries) {
    // Determine the original word vs candidate result
    // In normal usage:
    // If decryption: entry.cipher is often the encrypted cipher, entry.word is the candidate result.
    // In encryption / general: entry.word is the input, entry.cipher is the cipher result.
    // We prioritize grouping by the intended primary anchor.
    let anchorWord = (entry.word || '').trim();
    let resultCandidate = (entry.cipher || '').trim();

    // If entry type is decryption, the user's input was the cipher word, and word is the decrypted candidate
    if (entry.type === 'decryption' && entry.cipher) {
      anchorWord = entry.cipher;
      resultCandidate = entry.word;
    }

    if (!anchorWord && !resultCandidate) continue;
    if (!anchorWord) anchorWord = resultCandidate;
    if (!resultCandidate) resultCandidate = anchorWord;

    const groupKey = anchorWord.toLowerCase();

    if (!groupsMap.has(groupKey)) {
      orderedKeys.push(groupKey);
      groupsMap.set(groupKey, {
        id: `grp_${groupKey}_${orderedKeys.length}`,
        originalWord: anchorWord,
        candidates: [],
      });
    }

    const group = groupsMap.get(groupKey)!;
    // Check if this candidate is already added in this group
    const exists = group.candidates.some(
      (c) => c.resultWord === resultCandidate && c.isReversed === entry.isReversed
    );

    if (!exists) {
      group.candidates.push({
        resultWord: resultCandidate,
        isReversed: entry.isReversed,
        systemName: entry.systemName,
        surahInfo: entry.surahInfo,
        type: entry.type,
        note: entry.note,
      });
    }
  }

  return orderedKeys.map((k) => groupsMap.get(k)!);
}

export interface AIPromptOptions {
  title?: string;
  style?: 'eloquent' | 'spiritual' | 'wisdom' | 'poetic' | 'all';
  includeQuranicNotes?: boolean;
}

/**
 * Generates an elaborate, crystal-clear prompt for AI models (ChatGPT, Claude, Gemini)
 * explaining the original words, candidate results, and instructing the AI to compose
 * meaningful sentences from the candidates in sequence.
 */
export function generateAIPromptForSentenceMaking(
  entries: NotebookEntry[],
  options: AIPromptOptions = {}
): string {
  const groups = groupNotebookEntriesByOriginalWord(entries);
  if (groups.length === 0) {
    return 'لا توجد كلمات أو نتائج كافية في الدفتر لتوليد البرومبت.';
  }

  const {
    title = 'دفتر الكلمات والشيفرات',
    style = 'all',
    includeQuranicNotes = true,
  } = options;

  let prompt = `═════════════════════════════════════════════════════════════════\n`;
  prompt += `🤖 برومبت مُوجّه للذكاء الاصطناعي (AI Prompt): تشكيل جملة مفيدة وبليغة من نتائج الكلمات\n`;
  prompt += `═════════════════════════════════════════════════════════════════\n\n`;

  prompt += `السلام عليكم ورحمة الله.\n`;
  prompt += `أنا أعمل على نظام تشفير وفك تشفير لغوي وحساب جُمّل عربي. لدي قائمة بالكلمات الأصلية التي أدخلتها بالترتيب، ولكل كلمة أصلية ظهرت عدة نتائج وبدائل مقابلة لها.\n\n`;

  prompt += `🎯 مهمتك الأساسية:\n`;
  prompt += `1. فهم أن الكلمات الأصلية مرتبة حسب تسلسل معين، وكل كلمة أصلية لها قائمة من النتائج/البدائل المحتملة.\n`;
  prompt += `2. اختيار مفردة واحدة (أو تركيب منسجم) من نتائج الكلمة الأولى، ثم مفردة من نتائج الكلمة الثانية، ثم مفردة من نتائج الكلمة الثالثة... بالترتيب.\n`;
  prompt += `3. الربط والتوليف بين هذه النتائج المختارة لتأليف وصياغة "جملة مفيدة، بليغة، وذات معنى عربي فصيح متكامل" ومترابط لغوياً ودلالياً.\n`;
  prompt += `4. صياغة 4 إلى 6 خيارات/نماذج مختلفة لجمل مكتملة الأركان (مثلاً: جملة إيمانية روحانية، جملة حكمة، جملة أدبية شعرية، جملة بليغة مباشرة).\n`;
  prompt += `5. لكل جملة تصيغها، وضّح الكلمات التي اخترتها من نتائج كل كلمة أصلية، واشرح المعنى والعمق البلاغي لها.\n\n`;

  prompt += `─────────────────────────────────────────────────────────────────\n`;
  prompt += `📋 جدول الكلمات الأصلية وقوائم النتائج المقابلة لها (بالترتيب):\n`;
  prompt += `─────────────────────────────────────────────────────────────────\n\n`;

  groups.forEach((group, index) => {
    const num = index + 1;
    prompt += `📌 [${num}] الكلمة الأصلية: "${group.originalWord}"\n`;
    prompt += `   🔹 عدد النتائج/البدائل المقابلة لها: (${group.candidates.length})\n`;
    prompt += `   🔹 قائمة النتائج للاختيار منها:\n`;

    const candidatesList = group.candidates.map((c, cIdx) => {
      let label = c.resultWord;
      if (c.isReversed) label += ' (معكوسة)';
      if (includeQuranicNotes && c.surahInfo) label += ` [توثيق: ${c.surahInfo}]`;
      return `${cIdx + 1}. ${label}`;
    });

    // Indented list
    prompt += `      ${candidatesList.join(' | ')}\n\n`;
  });

  prompt += `─────────────────────────────────────────────────────────────────\n`;
  prompt += `📐 إرشادات وتعليمات الصياغة للذكاء الاصطناعي:\n`;
  prompt += `─────────────────────────────────────────────────────────────────\n`;
  prompt += `• التسلسل الطبيعي: يُفضل الحفاظ على ترتيب الكلمات (من الكلمة 1 إلى الكلمة الأخيرة)، ويُسمح بإضافة أدوات ربط خفيفة (مثل: الواو، الفاء، في، من، إلى، على) إذا تطلبت فصاحة وسلاسة المعنى ذلك.\n`;
  prompt += `• الدقة اللغوية: تأكد أن تكون الجملة صحيحة الإعراب والنحو العربي ومضبوطة بالشكل (التشكيل الكامل إن أمكن).\n`;
  prompt += `• جودة المعنى: تجنب الجمل المفككة، واحرص على أن تكون الجملة ذات معنى عميق ومؤثر.\n`;

  if (style === 'spiritual') {
    prompt += `• الطابع المطلوب: طابع روحاني إيماني قرآني عميق.\n`;
  } else if (style === 'wisdom') {
    prompt += `• الطابع المطلوب: طابع حكم وأمثال فلسفية تأملية.\n`;
  } else if (style === 'poetic') {
    prompt += `• الطابع المطلوب: طابع أدبي شاعري فصيح.\n`;
  } else {
    prompt += `• الطابع المطلوب: قدّم تنوعاً (نموذج روحاني، نموذج حكيم، نموذج أدبي بليغ، نموذج تركيبي مباشر).\n`;
  }

  prompt += `\n✨ ابدأ الآن بتقديم الجمل المقترحة مع تحليل كل جملة وشرح كلماتها المختارة بالتفصيل.\n`;
  prompt += `═════════════════════════════════════════════════════════════════\n`;

  return prompt;
}
