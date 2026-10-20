import React, { useState, useEffect } from 'react';
import { StarterPlanConfig } from '../../types';
import { fetchApi } from '../../lib/api';
import {
  Sliders,
  Cpu,
  HardDrive,
  Layers,
  Coins,
  CheckCircle2,
  RotateCcw,
  Save,
  Loader2,
  Info,
  Zap,
  Sparkles
} from 'lucide-react';

interface Props {
  onPlanSaved?: (plan: StarterPlanConfig) => void;
}

export const AdminStarterPlanTab: React.FC<Props> = ({ onPlanSaved }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [ramMb, setRamMb] = useState<number>(512);
  const [diskMb, setDiskMb] = useState<number>(2048);
  const [cpuPct, setCpuPct] = useState<number>(100);
  const [maxServers, setMaxServers] = useState<number>(1);
  const [starterCoins, setStarterCoins] = useState<number>(0);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<{ starterPlan: StarterPlanConfig }>('/admin/settings');
      if (res.success && res.data?.starterPlan) {
        const plan = res.data.starterPlan;
        setRamMb(plan.defaultRamMb || 512);
        setDiskMb(plan.defaultDiskMb || 2048);
        setCpuPct(plan.defaultCpuPct || 100);
        setMaxServers(plan.defaultMaxServers || 1);
        setStarterCoins(plan.defaultCoins ?? 0);
      }
    } catch (e) {
      console.error('Failed to load starter plan:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const payload: StarterPlanConfig = {
        defaultRamMb: Number(ramMb),
        defaultDiskMb: Number(diskMb),
        defaultCpuPct: Number(cpuPct),
        defaultMaxServers: Number(maxServers),
        defaultCoins: Number(starterCoins)
      };

      const res = await fetchApi<StarterPlanConfig>('/admin/settings/starter-plan', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (res.success && res.data) {
        setSuccessMsg('Starter Free Plan specifications saved and updated platform-wide!');
        onPlanSaved?.(res.data);
        setTimeout(() => setSuccessMsg(null), 4500);
      } else {
        setErrorMsg(res.error?.message || 'Failed to update plan settings');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setRamMb(512);
    setDiskMb(2048);
    setCpuPct(100);
    setMaxServers(1);
    setStarterCoins(0);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-cyan-950/20 p-5 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 shrink-0">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Starter / Free Plan Configuration
              </h3>
              <p className="mt-1 text-xs text-zinc-300 max-w-2xl leading-relaxed">
                Control the baseline hardware allocation and server creation allowances assigned to standard user accounts. When users create servers, their specs will be bounded by these settings unless upgraded via the Store.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] text-xs font-semibold transition-all cursor-pointer shrink-0"
            title="Reset to recommended defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recommended Defaults</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
          <Info className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. Default RAM */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#070914]/85 p-5 space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <Zap className="w-4 h-4" />
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Default Starter RAM
                </label>
              </div>
              <span className="font-mono text-sm font-extrabold text-amber-300">
                {ramMb} MB ({ramMb >= 1024 ? `${(ramMb / 1024).toFixed(1)} GB` : `${ramMb} MB`})
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Base memory allocation limit given to free tier bot deployments.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={128}
                max={4096}
                step={64}
                value={ramMb}
                onChange={e => setRamMb(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
              <span className="text-xs text-zinc-400 font-mono">MB</span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[256, 512, 1024, 2048].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRamMb(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                    ramMb === preset
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  {preset} MB
                </button>
              ))}
            </div>
          </div>

          {/* 2. Default NVMe Disk */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#070914]/85 p-5 space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400">
                <HardDrive className="w-4 h-4" />
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Default NVMe Storage
                </label>
              </div>
              <span className="font-mono text-sm font-extrabold text-cyan-300">
                {diskMb} MB ({(diskMb / 1024).toFixed(1)} GB)
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Base isolated persistent disk space created at <code className="text-cyan-300">/server</code>.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={256}
                max={10240}
                step={256}
                value={diskMb}
                onChange={e => setDiskMb(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
              <span className="text-xs text-zinc-400 font-mono">MB</span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[512, 1024, 2048, 5120].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDiskMb(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                    diskMb === preset
                      ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  {preset >= 1024 ? `${preset / 1024} GB` : `${preset} MB`}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Default CPU Limit */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#070914]/85 p-5 space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400">
                <Cpu className="w-4 h-4" />
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Default CPU Quota
                </label>
              </div>
              <span className="font-mono text-sm font-extrabold text-purple-300">
                {cpuPct}% ({cpuPct >= 100 ? `${(cpuPct / 100).toFixed(1)} Core` : `${cpuPct}% vCPU`})
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Cgroup v2 fair-share CPU allocation (100% corresponds to 1 full execution core).
            </p>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={25}
                max={400}
                step={25}
                value={cpuPct}
                onChange={e => setCpuPct(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
              />
              <span className="text-xs text-zinc-400 font-mono">%</span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[50, 100, 150, 200].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCpuPct(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                    cpuPct === preset
                      ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 font-bold'
                      : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>

          {/* 4. Default Server Slots & Starter Coins */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#070914]/85 p-5 space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400">
                <Layers className="w-4 h-4" />
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Starter Server Slots
                </label>
              </div>
              <span className="font-mono text-sm font-extrabold text-indigo-300">
                {maxServers} {maxServers === 1 ? 'Slot' : 'Slots'}
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Maximum concurrent bot server instances normal users can deploy by default.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-zinc-400 font-mono block mb-1">Server Slots</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxServers}
                  onChange={e => setMaxServers(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 font-mono block mb-1">Starting Coins</span>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  step={50}
                  value={starterCoins}
                  onChange={e => setStarterCoins(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] text-amber-300/90 font-mono">
                New users automatically receive {starterCoins} coins on registration.
              </span>
            </div>
          </div>
        </div>

        {/* Action Save Bar */}
        <div className="p-5 rounded-2xl bg-[#080B18]/90 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Info className="w-4 h-4 text-purple-400" />
            <span>Changes persist immediately to SQLite and active container limiters.</span>
          </div>

          <button
            type="submit"
            disabled={saving || loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Plan Settings...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Starter Plan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
