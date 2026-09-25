// Quranic Verses, Sequential Chains, and Multi-Word Phrases Corpus
// Provides rich authentic Quranic text for Inverse Gematria matching and chain discovery.

export interface QuranVerseEntry {
  text: string;
  cleanText: string;
  surahName: string;
  surahNumber: number;
  ayahNumber: number;
  wordCount: number;
  isFullAyah: boolean;
  category: 'fawatih' | 'creed_tauhid' | 'prophetic_duaa' | 'divine_names' | 'verse_segment' | 'full_ayah';
}

// Built-in foundational corpus of verified Quranic verses, expressions, and segments
export const QURANIC_CORE_VERSES_CORPUS: {
  text: string;
  surahName: string;
  surahNumber: number;
  ayahNumber: number;
  category: QuranVerseEntry['category'];
}[] = [
  // فواتح السور والحروف المقطعة
  { text: 'كهيعص', surahName: 'مريم', surahNumber: 19, ayahNumber: 1, category: 'fawatih' },
  { text: 'حم عسق', surahName: 'الشورى', surahNumber: 42, ayahNumber: 1, category: 'fawatih' },
  { text: 'عسق', surahName: 'الشورى', surahNumber: 42, ayahNumber: 2, category: 'fawatih' },
  { text: 'الم', surahName: 'البقرة', surahNumber: 2, ayahNumber: 1, category: 'fawatih' },
  { text: 'المص', surahName: 'الأعراف', surahNumber: 7, ayahNumber: 1, category: 'fawatih' },
  { text: 'الر', surahName: 'يونس', surahNumber: 10, ayahNumber: 1, category: 'fawatih' },
  { text: 'المر', surahName: 'الرعد', surahNumber: 13, ayahNumber: 1, category: 'fawatih' },
  { text: 'طسم', surahName: 'الشعراء', surahNumber: 26, ayahNumber: 1, category: 'fawatih' },
  { text: 'طه', surahName: 'طه', surahNumber: 20, ayahNumber: 1, category: 'fawatih' },
  { text: 'طس', surahName: 'النمل', surahNumber: 27, ayahNumber: 1, category: 'fawatih' },
  { text: 'يس', surahName: 'يس', surahNumber: 36, ayahNumber: 1, category: 'fawatih' },
  { text: 'حم', surahName: 'غافر', surahNumber: 40, ayahNumber: 1, category: 'fawatih' },
  { text: 'ص', surahName: 'ص', surahNumber: 38, ayahNumber: 1, category: 'fawatih' },
  { text: 'ق', surahName: 'ق', surahNumber: 50, ayahNumber: 1, category: 'fawatih' },
  { text: 'ن', surahName: 'القلم', surahNumber: 68, ayahNumber: 1, category: 'fawatih' },

  // التوحيد والإخلاص والشهادة
  { text: 'لا إله إلا الله', surahName: 'الصافات', surahNumber: 37, ayahNumber: 35, category: 'creed_tauhid' },
  { text: 'لا اله الا الله', surahName: 'محمد', surahNumber: 47, ayahNumber: 19, category: 'creed_tauhid' },
  { text: 'لا إله إلا هو', surahName: 'البقرة', surahNumber: 2, ayahNumber: 163, category: 'creed_tauhid' },
  { text: 'لا إله إلا هو الحي القيوم', surahName: 'البقرة', surahNumber: 2, ayahNumber: 255, category: 'creed_tauhid' },
  { text: 'الله لا إله إلا هو', surahName: 'آل عمران', surahNumber: 3, ayahNumber: 2, category: 'creed_tauhid' },
  { text: 'لا إله إلا أنت سبحانك إني كنت من الظالمين', surahName: 'الأنبياء', surahNumber: 21, ayahNumber: 87, category: 'prophetic_duaa' },
  { text: 'قل هو الله أحد', surahName: 'الإخلاص', surahNumber: 112, ayahNumber: 1, category: 'creed_tauhid' },
  { text: 'الله الصمد', surahName: 'الإخلاص', surahNumber: 112, ayahNumber: 2, category: 'creed_tauhid' },
  { text: 'لم يلد ولم يولد', surahName: 'الإخلاص', surahNumber: 112, ayahNumber: 3, category: 'creed_tauhid' },
  { text: 'ولم يكن له كفوا أحد', surahName: 'الإخلاص', surahNumber: 112, ayahNumber: 4, category: 'creed_tauhid' },
  { text: 'محمد رسول الله', surahName: 'الفتح', surahNumber: 48, ayahNumber: 29, category: 'creed_tauhid' },

  // الفاتحة وأمهات الآيات
  { text: 'بسم الله الرحمن الرحيم', surahName: 'الفاتحة', surahNumber: 1, ayahNumber: 1, category: 'full_ayah' },
  { text: 'الحمد لله رب العالمين', surahName: 'الفاتحة', surahNumber: 1, ayahNumber: 2, category: 'full_ayah' },
  { text: 'الرحمن الرحيم', surahName: 'الفاتحة', surahNumber: 1, ayahNumber: 3, category: 'full_ayah' },
  { text: 'مالك يوم الدين', surahName: 'الفاتحة', surahNumber: 1, ayahNumber: 4, category: 'full_ayah' },
  { text: 'إياك نعبد وإياك نستعين', surahName: 'الفاتحة', surahNumber: 1, ayahNumber: 5, category: 'full_ayah' },
  { text: 'اهدنا الصراط المستقيم', surahName: 'الفاتحة', surahNumber: 1, ayahNumber: 6, category: 'full_ayah' },
  { text: 'صراط الذين أنعمت عليهم', surahName: 'الفاتحة', surahNumber: 1, ayahNumber: 7, category: 'verse_segment' },
  { text: 'غير المغضوب عليهم ولا الضالين', surahName: 'الفاتحة', surahNumber: 1, ayahNumber: 7, category: 'verse_segment' },

  // الأدعية والتسابيح القرآنية الخالدة
  { text: 'حسبنا الله ونعم الوكيل', surahName: 'آل عمران', surahNumber: 3, ayahNumber: 173, category: 'prophetic_duaa' },
  { text: 'إنا لله وإنا إليه راجعون', surahName: 'البقرة', surahNumber: 2, ayahNumber: 156, category: 'verse_segment' },
  { text: 'وما توفيقي إلا بالله', surahName: 'هود', surahNumber: 11, ayahNumber: 88, category: 'prophetic_duaa' },
  { text: 'والله غالب على أمره', surahName: 'يوسف', surahNumber: 12, ayahNumber: 21, category: 'verse_segment' },
  { text: 'فالله خير حافظا وهو أرحم الراحمين', surahName: 'يوسف', surahNumber: 12, ayahNumber: 64, category: 'prophetic_duaa' },
  { text: 'وأفوض أمري إلى الله', surahName: 'غافر', surahNumber: 40, ayahNumber: 44, category: 'prophetic_duaa' },
  { text: 'حسبي الله لا إله إلا هو', surahName: 'التوبة', surahNumber: 9, ayahNumber: 129, category: 'prophetic_duaa' },
  { text: 'عليه توكلت وهو رب العرش العظيم', surahName: 'التوبة', surahNumber: 9, ayahNumber: 129, category: 'verse_segment' },
  { text: 'رب اشرح لي صدري', surahName: 'طه', surahNumber: 20, ayahNumber: 25, category: 'prophetic_duaa' },
  { text: 'ويسر لي أمري', surahName: 'طه', surahNumber: 20, ayahNumber: 26, category: 'prophetic_duaa' },
  { text: 'وقل رب زدني علما', surahName: 'طه', surahNumber: 20, ayahNumber: 114, category: 'prophetic_duaa' },
  { text: 'ربي إني لما أنزلت إلي من خير فقير', surahName: 'القصص', surahNumber: 28, ayahNumber: 24, category: 'prophetic_duaa' },
  { text: 'ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار', surahName: 'البقرة', surahNumber: 2, ayahNumber: 201, category: 'prophetic_duaa' },
  { text: 'ربنا لا تزغ قلوبنا بعد إذ هديتنا', surahName: 'آل عمران', surahNumber: 3, ayahNumber: 8, category: 'prophetic_duaa' },
  { text: 'وهب لنا من لدنك رحمة', surahName: 'آل عمران', surahNumber: 3, ayahNumber: 8, category: 'prophetic_duaa' },
  { text: 'إنك أنت الوهاب', surahName: 'آل عمران', surahNumber: 3, ayahNumber: 8, category: 'divine_names' },

  // نور وأسرار القرآن
  { text: 'الله نور السماوات والأرض', surahName: 'النور', surahNumber: 24, ayahNumber: 35, category: 'verse_segment' },
  { text: 'نور على نور', surahName: 'النور', surahNumber: 24, ayahNumber: 35, category: 'verse_segment' },
  { text: 'يهدي الله لنوره من يشاء', surahName: 'النور', surahNumber: 24, ayahNumber: 35, category: 'verse_segment' },
  { text: 'سلام قولا من رب رحيم', surahName: 'يس', surahNumber: 36, ayahNumber: 58, category: 'verse_segment' },
  { text: 'فبأي آلاء ربكما تكذبان', surahName: 'الرحمن', surahNumber: 55, ayahNumber: 13, category: 'verse_segment' },
  { text: 'تبارك اسم ربك ذي الجلال والإكرام', surahName: 'الرحمن', surahNumber: 55, ayahNumber: 78, category: 'verse_segment' },
  { text: 'إن مع العسر يسرا', surahName: 'الشرح', surahNumber: 94, ayahNumber: 6, category: 'verse_segment' },
  { text: 'فإن مع العسر يسرا', surahName: 'الشرح', surahNumber: 94, ayahNumber: 5, category: 'verse_segment' },
  { text: 'أليس الله بكاف عبده', surahName: 'الزمر', surahNumber: 39, ayahNumber: 36, category: 'verse_segment' },
  { text: 'فاصبر صبرا جميلا', surahName: 'المعارج', surahNumber: 70, ayahNumber: 5, category: 'verse_segment' },
  { text: 'كل نفس ذائقة الموت', surahName: 'آل عمران', surahNumber: 3, ayahNumber: 185, category: 'verse_segment' },
  { text: 'سلام هي حتى مطلع الفجر', surahName: 'القدر', surahNumber: 97, ayahNumber: 5, category: 'full_ayah' },
  { text: 'إنا أنزلناه في ليلة القدر', surahName: 'القدر', surahNumber: 97, ayahNumber: 1, category: 'full_ayah' },
  { text: 'ليلة القدر خير من ألف شهر', surahName: 'القدر', surahNumber: 97, ayahNumber: 3, category: 'full_ayah' },
  { text: 'اقرأ باسم ربك الذي خلق', surahName: 'العلق', surahNumber: 96, ayahNumber: 1, category: 'full_ayah' },
  { text: 'علم الإنسان ما لم يعلم', surahName: 'العلق', surahNumber: 96, ayahNumber: 5, category: 'full_ayah' },
  { text: 'هو الأول والآخر والظاهر والباطن', surahName: 'الحديد', surahNumber: 57, ayahNumber: 3, category: 'divine_names' },
  { text: 'وهو بكل شيء عليم', surahName: 'الحديد', surahNumber: 57, ayahNumber: 3, category: 'divine_names' },
  { text: 'وهو معكم أين ما كنتم', surahName: 'الحديد', surahNumber: 57, ayahNumber: 4, category: 'verse_segment' },
  { text: 'تبارك الذي بيده الملك', surahName: 'الملك', surahNumber: 67, ayahNumber: 1, category: 'full_ayah' },
  { text: 'وهو على كل شيء قدير', surahName: 'الملك', surahNumber: 67, ayahNumber: 1, category: 'divine_names' },
  { text: 'ومن يتق الله يجعل له مخرجا', surahName: 'الطلاق', surahNumber: 65, ayahNumber: 2, category: 'verse_segment' },
  { text: 'ويرزقه من حيث لا يحتسب', surahName: 'الطلاق', surahNumber: 65, ayahNumber: 3, category: 'verse_segment' },
  { text: 'ومن يتوكل على الله فهو حسبه', surahName: 'الطلاق', surahNumber: 65, ayahNumber: 3, category: 'verse_segment' },
  { text: 'إن الله بالغ أمره', surahName: 'الطلاق', surahNumber: 65, ayahNumber: 3, category: 'verse_segment' },
  { text: 'قد جعل الله لكل شيء قدرا', surahName: 'الطلاق', surahNumber: 65, ayahNumber: 3, category: 'verse_segment' },
  { text: 'سيجعل الله بعد عسر يسرا', surahName: 'الطلاق', surahNumber: 65, ayahNumber: 7, category: 'verse_segment' },
  { text: 'إن الله مع الصابرين', surahName: 'البقرة', surahNumber: 2, ayahNumber: 153, category: 'verse_segment' },
  { text: 'إن الله يحب المحسنين', surahName: 'البقرة', surahNumber: 2, ayahNumber: 195, category: 'verse_segment' },
  { text: 'إن الله يحب المتوكلين', surahName: 'آل عمران', surahNumber: 3, ayahNumber: 159, category: 'verse_segment' },
  { text: 'إن الله يحب التوابين ويحب المتطهرين', surahName: 'البقرة', surahNumber: 2, ayahNumber: 222, category: 'verse_segment' },
  { text: 'والله يعلم وأنتم لا تعلمون', surahName: 'البقرة', surahNumber: 2, ayahNumber: 216, category: 'verse_segment' },
  { text: 'والله غفور رحيم', surahName: 'البقرة', surahNumber: 2, ayahNumber: 218, category: 'divine_names' },
  { text: 'والله عزيز ذو انتقام', surahName: 'آل عمران', surahNumber: 3, ayahNumber: 4, category: 'divine_names' },
  { text: 'والله سميع عليم', surahName: 'البقرة', surahNumber: 2, ayahNumber: 224, category: 'divine_names' },
  { text: 'والله بما تعملون بصير', surahName: 'البقرة', surahNumber: 2, ayahNumber: 265, category: 'divine_names' },
  { text: 'والله واسع عليم', surahName: 'البقرة', surahNumber: 2, ayahNumber: 247, category: 'divine_names' },
  { text: 'إن الله غفور شكور', surahName: 'الشورى', surahNumber: 42, ayahNumber: 23, category: 'divine_names' },
  { text: 'هو الله الخالق البارئ المصور', surahName: 'الحشر', surahNumber: 59, ayahNumber: 24, category: 'divine_names' },
  { text: 'له الأسماء الحسنى', surahName: 'الحشر', surahNumber: 59, ayahNumber: 24, category: 'divine_names' },
  { text: 'يسبح له ما في السماوات والأرض', surahName: 'الحشر', surahNumber: 59, ayahNumber: 24, category: 'verse_segment' },
  { text: 'وهو العزيز الحكيم', surahName: 'الحشر', surahNumber: 59, ayahNumber: 24, category: 'divine_names' },
  { text: 'إنما أمره إذا أراد شيئا أن يقول له كن فيكون', surahName: 'يس', surahNumber: 36, ayahNumber: 82, category: 'full_ayah' },
  { text: 'فسبحان الذي بيده ملكوت كل شيء وإليه ترجعون', surahName: 'يس', surahNumber: 36, ayahNumber: 83, category: 'full_ayah' },
  { text: 'كن فيكون', surahName: 'يس', surahNumber: 36, ayahNumber: 82, category: 'verse_segment' },
  { text: 'سبحان الله', surahName: 'الطور', surahNumber: 52, ayahNumber: 43, category: 'verse_segment' },
  { text: 'الحمد لله', surahName: 'الفاتحة', surahNumber: 1, ayahNumber: 2, category: 'verse_segment' },
  { text: 'الله أكبر', surahName: 'الحج', surahNumber: 22, ayahNumber: 37, category: 'creed_tauhid' },
  { text: 'لا حول ولا قوة إلا بالله', surahName: 'الكهف', surahNumber: 18, ayahNumber: 39, category: 'creed_tauhid' },
  { text: 'ما شاء الله لا قوة إلا بالله', surahName: 'الكهف', surahNumber: 18, ayahNumber: 39, category: 'verse_segment' },
  { text: 'ربنا تقبل منا إنك أنت السميع العليم', surahName: 'البقرة', surahNumber: 2, ayahNumber: 127, category: 'prophetic_duaa' },
  { text: 'وتُب علينا إنك أنت التواب الرحيم', surahName: 'البقرة', surahNumber: 2, ayahNumber: 128, category: 'prophetic_duaa' },
  { text: 'حسبنا الله سيؤتينا الله من فضله', surahName: 'التوبة', surahNumber: 9, ayahNumber: 59, category: 'verse_segment' },
  { text: 'إنا إلى الله راغبون', surahName: 'التوبة', surahNumber: 9, ayahNumber: 59, category: 'verse_segment' },
  { text: 'فصبر جميل', surahName: 'يوسف', surahNumber: 12, ayahNumber: 18, category: 'verse_segment' },
  { text: 'والله المستعان على ما تصفون', surahName: 'يوسف', surahNumber: 12, ayahNumber: 18, category: 'verse_segment' },
  { text: 'إنما أشكو بثي وحزني إلى الله', surahName: 'يوسف', surahNumber: 12, ayahNumber: 86, category: 'prophetic_duaa' },
  { text: 'ولا تيأسوا من روح الله', surahName: 'يوسف', surahNumber: 12, ayahNumber: 87, category: 'verse_segment' },
  { text: 'إنه لا ييأس من روح الله إلا القوم الكافرون', surahName: 'يوسف', surahNumber: 12, ayahNumber: 87, category: 'verse_segment' },
  { text: 'ألا بذكر الله تطمئن القلوب', surahName: 'الرعد', surahNumber: 13, ayahNumber: 28, category: 'verse_segment' },
  { text: 'الذين آمنوا وتطمئن قلوبهم بذكر الله', surahName: 'الرعد', surahNumber: 13, ayahNumber: 28, category: 'verse_segment' },
  { text: 'طوبى لهم وحسن مآب', surahName: 'الرعد', surahNumber: 13, ayahNumber: 29, category: 'verse_segment' },
  { text: 'وقل رب ارحمهما كما ربياني صغيرا', surahName: 'الإسراء', surahNumber: 17, ayahNumber: 24, category: 'prophetic_duaa' },
  { text: 'وقل جاء الحق وزهق الباطل إن الباطل كان زهوقا', surahName: 'الإسراء', surahNumber: 17, ayahNumber: 81, category: 'full_ayah' },
  { text: 'وننزل من القرآن ما هو شفاء ورحمة للمؤمنين', surahName: 'الإسراء', surahNumber: 17, ayahNumber: 82, category: 'verse_segment' },
  { text: 'ربنا آتنا من لدنك رحمة وهيئ لنا من أمرنا رشدا', surahName: 'الكهف', surahNumber: 18, ayahNumber: 10, category: 'prophetic_duaa' },
  { text: 'قل لو كان البحر مدادا لكلمات ربي لنفد البحر قبل أن تنفد كلمات ربي', surahName: 'الكهف', surahNumber: 18, ayahNumber: 109, category: 'verse_segment' },
  { text: 'ولو جئنا بمثله مددا', surahName: 'الكهف', surahNumber: 18, ayahNumber: 109, category: 'verse_segment' },
  { text: 'فمن كان يرجو لقاء ربه فليعمل عملا صالحا', surahName: 'الكهف', surahNumber: 18, ayahNumber: 110, category: 'verse_segment' },
  { text: 'ولا يشرك بعبادة ربه أحدا', surahName: 'الكهف', surahNumber: 18, ayahNumber: 110, category: 'verse_segment' },
  { text: 'واصبر نفسك مع الذين يدعون ربهم بالغداة والعشي', surahName: 'الكهف', surahNumber: 18, ayahNumber: 28, category: 'verse_segment' },
  { text: 'يريدون وجهه', surahName: 'الكهف', surahNumber: 18, ayahNumber: 28, category: 'verse_segment' },
  { text: 'وكان أمر الله قدرا مقدورا', surahName: 'الأحزاب', surahNumber: 33, ayahNumber: 38, category: 'verse_segment' },
  { text: 'وكفى بالله وكيلا', surahName: 'النساء', surahNumber: 4, ayahNumber: 81, category: 'divine_names' },
  { text: 'وكفى بالله حسيبا', surahName: 'النساء', surahNumber: 4, ayahNumber: 6, category: 'divine_names' },
  { text: 'وكفى بالله شهيدا', surahName: 'النساء', surahNumber: 4, ayahNumber: 79, category: 'divine_names' },
  { text: 'وكفى بالله نصيرا', surahName: 'النساء', surahNumber: 4, ayahNumber: 45, category: 'divine_names' },
  { text: 'وكفى بالله وليا', surahName: 'النساء', surahNumber: 4, ayahNumber: 45, category: 'divine_names' },
];

/**
 * Normalizes text for clean matching
 */
export function cleanQuranicVerseText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[^\u0621-\u064A\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
