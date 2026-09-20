import React, { useState, useMemo } from 'react';
import { useNotebook, SavedCipherSystem } from '../context/NotebookContext';
import { useCipherLayers } from '../context/CipherLayersContext';
import { SaveSystemModal } from './SaveSystemModal';
import {
  BookMarked,
  X,
  Trash2,
  Copy,
  Check,
  Download,
  FileText,
  Search,
  Plus,
  ArrowLeft,
  RotateCcw,
  ArrowUpDown,
  BookOpen,
  FolderPlus,
  Layers,
  Archive,
  Edit2,
  FolderOpen,
  Sparkles,
  CheckCircle2,
  Tag
} from 'lucide-react';

export function NotebookDrawer() {
  const {
    entries,
    isDrawerOpen,
    closeDrawer,
    removeEntry,
    clearNotebook,
    addEntry,
    exportAsText,
    exportAsCSV,
    pages,
    saveCurrentAsNewPage,
    loadPageIntoWorkspace,
    deletePage,
    renamePage,
    exportPageAsText,
    exportPageAsCSV,
    activeToast,
    savedSystems,
    removeSavedSystem,
    clearSavedSystems,
    drawerTab,
    setDrawerTab,
    exportSavedSystemsAsText,
  } = useNotebook();

  const { updateAllLayers, setActiveTableName } = useCipherLayers();

  // Search & Filter state for systems tab
  const [systemSearchQuery, setSystemSearchQuery] = useState('');
  const [appliedSystemId, setAppliedSystemId] = useState<string | null>(null);
  const [editingSystem, setEditingSystem] = useState<SavedCipherSystem | null>(null);
  const [systemToDeleteId, setSystemToDeleteId] = useState<string | null>(null);
  const [showClearSystemsConfirm, setShowClearSystemsConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'reversed' | 'quranic' | 'dictionary'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Reverse Order state (default: newest first / as added, togglable to reverse)
  const [isReversedOrder, setIsReversedOrder] = useState(false);

  // Quick manual add form state
  const [newWord, setNewWord] = useState('');
  const [newCipher, setNewCipher] = useState('');
  const [newIsReversed, setNewIsReversed] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Save as page modal / prompt state
  const [showSavePageModal, setShowSavePageModal] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');

  // Clear confirmation modal state
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Delete page confirmation modal state
  const [pageToDeleteId, setPageToDeleteId] = useState<string | null>(null);

  // Editing page title state
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingPageTitle, setEditingPageTitle] = useState('');

  // Selected saved page to preview
  const [selectedPreviewPageId, setSelectedPreviewPageId] = useState<string | null>(null);
  const [pagePreviewReversedOrder, setPagePreviewReversedOrder] = useState(false);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleDownloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() && !newCipher.trim()) return;
    addEntry(newWord.trim(), newCipher.trim(), {
      type: 'manual',
      isReversed: newIsReversed,
    });
    setNewWord('');
    setNewCipher('');
    setNewIsReversed(false);
    setShowQuickAdd(false);
  };

  const handleExecuteSavePage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageId = saveCurrentAsNewPage(newPageTitle);
    if (pageId) {
      setNewPageTitle('');
      setShowSavePageModal(false);
      setDrawerTab('pages'); // Switch to pages tab so the user sees their saved page
    }
  };

  const handleExecuteClear = () => {
    clearNotebook();
    setShowClearConfirm(false);
  };

  const handleExecuteDeletePage = () => {
    if (pageToDeleteId) {
      deletePage(pageToDeleteId);
      if (selectedPreviewPageId === pageToDeleteId) {
        setSelectedPreviewPageId(null);
      }
      setPageToDeleteId(null);
    }
  };

  const displayedEntries = useMemo(() => {
    const list = entries.filter((item) => {
      // Type & Reversed filter
      if (filterType !== 'all') {
        if (filterType === 'reversed' && !item.isReversed) return false;
        if (filterType === 'quranic' && item.type !== 'quranic' && !item.surahInfo) return false;
        if (filterType === 'dictionary' && item.type !== 'dictionary') return false;
      }
      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const matchesReversedSearch =
        item.isReversed &&
        (q.includes('معكوس') || 'معكوسة'.includes(q) || 'معكوس'.includes(q) || q.includes('عكس'));

      return (
        item.word.toLowerCase().includes(q) ||
        item.cipher.toLowerCase().includes(q) ||
        (item.systemName && item.systemName.toLowerCase().includes(q)) ||
        matchesReversedSearch
      );
    });

    return isReversedOrder ? [...list].reverse() : list;
  }, [entries, searchQuery, filterType, isReversedOrder]);

  const activePreviewPage = useMemo(() => {
    if (!selectedPreviewPageId) return null;
    return pages.find((p) => p.id === selectedPreviewPageId) || null;
  }, [pages, selectedPreviewPageId]);

  const filteredSystems = useMemo(() => {
    if (!systemSearchQuery.trim()) return savedSystems;
    const q = systemSearchQuery.trim().toLowerCase();
    return savedSystems.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q)) ||
        (s.nooraniName && s.nooraniName.toLowerCase().includes(q)) ||
        (s.arabicName && s.arabicName.toLowerCase().includes(q)) ||
        (s.tags && s.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [savedSystems, systemSearchQuery]);

  const handleActivateSystem = (system: SavedCipherSystem) => {
    updateAllLayers(system.layers, system.name);
    setActiveTableName(system.name);
    setAppliedSystemId(system.id);
    setTimeout(() => {
      setAppliedSystemId(null);
    }, 2500);
  };

  const handleExecuteDeleteSystem = () => {
    if (systemToDeleteId) {
      removeSavedSystem(systemToDeleteId);
      setSystemToDeleteId(null);
    }
  };

  const handleExecuteClearSystems = () => {
    clearSavedSystems();
    setShowClearSystemsConfirm(false);
  };

  return (
    <>
      {/* Floating Micro Toast */}
      {activeToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-70 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none">
          <div className="px-4 py-2 rounded-full bg-stone-900/95 dark:bg-stone-100/95 text-stone-100 dark:text-stone-900 text-xs font-bold shadow-2xl border border-stone-700/50 dark:border-stone-300 flex items-center gap-2 backdrop-blur-md max-w-sm text-center">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>{activeToast}</span>
          </div>
        </div>
      )}

      {/* Slide-over Backdrop & Container */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
          {/* Overlay */}
          <div
            onClick={closeDrawer}
            className="absolute inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Drawer Panel */}
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
            <div className="w-screen max-w-xl bg-white dark:bg-stone-900 shadow-2xl border-l border-stone-200 dark:border-stone-800 flex flex-col h-full animate-in slide-in-from-right duration-250">
              
              {/* Minimal Drawer Header */}
              <div className="p-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/90 dark:bg-stone-950/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <BookMarked className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
                      دفتر الكلمات والشيفرات
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerTab('entries');
                      setShowQuickAdd(!showQuickAdd);
                    }}
                    className={`p-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                      showQuickAdd && drawerTab === 'entries'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200'
                        : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                    title="إضافة كلمة يدوية سريعة"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                    title="إغلاق الدفتر"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Main Tabs: Systems vs Current Words vs Saved Pages */}
              <div className="flex items-center border-b border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-950/50 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setDrawerTab('systems')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                    drawerTab === 'systems'
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200/80 dark:border-stone-700'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>مفكرة الشيفرات</span>
                  <span className="text-3xs font-mono px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-bold border border-amber-300/50">
                    {savedSystems.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerTab('entries')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                    drawerTab === 'entries'
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200/80 dark:border-stone-700'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  <BookMarked className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>سجل الكلمات</span>
                  <span className="text-3xs font-mono px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold">
                    {entries.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerTab('pages')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                    drawerTab === 'pages'
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200/80 dark:border-stone-700'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>الصفحات</span>
                  <span className="text-3xs font-mono px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-300 font-bold border border-indigo-300/50">
                    {pages.length}
                  </span>
                </button>
              </div>

              {/* TAB 0: SAVED CIPHER SYSTEMS NOTEBOOK */}
              {drawerTab === 'systems' && (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Systems Controls Bar */}
                  <div className="p-2.5 bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 space-y-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          value={systemSearchQuery}
                          onChange={(e) => setSystemSearchQuery(e.target.value)}
                          placeholder="بحث في أسماء المنظومات أو الملاحظات أو التصنيفات..."
                          className="w-full pr-8 pl-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      {savedSystems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(exportSavedSystemsAsText(), `مفكرة_المنظومات_${Date.now()}.txt`, 'text/plain;charset=utf-8')}
                          className="p-1.5 rounded-lg text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 transition-colors text-2xs font-bold shrink-0 cursor-pointer"
                          title="تصدير جميع المنظومات والملاحظات كملف نصي (.txt)"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-3xs text-stone-500 dark:text-stone-400">
                      <span>المنظومات المحفوظة: {filteredSystems.length} من أصل {savedSystems.length}</span>
                      {savedSystems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowClearSystemsConfirm(true)}
                          className="text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          إفراغ مفكرة الشيفرات
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Systems List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {filteredSystems.length === 0 ? (
                      <div className="text-center py-12 px-4 space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          {savedSystems.length === 0
                            ? 'مفكرة الشيفرات فارغة حالياً'
                            : 'لا توجد منظومة مطابقة لكلمة البحث'}
                        </h4>
                        <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
                          {savedSystems.length === 0
                            ? 'عندما تجرب تشكيلات الشيفرات (مثل سماء 1 مع أرض 7) وتعجبك منظومة معينة، اضغط على زر "حفظ بالمفكرة" لتدوين ملاحظاتك وانطباعاتك عنها والرجوع إليها وتفعيلها بضغطة زر واحدة في أي وقت.'
                            : 'جرب البحث بكلمات أخرى أو مسح نص البحث.'}
                        </p>
                      </div>
                    ) : (
                      filteredSystems.map((sys) => {
                        const isApplied = appliedSystemId === sys.id;
                        return (
                          <div
                            key={sys.id}
                            className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-3.5 shadow-2xs space-y-2.5 hover:border-amber-400/60 dark:hover:border-amber-600/60 transition-colors"
                          >
                            {/* Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                                  <span>{sys.name}</span>
                                </h4>
                                <span className="text-3xs text-stone-400 dark:text-stone-500 font-mono">
                                  {new Date(sys.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingSystem(sys)}
                                  className="p-1 rounded-md text-stone-400 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                                  title="تعديل الملاحظات أو الاسم"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSystemToDeleteId(sys.id)}
                                  className="p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                                  title="حذف المنظومة من المفكرة"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Badges */}
                            <div className="flex items-center gap-1.5 flex-wrap text-3xs">
                              {sys.nooraniName && (
                                <span className="bg-indigo-50 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 font-bold">
                                  🌌 {sys.nooraniName}
                                </span>
                              )}
                              {sys.arabicName && (
                                <span className="bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 font-bold">
                                  🌍 {sys.arabicName}
                                </span>
                              )}
                              {sys.includeWaw && (
                                <span className="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-950 dark:text-indigo-200 px-1.5 py-0.5 rounded-md text-3xs font-extrabold border border-indigo-300 dark:border-indigo-700">
                                  ✨ مع الواو (و)
                                </span>
                              )}
                              {sys.tags?.map((t) => (
                                <span
                                  key={t}
                                  className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-md border border-stone-200 dark:border-stone-700 font-medium"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>

                            {/* Personal Notes Box */}
                            {sys.notes ? (
                              <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-stone-800 dark:text-stone-200 leading-relaxed font-sans">
                                <div className="flex items-center gap-1 text-3xs font-extrabold text-amber-700 dark:text-amber-400 mb-1">
                                  <span>📝 ملاحظاتي وتجاربي:</span>
                                </div>
                                <p className="whitespace-pre-wrap">{sys.notes}</p>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditingSystem(sys)}
                                className="text-3xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>إضافة ملاحظات عن هذه المنظومة</span>
                              </button>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 dark:border-stone-800">
                              <button
                                type="button"
                                onClick={() => handleActivateSystem(sys)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                                  isApplied
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-amber-500 hover:bg-amber-600 text-white hover:scale-101'
                                }`}
                              >
                                {isApplied ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>تم التفعيل في مساحة العمل ✓</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>تفعيل المنظومة الآن ↗</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopy(JSON.stringify(sys.layers, null, 2), `layers_${sys.id}`)}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-2xs cursor-pointer"
                                title="نسخ بيانات طبقات المنظومة"
                              >
                                {copiedKey === `layers_${sys.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* SAVE CURRENT AS SEPARATE PAGE BANNER */}
              {drawerTab === 'entries' && entries.length > 0 && (
                <div className="p-2 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-amber-500/10 dark:from-amber-950/30 dark:via-indigo-950/30 dark:to-amber-950/30 border-b border-amber-200/70 dark:border-amber-900/50 flex items-center justify-between gap-2">
                  <span className="text-2xs font-bold text-stone-700 dark:text-stone-300 truncate">
                    احفظ المجموعة في صفحة منفصلة ليفرغ الدفتر للمجموعة التالية:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewPageTitle(`مجموعة ${entries[0]?.cipher ? `[${entries[0].cipher}]` : ''} - (${entries.length} كلمة)`);
                      setShowSavePageModal(true);
                    }}
                    className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-2xs font-extrabold inline-flex items-center gap-1 shadow-2xs cursor-pointer shrink-0 transition-transform active:scale-95"
                    title="حفظ الصفحة وإفراغ الدفتر"
                  >
                    <FolderPlus className="w-3 h-3" />
                    <span>حفظ الصفحة وإفراغ الدفتر</span>
                  </button>
                </div>
              )}

              {/* TAB 1: CURRENT WORKING NOTEBOOK */}
              {drawerTab === 'entries' && (
                <>
                  {/* Quick Add Form (Minimal) */}
                  {showQuickAdd && (
                    <form
                      onSubmit={handleQuickAdd}
                      className="p-2.5 bg-amber-50/60 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 space-y-2 text-xs"
                    >
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          value={newWord}
                          onChange={(e) => setNewWord(e.target.value)}
                          placeholder="الكلمة (مثال: مريم)"
                          className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                          required
                        />
                        <input
                          type="text"
                          value={newCipher}
                          onChange={(e) => setNewCipher(e.target.value)}
                          placeholder="الشيفرة (مثال: عنحم)"
                          className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                          required
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5 text-3xs font-bold text-stone-700 dark:text-stone-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={newIsReversed}
                            onChange={(e) => setNewIsReversed(e.target.checked)}
                            className="rounded text-amber-600 focus:ring-amber-500 w-3 h-3"
                          />
                          <RotateCcw className="w-2.5 h-2.5 text-rose-600" />
                          <span>كلمة معكوسة</span>
                        </label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setShowQuickAdd(false)}
                            className="px-2 py-0.5 rounded text-stone-500 text-3xs hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer"
                          >
                            إلغاء
                          </button>
                          <button
                            type="submit"
                            className="px-2.5 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-3xs cursor-pointer"
                          >
                            إضافة
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Compact Search, Filter & REVERSE ORDER Toolbar */}
                  {entries.length > 0 && (
                    <div className="p-2 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <Search className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="بحث سريع بالكلمة أو الشيفرة..."
                            className="w-full text-xs py-1 px-2.5 pe-7 rounded-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery('')}
                              className="absolute left-2 top-1/2 -translate-y-1/2 text-3xs text-stone-400 hover:text-stone-600 cursor-pointer"
                            >
                              مسح
                            </button>
                          )}
                        </div>

                        {/* REVERSE ORDER BUTTON */}
                        <button
                          type="button"
                          onClick={() => setIsReversedOrder(!isReversedOrder)}
                          className={`px-2 py-1 rounded-md text-3xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer border ${
                            isReversedOrder
                              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                              : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
                          }`}
                          title="عكس ترتيب السجلات (من البداية للنهاية أو العكس)"
                        >
                          <ArrowUpDown className="w-3 h-3" />
                          <span>{isReversedOrder ? 'ترتيب معكوس ⇅' : 'عكس الترتيب ⇅'}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1 text-3xs flex-wrap">
                        <button
                          type="button"
                          onClick={() => setFilterType('all')}
                          className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                            filterType === 'all'
                              ? 'bg-amber-600 text-white'
                              : 'bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          الكل ({entries.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterType('reversed')}
                          className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer inline-flex items-center gap-0.5 ${
                            filterType === 'reversed'
                              ? 'bg-rose-600 text-white'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
                          }`}
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>المعكوسة ({entries.filter((e) => e.isReversed).length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterType('quranic')}
                          className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                            filterType === 'quranic'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          قرآني ({entries.filter((e) => e.type === 'quranic' || e.surahInfo).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterType('dictionary')}
                          className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                            filterType === 'dictionary'
                              ? 'bg-blue-600 text-white'
                              : 'bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          معجمي ({entries.filter((e) => e.type === 'dictionary').length})
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Minimal Entries Grid / Side-by-Side Chips */}
                  <div className="flex-1 overflow-y-auto p-2.5">
                    {entries.length === 0 ? (
                      <div className="text-center py-12 px-4 space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                          <BookMarked className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
                            الدفتر فارغ وجاهز للمجموعة الجديدة
                          </h4>
                          <p className="text-3xs text-stone-400 max-w-xs mx-auto leading-relaxed">
                            انقر على زر 📓 بجانب أي كلمة أثناء فك التشفير لحفظها هنا، ثم احفظ الصفحة عند الانتهاء.
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowQuickAdd(true)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>إضافة كلمة</span>
                          </button>
                          {pages.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setDrawerTab('pages')}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs cursor-pointer"
                            >
                              <Layers className="w-3 h-3 text-indigo-500" />
                              <span>الصفحات السابقة ({pages.length})</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : displayedEntries.length === 0 ? (
                      <div className="text-center py-8 text-xs text-stone-400">
                        لا توجد نتائج مطابقة للبحث أو التصفية.
                      </div>
                    ) : (
                      /* Minimal Side-by-Side Grid */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {displayedEntries.map((item, idx) => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-1.5 sm:p-2 rounded-lg border transition-all text-xs ${
                              item.isReversed
                                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 hover:border-rose-300'
                                : 'bg-stone-50/90 dark:bg-stone-950/80 border-stone-200 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700'
                            }`}
                          >
                            {/* Word ➔ Cipher Side-by-Side */}
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="text-3xs text-stone-400 font-mono select-none w-4 shrink-0">
                                {idx + 1}.
                              </span>

                              <div className="flex items-center gap-1 min-w-0">
                                <span className="font-bold text-stone-900 dark:text-amber-200 truncate font-['Amiri',serif] text-sm">
                                  {item.word}
                                </span>
                                <ArrowLeft className="w-2.5 h-2.5 text-stone-400 shrink-0" />
                                <span className="font-bold text-amber-700 dark:text-amber-400 truncate font-['Amiri',serif] text-sm">
                                  {item.cipher}
                                </span>
                              </div>

                              {/* Minimal Tags */}
                              {item.isReversed && (
                                <span
                                  className="px-1 py-0.2 rounded text-3xs font-extrabold bg-rose-200/80 dark:bg-rose-900/80 text-rose-900 dark:text-rose-200 inline-flex items-center gap-0.5 shrink-0"
                                  title="كلمة معكوسة"
                                >
                                  <RotateCcw className="w-2 h-2 text-rose-600 dark:text-rose-400" />
                                  <span>معكوسة</span>
                                </span>
                              )}

                              {item.systemNumber && (
                                <span className="px-1 py-0.2 rounded text-3xs font-mono font-bold bg-amber-100/80 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 shrink-0">
                                  #{item.systemNumber}
                                </span>
                              )}
                            </div>

                            {/* Minimal Actions: Copy & Delete */}
                            <div className="flex items-center gap-0.5 shrink-0 ms-1">
                              <button
                                type="button"
                                onClick={() => handleCopy(`${item.word} ➔ ${item.cipher}`, `pair_${item.id}`)}
                                className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-white dark:hover:bg-stone-800 transition-colors cursor-pointer"
                                title="نسخ الكلمة والشيفرة"
                              >
                                {copiedKey === `pair_${item.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => removeEntry(item.id)}
                                className="p-1 rounded text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100/50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                title="حذف"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Minimal Footer Toolbar */}
                  {entries.length > 0 && (
                    <div className="p-2.5 bg-stone-50/95 dark:bg-stone-950/90 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-2xs font-bold">
                        <button
                          type="button"
                          onClick={() => handleCopy(exportAsText(), 'export_all')}
                          className="py-1 px-2 rounded-md bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          title="نسخ الكل"
                        >
                          {copiedKey === 'export_all' ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-stone-500" />
                          )}
                          <span>نسخ الكل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadFile(
                              exportAsText(),
                              `دفتر_التشفير_${new Date().toISOString().slice(0, 10)}.txt`,
                              'text/plain;charset=utf-8'
                            )
                          }
                          className="py-1 px-2 rounded-md bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          title="تصدير ملف TXT"
                        >
                          <FileText className="w-3 h-3 text-amber-600" />
                          <span>تصدير TXT</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadFile(
                              exportAsCSV(),
                              `دفتر_التشفير_${new Date().toISOString().slice(0, 10)}.csv`,
                              'text/csv;charset=utf-8'
                            )
                          }
                          className="py-1 px-2 rounded-md bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          title="تصدير جدول CSV"
                        >
                          <Download className="w-3 h-3 text-emerald-600" />
                          <span>CSV</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        id="btn-clear-notebook"
                        onClick={() => setShowClearConfirm(true)}
                        className="text-rose-600 dark:text-rose-400 hover:underline cursor-pointer inline-flex items-center gap-1 font-bold text-2xs"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>إفراغ الدفتر</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: SAVED PAGES (ARCHIVES & GROUPS) */}
              {drawerTab === 'pages' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Top Bar for Saved Pages */}
                  <div className="p-2.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
                        الصفحات والمجموعات المحفوظة ({pages.length})
                      </h4>
                    </div>

                    {entries.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewPageTitle(`مجموعة ${entries[0]?.cipher ? `[${entries[0].cipher}]` : ''} - (${entries.length} كلمة)`);
                          setShowSavePageModal(true);
                        }}
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-3xs font-bold inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>حفظ الدفتر الحالي كصفحة</span>
                      </button>
                    )}
                  </div>

                  {/* List of Saved Pages */}
                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                    {pages.length === 0 ? (
                      <div className="text-center py-12 px-4 space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                          <Archive className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
                            لا توجد صفحات محفوظة بعد
                          </h4>
                          <p className="text-3xs text-stone-400 max-w-xs mx-auto leading-relaxed">
                            احفظ أي مجموعة فك تشفير مكتملة لتظهر كصفحة مستقلة يمكنك فتحها أو تصديرها لاحقاً.
                          </p>
                        </div>
                        {entries.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewPageTitle(`مجموعة ${entries[0]?.cipher ? `[${entries[0].cipher}]` : ''} - (${entries.length} كلمة)`);
                              setShowSavePageModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs cursor-pointer"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span>حفظ الدفتر الحالي ({entries.length} كلمة)</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      pages.map((page, pIdx) => {
                        const isSelected = selectedPreviewPageId === page.id;
                        const isEditingThisTitle = editingPageId === page.id;
                        const reversedCount = page.entries.filter((e) => e.isReversed).length;

                        return (
                          <div
                            key={page.id}
                            className={`rounded-lg border transition-all ${
                              isSelected
                                ? 'bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-2xs'
                                : 'bg-stone-50/90 dark:bg-stone-950/80 border-stone-200 dark:border-stone-800 hover:border-indigo-300'
                            }`}
                          >
                            {/* Page Header (Minimal) */}
                            <div className="p-2 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span className="w-5 h-5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-3xs shrink-0 font-mono">
                                    #{pIdx + 1}
                                  </span>

                                  {isEditingThisTitle ? (
                                    <div className="flex items-center gap-1 flex-1">
                                      <input
                                        type="text"
                                        value={editingPageTitle}
                                        onChange={(e) => setEditingPageTitle(e.target.value)}
                                        className="text-xs px-2 py-0.5 rounded border border-indigo-400 bg-white dark:bg-stone-900 w-full font-bold"
                                        autoFocus
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          renamePage(page.id, editingPageTitle);
                                          setEditingPageId(null);
                                        }}
                                        className="p-1 rounded bg-indigo-600 text-white text-3xs font-bold cursor-pointer"
                                      >
                                        حفظ
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingPageId(null)}
                                        className="p-1 text-stone-400 text-3xs cursor-pointer"
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  ) : (
                                    <h5
                                      onClick={() => setSelectedPreviewPageId(isSelected ? null : page.id)}
                                      className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                                      title="انقر لعرض الكلمات"
                                    >
                                      {page.title}
                                    </h5>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {!isEditingThisTitle && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingPageId(page.id);
                                        setEditingPageTitle(page.title);
                                      }}
                                      className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                                      title="إعادة التسمية"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setPageToDeleteId(page.id)}
                                    className="p-1 rounded text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                    title="حذف هذه الصفحة"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Badges & Quick Action Row */}
                              <div className="flex items-center justify-between gap-1 flex-wrap text-3xs">
                                <div className="flex items-center gap-1">
                                  <span className="px-1.5 py-0.2 rounded bg-stone-200/80 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold">
                                    {page.entries.length} كلمة
                                  </span>

                                  {reversedCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 font-bold inline-flex items-center gap-0.5">
                                      <RotateCcw className="w-2 h-2 text-rose-600" />
                                      <span>{reversedCount} معكوسة</span>
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => loadPageIntoWorkspace(page.id, true)}
                                    className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold inline-flex items-center gap-1 cursor-pointer transition-all"
                                    title="فتح هذه الصفحة في الدفتر النشط"
                                  >
                                    <FolderOpen className="w-2.5 h-2.5" />
                                    <span>فتح بالدفتر النشط</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setSelectedPreviewPageId(isSelected ? null : page.id)}
                                    className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold cursor-pointer"
                                  >
                                    {isSelected ? 'إخفاء' : 'استعراض'}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Minimal Inside Page Preview (Side-by-side chips) */}
                            {isSelected && (
                              <div className="p-2 border-t border-indigo-200 dark:border-indigo-900/60 bg-white/70 dark:bg-stone-900/70 space-y-2">
                                <div className="flex items-center justify-between gap-1 text-3xs">
                                  <span className="font-bold text-stone-600 dark:text-stone-400">
                                    محتويات الصفحة ({page.entries.length} كلمة):
                                  </span>

                                  {/* Reverse preview order button */}
                                  <button
                                    type="button"
                                    onClick={() => setPagePreviewReversedOrder(!pagePreviewReversedOrder)}
                                    className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <ArrowUpDown className="w-2.5 h-2.5" />
                                    <span>{pagePreviewReversedOrder ? 'ترتيب معكوس ⇅' : 'عكس الترتيب ⇅'}</span>
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-48 overflow-y-auto p-1">
                                  {(pagePreviewReversedOrder ? [...page.entries].reverse() : page.entries).map((item, eIdx) => (
                                    <div
                                      key={item.id || eIdx}
                                      className={`flex items-center justify-between p-1 rounded border text-xs transition-all ${
                                        item.isReversed
                                          ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
                                          : 'bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1 truncate min-w-0">
                                        <span className="font-bold text-stone-900 dark:text-amber-200 truncate font-['Amiri',serif]">
                                          {item.word}
                                        </span>
                                        <ArrowLeft className="w-2.5 h-2.5 text-stone-400 shrink-0" />
                                        <span className="font-bold text-amber-700 dark:text-amber-400 truncate font-['Amiri',serif]">
                                          {item.cipher}
                                        </span>
                                        {item.isReversed && (
                                          <span className="px-1 py-0.2 rounded text-3xs font-extrabold bg-rose-200/90 dark:bg-rose-900/90 text-rose-900 dark:text-rose-200 inline-flex items-center gap-0.5 shrink-0">
                                            <RotateCcw className="w-2 h-2 text-rose-600 dark:text-rose-400" />
                                            <span>معكوسة</span>
                                          </span>
                                        )}
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleCopy(`${item.word} ➔ ${item.cipher}`, `p_${page.id}_${item.id}`)}
                                        className="p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                                        title="نسخ"
                                      >
                                        {copiedKey === `p_${page.id}_${item.id}` ? (
                                          <Check className="w-3 h-3 text-emerald-600" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                {/* Export buttons for this page */}
                                <div className="flex items-center justify-end gap-1 pt-1 border-t border-stone-200/50 dark:border-stone-800/50 text-3xs">
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(exportPageAsText(page.id), `copy_page_${page.id}`)}
                                    className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Copy className="w-2.5 h-2.5" />
                                    <span>نسخ الصفحة</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDownloadFile(
                                        exportPageAsText(page.id),
                                        `${page.title.replace(/\s+/g, '_')}.txt`,
                                        'text/plain;charset=utf-8'
                                      )
                                    }
                                    className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <FileText className="w-2.5 h-2.5 text-amber-600" />
                                    <span>تصدير TXT</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDownloadFile(
                                        exportPageAsCSV(page.id),
                                        `${page.title.replace(/\s+/g, '_')}.csv`,
                                        'text/csv;charset=utf-8'
                                      )
                                    }
                                    className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Download className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>CSV</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Save Current Notebook as New Page */}
      {showSavePageModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" dir="rtl">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
              <FolderPlus className="w-5 h-5" />
              <h4 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                حفظ المجموعة في صفحة مستقلة
              </h4>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              سيتم حفظ جميع الكلمات الحالية (<strong className="text-amber-600">{entries.length} كلمة</strong>) في صفحة خاصة، وتفريغ الدفتر النشط فوراً لتتمكن من فك تشفير المجموعة التالية بكل حرية.
            </p>

            <form onSubmit={handleExecuteSavePage} className="space-y-3">
              <div>
                <label className="block text-2xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  عنوان الصفحة أو اسم المجموعة:
                </label>
                <input
                  type="text"
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  placeholder="مثال: فك تشفير مجموعة الآية الأولى..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSavePageModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>حفظ الصفحة وإفراغ الدفتر</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Clear Notebook Confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-60 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" dir="rtl">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-5 h-5" />
              <h4 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                إفراغ الدفتر بالكامل؟
              </h4>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              هل أنت متأكد من رغبتك في إفراغ الدفتر الحالي وحذف جميع الكلمات ({entries.length} كلمة)؟
              (لن يتم حذف الصفحات المحفوظة مسبقاً).
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleExecuteClear}
                className="px-4 py-1.5 rounded-lg text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>نعم، إفراغ الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Saved Page Confirmation */}
      {pageToDeleteId && (
        <div className="fixed inset-0 z-60 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" dir="rtl">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-5 h-5" />
              <h4 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                حذف الصفحة المحفوظة؟
              </h4>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              هل أنت متأكد من حذف هذه الصفحة بشكل نهائي؟
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPageToDeleteId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteDeletePage}
                className="px-4 py-1.5 rounded-lg text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف الصفحة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Edit System Modal */}
      {editingSystem && (
        <SaveSystemModal
          isOpen={!!editingSystem}
          onClose={() => setEditingSystem(null)}
          defaultName={editingSystem.name}
          existingSystemId={editingSystem.id}
          existingNotes={editingSystem.notes}
          existingTags={editingSystem.tags}
          nooraniName={editingSystem.nooraniName}
          arabicName={editingSystem.arabicName}
          includeWaw={editingSystem.includeWaw}
          layers={editingSystem.layers}
        />
      )}

      {/* MODAL 5: Delete Saved System Confirmation */}
      {systemToDeleteId && (
        <div className="fixed inset-0 z-60 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" dir="rtl">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-5 h-5" />
              <h4 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                حذف المنظومة من المفكرة؟
              </h4>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف هذه المنظومة مع كافة ملاحظاتها من مفكرة الشيفرات؟
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSystemToDeleteId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteSystem}
                className="px-4 py-1.5 rounded-lg text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>نعم، حذف</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Clear All Saved Systems Confirmation */}
      {showClearSystemsConfirm && (
        <div className="fixed inset-0 z-60 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" dir="rtl">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-5 h-5" />
              <h4 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                إفراغ مفكرة الشيفرات؟
              </h4>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              هل أنت متأكد من حذف جميع المنظومات المحفوظة ({savedSystems.length} منظومة) مع ملاحظاتها بشكل نهائي؟
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearSystemsConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleExecuteClearSystems}
                className="px-4 py-1.5 rounded-lg text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>إفراغ الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
