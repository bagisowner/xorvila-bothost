import React, { useState, useEffect } from 'react';
import { User, UserSession } from '../types';
import { fetchApi } from '../lib/api';
import {
  Shield,
  Key,
  Lock,
  Unlock,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Laptop,
  Tablet,
  Globe,
  Trash2,
  LogOut,
  Clock,
  RotateCw,
  Eye,
  EyeOff,
  Bot,
  MapPin,
  Calendar
} from 'lucide-react';

interface Props {
  currentUser: User | null;
  onUserUpdated: (user: User) => void;
  onLogout?: () => void;
}

function formatRelativeTime(isoString: string): string {
  try {
    const past = new Date(isoString).getTime();
    const now = Date.now();
    const diffMs = now - past;
    
    if (diffMs < 5000) return 'Active now';
    
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return `${diffSecs}s ago`;
    
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return 'Active';
  }
}

export const SecurityView: React.FC<Props> = ({
  currentUser,
  onUserUpdated,
  onLogout
}) => {
  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 2FA State
  const [is2FAEnabled, setIs2FAEnabled] = useState(currentUser?.twoFactorEnabled || false);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [toggling2FA, setToggling2FA] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);
  const [sessionMsg, setSessionMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setIs2FAEnabled(currentUser.twoFactorEnabled || false);
    }
    loadSessions();
  }, [currentUser]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetchApi<UserSession[]>('/auth/sessions');
      if (res.success && Array.isArray(res.data)) {
        setSessions(res.data);
      }
    } catch (e) {
      // Fallback local session if endpoint unavailable
      setSessions([
        {
          id: 'sess_curr',
          userId: currentUser?.id || 'usr_admin',
          deviceName: 'Google Chrome on Linux Desktop',
          deviceType: 'desktop',
          browser: 'Google Chrome',
          os: 'Linux',
          location: 'Direct / Localhost',
          ipAddress: '127.0.0.1',
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          expiresAt: Date.now() + 604800000,
          isCurrent: true
        }
      ]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPasswordLoading(true);
    const res = await fetchApi<{ message: string }>('/auth/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });

    if (res.success) {
      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordMsg({ type: 'error', text: res.error?.message || 'Failed to change password.' });
    }
    setPasswordLoading(false);
  };

  const handleToggle2FA = async () => {
    setToggling2FA(true);
    const res = await fetchApi<{ twoFactorEnabled: boolean; secret?: string }>('/auth/2fa/toggle', {
      method: 'POST'
    });

    if (res.success && res.data) {
      setIs2FAEnabled(res.data.twoFactorEnabled);
      if (res.data.secret) {
        setTwoFactorSecret(res.data.secret);
      } else {
        setTwoFactorSecret(null);
      }
      if (currentUser) {
        onUserUpdated({ ...currentUser, twoFactorEnabled: res.data.twoFactorEnabled });
      }
    }
    setToggling2FA(false);
  };

  const handleRevokeSession = async (sessionId: string) => {
    const res = await fetchApi(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
    if (res.success) {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setSessionMsg('Device session revoked successfully.');
      setTimeout(() => setSessionMsg(null), 3000);
    }
  };

  const handleLogoutAllOther = async () => {
    if (!window.confirm('Are you sure you want to terminate all other active device sessions? You will remain signed in only on this device.')) return;
    setRevokingAll(true);
    const res = await fetchApi('/auth/sessions/revoke-others', { method: 'POST' });
    if (res.success) {
      setSessions(prev => prev.filter(s => s.isCurrent));
      setSessionMsg('All other device sessions have been securely signed out.');
      setTimeout(() => setSessionMsg(null), 3000);
    }
    setRevokingAll(false);
  };

  const copySecret = () => {
    if (!twoFactorSecret) return;
    navigator.clipboard.writeText(twoFactorSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-4 h-4 text-cyan-400" />;
      case 'tablet':
        return <Tablet className="w-4 h-4 text-indigo-400" />;
      case 'bot':
        return <Bot className="w-4 h-4 text-purple-400" />;
      default:
        return <Laptop className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div id="security-view" className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#080B18]/90 border border-[rgba(140,120,255,0.2)] shadow-xl glass-panel relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-600/10 to-transparent pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
              Account Security & Access Control
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
              Configure credentials, multi-factor authentication (2FA), and monitor active authenticated browser sessions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Encrypted Session Storage</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Col: Password & 2FA */}
        <div className="space-y-6">
          {/* Change Password Card */}
          <div className="p-6 rounded-2xl bg-[#080B18]/80 border border-[rgba(140,120,255,0.18)] shadow-lg glass-panel space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-100">Update Password</h2>
                <p className="text-xs text-zinc-400">Change your root account password</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Current Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 focus:border-purple-500 text-xs text-zinc-100 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 focus:border-purple-500 text-xs text-zinc-100 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 focus:border-purple-500 text-xs text-zinc-100 outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide' : 'Show'} Passwords</span>
                </button>

                <button
                  type="submit"
                  disabled={passwordLoading || !newPassword}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md disabled:opacity-50 transition-all cursor-pointer"
                >
                  {passwordLoading ? 'Updating...' : 'Save New Password'}
                </button>
              </div>

              {passwordMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    passwordMsg.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {passwordMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{passwordMsg.text}</span>
                </div>
              )}
            </form>
          </div>

          {/* Two-Factor Authentication (2FA) Card */}
          <div className="p-6 rounded-2xl bg-[#080B18]/80 border border-[rgba(140,120,255,0.18)] shadow-lg glass-panel space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-100">Two-Factor Authentication (2FA)</h2>
                  <p className="text-xs text-zinc-400">Time-based One-Time Passwords (TOTP)</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  is2FAEnabled
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {is2FAEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Enforce a second layer of security at login using Google Authenticator, Authy, or 1Password.
            </p>

            <div className="pt-1">
              <button
                onClick={handleToggle2FA}
                disabled={toggling2FA}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  is2FAEnabled
                    ? 'bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md'
                }`}
              >
                {toggling2FA ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : is2FAEnabled ? (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Disable 2FA Protection</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Enable 2FA Protection</span>
                  </>
                )}
              </button>
            </div>

            {twoFactorSecret && (
              <div className="p-4 rounded-xl bg-black/60 border border-indigo-500/40 space-y-3 animate-in fade-in">
                <div className="text-xs font-semibold text-indigo-300 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-indigo-400" />
                  <span>Manual TOTP Key</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-black border border-white/10 font-mono text-xs text-indigo-200">
                  <span>{twoFactorSecret}</span>
                  <button
                    onClick={copySecret}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px] text-zinc-200"
                  >
                    {copiedSecret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSecret ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Enter this secret key into your authenticator app to complete setup.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Active Sessions */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-[#080B18]/80 border border-[rgba(140,120,255,0.18)] shadow-lg glass-panel space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-100">Active Device Sessions</h2>
                  <p className="text-xs text-zinc-400">Logged in browser sessions</p>
                </div>
              </div>

              <button
                onClick={loadSessions}
                className="text-xs text-zinc-400 hover:text-zinc-200 p-1.5"
                title="Refresh sessions"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loadingSessions ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {sessionMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>{sessionMsg}</span>
              </div>
            )}

            <div className="space-y-2.5">
              {sessions.map(s => (
                <div
                  key={s.id}
                  className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] hover:border-purple-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-white/[0.04] text-zinc-400 shrink-0 mt-0.5">
                      {getDeviceIcon(s.deviceType)}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="text-xs font-semibold text-zinc-200 flex flex-wrap items-center gap-2">
                        <span className="truncate">{s.deviceName}</span>
                        {s.isCurrent && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 shrink-0">
                            Current Device
                          </span>
                        )}
                      </div>
                      
                      {/* Secondary characteristics: Browser + OS + IP */}
                      <div className="text-[11px] text-zinc-400 font-mono flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-zinc-300 font-semibold">{s.browser} on {s.os}</span>
                        <span className="text-zinc-600">•</span>
                        <span>{s.ipAddress}</span>
                        {s.location && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="flex items-center gap-0.5 text-cyan-300/80">
                              <MapPin className="w-2.5 h-2.5" />
                              {s.location}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Timestamps */}
                      <div className="text-[10px] text-zinc-500 flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-600" />
                          Last active: <span className="text-zinc-400 font-medium">{formatRelativeTime(s.lastActivity)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zinc-600" />
                          Registered: <span className="text-zinc-400 font-medium">{new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {!s.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(s.id)}
                      className="p-2 rounded-lg bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 border border-rose-500/20 text-xs transition-colors shrink-0 self-end sm:self-center cursor-pointer flex items-center gap-1 sm:p-1.5"
                      title="Revoke Session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="sm:hidden text-[10px] font-semibold">Revoke Session</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <button
                onClick={handleLogoutAllOther}
                disabled={revokingAll || sessions.length <= 1}
                className="text-xs text-rose-400 hover:text-rose-300 disabled:opacity-40 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out of all other active sessions</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
