import React, { useState } from 'react';
import { BotServer } from '../../types';
import { fetchApi } from '../../lib/api';
import { Key, Plus, Trash2, Eye, EyeOff, Save, Download, Upload, Check, RefreshCw } from 'lucide-react';

interface Props {
  server: BotServer;
  onUpdate: (updated: BotServer) => void;
}

export const EnvTab: React.FC<Props> = ({ server, onUpdate }) => {
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string; isSecret: boolean }>>(() => {
    return Object.entries(server.env || {}).map(([k, v]) => ({
      key: k,
      value: v,
      isSecret: k.toLowerCase().includes('token') || k.toLowerCase().includes('pass') || k.toLowerCase().includes('secret') || k.toLowerCase().includes('key')
    }));
  });

  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAddVar = () => {
    setEnvVars((prev) => [...prev, { key: '', value: '', isSecret: false }]);
  };

  const handleRemoveVar = (index: number) => {
    setEnvVars((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);

    const envMap: Record<string, string> = {};
    envVars.forEach((item) => {
      const cleanKey = item.key.trim().toUpperCase();
      if (cleanKey) {
        envMap[cleanKey] = item.value;
      }
    });

    const res = await fetchApi<Record<string, string>>(`/servers/${server.id}/env`, {
      method: 'PUT',
      body: JSON.stringify({ env: envMap })
    });

    if (res.success && res.data) {
      onUpdate({ ...server, env: res.data });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
    setSaving(false);
  };

  const handleBulkImport = () => {
    const lines = bulkText.split('\n');
    const newVars: Array<{ key: string; value: string; isSecret: boolean }> = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const k = trimmed.substring(0, eqIdx).trim();
          let v = trimmed.substring(eqIdx + 1).trim();
          // Strip quotes if present
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          newVars.push({
            key: k,
            value: v,
            isSecret: k.toLowerCase().includes('token') || k.toLowerCase().includes('pass') || k.toLowerCase().includes('secret')
          });
        }
      }
    });

    if (newVars.length > 0) {
      setEnvVars(newVars);
      setShowBulkImport(false);
      setBulkText('');
    }
  };

  const handleExportEnv = () => {
    const raw = envVars.map(v => `${v.key}=${v.value}`).join('\n');
    const blob = new Blob([raw], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `.env`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="env-tab-container" className="max-w-4xl space-y-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-purple-500/20 bg-slate-900/60 backdrop-blur-md">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" /> Environment Variables & Secrets
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Key-value pairs securely injected into the container at boot time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkImport(!showBulkImport)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-all flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" /> Bulk Import
          </button>

          <button
            onClick={handleExportEnv}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export .env
          </button>

          <button
            onClick={handleAddVar}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Variable
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:from-purple-500 hover:to-cyan-500 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : savedSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {savedSuccess ? 'Saved!' : 'Save Variables'}
          </button>
        </div>
      </div>

      {/* Bulk Import Box */}
      {showBulkImport && (
        <div className="p-4 rounded-xl border border-cyan-500/30 bg-slate-950/80 backdrop-blur-md space-y-3">
          <div className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-cyan-400" /> Paste Raw .env Content
          </div>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`DISCORD_TOKEN=xyz...\nPREFIX=!\nLOG_LEVEL=INFO`}
            rows={5}
            className="w-full p-3 font-mono text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowBulkImport(false)}
              className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkImport}
              className="px-4 py-1 text-xs font-semibold rounded-lg bg-cyan-600 text-white hover:bg-cyan-500"
            >
              Parse and Import
            </button>
          </div>
        </div>
      )}

      {/* Variable List */}
      <div className="space-y-3">
        {envVars.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-500 rounded-xl border border-zinc-800 bg-slate-900/30">
            No environment variables configured. Click 'Add Variable' or 'Bulk Import' to create one.
          </div>
        )}

        {envVars.map((item, idx) => {
          const isRevealed = revealedKeys.has(item.key) || !item.isSecret;
          return (
            <div
              key={idx}
              className="p-3 rounded-xl border border-purple-500/15 bg-slate-900/40 backdrop-blur-md flex flex-wrap md:flex-nowrap items-center gap-3"
            >
              <div className="w-full md:w-1/3">
                <input
                  type="text"
                  value={item.key}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEnvVars(prev => {
                      const next = [...prev];
                      next[idx].key = val;
                      return next;
                    });
                  }}
                  placeholder="KEY (e.g. BOT_TOKEN)"
                  className="w-full px-3 py-2 text-xs font-mono font-semibold uppercase rounded-lg bg-zinc-950 border border-zinc-700 text-purple-300 placeholder-zinc-600 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="w-full md:flex-1 relative flex items-center">
                <input
                  type={isRevealed ? 'text' : 'password'}
                  value={item.value}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEnvVars(prev => {
                      const next = [...prev];
                      next[idx].value = val;
                      return next;
                    });
                  }}
                  placeholder="Value..."
                  className="w-full pr-10 px-3 py-2 text-xs font-mono rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => toggleReveal(item.key)}
                  className="absolute right-2.5 text-zinc-500 hover:text-zinc-300"
                  title={isRevealed ? 'Hide Secret' : 'Reveal Secret'}
                >
                  {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRemoveVar(idx)}
                  className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg border border-zinc-800 transition-colors"
                  title="Remove Variable"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
