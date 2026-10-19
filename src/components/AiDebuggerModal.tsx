import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Terminal,
  Cpu,
  RefreshCw,
  FileCode,
  Wrench,
  Bot,
  Zap,
  Code
} from 'lucide-react';
import { XorvilaAiIcon } from './icons/XorvilaAiIcon';
import { BotServer } from '../types';

interface AiDiagnosticResult {
  summary: string;
  severity: 'critical' | 'warning' | 'info';
  culprit: string;
  solutionSteps: string[];
  suggestedCodeFix?: string;
  autoHealable?: boolean;
  detailedAnalysis?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialLogs?: string;
  currentServer?: BotServer | null;
}

const PRESET_ERRORS = [
  {
    title: 'Discord Missing Intents',
    lang: 'python',
    logs: `discord.errors.PrivilegedIntentsRequired: Shard ID None is requesting privileged intents that are not enabled in the developer portal: 'message_content'.
Traceback (most recent call last):
  File "main.py", line 42, in <module>
    bot.run(TOKEN)`
  },
  {
    title: 'Python Missing Module',
    lang: 'python',
    logs: `Traceback (most recent call last):
  File "main.py", line 4, in <module>
    import aiohttp
ModuleNotFoundError: No module named 'aiohttp'`
  },
  {
    title: 'Port Already In Use',
    lang: 'nodejs',
    logs: `Error: listen EADDRINUSE: address already in use :::3000
    at Server.setupListenHandle [as _listen2] (node:net:1904:16)
    at listenInCluster (node:net:1971:12)
    at Server.listen (node:net:2069:7)`
  },
  {
    title: 'Invalid Bot Token',
    lang: 'python',
    logs: `discord.errors.LoginFailure: Improper token has been passed.
Traceback (most recent call last):
  File "main.py", line 65, in <module>
    client.run(os.getenv("TOKEN"))`
  }
];

