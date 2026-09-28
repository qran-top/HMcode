import { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { MobileBottomNav, AppTabType } from './components/MobileBottomNav';
import { DualTranslator } from './components/DualTranslator';
import { NotebookDrawer } from './components/NotebookDrawer';
import { PWAPrompt } from './components/PWAPrompt';
import { QuranicChainMatcher } from './components/QuranicChainMatcher';
import { SettingsView } from './components/SettingsView';
import { InfoView } from './components/InfoView';
import { DosBottomBar } from './components/DosBottomBar';
import { DosKeyboardHelpModal } from './components/DosKeyboardHelpModal';
import { useDosKeyboardNavigation } from './hooks/useDosKeyboardNavigation';
import { useCipherLayers } from './context/CipherLayersContext';
import { useTheme } from './context/ThemeContext';

export function App() {
  const { analyzeText } = useCipherLayers();
  const { isDos, dosScanlines } = useTheme();

  // Default landing page is the comprehensive Gematria & Quranic Matcher ('gematria')
  const [activeTab, setActiveTab] = useState<AppTabType>('gematria');
  const [sharedText, setSharedText] = useState('');

  // Keyboard navigation & F1-F10 shortcuts
  const { isHelpOpen, setIsHelpOpen } = useDosKeyboardNavigation({
    activeTab,
    setActiveTab,
  });

  // Ensure title is consistent across views
  useEffect(() => {
    document.title = isDos
      ? 'C:\\MS-DOS\\CIPHER.EXE - نظام التشفير العربي'
      : 'البحث بالجمل والتشفير العربي';
  }, [activeTab, isDos]);

  return (
    <div
      className={`min-h-screen ${
        isDos
          ? 'bg-[#000080] text-white font-mono'
          : 'bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans'
      } flex flex-col antialiased selection:bg-amber-200 selection:text-stone-900 transition-colors duration-200 w-full max-w-full overflow-x-hidden`}
      dir="rtl"
    >
      {/* CRT Scanline Overlay when DOS CRT effect is enabled */}
      {isDos && dosScanlines && <div className="dos-crt-overlay" aria-hidden="true" />}

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

      {/* Main Container - bottom padding accommodates either DOS bottom bar or Mobile Nav */}
      <main
        className={`max-w-7xl w-full mx-auto px-2.5 sm:px-6 py-3 sm:py-5 flex-1 space-y-3 sm:space-y-4 overflow-x-hidden ${
          isDos ? 'pb-16 sm:pb-12' : 'pb-20 sm:pb-6'
        }`}
      >
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

      {/* DOS 90s Function Keys Ribbon (F1-F10) */}
      {isDos && (
        <DosBottomBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenHelp={() => setIsHelpOpen(true)}
        />
      )}

      {/* Mobile Bottom Navigation Bar (Hidden when in DOS mode since DosBottomBar takes its place) */}
      {!isDos && (
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Drawers & PWA Prompts */}
      <PWAPrompt />
      <NotebookDrawer />

      {/* DOS Keyboard & Help Dialog */}
      <DosKeyboardHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}

export default App;

