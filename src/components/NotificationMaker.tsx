import React, { useState, useEffect } from 'react';
import { SystemNotification, User } from '../types';
import { fetchApi } from '../lib/api';
import {
  Bell,
  Send,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Eye,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Megaphone,
  Clock,
  Shield,
  Layers,
  Check,
  RefreshCw,
  Plus
} from 'lucide-react';

interface Props {
  currentUser: User;
}

export const NotificationMaker: React.FC<Props> = ({ currentUser }) => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'success' | 'error' | 'announcement'>('info');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [targetRole, setTargetRole] = useState<'all' | 'user' | 'moderator' | 'admin'>('all');
  const [isActive, setIsActive] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    const res = await fetchApi<SystemNotification[]>('/admin/notifications');
    if (res.success && res.data) {
      setNotifications(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFeedback({ type: 'error', message: 'Notification title is required.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const res = await fetchApi<SystemNotification>('/admin/notifications', {
      method: 'POST',
      body: JSON.stringify({
        title: title.trim(),
        message: message.trim(),
        type,
        priority,
        targetRole,
        isActive
      })
    });

    if (res.success && res.data) {
      setNotifications(prev => [res.data!, ...prev]);
      setTitle('');
      setMessage('');
      setFeedback({ type: 'success', message: 'Notification broadcast published to cluster.' });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ type: 'error', message: res.error?.message || 'Failed to create notification.' });
    }
    setSubmitting(false);
  };

  const handleToggleActive = async (notifId: string) => {
    const res = await fetchApi<{ status: string; isActive: boolean }>(`/admin/notifications/${notifId}/toggle`, {
      method: 'POST'
    });
    if (res.success && res.data) {
      setNotifications(prev =>
        prev.map(n => (n.id === notifId ? { ...n, isActive: res.data!.isActive } : n))
      );
    }
  };

  const handleDelete = async (notifId: string) => {
    const res = await fetchApi(`/admin/notifications/${notifId}`, {
      method: 'DELETE'
    });
    if (res.success) {
      setNotifications(prev => prev.filter(n => n.id !== notifId));
      setFeedback({ type: 'success', message: 'Notification deleted.' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to permanently clear all announcements?')) {
      return;
    }
    setClearingAll(true);
    const res = await fetchApi('/admin/notifications/clear-all', {
      method: 'DELETE'
    });
    if (res.success) {
      setNotifications([]);
      setFeedback({ type: 'success', message: 'All system notifications and announcements cleared.' });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: 'error', message: 'Failed to clear notifications.' });
    }
    setClearingAll(false);
  };

  const applyPreset = (preset: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
    priority: 'low' | 'normal' | 'high' | 'urgent';
  }) => {
    setTitle(preset.title);
    setMessage(preset.message);
    setType(preset.type);
    setPriority(preset.priority);
  };

  const getTypeIcon = (t: string) => {
    switch (t) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-purple-400" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getTypeBadge = (t: string) => {
    switch (t) {
      case 'success':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30';
      case 'warning':
        return 'bg-amber-950/60 text-amber-300 border-amber-500/30';
      case 'error':
        return 'bg-rose-950/60 text-rose-300 border-rose-500/30';
      case 'announcement':
        return 'bg-purple-950/60 text-purple-300 border-purple-500/30';
      default:
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30';
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return 'bg-rose-950/80 text-rose-300 border-rose-500/40 animate-pulse font-bold';
      case 'high':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/40';
      case 'low':
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      default:
        return 'bg-blue-950/60 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div id="admin-notification-maker" className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-purple-500/20 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              System Notification Maker & Broadcast Studio
            </h2>
            <p className="text-xs text-zinc-400">
              Publish real-time announcements, alerts, and maintenance notices directly to all connected users.
            </p>
          </div>
        </div>

        <button
          onClick={loadNotifications}
          className="p-2 rounded-xl bg-slate-900 border border-purple-500/20 text-zinc-300 hover:text-cyan-300 hover:border-purple-500/40 transition-all flex items-center gap-2 text-xs font-semibold px-3 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Grid: Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Creator Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl border border-purple-500/20 bg-slate-900/70 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Compose Broadcast
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-zinc-500">Fast Presets:</span>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      title: 'Scheduled Cluster Maintenance',
                      message: 'Nodes will undergo routine kernel security updates at 02:00 UTC. Bot containers will automatically resume.',
                      type: 'warning',
                      priority: 'high'
                    })
                  }
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 cursor-pointer"
                >
                  Maintenance
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      title: 'Platform Engine v2.4 Released',
                      message: 'Python 3.13 runtime support and enhanced live logs terminal streaming are now active!',
                      type: 'announcement',
                      priority: 'normal'
                    })
                  }
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 cursor-pointer"
                >
                  Release
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      title: 'High CPU Load Throttling',
                      message: 'Temporary heavy container compute observed. Isolated cgroup throttling applied.',
                      type: 'error',
                      priority: 'urgent'
                    })
                  }
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 cursor-pointer"
                >
                  Alert
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateNotification} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Broadcast Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Maintenance, New Bot Features Available..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Message Body</label>
                <textarea
                  rows={3}
                  placeholder="Details, timeframe, affected bot instances, or recommended actions..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Type Selection */}
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Notification Type</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-purple-400"
                  >
                    <option value="info">Info (Default)</option>
                    <option value="announcement">Announcement</option>
                    <option value="warning">Warning</option>
                    <option value="success">Success</option>
                    <option value="error">Critical Alert</option>
                  </select>
                </div>

                {/* Priority Selection */}
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Priority Level</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-purple-400"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent (Red Alert)</option>
                  </select>
                </div>

                {/* Target Role Selection */}
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Target Audience</label>
                  <select
                    value={targetRole}
                    onChange={e => setTargetRole(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-purple-400"
                  >
                    <option value="all">All Users & Admins</option>
                    <option value="user">Regular Users Only</option>
                    <option value="moderator">Moderators & Admins</option>
                    <option value="admin">Administrators Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-purple-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Publish Immediately (Active)</span>
                </label>

                <button
                  type="submit"
                  disabled={submitting || !title.trim()}
                  className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Broadcasting...' : 'Broadcast Notification'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live Toast & Banner Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl border border-purple-500/20 bg-slate-900/70 backdrop-blur-md space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2 border-b border-zinc-800/80 pb-3">
              <Eye className="w-4 h-4 text-purple-400" />
              Live User Appearance Preview
            </span>

            {/* Live Banner Preview */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase">Banner Mode:</div>
              <div className={`p-4 rounded-xl border ${getTypeBadge(type)} space-y-1.5 transition-all`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs">
                    {getTypeIcon(type)}
                    <span>{title || 'Sample Notification Title'}</span>
                  </div>
                  <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border font-mono ${getPriorityBadge(priority)}`}>
                    {priority}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-snug pl-6">
                  {message || 'This is how your message preview will render for targeted users in their notifications menu and banner bar.'}
                </p>
                <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-500 font-mono pl-6">
                  <span>Target: {targetRole.toUpperCase()}</span>
                  <span>By: {currentUser.username || currentUser.name || 'Admin'}</span>
                </div>
              </div>
            </div>

            {/* Live Dropdown Notification Item Preview */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase">Navbar Popup Item:</div>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-3">
                <div className="mt-0.5">{getTypeIcon(type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs font-medium text-zinc-100">
                    <span className="truncate">{title || 'Sample Notification Title'}</span>
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">Just now</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">
                    {message || 'Notification content preview in the dropdown list...'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Published Notifications List */}
      <div className="p-5 rounded-2xl border border-purple-500/20 bg-slate-900/60 backdrop-blur-md space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
              Cluster Notifications Registry ({notifications.length})
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-400 font-mono">
              {notifications.filter(n => n.isActive).length} Active Broadcasts
            </span>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearingAll}
                className="px-2.5 py-1 rounded bg-rose-600/25 hover:bg-rose-600/35 border border-rose-500/40 text-rose-300 text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>{clearingAll ? 'Clearing...' : 'Clear All'}</span>
              </button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs">
            No system notifications or broadcasts recorded yet. Use the form above to broadcast your first announcement.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {notifications.map(n => (
              <div key={n.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">{getTypeIcon(n.type)}</div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-zinc-100">{n.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${getTypeBadge(n.type)}`}>
                        {n.type}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${getPriorityBadge(n.priority)}`}>
                        {n.priority}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                        Audience: {n.targetRole || 'all'}
                      </span>
                    </div>

                    {n.message && <p className="text-zinc-400 text-[11px] max-w-2xl">{n.message}</p>}

                    <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
                      <span>Created by {n.createdBy}</span>
                      <span>•</span>
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleToggleActive(n.id)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      n.isActive
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                    }`}
                    title={n.isActive ? 'Active - Click to Disable' : 'Inactive - Click to Activate'}
                  >
                    {n.isActive ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span>Inactive</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 transition-colors cursor-pointer"
                    title="Delete Notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
