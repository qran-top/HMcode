import { KeyRound, Layers, Sparkles, BookOpen } from 'lucide-react';

interface HeaderProps {
  activeTab: 'encrypt' | 'table' | 'decrypt';
  setActiveTab: (tab: 'encrypt' | 'table' | 'decrypt') => void;
}

export function Header({ activeTab, setActiveTab }: HeaderProps) {
  return (
    <header className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center shadow-md font-bold text-xl border border-stone-700">
            <span className="font-['Amiri',serif]">٧</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 id="app-title" className="text-2xl font-bold text-stone-900 tracking-tight">
                المشفر السباعي
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                الأبجدية القديمة
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              تشفير قائم على 7 طبقات لكل منها حرفان يقابلان 4 أحرف عربية
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200">
          <button
            id="tab-encrypt"
            type="button"
            onClick={() => setActiveTab('encrypt')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'encrypt'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>التشفير والاحتمالات</span>
          </button>

          <button
            id="tab-table"
            type="button"
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'table'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>جدول الطبقات السبع</span>
          </button>

          <button
            id="tab-decrypt"
            type="button"
            onClick={() => setActiveTab('decrypt')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'decrypt'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <KeyRound className="w-4 h-4 text-indigo-600" />
            <span>فك التشفير</span>
          </button>
        </div>
      </div>
    </header>
  );
}
