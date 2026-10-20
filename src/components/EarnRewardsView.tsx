import React, { useState, useEffect } from 'react';
import { User, RewardTask, J4RTask } from '../types';
import { fetchApi } from '../lib/api';
import { useNotifications } from '../lib/notifications';
import {
  Gift,
  Coins,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Loader2,
  Flame,
  Check,
  Share2,
  Copy,
  Users,
  ShieldAlert,
  HelpCircle,
  Radio,
  Zap
} from 'lucide-react';

interface Props {
  currentUser: User | null;
  onUserUpdated: (user: User) => void;
  onNavigateToStore: () => void;
}

export const EarnRewardsView: React.FC<Props> = ({
  currentUser,
  onUserUpdated,
  onNavigateToStore
}) => {
  const { addToast } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [rewardsEnabled, setRewardsEnabled] = useState(true);
  const [bonusEnabled, setBonusEnabled] = useState(false);
  const [referralsEnabled, setReferralsEnabled] = useState(true);
  const [referralRewardCoins, setReferralRewardCoins] = useState(50);
  const [tasks, setTasks] = useState<RewardTask[]>([]);
  const [j4rTasks, setJ4rTasks] = useState<J4RTask[]>([]);
  const [filter, setFilter] = useState<'all' | 'official-discord' | 'j4r' | 'referrals' | 'linkvertise' | 'linkpays' | 'shortener' | 'daily'>('all');

  // Task execution & verification modal state
  const [activeTask, setActiveTask] = useState<RewardTask | null>(null);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(0);
  const [isClaiming, setIsClaiming] = useState(false);

  // Dedicated J4R Claim Modal State
  const [activeJ4r, setActiveJ4r] = useState<J4RTask | null>(null);
  const [discordHandle, setDiscordHandle] = useState('');
  const [j4rJoined, setJ4rJoined] = useState(false);
  const [isClaimingJ4r, setIsClaimingJ4r] = useState(false);

  // Referral copy feedback
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadRewardsData = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<{
        enabled: boolean;
        bonusEnabled?: boolean;
        referralsEnabled?: boolean;
        referralRewardCoins?: number;
        tasks: RewardTask[];
        j4rTasks?: J4RTask[];
        userWallet: {
          coins: number;
          completedTasks: string[];
          referralCode?: string;
          referralsCount?: number;
          referralCoinsEarned?: number;
        };
      }>('/rewards/tasks');

      if (res.success && res.data) {
        setRewardsEnabled(res.data.enabled);
        setBonusEnabled(res.data.bonusEnabled === true);
        setReferralsEnabled(res.data.referralsEnabled !== false);
        setReferralRewardCoins(res.data.referralRewardCoins || 50);
        setTasks(res.data.tasks || []);
        setJ4rTasks(res.data.j4rTasks || []);

        if (currentUser && res.data.userWallet) {
          onUserUpdated({
            ...currentUser,
            coins: res.data.userWallet.coins,
            completedTasks: res.data.userWallet.completedTasks,
            referralCode: res.data.userWallet.referralCode || currentUser.referralCode,
            referralsCount: res.data.userWallet.referralsCount ?? currentUser.referralsCount,
            referralCoinsEarned: res.data.userWallet.referralCoinsEarned ?? currentUser.referralCoinsEarned
          });
        }
      }
    } catch (err) {
      console.error('Failed to load rewards tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRewardsData();
  }, []);

  // Timer countdown hook for active task
  useEffect(() => {
    if (!activeTask || timerSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setTimerSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTask, timerSecondsLeft]);

  const handleStartTask = (task: RewardTask) => {
    setActiveTask(task);
    setTimerSecondsLeft(task.timerSeconds || 0);
  };

  const handleClaim = async () => {
    if (!activeTask) return;
    setIsClaiming(true);

    try {
      const res = await fetchApi<{
        message: string;
        coinsAdded: number;
        newBalance: number;
        user: User;
      }>('/rewards/claim', {
        method: 'POST',
        body: JSON.stringify({
          taskId: activeTask.id
        })
      });

      if (res.success && res.data) {
        onUserUpdated(res.data.user);
        addToast({
          type: 'success',
          title: `+${res.data.coinsAdded} Coins Claimed!`,
          message: res.data.message || 'Reward credited directly to your platform wallet.'
        });
        setActiveTask(null);
      } else {
        addToast({
          type: 'error',
          title: 'Claim Failed',
          message: res.error?.message || 'Could not verify task reward.'
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error Claiming',
        message: err.message || 'Network error'
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleOpenJ4rModal = (j4r: J4RTask) => {
    setActiveJ4r(j4r);
    setDiscordHandle('');
    setJ4rJoined(false);
  };

  const handleClaimJ4r = async () => {
    if (!activeJ4r) return;
    setIsClaimingJ4r(true);

    try {
      const res = await fetchApi<{
        message: string;
        coinsAdded: number;
        newBalance: number;
        user: User;
      }>('/rewards/j4r/claim', {
        method: 'POST',
        body: JSON.stringify({
          j4rId: activeJ4r.id,
          discordHandle: discordHandle.trim()
        })
      });

      if (res.success && res.data) {
        onUserUpdated(res.data.user);
        addToast({
          type: 'success',
          title: `+${res.data.coinsAdded} Coins Credited!`,
          message: res.data.message || 'Discord J4R verified successfully.'
        });
        setActiveJ4r(null);
      } else {
        addToast({
          type: 'error',
          title: 'Verification Failed',
          message: res.error?.message || 'Could not verify Discord membership.'
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error Claiming J4R',
        message: err.message || 'Network error'
      });
    } finally {
      setIsClaimingJ4r(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    addToast({
      type: 'success',
      title: 'Referral Code Copied!',
      message: `Share code ${code} with friends to earn +${referralRewardCoins} coins each.`
    });
  };

  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}/?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    addToast({
      type: 'success',
      title: 'Invite Link Copied!',
      message: 'Referral URL copied to clipboard.'
    });
  };

  const currentCoins = currentUser?.coins ?? 0;
  const completedIds = currentUser?.completedTasks || [];
  const userReferralCode = currentUser?.referralCode || `XOR-${currentUser?.username?.toUpperCase() || 'USER'}`;

  const officialDcTask = tasks.find(
    t => t.id === 'task_discord_join' || (t.category === 'community' && t.title.toLowerCase().includes('discord'))
  );

  const filteredTasks = tasks.filter(t => {
    if (!t.enabled) return false;
    if (t.id === officialDcTask?.id) return false; // Handled in dedicated Official Discord section
    if (t.category === 'daily' && !bonusEnabled) return false;
    if (filter === 'all') return true;
    return t.category === filter;
  });

  const activeJ4rList = j4rTasks.filter(j => j.enabled);
  const isOfficialDcClaimed = officialDcTask ? completedIds.includes(officialDcTask.id) : false;

  const getProviderBadge = (category: string) => {
    switch (category) {
      case 'linkvertise':
        return { label: 'Linkvertise', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30' };
      case 'linkpays':
        return { label: 'Linkpays', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'shortener':
        return { label: 'URL Shortener', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
      case 'daily':
        return { label: 'Daily Bonus', bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
      case 'community':
        return { label: 'Community', bg: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' };
      default:
        return { label: 'Task Offer', bg: 'bg-purple-500/10 text-purple-300 border-purple-500/30' };
    }
  };

  if (!rewardsEnabled && !loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
        <div className="p-8 rounded-2xl bg-[#080B18]/90 border border-purple-500/30 text-center space-y-4 shadow-2xl glass-panel">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto">
            <Gift className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100">Rewards Program Paused</h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            The rewards and shortener task offers are temporarily disabled by the platform administrators. Check back soon for new task drops!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="p-6 rounded-2xl bg-[#080B18]/90 border border-[rgba(140,120,255,0.2)] shadow-xl glass-panel relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-indigo-600/15 via-purple-600/5 to-transparent pointer-events-none" />

        <div className="flex items-start gap-4 z-10">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 text-indigo-400 shrink-0 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            <Gift className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">
                Earn Free Coins & Upgrades
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                <span>Instant Payout</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
              Complete sponsored shorteners, Linkpays, Linkvertise offers, Discord J4R partners, or invite friends to get coins and upgrade your bot resources in the store!
            </p>
          </div>
        </div>

        {/* User Balance & Store Link */}
        <div className="flex items-center gap-4 bg-black/40 border border-white/10 rounded-2xl p-4 shrink-0 z-10">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <Coins className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Platform Wallet
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-300 flex items-center gap-1.5">
              <span>{currentCoins.toLocaleString()}</span>
              <span className="text-xs text-amber-400/80 font-normal">Coins</span>
            </div>
          </div>
          <button
            onClick={onNavigateToStore}
            className="ml-2 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] shadow-lg shadow-amber-500/20"
            title="Spend coins on RAM, CPU and Slots"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Open Store</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Subsections */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'all', label: 'All Offers', count: (officialDcTask ? 1 : 0) + filteredTasks.length + activeJ4rList.length },
          { id: 'official-discord', label: '🎮 Official Discord (DC Join)', count: officialDcTask ? 1 : 0, badge: 'Official' },
          { id: 'j4r', label: '⚡ Discord J4R (Partner Hub)', count: activeJ4rList.length, badge: 'Partners' },
          ...(referralsEnabled ? [{ id: 'referrals', label: '👥 Refer & Earn', count: `+${referralRewardCoins}` }] : []),
          { id: 'linkvertise', label: 'Linkvertise', count: filteredTasks.filter(t => t.category === 'linkvertise').length },
          { id: 'linkpays', label: 'Linkpays', count: filteredTasks.filter(t => t.category === 'linkpays').length },
          { id: 'shortener', label: 'URL Shorteners', count: filteredTasks.filter(t => t.category === 'shortener').length },
          ...(bonusEnabled ? [{ id: 'daily', label: '🎁 Daily Bonus', count: filteredTasks.filter(t => t.category === 'daily').length }] : [])
        ].map(cat => {
          const isActive = filter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.35)]'
                  : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] border border-white/5'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isActive ? 'bg-black/30 text-white' : 'bg-white/10 text-zinc-400'
              }`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: Official Discord Community ("DC Join") Dedicated Section */}
      {(filter === 'all' || filter === 'official-discord') && officialDcTask && (
        <div className="rounded-2xl border border-[#5865F2]/40 bg-gradient-to-br from-[#12163b] via-[#090b1c] to-[#040612] p-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-[#5865F2]/20 via-transparent to-transparent pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#5865F2]/30 text-[#8c96f8] border border-[#5865F2]/50 uppercase font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Official Headquarters · DC Join
                </span>
                <span className="text-xs text-amber-300 font-mono font-bold flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  +{officialDcTask.rewardCoins} Coins Verified Reward
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Join the Official Xorvila Discord Community
              </h2>

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                Connect directly with the core bot hosting engineers, get real-time cluster node announcements, early cgroup features, developer roles, and exclusive community giveaways!
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-zinc-400 font-mono">
                <span className="flex items-center gap-1 text-[#8c96f8]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#5865F2]" /> Verified Host Engine
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Instant SQLite Credit
                </span>
                <span className="flex items-center gap-1 text-purple-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Official Roles
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0">
              <a
                href={officialDcTask.url || 'https://discord.gg/xorvila'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs shadow-lg shadow-[#5865F2]/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Join Official Server (discord.gg/xorvila)</span>
              </a>

              {isOfficialDcClaimed ? (
                <div className="px-5 py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-2 shadow-inner">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>DC Reward Claimed (+{officialDcTask.rewardCoins} Coins)</span>
                </div>
              ) : (
                <button
                  onClick={() => handleStartTask(officialDcTask)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Coins className="w-4 h-4 text-amber-200" />
                  <span>Verify DC Join & Claim +{officialDcTask.rewardCoins} Coins</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Discord J4R (Join 4 Reward) Dedicated Section */}
      {(filter === 'all' || filter === 'j4r') && activeJ4rList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Zap className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Discord Join-for-Reward (J4R) Partner Hub
                </h2>
                <p className="text-xs text-zinc-400">
                  External Discord partner servers. Join partner communities, verify your handle, and earn extra coin rewards.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 rounded-full hidden sm:inline">
              Third-Party J4R Partners
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeJ4rList.map(j4r => {
              const isClaimed = completedIds.includes(j4r.id);

              return (
                <div
                  key={j4r.id}
                  className={`rounded-2xl border p-5 transition-all flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#0c0f24] to-[#060814] ${
                    isClaimed
                      ? 'border-emerald-500/30 opacity-75'
                      : 'border-[#5865F2]/30 hover:border-[#5865F2]/60 hover:shadow-[0_0_20px_rgba(88,101,242,0.2)]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2] shrink-0 overflow-hidden">
                          {j4r.iconUrl ? (
                            <img src={j4r.iconUrl} alt={j4r.serverName} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                            </svg>
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white leading-tight">{j4r.serverName}</h3>
                          <span className="text-[10px] text-zinc-400 font-mono">{j4r.memberCount || '1,000+ Members'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>+{j4r.rewardCoins}</span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed mb-3">
                      {j4r.description}
                    </p>

                    <div className="text-[11px] text-purple-300/90 font-mono flex items-center gap-1.5 mb-4">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>{j4r.requirements || 'Join & stay for rewards'}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5">
                    {isClaimed ? (
                      <div className="w-full py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Reward Claimed (Joined)</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenJ4rModal(j4r)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#5865F2] to-indigo-600 hover:from-[#4752c4] hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-[#5865F2]/25 hover:shadow-[#5865F2]/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Join & Claim +{j4r.rewardCoins} Coins</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: Referral System Dedicated Section */}
      {(filter === 'all' || filter === 'referrals') && referralsEnabled && (
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#120a2a] via-[#090b1c] to-[#040612] p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase font-semibold">
                  Viral Referral Engine
                </span>
                <span className="text-xs text-amber-300 font-mono font-bold">
                  +{referralRewardCoins} Coins Per Friend
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Invite Bot Builders & Earn Passive Coins
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-xl leading-relaxed">
                Give your friends free high-speed hosting slots. Whenever a new user registers with your unique referral code or link, you instantly get <strong className="text-amber-300 font-mono">+{referralRewardCoins} coins</strong> credited to your SQLite platform wallet!
              </p>
            </div>

            {/* Referral Stats Cards */}
            <div className="grid grid-cols-2 gap-3 w-full lg:w-auto shrink-0">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                <div className="text-[10px] text-zinc-400 font-mono uppercase">Friends Referred</div>
                <div className="text-2xl font-black font-mono text-purple-300 mt-1">
                  {currentUser?.referralsCount || 0}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                <div className="text-[10px] text-zinc-400 font-mono uppercase">Referral Earnings</div>
                <div className="text-2xl font-black font-mono text-amber-300 mt-1 flex items-center justify-center gap-1">
                  <Coins className="w-5 h-5 text-amber-400 inline" />
                  <span>{currentUser?.referralCoinsEarned || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Copy Box */}
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:flex-1 relative">
              <input
                type="text"
                readOnly
                value={userReferralCode}
                className="w-full px-4 py-3 rounded-xl bg-black/60 border border-purple-500/40 text-sm font-mono font-extrabold text-purple-200 tracking-wider focus:outline-none"
              />
            </div>

            <button
              onClick={() => handleCopyCode(userReferralCode)}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Code Copied!' : 'Copy Referral Code'}</span>
            </button>

            <button
              onClick={() => handleCopyLink(userReferralCode)}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-zinc-200 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Share2 className="w-4 h-4 text-indigo-400" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Direct Link'}</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: Standard Task Offers (Linkvertise, Linkpays, Shorteners, Daily) */}
      {(filter !== 'j4r' && filter !== 'referrals') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              Sponsor Verification & Shortener Tasks
            </h2>
            <span className="text-xs text-zinc-400 font-mono">
              {filteredTasks.length} Available
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-44 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
              <Gift className="w-8 h-8 text-zinc-500 mx-auto" />
              <p className="text-sm text-zinc-400">No active offers available in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTasks.map(task => {
                const isCompleted = completedIds.includes(task.id) && !task.dailyReset;
                const badge = getProviderBadge(task.category);

                return (
                  <div
                    key={task.id}
                    className={`relative rounded-2xl bg-[#080B18]/85 border p-5 shadow-lg transition-all flex flex-col justify-between overflow-hidden ${
                      isCompleted
                        ? 'border-emerald-500/20 opacity-70'
                        : 'border-[rgba(140,120,255,0.15)] hover:border-indigo-500/40 hover:shadow-indigo-500/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.bg}`}>
                          {badge.label}
                        </span>

                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold shadow-sm">
                          <Coins className="w-3.5 h-3.5 text-amber-400" />
                          <span>+{task.rewardCoins}</span>
                        </div>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-zinc-100">
                        {task.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>

                      <div className="mt-3 text-[11px] text-zinc-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>
                          {task.timerSeconds ? `~${task.timerSeconds}s verification time` : 'Instant claim'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/5">
                      {isCompleted ? (
                        <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Task Completed</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartTask(task)}
                          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold cursor-pointer transition-all shadow-md shadow-purple-600/20 active:scale-98"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {task.category === 'daily' ? 'Claim Daily Reward' : 'Start Task & Earn'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* J4R Join & Verification Modal */}
      {activeJ4r && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0b0e1d] border border-[#5865F2]/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2] shrink-0">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white truncate">{activeJ4r.serverName}</h3>
                <p className="text-xs text-amber-300 font-mono font-bold mt-0.5">
                  Reward: +{activeJ4r.rewardCoins} Platform Coins
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3 p-4 rounded-2xl bg-black/40 border border-white/5">
              <div className="flex items-start gap-3 text-xs text-zinc-300">
                <span className="w-5 h-5 rounded-full bg-[#5865F2] text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                <div>
                  <span className="font-semibold text-white block">Join the Discord Server:</span>
                  <p className="text-zinc-400 text-[11px] mt-0.5">Click the join button to open Discord invite in a new window.</p>
                  <a
                    href={activeJ4r.inviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setJ4rJoined(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Join Server Invite</span>
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-zinc-300 pt-3 border-t border-white/5">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                <div className="w-full">
                  <span className="font-semibold text-white block">Enter your Discord Username:</span>
                  <input
                    type="text"
                    placeholder="e.g. @developer or alex#1234"
                    value={discordHandle}
                    onChange={e => setDiscordHandle(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveJ4r(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClaimJ4r}
                disabled={isClaimingJ4r || !discordHandle.trim()}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  discordHandle.trim() && !isClaimingJ4r
                    ? 'bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed opacity-60'
                }`}
              >
                {isClaimingJ4r ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Discord...</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-3.5 h-3.5 text-amber-300" />
                    <span>Verify & Claim +{activeJ4r.rewardCoins} Coins</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Verification / Countdown Modal */}
      {activeTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0b0e1d] border border-indigo-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 shrink-0">
                <Gift className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-zinc-100 truncate">{activeTask.title}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Complete instructions to receive +{activeTask.rewardCoins} coins
                </p>
              </div>
            </div>

            {/* Step Instructions */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
              <div className="text-xs text-zinc-300 leading-relaxed">
                <span className="font-semibold text-purple-300 block mb-1">Instructions:</span>
                {activeTask.instructions}
              </div>

              {activeTask.url && (
                <div className="pt-1">
                  <a
                    href={activeTask.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-medium transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Task Link ({activeTask.category})</span>
                  </a>
                </div>
              )}
            </div>

            {/* Countdown / Ready Indicator */}
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 text-center">
              {timerSecondsLeft > 0 ? (
                <div className="space-y-1">
                  <div className="text-2xl font-mono font-bold text-amber-300 animate-pulse">
                    {timerSecondsLeft}s
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Verifying sponsor session... Please wait for the timer to finish.
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verification Complete! Ready to Claim.</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveTask(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClaim}
                disabled={timerSecondsLeft > 0 || isClaiming}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  timerSecondsLeft === 0 && !isClaiming
                    ? 'bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white shadow-lg shadow-emerald-500/25 hover:scale-[1.02]'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed opacity-60'
                }`}
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Crediting Coins...</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-3.5 h-3.5 text-amber-300" />
                    <span>Claim +{activeTask.rewardCoins} Coins</span>
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
