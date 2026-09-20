import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export interface SavedCipherSystem {
  id: string;
  name: string;
  notes: string;
  nooraniName?: string;
  arabicName?: string;
  includeWaw?: boolean;
  layers: any[];
  createdAt: number;
  updatedAt?: number;
  tags?: string[];
}

export interface NotebookEntry {
  id: string;
  word: string;
  cipher: string;
  systemName?: string;
  systemNumber?: number;
  type?: 'encryption' | 'decryption' | 'quranic' | 'dictionary' | 'manual';
  surahInfo?: string;
  ayahNum?: number;
  isReversed?: boolean;
  note?: string;
  timestamp: number;
}

export interface NotebookPage {
  id: string;
  title: string;
  entries: NotebookEntry[];
  createdAt: number;
  updatedAt: number;
  description?: string;
}

export interface AddEntryOptions {
  systemName?: string;
  systemNumber?: number;
  type?: 'encryption' | 'decryption' | 'quranic' | 'dictionary' | 'manual';
  surahInfo?: string;
  ayahNum?: number;
  isReversed?: boolean;
  note?: string;
}

interface NotebookContextType {
  // Active / current workspace entries
  entries: NotebookEntry[];
  isDrawerOpen: boolean;
  activeToast: string | null;
  addEntry: (word: string, cipher: string, options?: AddEntryOptions) => void;
  removeEntry: (id: string) => void;
  updateEntryNote: (id: string, note: string) => void;
  clearNotebook: () => void;
  isSaved: (word: string, cipher: string, isReversed?: boolean) => boolean;
  toggleDrawer: () => void;
  openDrawer: (tab?: 'systems' | 'entries' | 'pages') => void;
  closeDrawer: () => void;
  exportAsText: (entriesToExport?: NotebookEntry[], pageTitle?: string) => string;
  exportAsCSV: (entriesToExport?: NotebookEntry[]) => string;

  // Saved Cipher Systems (مفكرة الشيفرات والمنظومات المفضلة)
  savedSystems: SavedCipherSystem[];
  addSavedSystem: (system: Omit<SavedCipherSystem, 'id' | 'createdAt'>) => SavedCipherSystem;
  updateSavedSystem: (id: string, updates: Partial<Pick<SavedCipherSystem, 'name' | 'notes' | 'tags'>>) => void;
  removeSavedSystem: (id: string) => void;
  clearSavedSystems: () => void;
  isSystemSaved: (nameOrLabel: string) => boolean;
  drawerTab: 'systems' | 'entries' | 'pages';
  setDrawerTab: (tab: 'systems' | 'entries' | 'pages') => void;
  exportSavedSystemsAsText: () => string;

  // Pages / Groups management
  pages: NotebookPage[];
  activePageId: string | null; // null = working draft / current workspace
  saveCurrentAsNewPage: (title?: string) => string | null;
  loadPageIntoWorkspace: (pageId: string, replace?: boolean) => void;
  deletePage: (pageId: string) => void;
  renamePage: (pageId: string, newTitle: string) => void;
  exportPageAsText: (pageId: string) => string;
  exportPageAsCSV: (pageId: string) => string;
}

const STORAGE_KEY_ENTRIES = 'ARABIC_CIPHER_NOTEBOOK_ENTRIES_V2';
const STORAGE_KEY_PAGES = 'ARABIC_CIPHER_NOTEBOOK_PAGES_V2';
const STORAGE_KEY_SYSTEMS = 'ARABIC_CIPHER_NOTEBOOK_SAVED_SYSTEMS_V1';
const OLD_STORAGE_KEY = 'ARABIC_CIPHER_NOTEBOOK_ENTRIES_V1';

const NotebookContext = createContext<NotebookContextType | undefined>(undefined);

