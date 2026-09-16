import React from 'react';
import {
  X,
  HelpCircle,
  Shield,
  AlertTriangle,
  FileText,
  Cookie,
  Bot,
  Sparkles,
  BookOpen,
  KeyRound,
  Lock,
  Layers,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { PolicyModalType } from './Footer';

interface LegalModalProps {
  type: PolicyModalType;
  onClose: () => void;
}

export function LegalModal({ type, onClose }: LegalModalProps) {
  if (!type) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="bg-white w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden text-stone-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between gap-3 bg-stone-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            {type === 'instructions' && <HelpCircle className="w-5 h-5 text-amber-600" />}
            {type === 'privacy' && <Shield className="w-5 h-5 text-emerald-600" />}
            {type === 'disclaimer' && <AlertTriangle className="w-5 h-5 text-rose-600" />}
            {type === 'terms' && <FileText className="w-5 h-5 text-indigo-600" />}
            {type === 'cookies' && <Cookie className="w-5 h-5 text-amber-700" />}
            {type === 'attribution' && <Bot className="w-5 h-5 text-amber-600" />}

            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              {type === 'instructions' && 'دليل الاستخدام وتعليمات شيفرة الفرقان'}
              {type === 'privacy' && 'سياسة الخصوصية وحماية البيانات (Privacy Policy)'}
              {type === 'disclaimer' && 'إخلاء المسؤولية القانونية والعلمية (Disclaimer)'}
              {type === 'terms' && 'شروط وأحكام الاستخدام (Terms of Service)'}
              {type === 'cookies' && 'سياسة ملفات تعريف الارتباط والتخزين (Cookies Policy)'}
              {type === 'attribution' && 'بيان الأمانة العلمية ونسبة التطوير بالذكاء الاصطناعي'}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm leading-relaxed text-stone-700">
          {/* 1. Instructions */}
          {type === 'instructions' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 space-y-1">
                <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  مرحباً بك في برنامج «شيفرة الفرقان»
                </h4>
                <p className="text-xs leading-relaxed">
                  نظام حاسوبي وتحليلي دقيق لتشفير وفك تشفير النصوص العربية استناداً إلى مصفوفة الطبقات السبع المتناظرة والأبجدية القديمة والربط مع المعجم القرآني الشريف والمعجم اللغوي العربي.
                </p>
              </div>

              <div className="space-y-3">
                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1.5">
                  <h5 className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    ١. قسم التشفير (توليد الاحتمالات وتشفير النصوص):
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-xs text-stone-600 pr-1">
                    <li>أدخل أي نص أو كلمة عربية في صندوق الإدخال بالأعلى.</li>
                    <li>يقوم البرنامج بتحليل كل حرف وتحديد طبقته من الطبقات السبع (1 إلى 7) مع إظهار الحرفين المقابلين لكل حرف في تلك الطبقة.</li>
                    <li>يمكنك اختيار الحرف المراد لكل موضع أو تصفح كافة الاحتمالات الناتجة رياضياً (حتى 1024 احتمال فوري).</li>
                    <li>تُقسّم كل نتيجة تلقائياً إلى المقاطع النورانية (فواتح السور مثل الم، حم، طسم، الر...) وتُفحص فورياً مقابل معجم ألفاظ القرآن الكريم والمعجم اللغوي العربي.</li>
                    <li>تُلوّن المفردات المتطابقة مع القرآن باللون الذهبي، والكلمات القاموسية باللون الأخضر الزمردي.</li>
                  </ul>
                </div>

                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1.5">
                  <h5 className="font-bold text-stone-900 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-indigo-600" />
                    ٢. قسم فك التشفير (استرجاع الأصل والبحث العكسي):
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-xs text-stone-600 pr-1">
                    <li>أدخل النص المشفر في خانة فك التشفير.</li>
                    <li>يقوم المحرك بحساب كافة التباديل العكسية الممكنة ضمن الطبقات السبع.</li>
                    <li>يمكنك تفعيل ميزة &quot;الاحتمالات العكسية&quot; لقراءة النص مقلوباً (من اليسار لليمين) مع إعادة التحليل النوراني واللغوي.</li>
                    <li>استخدم أزرار التصفية السريعة لحصر النتائج في: المفردات القرآنية فقط، أو الكلمات العربية الموثقة، أو الفواتح المركبة.</li>
                  </ul>
                </div>

                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1.5">
                  <h5 className="font-bold text-stone-900 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    ٣. قسم جدول الطبقات السبع:
                  </h5>
                  <p className="text-xs text-stone-600">
                    يعرض المصفوفة الكاملة للطبقات السبع (الطبقة 7: أ، ب، ج، د ... وحتى الطبقة 1: ذ، ض، ظ، غ)، مع تحديد الحروف النشطة في النص الحالي، وإمكانية النقر على أي حرف لإضافته فورياً للنص.
                  </p>
                </div>

                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1.5">
                  <h5 className="font-bold text-stone-900 flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4 text-amber-600" />
                    ٤. الارتباط بمصحف ومحرك بحث «قرآن توب» (qran-top):
                  </h5>
                  <p className="text-xs text-stone-600">
                    عند اكتشاف لفظ قرآني، يتيح لك البرنامج النقر المباشر للانتقال للآية في مصحف قرآن توب، وإذا كان اللفظ قد ورد في أكثر من موضع يُنقلك تلقائياً لمحرك البحث الشامل للكلمة في القرآن الكريم.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Privacy Policy */}
          {type === 'privacy' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 space-y-1">
                <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-700" />
                  سياسة خصوصية صارمة وبدون جمع بيانات شخصية (Zero-Data Collection)
                </h4>
                <p className="text-xs leading-relaxed">
                  تلتزم منصة «شيفرة الفرقان» بأعلى معايير الخصوصية الرقمية الدولية بما يتوافق مع لائحة حماية البيانات العامة في الاتحاد الأوروبي (GDPR)، وقانون خصوصية المستهلك في كاليفورنيا (CCPA)، والأنظمة العربية والدولية.
                </p>
              </div>

              <div className="space-y-3 text-xs text-stone-600">
                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1">
                  <h5 className="font-bold text-stone-900">١. المعالجة محلياً في متصفحك (Client-Side Only):</h5>
                  <p>
                    تتم جميع عمليات التشفير، فك التشفير، توليد الاحتمالات، فحص القواميس، ومطابقة الألفاظ القرآنية داخل متصفح جهازك حصرياً (In-Browser Execution). لا يتم إرسال نصوصك أو كلماتك المدخلة إلى أي خادم خارجي على الإطلاق.
                  </p>
                </div>

                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1">
                  <h5 className="font-bold text-stone-900">٢. انعدام التتبع والملفات التعريفية الإعلانية:</h5>
                  <p>
                    لا نستخدم أي برمجيات تتبع (Trackers)، أو ملفات تعريف ارتباط لأغراض إعلانية (Third-party Cookies)، ولا نقوم بجمع هويات المستخدمين أو عناوين بروتوكول الإنترنت (IP addresses) الشخصية.
                  </p>
                </div>

                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1">
                  <h5 className="font-bold text-stone-900">٣. أمان البيانات والحفظ:</h5>
                  <p>
                    لا توجد قواعد بيانات تخزن نصوصك المدخلة. عند إغلاقك لصفحة الموقع أو تحديثها، تُحذف البيانات المؤقتة من ذاكرة المتصفح تلقائياً وفوراً.
                  </p>
                </div>

                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1">
                  <h5 className="font-bold text-stone-900">٤. الروابط الخارجية:</h5>
                  <p>
                    يحتوي البرنامج على روابط خارجية لموقع «قرآن توب» (qran-top.github.io) لخدمة قراءة الآيات والبحث القرآني، وتنطبق على تصفح ذلك الموقع سياسات الاستخدام الخاصة بمستضيفه (GitHub Pages).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. Disclaimer */}
          {type === 'disclaimer' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-950 space-y-1">
                <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  إخلاء المسؤولية العلمية والفكرية والقانونية
                </h4>
                <p className="text-xs leading-relaxed">
                  يُرجى قراءة بيان إخلاء المسؤولية التالي بعناية قبل استخدام أداة «شيفرة الفرقان».
                </p>
              </div>

              <div className="space-y-3 text-xs text-stone-600">
                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1">
                  <h5 className="font-bold text-stone-900">١. الطبيعة البحثية واللغوية:</h5>
                  <p>
                    برنامج «شيفرة الفرقان» هو أداة برمجية بحثية واستكشافية في علوم التشفير اللغوي وعلم مصفوفات الحروف والأبجديات ومطابقة مفردات اللغة والمعاجم. النتائج والاحتمالات الناتجة هي توليدات خوارزمية ورياضية بحتة قائمة على قواعد التبديل والطبقات.
                  </p>
                </div>

                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1">
                  <h5 className="font-bold text-stone-900">٢. التفسير والأحكام الشرعية:</h5>
                  <p>
                    المطابقات مع ألفاظ القرآن الكريم المقدمة في هذا البرنامج هي مطابقات لغوية ومعجمية للكلمات، ولا تُعتبر تفسيراً لآيات الله، ولا حكماً شرعياً، ولا تأويلاً خاصاً لكتاب الله العزيز. المرجع الوحيد المعتمد لتفسير القرآن الكريم هو كتب التفسير المعتبرة وأهل العلم الثقات.
                  </p>
                </div>

                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1">
                  <h5 className="font-bold text-stone-900">٣. عدم تقديم ضمانات أمنية عسكرية:</h5>
                  <p>
                    هذا التشفير مبني على قواعد تراثية وبحثية خاصة (الطبقات السبع) ولا يُقصد به استخدامه كبديل لأنظمة التشفير المعيارية الحديثة (مثل AES أو RSA) لتأمين المعاملات المالية أو البيانات الحساسة للغاية.
                  </p>
                </div>

                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1">
                  <h5 className="font-bold text-stone-900">٤. مسؤولية الاستخدام:</h5>
                  <p>
                    يتحمل المستخدم كامل المسؤولية عن النصوص التي يقوم بإدخالها أو توليدها أو نشرها من خلال هذا التطبيق، ولا يتحمل مطورو البرنامج أو نماذج الذكاء الاصطناعي أي تبعات لسوء استخدام الأداة.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4. Terms of Service */}
          {type === 'terms' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-950 space-y-1">
                <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  شروط وأحكام استخدام المنصة (Terms of Use)
                </h4>
                <p className="text-xs leading-relaxed">
                  باستخدامك لتطبيق «شيفرة الفرقان»، فإنك توافق التام على الشروط والضوابط المنصوص عليها أدناه.
                </p>
              </div>

              <div className="space-y-3 text-xs text-stone-600">
                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1">
                  <h5 className="font-bold text-stone-900">١. الاستخدام المجاني والمشروع:</h5>
                  <p>
                    البرنامج متاح للاستخدام المجاني للأغراض التعليمية، المعرفية، اللغوية والبحثية. يُحظر تماماً استخدام البرنامج لأي غرض غير قانوني أو مخالف للأخلاق والآداب العامة أو انتهاك حقوق الآخرين.
                  </p>
                </div>

                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1">
                  <h5 className="font-bold text-stone-900">٢. الملكية الفكرية:</h5>
                  <p>
                    حقوق الفكرة من توفيق الله عز وجل، والخوارزميات والواجهة البرمجية مفتوحة للنفع العلمي. يُسمح بالاقتباس والاستفادة منها مع الحفاظ على الأمانة العلمية والإشارة لمصدر البرنامج.
                  </p>
                </div>

                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1">
                  <h5 className="font-bold text-stone-900">٣. توفر الخدمة والتحديثات:</h5>
                  <p>
                    يتم تقديم التطبيق &quot;كما هو&quot; (AS IS) دون أي ضمانات صريحة أو ضمنية للاستمرار بدون انقطاع، ويحق للمشرفين تحديث أو تطوير أو تعديل الميزات الخوارزمية في أي وقت لتحسين الأداء والدقة.
                  </p>
                </div>

                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1">
                  <h5 className="font-bold text-stone-900">٤. الامتثال للأنظمة المحلية والدولية:</h5>
                  <p>
                    يلتزم التطبيق بالقوانين والتشريعات الرقمية المعمول بها دولياً، ويخضع أي نزاع متعلق باستخدام التطبيق للأعراف والمبادئ القانونية للبرمجيات المفتوحة.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 5. Cookies Policy */}
          {type === 'cookies' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 space-y-1">
                <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                  <Cookie className="w-4 h-4 text-amber-700" />
                  سياسة ملفات تعريف الارتباط والتخزين المحلي
                </h4>
                <p className="text-xs leading-relaxed">
                  توضيح كيفية تعامل التطبيق مع ملفات تعريف الارتباط وتقنيات التخزين المؤقت في المتصفح.
                </p>
              </div>

              <div className="space-y-3 text-xs text-stone-600">
                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1">
                  <h5 className="font-bold text-stone-900">١. لا نستخدم كوكيز لتتبع النشاط (No Tracking Cookies):</h5>
                  <p>
                    الموقع خالٍ تماماً من ملفات تعريف الارتباط التي تتبع المستخدم عبر المواقع الأخرى، ولا يوجد أي كوكيز من جهات خارجية (Third-party cookies) لأغراض الإعلانات.
                  </p>
                </div>

                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1">
                  <h5 className="font-bold text-stone-900">٢. التخزين المحلي الضروري تقنياً (Local Storage):</h5>
                  <p>
                    قد يستخدم التطبيق ذاكرة التخزين المحلي للمتصفح (Web Local Storage / IndexedDB) فقط لتسريع تحميل المعاجم اللغوية والقرآنية في متصفحك حتى يعمل البرنامج بكفاءة وسرعة فائقة دون الحاجة لإعادة تنزيلها في كل جلسة.
                  </p>
                </div>

                <div className="border border-stone-200 p-3.5 rounded-xl space-y-1">
                  <h5 className="font-bold text-stone-900">٣. إدارة وتفريغ التخزين:</h5>
                  <p>
                    يمكنك في أي وقت مسح بيانات الموقع أو تعطيل التخزين المحلي من خلال إعدادات الخصوصية في متصفحك (Settings &gt; Clear Browsing Data &gt; Cookies &amp; Site Data).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 6. Attribution & AI Honest Disclosure */}
          {type === 'attribution' && (
            <div className="space-y-4">
              <div className="p-4 bg-linear-to-b from-amber-50 to-white rounded-2xl border border-amber-300 shadow-xs text-stone-800 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-black text-base">
                  <Bot className="w-6 h-6 text-amber-600" />
                  <span>بيان الأمانة ونسبة الفضل والعمل</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200 text-stone-800 text-xs sm:text-sm font-semibold leading-relaxed">
                  <span className="text-amber-800 font-extrabold text-sm block mb-1">
                    ﴿وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ عَلَيْهِ تَوَكَّلْتُ وَإِلَيْهِ أُنِيبُ﴾
                  </span>
                  نقرّ ونعلن بكل إخلاص وأمانة وتواضع أمام الله سبحانه وتعالى وأمام جميع المستخدمين:
                </div>

                <div className="space-y-2.5 text-xs text-stone-700 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-stone-900">الفكرة والتوفيق:</strong> إن فكرة هذا النظام التشفيري وتوافقاته ومصفوفاته هي بتوفيق الله عزّ وجلّ وفضله ومنّته وحده، ونسأل الله أن يجعل هذا العمل نافعاً مباركاً وخالصاً لوجهه الكريم.
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-stone-900">التنفيذ البرمجي والصناعة:</strong> نكتب بكل أمانة وشفافية مطلقة أن هذا البرنامج بالكامل من كود وتصميم وبرمجة وحسابات وخوارزميات وتوليد فهارس وقواعد بيانات تم إنشاؤه وتطويره بواسطة **الذكاء الاصطناعي** (مساعد البرمجة الذكي من Google AI Studio / Gemini).
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-stone-900">المصادر المفتوحة والقرآن الكريم:</strong> تم ربط الآيات والسور بمشروع المصحف ومحرك البحث القرآني «قرآن توب» (qran-top.github.io) خدمةً لكتاب الله وتسهيلاً على كل باحث ومطّلع.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
