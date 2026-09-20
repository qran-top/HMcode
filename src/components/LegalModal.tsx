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
  Save,
  RotateCcw,
  Trash2,
  ArrowUpDown,
  Shuffle,
  RefreshCw,
  Copy,
  Moon,
  Sun,
  Search,
  Check,
  SpellCheck,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="bg-white dark:bg-stone-900 w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden text-stone-800 dark:text-stone-200 animate-in zoom-in-95 duration-150 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 bg-stone-50/90 dark:bg-stone-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            {type === 'instructions' && <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            {type === 'privacy' && <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            {type === 'disclaimer' && <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
            {type === 'terms' && <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            {type === 'cookies' && <Cookie className="w-5 h-5 text-amber-700 dark:text-amber-400" />}
            {type === 'attribution' && <Bot className="w-5 h-5 text-amber-600 dark:text-amber-400" />}

            <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
              {type === 'instructions' && 'دليل الاستخدام وتعليمات التشفير العربي'}
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
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
          {/* 1. Instructions */}
          {type === 'instructions' && (
            <div className="space-y-5">
              {/* Introduction Banner */}
              <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/80 text-amber-950 dark:text-amber-200 space-y-1.5">
                <h4 className="font-extrabold text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  مرحباً بك في نظام «التشفير العربي»
                </h4>
                <p className="text-xs leading-relaxed text-stone-700 dark:text-stone-300">
                  نظام حاسوبي وتحليلي دقيق لتشفير وفك تشفير النصوص العربية استناداً إلى مصفوفة الطبقات السبع المتناظرة مع الربط التلقائي بمعجم مفردات القرآن الكريم الشريف والمعجم اللغوي العربي.
                </p>
              </div>

              {/* Section: Table Setup and Operation */}
              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-2xl bg-stone-50/50 dark:bg-stone-950/40 space-y-3">
                <h5 className="font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2 text-sm sm:text-base border-b border-stone-200 dark:border-stone-800 pb-2">
                  <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span>طريقة تجهيز الجدول وكيفية عمله (جدول التشفير):</span>
                </h5>

                <div className="space-y-2.5 text-xs">
                  <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                    يتكون جدول التشفير من <strong>7 طبقات متناظرة</strong>، كل طبقة تحتوي على <strong>4 خانات أحرف</strong> تمثل مجموع حروف الهجاء العربية الـ 28. ترتبط كل طبقة برمزين أو أكثر للتشفير:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-stone-100">
                        <Save className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>زر حفظ هذا الجدول:</span>
                      </div>
                      <p className="text-stone-600 dark:text-stone-400">
                        يقوم بحفظ الترتيب والتعديلات الحالية كجدول نشط في المتصفح، ليعتمد عليه التشفير وفك التشفير تلقائياً.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-stone-100">
                        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>زر قوالب جاهزة:</span>
                      </div>
                      <p className="text-stone-600 dark:text-stone-400">
                        يتيح لك اختيار وتطبيق مصفوفات وقوالب مسبقة الإعداد للطبقات السبع بنقرة زر واحدة.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-stone-100">
                        <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span>زر تفريغ الجدول:</span>
                      </div>
                      <p className="text-stone-600 dark:text-stone-400">
                        يفرغ خانات الجدول بالكامل لتتمكن من إعادة توزيع الحروف يدوياً من «بنك الحروف الـ 28».
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-stone-100">
                        <RotateCcw className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                        <span>زر استعادة الافتراضي:</span>
                      </div>
                      <p className="text-stone-600 dark:text-stone-400">
                        يسترجع التوزيع التشفيري النموذجي الأصلي لكافة الطبقات والحروف.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 text-stone-700 dark:text-stone-300 space-y-1">
                    <strong className="text-amber-950 dark:text-amber-200 block font-bold">
                      طرق تعديل أماكن الحروف:
                    </strong>
                    <ul className="list-disc list-inside space-y-1 pr-1">
                      <li><strong>السحب والإفلات (Drag & Drop):</strong> اسحب أي حرف بالماوس وأفلته فوق حرف آخر لتبديل مواقعهما فوراً.</li>
                      <li><strong>النقر السريع للتبديل:</strong> انقر على حرف لتحديده (يظهر بإطار مميز)، ثم انقر على خانة أخرى ليتم التبديل بينهما مباشرة.</li>
                      <li><strong>تعديل رموز الطبقة:</strong> يمكنك النقر على خانات الرموز المشفرة في كل طبقة وكتابة أي رمز أو حرف تريده.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Section: Encryption View */}
              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-2xl bg-stone-50/50 dark:bg-stone-950/40 space-y-3">
                <h5 className="font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2 text-sm sm:text-base border-b border-stone-200 dark:border-stone-800 pb-2">
                  <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span>١. قسم التشفير (توليد الاحتمالات وتشفير النصوص):</span>
                </h5>

                <div className="space-y-2 text-xs text-stone-600 dark:text-stone-300">
                  <p>
                    عند كتابة أي نص في خانة الإدخال، يتم تحليله حرفاً بحرف، وتحديد طبقته من الطبقات السبع مع استخراج خيارات التشفير الخاصة بها.
                  </p>
                  <ul className="list-disc list-inside space-y-1 pr-1">
                    <li><strong>مربعات تحليل الحروف:</strong> تعرض كل حرف مع رقم طبقته ولونها الخاص، وتمكنك من النقر على أي احتمال لتبديل الحرف المشفر المعتمد له.</li>
                    <li><strong>زر توليد الاحتمالات (<Sparkles className="w-3.5 h-3.5 inline text-amber-500" />):</strong> يقوم بتوليد كافة التباديل التشفيرية الممكنة للنص وحسابها فورياً مع شريط تقدم حقيقي يمنع تجميد المتصفح.</li>
                    <li><strong>زر مفردات قرآنية (<BookOpen className="w-3.5 h-3.5 inline text-amber-600" />):</strong> يفرز ويحصر النتائج في الكلمات التي تطابق تماماً ألفاظاً كريمة وردت في القرآن الكريم (مثل وقب، فلق، طسم، حم...).</li>
                    <li><strong>زر كلمات القاموس (<SpellCheck className="w-3.5 h-3.5 inline text-emerald-600" />):</strong> يحصر النتائج في الكلمات العربية الصحيحة الموثقة في المعجم اللغوي.</li>
                    <li><strong>زر التوليف العشوائي (<Shuffle className="w-3.5 h-3.5 inline text-amber-600" />) وعكس الاختيارات (<RefreshCw className="w-3.5 h-3.5 inline text-stone-500" />):</strong> لاختيار بدائل سريعة للمشفر المعتمد.</li>
                    <li><strong>البحث القرآني المباشر (<Search className="w-3.5 h-3.5 inline text-amber-600" />):</strong> ينقلك مباشرة للآية أو نتائج البحث الشاملة على منصة «قرآن توب».</li>
                  </ul>
                </div>
              </div>

              {/* Section: Decryption View */}
              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-2xl bg-stone-50/50 dark:bg-stone-950/40 space-y-3">
                <h5 className="font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2 text-sm sm:text-base border-b border-stone-200 dark:border-stone-800 pb-2">
                  <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>٢. قسم فك التشفير (استرجاع الأصل وعكس الترتيب):</span>
                </h5>

                <div className="space-y-2 text-xs text-stone-600 dark:text-stone-300">
                  <p>
                    أدخل النص المشفر ليقوم المحرك بالتعرف على رموز التشفير ومطابقتها بطبقاتها، واستخراج الحروف الأربعة المرشحة لكل رمز.
                  </p>
                  <ul className="list-disc list-inside space-y-1 pr-1">
                    <li><strong>زر عكس الترتيب عامودياً (<ArrowUpDown className="w-3.5 h-3.5 inline text-indigo-600" />):</strong> يعكس ترتيب أحرف النص رأسياً/عامودياً لاكتشاف الكلمات التي كُتبت بالمقلوب مع فحص احتمالاتها القرآنية والمعجمية في الاتجاهين.</li>
                    <li><strong>توليد احتمالات فك التشفير:</strong> يولد كافة التراكيب الأصلية الممكنة ويفرز الكلمات ذات المعنى الموثق بالمعاجم.</li>
                  </ul>
                </div>
              </div>

              {/* Section: General Controls */}
              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-2xl bg-stone-50/50 dark:bg-stone-950/40 space-y-2.5">
                <h5 className="font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2 text-sm sm:text-base border-b border-stone-200 dark:border-stone-800 pb-2">
                  <Sun className="w-5 h-5 text-amber-500" />
                  <span>٣. أزرار التحكم العلوية:</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                    <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-700 flex items-center justify-center shrink-0">
                      <Moon className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                      <strong className="text-stone-900 dark:text-stone-100 block">زر الوضع الليلي / النهاري:</strong>
                      <span className="text-stone-500 dark:text-stone-400">أيقونة للتحويل الفوري بين المظهر الفاتح والمظهر الداكن الكامل.</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                    <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-700 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <strong className="text-stone-900 dark:text-stone-100 block">زر دليل الاستخدام:</strong>
                      <span className="text-stone-500 dark:text-stone-400">أيقونة لفتح هذا الدليل الشامل في أي وقت وبدون حشو بالواجهة.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Privacy Policy */}
          {type === 'privacy' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 space-y-1">
                <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  سياسة خصوصية صارمة وبدون جمع بيانات شخصية (Zero-Data Collection)
                </h4>
                <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                  تلتزم منصة «التشفير العربي» بأعلى معايير الخصوصية الرقمية الدولية بما يتوافق مع لائحة حماية البيانات العامة في الاتحاد الأوروبي (GDPR)، وقانون خصوصية المستهلك في كاليفورنيا (CCPA)، والأنظمة العربية والدولية.
                </p>
              </div>

              <div className="space-y-3 text-xs text-stone-600 dark:text-stone-300">
                <div className="border border-stone-200 dark:border-stone-800 p-3.5 rounded-xl space-y-1 bg-stone-50/50 dark:bg-stone-950/40">
                  <h5 className="font-bold text-stone-900 dark:text-stone-100">١. المعالجة محلياً في متصفحك (Client-Side Only):</h5>
                  <p>
                    تتم جميع عمليات التشفير، فك التشفير، توليد الاحتمالات، فحص القواميس، ومطابقة الألفاظ القرآنية داخل متصفح جهازك حصرياً (In-Browser Execution). لا يتم إرسال نصوصك أو كلماتك المدخلة إلى أي خادم خارجي على الإطلاق.
                  </p>
                </div>

                <div className="border border-stone-200 dark:border-stone-800 p-3.5 rounded-xl space-y-1 bg-stone-50/50 dark:bg-stone-950/40">
                  <h5 className="font-bold text-stone-900 dark:text-stone-100">٢. انعدام التتبع والملفات التعريفية الإعلانية:</h5>
                  <p>
                    لا نستخدم أي برمجيات تتبع (Trackers)، أو ملفات تعريف ارتباط لأغراض إعلانية (Third-party Cookies)، ولا نقوم بجمع هويات المستخدمين أو عناوين بروتوكول الإنترنت (IP addresses) الشخصية.
                  </p>
                </div>

                <div className="border border-stone-200 dark:border-stone-800 p-3.5 rounded-xl space-y-1 bg-stone-50/50 dark:bg-stone-950/40">
                  <h5 className="font-bold text-stone-900 dark:text-stone-100">٣. أمان البيانات والحفظ:</h5>
                  <p>
                    لا توجد قواعد بيانات تخزن نصوصك المدخلة. عند إغلاقك لصفحة الموقع أو تحديثها، تُحذف البيانات المؤقتة من ذاكرة المتصفح تلقائياً وفوراً.
                  </p>
                </div>

                <div className="border border-stone-200 dark:border-stone-800 p-3.5 rounded-xl space-y-1 bg-stone-50/50 dark:bg-stone-950/40">
                  <h5 className="font-bold text-stone-900 dark:text-stone-100">٤. الروابط الخارجية:</h5>
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
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200 space-y-1">
                <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  إخلاء المسؤولية العلمية والفكرية والقانونية
                </h4>
                <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                  يُرجى قراءة بيان إخلاء المسؤولية التالي بعناية قبل استخدام أداة «التشفير العربي».
                </p>
              </div>

              <div className="space-y-3 text-xs text-stone-600 dark:text-stone-300">
                <div className="border border-stone-200 dark:border-stone-800 p-3.5 rounded-xl space-y-1 bg-stone-50/50 dark:bg-stone-950/40">
                  <h5 className="font-bold text-stone-900 dark:text-stone-100">١. الطبيعة البحثية واللغوية:</h5>
                  <p>
                    برنامج «التشفير العربي» هو أداة برمجية بحثية واستكشافية في علوم التشفير اللغوي وعلم مصفوفات الحروف والأبجديات ومطابقة مفردات اللغة والمعاجم. النتائج والاحتمالات الناتجة هي توليدات خوارزمية ورياضية بحتة قائمة على قواعد التبديل والطبقات.
                  </p>
                </div>

                <div className="border border-stone-200 dark:border-stone-800 p-3.5 rounded-xl space-y-1 bg-stone-50/50 dark:bg-stone-950/40">
                  <h5 className="font-bold text-stone-900 dark:text-stone-100">٢. التفسير والأحكام الشرعية:</h5>
                  <p>
                    المطابقات مع ألفاظ القرآن الكريم المقدمة في هذا البرنامج هي مطابقات لغوية ومعجمية للكلمات، ولا تُعتبر تفسيراً لآيات الله، ولا حكماً شرعياً، ولا تأويلاً خاصاً لكتاب الله العزيز. المرجع الوحيد المعتمد لتفسير القرآن الكريم هو كتب التفسير المعتبرة وأهل العلم الثقات.
                  </p>
                </div>

                <div className="border border-stone-200 dark:border-stone-800 p-3.5 rounded-xl space-y-1 bg-stone-50/50 dark:bg-stone-950/40">
                  <h5 className="font-bold text-stone-900 dark:text-stone-100">٣. عدم تقديم ضمانات أمنية عسكرية:</h5>
                  <p>
                    هذا التشفير مبني على قواعد تراثية وبحثية خاصة (الطبقات السبع) ولا يُقصد به استخدامه كبديل لأنظمة التشفير المعيارية الحديثة (مثل AES أو RSA) لتأمين المعاملات المالية أو البيانات الحساسة للغاية.
                  </p>
                </div>

                <div className="border border-stone-200 dark:border-stone-800 p-3.5 rounded-xl space-y-1 bg-stone-50/50 dark:bg-stone-950/40">
                  <h5 className="font-bold text-stone-900 dark:text-stone-100">٤. مسؤولية الاستخدام:</h5>
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
              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 space-y-1">
                <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  شروط وأحكام استخدام المنصة (Terms of Use)
                </h4>
                <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                  باستخدامك لتطبيق «التشفير العربي»، فإنك توافق التام على الشروط والضوابط المنصوص عليها أدناه.
                </p>
              </div>

              <div className="space-y-3 text-xs text-stone-600 dark:text-stone-300">
                <div className="border border-stone-200 dark:border-stone-800 p-3.5 rounded-xl space-y-1 bg-stone-50/50 dark:bg-stone-950/40">
                  <h5 className="font-bold text-stone-900 dark:text-stone-100">١. الاستخدام المجاني والمشروع:</h5>
                  <p>
                    البرنامج متاح للاستخدام المجاني للأغراض التعليمية، المعرفية، اللغوية والبحثية. يُحظر تماماً استخدام البرنامج لأي غرض غير قانوني أو مخالف للأخلاق والآداب العامة أو انتهاك حقوق الآخرين.
                  </p>
                </div>

                <div className="border border-stone-200 dark:border-stone-800 p-3.5 rounded-xl space-y-1 bg-stone-50/50 dark:bg-stone-950/40">
                  <h5 className="font-bold text-stone-900 dark:text-stone-100">٢. الملكية الفكرية:</h5>
                  <p>
                    حقوق الفكرة من توفيق الله عز وجل، والخوارزميات والواجهة البرمجية مفتوحة للنفع العلمي. يُسمح بالاقتباس والاستفادة منها مع الحفاظ على الأمانة العلمية والإشارة لمصدر البرنامج.
                  </p>
                </div>

                <div className="border border-stone-200 dark:border-stone-800 p-3.5 rounded-xl space-y-1 bg-stone-50/50 dark:bg-stone-950/40">
                  <h5 className="font-bold text-stone-900 dark:text-stone-100">٣. توفر الخدمة والتحديثات:</h5>
                  <p>
                    يتم تقديم التطبيق &quot;كما هو&quot; (AS IS) دون أي ضمانات صريحة أو ضمنية للاستمرار بدون انقطاع، ويحق للمشرفين تحديث أو تطوير أو تعديل الميزات الخوارزمية في أي وقت لتحسين الأداء والدقة.
                  </p>
                </div>

                <div className="border border-stone-200 dark:border-stone-800 p-3.5 rounded-xl space-y-1 bg-stone-50/50 dark:bg-stone-950/40">
                  <h5 className="font-bold text-stone-900 dark:text-stone-100">٤. الامتثال للأنظمة المحلية والدولية:</h5>
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
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 space-y-1">
                <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                  <Cookie className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  سياسة ملفات تعريف الارتباط والتخزين المحلي
                </h4>
                <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                  توضيح كيفية تعامل التطبيق مع ملفات تعريف الارتباط وتقنيات التخزين المؤقت في المتصفح.
                </p>
              </div>

              <div className="space-y-3 text-xs text-stone-600 dark:text-stone-300">
                <div className="border border-stone-200 dark:border-stone-800 p-3.5 rounded-xl space-y-1 bg-stone-50/50 dark:bg-stone-950/40">
                  <h5 className="font-bold text-stone-900 dark:text-stone-100">١. لا نستخدم كوكيز لتتبع النشاط (No Tracking Cookies):</h5>
                  <p>
                    الموقع خالٍ تماماً من ملفات تعريف الارتباط التي تتبع المستخدم عبر المواقع الأخرى، ولا يوجد أي كوكيز من جهات خارجية (Third-party cookies) لأغراض الإعلانات.
                  </p>
                </div>

                <div className="border border-stone-200 dark:border-stone-800 p-3.5 rounded-xl space-y-1 bg-stone-50/50 dark:bg-stone-950/40">
                  <h5 className="font-bold text-stone-900 dark:text-stone-100">٢. التخزين المحلي الضروري تقنياً (Local Storage):</h5>
                  <p>
                    قد يستخدم التطبيق ذاكرة التخزين المحلي للمتصفح (Web Local Storage / IndexedDB) فقط لتسريع تحميل المعاجم اللغوية والقرآنية في متصفحك حتى يعمل البرنامج بكفاءة وسرعة فائقة دون الحاجة لإعادة تنزيلها في كل جلسة.
                  </p>
                </div>

                <div className="border border-stone-200 dark:border-stone-800 p-3.5 rounded-xl space-y-1 bg-stone-50/50 dark:bg-stone-950/40">
                  <h5 className="font-bold text-stone-900 dark:text-stone-100">٣. إدارة وتفريغ التخزين:</h5>
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
              <div className="p-4 bg-linear-to-b from-amber-50 to-white dark:from-stone-950 dark:to-stone-900 rounded-2xl border border-amber-300 dark:border-amber-700 shadow-xs text-stone-800 dark:text-stone-200 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-black text-base">
                  <Bot className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  <span>بيان الأمانة ونسبة الفضل والعمل</span>
                </div>

                <div className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-amber-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-semibold leading-relaxed">
                  <span className="text-amber-800 dark:text-amber-400 font-extrabold text-sm block mb-1">
                    ﴿وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ عَلَيْهِ تَوَكَّلْتُ وَإِلَيْهِ أُنِيبُ﴾
                  </span>
                  نقرّ ونعلن بكل إخلاص وأمانة وتواضع أمام الله سبحانه وتعالى وأمام جميع المستخدمين:
                </div>

                <div className="space-y-2.5 text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-stone-900 dark:text-stone-100">الفكرة والتوفيق:</strong> إن فكرة هذا النظام التشفيري وتوافقاته ومصفوفاته هي بتوفيق الله عزّ وجلّ وفضله ومنّته وحده، ونسأل الله أن يجعل هذا العمل نافعاً مباركاً وخالصاً لوجهه الكريم.
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-stone-900 dark:text-stone-100">التنفيذ البرمجي والصناعة:</strong> نكتب بكل أمانة وشفافية مطلقة أن هذا البرنامج بالكامل من كود وتصميم وبرمجة وحسابات وخوارزميات وتوليد فهارس وقواعد بيانات تم إنشاؤه وتطويره بواسطة **الذكاء الاصطناعي** (مساعد البرمجة الذكي من Google AI Studio / Gemini).
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-stone-900 dark:text-stone-100">المصادر المفتوحة ومحرك البحث القرآني:</strong> تم ربط الآيات والسور بمحرك البحث القرآني «قرآن توب» (qran-top.github.io) تسهيلاً للبحث ومطابقة النتائج مع النص القرآني المعتمد.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
