import React, { useState, useRef, useEffect } from 'react';
import { User, ClusterOverview } from '../types';
import {
  Server,
  Terminal,
  Shield,
  BookOpen,
  User as UserIcon,
  LogOut,
  Plus,
  Activity,
  Cpu,
  Layers,
  Search,
  Bell,
  ChevronDown,
  Menu,
  X,
  Key,
  Database,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { XorvilaAiIcon } from './icons/XorvilaAiIcon';
import { useNotifications } from '../lib/notifications';
import { AppView } from './Sidebar';

interface Props {
  currentUser: User | null;
  activeView: AppView;
  selectedServerName?: string | null;
  clusterStats?: ClusterOverview | null;
  onNavigate: (view: AppView, tab?: string) => void;
  onOpenCreateModal: () => void;
  onOpenAccountModal: (tab?: 'profile' | 'tokens' | 'quotas' | 'security') => void;
  onOpenAuthModal: () => void;
  onOpenCommandPalette: () => void;
  onLogout: () => void;
  onQuickSwitchUser?: (email: string) => void;
  onOpenAiDebugger?: () => void;
  onOpenHealthMonitor?: () => void;
}

export const Navbar: React.FC<Props> = ({
  currentUser,
  activeView,
  selectedServerName,
  clusterStats,
  onNavigate,
  onOpenCreateModal,
  onOpenAccountModal,
  onOpenAuthModal,
  onOpenCommandPalette,
  onLogout,
  onQuickSwitchUser,
  onOpenAiDebugger,
  onOpenHealthMonitor
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { notifications, clearAll } = useNotifications();

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBreadcrumbTitle = () => {
    if (selectedServerName) return `Servers / ${selectedServerName}`;
    switch (activeView) {
      case 'dashboard':
        return 'Dashboard';
      case 'servers':
        return 'Bot Instances';
      case 'tokens':
        return 'API Tokens';
      case 'docs':
        return 'REST API Docs';
      case 'quotas':
        return 'Resource Quotas';
      case 'security':
        return 'Security & 2FA';
      case 'admin-database':
        return 'Database Explorer';
      case 'admin-console':
        return 'Admin Console';
      case 'admin-health':
        return 'System Health';
      case 'admin':
        return 'Administrative Panel';
      case '403':
        return 'Access Denied';
      case '404':
        return 'Page Not Found';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[rgba(140,120,255,0.15)] bg-[#050711]/75 dark:bg-[#050711]/75 backdrop-blur-2xl transition-colors">
      <div className="w-full px-3 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          {/* Left: Breadcrumbs & Brand Slider */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-[200px] sm:max-w-sm md:max-w-md lg:max-w-xl overflow-x-auto no-scrollbar whitespace-nowrap py-1">
            {/* Brand Logo & Name */}
            <div
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2 cursor-pointer shrink-0 group"
            >
              <img
                src="https://i.imgur.com/jcw4JKg.png"
                alt="Xorvila Logo"
                className="w-7 h-7 object-contain rounded-md drop-shadow-[0_0_8px_rgba(168,85,247,0.4)] shrink-0 group-hover:scale-105 transition-transform"
              />
              <span className="font-bold text-sm bg-gradient-to-r from-purple-300 via-indigo-200 to-cyan-300 bg-clip-text text-transparent shrink-0">
                XORVILA
              </span>
            </div>

            {/* Breadcrumb Trail Slider */}
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 shrink-0">
              <span className="text-zinc-600 shrink-0">/</span>
              {selectedServerName ? (
                <>
                  <span
                    onClick={() => onNavigate('servers')}
                    className="hover:text-purple-300 cursor-pointer transition-colors text-zinc-400 shrink-0"
                  >
                    Servers
                  </span>
                  <span className="text-zinc-600 shrink-0">/</span>
                  <span className="text-cyan-300 font-semibold shrink-0 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/30 shadow-sm">
                    {selectedServerName}
                  </span>
                </>
              ) : (
                <span className="text-zinc-200 font-medium shrink-0">
                  {getBreadcrumbTitle()}
                </span>
              )}
            </div>
          </div>

          {/* Center: Command Palette Search Bar (Properly aligned with max-width and margins) */}
          <div className="flex-1 max-w-sm mx-auto hidden sm:block">
            <button
              onClick={onOpenCommandPalette}
              className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-[rgba(140,120,255,0.18)] hover:border-purple-500/40 text-zinc-400 hover:text-zinc-200 transition-all text-xs group cursor-pointer shadow-inner"
            >
              <div className="flex items-center gap-2 truncate min-w-0">
                <Search className="w-3.5 h-3.5 text-purple-400 group-hover:text-cyan-300 transition-colors shrink-0" />
                <span className="truncate">Search instances, tokens, docs...</span>
              </div>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-black/40 border border-white/10 rounded shrink-0">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Action Buttons, Notifications, Theme & Profile */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Mobile Search Button */}
            <button
              onClick={onOpenCommandPalette}
              className="sm:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]"
              title="Search"
            >
              <Search className="w-4 h-4 text-purple-400" />
            </button>

            {/* System Health Badge (Clickable for Admin) */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => onNavigate('admin-health')}
                className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-xs font-mono transition-all group"
                title="System Operational"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                <span className="text-[11px] font-medium text-emerald-300">System Healthy</span>
              </button>
            )}

            {/* AI Log Diagnoser button */}
            {onOpenAiDebugger && (
              <button
                onClick={onOpenAiDebugger}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all group"
                title="XorvilaAi Log Diagnoser"
              >
                <XorvilaAiIcon className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="hidden xl:inline text-[11px]">AI Diagnoser</span>
              </button>
            )}

            {/* Notifications Dropdown */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setUserDropdownOpen(false);
                }}
                className="relative p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] border border-transparent hover:border-white/10 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                )}
              </button>

              {notificationsOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0c0d19] border border-[rgba(140,120,255,0.3)] shadow-2xl glow-ambient py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-w-[calc(100vw-24px)]"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-semibold text-zinc-200">Cluster Events</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                        {notifications.length}
                      </span>
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAll}
                        className="text-[11px] text-zinc-400 hover:text-rose-400 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.03] p-1 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-zinc-500 text-xs">
                        No recent notifications or alerts.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-3 hover:bg-white/[0.02] rounded-xl transition-colors">
                          <div className="flex items-center justify-between text-xs font-medium text-zinc-200">
                            <span>{n.title}</span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              {n.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {n.message && (
                            <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{n.message}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            {currentUser ? (
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => {
                    setUserDropdownOpen(!userDropdownOpen);
                    setNotificationsOpen(false);
                  }}
                  className="flex items-center gap-2 p-1 pl-1.5 sm:pr-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-[rgba(140,120,255,0.18)] hover:border-purple-500/40 transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0">
                    {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline text-xs font-medium text-zinc-200 group-hover:text-purple-300 transition-colors truncate max-w-[100px]">
                    {currentUser.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
                </button>

                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0c0d19] border border-[rgba(140,120,255,0.3)] shadow-2xl glow-ambient py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-w-[calc(100vw-24px)]"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-3 border-b border-white/[0.08]">
                      <div className="text-xs font-semibold text-zinc-100 truncate">{currentUser.name}</div>
                      <div className="text-[11px] text-zinc-400 font-mono truncate">{currentUser.email}</div>
                      <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-950/80 text-purple-300 border border-purple-500/30">
                        <span>{currentUser.role === 'admin' ? 'Root Administrator' : 'Free Tier'}</span>
                      </div>
                    </div>

                    <div className="p-1 space-y-0.5">
                      <button
                        onClick={() => onOpenAccountModal('profile')}
                        className="w-full px-3 py-2 text-xs text-left rounded-xl text-zinc-300 hover:bg-white/[0.05] hover:text-cyan-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <UserIcon className="w-4 h-4 text-purple-400" />
                        <span>User Profile</span>
                      </button>

                      <button
                        onClick={() => onNavigate('tokens')}
                        className="w-full px-3 py-2 text-xs text-left rounded-xl text-zinc-300 hover:bg-white/[0.05] hover:text-cyan-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Key className="w-4 h-4 text-cyan-400" />
                        <span>API Tokens & Keys</span>
                      </button>

                      <button
                        onClick={() => onNavigate('quotas')}
                        className="w-full px-3 py-2 text-xs text-left rounded-xl text-zinc-300 hover:bg-white/[0.05] hover:text-cyan-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Layers className="w-4 h-4 text-purple-400" />
                        <span>Resource Quotas</span>
                      </button>

                      <button
                        onClick={() => onNavigate('security')}
                        className="w-full px-3 py-2 text-xs text-left rounded-xl text-zinc-300 hover:bg-white/[0.05] hover:text-cyan-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Shield className="w-4 h-4 text-indigo-400" />
                        <span>Security & 2FA</span>
                      </button>

                      {/* Active Session Status */}
                      <div className="pt-2 border-t border-white/[0.08] my-1 px-3 py-1.5 bg-white/[0.02] rounded-xl">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400 font-medium">Role</span>
                          <span className="font-mono font-semibold text-cyan-300 uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30">
                            {currentUser.role}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1.5 font-mono">
                          <span>Security Engine</span>
                          <span className="text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            JWT Secured
                          </span>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-white/[0.08]">
                        <button
                          onClick={onLogout}
                          className="w-full px-3 py-2 text-xs text-left rounded-xl text-rose-400 hover:bg-rose-950/30 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
