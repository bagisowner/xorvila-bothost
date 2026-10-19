import React, { useState } from 'react';
import { BotServer } from '../../types';
import { fetchApi } from '../../lib/api';
import { Settings, Package, RefreshCw, AlertTriangle, Trash2, Check, Save } from 'lucide-react';

interface Props {
  server: BotServer;
  onUpdate: (updated: BotServer) => void;
  onDelete: () => void;
}

export const SettingsTab: React.FC<Props> = ({ server, onUpdate, onDelete }) => {
  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description || '');
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [installingDeps, setInstallingDeps] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleSaveGeneral = async () => {
    setSavingGeneral(true);
    const res = await fetchApi<BotServer>(`/servers/${server.id}/startup`, {
      method: 'PUT',
      body: JSON.stringify({ name, description })
    });

    if (res.success && res.data) {
      onUpdate({ ...server, name, description });
      setActionSuccess('General settings updated');
      setTimeout(() => setActionSuccess(null), 3000);
    }
    setSavingGeneral(false);
  };

  const handleInstallDeps = async () => {
    setInstallingDeps(true);
    const res = await fetchApi(`/servers/${server.id}/dependencies/install`, {
      method: 'POST'
    });

    if (res.success) {
      setActionSuccess(
        server.runtime === 'python'
          ? 'Installed packages from requirements.txt'
          : 'Installed npm dependencies'
      );
      setTimeout(() => setActionSuccess(null), 4000);
    }
    setInstallingDeps(false);
  };

  const handleRebuild = async () => {
    if (!confirm('Rebuilding will recreate the container filesystem base and recompile packages. Continue?')) return;
    setRebuilding(true);
    const res = await fetchApi(`/servers/${server.id}/rebuild`, {
      method: 'POST'
    });

    if (res.success) {
      setActionSuccess('Container rebuilt successfully');
      setTimeout(() => setActionSuccess(null), 4000);
    }
    setRebuilding(false);
  };

  const handleDelete = async () => {
    const confirmName = prompt(`To confirm deletion, type the bot name "${server.name}":`);
    if (confirmName !== server.name) {
      alert('Deletion cancelled. Name did not match.');
      return;
    }

    const res = await fetchApi(`/servers/${server.id}`, { method: 'DELETE' });
    if (res.success) {
      onDelete();
    }
  };

  return (
    <div id="settings-tab-container" className="max-w-4xl space-y-6">
      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" /> {actionSuccess}
        </div>
      )}

      {/* General Settings */}
      <div className="p-5 rounded-xl border border-purple-500/20 bg-slate-900/40 backdrop-blur-md space-y-4">
        <h3 className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-2">
          <Settings className="w-4 h-4 text-purple-400" /> Bot Metadata
        </h3>

        <div>
          <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Bot Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full p-3 text-xs rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSaveGeneral}
            disabled={savingGeneral}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:from-purple-500 hover:to-cyan-500 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> Save Changes
          </button>
        </div>
      </div>

      {/* Dependency Management & Maintenance */}
      <div className="p-5 rounded-xl border border-cyan-500/20 bg-slate-900/40 backdrop-blur-md space-y-4">
        <h3 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
          <Package className="w-4 h-4 text-cyan-400" /> Container Operations & Maintenance
        </h3>

        <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
          <div>
            <div className="text-xs font-semibold text-zinc-200">
              {server.runtime === 'python' ? 'Install requirements.txt' : 'Install package.json dependencies'}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Runs `{server.runtime === 'python' ? 'pip install -r requirements.txt' : 'npm install'}` safely in the container sandbox.
            </div>
          </div>
          <button
            onClick={handleInstallDeps}
            disabled={installingDeps}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all flex items-center gap-1.5"
          >
            <Package className="w-3.5 h-3.5" />
            {installingDeps ? 'Installing...' : 'Install Dependencies'}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
          <div>
            <div className="text-xs font-semibold text-zinc-200">Rebuild Process Environment</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Refreshes the isolated workspace environment, clean caches, and optimizes dependencies.
            </div>
          </div>
          <button
            onClick={handleRebuild}
            disabled={rebuilding}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${rebuilding ? 'animate-spin' : ''}`} />
            {rebuilding ? 'Rebuilding...' : 'Rebuild Environment'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-5 rounded-xl border border-rose-500/30 bg-rose-950/10 backdrop-blur-md space-y-3">
        <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" /> Danger Zone
        </h3>
        <p className="text-xs text-zinc-400">
          Permanently delete this bot server, its native workspace files, and historical backups. This action cannot be reversed.
        </p>
        <button
          onClick={handleDelete}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/50 hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
        >
          <Trash2 className="w-3.5 h-3.5" /> Destroy & Delete Server
        </button>
      </div>
    </div>
  );
};
