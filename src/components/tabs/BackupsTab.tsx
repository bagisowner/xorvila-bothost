import React, { useState, useEffect } from 'react';
import { BotServer, ServerBackup } from '../../types';
import { fetchApi } from '../../lib/api';
import { Archive, Plus, Download, RotateCcw, Trash2, Shield, Clock, Check, RefreshCw } from 'lucide-react';

interface Props {
  server: BotServer;
}

export const BackupsTab: React.FC<Props> = ({ server }) => {
  const [backups, setBackups] = useState<ServerBackup[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadBackups = async () => {
    setLoading(true);
    const res = await fetchApi<ServerBackup[]>(`/servers/${server.id}/backups`);
    if (res.success && res.data) {
      setBackups(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBackups();
  }, [server.id]);

  const handleCreateBackup = async () => {
    setCreating(true);
    const res = await fetchApi<ServerBackup>(`/servers/${server.id}/backups/create`, {
      method: 'POST',
      body: JSON.stringify({ name: backupName.trim() || undefined })
    });

    if (res.success && res.data) {
      setBackups(prev => [res.data!, ...prev]);
      setBackupName('');
    }
    setCreating(false);
  };

  const handleRestore = async (backup: ServerBackup) => {
    if (!confirm(`Are you sure you want to restore "${backup.name}"? Current files will be replaced with this snapshot.`)) return;

    setRestoringId(backup.id);
    const res = await fetchApi(`/servers/${server.id}/backups/${backup.id}/restore`, {
      method: 'POST'
    });

    if (res.success) {
      alert('Backup restored successfully!');
    }
    setRestoringId(null);
  };

  const handleDelete = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) return;
    const res = await fetchApi(`/servers/${server.id}/backups/${backupId}`, {
      method: 'DELETE'
    });

    if (res.success) {
      setBackups(prev => prev.filter(b => b.id !== backupId));
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div id="backups-tab-container" className="max-w-4xl space-y-6">
      {/* Create Backup Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-purple-500/20 bg-slate-900/60 backdrop-blur-md">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Archive className="w-4 h-4 text-purple-400" /> Container Snapshots & Backups
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Create full-filesystem snapshots stored separately from active container volumes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
            placeholder="Backup label (optional)"
            className="px-3 py-1.5 text-xs rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-400 w-44"
          />
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:from-purple-500 hover:to-cyan-500 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50"
          >
            {creating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Create Snapshot
          </button>
        </div>
      </div>

      {/* Backups List */}
      <div className="rounded-xl border border-purple-500/20 bg-slate-900/40 backdrop-blur-md overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-950/40 border-b border-zinc-800/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          <div className="col-span-6 sm:col-span-5">Snapshot Name</div>
          <div className="col-span-3 sm:col-span-2 text-right">Size</div>
          <div className="hidden sm:block sm:col-span-3 text-right">Created Date</div>
          <div className="col-span-3 sm:col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y divide-zinc-800/40">
          {backups.length === 0 && (
            <div className="p-8 text-center text-xs text-zinc-500">
              No backups created yet. Click 'Create Snapshot' to take an immediate archive.
            </div>
          )}

          {backups.map((b) => (
            <div key={b.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs items-center hover:bg-white/[0.02]">
              <div className="col-span-6 sm:col-span-5 flex items-center gap-2.5 min-w-0">
                <Archive className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-200 truncate">{b.name}</div>
                  <div className="text-[10px] text-zinc-500 font-mono truncate">{b.checksum}</div>
                </div>
              </div>

              <div className="col-span-3 sm:col-span-2 text-right font-mono text-zinc-300">
                {formatBytes(b.size)}
              </div>

              <div className="hidden sm:block sm:col-span-3 text-right text-zinc-400 text-[11px]">
                {new Date(b.createdAt).toLocaleString()}
              </div>

              <div className="col-span-3 sm:col-span-2 flex justify-end items-center gap-2">
                <button
                  onClick={() => handleRestore(b)}
                  disabled={restoringId === b.id}
                  className="px-2.5 py-1 text-xs rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-900/40 transition-colors flex items-center gap-1"
                  title="Restore Backup"
                >
                  <RotateCcw className={`w-3 h-3 ${restoringId === b.id ? 'animate-spin' : ''}`} />
                  Restore
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                  title="Delete Backup"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
