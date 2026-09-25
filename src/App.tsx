import { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { MobileBottomNav, AppTabType } from './components/MobileBottomNav';
import { LayersTable } from './components/LayersTable';
import { DualTranslator } from './components/DualTranslator';
import { NotebookDrawer } from './components/NotebookDrawer';
import { PWAPrompt } from './components/PWAPrompt';
import { GematriaView } from './components/GematriaView';
import { QuranicChainMatcher } from './components/QuranicChainMatcher';
import { InfoView } from './components/InfoView';
import { useCipherLayers } from './context/CipherLayersContext';

export function App() {
  const { analyzeText } = useCipherLayers();
  const [activeTab, setActiveTab] = useState<AppTabType>('search');
  const [sharedText, setSharedText] = useState('');

  // Ensure title is consistent across views
  useEffect(() => {
    document.title = 'التشفير العربي';
  }, [activeTab]);

  // List of active layer numbers in current text for highlighting in table
  const activeLayersInText = useMemo(() => {
    if (!sharedText) return [];
    const details = analyzeText(sharedText);
    const layers = new Set<number>();
    details.forEach((d) => {
      if (d.layer) {
        layers.add(d.layer.layer);
      }
    });
    return Array.from(layers);
  }, [sharedText, analyzeText]);

  return (
    <div
      className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans antialiased selection:bg-amber-200 selection:text-stone-900 transition-colors duration-200 w-full max-w-full overflow-x-hidden"
      dir="rtl"
    >
      {/* Compact Header for Desktop and Mobile with exclamation icon for Info & Policies */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenInstructions={() => setActiveTab('info')}
        onGoHome={() => {
          setActiveTab('search');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Container - pb-20 on mobile leaves room for fixed bottom nav bar */}
      <main className="max-w-7xl w-full mx-auto px-2.5 sm:px-6 py-3 sm:py-5 flex-1 space-y-3 sm:space-y-4 overflow-x-hidden pb-20 sm:pb-6">
        
        {/* Tab 1: Primary Unified Search Hub (مربع بحث واحد يستخرج التشفير والفك والجُمَّل والمطابقة القرآنية في بطاقات منفصلة) */}
        <div className={activeTab === 'search' ? 'block' : 'hidden'}>
          <DualTranslator
            mode="both"
            inputText={sharedText}
            onInputTextChange={setSharedText}
            onNavigateToEncrypt={(text) => {
              setSharedText(text);
              setActiveTab('search');
            }}
            onNavigateToDecrypt={(text) => {
              setSharedText(text);
              setActiveTab('search');
            }}
            onNavigateToGematria={(text) => {
              setSharedText(text);
              setActiveTab('gematria');
            }}
          />
        </div>

        {/* Tab 2: Matcher View (مطابق السلاسل والقرآن الكريم) */}
        <div className={activeTab === 'matcher' ? 'block' : 'hidden'}>
          <QuranicChainMatcher />
        </div>

        {/* Tab 3: Advanced Gematria Engine (محرك الجُمَّل الموسع والحاسبة) */}
        <div className={activeTab === 'gematria' ? 'block' : 'hidden'}>
          <GematriaView
            initialText={sharedText}
            onNavigateToDual={(text) => {
              setSharedText(text);
              setActiveTab('search');
            }}
          />
        </div>

        {/* Tab 4: Table View (جدول الطبقات السبع والمنظومات المتناظرة) */}
        <div className={activeTab === 'table' ? 'block' : 'hidden'}>
          <LayersTable
            highlightedLayerNumbers={activeLayersInText}
            onSelectLetter={(char) => {
              setSharedText((prev) => prev + char);
            }}
          />
        </div>

        {/* Tab 5: Info & Legal View (صفحة منفصلة بالكامل للمعلومات والسياسات بدون أي نوافذ منبثقة وبدون فوتر) */}
        <div className={activeTab === 'info' ? 'block' : 'hidden'}>
          <InfoView onBack={() => setActiveTab('search')} />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (sm:hidden, fixed bottom-0) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Drawers & PWA Prompts */}
      <PWAPrompt />
      <NotebookDrawer />
    </div>
  );
}

export default App;
