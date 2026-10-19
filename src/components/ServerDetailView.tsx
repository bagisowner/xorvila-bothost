import React, { useState, useEffect } from 'react';
import { BotServer, ServerStats } from '../types';
import { fetchApi } from '../lib/api';
import { RuntimeLogo } from './RuntimeLogo';
import {
  Activity,
  Terminal,
  FolderTree,
  Play,
  Key,
  Globe,
  Archive,
  GitBranch,
  Settings,
  ArrowLeft,
  Server,
  Zap,
  Check,
  RotateCw,
  Square,
  Skull,
  Cpu,
  HardDrive,
  Clock,
  Radio,
  ExternalLink,
  Wifi,
  ChevronDown
} from 'lucide-react';
import { XorvilaAiIcon } from './icons/XorvilaAiIcon';
import { SuspendedView } from './SuspendedView';
import { OverviewTab } from './tabs/OverviewTab';
import { ConsoleTab } from './tabs/ConsoleTab';
import { FilesTab } from './tabs/FilesTab';
import { StartupTab } from './tabs/StartupTab';
import { EnvTab } from './tabs/EnvTab';
import { SftpTab } from './tabs/SftpTab';
import { BackupsTab } from './tabs/BackupsTab';
import { GitTab } from './tabs/GitTab';
import { SettingsTab } from './tabs/SettingsTab';
import { useNotifications } from '../lib/notifications';

interface Props {
  serverId: string;
  initialTab?: string;
  servers?: BotServer[];
  onBack: () => void;
  onSelectServer?: (serverId: string, tab?: string) => void;
  onTabChange?: (tab: string) => void;
  onOpenAiDebugger?: (logsText?: string) => void;
}

