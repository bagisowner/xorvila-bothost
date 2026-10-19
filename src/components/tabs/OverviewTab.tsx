import React, { useState, useEffect } from 'react';
import { BotServer, ServerStats } from '../../types';
import {
  Cpu,
  HardDrive,
  Activity,
  Server,
  Terminal,
  Globe,
  Clock,
  Play,
  Square,
  RotateCw,
  Skull
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

interface Props {
  server: BotServer;
  stats: ServerStats;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onKill: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const OverviewTab: React.FC<Props> = ({
  server,
  stats,
  onStart,
  onStop,
  onRestart,
  onKill,
  onNavigateTab
}) => {
  // Metric history buffer for graphs
  const [history, setHistory] = useState<
    Array<{ time: string; cpu: number; ram: number; netRx: number; netTx: number }>
  >([]);

  useEffect(() => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHistory(prev => {
      const next = [
        ...prev,
        {
          time: timeStr,
          cpu: stats.cpuUsage,
          ram: stats.ramUsage,
          netRx: stats.netRx,
          netTx: stats.netTx
        }
      ];
      return next.slice(-20); // keep last 20 ticks
    });
  }, [stats]);

  const ramPercentage = Math.min(100, Math.round((stats.ramUsage / (stats.ramLimit || 512)) * 100));
  const storagePercentage = Math.min(100, Math.round((stats.storageUsage / (stats.storageLimit || 2048)) * 100));

  const formatUptime = (sec: number) => {
    if (server.status !== 'online' || !sec || sec <= 0) return 'Offline';
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div id="overview-tab-content" className="space-y-6">
      {/* Top Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-purple-500/20 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              server.status === 'online'
                ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse'
                : server.status === 'starting' || server.status === 'restarting'
                ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-spin'
                : server.status === 'crashed'
                ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                : 'bg-zinc-500'
            }`}
          />
          <div>
            <div className="text-sm font-semibold capitalize text-zinc-100 flex items-center gap-2">
              Status: <span className="text-cyan-400 font-mono">{server.status.toUpperCase()}</span>
            </div>
            <div className="text-xs text-zinc-400">
              Container ID: <span className="font-mono text-zinc-300">container_{server.id}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {server.status === 'offline' || server.status === 'crashed' ? (
            <button
              id="btn-start-server"
              onClick={onStart}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
            >
              <Play className="w-3.5 h-3.5" /> Start
            </button>
          ) : (
            <button
              id="btn-stop-server"
              onClick={onStop}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
            >
              <Square className="w-3.5 h-3.5" /> Stop
            </button>
          )}

          <button
            id="btn-restart-server"
            onClick={onRestart}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all flex items-center gap-1.5"
          >
            <RotateCw className="w-3.5 h-3.5" /> Restart
          </button>

          <button
            id="btn-kill-server"
            onClick={onKill}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-800 text-rose-400 border border-zinc-700 hover:bg-rose-950/40 hover:border-rose-700/60 transition-all flex items-center gap-1.5"
            title="Force Kill Process (SIGKILL)"
          >
            <Skull className="w-3.5 h-3.5" /> Kill
          </button>
        </div>
      </div>



      {/* Real-time Telemetry Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CPU Chart */}
        <div className="p-4 rounded-xl border border-purple-500/15 bg-slate-900/40 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-300 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" /> Live CPU Load Curve (%)
            </span>
            <span className="text-xs font-mono text-zinc-400">Polling: 2s realtime</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={[0, 100]} stroke="#52525b" fontSize={10} width={28} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#9333ea',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#e2e8f0'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="#c084fc"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#cpuGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RAM Chart */}
        <div className="p-4 rounded-xl border border-cyan-500/15 bg-slate-900/40 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" /> Live RAM Allocation (MB)
            </span>
            <span className="text-xs font-mono text-zinc-400">Limit: {server.ramLimit} MB</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={[0, server.ramLimit || 1024]} stroke="#52525b" fontSize={10} width={34} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#06b6d4',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#e2e8f0'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="ram"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#ramGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Container Infrastructure Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Node & Daemon Info */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-slate-900/50 backdrop-blur-md space-y-3">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-400" /> Host Node Daemon
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400 whitespace-nowrap">Node Name</span>
              <span className="text-zinc-200 font-medium truncate max-w-[200px] text-right">{server.nodeName}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400 whitespace-nowrap">Host IP / Port</span>
              <span className="text-cyan-400 font-mono font-medium truncate max-w-[200px] text-right">{server.nodeIp}:{server.port}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-zinc-400 whitespace-nowrap">Container Runtime</span>
              <span className="text-zinc-200 font-mono text-right">{server.runtime} {server.version}</span>
            </div>
          </div>
        </div>

        {/* Startup & Process */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-slate-900/50 backdrop-blur-md space-y-3">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" /> Process Execution
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400 whitespace-nowrap">Command</span>
              <span className="text-emerald-400 font-mono truncate max-w-[200px] text-right" title={server.startupCommand}>{server.startupCommand}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400 whitespace-nowrap">Restart Policy</span>
              <span className="text-zinc-200 capitalize font-medium text-right">{server.restartPolicy}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-zinc-400 whitespace-nowrap">Active Threads</span>
              <span className="text-zinc-200 font-mono text-right">{stats.pids} threads</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
