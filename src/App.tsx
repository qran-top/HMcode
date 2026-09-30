import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AppTabType } from './components/MobileBottomNav';
import { DualTranslator } from './components/DualTranslator';
import { NotebookDrawer } from './components/NotebookDrawer';
import { PWAPrompt } from './components/PWAPrompt';
import { QuranicChainMatcher } from './components/QuranicChainMatcher';
import { FawatihScaleView } from './components/FawatihScaleView';
import { SettingsView } from './components/SettingsView';
import { InfoView } from './components/InfoView';
import { DosKeyboardHelpModal } from './components/DosKeyboardHelpModal';
import { DosBottomHintBar } from './components/DosBottomHintBar';
import { useDosKeyboardNavigation } from './hooks/useDosKeyboardNavigation';
import { useTheme } from './context/ThemeContext';

export function App() {
  const { dosScanlines } = useTheme();

  // Default landing page is the comprehensive Gematria & Quranic Matcher ('gematria')
  const [activeTab, setActiveTab] = useState<AppTabType>('gematria');
  const [sharedText, setSharedText] = useState('');

  // Keyboard navigation & F1-F10 shortcuts
  const { isHelpOpen, setIsHelpOpen } = useDosKeyboardNavigation({
    activeTab,
    setActiveTab,
  });

  // Ensure title is consistent
  useEffect(() => {
    document.title = 'C:\\QURAN\\CIPHER.EXE - نظام التشفير والجُمّل العربي';
  }, [activeTab]);

  const [isWideMode, setIsWideMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('app-wide-mode');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  const toggleWideMode = () => {
    setIsWideMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('app-wide-mode', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div
      style={{ backgroundColor: 'var(--dos-bg)', color: 'var(--dos-text)' }}
      className="min-h-screen flex flex-col antialiased selection:bg-[#ffff55] selection:text-black w-full max-w-full overflow-x-hidden transition-none"
      dir="rtl"
    >
      {/* CRT Scanline Overlay when DOS CRT effect is enabled */}
      {dosScanlines && <div className="dos-crt-overlay" aria-hidden="true" />}

      {/* Full DOS Command Header with integrated top hint bar and controls */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenInstructions={() => setActiveTab('info')}
        onGoHome={() => {
          setActiveTab('gematria');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isWideMode={isWideMode}
        toggleWideMode={toggleWideMode}
      />

      {/* Main Terminal Container: Generous pb-36 sm:pb-44 so bottom sticky hint bar never covers the last result */}
      <main className={`${isWideMode ? 'max-w-full px-1.5 sm:px-3' : 'max-w-7xl mx-auto px-2 sm:px-4'} w-full py-2.5 sm:py-3.5 flex-1 space-y-3 pb-36 sm:pb-44 overflow-x-hidden transition-all duration-150`}>
        {/* Tab 1: Comprehensive Gematria Engine & Quranic Chain Matcher (F1) */}
        <div className={activeTab === 'gematria' ? 'block' : 'hidden'}>
          <QuranicChainMatcher initialQuery={sharedText} isWideMode={isWideMode} toggleWideMode={toggleWideMode} />
        </div>

        {/* Tab 2: Fawatih Scale & 29-Surah Fingerprint Distribution (F2) */}
        <div className={activeTab === 'fawatih_scale' ? 'block' : 'hidden'}>
          <FawatihScaleView
            initialQuery={sharedText || 'كتاب'}
            onNavigateToGematria={(text) => {
              setSharedText(text);
              setActiveTab('gematria');
            }}
          />
        </div>

        {/* Tab 3: Unified Command Search & Dual Translator / Cipher Hub (F3) */}
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

        {/* Tab 3: Settings & Tables Management View (F3) */}
        <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
          <SettingsView />
        </div>

        {/* Tab 4: Info & Documentation View (F4) */}
        <div className={activeTab === 'info' ? 'block' : 'hidden'}>
          <InfoView onBack={() => setActiveTab('gematria')} />
        </div>
      </main>

      {/* Drawers & Modals */}
      <PWAPrompt />
      <NotebookDrawer />

      {/* Persistent Bottom DOS Hint Bar: Always visible on bottom wherever page scrolls without overlapping results */}
      <DosBottomHintBar />

      {/* DOS Keyboard & Help Dialog */}
      <DosKeyboardHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}

export default App;
