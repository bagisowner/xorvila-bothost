import React, { useState, useEffect } from 'react';
import { ApiToken, User } from '../types';
import { fetchApi } from '../lib/api';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  Shield,
  Code2,
  RotateCw,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  X
} from 'lucide-react';

interface Props {
  currentUser: User | null;
  onNavigateToDocs?: () => void;
}

export const ApiTokensView: React.FC<Props> = ({ currentUser, onNavigateToDocs }) => {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [tokenExpiration, setTokenExpiration] = useState('365');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'servers:read',
    'servers:write',
    'console:exec'
  ]);
  const [creating, setCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg: string } | null>(null);
  const [snippetLang, setSnippetLang] = useState<'curl' | 'python' | 'node'>('curl');

  const availableScopes = [
    { id: 'servers:read', name: 'Read Containers', desc: 'Inspect status, hardware metrics & environment' },
    { id: 'servers:write', name: 'Manage Containers', desc: 'Start, stop, reboot & provision new bots' },
    { id: 'console:exec', name: 'Execute Commands', desc: 'Send commands to interactive bot consoles' },
    { id: 'files:manage', name: 'File Storage Access', desc: 'Read, edit & deploy project source files' }
  ];

  const loadTokens = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;
    setCreating(true);

    const res = await fetchApi<ApiToken>('/auth/tokens', {
      method: 'POST',
      body: JSON.stringify({
        name: newTokenName.trim(),
        expirationDays: Number(tokenExpiration),
        scopes: selectedScopes
      })
    });

    if (res.success && res.data) {
      setCreatedSecret(res.data.token);
      setTokens(prev => [res.data!, ...prev]);
      setNewTokenName('');
    }
    setCreating(false);
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (!window.confirm('Are you sure you want to revoke this API token? Any active bot scripts using it will be unauthorized.')) {
      return;
    }
    const res = await fetchApi(`/auth/tokens/${tokenId}`, { method: 'DELETE' });
    if (res.success) {
      setTokens(prev => prev.filter(t => t.id !== tokenId && t.token !== tokenId));
      if (testResult?.id === tokenId) setTestResult(null);
    }
  };

  const handleTestToken = async (token: ApiToken) => {
    setTestingId(token.id);
    setTestResult(null);
    try {
      const res = await fetchApi<{ success: boolean }>('/servers', {
        headers: { Authorization: `Bearer ${token.token}` }
      });
      if (res.success) {
        setTestResult({
          id: token.id,
          success: true,
          msg: 'Token authenticated successfully! 200 OK'
        });
      } else {
        setTestResult({
          id: token.id,
          success: false,
          msg: res.error?.message || 'Authentication failed'
        });
      }
    } catch (err: any) {
      setTestResult({
        id: token.id,
        success: false,
        msg: 'Connection check error'
      });
    } finally {
      setTestingId(null);
    }
  };

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const toggleScope = (scopeId: string) => {
    if (selectedScopes.includes(scopeId)) {
      setSelectedScopes(selectedScopes.filter(s => s !== scopeId));
    } else {
      setSelectedScopes([...selectedScopes, scopeId]);
    }
  };

  const sampleToken = tokens[0]?.token || 'xor_live_xxxxxxxxxxxxxxxxxxxxxxxx';

  return (
    <div id="api-tokens-view" className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#080B18]/90 border border-[rgba(140,120,255,0.2)] shadow-xl glass-panel relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-purple-600/10 to-transparent pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 shrink-0">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
              API Tokens & Access Keys
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
              Create and manage secure API credentials to automate container lifecycle, deploy bots via CI/CD pipelines, and stream metrics via the Xorvila REST API.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setCreatedSecret(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Token</span>
          </button>
        </div>
      </div>

      {/* Main Token List & Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tokens List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 font-mono">
                Active Personal Tokens
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/30">
                {tokens.length}
              </span>
            </div>
            <button
              onClick={loadTokens}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors"
              title="Refresh tokens"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loading && tokens.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#080B18]/60 border border-white/[0.06] text-center text-zinc-400">
              <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
              <p className="text-xs">Loading secure credentials...</p>
            </div>
          ) : tokens.length === 0 ? (
            <div className="p-10 rounded-2xl bg-[#080B18]/60 border border-[rgba(140,120,255,0.15)] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
                <Key className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">No API Tokens Generated</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                You have not created any API tokens yet. Generate a token to authenticate HTTP requests or SDK scripts.
              </p>
              <button
                onClick={() => {
                  setCreatedSecret(null);
                  setIsModalOpen(true);
                }}
                className="mt-2 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-xs text-zinc-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-purple-400" />
                <span>Create Token Now</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map(t => {
                const isTesting = testingId === t.id;
                const result = testResult?.id === t.id ? testResult : null;
                const displayPrefix = t.token.substring(0, 10);

                return (
                  <div
                    key={t.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#080B18]/80 border border-[rgba(140,120,255,0.15)] hover:border-purple-500/40 shadow-lg glass-panel transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-300 shrink-0">
                          <Key className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                            <span>{t.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                              Active
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            <span>Created {new Date(t.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => handleTestToken(t)}
                          disabled={isTesting}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-zinc-300 transition-colors"
                          title="Verify token against live cluster"
                        >
                          <RotateCw className={`w-3.5 h-3.5 text-cyan-400 ${isTesting ? 'animate-spin' : ''}`} />
                          <span>{isTesting ? 'Testing...' : 'Test'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteToken(t.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/30 text-xs text-rose-300 transition-colors"
                          title="Revoke Token"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>Revoke</span>
                        </button>
                      </div>
                    </div>

                    {/* Token Value Key Display */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/50 border border-white/[0.06] font-mono text-xs text-zinc-300">
                      <span className="truncate mr-2 text-zinc-400">
                        {displayPrefix}••••••••••••••••••••••••
                      </span>
                      <button
                        onClick={() => copyToClipboard(t.id, t.token)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-zinc-200 transition-colors shrink-0"
                      >
                        {copiedKey === t.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-sans">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-zinc-400" />
                            <span className="font-sans">Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Test result status */}
                    {result && (
                      <div
                        className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                          result.success
                            ? 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-950/30 border border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {result.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span>{result.msg}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Quick Integration Guide & Snippet */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#080B18]/80 border border-[rgba(140,120,255,0.18)] shadow-lg glass-panel space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
                  Authentication Header
                </h3>
              </div>
              <div className="flex gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
                {(['curl', 'python', 'node'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSnippetLang(lang)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                      snippetLang === lang
                        ? 'bg-purple-600 text-white font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Include your token in the <code className="text-purple-300 bg-purple-950/60 px-1 py-0.5 rounded border border-purple-500/30 font-mono text-[11px]">Authorization</code> header as a Bearer token with every request.
            </p>

            <div className="relative group">
              <pre className="p-3.5 rounded-xl bg-black/70 border border-white/10 text-cyan-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
                {snippetLang === 'curl' && (
                  `curl -X GET "https://api.xorvila.com/api/servers" \\\n  -H "Authorization: Bearer ${sampleToken}"`
                )}
                {snippetLang === 'python' && (
                  `import requests\n\nheaders = {"Authorization": "Bearer ${sampleToken}"}\nres = requests.get("https://api.xorvila.com/api/servers", headers=headers)\nprint(res.json())`
                )}
                {snippetLang === 'node' && (
                  `const res = await fetch('https://api.xorvila.com/api/servers', {\n  headers: { 'Authorization': 'Bearer ${sampleToken}' }\n});\nconsole.log(await res.json());`
                )}
              </pre>

              <button
                onClick={() => {
                  let text = `curl -X GET "https://api.xorvila.com/api/servers" -H "Authorization: Bearer ${sampleToken}"`;
                  if (snippetLang === 'python') {
                    text = `import requests\nheaders = {"Authorization": "Bearer ${sampleToken}"}\nres = requests.get("https://api.xorvila.com/api/servers", headers=headers)\nprint(res.json())`;
                  } else if (snippetLang === 'node') {
                    text = `const res = await fetch('https://api.xorvila.com/api/servers', { headers: { 'Authorization': 'Bearer ${sampleToken}' } });\nconsole.log(await res.json());`;
                  }
                  copyToClipboard('sidebar-snippet', text);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 text-xs transition-colors"
                title="Copy snippet"
              >
                {copiedKey === 'sidebar-snippet' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {onNavigateToDocs && (
              <button
                onClick={onNavigateToDocs}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs text-purple-400 hover:text-purple-300 hover:underline transition-colors font-medium"
              >
                <span>Read Full REST API Documentation</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-xs text-zinc-400 space-y-2">
            <div className="flex items-center gap-2 text-purple-300 font-semibold">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Token Security Best Practices</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Never commit your personal access tokens to public GitHub repositories or client-side web apps. If compromised, revoke immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Generate Token Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#080B18] border border-[rgba(140,120,255,0.25)] shadow-2xl p-6 glass-panel space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-zinc-100">
                  {createdSecret ? 'Token Generated' : 'Generate New API Token'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createdSecret ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-amber-200">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Copy this token now</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    This is the only time your token will be displayed in full. Keep it secret and store it in your password manager or environment file.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Your New Token:</label>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-black/60 border border-purple-500/40 font-mono text-xs text-purple-300">
                    <span className="truncate flex-1 select-all">{createdSecret}</span>
                    <button
                      onClick={() => copyToClipboard('modal-created', createdSecret)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-sans text-xs font-semibold transition-colors shrink-0"
                    >
                      {copiedKey === 'modal-created' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.08] flex justify-end">
                  <button
                    onClick={() => {
                      setCreatedSecret(null);
                      setIsModalOpen(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-zinc-200 transition-colors"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateToken} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Token Description Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GitHub Actions CI Deployer, Discord Bot Daemon"
                    value={newTokenName}
                    onChange={e => setNewTokenName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 focus:border-purple-500 text-xs text-zinc-100 placeholder-zinc-500 outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Expiration</label>
                  <select
                    value={tokenExpiration}
                    onChange={e => setTokenExpiration(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 focus:border-purple-500 text-xs text-zinc-100 outline-none transition-colors"
                  >
                    <option value="30">30 Days</option>
                    <option value="90">90 Days</option>
                    <option value="365">1 Year</option>
                    <option value="0">Never Expires</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-300">Configured Scopes</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                    {availableScopes.map(sc => {
                      const checked = selectedScopes.includes(sc.id);
                      return (
                        <div
                          key={sc.id}
                          onClick={() => toggleScope(sc.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                            checked
                              ? 'bg-purple-950/30 border-purple-500/40 text-zinc-200'
                              : 'bg-black/30 border-white/[0.06] text-zinc-400 hover:border-white/10'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            className="mt-0.5 accent-purple-600 rounded"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-zinc-200">{sc.name}</div>
                            <div className="text-[11px] text-zinc-400 font-mono">{sc.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newTokenName.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{creating ? 'Generating...' : 'Generate Token'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
