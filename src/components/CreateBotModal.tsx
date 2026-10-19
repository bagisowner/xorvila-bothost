import React, { useState, useEffect } from 'react';
import { BotServer, RuntimeLanguage, RuntimeVersion, RestartPolicy, User } from '../types';
import { fetchApi } from '../lib/api';
import {
  X,
  Plus,
  Cpu,
  Sliders,
  HardDrive,
  Terminal,
  Layers,
  Zap,
  Check,
  RefreshCw,
  Crown,
  ShieldAlert,
  AlertTriangle,
  Server,
  ArrowRight,
  ArrowLeft,
  Key,
  FolderTree,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useNotifications } from '../lib/notifications';
import { RuntimeLogo } from './RuntimeLogo';

interface Props {
  isOpen: boolean;
  currentUser: User | null;
  existingServersCount?: number;
  onClose: () => void;
  onCreated: (newServer: BotServer) => void;
}

export const CreateBotModal: React.FC<Props> = ({
  isOpen,
  currentUser,
  existingServersCount = 0,
  onClose,
  onCreated
}) => {
  const { addToast } = useNotifications();
  const isAdmin = currentUser?.role === 'admin';
  const isLimitReached = !isAdmin && existingServersCount >= 1;

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [runtime, setRuntime] = useState<RuntimeLanguage>('python');
  const [version, setVersion] = useState<RuntimeVersion>('3.13');
  const [nodeId, setNodeId] = useState('host-xorvila-core');
  const [startupCommand, setStartupCommand] = useState('python bot.py');
  const [workingDir, setWorkingDir] = useState('/server');

  // Resource allocations
  const [cpuLimit, setCpuLimit] = useState(isAdmin ? 100 : 50); // 50% = 0.5 vCPU for free
  const [ramLimit, setRamLimit] = useState(isAdmin ? 1024 : 512); // 512 MB for free
  const [storageLimit, setStorageLimit] = useState(isAdmin ? 2048 : 1024); // 1024 MB for free
  const [restartPolicy, setRestartPolicy] = useState<RestartPolicy>('always');
  const [autoStart, setAutoStart] = useState(true);

  // Environment variables
  const [envPairs, setEnvPairs] = useState<Array<{ key: string; value: string }>>([
    { key: 'ENVIRONMENT', value: 'production' },
    { key: 'LOG_LEVEL', value: 'INFO' }
  ]);

  // Deployment Animation & status
  const [deploying, setDeploying] = useState(false);
  const [deployStageIndex, setDeployStageIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const DEPLOY_STAGES = [
    'Preparing isolated container runtime...',
    'Creating Linux sandbox filesystem at /server...',
    'Configuring cgroup v2 resource limits...',
    'Injecting environment variables & security tokens...',
    'Initializing startup bootstrap daemon...',
    'Verifying health checks & network port bindings...'
  ];

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setDeploying(false);
      setDeployStageIndex(0);
      setErrorMsg(null);
      setName('');
      setDescription('');
      setRuntime('python');
      setVersion('3.13');
      setStartupCommand('python bot.py');
      setCpuLimit(isAdmin ? 100 : 50);
      setRamLimit(isAdmin ? 1024 : 512);
      setStorageLimit(isAdmin ? 2048 : 1024);
    }
  }, [isOpen, isAdmin]);

  // Update default startup command when runtime changes
  const handleRuntimeSelect = (lang: RuntimeLanguage, ver: RuntimeVersion) => {
    setRuntime(lang);
    setVersion(ver);
    if (lang === 'python') {
      setStartupCommand('python bot.py');
    } else {
      setStartupCommand('node index.js');
    }
  };

  const handleAddEnv = () => {
    setEnvPairs(prev => [...prev, { key: '', value: '' }]);
  };

  const handleRemoveEnv = (index: number) => {
    setEnvPairs(prev => prev.filter((_, i) => i !== index));
  };

  const handleEnvChange = (index: number, field: 'key' | 'value', val: string) => {
    setEnvPairs(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const handleExecuteDeploy = async () => {
    setErrorMsg(null);
    setDeploying(true);
    setDeployStageIndex(0);

    // Run realistic deployment stages animation
    for (let i = 0; i < DEPLOY_STAGES.length; i++) {
      setDeployStageIndex(i);
      await new Promise(r => setTimeout(r, 450));
    }

    const envMap: Record<string, string> = {};
    envPairs.forEach(p => {
      if (p.key.trim()) {
        envMap[p.key.trim()] = p.value;
      }
    });

    const payload = {
      name: name.trim() || `${runtime === 'python' ? 'Python' : 'Node.js'} Bot Instance`,
      description: description.trim(),
      runtime,
      version,
      cpuLimit: Number(cpuLimit),
      ramLimit: Number(ramLimit),
      storageLimit: Number(storageLimit),
      startupCommand: startupCommand.trim(),
      workingDir: workingDir.trim() || '/server',
      restartPolicy,
      autoStart,
      nodeId,
      env: envMap
    };

    const res = await fetchApi<BotServer>('/servers', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success && res.data) {
      addToast({
        type: 'success',
        title: 'Container Deployed',
        message: `${res.data.name} is online and operational.`
      });
      onCreated(res.data);
      onClose();
    } else {
      setDeploying(false);
      setErrorMsg(res.error?.message || 'Failed to deploy bot container');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-slate-950/95 dark:bg-[#080B18]/95 border border-purple-500/25 rounded-2xl shadow-2xl glass-panel glow-ambient flex flex-col max-h-[92vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Step Indicator */}
        <div className="px-6 py-4 border-b border-purple-500/15 flex items-center justify-between bg-black/30">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-purple-400 font-medium">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>DEPLOYMENT WIZARD</span>
            </div>
            <h2 className="text-base font-bold text-zinc-100 tracking-tight mt-0.5">
              Deploy Bot Container
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Pills */}
        {!deploying && (
          <div className="px-6 py-3 border-b border-white/[0.05] bg-black/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto w-full">
              {[
                { num: 1, label: 'Runtime' },
                { num: 2, label: 'Metadata' },
                { num: 3, label: 'Resources' },
                { num: 4, label: 'Startup' },
                { num: 5, label: 'Deploy' }
              ].map(step => (
                <button
                  key={step.num}
                  onClick={() => !isLimitReached && setCurrentStep(step.num as any)}
                  disabled={isLimitReached}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[11px] whitespace-nowrap transition-all ${
                    currentStep === step.num
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 font-semibold shadow-[0_0_10px_rgba(139,92,246,0.2)]'
                      : currentStep > step.num
                      ? 'text-emerald-400 bg-emerald-950/30'
                      : 'text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      currentStep === step.num
                        ? 'bg-purple-500 text-white'
                        : currentStep > step.num
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {currentStep > step.num ? '✓' : step.num}
                  </span>
                  <span>{step.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Free Tier Limit Warning */}
          {isLimitReached && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-amber-300">Free Tier Limit Reached (1 Bot Container)</div>
                <p className="text-zinc-300 mt-1">
                  You already have an active bot on the Free Tier. To deploy additional containers or unlock 16-core compute, sign in as root administrator or upgrade plan.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* DEPLOYMENT ANIMATION OVERLAY */}
          {deploying ? (
            <div className="py-8 space-y-6 text-center">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 border-t-cyan-400 animate-spin" />
                <div className="absolute inset-2 rounded-full border-2 border-indigo-500/30 border-b-purple-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
                <div className="w-full h-full flex items-center justify-center">
                  <Cpu className="w-8 h-8 text-cyan-300 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Deploying Bot Container...
                </h3>
                <p className="text-xs font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 py-1.5 px-3 rounded-lg inline-block">
                  {DEPLOY_STAGES[deployStageIndex]}
                </p>
              </div>

              {/* Step indicator checklist */}
              <div className="max-w-md mx-auto space-y-2 text-left text-xs bg-black/40 p-4 rounded-xl border border-white/[0.08]">
                {DEPLOY_STAGES.map((stage, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2.5 transition-all ${
                      idx < deployStageIndex
                        ? 'text-emerald-400'
                        : idx === deployStageIndex
                        ? 'text-purple-300 font-semibold'
                        : 'text-zinc-600'
                    }`}
                  >
                    {idx < deployStageIndex ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : idx === deployStageIndex ? (
                      <RefreshCw className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-700 shrink-0" />
                    )}
                    <span className="truncate">{stage}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : currentStep === 1 ? (
            /* STEP 1: RUNTIME SELECTION */
            <div className="space-y-4">
              <div className="text-xs text-zinc-400">
                Choose the programming language runtime and environment for your bot container:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Python Card */}
                <div
                  onClick={() => handleRuntimeSelect('python', '3.13')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    runtime === 'python'
                      ? 'bg-purple-600/20 border-purple-500/50 shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                      : 'bg-white/[0.02] border-white/[0.08] hover:border-purple-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 text-base font-bold text-zinc-100">
                      <RuntimeLogo runtime="python" className="w-6 h-6" />
                      <span>Python</span>
                    </div>
                    {runtime === 'python' && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">
                    Discord.py, Telegram Bots, FastAPI, Async Workers, Pycord
                  </p>

                  <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span>Version</span>
                    <select
                      value={runtime === 'python' ? version : '3.13'}
                      onChange={e => {
                        setRuntime('python');
                        setVersion(e.target.value as any);
                      }}
                      onClick={e => e.stopPropagation()}
                      className="bg-black/40 border border-white/10 rounded px-2 py-1 text-cyan-300 text-xs font-mono focus:outline-none"
                    >
                      <option value="3.13">Python 3.13 (Latest)</option>
                      <option value="3.12">Python 3.12</option>
                      <option value="3.11">Python 3.11</option>
                      <option value="3.10">Python 3.10</option>
                    </select>
                  </div>
                </div>

                {/* Node.js Card */}
                <div
                  onClick={() => handleRuntimeSelect('node', '22')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    runtime === 'node'
                      ? 'bg-purple-600/20 border-purple-500/50 shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                      : 'bg-white/[0.02] border-white/[0.08] hover:border-purple-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 text-base font-bold text-zinc-100">
                      <RuntimeLogo runtime="node" className="w-6 h-6" />
                      <span>Node.js</span>
                    </div>
                    {runtime === 'node' && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">
                    Discord.js, Telegraf, Express, WebSocket bots, TypeScript
                  </p>

                  <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span>Version</span>
                    <select
                      value={runtime === 'node' ? version : '22'}
                      onChange={e => {
                        setRuntime('node');
                        setVersion(e.target.value as any);
                      }}
                      onClick={e => e.stopPropagation()}
                      className="bg-black/40 border border-white/10 rounded px-2 py-1 text-cyan-300 text-xs font-mono focus:outline-none"
                    >
                      <option value="22">Node.js 22 (LTS)</option>
                      <option value="20">Node.js 20</option>
                      <option value="18">Node.js 18</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Starter Templates */}
              <div>
                <div className="text-[11px] font-mono text-zinc-400 uppercase mb-2">
                  Popular Bot Presets
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    onClick={() => {
                      handleRuntimeSelect('python', '3.13');
                      setName('Discord Moderation Bot');
                      setDescription('Discord.py Slash Command Gateway Bot');
                    }}
                    className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] text-left text-zinc-300 hover:text-purple-300 transition-colors"
                  >
                    <div className="font-semibold">Discord.py Bot</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Python 3.13</div>
                  </button>

                  <button
                    onClick={() => {
                      handleRuntimeSelect('python', '3.13');
                      setName('Telegram Notification Bot');
                      setDescription('Telegram Poller with webhook support');
                    }}
                    className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] text-left text-zinc-300 hover:text-purple-300 transition-colors"
                  >
                    <div className="font-semibold">Telegram Bot</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Python 3.13</div>
                  </button>

                  <button
                    onClick={() => {
                      handleRuntimeSelect('node', '22');
                      setName('Discord.js Bot V14');
                      setDescription('Node.js 22 Discord Client');
                    }}
                    className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] text-left text-zinc-300 hover:text-purple-300 transition-colors"
                  >
                    <div className="font-semibold">Discord.js Bot</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Node.js 22</div>
                  </button>
                </div>
              </div>
            </div>
          ) : currentStep === 2 ? (
            /* STEP 2: METADATA & NODE */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Bot Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Aegis Moderation Bot"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-purple-500/20 focus:border-purple-500/50 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Description / Purpose (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. 24/7 background worker with persistent storage"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-purple-500/20 focus:border-purple-500/50 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Target Infrastructure Node
                </label>
                <select
                  value={nodeId}
                  onChange={e => setNodeId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-purple-500/20 text-xs text-zinc-200 focus:outline-none font-mono"
                >
                  <option value="host-xorvila-core">Bot Hosting Node 01 (streaming files to its codebase or u can storage)</option>
                </select>
              </div>
            </div>
          ) : currentStep === 3 ? (
            /* STEP 3: RESOURCES & QUOTAS */
            <div className="space-y-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Configure compute, RAM and NVMe isolation:</span>
                <span className="font-mono text-[10px] text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                  {isAdmin ? 'ADMIN UNLIMITED' : 'FREE TIER CAP'}
                </span>
              </div>

              {/* CPU Slider */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-purple-400" /> Compute Allocation
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {(cpuLimit / 100).toFixed(1)} vCPU ({cpuLimit}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="25"
                  max={isAdmin ? 800 : 50}
                  step="25"
                  value={cpuLimit}
                  onChange={e => setCpuLimit(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>0.25 vCPU</span>
                  <span>{isAdmin ? '8.0 vCPU' : '0.5 vCPU (Free Cap)'}</span>
                </div>
              </div>

              {/* Memory Slider */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-cyan-400" /> RAM Memory Limit
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">{ramLimit} MB</span>
                </div>
                <input
                  type="range"
                  min="128"
                  max={isAdmin ? 16384 : 512}
                  step="128"
                  value={ramLimit}
                  onChange={e => setRamLimit(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>128 MB</span>
                  <span>{isAdmin ? '16 GB' : '512 MB (Free Cap)'}</span>
                </div>
              </div>

              {/* Storage Slider */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-indigo-400" /> NVMe Isolated Storage
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {(storageLimit / 1024).toFixed(1)} GB ({storageLimit} MB)
                  </span>
                </div>
                <input
                  type="range"
                  min="512"
                  max={isAdmin ? 51200 : 1024}
                  step="512"
                  value={storageLimit}
                  onChange={e => setStorageLimit(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>512 MB</span>
                  <span>{isAdmin ? '50 GB' : '1.0 GB (Free Cap)'}</span>
                </div>
              </div>
            </div>
          ) : currentStep === 4 ? (
            /* STEP 4: STARTUP & ENV */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Startup Command
                </label>
                <div className="relative">
                  <Terminal className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={startupCommand}
                    onChange={e => setStartupCommand(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-purple-500/20 font-mono text-xs text-cyan-300 focus:outline-none"
                  />
                </div>
                {/* Live shell preview */}
                <div className="mt-1.5 p-2 rounded-lg bg-black/60 border border-white/[0.06] text-[11px] font-mono text-zinc-400 flex items-center gap-2">
                  <span className="text-zinc-600">$</span>
                  <span>cd /server &amp;&amp; {startupCommand || 'python bot.py'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Restart Policy
                  </label>
                  <select
                    value={restartPolicy}
                    onChange={e => setRestartPolicy(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900/80 border border-purple-500/20 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="always">Always (24/7 Permanent)</option>
                    <option value="on-failure">On Failure</option>
                    <option value="unless-stopped">Unless Stopped</option>
                    <option value="never">Never</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Auto-Start on Boot
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="autoStartCheck"
                      checked={autoStart}
                      onChange={e => setAutoStart(e.target.checked)}
                      className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                    />
                    <label htmlFor="autoStartCheck" className="text-xs text-zinc-300 cursor-pointer">
                      Start immediately after deploy
                    </label>
                  </div>
                </div>
              </div>

              {/* Environment Variables */}
              <div className="pt-2 border-t border-white/[0.08]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-cyan-400" /> Environment Secrets
                  </span>
                  <button
                    onClick={handleAddEnv}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Variable
                  </button>
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {envPairs.map((pair, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="KEY (e.g. BOT_TOKEN)"
                        value={pair.key}
                        onChange={e => handleEnvChange(idx, 'key', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="VALUE"
                        value={pair.value}
                        onChange={e => handleEnvChange(idx, 'value', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                      />
                      <button
                        onClick={() => handleRemoveEnv(idx)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* STEP 5: REVIEW & SUMMARY */
            <div className="space-y-4">
              <div className="text-xs text-zinc-400">
                Review your bot configuration before provisioning the container:
              </div>

              <div className="p-4 rounded-xl bg-black/50 border border-purple-500/20 space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-xs text-zinc-400">Bot Name</span>
                  <span className="text-xs font-bold text-zinc-100">{name || 'Default Bot'}</span>
                </div>

                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-xs text-zinc-400">Runtime</span>
                  <span className="text-xs font-mono text-cyan-300">
                    {runtime === 'python' ? 'Python' : 'Node.js'} {version}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-xs text-zinc-400">Resource Quota</span>
                  <span className="text-xs font-mono text-zinc-200">
                    {(cpuLimit / 100).toFixed(1)} vCPU • {ramLimit} MB RAM • {(storageLimit / 1024).toFixed(1)} GB Disk
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-xs text-zinc-400">Startup Command</span>
                  <span className="text-xs font-mono text-purple-300">{startupCommand}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Restart Policy</span>
                  <span className="text-xs font-mono text-emerald-400 capitalize">{restartPolicy}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        {!deploying && (
          <div className="px-6 py-4 border-t border-purple-500/15 bg-black/30 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                onClick={() => setCurrentStep((currentStep - 1) as any)}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium border border-white/[0.08] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors"
              >
                Cancel
              </button>

              {currentStep < 5 ? (
                <button
                  onClick={() => setCurrentStep((currentStep + 1) as any)}
                  disabled={isLimitReached || (currentStep === 2 && !name.trim())}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleExecuteDeploy}
                  disabled={isLimitReached}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 disabled:opacity-50 text-white text-xs font-semibold shadow-[0_0_25px_rgba(139,92,246,0.4)] flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <Zap className="w-4 h-4 text-cyan-200" />
                  <span>Deploy Bot Container</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
