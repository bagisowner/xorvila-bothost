import React, { useState, useEffect } from 'react';
import { StoreItem } from '../../types';
import { fetchApi } from '../../lib/api';
import {
  ShoppingBag,
  Coins,
  Cpu,
  HardDrive,
  Layers,
  Zap,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Power,
  PowerOff,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const AdminStoreTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [storeEnabled, setStoreEnabled] = useState(true);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [togglingStore, setTogglingStore] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New item form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<'ram' | 'cpu' | 'disk' | 'slots'>('ram');
  const [newAmount, setNewAmount] = useState(512);
  const [newUnit, setNewUnit] = useState('MB');
  const [newPrice, setNewPrice] = useState(100);
  const [newBadge, setNewBadge] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<{
        storeEnabled: boolean;
        storeItems: StoreItem[];
      }>('/admin/settings');

      if (res.success && res.data) {
        setStoreEnabled(res.data.storeEnabled !== false);
        setItems(res.data.storeItems || []);
      }
    } catch (e) {
      console.error('Failed to load store settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStore = async () => {
    setTogglingStore(true);
    try {
      const nextState = !storeEnabled;
      const res = await fetchApi<{ storeEnabled: boolean }>('/admin/settings/toggles', {
        method: 'PUT',
        body: JSON.stringify({ storeEnabled: nextState })
      });
      if (res.success) {
        setStoreEnabled(nextState);
      }
    } catch (e) {
      console.error('Failed to toggle store:', e);
    } finally {
      setTogglingStore(false);
    }
  };

  const handleToggleItemEnabled = async (item: StoreItem) => {
    try {
      const updated = { ...item, enabled: !item.enabled };
      const res = await fetchApi<StoreItem>(`/admin/settings/store-items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated)
      });
      if (res.success) {
        setItems(prev => prev.map(i => i.id === item.id ? updated : i));
      }
    } catch (e) {
      console.error('Failed to toggle item status:', e);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const res = await fetchApi<StoreItem>(`/admin/settings/store-items/${editingItem.id}`, {
        method: 'PUT',
        body: JSON.stringify(editingItem)
      });

      if (res.success && res.data) {
        setItems(prev => prev.map(i => i.id === editingItem.id ? res.data! : i));
        setEditingItem(null);
      }
    } catch (e) {
      console.error('Failed to save edited item:', e);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice) return;

    try {
      const payload = {
        name: newName.trim(),
        description: newDesc.trim(),
        category: newCategory,
        amount: Number(newAmount),
        unit: newUnit,
        priceCoins: Number(newPrice),
        badge: newBadge.trim() || undefined,
        enabled: true
      };

      const res = await fetchApi<StoreItem>('/admin/settings/store-items', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success && res.data) {
        setItems(prev => [...prev, res.data!]);
        setIsNewModalOpen(false);
        setNewName('');
        setNewDesc('');
        setNewBadge('');
      }
    } catch (e) {
      console.error('Failed to create store item:', e);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetchApi(`/admin/settings/store-items/${id}`, { method: 'DELETE' });
      if (res.success) {
        setItems(prev => prev.filter(i => i.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete store item:', e);
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ram':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'cpu':
        return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'disk':
        return <HardDrive className="w-4 h-4 text-cyan-400" />;
      case 'slots':
        return <Layers className="w-4 h-4 text-indigo-400" />;
      default:
        return <ShoppingBag className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Platform Feature Toggle */}
      <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-purple-950/20 p-5 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Store & Resource Marketplace Management
            </h3>
            <p className="mt-1 text-xs text-zinc-300 max-w-2xl leading-relaxed">
              Enable or disable the platform resource marketplace, adjust coin pricing for RAM, CPU, Disk, and bot creation slots, or introduce new upgrade tiers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Store Feature Toggle Button */}
          <button
            onClick={handleToggleStore}
            disabled={togglingStore}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              storeEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
            }`}
          >
            {togglingStore ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : storeEnabled ? (
              <Power className="w-4 h-4" />
            ) : (
              <PowerOff className="w-4 h-4" />
            )}
            <span>Marketplace: {storeEnabled ? 'ONLINE' : 'OFFLINE'}</span>
          </button>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Store Item</span>
          </button>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div
            key={item.id}
            className={`rounded-2xl border p-5 bg-[#080B18]/85 space-y-4 shadow-lg transition-all ${
              item.enabled
                ? 'border-white/10 hover:border-amber-500/30'
                : 'border-white/5 opacity-60 bg-zinc-950/40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                  {getCategoryIcon(item.category)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100">{item.name}</h4>
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">
                    +{item.amount} {item.unit}
                  </span>
                </div>
              </div>

              {item.badge && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {item.badge}
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
              {item.description}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-sm">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>{item.priceCoins.toLocaleString()} Coins</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleItemEnabled(item)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                    item.enabled
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'
                  }`}
                  title={item.enabled ? 'Disable item' : 'Enable item'}
                >
                  {item.enabled ? 'ACTIVE' : 'DISABLED'}
                </button>

                <button
                  onClick={() => setEditingItem(item)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                  title="Edit item specs & price"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteItem(item.id)}
                  disabled={deletingId === item.id}
                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 transition-all cursor-pointer"
                  title="Delete item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0b0e1d] border border-amber-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                Edit Store Item
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Item Name</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingItem.description}
                  onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Price (Coins)</label>
                  <input
                    type="number"
                    min={1}
                    value={editingItem.priceCoins}
                    onChange={e => setEditingItem({ ...editingItem, priceCoins: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Badge (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Popular, Hot"
                    value={editingItem.badge || ''}
                    onChange={e => setEditingItem({ ...editingItem, badge: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Upgrade Amount</label>
                  <input
                    type="number"
                    min={1}
                    value={editingItem.amount}
                    onChange={e => setEditingItem({ ...editingItem, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Unit</label>
                  <input
                    type="text"
                    value={editingItem.unit}
                    onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs cursor-pointer shadow-md shadow-amber-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Item Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0b0e1d] border border-amber-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                Add New Store Upgrade
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Resource Category</label>
                <select
                  value={newCategory}
                  onChange={e => {
                    const cat = e.target.value as any;
                    setNewCategory(cat);
                    if (cat === 'ram') { setNewAmount(512); setNewUnit('MB'); }
                    else if (cat === 'cpu') { setNewAmount(50); setNewUnit('%'); }
                    else if (cat === 'disk') { setNewAmount(1024); setNewUnit('MB'); }
                    else if (cat === 'slots') { setNewAmount(1); setNewUnit('Slot'); }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="ram">Memory (RAM)</option>
                  <option value="cpu">Processor (CPU)</option>
                  <option value="disk">NVMe Storage</option>
                  <option value="slots">Server Creation Slots</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Item Title</label>
                <input
                  type="text"
                  placeholder="e.g. +512 MB High-Speed RAM"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Expands container memory limit for high throughput bots."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Price (Coins)</label>
                  <input
                    type="number"
                    min={1}
                    value={newPrice}
                    onChange={e => setNewPrice(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Badge</label>
                  <input
                    type="text"
                    placeholder="e.g. Popular"
                    value={newBadge}
                    onChange={e => setNewBadge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Amount</label>
                  <input
                    type="number"
                    min={1}
                    value={newAmount}
                    onChange={e => setNewAmount(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Unit</label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={e => setNewUnit(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-bold text-xs cursor-pointer shadow-md shadow-amber-500/20"
                >
                  Create Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