export const AiDebuggerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialLogs = '',
  currentServer
}) => {
  const [logs, setLogs] = useState('');
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState<'python' | 'nodejs'>('python');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiDiagnosticResult | null>(null);
  const [resultSource, setResultSource] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (initialLogs) {
      setLogs(initialLogs);
    }
    if (currentServer?.type === 'nodejs') {
      setLanguage('nodejs');
    } else {
      setLanguage('python');
    }
  }, [initialLogs, currentServer]);

  if (!isOpen) return null;

  const handleFetchServerLogs = async () => {
    if (!currentServer) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/servers/${currentServer.id}/logs`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const text = data.data.map((l: any) => `[${l.type.toUpperCase()}] ${l.text}`).join('\n');
        setLogs(text || 'No logs recorded yet for this server.');
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiagnose = async () => {
    if (!logs.trim() && !query.trim()) {
      setFetchError('Please provide error logs or an issue description to analyze.');
      return;
    }
    setFetchError(null);
    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: currentServer?.id,
          logs: logs.trim(),
          query: query.trim(),
          language
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        setResult(json.data);
        setResultSource(json.source?.includes('gemini') ? 'XorvilaAi Core' : (json.source || 'XorvilaAi Core'));
      } else {
        setFetchError(json.error || 'Failed to complete diagnosis');
      }
    } catch (err: any) {
      setFetchError(err.message || 'Network error communicating with AI server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyFix = () => {
    if (!result?.suggestedCodeFix) return;
    navigator.clipboard.writeText(result.suggestedCodeFix);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-purple-500/30 bg-slate-950 shadow-[0_0_50px_rgba(168,85,247,0.25)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-purple-500/20 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 p-0.5 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <XorvilaAiIcon className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Xorvila AI Log Debugger & Core Analyzer
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  XorvilaAi Engine
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Directly paste error logs or server tracebacks for instant root cause diagnosis, fix steps, and corrected code.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-slate-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Quick presets & server load bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/60 border border-zinc-800 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-zinc-400 font-medium">Quick Presets:</span>
              {PRESET_ERRORS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setLogs(preset.logs);
                    setLanguage(preset.lang as any);
                    setQuery(`Diagnose why this ${preset.title} occurred.`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-950/60 hover:text-cyan-300 hover:border-purple-500/40 border border-zinc-700 text-zinc-300 text-[11px] transition-all font-mono"
                >
                  {preset.title}
                </button>
              ))}
            </div>

            {currentServer && (
              <button
                onClick={handleFetchServerLogs}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold flex items-center gap-1.5 transition-all"
              >
                <Terminal className="w-3.5 h-3.5" />
                Pull Logs from {currentServer.name}
              </button>
            )}
          </div>

          {/* Input Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Logs Area */}
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  Terminal Logs / Error Traceback:
                </label>
                <button
                  onClick={() => setLogs('')}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300"
                >
                  Clear
                </button>
              </div>
              <textarea
                value={logs}
                onChange={(e) => setLogs(e.target.value)}
                placeholder="Paste Python traceback, Node.js crash log, Discord API error, or terminal console output here..."
                rows={7}
                className="w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-purple-500 p-3 text-xs font-mono text-cyan-200 placeholder-zinc-600 focus:outline-none transition-all"
              />
            </div>

            {/* Language & Query Options */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Bot Runtime Environment:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLanguage('python')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      language === 'python'
                        ? 'bg-purple-950/70 border-purple-500 text-cyan-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                        : 'bg-slate-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-yellow-400" /> Python
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('nodejs')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      language === 'nodejs'
                        ? 'bg-purple-950/70 border-purple-500 text-cyan-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                        : 'bg-slate-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5 text-emerald-400" /> Node.js
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Specific Question (Optional):
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., Why won't my slash commands register?"
                  className="w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-purple-500 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
                />
              </div>

              <button
                onClick={handleDiagnose}
                disabled={isLoading}
                className="w-full py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)] flex items-center justify-center gap-2 min-h-[44px]"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing with XorvilaAi...
                  </>
                ) : (
                  <>
                    <XorvilaAiIcon className="w-4 h-4 text-cyan-300" />
                    Diagnose & Generate Fix
                  </>
                )}
              </button>
            </div>
          </div>

          {fetchError && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fetchError}</span>
            </div>
          )}

          {/* AI Diagnosis Output Card */}
          {result && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
              {/* Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      result.severity === 'critical'
                        ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]'
                        : result.severity === 'warning'
                        ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]'
                        : 'bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                    }`}
                  />
                  <h4 className="text-sm font-bold text-white">{result.summary}</h4>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded ${
                      result.severity === 'critical'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : result.severity === 'warning'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    }`}
                  >
                    {result.severity} Issue
                  </span>
                  <span className="text-[11px] font-mono text-cyan-300/90 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-1">
                    <XorvilaAiIcon className="w-3 h-3" />
                    Engine: XorvilaAi
                  </span>
                </div>
              </div>

              {/* Culprit Identification */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-zinc-800/80 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  Root Cause Identified:
                </span>
                <p className="text-xs text-zinc-200 font-sans leading-relaxed">{result.culprit}</p>
              </div>

              {/* Step-by-step fix */}
              {result.solutionSteps && result.solutionSteps.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-cyan-400" />
                    How to Fix This:
                  </span>
                  <div className="space-y-1.5">
                    {result.solutionSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-zinc-300 p-2.5 rounded-xl bg-slate-950/50 border border-zinc-800/60"
                      >
                        <span className="w-5 h-5 rounded-full bg-purple-900/60 border border-purple-500/40 text-cyan-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Code Fix */}
              {result.suggestedCodeFix && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <Code className="w-4 h-4 text-emerald-400" />
                      Corrected Code / Solution Patch:
                    </span>
                    <button
                      onClick={handleCopyFix}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-purple-950/60 hover:bg-purple-900 text-cyan-300 border border-purple-500/40 flex items-center gap-1.5 transition-all"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-slate-950 border border-zinc-800 text-xs font-mono text-emerald-300 overflow-x-auto">
                    {result.suggestedCodeFix}
                  </pre>
                </div>
              )}

              {/* Detailed Explanation */}
              {result.detailedAnalysis && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-zinc-800/60 text-xs text-zinc-400 leading-relaxed">
                  <span className="font-semibold text-zinc-300 block mb-1">Detailed Explanation:</span>
                  {result.detailedAnalysis}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-purple-500/20 bg-slate-900/80 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            AI Bot Diagnosis is always active without manual key requirement.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-200 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
