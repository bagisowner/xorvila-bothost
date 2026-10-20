import React, { useState, useEffect } from 'react';
import { RewardTask, J4RTask } from '../../types';
import { fetchApi } from '../../lib/api';
import {
  Gift,
  Coins,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Power,
  PowerOff,
  Clock,
  Loader2,
  Check,
  X,
  Flame,
  Globe,
  Radio,
  Users,
  Share2,
  Sparkles
} from 'lucide-react';

export const AdminRewardsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [rewardsEnabled, setRewardsEnabled] = useState(true);
  const [bonusEnabled, setBonusEnabled] = useState(false);
  const [referralsEnabled, setReferralsEnabled] = useState(true);
  const [referralRewardCoins, setReferralRewardCoins] = useState(50);
  const [tempReferralCoins, setTempReferralCoins] = useState(50);
  const [savingReferralCoins, setSavingReferralCoins] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState<'tasks' | 'j4r' | 'referrals'>('tasks');
  const [tasks, setTasks] = useState<RewardTask[]>([]);
  const [j4rTasks, setJ4rTasks] = useState<J4RTask[]>([]);

  // Toggling states
  const [togglingRewards, setTogglingRewards] = useState(false);
  const [togglingBonus, setTogglingBonus] = useState(false);
  const [togglingReferrals, setTogglingReferrals] = useState(false);

  // Edit / New Task modal state
  const [editingTask, setEditingTask] = useState<RewardTask | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New task form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<'linkvertise' | 'linkpays' | 'shortener' | 'community' | 'daily'>('shortener');
  const [newRewardCoins, setNewRewardCoins] = useState(70);
  const [newUrl, setNewUrl] = useState('');
  const [newInstructions, setNewInstructions] = useState('Complete the short link steps and return to claim.');
  const [newTimer, setNewTimer] = useState(12);
  const [newDailyReset, setNewDailyReset] = useState(false);

  // J4R Modal State
  const [editingJ4r, setEditingJ4r] = useState<J4RTask | null>(null);
  const [isNewJ4rModalOpen, setIsNewJ4rModalOpen] = useState(false);
  const [newJ4rName, setNewJ4rName] = useState('');
  const [newJ4rDesc, setNewJ4rDesc] = useState('');
  const [newJ4rInvite, setNewJ4rInvite] = useState('');
  const [newJ4rCoins, setNewJ4rCoins] = useState(150);
  const [newJ4rMembers, setNewJ4rMembers] = useState('2,500 Members');
  const [newJ4rCategory, setNewJ4rCategory] = useState('Partner Server');
  const [newJ4rReqs, setNewJ4rReqs] = useState('Join server & verify membership.');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<{
        rewardsEnabled: boolean;
        bonusEnabled?: boolean;
        referralsEnabled?: boolean;
        referralRewardCoins?: number;
        rewardTasks: RewardTask[];
        j4rTasks?: J4RTask[];
      }>('/admin/settings');

      if (res.success && res.data) {
        setRewardsEnabled(res.data.rewardsEnabled !== false);
        setBonusEnabled(res.data.bonusEnabled === true);
        setReferralsEnabled(res.data.referralsEnabled !== false);
        const refCoins = res.data.referralRewardCoins || 50;
        setReferralRewardCoins(refCoins);
        setTempReferralCoins(refCoins);
        setTasks(res.data.rewardTasks || []);
        setJ4rTasks(res.data.j4rTasks || []);
      }
    } catch (e) {
      console.error('Failed to load rewards settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleRewards = async () => {
    setTogglingRewards(true);
    try {
      const nextState = !rewardsEnabled;
      const res = await fetchApi<{ rewardsEnabled: boolean }>('/admin/settings/toggles', {
        method: 'PUT',
        body: JSON.stringify({ rewardsEnabled: nextState })
      });
      if (res.success) {
        setRewardsEnabled(nextState);
      }
    } catch (e) {
      console.error('Failed to toggle rewards:', e);
    } finally {
      setTogglingRewards(false);
    }
  };

  const handleToggleBonus = async () => {
    setTogglingBonus(true);
    try {
      const nextState = !bonusEnabled;
      const res = await fetchApi<{ bonusEnabled: boolean }>('/admin/settings/toggles', {
        method: 'PUT',
        body: JSON.stringify({ bonusEnabled: nextState })
      });
      if (res.success) {
        setBonusEnabled(nextState);
      }
    } catch (e) {
      console.error('Failed to toggle bonus:', e);
    } finally {
      setTogglingBonus(false);
    }
  };

  const handleToggleReferrals = async () => {
    setTogglingReferrals(true);
    try {
      const nextState = !referralsEnabled;
      const res = await fetchApi<{ referralsEnabled: boolean }>('/admin/settings/toggles', {
        method: 'PUT',
        body: JSON.stringify({ referralsEnabled: nextState })
      });
      if (res.success) {
        setReferralsEnabled(nextState);
      }
    } catch (e) {
      console.error('Failed to toggle referrals:', e);
    } finally {
      setTogglingReferrals(false);
    }
  };

  const handleSaveReferralCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingReferralCoins(true);
    try {
      const res = await fetchApi('/admin/settings/toggles', {
        method: 'PUT',
        body: JSON.stringify({ referralRewardCoins: Number(tempReferralCoins) })
      });
      if (res.success) {
        setReferralRewardCoins(Number(tempReferralCoins));
      }
    } catch (e) {
      console.error('Failed to save referral coins:', e);
    } finally {
      setSavingReferralCoins(false);
    }
  };

  // Toggle individual task status (Disable without deleting)
  const handleToggleTaskEnabled = async (task: RewardTask) => {
    try {
      const updated = { ...task, enabled: !task.enabled };
      const res = await fetchApi<RewardTask>(`/admin/settings/reward-tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated)
      });
      if (res.success) {
        setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
      }
    } catch (e) {
      console.error('Failed to toggle task status:', e);
    }
  };

  // Toggle individual J4R status (Disable without deleting)
  const handleToggleJ4rEnabled = async (j4r: J4RTask) => {
    try {
      const updated = { ...j4r, enabled: !j4r.enabled };
      const res = await fetchApi<J4RTask>(`/admin/settings/j4r-tasks/${j4r.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated)
      });
      if (res.success) {
        setJ4rTasks(prev => prev.map(j => j.id === j4r.id ? updated : j));
      }
    } catch (e) {
      console.error('Failed to toggle J4R status:', e);
    }
  };

  const handleSaveTaskEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      const res = await fetchApi<RewardTask>(`/admin/settings/reward-tasks/${editingTask.id}`, {
        method: 'PUT',
        body: JSON.stringify(editingTask)
      });

      if (res.success && res.data) {
        setTasks(prev => prev.map(t => t.id === editingTask.id ? res.data! : t));
        setEditingTask(null);
      }
    } catch (e) {
      console.error('Failed to update task:', e);
    }
  };

  const handleSaveJ4rEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJ4r) return;

    try {
      const res = await fetchApi<J4RTask>(`/admin/settings/j4r-tasks/${editingJ4r.id}`, {
        method: 'PUT',
        body: JSON.stringify(editingJ4r)
      });

      if (res.success && res.data) {
        setJ4rTasks(prev => prev.map(j => j.id === editingJ4r.id ? res.data! : j));
        setEditingJ4r(null);
      }
    } catch (e) {
      console.error('Failed to update J4R:', e);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newRewardCoins) return;

    try {
      const payload = {
        title: newTitle.trim(),
        description: newDesc.trim(),
        category: newCategory,
        rewardCoins: Number(newRewardCoins),
        url: newUrl.trim(),
        instructions: newInstructions.trim(),
        timerSeconds: Number(newTimer),
        dailyReset: Boolean(newDailyReset),
        enabled: true
      };

      const res = await fetchApi<RewardTask>('/admin/settings/reward-tasks', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success && res.data) {
        setTasks(prev => [...prev, res.data!]);
        setIsNewTaskModalOpen(false);
        setNewTitle('');
        setNewDesc('');
        setNewUrl('');
      }
    } catch (e) {
      console.error('Failed to create task:', e);
    }
  };

  const handleCreateJ4r = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJ4rName.trim() || !newJ4rInvite.trim() || !newJ4rCoins) return;

    try {
      const payload = {
        serverName: newJ4rName.trim(),
        description: newJ4rDesc.trim(),
        inviteUrl: newJ4rInvite.trim(),
        rewardCoins: Number(newJ4rCoins),
        memberCount: newJ4rMembers.trim(),
        category: newJ4rCategory.trim(),
        requirements: newJ4rReqs.trim(),
        enabled: true
      };

      const res = await fetchApi<J4RTask>('/admin/settings/j4r-tasks', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success && res.data) {
        setJ4rTasks(prev => [...prev, res.data!]);
        setIsNewJ4rModalOpen(false);
        setNewJ4rName('');
        setNewJ4rDesc('');
        setNewJ4rInvite('');
      }
    } catch (e) {
      console.error('Failed to create J4R partner:', e);
    }
  };

  const handleDeleteTask = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetchApi(`/admin/settings/reward-tasks/${id}`, { method: 'DELETE' });
      if (res.success) {
        setTasks(prev => prev.filter(t => t.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete task:', e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteJ4r = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetchApi(`/admin/settings/j4r-tasks/${id}`, { method: 'DELETE' });
      if (res.success) {
        setJ4rTasks(prev => prev.filter(j => j.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete J4R partner:', e);
    } finally {
      setDeletingId(null);
    }
  };

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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner & Master Feature Toggles */}
      <div className="rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-950/30 via-slate-900/60 to-purple-950/20 p-5 backdrop-blur-xl space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 shrink-0">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Rewards, J4R & Referral Control Deck
              </h3>
              <p className="mt-1 text-xs text-zinc-300 max-w-2xl leading-relaxed">
                Configure sponsored links, Discord J4R partners, referral rewards, and optional daily bonus coins. Toggle offers active or disabled with a single click.
              </p>
            </div>
          </div>

          {/* Quick Master Switches */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Rewards Master Toggle */}
            <button
              onClick={handleToggleRewards}
              disabled={togglingRewards}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                rewardsEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
              }`}
            >
              {togglingRewards ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : rewardsEnabled ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
              <span>Rewards: {rewardsEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Daily Bonus Toggle */}
            <button
              onClick={handleToggleBonus}
              disabled={togglingBonus}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                bonusEnabled
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700 hover:text-white'
              }`}
              title="Toggle daily check-in bonus coins"
            >
              {togglingBonus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : bonusEnabled ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <X className="w-3.5 h-3.5 text-zinc-500" />}
              <span>Daily Bonus: {bonusEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Referral System Toggle */}
            <button
              onClick={handleToggleReferrals}
              disabled={togglingReferrals}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                referralsEnabled
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                  : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700 hover:text-white'
              }`}
              title="Toggle referral code registration and invite bonuses"
            >
              {togglingReferrals ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : referralsEnabled ? <Users className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
              <span>Referrals: {referralsEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Referral Reward Coins Setting Quick Bar */}
        {referralsEnabled && (
          <form onSubmit={handleSaveReferralCoins} className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Coins awarded to referring user upon new friend registration:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={tempReferralCoins}
                onChange={e => setTempReferralCoins(Number(e.target.value))}
                className="w-24 px-3 py-1.5 rounded-lg bg-black/60 border border-purple-500/40 text-xs font-mono font-bold text-amber-300 focus:outline-none"
              />
              <span className="text-zinc-400 text-xs">Coins</span>
              <button
                type="submit"
                disabled={savingReferralCoins || tempReferralCoins === referralRewardCoins}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs transition-all cursor-pointer"
              >
                {savingReferralCoins ? 'Saving...' : 'Update Coins'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Sub Tabs: Tasks vs Discord J4R */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'tasks'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white bg-white/[0.03]'
            }`}
          >
            Tasks & Shorteners ({tasks.length})
          </button>

          <button
            onClick={() => setActiveSubTab('j4r')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'j4r'
                ? 'bg-[#5865F2] text-white shadow-md shadow-[#5865F2]/30'
                : 'text-zinc-400 hover:text-white bg-white/[0.03]'
            }`}
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>Discord J4R Partners ({j4rTasks.length})</span>
          </button>
        </div>

        {activeSubTab === 'tasks' ? (
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Reward Task</span>
          </button>
        ) : (
          <button
            onClick={() => setIsNewJ4rModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs shadow-md shadow-[#5865F2]/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add J4R Server</span>
          </button>
        )}
      </div>

      {/* SUBTAB 1: TASKS & SHORTENERS */}
      {activeSubTab === 'tasks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map(task => {
            const badge = getProviderBadge(task.category);

            return (
              <div
                key={task.id}
                className={`rounded-2xl border p-4.5 bg-[#090b1c]/90 transition-all flex flex-col justify-between space-y-3 ${
                  task.enabled
                    ? 'border-white/10 hover:border-indigo-500/30'
                    : 'border-white/5 opacity-60 bg-zinc-950/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.bg}`}>
                    {badge.label}
                  </span>

                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>+{task.rewardCoins}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-zinc-100">{task.title}</h4>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>
                </div>

                <div className="text-[11px] text-zinc-400 flex items-center justify-between font-mono">
                  <span className="flex items-center gap-1 text-zinc-500">
                    <Clock className="w-3 h-3" />
                    <span>{task.timerSeconds || 0}s Timer</span>
                  </span>
                  {task.dailyReset && (
                    <span className="text-indigo-400 font-semibold">24h Cooldown</span>
                  )}
                </div>

                {/* Status Switch & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleToggleTaskEnabled(task)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      task.enabled
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'
                    }`}
                    title={task.enabled ? 'Click to Disable task' : 'Click to Enable task'}
                  >
                    {task.enabled ? 'ACTIVE' : 'DISABLED'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingTask(task)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                      title="Edit task & coin payout"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={deletingId === task.id}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 transition-all cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUBTAB 2: DISCORD J4R PARTNERS */}
      {activeSubTab === 'j4r' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/30 flex items-center justify-between">
            <div className="text-xs text-zinc-300">
              <strong className="text-white block font-bold">Discord Join 4 Reward (J4R) Configuration</strong>
              Users join these partner Discord servers and verify their Discord handle to earn the specified coins.
            </div>
            <span className="text-xs font-mono font-bold text-[#5865F2]">
              {j4rTasks.length} Servers Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {j4rTasks.map(j4r => (
              <div
                key={j4r.id}
                className={`rounded-2xl border p-4.5 bg-[#090b1c]/90 transition-all flex flex-col justify-between space-y-3 ${
                  j4r.enabled
                    ? 'border-[#5865F2]/30 hover:border-[#5865F2]/60'
                    : 'border-white/5 opacity-60 bg-zinc-950/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2] shrink-0">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{j4r.serverName}</h4>
                      <span className="text-[10px] text-zinc-400 font-mono">{j4r.memberCount || '1,000+ Members'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>+{j4r.rewardCoins}</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {j4r.description}
                </p>

                <div className="text-[11px] font-mono text-zinc-400 truncate">
                  <a href={j4r.inviteUrl} target="_blank" rel="noreferrer" className="text-[#5865F2] hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate">{j4r.inviteUrl}</span>
                  </a>
                </div>

                {/* Status Switch & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleToggleJ4rEnabled(j4r)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      j4r.enabled
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'
                    }`}
                    title={j4r.enabled ? 'Click to Disable J4R' : 'Click to Enable J4R'}
                  >
                    {j4r.enabled ? 'ACTIVE' : 'DISABLED'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingJ4r(j4r)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                      title="Edit J4R details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteJ4r(j4r.id)}
                      disabled={deletingId === j4r.id}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 transition-all cursor-pointer"
                      title="Delete J4R"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveTaskEdit} className="bg-[#0b0e1d] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-purple-400" />
              Edit Reward Task
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingTask.title}
                  onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Reward Coins</label>
                <input
                  type="number"
                  required
                  min="5"
                  value={editingTask.rewardCoins}
                  onChange={e => setEditingTask({ ...editingTask, rewardCoins: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Target URL</label>
                <input
                  type="url"
                  value={editingTask.url}
                  onChange={e => setEditingTask({ ...editingTask, url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingTask.description}
                  onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Task Modal */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateTask} className="bg-[#0b0e1d] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-400" />
              Add New Sponsor Offer
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 block mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Linkvertise Bonus Step #2"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="linkvertise">Linkvertise</option>
                    <option value="linkpays">Linkpays</option>
                    <option value="shortener">URL Shortener</option>
                    <option value="community">Community</option>
                    <option value="daily">Daily Bonus</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1">Reward Coins</label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={newRewardCoins}
                    onChange={e => setNewRewardCoins(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Target Link URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Short Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe how to complete the offer..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewTaskModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit J4R Modal */}
      {editingJ4r && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveJ4rEdit} className="bg-[#0b0e1d] border border-[#5865F2]/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-[#5865F2]" />
              Edit Discord J4R Partner
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 block mb-1">Server Name</label>
                <input
                  type="text"
                  required
                  value={editingJ4r.serverName}
                  onChange={e => setEditingJ4r({ ...editingJ4r, serverName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 block mb-1">Reward Coins</label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={editingJ4r.rewardCoins}
                    onChange={e => setEditingJ4r({ ...editingJ4r, rewardCoins: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1">Members Count</label>
                  <input
                    type="text"
                    value={editingJ4r.memberCount || ''}
                    onChange={e => setEditingJ4r({ ...editingJ4r, memberCount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Discord Invite URL</label>
                <input
                  type="url"
                  required
                  value={editingJ4r.inviteUrl}
                  onChange={e => setEditingJ4r({ ...editingJ4r, inviteUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingJ4r.description}
                  onChange={e => setEditingJ4r({ ...editingJ4r, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-[#5865F2]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingJ4r(null)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs shadow-md"
              >
                Save Partner
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New J4R Modal */}
      {isNewJ4rModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateJ4r} className="bg-[#0b0e1d] border border-[#5865F2]/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#5865F2]" />
              Add Partner Discord Server (J4R)
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 block mb-1">Discord Server Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Minecraft & Bot Central"
                  value={newJ4rName}
                  onChange={e => setNewJ4rName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 block mb-1">Coins Reward</label>
                  <input
                    type="number"
                    required
                    min="10"
                    placeholder="150"
                    value={newJ4rCoins}
                    onChange={e => setNewJ4rCoins(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1">Member Count Display</label>
                  <input
                    type="text"
                    placeholder="3,400 Members"
                    value={newJ4rMembers}
                    onChange={e => setNewJ4rMembers(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Discord Invite Link</label>
                <input
                  type="url"
                  required
                  placeholder="https://discord.gg/..."
                  value={newJ4rInvite}
                  onChange={e => setNewJ4rInvite(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Server Description</label>
                <textarea
                  rows={2}
                  placeholder="Official developer community..."
                  value={newJ4rDesc}
                  onChange={e => setNewJ4rDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-[#5865F2]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewJ4rModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs shadow-md"
              >
                Add J4R Server
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
