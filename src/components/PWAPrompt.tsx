import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-stone-900 text-stone-100 p-4 rounded-2xl shadow-xl border border-stone-700 flex items-center gap-4 max-w-sm">
        <div className="flex-1 space-y-1">
          <p className="font-bold text-sm">حفظ التطبيق للتصفح أوفلاين</p>
          <p className="text-xs text-stone-400">يمكنك تثبيت البرنامج للعمل بدون انترنت</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            تثبيت
          </button>
          <button 
            onClick={() => setShowPrompt(false)}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
