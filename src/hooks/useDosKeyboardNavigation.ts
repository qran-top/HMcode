import { useEffect, useState, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useNotebook } from '../context/NotebookContext';
import { useFontSize } from '../context/FontSizeContext';
import { useHint } from '../context/HintContext';
import { AppTabType } from '../components/MobileBottomNav';

interface DosKeyboardOptions {
  activeTab: AppTabType;
  setActiveTab: (tab: AppTabType) => void;
  onRefresh?: () => void;
}

export function useDosKeyboardNavigation({
  activeTab,
  setActiveTab,
  onRefresh,
}: DosKeyboardOptions) {
  const { isDos, cycleTheme, cycleDosPalette, playDosBeep, dosSound } = useTheme();
  const { openDrawer } = useNotebook();
  const { cycleFontFamily, fontFamilyInfo } = useFontSize();
  const { setHintText } = useHint();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [lastKeyPressed, setLastKeyPressed] = useState<string | null>(null);

  // Quick focus search input helper
  const focusSearchInput = useCallback(() => {
    // Find first text input or textarea
    const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input[type="text"], input[type="search"], textarea, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'
    );
    for (let i = 0; i < inputs.length; i++) {
      const el = inputs[i];
      if (el && !el.disabled && el.offsetParent !== null) {
        el.focus();
        el.select();
        playDosBeep(1200, 25);
        return;
      }
    }
  }, [playDosBeep]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting regular typing inside text fields for normal letters,
      // but Function keys (F1-F12), Escape, and Alt combos should always work!
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          (target as HTMLElement).isContentEditable);

      // Play soft keystroke sound if in DOS mode and sound enabled (only for non-repeating keypresses)
      if (isDos && dosSound && !e.repeat && !e.ctrlKey && !e.metaKey) {
        // Different pitches for special keys
        if (e.key === 'Enter') {
          playDosBeep(650, 30);
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
          playDosBeep(440, 20);
        } else if (e.key === 'Tab') {
          playDosBeep(880, 20);
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          playDosBeep(720, 15);
        }
      }

      // 1. F1: Help / Keyboard guide modal
      if (e.key === 'F1') {
        e.preventDefault();
        playDosBeep(800, 40);
        setIsHelpOpen((prev) => !prev);
        setLastKeyPressed('F1: المساعدة');
        return;
      }

      // 2. F2: Save action
      if (e.key === 'F2') {
        e.preventDefault();
        playDosBeep(980, 45);
        // Find and click any primary save button or notebook action
        const saveBtn = document.querySelector<HTMLButtonElement>(
          '#btn-save-analysis, [data-action="save"], button:has(.lucide-bookmark), button:has(.lucide-save)'
        );
        if (saveBtn) {
          saveBtn.click();
        } else {
          openDrawer('entries');
        }
        setLastKeyPressed('F2: حفظ');
        return;
      }

      // 3. F3: Switch to Gematria Tab (البحث بالجمل)
      if (e.key === 'F3') {
        e.preventDefault();
        playDosBeep(750, 35);
        setActiveTab('gematria');
        setLastKeyPressed('F3: الجُمّل');
        return;
      }

      // 4. F4: Switch to Search / Command Tab (البحث بالأوامر)
      if (e.key === 'F4' && !e.altKey) {
        e.preventDefault();
        playDosBeep(780, 35);
        setActiveTab('search');
        setLastKeyPressed('F4: الأوامر');
        return;
      }

      // 5. F5: Refresh calculation (prevent full browser reload when in DOS mode, perform in-app calculation refresh)
      if (e.key === 'F5') {
        if (isDos) {
          e.preventDefault();
          playDosBeep(1100, 50);
          if (onRefresh) onRefresh();
          setLastKeyPressed('F5: تحديث الحساب');
          return;
        }
      }

      // 6. F6: Open Notebook drawer
      if (e.key === 'F6') {
        e.preventDefault();
        playDosBeep(850, 40);
        openDrawer('entries');
        setLastKeyPressed('F6: المفكرة');
        return;
      }

      // 7. F7: Cycle Arabic Font Family (Alyamama -> Markazi -> Handjet)
      if (e.key === 'F7') {
        e.preventDefault();
        playDosBeep(780, 35);
        cycleFontFamily();
        setLastKeyPressed(`F7: تبديل الخط [${fontFamilyInfo.name}]`);
        setHintText(`[تبديل نوع الخط F7]: تم التبديل إلى «${fontFamilyInfo.name}» (${fontFamilyInfo.description})`);
        return;
      }

      // 8. F8: Cycle DOS Color Palette
      if (e.key === 'F8') {
        e.preventDefault();
        playDosBeep(900, 40);
        cycleDosPalette();
        setLastKeyPressed('F8: تبديل اللون');
        return;
      }

      // 9. F9: Cycle Theme (Light -> Dark -> DOS)
      if (e.key === 'F9') {
        e.preventDefault();
        playDosBeep(1050, 50);
        cycleTheme();
        setLastKeyPressed('F9: تبديل الثيم');
        return;
      }

      // 10. Escape / F10: Close Help modal, drawers, or return to home tab
      if (e.key === 'Escape' || e.key === 'F10') {
        if (isHelpOpen) {
          e.preventDefault();
          playDosBeep(450, 30);
          setIsHelpOpen(false);
          return;
        }
        if (isInputFocused) {
          // Blur the input
          target?.blur();
          return;
        }
        if (activeTab !== 'gematria') {
          e.preventDefault();
          playDosBeep(520, 30);
          setActiveTab('gematria');
          return;
        }
      }

      // Alt+1 .. Alt+4 for direct tab navigation
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        if (e.key === '1') {
          e.preventDefault();
          playDosBeep(700, 30);
          setActiveTab('gematria');
        } else if (e.key === '2') {
          e.preventDefault();
          playDosBeep(750, 30);
          setActiveTab('search');
        } else if (e.key === '3') {
          e.preventDefault();
          playDosBeep(800, 30);
          setActiveTab('settings');
        } else if (e.key === '4') {
          e.preventDefault();
          playDosBeep(850, 30);
          setActiveTab('info');
        } else if (e.key.toLowerCase() === 't') {
          // Alt+T theme toggle
          e.preventDefault();
          playDosBeep(1000, 40);
          cycleTheme();
        } else if (e.key.toLowerCase() === 'h') {
          // Alt+H help
          e.preventDefault();
          setIsHelpOpen((p) => !p);
        }
      }

      // Ctrl+K or forward slash '/' when not focused on input: jump to search input
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && !isInputFocused)) {
        e.preventDefault();
        focusSearchInput();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isDos,
    dosSound,
    isHelpOpen,
    activeTab,
    setActiveTab,
    cycleTheme,
    cycleDosPalette,
    cycleFontFamily,
    fontFamilyInfo,
    setHintText,
    openDrawer,
    playDosBeep,
    focusSearchInput,
    onRefresh,
  ]);

  return {
    isHelpOpen,
    setIsHelpOpen,
    lastKeyPressed,
    focusSearchInput,
  };
}
