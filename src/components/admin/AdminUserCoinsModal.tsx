import React, { useState } from 'react';
import { User } from '../../types';
import { fetchApi } from '../../lib/api';
import {
  Coins,
  Layers,
  Zap,
  HardDrive,
  Cpu,
  X,
  Check,
  Loader2,
  Gift,
  Plus,
  Minus
} from 'lucide-react';

interface Props {
  user: User;
  onClose: () => void;
  onUpdated: (user: User) => void;
}

export const AdminUserCoinsModal: React.FC<Props> = ({ user, onClose, onUpdated }) => {
  const [coinsDelta, setCoinsDelta] = useState<number>(100);
  const [extraSlots, setExtraSlots] = useState<number>(user.extraSlots || 0);
  const [extraRamMb, setExtraRamMb] = useState<number>(user.extraRamMb || 0);
  const [extraDiskMb, setExtraDiskMb] = useState<number>(user.extraDiskMb || 0);
  const [extraCpuPct, setExtraCpuPct] = useState<number>(user.extraCpuPct || 0);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdjustCoins = async (delta: number) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetchApi<User>(`/admin/users/${user.id}/adjust-coins`, {
        method: 'POST',
        body: JSON.stringify({
          deltaCoins: delta,
          extraSlots,
          extraRamMb,
          extraDiskMb,
          extraCpuPct
        })
      });

      if (res.success && res.data) {
        onUpdated(res.data);
        onClose();
      } else {
        setErrorMsg(res.error?.message || 'Failed to adjust balance');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const currentCoins = user.coins ?? 150;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#0b0e1d] border border-purple-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">Manage Balance & Limits</h3>
              <p className="text-xs text-zinc-400">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Current Balances */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400">Current Coins:</span>
            <span className="font-bold text-amber-300 font-mono text-sm flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              {currentCoins.toLocaleString()} Coins
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-300 pt-2 border-t border-white/5">
            <div>Extra Slots: +{user.extraSlots || 0}</div>
            <div>Extra RAM: +{user.extraRamMb || 0} MB</div>
            <div>Extra Disk: +{(user.extraDiskMb || 0) / 1024} GB</div>
            <div>Extra CPU: +{user.extraCpuPct || 0}%</div>
          </div>
        </div>

        {/* Quick Grant Coins */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 block">Grant / Deduct Coins</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              step={25}
              value={coinsDelta}
              onChange={e => setCoinsDelta(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
            />
            <button
              onClick={() => handleAdjustCoins(coinsDelta)}
              disabled={saving}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer whitespace-nowrap"
            >
              +{coinsDelta}
            </button>
            <button
              onClick={() => handleAdjustCoins(-coinsDelta)}
              disabled={saving}
              className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer whitespace-nowrap"
            >
              -{coinsDelta}
            </button>
          </div>
        </div>

        {/* Direct Extra Resource Overrides */}
        <div className="space-y-3 pt-1">
          <label className="text-xs font-semibold text-zinc-300 block">Direct Extra Quotas</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-zinc-400 font-mono block mb-1">Extra Slots</span>
              <input
                type="number"
                min={0}
                value={extraSlots}
                onChange={e => setExtraSlots(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-mono block mb-1">Extra RAM (MB)</span>
              <input
                type="number"
                min={0}
                step={256}
                value={extraRamMb}
                onChange={e => setExtraRamMb(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-mono block mb-1">Extra Disk (MB)</span>
              <input
                type="number"
                min={0}
                step={1024}
                value={extraDiskMb}
                onChange={e => setExtraDiskMb(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-mono block mb-1">Extra CPU (%)</span>
              <input
                type="number"
                min={0}
                step={25}
                value={extraCpuPct}
                onChange={e => setExtraCpuPct(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() => handleAdjustCoins(0)}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-purple-600/30"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Limits</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
