import React, { useState } from 'react';
import {
  ArrowRight,
  Shield,
  FileText,
  AlertTriangle,
  HelpCircle,
  Cookie,
  Bot,
  Sparkles,
  Layers,
  Save,
  Trash2,
  RotateCcw,
  Lock,
  KeyRound,
  ExternalLink,
  Sun,
  Moon,
  Shuffle,
  RefreshCw,
  Search,
  BookOpen,
  SpellCheck,
  CheckCircle2,
  ArrowUpDown
} from 'lucide-react';

export type InfoSection = 'privacy' | 'terms' | 'disclaimer' | 'instructions' | 'cookies' | 'attribution';

interface InfoViewProps {
  onBack: () => void;
  initialSection?: InfoSection;
}

export function InfoView({ onBack, initialSection = 'privacy' }: InfoViewProps) {
  const [activeSection, setActiveSection] = useState<InfoSection>(initialSection);

  const sections: { id: InfoSection; label: string; icon: React.ElementType }[] = [
    { id: 'privacy', label: 'الخصوصية', icon: Shield },
    { id: 'terms', label: 'الشروط', icon: FileText },
    { id: 'disclaimer', label: 'إخلاء المسؤولية', icon: AlertTriangle },
    { id: 'instructions', label: 'دليل الاستخدام', icon: HelpCircle },
    { id: 'cookies', label: 'التخزين والكوكيز', icon: Cookie },
    { id: 'attribution', label: 'بيان التطوير وجوجل', icon: Bot },
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12 w-full max-w-full overflow-x-hidden animate-in fade-in duration-200" dir="rtl">
      
      {/* Top Bar with Back Button */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3 sm:p-4 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-200 transition-all cursor-pointer flex items-center gap-1.5 font-medium text-xs shadow-2xs active:scale-95"
            title="العودة إلى شاشة البرنامج"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للبرنامج</span>
          </button>
          <div className="h-5 w-px bg-stone-200 dark:bg-stone-800 hidden sm:block" />
          <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <span>السياسات والمعلومات القانونية</span>
          </h2>
        </div>

        {/* External verified links for Google compliance */}
        <div className="flex items-center gap-1.5">
          <a
            href="https://hmcode7.ai.studio/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-stone-800 dark:hover:bg-stone-750 border border-amber-300/80 dark:border-stone-700 text-stone-800 dark:text-stone-200 transition-all flex items-center gap-1 text-2xs font-semibold shadow-2xs"
            title="تطبيق Google AI Studio"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span className="hidden sm:inline">Google AI Studio</span>
          </a>

          <a
            href="https://qran-top.github.io/HMcode/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 transition-all flex items-center gap-1 text-2xs font-semibold shadow-2xs"
            title="مستودع GitHub"
          >
            <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>

      {/* Navigation Tabs - Swipable / Responsive */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-w-full">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                isActive
                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Body Section */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 sm:p-6 shadow-2xs space-y-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
        
        {/* 1. Privacy Policy */}
        {activeSection === 'privacy' && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 space-y-1.5">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <span>سياسة الخصوصية وحماية البيانات (Privacy Policy)</span>
              </h3>
              <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                تلتزم منصة «التشفير العربي» بأعلى معايير الخصوصية الرقمية العالمية، بما يتوافق مع متطلبات Google، ولائحة حماية البيانات العامة في الاتحاد الأوروبي (GDPR)، وقانون خصوصية المستهلك في كاليفورنيا (CCPA).
              </p>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-xl space-y-1.5 bg-stone-50/50 dark:bg-stone-950/40">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">١. المعالجة محلياً بالكامل في متصفحك (Client-Side Only):</h4>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  تتم جميع خوارزميات التشفير، فك التشفير، استخراج الاحتمالات، فحص القواميس، ومطابقة الألفاظ القرآنية وحساب الجُمَّل داخل متصفح جهازك حصرياً. لا يتم رفع نصوصك أو كلماتك المدخلة إلى أي خادم خارجي على الإطلاق.
                </p>
              </div>

              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-xl space-y-1.5 bg-stone-50/50 dark:bg-stone-950/40">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">٢. انعدام التتبع والملفات التعريفية الإعلانية (Zero Tracking):</h4>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  لا نستخدم أي برمجيات تتبع، أو ملفات تعريف ارتباط خارجية لأغراض الإعلانات (Third-party Advertising Cookies)، ولا نقوم بجمع هويات المستخدمين أو معلومات تسجيل الدخول.
                </p>
              </div>

              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-xl space-y-1.5 bg-stone-50/50 dark:bg-stone-950/40">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">٣. أمان البيانات والحفظ:</h4>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  لا توجد قواعد بيانات تخزن نصوصك. يمكنك حفظ المنظومات أو الكلمات في المفكرة المحلية المخزنة في جهازك فقط، وتستطيع مسحها في أي وقت بنقرة زر واحدة.
                </p>
              </div>

              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-xl space-y-1.5 bg-stone-50/50 dark:bg-stone-950/40">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">٤. الروابط الخارجية المعتمدة:</h4>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  يتضمن البرنامج روابط اختيارية لموقع المصحف المعتمد (قرآن توب qran-top.github.io) لخدمة قراءة الآيات وتوثيق النص الشريف.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. Terms of Service */}
        {activeSection === 'terms' && (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 space-y-1.5">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>شروط وأحكام استخدام المنصة (Terms of Service)</span>
              </h3>
              <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                باستخدامك لتطبيق «التشفير العربي»، فإنك توافق على الشروط والضوابط المنصوص عليها أدناه.
              </p>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-xl space-y-1.5 bg-stone-50/50 dark:bg-stone-950/40">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">١. الاستخدام المجاني والمشروع:</h4>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  البرنامج متاح للاستخدام المجاني للأغراض التعليمية، المعرفية، اللغوية والبحثية. يُحظر تماماً استخدام البرنامج لأي غرض غير قانوني أو انتهاك حقوق الآخرين.
                </p>
              </div>

              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-xl space-y-1.5 bg-stone-50/50 dark:bg-stone-950/40">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">٢. الأمانة العلمية والملكية:</h4>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  الخوارزميات والواجهة مفتوحة للنفع العلمي العام. يُسمح بالاقتباس والاستفادة منها مع الحفاظ على الأمانة العلمية والإشارة لمصدر البرنامج.
                </p>
              </div>

              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-xl space-y-1.5 bg-stone-50/50 dark:bg-stone-950/40">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">٣. توفر الخدمة والتحديثات:</h4>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  يتم تقديم التطبيق &quot;كما هو&quot; (AS IS) دون أي ضمانات تجارية، ويحق لفريق التطوير تحديث أو تحسين الميزات في أي وقت لرفع الكفاءة والدقة.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. Disclaimer */}
        {activeSection === 'disclaimer' && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200 space-y-1.5">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <span>إخلاء المسؤولية العلمية والفكرية والقانونية</span>
              </h3>
              <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                بيان وتوضيح لحدود الاستخدام البحثي واللغوي للأداة.
              </p>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-xl space-y-1.5 bg-stone-50/50 dark:bg-stone-950/40">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">١. الطبيعة البحثية واللغوية:</h4>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  برنامج «التشفير العربي» هو أداة برمجية بحثية واستكشافية في علوم التشفير اللغوي وعلم مصفوفات الحروف ومطابقة المفردات والمعاجم. النتائج هي توليدات خوارزمية ورياضية بحتة قائمة على التوافيق المتناظرة.
                </p>
              </div>

              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-xl space-y-1.5 bg-stone-50/50 dark:bg-stone-950/40">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">٢. التفسير والأحكام الشرعية:</h4>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  المطابقات مع ألفاظ القرآن الكريم المقدمة في هذا البرنامج هي مطابقات لغوية ومعجمية للكلمات، ولا تُعتبر تفسيراً لآيات الله، ولا حكماً شرعياً، ولا تأويلاً خاصاً لكتاب الله العزيز. المرجع الوحيد المعتمد لتفسير القرآن الكريم هو كتب التفسير المعتبرة وأهل العلم الثقات.
                </p>
              </div>

              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-xl space-y-1.5 bg-stone-50/50 dark:bg-stone-950/40">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">٣. عدم تقديم ضمانات أمنية عسكرية:</h4>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  هذا التشفير مبني على نظام الطبقات السبع اللغوي ولا يُقصد به استخدامه كبديل لأنظمة التشفير المعيارية الحديثة (مثل AES أو RSA) لتأمين المعاملات المالية أو البيانات الحكومية المشفرة.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. Instructions */}
        {activeSection === 'instructions' && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/80 text-amber-950 dark:text-amber-200 space-y-1.5">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>دليل الاستخدام وتعليمات التشفير العربي</span>
              </h3>
              <p className="text-xs leading-relaxed text-stone-700 dark:text-stone-300">
                شرح شامل لكيفية استخدام مربع البحث الموحد، نظام الطبقات السبع، ومطابقة السلاسل.
              </p>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-xl space-y-2 bg-stone-50/50 dark:bg-stone-950/40">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-2">
                  <Search className="w-4 h-4 text-amber-600" />
                  <span>١. مربع البحث الموحد (أقل إدخال وأكثر نتائج):</span>
                </h4>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  اكتب أي كلمة أو الصقها بنقرة واحدة باستخدام أيقونة اللصق. سيقوم النظام فوراً بالتحليل اللغوي واستخراج:
                </p>
                <ul className="list-disc list-inside space-y-1 text-stone-600 dark:text-stone-300 pr-2">
                  <li><strong>فك التشفير:</strong> المطابقات القرآنية والمعجمية وأقرب المفردات شبهاً بالكلمة.</li>
                  <li><strong>التشفير:</strong> استخراج الحروف المقابلة وفق نظام الطبقات السبع المتناظرة.</li>
                  <li><strong>حساب الجُمَّل:</strong> القيمة العددية الكبرى والوسطى والصغرى والمفردات المتطابقة في القيمة.</li>
                  <li><strong>الفحص الشامل:</strong> انقر على أيقونة الطبقات أو اضغط Ctrl+Enter لفحص الكلمة عبر أكثر من 50 منظومة متناظرة.</li>
                </ul>
              </div>

              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-xl space-y-2 bg-stone-50/50 dark:bg-stone-950/40">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>٢. منظومة السماء والأرض والطبقات السبع:</span>
                </h4>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  تتوزع الحروف الـ 14 النورانية كأحرف سماء في 7 طبقات، وتتوزع الحروف الهجائية الـ 28 كأحرف أرض في نفس الطبقات الـ 7. يمكنك تبديل المنظومات أو عكسها بنقرة واحدة على أيقونة السهمين المعكوسين.
                </p>
              </div>

              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-xl space-y-2 bg-stone-50/50 dark:bg-stone-950/40">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                  <span>٣. مطابق السلاسل:</span>
                </h4>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  يتيح لك استكشاف السلاسل القرآنية المتطابقة، وعند النقر على أي سطر يفتح لك التفاصيل التفكيكية الكاملة للآية والكلمات.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 5. Cookies & Storage Policy */}
        {activeSection === 'cookies' && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 space-y-1.5">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Cookie className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                <span>سياسة ملفات تعريف الارتباط والتخزين المحلي</span>
              </h3>
              <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                توضيح كيفية تعامل التطبيق مع تقنيات التخزين المؤقت في المتصفح.
              </p>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-xl space-y-1.5 bg-stone-50/50 dark:bg-stone-950/40">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">١. لا نستخدم كوكيز لتتبع النشاط (No Tracking Cookies):</h4>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  الموقع خالٍ تماماً من ملفات تعريف الارتباط التي تتبع المستخدم عبر المواقع الأخرى، ولا يوجد أي كوكيز من جهات خارجية لأغراض الإعلانات.
                </p>
              </div>

              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-xl space-y-1.5 bg-stone-50/50 dark:bg-stone-950/40">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">٢. التخزين المحلي الضروري تقنياً (Local Storage):</h4>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  يستخدم التطبيق ذاكرة التخزين المحلي للمتصفح فقط لحفظ تفضيل مظهرك (داكن / نهاري)، حجم الخط المفضل، وحفظ مدخلات المفكرة التي تختار حفظها بنفسك، بالإضافة لتسريع تحميل الفهارس المعجمية في المتصفح.
                </p>
              </div>

              <div className="border border-stone-200 dark:border-stone-800 p-4 rounded-xl space-y-1.5 bg-stone-50/50 dark:bg-stone-950/40">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">٣. حرية تفريغ التخزين:</h4>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  يمكنك في أي وقت مسح بيانات الموقع أو تعطيل التخزين المحلي من خلال إعدادات الخصوصية في متصفحك.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 6. Attribution & AI Honest Disclosure */}
        {activeSection === 'attribution' && (
          <div className="space-y-4">
            <div className="p-4 bg-linear-to-b from-amber-50 to-white dark:from-stone-950 dark:to-stone-900 rounded-2xl border border-amber-300 dark:border-amber-700 shadow-xs text-stone-800 dark:text-stone-200 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-black text-base">
                <Bot className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                <span>بيان الأمانة العلمية ونسبة التطوير بالذكاء الاصطناعي وجوجل</span>
              </div>

              <div className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-amber-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-semibold leading-relaxed">
                <span className="text-amber-800 dark:text-amber-400 font-extrabold text-sm block mb-1">
                  ﴿وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ عَلَيْهِ تَوَكَّلْتُ وَإِلَيْهِ أُنِيبُ﴾
                </span>
                نقرّ ونعلن بكل إخلاص وأمانة وتواضع أمام الله سبحانه وتعالى وأمام جميع المستخدمين:
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-stone-900 dark:text-stone-100">الفكرة والتوفيق:</strong> إن فكرة هذا النظام التشفيري وتوافقاته ومصفوفاته هي بتوفيق الله عزّ وجلّ وفضله ومنّته وحده، ونسأل الله أن يجعل هذا العمل نافعاً مباركاً وخالصاً لوجهه الكريم.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-stone-900 dark:text-stone-100">التنفيذ البرمجي والصناعة:</strong> نكتب بكل أمانة وشفافية مطلقة أن هذا البرنامج بالكامل من كود وتصميم وبرمجة وحسابات وخوارزميات وتوليد فهارس وقواعد بيانات تم إنشاؤه وتطويره بواسطة **الذكاء الاصطناعي** (مساعد البرمجة الذكي من Google AI Studio / Gemini).
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
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
    </div>
  );
}
