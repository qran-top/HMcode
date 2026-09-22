import React from 'react';
import {
  HelpCircle,
  Shield,
  AlertTriangle,
  FileText,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-3.5">
        
        {/* Branding & External Links */}
        <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-start">
          <div className="flex items-center gap-1.5 font-black text-stone-900 dark:text-stone-100">
            <div className="w-5 h-5 rounded-md bg-stone-900 dark:bg-stone-800 text-amber-400 flex items-center justify-center font-bold text-xs">
              <span className="font-['Amiri',serif]">ع</span>
            </div>
            <span>التشفير</span>
          </div>

          <span className="text-stone-300 dark:text-stone-700">|</span>

          {/* Google AI Studio & Github Links */}
          <div className="flex items-center gap-1">
            <a
              id="footer-link-google"
              href="https://hmcode7.ai.studio/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-md bg-amber-50 hover:bg-amber-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-amber-300/80 dark:border-stone-700 shadow-2xs transition-all hover:scale-105 cursor-pointer flex items-center justify-center"
              title="منصة Google (AI Studio)"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
            </a>

            <a
              id="footer-link-github"
              href="https://qran-top.github.io/HMcode/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 shadow-2xs transition-all hover:scale-105 cursor-pointer flex items-center justify-center"
              title="منصة GitHub"
            >
              <svg className="w-3.5 h-3.5 shrink-0 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            </a>
          </div>

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

        {/* Legal & Instructions Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 font-medium text-xs">
          <button
            type="button"
            onClick={() => onOpenModal('instructions')}
            className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors inline-flex items-center gap-1 cursor-pointer font-bold text-stone-700 dark:text-stone-300"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>دليل الاستخدام</span>
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
          © {currentYear} التشفير
        </div>

      </div>
    </footer>
  );
}