export function NotebookProvider({ children }: { children: ReactNode }) {
  // Current working entries
  const [entries, setEntries] = useState<NotebookEntry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_ENTRIES);
        if (saved) return JSON.parse(saved);
        // Fallback migration from V1
        const oldSaved = localStorage.getItem(OLD_STORAGE_KEY);
        if (oldSaved) return JSON.parse(oldSaved);
      } catch (e) {
        console.error('Failed to load notebook entries', e);
      }
    }
    return [];
  });

  // Saved notebook pages / groups
  const [pages, setPages] = useState<NotebookPage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedPages = localStorage.getItem(STORAGE_KEY_PAGES);
        if (savedPages) return JSON.parse(savedPages);
      } catch (e) {
        console.error('Failed to load notebook pages', e);
      }
    }
    return [];
  });

  // Saved cipher systems (مفكرة الشيفرات والمنظومات المفضلة)
  const [savedSystems, setSavedSystems] = useState<SavedCipherSystem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedSys = localStorage.getItem(STORAGE_KEY_SYSTEMS);
        if (savedSys) return JSON.parse(savedSys);
      } catch (e) {
        console.error('Failed to load saved cipher systems', e);
      }
    }
    return [];
  });

  const [drawerTab, setDrawerTab] = useState<'systems' | 'entries' | 'pages'>('systems');
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<string | null>(null);

  // Sync entries to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
    } catch (e) {
      console.error('Failed to save notebook entries', e);
    }
  }, [entries]);

  // Sync pages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(pages));
    } catch (e) {
      console.error('Failed to save notebook pages', e);
    }
  }, [pages]);

  // Sync saved systems to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SYSTEMS, JSON.stringify(savedSystems));
    } catch (e) {
      console.error('Failed to save notebook cipher systems', e);
    }
  }, [savedSystems]);

  const showToast = useCallback((message: string) => {
    setActiveToast(message);
    setTimeout(() => {
      setActiveToast((current) => (current === message ? null : current));
    }, 2500);
  }, []);

  const isSaved = useCallback(
    (word: string, cipher: string, isReversed?: boolean) => {
      const cleanW = (word || '').trim();
      const cleanC = (cipher || '').trim();
      return entries.some(
        (e) =>
          e.word === cleanW &&
          e.cipher === cleanC &&
          (isReversed === undefined || !!e.isReversed === !!isReversed)
      );
    },
    [entries]
  );

  const addEntry = useCallback(
    (word: string, cipher: string, options?: AddEntryOptions) => {
      const cleanW = (word || '').trim();
      const cleanC = (cipher || '').trim();
      if (!cleanW && !cleanC) return;

      const isRev = !!options?.isReversed;

      setEntries((prev) => {
        // Check if exact same word & cipher & reversed flag exists
        const exists = prev.some(
          (e) => e.word === cleanW && e.cipher === cleanC && !!e.isReversed === isRev
        );
        if (exists) {
          showToast(`الكلمة (${cleanW})${isRev ? ' [معكوسة]' : ''} موجودة مسبقاً في الدفتر 📓`);
          return prev;
        }

        const newEntry: NotebookEntry = {
          id: `nb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          word: cleanW || '—',
          cipher: cleanC || '—',
          systemName: options?.systemName,
          systemNumber: options?.systemNumber,
          type: options?.type || 'manual',
          surahInfo: options?.surahInfo,
          ayahNum: options?.ayahNum,
          isReversed: isRev,
          note: options?.note || '',
          timestamp: Date.now(),
        };

        const revNotice = isRev ? ' [معكوسة]' : '';
        showToast(`تمت إضافة (${cleanW})${revNotice} إلى الدفتر بنجاح ✨`);
        return [newEntry, ...prev];
      });
    },
    [showToast]
  );

  const removeEntry = useCallback(
    (id: string) => {
      setEntries((prev) => {
        const item = prev.find((e) => e.id === id);
        if (item) {
          showToast(`تم حذف (${item.word}) من الدفتر`);
        }
        return prev.filter((e) => e.id !== id);
      });
    },
    [showToast]
  );

  const updateEntryNote = useCallback((id: string, note: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, note } : e))
    );
  }, []);

  const clearNotebook = useCallback(() => {
    setEntries([]);
    showToast('تم إفراغ الدفتر بالكامل 🗑️');
  }, [showToast]);

  const toggleDrawer = useCallback(() => setIsDrawerOpen((prev) => !prev), []);
  const openDrawer = useCallback((tab?: 'systems' | 'entries' | 'pages') => {
    if (tab) {
      setDrawerTab(tab);
    }
    setIsDrawerOpen(true);
  }, []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  // Saved Cipher Systems Handlers
  const addSavedSystem = useCallback(
    (system: Omit<SavedCipherSystem, 'id' | 'createdAt'>): SavedCipherSystem => {
      const newSystem: SavedCipherSystem = {
        ...system,
        id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setSavedSystems((prev) => [newSystem, ...prev]);
      showToast(`تم حفظ منظومة "${newSystem.name}" في مفكرة الشيفرات بنجاح! 📓✨`);
      return newSystem;
    },
    [showToast]
  );

  const updateSavedSystem = useCallback(
    (id: string, updates: Partial<Pick<SavedCipherSystem, 'name' | 'notes' | 'tags'>>) => {
      setSavedSystems((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s))
      );
      showToast('تم تحديث بيانات المنظومة في المفكرة 💾');
    },
    [showToast]
  );

  const removeSavedSystem = useCallback(
    (id: string) => {
      setSavedSystems((prev) => {
        const item = prev.find((s) => s.id === id);
        if (item) {
          showToast(`تم حذف منظومة "${item.name}" من المفكرة 🗑️`);
        }
        return prev.filter((s) => s.id !== id);
      });
    },
    [showToast]
  );

  const clearSavedSystems = useCallback(() => {
    setSavedSystems([]);
    showToast('تم إفراغ مفكرة منظومات الشيفرة 🗑️');
  }, [showToast]);

  const isSystemSaved = useCallback(
    (nameOrLabel: string) => {
      const clean = (nameOrLabel || '').trim();
      return savedSystems.some((s) => s.name === clean || s.id === clean);
    },
    [savedSystems]
  );

  const exportSavedSystemsAsText = useCallback(() => {
    if (savedSystems.length === 0) return 'مفكرة الشيفرات: فارغة';
    let output = `═════════════════════════════════════════════════════════\n`;
    output += `       مفكرة المنظومات والشيفرات المختارة - التشفير العربي\n`;
    output += `       تاريخ التصدير: ${new Date().toLocaleString('ar-EG')}\n`;
    output += `       إجمالي المنظومات المحفوظة: ${savedSystems.length}\n`;
    output += `═════════════════════════════════════════════════════════\n\n`;

    savedSystems.forEach((sys, idx) => {
      output += `${idx + 1}. المنظومة: ${sys.name}\n`;
      if (sys.nooraniName) output += `   ✨ السماء: ${sys.nooraniName}\n`;
      if (sys.arabicName) output += `   🌍 الأرض: ${sys.arabicName}\n`;
      if (sys.includeWaw) output += `   ✨ اعتبار حرف (و) مع الأحرف السماوية\n`;
      if (sys.tags && sys.tags.length > 0) output += `   🏷️ التصنيفات: ${sys.tags.join('، ')}\n`;
      if (sys.notes) output += `   📝 ملاحظات وتجارب: ${sys.notes}\n`;
      output += `   📅 تاريخ الحفظ: ${new Date(sys.createdAt).toLocaleDateString('ar-EG')}\n`;
      output += `─────────────────────────────────────────────────────────\n`;
    });

    return output;
  }, [savedSystems]);

  // Save current entries as a new archived page / group, and clear the current workspace
  const saveCurrentAsNewPage = useCallback(
    (customTitle?: string): string | null => {
      if (entries.length === 0) {
        showToast('الدفتر فارغ حالياً! أضف كلمات أولاً لتتمكن من حفظها في صفحة ⚠️');
        return null;
      }

      const now = Date.now();
      const pageNumber = pages.length + 1;
      const title =
        customTitle?.trim() ||
        `مجموعة مفككة #${pageNumber} (${entries[0]?.cipher || entries[0]?.word || 'مجموعة'}) - ${new Date(now).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;

      const newPage: NotebookPage = {
        id: `page_${now}_${Math.random().toString(36).substring(2, 7)}`,
        title,
        entries: [...entries],
        createdAt: now,
        updatedAt: now,
      };

      setPages((prev) => [newPage, ...prev]);
      setEntries([]); // Leave the working notebook empty for the next group
      showToast(`تم حفظ "${title}" في صفحة منفصلة، وأصبح الدفتر جاهزاً للمجموعة التالية! 📑✨`);
      return newPage.id;
    },
    [entries, pages.length, showToast]
  );

  const loadPageIntoWorkspace = useCallback(
    (pageId: string, replace: boolean = true) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;

      if (replace) {
        setEntries([...page.entries]);
        setActivePageId(pageId);
        showToast(`تم فتح وتفعيل صفحة: "${page.title}" (${page.entries.length} سجل) 📖`);
      } else {
        // Merge into current
        setEntries((prev) => {
          const merged = [...page.entries];
          prev.forEach((existing) => {
            if (!merged.some((m) => m.word === existing.word && m.cipher === existing.cipher)) {
              merged.push(existing);
            }
          });
          return merged;
        });
        showToast(`تم دمج محتويات صفحة "${page.title}" مع الدفتر الحالي`);
      }
    },
    [pages, showToast]
  );

  const deletePage = useCallback(
    (pageId: string) => {
      setPages((prev) => {
        const page = prev.find((p) => p.id === pageId);
        if (page) {
          showToast(`تم حذف صفحة "${page.title}" 🗑️`);
        }
        return prev.filter((p) => p.id !== pageId);
      });
      if (activePageId === pageId) {
        setActivePageId(null);
      }
    },
    [activePageId, showToast]
  );

  const renamePage = useCallback(
    (pageId: string, newTitle: string) => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;
      setPages((prev) =>
        prev.map((p) => (p.id === pageId ? { ...p, title: trimmed, updatedAt: Date.now() } : p))
      );
      showToast('تم تعديل عنوان الصفحة بنجاح');
    },
    [showToast]
  );

  const exportAsText = useCallback(
    (entriesToExport?: NotebookEntry[], pageTitle?: string) => {
      const list = entriesToExport || entries;
      if (list.length === 0) return 'دفتر التشفير العربي: فارغ';
      let output = `═════════════════════════════════════════════════════════\n`;
      output += `       دفتر الكلمات والشيفرات - التشفير العربي\n`;
      if (pageTitle) {
        output += `       الصفحة / المجموعة: ${pageTitle}\n`;
      }
      output += `       تاريخ التصدير: ${new Date().toLocaleString('ar-EG')}\n`;
      output += `       إجمالي السجلات: ${list.length}\n`;
      output += `═════════════════════════════════════════════════════════\n\n`;

      list.forEach((item, idx) => {
        const revFlag = item.isReversed ? ' [معكوسة]' : '';
        output += `${idx + 1}. الكلمة: ${item.word}${revFlag} ➔ الشيفرة: ${item.cipher}\n`;
        if (item.systemName || item.systemNumber) {
          output += `   المنظومة: ${item.systemNumber ? `#${item.systemNumber} ` : ''}${item.systemName || ''}\n`;
        }
        if (item.surahInfo) {
          output += `   التوثيق القرآني: ${item.surahInfo} ${item.ayahNum ? `[آية ${item.ayahNum}]` : ''}\n`;
        }
        if (item.type) {
          const typeLabels: Record<string, string> = {
            quranic: 'مفردة قرآنية',
            dictionary: 'معجم لغوي',
            encryption: 'تشفير',
            decryption: 'فك تشفير',
            manual: 'إدخال يدوي',
          };
          output += `   النوع: ${typeLabels[item.type] || item.type}\n`;
        }
        if (item.note) {
          output += `   ملاحظة: ${item.note}\n`;
        }
        output += `─────────────────────────────────────────────────────────\n`;
      });

      return output;
    },
    [entries]
  );

  const exportAsCSV = useCallback(
    (entriesToExport?: NotebookEntry[]) => {
      const list = entriesToExport || entries;
      const headers = ['الرقم', 'الكلمة', 'معكوسة', 'الشيفرة', 'النوع', 'المنظومة', 'التوثيق القرآني', 'الملاحظات', 'التاريخ'];
      const rows = list.map((item, idx) => [
        idx + 1,
        `"${item.word.replace(/"/g, '""')}"`,
        item.isReversed ? '"نعم"' : '"لا"',
        `"${item.cipher.replace(/"/g, '""')}"`,
        `"${(item.type || '').replace(/"/g, '""')}"`,
        `"${(item.systemName || '').replace(/"/g, '""')}"`,
        `"${(item.surahInfo || '').replace(/"/g, '""')}"`,
        `"${(item.note || '').replace(/"/g, '""')}"`,
        `"${new Date(item.timestamp).toLocaleDateString('ar-EG')}"`,
      ]);

      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    },
    [entries]
  );

  const exportPageAsText = useCallback(
    (pageId: string) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return 'الصفحة غير موجودة';
      return exportAsText(page.entries, page.title);
    },
    [pages, exportAsText]
  );

  const exportPageAsCSV = useCallback(
    (pageId: string) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return '';
      return exportAsCSV(page.entries);
    },
    [pages, exportAsCSV]
  );

  return (
    <NotebookContext.Provider
      value={{
        entries,
        isDrawerOpen,
        activeToast,
        addEntry,
        removeEntry,
        updateEntryNote,
        clearNotebook,
        isSaved,
        toggleDrawer,
        openDrawer,
        closeDrawer,
        exportAsText,
        exportAsCSV,
        savedSystems,
        addSavedSystem,
        updateSavedSystem,
        removeSavedSystem,
        clearSavedSystems,
        isSystemSaved,
        drawerTab,
        setDrawerTab,
        exportSavedSystemsAsText,
        pages,
        activePageId,
        saveCurrentAsNewPage,
        loadPageIntoWorkspace,
        deletePage,
        renamePage,
        exportPageAsText,
        exportPageAsCSV,
      }}
    >
      {children}
    </NotebookContext.Provider>
  );
}

export function useNotebook(): NotebookContextType {
  const context = useContext(NotebookContext);
  if (!context) {
    throw new Error('useNotebook must be used within a NotebookProvider');
  }
  return context;
}
