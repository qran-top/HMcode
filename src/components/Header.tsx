import { KeyRound, Sparkles, BookOpen } from 'lucide-react';

interface HeaderProps {
  activeTab: 'encrypt' | 'table' | 'decrypt';
  setActiveTab: (tab: 'encrypt' | 'table' | 'decrypt') => void;
}

export function Header({ activeTab, setActiveTab }: HeaderProps) {
  return (
    <header className="border-b border-stone-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center font-bold text-lg border border-stone-800 shadow-xs">
            <span className="font-['Amiri',serif]">٧</span>
          </div>
          <h1 id="app-title" className="text-xl font-extrabold text-stone-900 tracking-tight">
            المشفر السباعي
          </h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200 self-start sm:self-auto">
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
      </div>
    </header>
  );
}
