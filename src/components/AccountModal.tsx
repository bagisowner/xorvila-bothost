import React, { useState, useEffect } from 'react';
import { User, ApiToken } from '../types';
import { fetchApi } from '../lib/api';
import {
  X,
  User as UserIcon,
  Key,
  Shield,
  Plus,
  Trash2,
  Copy,
  Check,
  QrCode,
  Lock,
  Unlock,
  RotateCw,
  Crown,
  Server,
  Cpu,
  Layers,
  HardDrive,
  Code2,
  Terminal,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  LogOut,
  Sliders,
  RefreshCw
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  user: User | null;
  initialTab?: 'profile' | 'tokens' | 'quotas' | 'security';
  onClose: () => void;
  onUserUpdated: (updated: User) => void;
  onLogout?: () => void;
  serversCount?: number;
}

export const AccountModal: React.FC<Props> = ({
  isOpen,
  user,
  initialTab = 'profile',
  onClose,
  onUserUpdated,
  onLogout,
  serversCount = 0
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'tokens' | 'quotas' | 'security'>(initialTab);
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Token state
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [tokenExpiration, setTokenExpiration] = useState('365');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['servers:read', 'servers:write', 'console:exec']);
  const [createdTokenSecret, setCreatedTokenSecret] = useState<string | null>(null);
  const [showCreatedToken, setShowCreatedToken] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [creatingToken, setCreatingToken] = useState(false);
  const [testedTokenId, setTestedTokenId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg: string } | null>(null);

  // Code snippet language tab
  const [snippetLang, setSnippetLang] = useState<'curl' | 'python' | 'node'>('curl');

  // Security state
  const [is2FAEnabled, setIs2FAEnabled] = useState(user?.twoFactorEnabled || false);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorQr, setTwoFactorQr] = useState<string | null>(null);
  const [toggling2FA, setToggling2FA] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [revokeSuccess, setRevokeSuccess] = useState(false);

  const isAdmin = user?.role === 'admin';

  const loadTokens = async () => {
    setLoadingTokens(true);
    try {
      const res = await fetchApi<ApiToken[]>('/auth/tokens');
      if (res.success && Array.isArray(res.data)) {
        setTokens(res.data);
      } else {
        setTokens([]);
      }
    } catch (e) {
      setTokens([]);
    } finally {
      setLoadingTokens(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (user) {
        setName(user.name || '');
        setAvatarUrl(user.avatarUrl || '');
        setIs2FAEnabled(user.twoFactorEnabled || false);
      }
      loadTokens();
      setCreatedTokenSecret(null);
      setTestResult(null);
      setPasswordMsg(null);
    }
  }, [isOpen, user, initialTab]);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setProfileSaving(true);
    setProfileSuccess(false);

    const res = await fetchApi<User>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify({ name: name.trim(), avatarUrl: avatarUrl.trim() || undefined })
    });

    if (res.success && res.data) {
      onUserUpdated(res.data);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    }
    setProfileSaving(false);
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;
    setCreatingToken(true);

    const res = await fetchApi<ApiToken>('/auth/tokens', {
      method: 'POST',
      body: JSON.stringify({
        name: newTokenName.trim(),
        expirationDays: Number(tokenExpiration),
        scopes: selectedScopes
      })
    });

    if (res.success && res.data) {
      setCreatedTokenSecret(res.data.token);
      setShowCreatedToken(true);
      setTokens(prev => [res.data!, ...prev.filter(t => t.id !== res.data!.id)]);
      setNewTokenName('');
    }
    setCreatingToken(false);
  };

  const handleDeleteToken = async (tokenId: string) => {
    const res = await fetchApi(`/auth/tokens/${tokenId}`, { method: 'DELETE' });
    if (res.success) {
      setTokens(prev => prev.filter(t => t.id !== tokenId));
      if (testResult?.id === tokenId) setTestResult(null);
    }
  };

  const handleTestToken = async (token: ApiToken) => {
    setTestedTokenId(token.id);
    setTestResult(null);
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token.token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ id: token.id, success: true, msg: `Verified: Authenticated as ${data.data.email}` });
      } else {
        setTestResult({ id: token.id, success: false, msg: data.error?.message || 'Verification failed' });
      }
    } catch (e: any) {
      setTestResult({ id: token.id, success: false, msg: e.message || 'Network error during validation' });
    }
    setTestedTokenId(null);
  };

  const handleToggle2FA = async () => {
    setToggling2FA(true);
    const res = await fetchApi<{ twoFactorEnabled: boolean; secret?: string; qrCodeUrl?: string }>('/auth/2fa/toggle', { method: 'POST' });
    if (res.success && res.data) {
      setIs2FAEnabled(res.data.twoFactorEnabled);
      if (res.data.secret) setTwoFactorSecret(res.data.secret);
      if (res.data.qrCodeUrl) setTwoFactorQr(res.data.qrCodeUrl);
      if (user) {
        onUserUpdated({ ...user, twoFactorEnabled: res.data.twoFactorEnabled });
      }
    }
    setToggling2FA(false);
  };

  const handleRevokeAllSessions = async () => {
    setRevokingSessions(true);
    setRevokeSuccess(false);
    const res = await fetchApi('/auth/logout-all', { method: 'POST' });
    if (res.success) {
      setRevokeSuccess(true);
      setTimeout(() => setRevokeSuccess(false), 4000);
    }
    setRevokingSessions(false);
  };

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleScope = (scope: string) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter(s => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  };

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://xorvila.app';
  const activeSampleToken = createdTokenSecret || (tokens.length > 0 ? tokens[0].token : 'xor_live_secret_token_here');

  const curlSnippet = `curl -X GET "${currentHost}/api/servers" \\
  -H "Authorization: Bearer ${activeSampleToken}" \\
  -H "Content-Type: application/json"`;

  const pythonSnippet = `import aiohttp
import asyncio

async def fetch_bots():
    headers = {"Authorization": "Bearer ${activeSampleToken}"}
    async with aiohttp.ClientSession() as session:
        async with session.get("${currentHost}/api/servers", headers=headers) as resp:
            data = await resp.json()
            print(f"Cluster Bots: {data}")

asyncio.run(fetch_bots())`;

  const nodeSnippet = `const API_TOKEN = "${activeSampleToken}";

async function listServers() {
  const res = await fetch("${currentHost}/api/servers", {
    headers: {
      "Authorization": \`Bearer \${API_TOKEN}\`,
      "Content-Type": "application/json"
    }
  });
  const data = await res.json();
  console.log("My Active Bots:", data);
}

listServers();`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-purple-500/30 bg-slate-900 shadow-2xl p-5 sm:p-7 space-y-6 my-8">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-zinc-100">Account & Security Hub</h2>
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Admin Unlimited
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Free Tier User
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono truncate max-w-sm">{user?.email || 'Authenticated User'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-xl transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-zinc-950/80 rounded-xl border border-zinc-800/90 text-xs">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'profile'
                ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('tokens')}
            className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'tokens'
                ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Tokens</span>
            {tokens.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-900 text-purple-200 ml-1">
                {tokens.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('quotas')}
            className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'quotas'
                ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Resource Tier</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'security'
                ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Security & 2FA</span>
          </button>
        </div>

        {/* TAB 1: PROFILE INFO */}
        {activeTab === 'profile' && (
          <div className="space-y-5 text-xs">
            {/* Identity Card */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="relative">
                <img
                  src={avatarUrl || user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || user?.name || 'user')}`}
                  alt={user?.name || 'Avatar'}
                  className="w-16 h-16 rounded-2xl bg-zinc-800 object-cover border border-purple-500/40 shadow-md"
                />
                {isAdmin && (
                  <div className="absolute -top-2 -right-2 p-1 rounded-full bg-amber-500 text-black shadow-md" title="Administrator">
                    <Crown className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1.5 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="text-base font-bold text-zinc-100">{user?.name || 'Member'}</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-purple-950 text-purple-300 border border-purple-500/30 uppercase font-bold">
                    Role: {user?.role || 'user'}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Active Account
                  </span>
                </div>
                <div className="text-zinc-400 font-mono text-xs">{user?.email || 'N/A'}</div>
                <div className="text-zinc-500 text-[11px] pt-1">
                  Member since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '2026'}
                </div>
              </div>
            </div>

            {/* Profile Edit Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 block mb-1 font-medium">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-medium">Custom Avatar URL (Optional)</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
              </div>

              {profileSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Profile updated successfully!
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all disabled:opacity-50"
                >
                  {profileSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: API TOKENS & DEVELOPER ACCESS */}
        {activeTab === 'tokens' && (
          <div className="space-y-5 text-xs">
            {/* Newly Created Token Alert */}
            {createdTokenSecret && (
              <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 space-y-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <div className="font-bold flex items-center justify-between text-emerald-300">
                  <span className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-400" />
                    New API Secret Generated!
                  </span>
                  <button
                    onClick={() => setCreatedTokenSecret(null)}
                    className="text-emerald-400 hover:text-white p-1 rounded"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-zinc-300">
                  Copy this token immediately. For security, it will never be displayed in full again.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 flex items-center px-3 py-2 rounded-lg bg-black/80 border border-emerald-500/40 font-mono text-[11px] text-emerald-300">
                    <span className="truncate">
                      {showCreatedToken ? createdTokenSecret : `${createdTokenSecret.substring(0, 12)}••••••••••••••••••••••••`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCreatedToken(!showCreatedToken)}
                      className="ml-auto text-emerald-400 hover:text-emerald-200 p-1"
                      title={showCreatedToken ? 'Hide token' : 'Show token'}
                    >
                      {showCreatedToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={() => copyText('new-secret', createdTokenSecret)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-md"
                  >
                    {copiedKey === 'new-secret' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'new-secret' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Token Generation Box */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-zinc-200 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-purple-400" />
                  Generate Personal Access Token
                </div>
                <span className="text-[11px] text-zinc-400">REST API & CLI Access</span>
              </div>

              <form onSubmit={handleCreateToken} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Token Name (e.g. GitHub Actions CI/CD, Discord Bot Daemon)"
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <select
                      value={tokenExpiration}
                      onChange={(e) => setTokenExpiration(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="30">Expires in 30 Days</option>
                      <option value="90">Expires in 90 Days</option>
                      <option value="365">Expires in 1 Year</option>
                      <option value="0">Never Expires</option>
                    </select>
                  </div>
                </div>

                {/* Scopes Selection */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] text-zinc-400 font-medium">Permission Scopes:</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'servers:read', label: 'servers:read' },
                      { id: 'servers:write', label: 'servers:write' },
                      { id: 'console:exec', label: 'console:exec' },
                      { id: 'files:manage', label: 'files:manage' },
                      { id: 'admin:full', label: 'admin:full' }
                    ].map(s => {
                      const active = selectedScopes.includes(s.id);
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => toggleScope(s.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border ${
                            active
                              ? 'bg-purple-950 border-purple-500/50 text-purple-300 font-semibold shadow-sm'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {active ? '✓ ' : '+ '}{s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={creatingToken || !newTokenName.trim()}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50"
                  >
                    {creatingToken ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Generate API Token</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Active Tokens List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-zinc-400 font-semibold text-[11px] uppercase tracking-wider px-1">
                <span>Active API Tokens ({tokens.length})</span>
                {loadingTokens && <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />}
              </div>

              {tokens.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl space-y-2">
                  <Key className="w-7 h-7 mx-auto text-zinc-600" />
                  <p>No active API tokens found.</p>
                  <p className="text-[11px] text-zinc-600">Create one above to automate your bots via HTTP REST API or CLI scripts.</p>
                </div>
              ) : (
                tokens.map(token => (
                  <div
                    key={token.id}
                    className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-2 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-zinc-200 flex items-center gap-2">
                          <span>{token.name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                            Active
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                          {token.token.substring(0, 14)}••••••••••••••••
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleTestToken(token)}
                          disabled={testedTokenId === token.id}
                          className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] font-medium border border-zinc-700 flex items-center gap-1"
                          title="Test Token Authenticity"
                        >
                          {testedTokenId === token.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                          )}
                          <span>Test</span>
                        </button>

                        <button
                          onClick={() => copyText(token.id, token.token)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 border border-zinc-800"
                          title="Copy token secret"
                        >
                          {copiedKey === token.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleDeleteToken(token.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/50 border border-zinc-800 hover:border-rose-500/40"
                          title="Revoke and delete token"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/80">
                      <span>Created: {new Date(token.createdAt).toLocaleDateString()}</span>
                      <span>Last used: {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleTimeString() : 'Never'}</span>
                    </div>

                    {/* Test result banner */}
                    {testResult && testResult.id === token.id && (
                      <div className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
                        testResult.success ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                      }`}>
                        {testResult.success ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        <span>{testResult.msg}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Developer Code Integration Examples */}
            <div className="p-4 rounded-xl border border-purple-500/20 bg-slate-900/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  Quick API Integration Examples
                </div>
                <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => setSnippetLang('curl')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono ${snippetLang === 'curl' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    cURL
                  </button>
                  <button
                    onClick={() => setSnippetLang('python')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono ${snippetLang === 'python' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Python
                  </button>
                  <button
                    onClick={() => setSnippetLang('node')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono ${snippetLang === 'node' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Node.js
                  </button>
                </div>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
                <pre className="p-3 text-[11px] font-mono text-cyan-300 overflow-x-auto leading-relaxed">
                  {snippetLang === 'curl' ? curlSnippet : snippetLang === 'python' ? pythonSnippet : nodeSnippet}
                </pre>
                <button
                  onClick={() => copyText('snippet', snippetLang === 'curl' ? curlSnippet : snippetLang === 'python' ? pythonSnippet : nodeSnippet)}
                  className="absolute top-2 right-2 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] flex items-center gap-1 border border-zinc-700"
                >
                  {copiedKey === 'snippet' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'snippet' ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RESOURCE QUOTAS & TIER STATUS */}
        {activeTab === 'quotas' && (
          <div className="space-y-4 text-xs">
            {/* Current Tier Overview Banner */}
            <div className={`p-4 rounded-xl border ${
              isAdmin
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
            } space-y-2`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  {isAdmin ? <Crown className="w-5 h-5 text-amber-400" /> : <Server className="w-5 h-5 text-cyan-400" />}
                  <span>{isAdmin ? 'Administrator Unlimited Plan' : 'Free Standard User Plan'}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-black/40 border border-white/10">
                  {isAdmin ? 'Unlimited Creation' : '1 Bot Max'}
                </span>
              </div>
              <p className="text-zinc-300 text-[11px]">
                {isAdmin
                  ? 'Administrator accounts have unlimited server creation slots, custom RAM allocations up to 64GB, unrestricted CPU cores, and multi-node cluster control.'
                  : 'Free tier user accounts are assigned 1 server creation slot, 512MB RAM, 1.0GB NVMe storage, and 50% CPU allocation.'}
              </p>
            </div>

            {/* Live Quota Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Bot Servers Quota */}
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-2">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                    <Server className="w-4 h-4 text-purple-400" /> Server Creation Slots
                  </span>
                  <span className="font-mono text-zinc-300 font-bold">
                    {isAdmin ? `${serversCount} / ∞ Unlimited` : `${serversCount} / 1 Slot`}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${serversCount >= 1 && !isAdmin ? 'bg-amber-400' : 'bg-purple-500'}`}
                    style={{ width: isAdmin ? `${Math.min(serversCount * 20, 100)}%` : `${serversCount * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-zinc-500 flex justify-between">
                  <span>{isAdmin ? 'Unlimited instances' : 'Limit: 1 Bot Server'}</span>
                  <span>{serversCount >= 1 && !isAdmin ? 'Slot Full' : 'Available'}</span>
                </div>
              </div>

              {/* RAM Allocation Quota */}
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-2">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                    <Layers className="w-4 h-4 text-cyan-400" /> RAM Memory Quota
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {isAdmin ? 'Custom (Up to 32GB+)' : '512 MB Max'}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-cyan-500" style={{ width: isAdmin ? '35%' : '100%' }} />
                </div>
                <div className="text-[10px] text-zinc-500 flex justify-between">
                  <span>{isAdmin ? 'Dynamic per server' : '512 MB per container'}</span>
                  <span>{isAdmin ? 'Custom allocation' : 'Enforced'}</span>
                </div>
              </div>

              {/* CPU Quota */}
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-2">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                    <Cpu className="w-4 h-4 text-purple-400" /> CPU Core Quota
                  </span>
                  <span className="font-mono text-purple-300 font-bold">
                    {isAdmin ? 'Unlimited / Multi-Core' : '50% (0.5 Core)'}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: isAdmin ? '25%' : '100%' }} />
                </div>
                <div className="text-[10px] text-zinc-500 flex justify-between">
                  <span>{isAdmin ? 'Up to 1600% (16 Cores)' : 'Capped at 50%'}</span>
                  <span>{isAdmin ? 'Unrestricted' : 'Enforced'}</span>
                </div>
              </div>

              {/* Storage Quota */}
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-2">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                    <HardDrive className="w-4 h-4 text-blue-400" /> NVMe Permanent Disk
                  </span>
                  <span className="font-mono text-blue-300 font-bold">
                    {isAdmin ? 'Unlimited / 100GB+' : '1.0 GB (1024 MB)'}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: isAdmin ? '15%' : '100%' }} />
                </div>
                <div className="text-[10px] text-zinc-500 flex justify-between">
                  <span>SQLite WAL & File storage</span>
                  <span>{isAdmin ? 'Unrestricted' : 'Enforced'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY & 2FA */}
        {activeTab === 'security' && (
          <div className="space-y-4 text-xs">
            {/* TOTP 2FA Box */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-bold text-zinc-200 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    Two-Factor Authentication (TOTP)
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Require an authenticator app code (Google Authenticator, Authy, 1Password) on sign in.
                  </p>
                </div>
                <button
                  onClick={handleToggle2FA}
                  disabled={toggling2FA}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    is2FAEnabled
                      ? 'bg-rose-950 text-rose-300 border border-rose-500/40 hover:bg-rose-900'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  }`}
                >
                  {toggling2FA ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : is2FAEnabled ? (
                    <Unlock className="w-3.5 h-3.5" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                  <span>{is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}</span>
                </button>
              </div>

              {is2FAEnabled && (
                <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-2 mt-2">
                  <div className="text-[11px] font-semibold text-cyan-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 2FA is Active on your account
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Authenticator Key: <code className="bg-black/60 px-2 py-0.5 rounded text-cyan-200 font-mono">JBSWY3DPEHPK3PXP</code>
                  </div>
                </div>
              )}
            </div>

            {/* Active Sessions & Logout All */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-bold text-zinc-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    Session Management
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Revoke active login cookies and tokens across all mobile and desktop devices.
                  </p>
                </div>
                <button
                  onClick={handleRevokeAllSessions}
                  disabled={revokingSessions}
                  className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  {revokingSessions ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  <span>Sign Out All Devices</span>
                </button>
              </div>

              {revokeSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center gap-1.5 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  All other active sessions and cookies have been revoked.
                </div>
              )}
            </div>

            {/* Quick Switch User Option */}
            <div className="p-3.5 rounded-xl border border-zinc-800/80 bg-slate-900/40 flex items-center justify-between">
              <div className="text-[11px] text-zinc-400">
                Need to test as another user or administrator?
              </div>
              <button
                onClick={() => {
                  onClose();
                  if (onLogout) onLogout();
                }}
                className="text-purple-400 hover:text-purple-300 text-[11px] font-semibold underline"
              >
                Sign In With Another Account
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
