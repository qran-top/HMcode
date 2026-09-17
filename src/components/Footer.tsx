import React from 'react';
import {
  HelpCircle,
  Shield,
  AlertTriangle,
  FileText,
  Cookie,
  Bot,
  Heart,
  ExternalLink,
  Info,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export type PolicyModalType = 'instructions' | 'privacy' | 'disclaimer' | 'terms' | 'cookies' | 'attribution' | null;

interface FooterProps {
  onOpenModal: (type: PolicyModalType) => void;
}

export function Footer({ onOpenModal }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-stone-200/80 bg-white/70 backdrop-blur-xs text-stone-600 text-xs py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Attributions & Spiritual Dedication Banner */}
        <div className="p-4 rounded-2xl bg-linear-to-r from-amber-50/80 via-white to-emerald-50/80 border border-amber-200/60 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-right">
          <div className="space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-2 text-stone-900 font-extrabold text-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>التشفير العربي</span>
              <span className="text-stone-400 font-normal">|</span>
              <span className="text-amber-800 font-bold">علم الحرف والتشفير السباعي</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed max-w-2xl">
              الفكرة والتوفيق بفضل الله تعالى ومنّته وحده لا شريك له، والبرمجة والتطوير تمّت بكل أمانة ومسؤولية بواسطة الذكاء الاصطناعي (AI Coding Assistant - Google DeepMind / Gemini).
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenModal('attribution')}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 font-bold text-xs shadow-2xs hover:border-amber-300 transition-all cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5 text-amber-600" />
            <span>بيان الأمانة ونسبة العمل</span>
          </button>
        </div>

        {/* Legal and Instructions Links Grid */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 pt-2 border-t border-stone-100 font-semibold text-stone-600">
          <button
            type="button"
            onClick={() => onOpenModal('instructions')}
            className="hover:text-amber-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>دليل الاستخدام والتعليمات</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('privacy')}
            className="hover:text-amber-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>سياسة الخصوصية (Privacy Policy)</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('disclaimer')}
            className="hover:text-amber-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>إخلاء المسؤولية (Disclaimer)</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('terms')}
            className="hover:text-amber-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>شروط الاستخدام (Terms of Service)</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('cookies')}
            className="hover:text-amber-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <Cookie className="w-3.5 h-3.5 text-amber-700" />
            <span>ملفات تعريف الارتباط (Cookies)</span>
          </button>
        </div>

        {/* Bottom copyright & international compliance note */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-3xs text-stone-400 pt-2 border-t border-stone-100 text-center sm:text-right">
          <p>
            © {currentYear} التشفير العربي — تطبيق بحثي معرفي مجاني مفتوح النفع. متوافق مع معايير حماية البيانات الدولية (GDPR / CCPA).
          </p>
          <p className="inline-flex items-center gap-1">
            <span>تم تطويره بالذكاء الاصطناعي بروح الأمانة العلمية</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
