import { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { MobileBottomNav, AppTabType } from './components/MobileBottomNav';
import { DualTranslator } from './components/DualTranslator';
import { NotebookDrawer } from './components/NotebookDrawer';
import { PWAPrompt } from './components/PWAPrompt';
import { QuranicChainMatcher } from './components/QuranicChainMatcher';
import { SettingsView } from './components/SettingsView';
import { InfoView } from './components/InfoView';
import { useCipherLayers } from './context/CipherLayersContext';

export function App() {
  const { analyzeText } = useCipherLayers();
  // Default landing page is the comprehensive Gematria & Quranic Matcher ('gematria')
  const [activeTab, setActiveTab] = useState<AppTabType>('gematria');
  const [sharedText, setSharedText] = useState('');

  // Ensure title is consistent across views
  useEffect(() => {
    document.title = 'محرك الجُمَّل والتشفير العربي';
  }, [activeTab]);

  return (
    <div
      className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans antialiased selection:bg-amber-200 selection:text-stone-900 transition-colors duration-200 w-full max-w-full overflow-x-hidden"
      dir="rtl"
    >
      {/* Compact Header for Desktop and Mobile */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenInstructions={() => setActiveTab('info')}
        onGoHome={() => {
          setActiveTab('gematria');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Container - pb-20 on mobile leaves room for fixed bottom nav bar */}
      <main className="max-w-7xl w-full mx-auto px-2.5 sm:px-6 py-3 sm:py-5 flex-1 space-y-3 sm:space-y-4 overflow-x-hidden pb-20 sm:pb-6">
        
        {/* Tab 1: Comprehensive Gematria Engine & Quranic Chain Matcher (الصفحة الافتراضية الرئيسية) */}
        <div className={activeTab === 'gematria' ? 'block' : 'hidden'}>
          <QuranicChainMatcher initialQuery={sharedText} />
        </div>

        {/* Tab 2: Unified Search & Cipher Hub (البحث الموحد والتشفير وفك التشفير) */}
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
            onNavigateToMatcher={(text) => {
              setSharedText(text);
              setActiveTab('gematria');
            }}
          />
        </div>

        {/* Tab 3: Settings & Tables Management View (صفحة عادية كاملة لإدارة وتعديل جداول السماوات والأرض والجمل) */}
        <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
          <SettingsView />
        </div>

        {/* Tab 4: Info & Legal View (صفحة منفصلة بالكامل للمعلومات والسياسات بدون أي نوافذ منبثقة وبدون فوتر) */}
        <div className={activeTab === 'info' ? 'block' : 'hidden'}>
          <InfoView onBack={() => setActiveTab('gematria')} />
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
