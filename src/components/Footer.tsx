import React from 'react';
import {
  HelpCircle,
  Shield,
  AlertTriangle,
  FileText,
  Cookie,
  Bot,
} from 'lucide-react';

export type PolicyModalType = 'instructions' | 'privacy' | 'disclaimer' | 'terms' | 'cookies' | 'attribution' | null;

interface FooterProps {
  onOpenModal: (type: PolicyModalType) => void;
}

export function Footer({ onOpenModal }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-8 border-t border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-stone-900/80 backdrop-blur-xs text-stone-500 dark:text-stone-400 text-xs py-4 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Branding & Attribution */}
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-stone-900 dark:text-stone-100">التشفير العربي</span>
          <span className="text-stone-300 dark:text-stone-700">|</span>
          <button
            type="button"
            onClick={() => onOpenModal('attribution')}
            className="hover:text-stone-800 dark:hover:text-stone-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>بيان التطوير</span>
          </button>
        </div>

        {/* Legal Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-medium">
          <button
            type="button"
            onClick={() => onOpenModal('instructions')}
            className="hover:text-stone-800 dark:hover:text-stone-200 transition-colors cursor-pointer"
          >
            التعليمات
          </button>
          <button
            type="button"
            onClick={() => onOpenModal('privacy')}
            className="hover:text-stone-800 dark:hover:text-stone-200 transition-colors cursor-pointer"
          >
            الخصوصية
          </button>
          <button
            type="button"
            onClick={() => onOpenModal('disclaimer')}
            className="hover:text-stone-800 dark:hover:text-stone-200 transition-colors cursor-pointer"
          >
            إخلاء مسؤولية
          </button>
          <button
            type="button"
            onClick={() => onOpenModal('terms')}
            className="hover:text-stone-800 dark:hover:text-stone-200 transition-colors cursor-pointer"
          >
            شروط الاستخدام
          </button>
        </div>

        {/* Copyright */}
        <div className="text-3xs text-stone-400 dark:text-stone-500 text-center md:text-left">
          © {currentYear} التشفير العربي
        </div>

      </div>
    </footer>
  );
}
