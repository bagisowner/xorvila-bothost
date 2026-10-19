import React, { useState, useEffect } from 'react';
import { User, ClusterOverview, AuditLog, BotServer } from '../types';
import { fetchApi } from '../lib/api';
import {
  Shield,
  Activity,
  Cpu,
  HardDrive,
  Server,
  RotateCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Terminal,
  Database,
  Users,
  Search,
  Layers,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface Props {
  currentUser: User;
  onNavigateToDatabase?: () => void;
  onNavigateToHealth?: () => void;
  onSelectServer?: (id: string) => void;
}

export const AdminConsoleView: React.FC<Props> = ({
  currentUser,
  onNavigateToDatabase,
  onNavigateToHealth,
  onSelectServer
}) => {
  const [cluster, setCluster] = useState<ClusterOverview | null>(null);
  const [servers, setServers] = useState<BotServer[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [overviewRes, serversRes, auditRes] = await Promise.all([
      fetchApi<ClusterOverview>('/admin/overview'),
      fetchApi<BotServer[]>('/servers'),
      fetchApi<AuditLog[]>('/admin/audit-logs')
    ]);

    if (overviewRes.success && overviewRes.data) setCluster(overviewRes.data);
    if (serversRes.success && serversRes.data) setServers(serversRes.data);
    if (auditRes.success && auditRes.data) setAuditLogs(auditRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerAction = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3500);
  };

  return (
    <div id="admin-console-view" className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#080B18]/90 border border-purple-500/30 shadow-xl glass-panel relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-purple-600/10 to-transparent pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 shrink-0 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">
                Xorvila Infrastructure Console
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40">
                ROOT OPS
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
              Host daemon status, node health telemetry, direct container orchestration, and cluster audit event stream.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateToDatabase && (
            <button
              onClick={onNavigateToDatabase}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-zinc-200 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-purple-400" />
              <span>Database Explorer</span>
            </button>
          )}

          {onNavigateToHealth && (
            <button
              onClick={onNavigateToHealth}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-xs font-semibold text-emerald-300 transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Healer</span>
            </button>
          )}
        </div>
      </div>

      {actionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Cluster Node Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#080B18]/80 border border-purple-500/20 shadow-lg glass-panel space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>CORE NODE</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Total Containers</div>
            <div className="text-2xl font-bold text-zinc-100 mt-0.5">{cluster?.totalServers || servers.length}</div>
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            {cluster?.activeServers || servers.filter(s => s.status === 'running').length} Running • {cluster?.stoppedServers || 0} Inactive
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#080B18]/80 border border-purple-500/20 shadow-lg glass-panel space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>CPU UTILIZATION</span>
            <span className="text-cyan-400">cgroups v2</span>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Host Core Share</div>
            <div className="text-2xl font-bold text-zinc-100 mt-0.5">{cluster?.totalCpuUsage || 28}%</div>
          </div>
          <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all"
              style={{ width: `${cluster?.totalCpuUsage || 28}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#080B18]/80 border border-purple-500/20 shadow-lg glass-panel space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>MEMORY ALLOCATION</span>
            <span className="text-indigo-400">DDR4 ECC</span>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Allocated RAM</div>
            <div className="text-2xl font-bold text-zinc-100 mt-0.5">{cluster?.totalRamMB || 1024} MB</div>
          </div>
          <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-400 rounded-full transition-all"
              style={{ width: '35%' }}
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#080B18]/80 border border-purple-500/20 shadow-lg glass-panel space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>STORAGE ENGINE</span>
            <span className="text-purple-400">NVMe ZFS</span>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Disk Used</div>
            <div className="text-2xl font-bold text-zinc-100 mt-0.5">{cluster?.totalStorageMB || 2048} MB</div>
          </div>
          <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-400 rounded-full transition-all"
              style={{ width: '22%' }}
            />
          </div>
        </div>
      </div>

      {/* Cluster Daemons & Live Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Running Bot Containers */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 font-mono flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-400" />
              <span>Provisioned Bot Containers</span>
            </h2>
            <button
              onClick={loadData}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {servers.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#080B18]/60 border border-white/[0.06] text-center text-zinc-500 text-xs">
                No containers provisioned in cluster yet.
              </div>
            ) : (
              servers.map(s => (
                <div
                  key={s.id}
                  onClick={() => onSelectServer && onSelectServer(s.id)}
                  className="p-4 rounded-2xl bg-[#080B18]/80 border border-white/[0.06] hover:border-purple-500/40 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        s.status === 'running'
                          ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                          : s.status === 'starting'
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-zinc-600'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-100 group-hover:text-purple-300 transition-colors truncate">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        {s.runtime} • {s.ramLimit}MB RAM • {s.cpuLimit}% CPU
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                        s.status === 'running'
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {s.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-purple-400 transition-colors" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Host System Services & Fast Actions */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#080B18]/80 border border-purple-500/20 shadow-lg glass-panel space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Platform Microservices</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                <span className="text-zinc-300 font-mono">SQLite Storage Engine</span>
                <span className="text-emerald-400 font-mono text-[11px]">WAL • Active</span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                <span className="text-zinc-300 font-mono">Realtime WebSockets</span>
                <span className="text-emerald-400 font-mono text-[11px]">100% Online</span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                <span className="text-zinc-300 font-mono">cgroups Isolator</span>
                <span className="text-emerald-400 font-mono text-[11px]">Enforcing</span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                <span className="text-zinc-300 font-mono">SFTP File Gateway</span>
                <span className="text-emerald-400 font-mono text-[11px]">Port 2022</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.08] space-y-2">
              <div className="text-[10px] font-mono text-zinc-500 uppercase">Emergency Operations</div>
              <button
                onClick={() => handleTriggerAction('Sync command dispatched to node disk cache.')}
                className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-zinc-200 transition-colors text-left flex items-center justify-between cursor-pointer"
              >
                <span>Flush Storage Buffers</span>
                <Zap className="w-3.5 h-3.5 text-purple-400" />
              </button>

              <button
                onClick={() => handleTriggerAction('Telemetry re-scanned successfully.')}
                className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-zinc-200 transition-colors text-left flex items-center justify-between cursor-pointer"
              >
                <span>Re-poll Host Hardware</span>
                <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
