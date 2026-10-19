import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  timestamp: Date;
  duration?: number;
}

interface NotificationContextType {
  notifications: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  addToast: () => {},
  removeToast: () => {},
  clearAll: () => {}
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<ToastNotification[]>([
    {
      id: 'init-1',
      type: 'success',
      title: 'Infrastructure Initialized',
      message: 'Connected to Xorvila cluster nodes.',
      timestamp: new Date()
    }
  ]);

  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification: ToastNotification = {
      ...toast,
      id,
      timestamp: new Date()
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
    setToasts(prev => [...prev, newNotification]);

    const duration = toast.duration || 4500;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setToasts([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addToast, removeToast, clearAll }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl p-3.5 border shadow-2xl backdrop-blur-xl flex items-start gap-3 transition-all animate-in slide-in-from-bottom-5 duration-300 ${
              toast.type === 'success'
                ? 'bg-slate-900/90 border-emerald-500/40 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                : toast.type === 'warning'
                ? 'bg-slate-900/90 border-amber-500/40 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                : toast.type === 'error'
                ? 'bg-slate-900/90 border-rose-500/40 text-rose-100 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                : 'bg-slate-900/90 border-cyan-500/40 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-cyan-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-zinc-100 flex items-center justify-between">
                <span>{toast.title}</span>
                <span className="text-[10px] text-zinc-500 font-mono font-normal">
                  {toast.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {toast.message && (
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{toast.message}</p>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
