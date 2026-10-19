import React, { useState } from 'react';
import { User, BotServer } from '../types';
import {
  Layers,
  Cpu,
  HardDrive,
  Server,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Plus
} from 'lucide-react';

interface Props {
  currentUser: User | null;
  servers: BotServer[];
  onOpenCreateModal: () => void;
}

export const ResourceQuotasView: React.FC<Props> = ({
  currentUser,
  servers,
  onOpenCreateModal
}) => {
  const [requestedUpgrade, setRequestedUpgrade] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const botCount = servers.length;

  // Limits based on role
  const maxBots = isAdmin ? 100 : 1;
  const maxRamMB = isAdmin ? 32768 : 512;
  const maxDiskMB = isAdmin ? 512000 : 1024;
  const maxCpuPct = isAdmin ? 800 : 50;

  // Calculate used resources
  const usedRamMB = servers.reduce((acc, s) => acc + (s.ramLimit || 256), 0);
  const usedDiskMB = servers.reduce((acc, s) => acc + (s.storageLimit || 512), 0);
  const usedCpuPct = servers.reduce((acc, s) => acc + (s.cpuLimit || 25), 0);

  const botPct = Math.min(100, Math.round((botCount / maxBots) * 100));
  const ramPct = Math.min(100, Math.round((usedRamMB / maxRamMB) * 100));
  const diskPct = Math.min(100, Math.round((usedDiskMB / maxDiskMB) * 100));
  const cpuPct = Math.min(100, Math.round((usedCpuPct / maxCpuPct) * 100));

  const isAtBotLimit = botCount >= maxBots;

  const handleRequestUpgrade = () => {
    setRequestedUpgrade(true);
    setTimeout(() => setRequestedUpgrade(false), 4000);
  };

  return (
    <div id="resource-quotas-view" className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#080B18]/90 border border-[rgba(140,120,255,0.2)] shadow-xl glass-panel relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-purple-600/10 to-transparent pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">
                Resource Quotas & Limits
              </h1>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                  isAdmin
                    ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                    : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
                }`}
              >
                {isAdmin ? 'Enterprise Admin Plan' : 'Free Tier Plan'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
              Real-time hardware allocation, active cgroups isolation metrics, container instance limits, and NVMe persistent storage boundaries.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isAtBotLimit ? (
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Deploy Bot Instance</span>
            </button>
          ) : (
            <button
              onClick={handleRequestUpgrade}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Request Quota Increase</span>
            </button>
          )}
        </div>
      </div>

      {/* Quota Limit Warning if capped */}
      {isAtBotLimit && !isAdmin && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold">Resource limit reached:</span> Free tier users are allocated 1 active bot container (512 MB RAM, 1 GB Storage, 50% CPU).
            </div>
          </div>
          <button
            onClick={handleRequestUpgrade}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold shrink-0 transition-colors"
          >
            {requestedUpgrade ? 'Request Sent ✓' : 'Upgrade Quota'}
          </button>
        </div>
      )}

      {requestedUpgrade && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Your quota upgrade request has been submitted to the infrastructure administrator.</span>
        </div>
      )}

      {/* Resource Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bot Instances */}
        <div className="p-5 rounded-2xl bg-[#080B18]/80 border border-[rgba(140,120,255,0.15)] shadow-lg glass-panel space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-400">
              <Server className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {botCount} / {isAdmin ? 'infinity' : maxBots} Used
            </span>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Bot Containers</div>
            <div className="text-xl font-bold text-zinc-100 mt-0.5">{botCount} Instance</div>
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full rounded-full transition-all ${
                  botPct >= 100 ? 'bg-amber-400' : 'bg-purple-500'
                }`}
                style={{ width: `${botPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>{botPct}% Utilized</span>
              <span>{isAdmin ? 'unlimited' : `${maxBots - botCount} remaining`}</span>
            </div>
          </div>
        </div>

        {/* RAM Allocation */}
        <div className="p-5 rounded-2xl bg-[#080B18]/80 border border-[rgba(140,120,255,0.15)] shadow-lg glass-panel space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {usedRamMB} MB / {maxRamMB} MB
            </span>
          </div>
          <div>
            <div className="text-xs text-zinc-400">RAM Limit</div>
            <div className="text-xl font-bold text-zinc-100 mt-0.5">{usedRamMB} MB Allocated</div>
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full rounded-full transition-all ${
                  ramPct >= 90 ? 'bg-amber-400' : 'bg-indigo-500'
                }`}
                style={{ width: `${ramPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>{ramPct}% Utilized</span>
              <span>{maxRamMB - usedRamMB} MB free</span>
            </div>
          </div>
        </div>

        {/* CPU Allocation */}
        <div className="p-5 rounded-2xl bg-[#080B18]/80 border border-[rgba(140,120,255,0.15)] shadow-lg glass-panel space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {usedCpuPct}% / {maxCpuPct}%
            </span>
          </div>
          <div>
            <div className="text-xs text-zinc-400">CPU Allocation</div>
            <div className="text-xl font-bold text-zinc-100 mt-0.5">{usedCpuPct}% Core Power</div>
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full rounded-full transition-all ${
                  cpuPct >= 90 ? 'bg-amber-400' : 'bg-cyan-500'
                }`}
                style={{ width: `${cpuPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>{cpuPct}% Utilized</span>
              <span>{maxCpuPct - usedCpuPct}% free</span>
            </div>
          </div>
        </div>

        {/* NVMe Persistent Disk */}
        <div className="p-5 rounded-2xl bg-[#080B18]/80 border border-[rgba(140,120,255,0.15)] shadow-lg glass-panel space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {usedDiskMB} MB / {maxDiskMB} MB
            </span>
          </div>
          <div>
            <div className="text-xs text-zinc-400">NVMe Storage</div>
            <div className="text-xl font-bold text-zinc-100 mt-0.5">{usedDiskMB} MB Stored</div>
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full rounded-full transition-all ${
                  diskPct >= 90 ? 'bg-amber-400' : 'bg-emerald-500'
                }`}
                style={{ width: `${diskPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>{diskPct}% Utilized</span>
              <span>{maxDiskMB - usedDiskMB} MB free</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Breakdown Comparison */}
      <div className="p-6 rounded-2xl bg-[#080B18]/80 border border-[rgba(140,120,255,0.18)] shadow-lg glass-panel space-y-5">
        <div>
          <h2 className="text-base font-bold text-zinc-100">Xorvila Platform Tier Specifications</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Transparent resource boundaries and capability matrix for individual and team workloads.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Free Tier */}
          <div
            className={`p-5 rounded-xl border space-y-4 ${
              !isAdmin
                ? 'bg-cyan-950/20 border-cyan-500/40 ring-1 ring-cyan-500/20'
                : 'bg-black/40 border-white/10 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm text-cyan-300">Free Developer Tier</div>
              {!isAdmin && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  Current Plan
                </span>
              )}
            </div>

            <ul className="space-y-2 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span><strong>1</strong> Isolated Bot Container</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span><strong>512 MB</strong> Dedicated Memory (RAM)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span><strong>1,024 MB (1 GB)</strong> NVMe High-Speed Storage</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span><strong>50%</strong> Host CPU Core Share</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Continuous 24/7 Bot Uptime & Auto-Restart</span>
              </li>
            </ul>
          </div>

          {/* Root Administrator Tier */}
          <div
            className={`p-5 rounded-xl border space-y-4 ${
              isAdmin
                ? 'bg-purple-950/20 border-purple-500/40 ring-1 ring-purple-500/20'
                : 'bg-black/40 border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm text-purple-300">Root Infrastructure Admin</div>
              {isAdmin && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40">
                  Current Plan
                </span>
              )}
            </div>

            <ul className="space-y-2 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                <span><strong>Unlimited</strong> Bot Container Provisioning</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                <span><strong>32,768 MB (32 GB)</strong> Total Node RAM</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                <span><strong>500 GB</strong> NVMe High-Speed Storage</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                <span><strong>800% (8 Cores)</strong> High-Priority CPU</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Direct SQLite Database Access & Host Console</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
