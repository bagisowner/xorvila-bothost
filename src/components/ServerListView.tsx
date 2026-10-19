import React, { useState, useEffect } from 'react';
import { BotServer, RuntimeLanguage, ServerStatus, User } from '../types';
import { RuntimeLogo } from './RuntimeLogo';
import {
  Server,
  Play,
  Square,
  RotateCw,
  Terminal,
  FolderTree,
  Plus,
  Search,
  Filter,
  Cpu,
  Activity,
  HardDrive,
  Clock,
  Bot,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ExternalLink,
  Layers,
  LayoutGrid,
  List,
  ChevronRight,
  MoreVertical,
  Wifi,
  ArrowUpRight
} from 'lucide-react';
import { DashboardSkeleton } from './SkeletonLoader';


interface Props {
  currentUser: User | null;
  servers: BotServer[];
  loading: boolean;
  onSelectServer: (serverId: string, initialTab?: string) => void;
  onOpenCreateModal: () => void;
  onStartServer: (id: string, e: React.MouseEvent) => void;
  onStopServer: (id: string, e: React.MouseEvent) => void;
  onRestartServer: (id: string, e: React.MouseEvent) => void;
  onOpenAiDebugger?: (logs?: string) => void;
}

export const ServerListView: React.FC<Props> = ({
  currentUser,
  servers,
  loading,
  onSelectServer,
  onOpenCreateModal,
  onStartServer,
  onStopServer,
  onRestartServer,
  onOpenAiDebugger
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [runtimeFilter, setRuntimeFilter] = useState<'all' | 'python' | 'node'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('xorvila_server_view_mode') as 'grid' | 'list') || 'grid';
  });

  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('xorvila_server_view_mode', mode);
  };

  const filteredServers = servers.filter(srv => {
    const matchSearch =
      srv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      srv.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      srv.nodeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      srv.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchRuntime = runtimeFilter === 'all' || srv.runtime === runtimeFilter;
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'online' && srv.status === 'online') ||
      (statusFilter === 'offline' && srv.status !== 'online');

    return matchSearch && matchRuntime && matchStatus;
  });

  // Calculate live aggregate stats
  const totalBots = servers.length;
  const onlineBots = servers.filter(s => s.status === 'online').length;
  const totalRamUsage = servers.reduce((acc, s) => acc + (s.stats?.ramUsage || 0), 0);
  const totalRamLimit = servers.reduce((acc, s) => acc + (s.ramLimit || s.stats?.ramLimit || 512), 0) || 512;
  const avgCpuUsage = totalBots > 0
    ? Math.round(servers.reduce((acc, s) => acc + (s.stats?.cpuUsage || 0), 0) / totalBots)
    : 0;
  const totalNetRx = servers.reduce((acc, s) => acc + (s.stats?.netRx || 0), 0);
  const totalDiskUsage = servers.reduce((acc, s) => acc + (s.stats?.storageUsage || 0), 0);
  const totalDiskLimit = servers.reduce((acc, s) => acc + (s.storageLimit || 1024), 0);
  const totalCpuLimit = servers.reduce((acc, s) => acc + (s.cpuLimit || 100), 0) || 100;

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatUptime = (sec: number, isOnline: boolean = true) => {
    if (!isOnline || !sec || sec <= 0) return 'Offline';
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // Sparkline data generator for the 6-metric strip
  const sparklineData = (baseVal: number, variance: number) => {
    return Array.from({ length: 10 }, (_, i) => {
      const noise = (Math.sin(i * 1.5) * variance) + (Math.random() * (variance * 0.5));
      return Math.max(2, Math.round(baseVal + noise));
    });
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* 1. Header & Greeting Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-5 sm:p-6 glow-ambient relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400 font-medium mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            <span>Permanent Bot Infrastructure</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {getGreeting()},{' '}
            <span className="bg-gradient-to-r from-purple-300 via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
              {currentUser?.name || 'Developer'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Your container cluster is healthy and all background services are synchronized.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-medium text-xs sm:text-sm shadow-[0_0_25px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all flex items-center gap-2 group cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
            <span>Deploy Bot</span>
          </button>
        </div>
      </div>

      {/* 2. Dense 5-Metric Strip with Next-Gen Glowing Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Metric 1: Active Bots */}
        <div className="glass-panel rounded-xl p-3.5 relative overflow-hidden group hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 mb-1">
            <span className="flex items-center gap-1.5 text-purple-300">
              <Server className="w-3.5 h-3.5 text-purple-400" /> Active Bots
            </span>
            <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-950/70 px-1.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
              {onlineBots} Live
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-zinc-100">{totalBots}</div>
            <div className="text-[10px] text-zinc-400 font-mono">instances</div>
          </div>
          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 mt-2.5 overflow-hidden p-0.5 border border-white/5">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_#a855f7]"
              style={{ width: `${totalBots > 0 ? Math.max(12, (onlineBots / totalBots) * 100) : 0}%` }}
            />
          </div>
        </div>

        {/* Metric 2: CPU Load */}
        <div className="glass-panel rounded-xl p-3.5 relative overflow-hidden group hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] transition-all">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 mb-1">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> CPU Load
            </span>
            <span className="text-[10px] font-mono font-semibold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
              Max: {totalCpuLimit || 100}%
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-zinc-100">{avgCpuUsage}%</div>
            <div className="text-[10px] text-zinc-400 font-mono">vCPU Avg</div>
          </div>
          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 mt-2.5 overflow-hidden p-0.5 border border-white/5">
            <div
              className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_#22d3ee]"
              style={{ width: `${Math.min(100, Math.max(8, avgCpuUsage))}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Memory */}
        <div className="glass-panel rounded-xl p-3.5 relative overflow-hidden group hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 mb-1">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <Activity className="w-3.5 h-3.5 text-indigo-400" /> Memory
            </span>
            <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-500/30">
              Max: {totalRamLimit || 512} MB
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2 gap-1">
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-zinc-100 whitespace-nowrap">
              {totalRamUsage} <span className="text-xs font-normal text-zinc-400">MB</span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono truncate">/ {totalRamLimit || 512} MB</div>
          </div>
          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 mt-2.5 overflow-hidden p-0.5 border border-white/5">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_#6366f1]"
              style={{ width: `${Math.min(100, Math.max(10, Math.round((totalRamUsage / (totalRamLimit || 512)) * 100)))}%` }}
            />
          </div>
        </div>

        {/* Metric 4: Online Ratio */}
        <div className="glass-panel rounded-xl p-3.5 relative overflow-hidden group hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)] transition-all">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 mb-1">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <Radio className="w-3.5 h-3.5 text-emerald-400" /> Online State
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
              {totalBots > 0 ? Math.round((onlineBots / totalBots) * 100) : 100}%
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2 gap-1">
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-zinc-100 whitespace-nowrap">
              {onlineBots} / {totalBots}
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">running</div>
          </div>
          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 mt-2.5 overflow-hidden p-0.5 border border-white/5">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_#34d399]"
              style={{ width: `${totalBots > 0 ? Math.max(10, Math.round((onlineBots / totalBots) * 100)) : 100}%` }}
            />
          </div>
        </div>

        {/* Metric 5: NVMe Storage */}
        <div className="glass-panel rounded-xl p-3.5 relative overflow-hidden group hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 mb-1">
            <span className="flex items-center gap-1.5 text-purple-300">
              <HardDrive className="w-3.5 h-3.5 text-purple-400" /> NVMe Storage
            </span>
            <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-500/30">
              Max: {((totalDiskLimit || 2048) / 1024).toFixed(1)} GB
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2 gap-1">
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-zinc-100 whitespace-nowrap">
              {totalDiskUsage} <span className="text-xs font-normal text-zinc-400">MB</span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">used</div>
          </div>
          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 mt-2.5 overflow-hidden p-0.5 border border-white/5">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_#a855f7]"
              style={{ width: `${Math.min(100, Math.max(8, Math.round((totalDiskUsage / (totalDiskLimit || 2048)) * 100)))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Controls Bar: Search, Filters, Grid/List Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search bots by name, node, ID or tags..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/60 border border-[rgba(140,120,255,0.18)] focus:border-purple-500/50 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Runtime Filter */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08]">
            <button
              onClick={() => setRuntimeFilter('all')}
              className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                runtimeFilter === 'all'
                  ? 'bg-purple-600/30 text-purple-200 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setRuntimeFilter('python')}
              className={`px-2.5 py-1 text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                runtimeFilter === 'python'
                  ? 'bg-purple-600/30 text-purple-200 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <RuntimeLogo runtime="python" className="w-3.5 h-3.5" /> Python
            </button>
            <button
              onClick={() => setRuntimeFilter('node')}
              className={`px-2.5 py-1 text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                runtimeFilter === 'node'
                  ? 'bg-purple-600/30 text-purple-200 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <RuntimeLogo runtime="node" className="w-3.5 h-3.5" /> Node.js
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-white/[0.08] text-zinc-200 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All States
            </button>
            <button
              onClick={() => setStatusFilter('online')}
              className={`px-2.5 py-1 text-xs rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === 'online'
                  ? 'bg-emerald-950/60 text-emerald-300 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online
            </button>
            <button
              onClick={() => setStatusFilter('offline')}
              className={`px-2.5 py-1 text-xs rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === 'offline'
                  ? 'bg-zinc-800 text-zinc-300 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" /> Stopped
            </button>
          </div>
        </div>

        {/* View Mode Toggle (Grid vs List) */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08] shrink-0 self-end sm:self-auto">
          <button
            onClick={() => handleSetViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'grid'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleSetViewMode('list')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'list'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5. Server Cards List or Empty State */}
      {filteredServers.length === 0 ? (
        /* Empty State */
        <div className="glass-panel rounded-2xl p-10 sm:p-14 text-center glow-ambient relative overflow-hidden">
          {/* Abstract SVG constellation in background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 800 400" fill="none">
              <circle cx="400" cy="200" r="140" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="400" cy="200" r="80" stroke="#22d3ee" strokeWidth="1" />
              <line x1="200" y1="200" x2="600" y2="200" stroke="#6366f1" strokeWidth="1" />
              <line x1="400" y1="50" x2="400" y2="350" stroke="#6366f1" strokeWidth="1" />
            </svg>
          </div>

          <div className="relative z-10 max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600/30 to-cyan-500/30 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-[0_0_25px_rgba(139,92,246,0.3)]">
              <Bot className="w-7 h-7 text-cyan-300" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {searchTerm || runtimeFilter !== 'all' || statusFilter !== 'all'
                  ? 'No matching bot containers found'
                  : 'No bots deployed yet'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                {searchTerm || runtimeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your search criteria or resetting filters.'
                  : 'Your infrastructure is ready. Deploy your first Python or Node.js bot and start managing it with 24/7 permanent uptime.'}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={onOpenCreateModal}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-semibold shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Deploy First Bot</span>
              </button>
            </div>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className={`grid gap-4 sm:gap-5 w-full ${
          filteredServers.length === 1
            ? 'grid-cols-1 max-w-2xl'
            : filteredServers.length === 2
            ? 'grid-cols-1 md:grid-cols-2 max-w-5xl'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {filteredServers.map(srv => {
            const isOnline = srv.status === 'online';
            const isStarting = srv.status === 'starting' || srv.status === 'restarting';
            const isCrashed = srv.status === 'crashed';

            return (
              <div
                key={srv.id}
                onClick={() => onSelectServer(srv.id, 'overview')}
                className="glass-panel rounded-2xl p-5 glow-ambient hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
              >
                {/* Top status bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-3">
                    {/* Status Badge */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border ${
                        isOnline
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : isStarting
                          ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                          : isCrashed
                          ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                          : 'bg-zinc-900/80 border-zinc-700/60 text-zinc-400'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOnline
                            ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                            : isStarting
                            ? 'bg-amber-400 animate-ping'
                            : isCrashed
                            ? 'bg-rose-400 shadow-[0_0_8px_#f43f5e]'
                            : 'bg-zinc-600'
                        }`}
                      />
                      <span>{srv.status.toUpperCase()}</span>
                    </div>

                    {/* Node Location */}
                    <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.06]">
                      <Server className="w-3 h-3 text-purple-400" />
                      {srv.nodeName}
                    </span>
                  </div>

                  {/* Bot Title & Runtime */}
                  <div className="mb-4">
                    <div className="text-base font-bold text-zinc-100 group-hover:text-purple-300 transition-colors flex items-center justify-between">
                      <span className="truncate">{srv.name}</span>
                      <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-cyan-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-1 opacity-0 group-hover:opacity-100" />
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-1 rounded flex items-center gap-1.5 shrink-0">
                            <RuntimeLogo runtime={srv.runtime} version={srv.version} showText={true} className="w-3.5 h-3.5" />
                          </span>
                          <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 bg-purple-950/30 border border-purple-500/20 rounded-md px-2 py-0.5">
                            <span className="text-purple-300 font-semibold">By:</span>
                            <span className="text-zinc-200 truncate max-w-[100px]">{srv.ownerEmail || 'System Admin'}</span>
                          </div>
                        </div>

                        {/* Clean Active Uptime Pill */}
                        <div className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shrink-0 shadow-sm">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span>Uptime: {formatUptime(srv.stats?.uptimeSeconds || 0, srv.status === 'online')}</span>
                        </div>
                      </div>

                      {srv.description && (
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {srv.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Next-Gen Live Resource Gauges (CPU & RAM) */}
                  <div className="grid grid-cols-2 gap-3 py-2.5 px-3 rounded-xl bg-black/35 border border-white/[0.08] backdrop-blur-md mb-3">
                    {/* CPU Load */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mb-1">
                        <span className="flex items-center gap-1 text-purple-300">
                          <Cpu className="w-3 h-3 text-purple-400" /> CPU
                        </span>
                        <span className="font-bold text-zinc-200">{srv.stats?.cpuUsage || 0}%</span>
                      </div>
                      <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden p-0.5 border border-white/5">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full transition-all duration-300 shadow-[0_0_6px_#a855f7]"
                          style={{ width: `${Math.min(100, Math.max(6, srv.stats?.cpuUsage || 0))}%` }}
                        />
                      </div>
                    </div>

                    {/* RAM Allocation */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mb-1">
                        <span className="flex items-center gap-1 text-cyan-300">
                          <Activity className="w-3 h-3 text-cyan-400" /> RAM
                        </span>
                        <span className="font-bold text-zinc-200 truncate">{srv.stats?.ramUsage || 0} / {srv.ramLimit || 512} MB</span>
                      </div>
                      <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden p-0.5 border border-white/5">
                        <div
                          className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-300 shadow-[0_0_6px_#22d3ee]"
                          style={{
                            width: `${Math.min(100, Math.max(6, ((srv.stats?.ramUsage || 0) / (srv.ramLimit || 512)) * 100))}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onSelectServer(srv.id, 'console');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-purple-600/20 hover:text-purple-300 text-zinc-300 text-xs font-medium border border-white/[0.08] hover:border-purple-500/30 transition-all flex items-center gap-1.5"
                    >
                      <Terminal className="w-3.5 h-3.5 text-purple-400" />
                      <span>Console</span>
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onSelectServer(srv.id, 'files');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-cyan-600/20 hover:text-cyan-300 text-zinc-300 text-xs font-medium border border-white/[0.08] hover:border-cyan-500/30 transition-all flex items-center gap-1.5"
                    >
                      <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Files</span>
                    </button>
                  </div>

                  {/* Power Button */}
                  <div className="flex items-center gap-1">
                    {isOnline ? (
                      <>
                        <button
                          onClick={e => onRestartServer(srv.id, e)}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-amber-950/40 text-zinc-400 hover:text-amber-300 border border-white/[0.08] transition-colors"
                          title="Restart Bot"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={e => onStopServer(srv.id, e)}
                          className="p-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-950/60 text-rose-400 border border-rose-500/30 transition-colors"
                          title="Stop Bot"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={e => onStartServer(srv.id, e)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW TABLE */
        <div className="glass-panel rounded-2xl overflow-hidden glow-ambient">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-black/40 text-zinc-400 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">BOT CONTAINER</th>
                  <th className="py-3 px-4">RUNTIME</th>
                  <th className="py-3 px-4">CPU</th>
                  <th className="py-3 px-4">MEMORY</th>
                  <th className="py-3 px-4">NODE</th>
                  <th className="py-3 px-4">UPTIME</th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredServers.map(srv => {
                  const isOnline = srv.status === 'online';
                  return (
                    <tr
                      key={srv.id}
                      onClick={() => onSelectServer(srv.id, 'overview')}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                    >
                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOnline
                                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                                : srv.status === 'starting'
                                ? 'bg-amber-400 animate-ping'
                                : 'bg-zinc-600'
                            }`}
                          />
                          <span className="font-mono uppercase text-[11px] text-zinc-300">
                            {srv.status}
                          </span>
                        </div>
                      </td>

                      {/* Bot Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-100 group-hover:text-purple-300 transition-colors">
                          {srv.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          {srv.description && (
                            <span className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                              {srv.description}
                            </span>
                          )}
                          {srv.description && (
                            <span className="text-[10px] text-zinc-700 font-mono">|</span>
                          )}
                          <span className="text-[10px] text-purple-400 font-mono">
                            Creator: {srv.ownerEmail || 'System Admin'}
                          </span>
                        </div>
                      </td>

                      {/* Runtime */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-cyan-300 bg-cyan-950/50 border border-cyan-500/30 px-2.5 py-1 rounded-md text-[11px] inline-flex items-center gap-1.5">
                          <RuntimeLogo runtime={srv.runtime} version={srv.version} showText={true} className="w-3.5 h-3.5" />
                        </span>
                      </td>

                      {/* CPU */}
                      <td className="py-3.5 px-4 font-mono text-zinc-300 whitespace-nowrap">
                        {srv.stats?.cpuUsage || 0}%
                      </td>

                      {/* RAM */}
                      <td className="py-3.5 px-4 font-mono text-zinc-300 whitespace-nowrap">
                        {srv.stats?.ramUsage || 0} MB / {srv.ramLimit || 512} MB
                      </td>

                      {/* Node */}
                      <td className="py-3.5 px-4 font-mono text-zinc-400 whitespace-nowrap">
                        {srv.nodeName}
                      </td>

                      {/* Uptime */}
                      <td className="py-3.5 px-4 font-mono text-zinc-400 whitespace-nowrap">
                        {formatUptime(srv.stats?.uptimeSeconds || 0, srv.status === 'online')}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectServer(srv.id, 'console')}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-purple-600/20 text-zinc-400 hover:text-purple-300 border border-white/[0.08]"
                            title="Console"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onSelectServer(srv.id, 'files')}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-cyan-600/20 text-zinc-400 hover:text-cyan-300 border border-white/[0.08]"
                            title="Files"
                          >
                            <FolderTree className="w-3.5 h-3.5" />
                          </button>

                          {isOnline ? (
                            <button
                              onClick={e => onStopServer(srv.id, e)}
                              className="p-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-950/60 text-rose-400 border border-rose-500/30"
                              title="Stop"
                            >
                              <Square className="w-3.5 h-3.5 fill-current" />
                            </button>
                          ) : (
                            <button
                              onClick={e => onStartServer(srv.id, e)}
                              className="p-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                              title="Start"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
