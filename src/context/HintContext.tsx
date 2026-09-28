import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface HintContextType {
  isHintEnabled: boolean;
  setIsHintEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  toggleHint: () => void;
  hintText: string;
  setHintText: (text: string) => void;
  clearHint: () => void;
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

  const [hintText, setHintTextState] = useState<string>('');

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
    setHintTextState(text);
  };

  const clearHint = () => {
    setHintTextState('');
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
