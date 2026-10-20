import React, { useState, useEffect } from 'react';
import { User, StoreItem, StarterPlanConfig } from '../types';
import { fetchApi } from '../lib/api';
import { useNotifications } from '../lib/notifications';
import {
  ShoppingBag,
  Coins,
  Cpu,
  HardDrive,
  Layers,
  Server,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Gift,
  Plus
} from 'lucide-react';

interface Props {
  currentUser: User | null;
  onUserUpdated: (user: User) => void;
  onNavigateToRewards: () => void;
  onOpenCreateModal: () => void;
}

export const StoreView: React.FC<Props> = ({
  currentUser,
  onUserUpdated,
  onNavigateToRewards,
  onOpenCreateModal
}) => {
  const { addToast } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [storeEnabled, setStoreEnabled] = useState(true);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'ram' | 'cpu' | 'disk' | 'slots'>('all');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<StoreItem | null>(null);

  const loadStoreData = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<{
        enabled: boolean;
        items: StoreItem[];
        userWallet: {
          coins: number;
          extraSlots: number;
          extraRamMb: number;
          extraDiskMb: number;
          extraCpuPct: number;
          starterPlan: StarterPlanConfig;
        };
      }>('/store/catalog');

      if (res.success && res.data) {
        setStoreEnabled(res.data.enabled);
        setItems(res.data.items || []);
        if (currentUser && res.data.userWallet) {
          onUserUpdated({
            ...currentUser,
            coins: res.data.userWallet.coins,
            extraSlots: res.data.userWallet.extraSlots,
            extraRamMb: res.data.userWallet.extraRamMb,
            extraDiskMb: res.data.userWallet.extraDiskMb,
            extraCpuPct: res.data.userWallet.extraCpuPct
          });
        }
      }
    } catch (err) {
      console.error('Failed to load store catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoreData();
  }, []);

  const handlePurchase = async (item: StoreItem) => {
    setPurchasingId(item.id);
    try {
      const res = await fetchApi<{ message: string; user: User; purchasedItem: StoreItem }>('/store/purchase', {
        method: 'POST',
        body: JSON.stringify({ itemId: item.id })
      });

      if (res.success && res.data) {
        onUserUpdated(res.data.user);
        addToast({
          type: 'success',
          title: 'Upgrade Activated!',
          message: `${item.name} has been added to your account limits.`
        });
        setConfirmItem(null);
      } else {
        addToast({
          type: 'error',
          title: 'Purchase Failed',
          message: res.error?.message || 'Could not complete store purchase'
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Network Error',
        message: err.message || 'Error communicating with store'
      });
    } finally {
      setPurchasingId(null);
    }
  };

  const currentCoins = currentUser?.coins ?? 150;
  const filteredItems = items.filter(
    item => (selectedCategory === 'all' || item.category === selectedCategory) && item.enabled
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ram':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'cpu':
        return <Cpu className="w-5 h-5 text-purple-400" />;
      case 'disk':
        return <HardDrive className="w-5 h-5 text-cyan-400" />;
      case 'slots':
        return <Layers className="w-5 h-5 text-indigo-400" />;
      default:
        return <ShoppingBag className="w-5 h-5 text-zinc-400" />;
    }
  };

  if (!storeEnabled && !loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
        <div className="p-8 rounded-2xl bg-[#080B18]/90 border border-amber-500/30 text-center space-y-4 shadow-2xl glass-panel">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100">Marketplace Under Maintenance</h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            The resource marketplace has been temporarily paused by cluster administrators. Check back shortly or claim rewards to accumulate coins!
          </p>
          <div className="pt-2">
            <button
              onClick={onNavigateToRewards}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs sm:text-sm cursor-pointer shadow-lg shadow-purple-600/30 transition-all"
            >
              <Gift className="w-4 h-4" />
              <span>Earn Platform Rewards</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Wallet & Hero Header */}
      <div className="p-6 rounded-2xl bg-[#080B18]/90 border border-[rgba(140,120,255,0.2)] shadow-xl glass-panel relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-purple-600/15 via-indigo-600/5 to-transparent pointer-events-none" />

        <div className="flex items-start gap-4 z-10">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-purple-600/20 border border-amber-500/30 text-amber-400 shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">
                Resource Marketplace
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                Instant Activation
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
              Purchase permanent container hardware upgrades, extra bot slots, RAM, and dedicated CPU cores with your coin balance.
            </p>
          </div>
        </div>

        {/* User Balance Card */}
        <div className="flex items-center gap-4 bg-black/40 border border-white/10 rounded-2xl p-4 shrink-0 z-10">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <Coins className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Your Coin Balance
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-300 flex items-center gap-1.5">
              <span>{currentCoins.toLocaleString()}</span>
              <span className="text-xs text-amber-400/80 font-normal">Coins</span>
            </div>
          </div>
          <button
            onClick={onNavigateToRewards}
            className="ml-2 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02]"
            title="Earn more coins through tasks"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Earn More</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active Upgrades Overview Banner */}
      {((currentUser?.extraSlots || 0) > 0 ||
        (currentUser?.extraRamMb || 0) > 0 ||
        (currentUser?.extraDiskMb || 0) > 0 ||
        (currentUser?.extraCpuPct || 0) > 0) && (
        <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-purple-200">Your Active Store Upgrades:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(currentUser?.extraSlots || 0) > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono">
                +{currentUser?.extraSlots} Bot Slots
              </span>
            )}
            {(currentUser?.extraRamMb || 0) > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono">
                +{currentUser?.extraRamMb} MB RAM
              </span>
            )}
            {(currentUser?.extraDiskMb || 0) > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-mono">
                +{(currentUser?.extraDiskMb || 0) / 1024} GB Disk
              </span>
            )}
            {(currentUser?.extraCpuPct || 0) > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-mono">
                +{currentUser?.extraCpuPct}% vCPU
              </span>
            )}
          </div>
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Deploy with Upgrades</span>
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'all', label: 'All Resources', icon: ShoppingBag },
          { id: 'slots', label: 'Bot Slots', icon: Layers },
          { id: 'ram', label: 'Memory (RAM)', icon: Zap },
          { id: 'cpu', label: 'Processor (CPU)', icon: Cpu },
          { id: 'disk', label: 'NVMe Storage', icon: HardDrive }
        ].map(cat => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                  : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] border border-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Store Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
          <ShoppingBag className="w-8 h-8 text-zinc-500 mx-auto" />
          <p className="text-sm text-zinc-400">No store items available in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map(item => {
            const canAfford = currentCoins >= item.priceCoins;
            const isPurchasing = purchasingId === item.id;

            return (
              <div
                key={item.id}
                className="group relative rounded-2xl bg-[#080B18]/85 border border-[rgba(140,120,255,0.15)] hover:border-purple-500/40 p-5 shadow-lg hover:shadow-purple-500/10 transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Background Accent Glow */}
                <div className="absolute -top-12 -right-12 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />

                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 group-hover:border-purple-500/30 transition-colors">
                      {getCategoryIcon(item.category)}
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/30 shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-zinc-100 group-hover:text-purple-300 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-500">Upgrade Value:</span>
                    <span className="font-semibold text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/20">
                      +{item.amount} {item.unit}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="text-base font-extrabold text-amber-300">
                      {item.priceCoins.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-zinc-500 uppercase font-mono">Coins</span>
                  </div>

                  <button
                    onClick={() => setConfirmItem(item)}
                    disabled={!canAfford || isPurchasing}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:scale-[1.02]'
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {isPurchasing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Activating...</span>
                      </>
                    ) : canAfford ? (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Buy Upgrade</span>
                      </>
                    ) : (
                      <span>Need {item.priceCoins - currentCoins} more</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0b0e1d] border border-purple-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">Confirm Upgrade Purchase</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Are you sure you want to purchase this hardware boost?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Upgrade:</span>
                <span className="font-semibold text-zinc-200">{confirmItem.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Total Price:</span>
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" />
                  {confirmItem.priceCoins} Coins
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Remaining Balance:</span>
                <span className="font-mono text-zinc-300">
                  {(currentCoins - confirmItem.priceCoins).toLocaleString()} Coins
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePurchase(confirmItem)}
                disabled={purchasingId !== null}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                {purchasingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm & Deduct Coins</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
