import React, { useState, useEffect } from 'react';
import { ClusterOverview, User, AuditLog, BotServer } from '../types';
import { fetchApi } from '../lib/api';
import { DatabaseExplorer } from './DatabaseExplorer';
import { NotificationMaker } from './NotificationMaker';
import { SystemHealthView } from './SystemHealthView';
import { AdminStarterPlanTab } from './admin/AdminStarterPlanTab';
import { AdminStoreTab } from './admin/AdminStoreTab';
import { AdminRewardsTab } from './admin/AdminRewardsTab';
import { AdminUserCoinsModal } from './admin/AdminUserCoinsModal';
import {
  Shield,
  Server,
  Users,
  Activity,
  Cpu,
  HardDrive,
  RotateCw,
  Search,
  CheckCircle,
  Clock,
  Lock,
  Unlock,
  AlertCircle,
  FileCode,
  Folder,
  Zap,
  Terminal,
  Database,
  Megaphone,
  Trash2,
  Archive,
  RefreshCw,
  Radio,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  Edit3,
  Sliders,
  X,
  ShoppingBag,
  Gift,
  Coins,
  ArrowLeft
} from 'lucide-react';

export type AdminTab =
  | 'overview'
  | 'starter-plan'
  | 'store-management'
  | 'rewards-management'
  | 'users'
  | 'storage'
  | 'servers'
  | 'database'
  | 'health'
  | 'notifications'
  | 'audit';

interface Props {
  currentUser: User;
  initialTab?: AdminTab;
  activeTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
  onReturnHome?: () => void;
}

