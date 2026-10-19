import React from 'react';
import { BotServer, User, ClusterOverview } from '../types';
import {
  LayoutDashboard,
  Server,
  Plus,
  Shield,
  BookOpen,
  Key,
  Layers,
  Activity,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Database,
  Terminal,
  Cpu,
  Zap
} from 'lucide-react';
import { XorvilaAiIcon } from './icons/XorvilaAiIcon';
import { RuntimeLogo } from './RuntimeLogo';

export type AppView =
  | 'dashboard'
  | 'servers'
  | 'tokens'
  | 'docs'
  | 'quotas'
  | 'security'
  | 'admin'
  | 'admin-database'
  | 'admin-console'
  | 'admin-health'
  | '403'
  | '404';

interface Props {
  currentUser: User | null;
  activeView: AppView;
  selectedServerId: string | null;
  servers: BotServer[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: (view: AppView, tab?: string) => void;
  onSelectServer: (id: string) => void;
  onOpenCreateModal: () => void;
  onOpenAccountModal: (tab?: 'profile' | 'tokens' | 'quotas' | 'security') => void;
  onOpenAiDebugger: () => void;
  onOpenHealthMonitor: () => void;
}

export const Sidebar: React.FC<Props> = ({
  currentUser,
  activeView,
  selectedServerId,
  servers,
  isCollapsed,
  onToggleCollapse,
  onNavigate,
  onSelectServer,
  onOpenCreateModal,
  onOpenAccountModal,
  onOpenAiDebugger,
  onOpenHealthMonitor
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const runningServers = servers.filter(s => s.status === 'running').length;

  return (
    <aside
      id="main-sidebar"
      className={`hidden md:flex flex-col h-screen sticky top-0 border-r border-[rgba(140,120,255,0.15)] bg-[#050711]/75 dark:bg-[#050711]/75 backdrop-blur-2xl transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Brand Header & Persistent Collapse Button */}
      <div className="h-16 px-4 border-b border-[rgba(140,120,255,0.15)] flex items-center justify-between">
        {!isCollapsed ? (
          <div
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 cursor-pointer group min-w-0"
          >
            <div className="relative shrink-0 flex items-center justify-center">
              <img
                src="https://i.imgur.com/jcw4JKg.png"
                alt="Xorvila Logo"
                className="w-8 h-8 object-contain rounded-lg drop-shadow-[0_0_12px_rgba(168,85,247,0.45)] transition-transform group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col min-w-0 truncate">
              <span className="font-bold text-sm tracking-wider bg-gradient-to-r from-purple-300 via-indigo-200 to-cyan-300 bg-clip-text text-transparent truncate">
                XORVILA
              </span>
              <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase truncate">
                Bot Platform
              </span>
            </div>
          </div>
        ) : (
          <div
            onClick={() => onNavigate('dashboard')}
            className="flex items-center justify-center mx-auto cursor-pointer group p-1"
            title="Xorvila Dashboard"
          >
            <img
              src="https://i.imgur.com/jcw4JKg.png"
              alt="Xorvila Logo"
              className="w-8 h-8 object-contain rounded-lg drop-shadow-[0_0_10px_rgba(168,85,247,0.4)] transition-transform group-hover:scale-110"
            />
          </div>
        )}

        {/* ALWAYS VISIBLE & ACCESSIBLE COLLAPSE TOGGLE */}
        <button
          id="sidebar-collapse-toggle"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-purple-300 hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all cursor-pointer"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Nav Content */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
        {/* CORE PLATFORM */}
        <div>
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-mono font-semibold tracking-wider text-zinc-500 uppercase mb-1.5">
              Core Platform
            </div>
          )}

          <div className="space-y-1">
            {/* Dashboard */}
            <button
              onClick={() => onNavigate('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeView === 'dashboard' && !selectedServerId
                  ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              title="Dashboard"
            >
              <LayoutDashboard className="w-4 h-4 text-purple-400 shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left">Dashboard</span>}
            </button>

            {/* Bot Instances */}
            <button
              onClick={() => onNavigate('servers')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeView === 'servers' && !selectedServerId
                  ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              title="Bot Instances"
            >
              <Server className="w-4 h-4 text-indigo-400 shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left">Bot Instances</span>}
              {!isCollapsed && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/50 text-zinc-400 border border-white/5">
                  {isAdmin ? `${runningServers}/infinity` : `${runningServers}/${servers.length}`}
                </span>
              )}
            </button>

            {/* Quick Server Switcher List in Sidebar */}
            {!isCollapsed && servers.length > 0 && (
              <div className="pl-3 pr-1 pt-1 pb-1 space-y-0.5 border-l border-white/5 ml-4 mt-1">
                {servers.slice(0, 6).map(s => {
                  const isCurrent = selectedServerId === s.id;
                  const isOnline = s.status === 'online';
                  return (
                    <button
                      key={s.id}
                      onClick={() => onSelectServer(s.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] transition-all text-left cursor-pointer truncate ${
                        isCurrent
                          ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40 font-semibold shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                      }`}
                      title={`${s.name} (${s.status})`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isOnline
                            ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                            : s.status === 'starting'
                            ? 'bg-amber-400 animate-pulse'
                            : 'bg-zinc-600'
                        }`}
                      />
                      <span className="truncate flex-1">{s.name}</span>
                      <RuntimeLogo runtime={s.runtime} className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ADMIN INFRASTRUCTURE SECTION (ADMIN ONLY) */}
        {isAdmin && (
          <div>
            {!isCollapsed && (
              <div className="px-3 text-[10px] font-mono font-semibold tracking-wider text-purple-400 uppercase mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                <span>Administration</span>
              </div>
            )}

            <div className="space-y-1">
              {/* Central Admin Panel */}
              <button
                onClick={() => onNavigate('admin', 'overview')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeView === 'admin'
                    ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                title="Admin Control Center"
              >
                <Shield className="w-4 h-4 text-purple-400 shrink-0" />
                {!isCollapsed && <span className="flex-1 text-left">Admin Panel</span>}
              </button>

              {/* AI Diagnoser */}
              <button
                onClick={onOpenAiDebugger}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-cyan-300 hover:bg-cyan-950/20 transition-colors cursor-pointer ${
                  isCollapsed ? 'justify-center px-2' : ''
                }`}
                title="XorvilaAi Log Diagnoser"
              >
                <XorvilaAiIcon className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <div className="flex-1 text-left flex items-center justify-between">
                    <span>AI Diagnoser</span>
                    <span className="text-[9px] font-mono bg-cyan-950 text-cyan-300 px-1 rounded border border-cyan-500/30">
                      XorvilaAi
                    </span>
                  </div>
                )}
              </button>
            </div>
          </div>
        )}

        {/* DEVELOPER TOOLS */}
        <div>
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-mono font-semibold tracking-wider text-zinc-500 uppercase mb-1.5">
              Developer Tools
            </div>
          )}

          <div className="space-y-1">
            {/* API Tokens */}
            <button
              onClick={() => onNavigate('tokens')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeView === 'tokens'
                  ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              title="API Tokens"
            >
              <Key className="w-4 h-4 text-cyan-400 shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left">API Tokens</span>}
            </button>

            {/* API Docs */}
            <button
              onClick={() => onNavigate('docs')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeView === 'docs'
                  ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              title="API Docs"
            >
              <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left">API Docs</span>}
            </button>
          </div>
        </div>

        {/* ACCOUNT & RESOURCES */}
        <div>
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-mono font-semibold tracking-wider text-zinc-500 uppercase mb-1.5">
              Account & Limits
            </div>
          )}

          <div className="space-y-1">
            {/* Resource Quotas */}
            <button
              onClick={() => onNavigate('quotas')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeView === 'quotas'
                  ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              title="Resource Quotas"
            >
              <Layers className="w-4 h-4 text-purple-400 shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left">Resource Quotas</span>}
            </button>

            {/* Security & 2FA */}
            <button
              onClick={() => onNavigate('security')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeView === 'security'
                  ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              title="Security & 2FA"
            >
              <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left">Security & 2FA</span>}
            </button>
          </div>
        </div>
      </div>

      {/* User Footer Profile & Quick Access */}
      <div className="p-3 border-t border-[rgba(140,120,255,0.15)] bg-black/40 relative">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div
              onClick={() => onOpenAccountModal('profile')}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0">
                {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-zinc-200 truncate group-hover:text-purple-300 transition-colors">
                  {currentUser?.name || 'Administrator'}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono truncate flex items-center gap-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      currentUser?.role === 'admin' ? 'bg-purple-400' : 'bg-cyan-400'
                    }`}
                  />
                  <span>{currentUser?.role === 'admin' ? 'Root Admin' : 'Free Tier'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onOpenAccountModal('profile')}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer"
              title="Account Settings"
            >
              <UserIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onOpenAccountModal('profile')}
            className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md cursor-pointer block"
            title="User Profile"
          >
            {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
          </button>
        )}
      </div>
    </aside>
  );
};
