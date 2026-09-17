import { KeyRound, Sparkles, BookOpen, HelpCircle } from 'lucide-react';

interface HeaderProps {
  activeTab: 'encrypt' | 'table' | 'decrypt';
  setActiveTab: (tab: 'encrypt' | 'table' | 'decrypt') => void;
  onOpenInstructions?: () => void;
}

export function Header({ activeTab, setActiveTab, onOpenInstructions }: HeaderProps) {
  return (
    <header className="border-b border-stone-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center font-bold text-lg border border-stone-800 shadow-xs">
              <span className="font-['Amiri',serif]">ع</span>
            </div>
            <div>
              <h1 id="app-title" className="text-xl font-extrabold text-stone-900 tracking-tight">
                التشفير العربي
              </h1>
            </div>
          </div>

          {onOpenInstructions && (
            <button
              type="button"
              onClick={onOpenInstructions}
              className="sm:hidden p-1.5 rounded-lg text-stone-500 hover:text-amber-800 hover:bg-stone-100 transition-colors"
              title="التعليمات ودليل الاستخدام"
            >
              <HelpCircle className="w-5 h-5 text-amber-600" />
            </button>
          )}
        </div>

        {/* Navigation Tabs and Quick Help */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200">
            <button
              id="tab-encrypt"
              type="button"
              onClick={() => setActiveTab('encrypt')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'encrypt'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>التشفير</span>
            </button>

            <button
              id="tab-decrypt"
              type="button"
              onClick={() => setActiveTab('decrypt')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'decrypt'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <span>فك التشفير</span>
            </button>

            <button
              id="tab-table"
              type="button"
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>جدول الطبقات</span>
            </button>
          </div>

          {onOpenInstructions && (
            <button
              type="button"
              onClick={onOpenInstructions}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold text-stone-600 hover:text-amber-900 hover:bg-amber-50 border border-stone-200 transition-all cursor-pointer"
              title="عرض دليل وتعليمات الاستخدام"
            >
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span>دليل الاستخدام</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
