import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

interface HintContextType {
  isHintEnabled: boolean;
  setIsHintEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  toggleHint: () => void;
  hintText: string;
  setHintText: (text: string) => void;
  clearHint: () => void;
  currentQuery: string;
  setCurrentQuery: (q: string) => void;
}

const HintContext = createContext<HintContextType | undefined>(undefined);

const STORAGE_KEY_HINT_ENABLED = 'dos_hint_enabled';

export function HintProvider({ children }: { children: ReactNode }) {
  const [isHintEnabled, setIsHintEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HINT_ENABLED);
      return saved !== null ? saved === 'true' : true; // Default ON so hints are immediately useful
    } catch {
      return true;
    }
  });

  const [currentQuery, setCurrentQuery] = useState<string>(() => {
    try {
      return localStorage.getItem('app-last-query') || '';
    } catch {
      return '';
    }
  });

  const [hintText, setHintTextState] = useState<string>('');
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HINT_ENABLED, String(isHintEnabled));
    } catch {
      // Ignore storage errors
    }
  }, [isHintEnabled]);

  const toggleHint = () => {
    setIsHintEnabled((prev) => !prev);
  };

  const setHintText = (text: string) => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    if (text) {
      setHintTextState(text);
    }
  };

  // Keep the hint text on screen so the user has ample time to read it!
  // Instead of disappearing instantly when the mouse leaves the small button,
  // it remains visible until another element is hovered, or clears after a generous delay.
  const clearHint = () => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    clearTimerRef.current = setTimeout(() => {
      setHintTextState('');
    }, 12000); // 12 seconds persistence so the user can easily read the hint
  };

  const handleSetCurrentQuery = (q: string) => {
    setCurrentQuery(q);
    try {
      localStorage.setItem('app-last-query', q);
    } catch {
      // ignore
    }
  };

  return (
    <HintContext.Provider
      value={{
        isHintEnabled,
        setIsHintEnabled,
        toggleHint,
        hintText,
        setHintText,
        clearHint,
        currentQuery,
        setCurrentQuery: handleSetCurrentQuery,
      }}
    >
      {children}
    </HintContext.Provider>
  );
}

export function useHint() {
  const context = useContext(HintContext);
  if (!context) {
    throw new Error('useHint must be used within a HintProvider');
  }
  return context;
}
