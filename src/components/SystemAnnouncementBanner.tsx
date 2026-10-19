import React, { useState, useEffect } from 'react';
import { SystemNotification, User } from '../types';
import { fetchApi } from '../lib/api';
import {
  Megaphone,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
  ChevronRight
} from 'lucide-react';

interface Props {
  currentUser: User | null;
}

export const SystemAnnouncementBanner: React.FC<Props> = ({ currentUser }) => {
  const [announcements, setAnnouncements] = useState<SystemNotification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('xorvila_dismissed_announcements');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const loadAnnouncements = async () => {
    const res = await fetchApi<SystemNotification[]>('/auth/notifications');
    if (res.success && res.data) {
      setAnnouncements(res.data);
    }
  };

  useEffect(() => {
    loadAnnouncements();
    const interval = setInterval(loadAnnouncements, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem('xorvila_dismissed_announcements', JSON.stringify(updated));
    } catch {}
  };

  const visibleAnnouncements = announcements.filter(a => {
    if (dismissedIds.includes(a.id)) return false;
    if (!a.isActive) return false;

    // Filter by role if set
    if (a.targetRole && a.targetRole !== 'all') {
      if (!currentUser) return false;
      if (a.targetRole === 'admin' && currentUser.role !== 'admin') return false;
      if (a.targetRole === 'moderator' && currentUser.role !== 'admin' && currentUser.role !== 'moderator') return false;
    }

    return true;
  });

  if (visibleAnnouncements.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-1.5 px-3 sm:px-6 pt-3">
      {visibleAnnouncements.map(announcement => {
        const isUrgent = announcement.priority === 'urgent';
        const isWarning = announcement.type === 'warning' || announcement.priority === 'high';
        const isError = announcement.type === 'error';
        const isSuccess = announcement.type === 'success';

        let bgClass = 'bg-slate-900/90 border-purple-500/40 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.15)]';
        let IconComponent = Megaphone;

        if (isUrgent || isError) {
          bgClass = 'bg-rose-950/80 border-rose-500/50 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.2)]';
          IconComponent = AlertCircle;
        } else if (isWarning) {
          bgClass = 'bg-amber-950/80 border-amber-500/50 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.2)]';
          IconComponent = AlertTriangle;
        } else if (isSuccess) {
          bgClass = 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)]';
          IconComponent = CheckCircle2;
        }

        return (
          <div
            key={announcement.id}
            className={`p-3 sm:px-4 sm:py-2.5 rounded-xl border backdrop-blur-md flex items-center justify-between gap-3 text-xs transition-all ${bgClass}`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-1 rounded-lg bg-black/20 shrink-0">
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
                <span className="font-bold text-zinc-100 flex items-center gap-2">
                  <span>{announcement.title}</span>
                  {announcement.priority === 'urgent' && (
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-rose-600 text-white font-mono animate-pulse">
                      Urgent
                    </span>
                  )}
                </span>
                {announcement.message && (
                  <span className="text-[11px] text-zinc-300 opacity-90 truncate">
                    {announcement.message}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => handleDismiss(announcement.id)}
              className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Dismiss announcement"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
