import React, { useState } from 'react';
import { BotServer, RuntimeLanguage, RuntimeVersion, RestartPolicy } from '../../types';
import { fetchApi } from '../../lib/api';
import { Terminal, Save, Check, RefreshCw, Layers, Sliders, Cpu, HardDrive } from 'lucide-react';

interface Props {
  server: BotServer;
  onUpdate: (updated: BotServer) => void;
}

export const StartupTab: React.FC<Props> = ({ server, onUpdate }) => {
  const [runtime, setRuntime] = useState<RuntimeLanguage>(server.runtime);
  const [version, setVersion] = useState<RuntimeVersion>(server.version);
  const [startupCommand, setStartupCommand] = useState(server.startupCommand);
  const [workingDir, setWorkingDir] = useState(server.workingDir);
  const [restartPolicy, setRestartPolicy] = useState<RestartPolicy>(server.restartPolicy);
  const [autoStart, setAutoStart] = useState(server.autoStart);
  const [cpuLimit, setCpuLimit] = useState(server.cpuLimit);
  const [ramLimit, setRamLimit] = useState(server.ramLimit);
  const [storageLimit, setStorageLimit] = useState(server.storageLimit);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const pythonVersions = ['3.9', '3.10', '3.11', '3.12', '3.13'];
  const nodeVersions = ['18', '20', '22', '24'];

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);

    const res = await fetchApi<BotServer>(`/servers/${server.id}/startup`, {
      method: 'PUT',
      body: JSON.stringify({
        runtime,
        version,
        startupCommand,
        workingDir,
        restartPolicy,
        autoStart,
        cpuLimit,
        ramLimit,
        storageLimit
      })
    });

    if (res.success && res.data) {
      onUpdate(res.data);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
    setSaving(false);
  };

  return (
    <div id="startup-tab-container" className="max-w-4xl space-y-6">
      {/* Header Info */}
      <div className="p-4 rounded-xl border border-purple-500/20 bg-slate-900/60 backdrop-blur-md flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" /> Process Service & Runtime Configuration
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Modify how your bot process is launched natively on the host system.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:from-purple-500 hover:to-cyan-500 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : savedSuccess ? (
            <Check className="w-3.5 h-3.5 text-emerald-300" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {savedSuccess ? 'Saved Changes!' : 'Save Configuration'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Runtime & Versions */}
        <div className="p-5 rounded-xl border border-purple-500/20 bg-slate-900/40 backdrop-blur-md space-y-4">
          <div className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" /> Runtime Environment
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Programming Language</label>
            <select
              value={runtime}
              onChange={(e) => {
                const newRt = e.target.value as RuntimeLanguage;
                setRuntime(newRt);
                setVersion(newRt === 'python' ? '3.12' : '22');
                setStartupCommand(newRt === 'python' ? 'python bot.py' : 'node index.js');
              }}
              className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-cyan-400"
            >
              <option value="python">Python (CPython / AsyncIO)</option>
              <option value="node">Node.js (V8 Engine)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Runtime Version</label>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value as RuntimeVersion)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-cyan-400"
            >
              {runtime === 'python' ? (
                pythonVersions.map((v) => <option key={v} value={v}>Python {v}</option>)
              ) : (
                nodeVersions.map((v) => <option key={v} value={v}>Node.js {v} LTS</option>)
              )}
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Startup Command</label>
            <input
              type="text"
              value={startupCommand}
              onChange={(e) => setStartupCommand(e.target.value)}
              placeholder="e.g. python bot.py or npm start"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-zinc-950 border border-zinc-700 text-cyan-300 focus:outline-none focus:border-cyan-400"
            />
            <span className="text-[11px] text-zinc-500 mt-1 block">
              Executed directly by the host runtime inside {workingDir}.
            </span>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Working Directory</label>
            <input
              type="text"
              value={workingDir}
              onChange={(e) => setWorkingDir(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-300 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Process Policies & Cgroups */}
        <div className="p-5 rounded-xl border border-cyan-500/20 bg-slate-900/40 backdrop-blur-md space-y-4">
          <div className="text-xs font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" /> Process Constraints & Policies
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Process Restart Policy</label>
            <select
              value={restartPolicy}
              onChange={(e) => setRestartPolicy(e.target.value as RestartPolicy)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-cyan-400"
            >
              <option value="always">Always (Auto-restart on exit & system reboot)</option>
              <option value="on-failure">On Failure (Auto-restart on non-zero crash exit)</option>
              <option value="unless-stopped">Unless Stopped</option>
              <option value="never">Never (Do not auto-restart)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
            <div>
              <div className="text-xs font-medium text-zinc-200">Auto-Boot Service on Node Start</div>
              <div className="text-[11px] text-zinc-500">Automatically spin up process service when daemon host boots.</div>
            </div>
            <input
              type="checkbox"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="w-4 h-4 accent-cyan-500 rounded"
            />
          </div>

          {/* Resource allocations */}
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-purple-400" /> CPU Core Limit</span>
                <span className="font-mono text-zinc-200">{cpuLimit}% ({(cpuLimit / 100).toFixed(1)} vCPU)</span>
              </div>
              <input
                type="range"
                min={50}
                max={400}
                step={25}
                value={cpuLimit}
                onChange={(e) => setCpuLimit(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span className="flex items-center gap-1"><Sliders className="w-3.5 h-3.5 text-cyan-400" /> RAM Memory Limit</span>
                <span className="font-mono text-zinc-200">{ramLimit} MB ({(ramLimit / 1024).toFixed(1)} GB)</span>
              </div>
              <input
                type="range"
                min={256}
                max={4096}
                step={128}
                value={ramLimit}
                onChange={(e) => setRamLimit(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span className="flex items-center gap-1"><HardDrive className="w-3.5 h-3.5 text-blue-400" /> Storage Limit</span>
                <span className="font-mono text-zinc-200">{(storageLimit / 1024).toFixed(1)} GB</span>
              </div>
              <input
                type="range"
                min={1024}
                max={10240}
                step={512}
                value={storageLimit}
                onChange={(e) => setStorageLimit(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
