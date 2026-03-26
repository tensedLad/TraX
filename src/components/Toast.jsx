import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl border shadow-lg shadow-black/40 backdrop-blur-sm text-sm font-mono flex items-center space-x-2 animate-slide-in-right
              ${toast.type === 'success' ? 'bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80]' : ''}
              ${toast.type === 'error' ? 'bg-[#f87171]/10 border-[#f87171]/30 text-[#f87171]' : ''}
              ${toast.type === 'info' ? 'bg-[#d4af37]/10 border-[#d4af37]/30 text-[#d4af37]' : ''}
            `}
          >
            <iconify-icon
              icon={toast.type === 'success' ? 'solar:check-circle-bold' : toast.type === 'error' ? 'solar:close-circle-bold' : 'solar:info-circle-bold'}
              class="text-lg"
            ></iconify-icon>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