export const AdminPanel: React.FC<Props> = ({
  currentUser,
  initialTab = 'overview',
  activeTab: controlledTab,
  onTabChange,
  onReturnHome
}) => {
  const [internalTab, setInternalTab] = useState<AdminTab>(initialTab);
  const activeTab = controlledTab || internalTab;

  useEffect(() => {
    if (initialTab) {
      setInternalTab(initialTab);
    }
  }, [initialTab]);

  const setActiveTab = (tab: AdminTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const [overview, setOverview] = useState<ClusterOverview | null>(null);
  const [servers, setServers] = useState<BotServer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [userForCoins, setUserForCoins] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Quick Action States
  const [backingUp, setBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [syncingDisk, setSyncingDisk] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, serversRes, usersRes, auditRes] = await Promise.all([
        fetchApi<ClusterOverview>('/admin/overview'),
        fetchApi<BotServer[]>('/servers'),
        fetchApi<User[]>('/admin/users'),
        fetchApi<AuditLog[]>('/admin/audit-logs')
      ]);

      if (overviewRes.success && overviewRes.data) setOverview(overviewRes.data);
      if (serversRes.success && serversRes.data) setServers(serversRes.data);
      if (usersRes.success && usersRes.data) setUsers(usersRes.data);
      if (auditRes.success && auditRes.data) setAuditLogs(auditRes.data);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Failed to refresh admin panel telemetry:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Edit Modals State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingServer, setEditingServer] = useState<BotServer | null>(null);

  // In-App Deletion Confirmation States (No blocked window.confirm)
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);

  const [serverToDelete, setServerToDelete] = useState<BotServer | null>(null);
  const [isDeletingServer, setIsDeletingServer] = useState(false);
  const [deleteServerError, setDeleteServerError] = useState<string | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleSuspendUser = async (user: User) => {
    const res = await fetchApi<User>(`/admin/users/${user.id}/suspend`, { method: 'POST' });
    if (res.success && res.data) {
      setUsers(prev => prev.map(u => u.id === user.id ? res.data! : u));
      showToast(`User ${user.email} is now ${res.data.suspended ? 'suspended' : 'active'}.`);
    }
  };

  const handleChangeRole = async (user: User, newRole: 'user' | 'moderator' | 'admin') => {
    const res = await fetchApi<User>(`/admin/users/${user.id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole })
    });
    if (res.success && res.data) {
      setUsers(prev => prev.map(u => u.id === user.id ? res.data! : u));
      showToast(`Updated role for ${user.email} to ${newRole}.`);
    }
  };

  const handleSaveUserEdit = async () => {
    if (!editingUser) return;
    const res = await fetchApi<User>(`/admin/users/${editingUser.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: editingUser.name,
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
        suspended: editingUser.suspended
      })
    });
    if (res.success && res.data) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? res.data! : u));
      setEditingUser(null);
      showToast(`User profile for ${editingUser.email} updated successfully.`);
    } else {
      showToast(res.error?.message || 'Failed to update user profile.', 'error');
    }
  };

  // Open User Deletion In-App Modal
  const promptDeleteUser = (user: User) => {
    setDeleteUserError(null);
    setUserToDelete(user);
  };

  // Execute User Deletion reliably
  const executeDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    setDeleteUserError(null);
    try {
      const res = await fetchApi(`/admin/users/${userToDelete.id}`, { method: 'DELETE' });
      if (res.success) {
        setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
        if (editingUser?.id === userToDelete.id) setEditingUser(null);
        showToast(`User "${userToDelete.name}" (${userToDelete.email}) permanently deleted.`);
        setUserToDelete(null);
        loadData();
      } else {
        setDeleteUserError(res.error?.message || 'Failed to delete user.');
      }
    } catch (e: any) {
      setDeleteUserError(e.message || 'An unexpected error occurred while deleting user.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleSaveServerEdit = async () => {
    if (!editingServer) return;
    const res = await fetchApi<BotServer>(`/admin/servers/${editingServer.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: editingServer.name,
        cpuLimit: editingServer.cpuLimit,
        ramLimit: editingServer.ramLimit,
        storageLimit: editingServer.storageLimit,
        startupCommand: editingServer.startupCommand,
        ownerId: editingServer.ownerId
      })
    });
    if (res.success && res.data) {
      setServers(prev => prev.map(s => s.id === editingServer.id ? res.data! : s));
      setEditingServer(null);
      showToast(`Server resources for "${editingServer.name}" updated.`);
    } else {
      showToast(res.error?.message || 'Failed to update server resources.', 'error');
    }
  };

  const handleToggleSuspendServer = async (server: BotServer) => {
    const res = await fetchApi<BotServer>(`/admin/servers/${server.id}/suspend`, { method: 'POST' });
    if (res.success && res.data) {
      setServers(prev => prev.map(s => s.id === server.id ? res.data! : s));
      showToast(`Server "${server.name}" is now ${res.data.suspended ? 'suspended' : 'active'}.`);
    } else {
      showToast(res.error?.message || 'Failed to toggle server suspension.', 'error');
    }
  };

  // Open Server Deletion In-App Modal
  const promptDeleteServer = (server: BotServer) => {
    setDeleteServerError(null);
    setServerToDelete(server);
  };

  // Execute Server Deletion reliably
  const executeDeleteServer = async () => {
    if (!serverToDelete) return;
    setIsDeletingServer(true);
    setDeleteServerError(null);
    try {
      const res = await fetchApi(`/servers/${serverToDelete.id}`, { method: 'DELETE' });
      if (res.success) {
        setServers(prev => prev.filter(s => s.id !== serverToDelete.id));
        if (editingServer?.id === serverToDelete.id) setEditingServer(null);
        showToast(`Bot container "${serverToDelete.name}" purged successfully.`);
        setServerToDelete(null);
        loadData();
      } else {
        setDeleteServerError(res.error?.message || 'Failed to delete server container.');
      }
    } catch (e: any) {
      setDeleteServerError(e.message || 'An error occurred while deleting server.');
    } finally {
      setIsDeletingServer(false);
    }
  };

  const handleQuickBackup = async () => {
    setBackingUp(true);
    setBackupMsg(null);
    try {
      const res = await fetchApi<any>('/admin/database/backup', { method: 'POST' });
      if (res.success) {
        setBackupMsg(`Native backup created: ${res.data?.filename || 'database.db'} (${res.data?.size_kb || '0 KB'})`);
        setTimeout(() => setBackupMsg(null), 4000);
        loadData();
      } else {
        alert(res.error?.message || 'Backup failed');
      }
    } finally {
      setBackingUp(false);
    }
  };

  const handleSyncDisk = async () => {
    setSyncingDisk(true);
    setSyncMsg(null);
    try {
      const res = await fetchApi<any>('/admin/database/sync-all', { method: 'POST' });
      if (res.success) {
        setSyncMsg(res.data?.message || 'All server files and SQLite records synchronized successfully.');
        setTimeout(() => setSyncMsg(null), 4000);
        loadData();
      } else {
        alert(res.error?.message || 'Sync failed');
      }
    } finally {
      setSyncingDisk(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  const totalRamGb = ((overview?.clusterRamTotalMb || 65536) / 1024).toFixed(0);
  const usedRamGb = ((overview?.clusterRamUsageMb || 8192) / 1024).toFixed(1);
  const ramPercent = Math.min(100, Math.round(((overview?.clusterRamUsageMb || 8192) / (overview?.clusterRamTotalMb || 65536)) * 100));
  const cpuPercent = overview?.clusterCpuUsagePercent || 14.2;

  return (
    <div className="space-y-6">
      {/* 1. Next-Gen Header Command Deck */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0a0d20] via-[#070914] to-[#04060c] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        {/* Subtle background ambient gradients */}
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-purple-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-20 h-72 w-72 rounded-full bg-cyan-600/15 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600/30 via-indigo-600/30 to-cyan-500/20 p-0.5 border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.3)]">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#070a18]">
                <Shield className="h-7 w-7 text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500 border-2 border-[#070a18]" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Infrastructure Command Deck
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-950/60 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  cgroups v2
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-400 max-w-2xl leading-relaxed">
                Direct Host Daemon Control · Isolated Bot Storage · Multi-Tenant RBAC · Python SQLite Subsystem
              </p>
            </div>
          </div>

          {/* Quick Actions Header Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onReturnHome && (
              <button
                onClick={onReturnHome}
                className="md:hidden inline-flex items-center gap-2 rounded-xl border border-purple-500/40 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 text-purple-200 px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                title="Return to User Dashboard"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-purple-300" />
                <span>← Back to Dashboard</span>
              </button>
            )}

            <button
              onClick={handleSyncDisk}
              disabled={syncingDisk}
              className="inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-950/40 px-3.5 py-2 text-xs font-semibold text-purple-200 transition-all hover:bg-purple-900/50 hover:border-purple-500/60 disabled:opacity-50 cursor-pointer shadow-sm"
              title="Synchronize all bot filesystem directories with SQLite"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-purple-300 ${syncingDisk ? 'animate-spin' : ''}`} />
              <span>{syncingDisk ? 'Syncing...' : 'Sync Disk & DB'}</span>
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-zinc-200 transition-all hover:bg-white/[0.08] hover:text-white disabled:opacity-50 cursor-pointer"
              title={`Last refreshed at ${lastRefreshed}`}
            >
              <RotateCw className={`h-3.5 w-3.5 text-cyan-300 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {syncMsg && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-purple-500/40 bg-purple-950/60 p-3 text-xs text-purple-300 animate-in fade-in">
            <CheckCircle className="h-4 w-4 shrink-0 text-purple-400" />
            <span>{syncMsg}</span>
          </div>
        )}
      </div>

      {/* 2. Navigation Slide Bar - Mobile Only (Completely Hidden on Desktop) */}
      <div className="block md:hidden relative rounded-2xl border border-white/[0.06] bg-[#070914]/90 p-1.5 shadow-inner backdrop-blur-xl mb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/40 text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-purple-400" />
            <span>Host Overview</span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.2 font-mono text-[10px] text-emerald-300 border border-emerald-500/30">
              {overview?.onlineServers || 0} Live
            </span>
          </button>

          <button
            onClick={() => setActiveTab('starter-plan')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'starter-plan'
                ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/40 text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-purple-400" />
            <span>Starter Free Plan</span>
            <span className="rounded-full bg-purple-500/20 px-2 py-0.2 font-mono text-[10px] text-purple-300 border border-purple-500/30">
              Specs
            </span>
          </button>

          <button
            onClick={() => setActiveTab('store-management')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'store-management'
                ? 'bg-gradient-to-r from-amber-500/30 to-purple-600/30 border border-amber-500/40 text-white shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5 text-amber-400" />
            <span>Store & Pricing</span>
          </button>

          <button
            onClick={() => setActiveTab('rewards-management')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'rewards-management'
                ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-500/40 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <Gift className="h-3.5 w-3.5 text-indigo-400" />
            <span>Earn Rewards Offers</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'storage'
                ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/40 text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <HardDrive className="h-3.5 w-3.5 text-cyan-400" />
            <span>Storage Structure & Scripts</span>
            <span className="rounded-full bg-white/[0.08] px-2 py-0.2 font-mono text-[10px] text-zinc-300">
              {servers.length} Bots
            </span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/40 text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            <span>User & Admin Accounts</span>
            <span className="rounded-full bg-white/[0.08] px-2 py-0.2 font-mono text-[10px] text-zinc-300">
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'database'
                ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/40 text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            <span>Smart Database (SQLite)</span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.2 font-mono text-[10px] text-emerald-300 border border-emerald-500/30">
              WAL Mode
            </span>
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'health'
                ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/40 text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-rose-400" />
            <span>System Health & Auto-Healer</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/40 text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <Megaphone className="h-3.5 w-3.5 text-amber-400" />
            <span>Notification Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/40 text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-zinc-400" />
            <span>Audit Logs</span>
            <span className="rounded-full bg-white/[0.08] px-2 py-0.2 font-mono text-[10px] text-zinc-300">
              {auditLogs.length}
            </span>
          </button>
        </div>
      </div>

      {/* 3. TAB 1: Host Overview (Next-Gen Telemetry Deck) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Telemetry Power Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Active Bot Containers */}
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/25 bg-gradient-to-br from-[#0a0d20] to-[#050711] p-5 shadow-lg group hover:border-purple-500/40 transition-all">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">Active Bot Containers</span>
                <div className="p-2 rounded-xl bg-purple-600/15 text-purple-300 border border-purple-500/30">
                  <Server className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-extrabold text-white">
                  {overview?.onlineServers || 0}
                </span>
                <span className="font-mono text-xs text-zinc-400">
                  / {overview?.totalServers || 0} Total
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live container stream active</span>
              </div>
              {/* Multi-segment micro bar */}
              <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/80 gap-0.5">
                <div
                  className="bg-emerald-400 transition-all"
                  style={{ width: `${overview?.totalServers ? ((overview.onlineServers || 0) / overview.totalServers) * 100 : 0}%` }}
                />
                <div
                  className="bg-zinc-600 transition-all flex-1"
                />
              </div>
            </div>

            {/* Card 2: Host CPU Allocation */}
            <div className="relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-[#071320] to-[#050711] p-5 shadow-lg group hover:border-cyan-500/40 transition-all">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">Host CPU Allocation</span>
                <div className="p-2 rounded-xl bg-cyan-600/15 text-cyan-300 border border-cyan-500/30">
                  <Cpu className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-extrabold text-cyan-300">
                  {cpuPercent}%
                </span>
                <span className="font-mono text-xs text-zinc-400">
                  cgroups v2
                </span>
              </div>
              <div className="mt-3 text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Fair-share scheduling</span>
                <span className="font-mono text-cyan-400">Kernel Active</span>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-800/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(8, cpuPercent))}%` }}
                />
              </div>
            </div>

            {/* Card 3: Memory Allocation */}
            <div className="relative overflow-hidden rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-[#0c0d24] to-[#050711] p-5 shadow-lg group hover:border-indigo-500/40 transition-all">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">RAM Allocation & Pressure</span>
                <div className="p-2 rounded-xl bg-indigo-600/15 text-indigo-300 border border-indigo-500/30">
                  <Database className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-extrabold text-indigo-300">
                  {usedRamGb}
                </span>
                <span className="font-mono text-xs text-zinc-400">
                  / {totalRamGb} GB Total
                </span>
              </div>
              <div className="mt-3 text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Zero swap thrashing</span>
                <span className="font-mono text-indigo-400">{ramPercent}% Committed</span>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-800/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(12, ramPercent))}%` }}
                />
              </div>
            </div>

            {/* Card 4: NVMe Fast Storage Pool */}
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/25 bg-gradient-to-br from-[#120a22] to-[#050711] p-5 shadow-lg group hover:border-purple-500/40 transition-all">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">NVMe Fast Storage Pool</span>
                <div className="p-2 rounded-xl bg-purple-600/15 text-purple-300 border border-purple-500/30">
                  <HardDrive className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-extrabold text-purple-300">
                  {overview?.clusterDiskUsageGb || 180} GB
                </span>
                <span className="font-mono text-xs text-zinc-400">
                  Provisioned
                </span>
              </div>
              <div className="mt-3 text-[11px] text-zinc-400 flex items-center justify-between">
                <span>/server isolated mount</span>
                <span className="font-mono text-emerald-400">Direct I/O</span>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-800/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all"
                  style={{ width: '42%' }}
                />
              </div>
            </div>

          </div>

          {/* Unified Host Diagnostics & Sandboxing Matrix */}
          <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#090c1e] to-[#050712] p-6 shadow-xl backdrop-blur-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-600/20 to-purple-600/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Xorvila Bare-Metal Host Daemon Engine
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Node ID: host-xorvila-core · cgroups v2 Kernel Subsystem · Non-root Isolation
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1 font-mono text-xs font-semibold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Hypervisor Streaming Live</span>
              </div>
            </div>

            {/* 4 Interactive Operational Telemetry Pods */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/30 transition-all space-y-1.5">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Folder className="h-3.5 w-3.5 text-purple-400" /> Virtual Mount Pool
                </div>
                <div className="font-semibold text-zinc-100">/server isolated directory mount</div>
                <p className="text-[11px] text-cyan-400/90 leading-relaxed">
                  Real-time direct write-through caching with persistent disk commit hooks.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30 transition-all space-y-1.5">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-cyan-400" /> Process Execution
                </div>
                <div className="font-semibold text-zinc-100">Python 3.10–3.13 & Node.js 20</div>
                <p className="text-[11px] text-purple-400/90 leading-relaxed">
                  Live STDIO streaming pipeline with unbuffered log broadcasting.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-indigo-500/30 transition-all space-y-1.5">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-indigo-400" /> Isolation & Throttling
                </div>
                <div className="font-semibold text-zinc-100">Cgroups v2 Quota Enforcer</div>
                <p className="text-[11px] text-emerald-400/90 leading-relaxed">
                  Strict OOM prevention, fair-share vCPU throttling, and UID 1000 sandboxing.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/30 transition-all space-y-1.5">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-emerald-400" /> Database Subsystem
                </div>
                <div className="font-semibold text-zinc-100">Dedicated Python SQLite WAL</div>
                <p className="text-[11px] text-cyan-400/90 leading-relaxed">
                  Multi-device sessions, PBKDF2 hashing, and automatic self-healing canary.
                </p>
              </div>
            </div>

            {/* Quick Maintenance Control Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-zinc-400 font-mono">
                Last Telemetry Heartbeat: <strong className="text-zinc-200">{lastRefreshed}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('database')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                >
                  <Database className="h-3.5 w-3.5 text-purple-400" />
                  <span>Open SQLite Console</span>
                  <ArrowRight className="h-3 w-3" />
                </button>

                <button
                  onClick={() => setActiveTab('health')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                >
                  <Activity className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Auto-Healer Diagnostic</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: Storage Structure & Bot Servers */}
      {(activeTab === 'storage' || activeTab === 'servers') && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-cyan-950/20 p-5 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Folder className="h-5 w-5 text-purple-400" />
                  Bot Storage Structure & Auto-Save Matrix
                </h3>
                <p className="mt-1 text-xs text-zinc-300 max-w-3xl leading-relaxed">
                  Every bot container maintains an isolated disk mount pool at <code className="text-cyan-300 bg-black/40 px-1.5 py-0.5 rounded font-mono">/server</code>. All changes to Python scripts (<code className="text-purple-300">bot.py</code>, <code className="text-purple-300">main.py</code>) or Node.js entrypoints are immediately synchronized with the SQLite database.
                </p>
              </div>
              <button
                onClick={handleSyncDisk}
                disabled={syncingDisk}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 text-xs font-semibold px-3.5 py-2 transition-all cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncingDisk ? 'animate-spin' : ''}`} />
                <span>Synchronize All Disks</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servers.map(server => {
              const storagePct = Math.min(100, Math.round(((server.stats.storageUsage || 340) / (server.storageLimit || 2048)) * 100));
              return (
                <div key={server.id} className="rounded-2xl border border-white/[0.08] bg-[#080b18]/90 p-5 shadow-lg hover:border-purple-500/40 transition-all space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-cyan-300">
                        <FileCode className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="text-xs font-bold text-white truncate">{server.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono truncate">{server.id}</div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 text-[10px] font-semibold uppercase rounded-full border ${
                      server.status === 'online'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                        : server.status === 'crashed'
                        ? 'bg-rose-950/80 text-rose-300 border-rose-500/30'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                    }`}>
                      {server.status}
                    </span>
                  </div>

                  <div className="rounded-xl bg-black/40 border border-white/[0.06] p-3 font-mono text-[11px] space-y-2">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Runtime:</span>
                      <span className="text-zinc-200">{server.runtime} {server.version}</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Startup:</span>
                      <span className="text-purple-300 truncate max-w-[160px]">{server.startupCommand}</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Disk Pool:</span>
                      <span className="text-cyan-300">{server.stats.storageUsage || 340} MB / {server.storageLimit} MB</span>
                    </div>

                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-cyan-400 h-full rounded-full transition-all"
                        style={{ width: `${storagePct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/[0.04]">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <Check className="h-3 w-3" /> Auto-Save Active
                    </span>
                    <span className="font-mono text-zinc-500">Port {server.port}</span>
                  </div>

                  {/* Admin Server Quick Control Toolbar */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                    <button
                      onClick={() => setEditingServer(server)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-900/50 transition-all cursor-pointer"
                    >
                      <Sliders className="h-3 w-3 text-cyan-400" />
                      <span>Edit Specs</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleSuspendServer(server)}
                        className={`p-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                          server.suspended
                            ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/60'
                            : 'border-amber-500/40 bg-amber-950/50 text-amber-300 hover:bg-amber-900/60'
                        }`}
                        title={server.suspended ? 'Unsuspend Server' : 'Suspend Server'}
                      >
                        {server.suspended ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      </button>

                      <button
                        onClick={() => promptDeleteServer(server)}
                        className="p-1.5 rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 transition-all cursor-pointer"
                        title="Delete Server Permanently"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. TAB 3: User & Admin Accounts */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#080b18]/90 p-4 shadow-md backdrop-blur-xl">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user by name, email, or username..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-white/[0.1] pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-all"
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2.5 py-1 text-emerald-300 text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Multi-Tenant RBAC Active
              </span>
              <span>Total: <strong className="text-white">{filteredUsers.length} Users</strong></span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#070914]/90 shadow-xl backdrop-blur-xl">
            <table className="w-full text-left text-xs text-zinc-300 border-collapse">
              <thead className="border-b border-white/[0.08] bg-black/40 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                <tr>
                  <th className="p-4">User Details</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4">Coins & Limits</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <img
                        src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`}
                        alt={user.name}
                        className="h-9 w-9 rounded-xl bg-zinc-800 border border-white/[0.1] object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>{user.name}</span>
                          {user.id === currentUser.id && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-950 text-purple-300 border border-purple-500/40">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono truncate">{user.email}</div>
                      </div>
                    </td>

                    <td className="p-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeRole(user, e.target.value as any)}
                        disabled={currentUser.role !== 'admin' || user.id === currentUser.id}
                        className="rounded-lg bg-black/60 border border-white/[0.1] px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400 disabled:opacity-50 font-medium"
                      >
                        <option value="user">User (Standard)</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Administrator (Root)</option>
                      </select>
                    </td>

                    <td className="p-4 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>{(user.coins ?? 150).toLocaleString()} Coins</span>
                      </div>
                      {(user.extraSlots || 0) > 0 && (
                        <div className="text-[10px] text-indigo-300 mt-0.5">+{user.extraSlots} Extra Slots</div>
                      )}
                    </td>

                    <td className="p-4">
                      {user.suspended ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-950/80 px-2.5 py-1 text-[11px] font-semibold text-rose-300">
                          <Lock className="h-3 w-3" /> Disabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                          <CheckCircle className="h-3 w-3" /> Active
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-zinc-400 font-mono text-[11px]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-4 text-right">
                      {user.id !== currentUser.id && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setUserForCoins(user)}
                            className="rounded-xl border border-amber-500/30 bg-amber-950/40 p-1.5 text-amber-300 hover:bg-amber-900/60 hover:text-white transition-all cursor-pointer"
                            title="Manage Coins & Resource Limits"
                          >
                            <Coins className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => setEditingUser(user)}
                            className="rounded-xl border border-purple-500/30 bg-purple-950/40 p-1.5 text-purple-300 hover:bg-purple-900/60 hover:text-white transition-all cursor-pointer"
                            title="Edit User Details & Role"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          {/* Primary Action: Disable / Enable User Account */}
                          <button
                            onClick={() => handleToggleSuspendUser(user)}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                              user.suspended
                                ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/80 hover:text-white shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                                : 'border-rose-500/50 bg-rose-950/60 text-rose-300 hover:bg-rose-900/80 hover:text-white shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                            }`}
                            title={user.suspended ? 'Enable user account' : 'Disable user account'}
                          >
                            {user.suspended ? (
                              <>
                                <Unlock className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Enable User</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-3.5 w-3.5 text-rose-400" />
                                <span>Disable User</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Starter Free Plan Tab */}
      {activeTab === 'starter-plan' && (
        <AdminStarterPlanTab onPlanSaved={() => showToast('Starter Plan successfully updated!')} />
      )}

      {/* Store & Pricing Management Tab */}
      {activeTab === 'store-management' && (
        <AdminStoreTab />
      )}

      {/* Earn Rewards Offers Management Tab */}
      {activeTab === 'rewards-management' && (
        <AdminRewardsTab />
      )}

      {/* 6. TAB 4: Dedicated Smart Database Explorer */}
      {activeTab === 'database' && (
        <DatabaseExplorer />
      )}

      {/* 7. TAB 5: System Health & Auto-Healer */}
      {activeTab === 'health' && (
        <SystemHealthView />
      )}

      {/* 8. TAB 6: Notification Studio */}
      {activeTab === 'notifications' && (
        <NotificationMaker currentUser={currentUser} />
      )}

      {/* 9. TAB 7: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#070914]/90 shadow-xl backdrop-blur-xl overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-400" />
              Security Audit Trail ({auditLogs.length} Events Logged)
            </h3>
            <span className="text-xs text-zinc-500 font-mono">SQLite Real-time Commits</span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs text-zinc-300 border-collapse">
              <thead className="sticky top-0 border-b border-white/[0.08] bg-black/80 backdrop-blur-sm text-[11px] font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                <tr>
                  <th className="p-3.5">Time</th>
                  <th className="p-3.5">Initiator</th>
                  <th className="p-3.5">Action Code</th>
                  <th className="p-3.5">Resource Target</th>
                  <th className="p-3.5">Operation Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-mono text-[11px]">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 text-zinc-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="p-3.5 text-cyan-300 whitespace-nowrap">{log.userEmail || 'System'}</td>
                    <td className="p-3.5">
                      <span className="rounded bg-purple-950/80 px-2 py-0.5 text-purple-300 border border-purple-500/30 text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-zinc-400">{log.resourceType}:{log.resourceId}</td>
                    <td className="p-3.5 text-zinc-200">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User Dedicated Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-purple-500/30 bg-[#080b1a] p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                Edit User Account: {editingUser.name}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full rounded-xl bg-black/60 border border-white/[0.1] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Username</label>
                <input
                  type="text"
                  value={editingUser.username || ''}
                  onChange={e => setEditingUser({ ...editingUser, username: e.target.value })}
                  className="w-full rounded-xl bg-black/60 border border-white/[0.1] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full rounded-xl bg-black/60 border border-white/[0.1] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className="w-full rounded-xl bg-black/60 border border-white/[0.1] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="user">User (Standard)</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Administrator (Root)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Status</label>
                  <select
                    value={editingUser.suspended ? 'suspended' : 'active'}
                    onChange={e => setEditingUser({ ...editingUser, suspended: e.target.value === 'suspended' })}
                    className="w-full rounded-xl bg-black/60 border border-white/[0.1] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => promptDeleteUser(editingUser)}
                className="px-3.5 py-2 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Account</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUserEdit}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Server Dedicated Modal */}
      {editingServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-cyan-500/30 bg-[#080b1a] p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Server className="h-5 w-5 text-cyan-400" />
                Edit Bot Resources: {editingServer.name}
              </h3>
              <button
                onClick={() => setEditingServer(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Server Name</label>
                <input
                  type="text"
                  value={editingServer.name}
                  onChange={e => setEditingServer({ ...editingServer, name: e.target.value })}
                  className="w-full rounded-xl bg-black/60 border border-white/[0.1] px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">CPU Limit (%)</label>
                  <input
                    type="number"
                    value={editingServer.cpuLimit}
                    onChange={e => setEditingServer({ ...editingServer, cpuLimit: Number(e.target.value) })}
                    className="w-full rounded-xl bg-black/60 border border-white/[0.1] px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">RAM Limit (MB)</label>
                  <input
                    type="number"
                    value={editingServer.ramLimit}
                    onChange={e => setEditingServer({ ...editingServer, ramLimit: Number(e.target.value) })}
                    className="w-full rounded-xl bg-black/60 border border-white/[0.1] px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Disk Limit (MB)</label>
                  <input
                    type="number"
                    value={editingServer.storageLimit}
                    onChange={e => setEditingServer({ ...editingServer, storageLimit: Number(e.target.value) })}
                    className="w-full rounded-xl bg-black/60 border border-white/[0.1] px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Startup Command</label>
                <input
                  type="text"
                  value={editingServer.startupCommand}
                  onChange={e => setEditingServer({ ...editingServer, startupCommand: e.target.value })}
                  className="w-full rounded-xl bg-black/60 border border-white/[0.1] px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Assigned Owner Account</label>
                <select
                  value={editingServer.ownerId}
                  onChange={e => setEditingServer({ ...editingServer, ownerId: e.target.value })}
                  className="w-full rounded-xl bg-black/60 border border-white/[0.1] px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => promptDeleteServer(editingServer)}
                className="px-3.5 py-2 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Server</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingServer(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveServerEdit}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md cursor-pointer"
                >
                  Save Resource Specs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete User Account */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/40 bg-[#090b1c] p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-400">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Permanently Delete User?</h3>
                <p className="text-xs text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="rounded-2xl bg-black/50 border border-white/[0.08] p-4 flex items-center gap-3">
              <img
                src={userToDelete.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${userToDelete.name}`}
                alt={userToDelete.name}
                className="h-10 w-10 rounded-xl bg-zinc-800 border border-white/[0.1] object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white truncate text-xs">{userToDelete.name}</div>
                <div className="text-[11px] text-zinc-400 font-mono truncate">{userToDelete.email}</div>
                <div className="text-[10px] text-purple-400 font-mono capitalize mt-0.5">Role: {userToDelete.role}</div>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Deleting this account will immediately terminate all container processes owned by <strong className="text-white">{userToDelete.name}</strong>, wipe their isolated filesystems at <code className="text-cyan-300 bg-black/40 px-1 py-0.5 rounded font-mono">/server</code>, and revoke all active authentication sessions.
            </p>

            {deleteUserError && (
              <div className="rounded-xl border border-rose-500/50 bg-rose-950/50 p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{deleteUserError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.08]">
              <button
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteUser}
                disabled={isDeletingUser}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold shadow-lg shadow-rose-900/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeletingUser ? (
                  <>
                    <RotateCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Yes, Delete User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Server Container */}
      {serverToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/40 bg-[#090b1c] p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-400">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Permanently Destroy Bot?</h3>
                <p className="text-xs text-zinc-400">Container and files will be wiped.</p>
              </div>
            </div>

            <div className="rounded-2xl bg-black/50 border border-white/[0.08] p-4">
              <div className="font-semibold text-white text-xs truncate">{serverToDelete.name}</div>
              <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{serverToDelete.id} · {serverToDelete.runtime} {serverToDelete.version}</div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              This will forcefully kill the process group for <strong className="text-white">{serverToDelete.name}</strong>, wipe its workspace directory from host disk, and delete all backup records permanently.
            </p>

            {deleteServerError && (
              <div className="rounded-xl border border-rose-500/50 bg-rose-950/50 p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{deleteServerError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.08]">
              <button
                onClick={() => setServerToDelete(null)}
                disabled={isDeletingServer}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteServer}
                disabled={isDeletingServer}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold shadow-lg shadow-rose-900/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeletingServer ? (
                  <>
                    <RotateCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Destroying Container...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Yes, Destroy Bot</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Coins & Extra Quotas Modal */}
      {userForCoins && (
        <AdminUserCoinsModal
          user={userForCoins}
          onClose={() => setUserForCoins(null)}
          onUpdated={(updated) => {
            setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
            showToast(`Updated coins and quotas for ${updated.email}!`);
          }}
        />
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div
            className={`rounded-2xl border px-4 py-3 shadow-2xl flex items-center gap-2.5 text-xs font-semibold ${
              toastMessage.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};