export const ServerDetailView: React.FC<Props> = ({
  serverId,
  initialTab = 'overview',
  servers = [],
  onBack,
  onSelectServer,
  onTabChange,
  onOpenAiDebugger
}) => {
  const { addToast } = useNotifications();
  const [server, setServer] = useState<BotServer | null>(() => {
    return servers.find(s => s.id === serverId) || null;
  });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [serverPickerOpen, setServerPickerOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const existing = servers.find(s => s.id === serverId);
    if (existing) {
      setServer(existing);
      if (existing.stats) {
        setStats(existing.stats);
      }
    }
    loadServer();
  }, [serverId, servers]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const [stats, setStats] = useState<ServerStats>(() => {
    const existing = servers.find(s => s.id === serverId);
    return existing?.stats || {
      cpuUsage: 0,
      ramUsage: 0,
      ramLimit: existing?.ramLimit || 512,
      storageUsage: 0,
      storageLimit: existing?.storageLimit || 2048,
      netRx: 0,
      netTx: 0,
      pids: 0,
      uptimeSeconds: existing?.uptimeSeconds || 0
    };
  });

  const loadServer = async () => {
    try {
      const res = await fetchApi<BotServer>(`/servers/${serverId}`);
      if (res.success && res.data) {
        setServer(res.data);
        setLoadError(null);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      } else if (!server) {
        setLoadError(res.error?.message || 'Bot server not found or permission denied.');
      }
    } catch (e: any) {
      if (!server) {
        setLoadError(e.message || 'Failed to load bot server details.');
      }
    }
  };

  // WebSocket for stats & status updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?serverId=${serverId}`;

    let ws: WebSocket;
    let timer: any;

    function connect() {
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'STATS') {
              setStats(msg.data);
            } else if (msg.type === 'STATUS') {
              setServer(prev => prev ? { ...prev, status: msg.data } : null);
            }
          } catch (e) {}
        };
        ws.onclose = () => {
          timer = setTimeout(connect, 3000);
        };
      } catch (e) {}
    }

    connect();

    return () => {
      clearTimeout(timer);
      if (ws) ws.close();
    };
  }, [serverId]);

  if (!server) {
    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-400 glass-panel rounded-2xl p-8 space-y-4 text-center">
          <div className="p-3.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Server className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-zinc-100">Server Not Found</h3>
          <p className="text-xs text-zinc-400 max-w-md">{loadError}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 transition-all cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-[400px] text-zinc-400 glass-panel rounded-2xl p-8">
        <RotateCw className="w-6 h-6 animate-spin text-purple-400 mr-3" />
        <span className="font-mono text-sm">Connecting to container sandbox...</span>
      </div>
    );
  }

  const [actionPending, setActionPending] = useState(false);

  const handleStart = async () => {
    if (actionPending) return;
    setActionPending(true);
    setServer(prev => prev ? { ...prev, status: 'starting' } : null);
    addToast({
      type: 'info',
      title: 'Starting Container',
      message: `Spinning up runtime for ${server.name}...`
    });
    try {
      await fetchApi(`/servers/${server.id}/start`, { method: 'POST' });
    } finally {
      setTimeout(() => setActionPending(false), 2000);
    }
  };

  const handleStop = async () => {
    if (actionPending) return;
    setActionPending(true);
    setServer(prev => prev ? { ...prev, status: 'stopping' } : null);
    addToast({
      type: 'info',
      title: 'Stopping Container',
      message: `Sending SIGTERM to ${server.name}...`
    });
    try {
      await fetchApi(`/servers/${server.id}/stop`, { method: 'POST' });
    } finally {
      setTimeout(() => setActionPending(false), 2000);
    }
  };

  const handleRestart = async () => {
    if (actionPending) return;
    setActionPending(true);
    setServer(prev => prev ? { ...prev, status: 'restarting' } : null);
    addToast({
      type: 'info',
      title: 'Restarting Container',
      message: `Rebooting runtime for ${server.name}...`
    });
    try {
      await fetchApi(`/servers/${server.id}/restart`, { method: 'POST' });
    } finally {
      setTimeout(() => setActionPending(false), 2000);
    }
  };

  const handleKill = async () => {
    if (actionPending) return;
    setActionPending(true);
    setServer(prev => prev ? { ...prev, status: 'offline' } : null);
    addToast({
      type: 'warning',
      title: 'Forced Kill',
      message: `Sent SIGKILL to ${server.name}. Container terminated.`
    });
    try {
      await fetchApi(`/servers/${server.id}/kill`, { method: 'POST' });
    } finally {
      setTimeout(() => setActionPending(false), 2000);
    }
  };

  const formatUptime = (sec: number) => {
    if (!isOnline) return 'Offline';
    const effectiveSec = sec && sec > 0 ? sec : (server.uptimeSeconds || 3600);
    const d = Math.floor(effectiveSec / 86400);
    const h = Math.floor((effectiveSec % 86400) / 3600);
    const m = Math.floor((effectiveSec % 3600) / 60);
    const s = effectiveSec % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'console', label: 'Console', icon: Terminal },
    { id: 'files', label: 'Files', icon: FolderTree },
    { id: 'startup', label: 'Startup', icon: Play },
    { id: 'env', label: 'Environment', icon: Key },
    { id: 'sftp', label: 'SFTP', icon: Globe },
    { id: 'git', label: 'Git Deploy', icon: GitBranch },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const isOnline = server.status === 'online';
  const isStarting = server.status === 'starting' || server.status === 'restarting';

  if (server.suspended) {
    return (
      <SuspendedView
        type="server"
        serverName={server.name}
        onReturnHome={onBack}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Top Bar: Breadcrumb, Status, Node & Power Controls */}
      <div className="glass-panel rounded-2xl p-5 glow-ambient flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left side info */}
        <div className="flex items-start sm:items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[rgba(140,120,255,0.2)] text-zinc-300 hover:text-white transition-all shrink-0 cursor-pointer"
            title="Back to Servers Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setServerPickerOpen(prev => !prev)}
                  className="inline-flex items-center gap-1.5 group text-left cursor-pointer focus:outline-none"
                  title={servers.length > 1 ? "Click to switch bot instance" : server.name}
                >
                  <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight group-hover:text-purple-300 transition-colors">
                    {server.name}
                  </h1>
                  {servers && servers.length > 1 && (
                    <span className="p-1 rounded-md bg-white/[0.05] group-hover:bg-purple-500/20 text-zinc-400 group-hover:text-purple-300 transition-all">
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${serverPickerOpen ? 'rotate-180' : ''}`} />
                    </span>
                  )}
                </button>

                {/* Instant Server Switcher Dropdown */}
                {serverPickerOpen && servers && servers.length > 1 && (
                  <div className="absolute left-0 top-full mt-2 w-72 rounded-xl bg-[#090d1a] border border-[rgba(140,120,255,0.25)] shadow-[0_10px_35px_rgba(0,0,0,0.85)] z-50 p-2 space-y-1 backdrop-blur-2xl">
                    <div className="text-[10px] font-mono uppercase text-zinc-400 px-2 py-1 flex items-center justify-between border-b border-white/10">
                      <span>Switch Bot Instance</span>
                      <span className="text-purple-400 font-semibold">{servers.length} Instances</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5 pt-1">
                      {servers.map(s => {
                        const isCurrent = s.id === server.id;
                        const isOnline = s.status === 'online';
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setServerPickerOpen(false);
                              if (s.id !== server.id) {
                                onSelectServer?.(s.id, activeTab);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all text-left cursor-pointer ${
                              isCurrent
                                ? 'bg-purple-600/30 border border-purple-500/50 text-purple-200 font-semibold shadow-sm'
                                : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isOnline
                                    ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                                    : s.status === 'starting'
                                    ? 'bg-amber-400 animate-pulse'
                                    : 'bg-zinc-600'
                                }`}
                              />
                              <span className="truncate">{s.name}</span>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400 shrink-0 uppercase">
                              {s.runtime}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${
                  isOnline
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : isStarting
                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                    : 'bg-zinc-900/80 border-zinc-700/60 text-zinc-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                      : isStarting
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-zinc-600'
                  }`}
                />
                <span className="uppercase">{server.status}</span>
              </div>

              {/* Runtime Pill */}
              <span className="px-2.5 py-1 text-xs font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 rounded-lg flex items-center gap-1.5 shadow-sm">
                <RuntimeLogo runtime={server.runtime} version={server.version} showText={true} className="w-4 h-4" />
              </span>
            </div>

            <div className="text-xs text-zinc-400 mt-1 flex flex-wrap items-center gap-2 font-mono">
              <span className="flex items-center gap-1 text-zinc-300">
                <Server className="w-3 h-3 text-purple-400" />
                {server.nodeName}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-cyan-400">{server.nodeIp}:{server.port}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400 truncate max-w-xs">{server.id}</span>
            </div>
          </div>
        </div>

        {/* Right side power buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* AI Diagnoser */}
          {onOpenAiDebugger && (
            <button
              onClick={() => onOpenAiDebugger()}
              className="px-3 py-2 text-xs font-medium rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Diagnose bot logs with XorvilaAi"
            >
              <XorvilaAiIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>AI Diagnoser</span>
            </button>
          )}

          {isOnline ? (
            <>
              <button
                onClick={handleRestart}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-950/40 hover:bg-amber-950/70 text-amber-300 border border-amber-500/40 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>

              <button
                onClick={handleStop}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-950/50 hover:bg-rose-950/80 text-rose-300 border border-rose-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.2)]"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>

              <button
                onClick={handleKill}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-white/[0.08] transition-colors cursor-pointer"
                title="Force Kill (SIGKILL)"
              >
                <Skull className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={handleStart}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)] cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Bot</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Real-Time Resource Consumption Gauge Strip (Symmetrical 4-Card Layout) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* CPU */}
        <div className="glass-panel rounded-xl p-4 flex flex-col justify-between hover:border-purple-500/40 transition-all group">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
            <span className="flex items-center gap-1.5 text-purple-300 font-semibold">
              <Cpu className="w-4 h-4 text-purple-400 shrink-0" /> CPU Load
            </span>
            <span className="font-mono text-xs font-bold text-zinc-100">{stats.cpuUsage}%</span>
          </div>
          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 my-2 overflow-hidden p-0.5 border border-white/5">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_#a855f7]"
              style={{ width: `${Math.min(100, Math.max(5, stats.cpuUsage))}%` }}
            />
          </div>
          <div className="text-[10px] font-mono text-zinc-400 flex justify-between items-center pt-1 border-t border-white/[0.05]">
            <span className="whitespace-nowrap">{stats.pids || 1} active threads</span>
            <span className="whitespace-nowrap">Limit: {server.cpuLimit}%</span>
          </div>
        </div>

        {/* Memory */}
        <div className="glass-panel rounded-xl p-4 flex flex-col justify-between hover:border-cyan-500/40 transition-all group">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
            <span className="flex items-center gap-1.5 text-cyan-300 font-semibold">
              <Activity className="w-4 h-4 text-cyan-400 shrink-0" /> RAM Memory
            </span>
            <span className="font-mono text-xs font-bold text-zinc-100">{Math.round(stats.ramUsage || 0)} MB</span>
          </div>
          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 my-2 overflow-hidden p-0.5 border border-white/5">
            <div
              className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_#22d3ee]"
              style={{
                width: `${Math.min(100, Math.max(5, ((stats.ramUsage || 0) / (server.ramLimit || 512)) * 100))}%`
              }}
            />
          </div>
          <div className="text-[10px] font-mono text-zinc-400 flex justify-between items-center pt-1 border-t border-white/[0.05]">
            <span className="whitespace-nowrap">{Math.round(((stats.ramUsage || 0) / (server.ramLimit || 512)) * 100)}% Used</span>
            <span className="whitespace-nowrap">Limit: {server.ramLimit || 512} MB</span>
          </div>
        </div>

        {/* Storage */}
        <div className="glass-panel rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/40 transition-all group">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
            <span className="flex items-center gap-1.5 text-indigo-300 font-semibold">
              <HardDrive className="w-4 h-4 text-indigo-400 shrink-0" /> Disk Storage
            </span>
            <span className="font-mono text-xs font-bold text-zinc-100">{Math.round(stats.storageUsage || 0)} MB</span>
          </div>
          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 my-2 overflow-hidden p-0.5 border border-white/5">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_#6366f1]"
              style={{
                width: `${Math.min(100, Math.max(5, ((stats.storageUsage || 0) / (server.storageLimit || 2048)) * 100))}%`
              }}
            />
          </div>
          <div className="text-[10px] font-mono text-zinc-400 flex justify-between items-center pt-1 border-t border-white/[0.05]">
            <span className="whitespace-nowrap">NVMe Container</span>
            <span className="whitespace-nowrap">Limit: {((server.storageLimit || 2048) / 1024).toFixed(1)} GB</span>
          </div>
        </div>

        {/* Active Container Uptime & Availability */}
        <div className="glass-panel rounded-xl p-4 flex flex-col justify-between hover:border-emerald-500/40 transition-all group">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
            <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0" /> System Uptime
            </span>
            <span className="font-mono text-[10px] font-bold text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/40 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse' : 'bg-zinc-500'}`} />
              {isOnline ? 'ONLINE' : server.status.toUpperCase()}
            </span>
          </div>
          
          <div className="my-1 text-base font-extrabold font-mono text-emerald-300">
            {formatUptime(stats.uptimeSeconds)}
          </div>

          <div className="text-[10px] font-mono text-zinc-400 flex justify-between items-center pt-1 border-t border-white/[0.05]">
            <span className="whitespace-nowrap text-cyan-400 font-medium">Port {server.port}</span>
            <span className="whitespace-nowrap text-zinc-400 truncate max-w-[100px]">{server.nodeName}</span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Subtabs Bar */}
      <div className="flex items-center gap-1 border-b border-[rgba(140,120,255,0.15)] pb-px overflow-x-auto no-scrollbar">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`px-3.5 py-2.5 text-xs font-medium rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap border-t border-x cursor-pointer ${
                isActive
                  ? 'bg-slate-950/80 dark:bg-[#080B18] border-[rgba(140,120,255,0.3)] text-cyan-300 shadow-[0_-2px_15px_rgba(139,92,246,0.15)] -mb-px font-semibold'
                  : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-zinc-500'}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Subtab Content Viewports with key={server.id} for pristine state isolation */}
      <div key={server.id} className="pt-1">
        {activeTab === 'overview' && (
          <OverviewTab
            server={server}
            stats={stats}
            onStart={handleStart}
            onStop={handleStop}
            onRestart={handleRestart}
            onKill={handleKill}
            onNavigateTab={tab => handleTabChange(tab)}
          />
        )}
        {activeTab === 'console' && (
          <ConsoleTab
            server={server}
            onOpenAiDebugger={onOpenAiDebugger}
          />
        )}
        {activeTab === 'files' && (
          <FilesTab server={server} onNavigateTab={tab => handleTabChange(tab)} />
        )}
        {activeTab === 'startup' && (
          <StartupTab server={server} onUpdate={s => setServer(s)} />
        )}
        {activeTab === 'env' && (
          <EnvTab server={server} onUpdate={s => setServer(s)} />
        )}
        {activeTab === 'sftp' && <SftpTab server={server} />}
        {activeTab === 'backups' && <BackupsTab server={server} />}
        {activeTab === 'git' && <GitTab server={server} onUpdate={s => setServer(s)} />}
        {activeTab === 'settings' && (
          <SettingsTab
            server={server}
            onUpdate={s => setServer(s)}
            onDelete={onBack}
          />
        )}
      </div>
    </div>
  );
};
