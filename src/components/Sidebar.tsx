import React from 'react';
import { BotServer, User } from '../types';
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
  Zap,
  ShoppingBag,
  Gift,
  ArrowLeft,
  Sliders,
  Users,
  Megaphone,
  History,
  Coins,
  Sparkles,
  HeartPulse
} from 'lucide-react';
import { XorvilaAiIcon } from './icons/XorvilaAiIcon';
import { RuntimeLogo } from './RuntimeLogo';

export type AppView =
  | 'dashboard'
  | 'servers'
  | 'store'
  | 'earn-rewards'
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

export type AdminTab =
  | 'overview'
  | 'starter-plan'
  | 'store-management'
  | 'rewards-management'
  | 'users'
  | 'servers'
  | 'notifications'
  | 'audit'
  | 'database'
  | 'health';

interface Props {
  currentUser: User | null;
  activeView: AppView;
  adminActiveTab?: AdminTab;
  onAdminTabChange?: (tab: AdminTab) => void;
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
  adminActiveTab = 'overview',
  onAdminTabChange,
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
  const runningServers = servers.filter(s => s.status === 'online').length;
  const userCoins = currentUser?.coins ?? 150;

  // Check if we are inside the Admin Area
  const isInAdminArea = activeView === 'admin' || activeView === 'admin-database' || activeView === 'admin-console' || activeView === 'admin-health';

  // ==========================================
  // RENDER: Dedicated Admin Sidebar View
  // ==========================================
  if (isInAdminArea) {
    const adminNavSections = [
      {
        category: 'PLATFORM & TIERS',
        items: [
          {
            id: 'overview',
            label: 'Cluster Overview',
            icon: Activity,
            description: 'Real-time telemetry & nodes'
          },
          {
            id: 'starter-plan',
            label: 'Starter Free Plan',
            icon: Sliders,
            description: 'Configure default specs & quotas',
            badge: 'Config'
          },
          {
            id: 'store-management',
            label: 'Store & Pricing',
            icon: ShoppingBag,
            description: 'Manage RAM, CPU & Slots items'
          },
          {
            id: 'rewards-management',
            label: 'Earn Rewards Offers',
            icon: Gift,
            description: 'Manage shorteners & coin payouts',
            badge: 'Tasks'
          }
        ]
      },
      {
        category: 'MANAGEMENT & CONTROL',
        items: [
          {
            id: 'users',
            label: 'User Management',
            icon: Users,
            description: 'Accounts, bans & coin grants'
          },
          {
            id: 'servers',
            label: 'All Bot Servers',
            icon: Server,
            description: 'Cluster container instances'
          },
          {
            id: 'notifications',
            label: 'Announcements',
            icon: Megaphone,
            description: 'System-wide banner alerts'
          },
          {
            id: 'audit',
            label: 'Audit Security Logs',
            icon: History,
            description: 'Immutable system records'
          }
        ]
      },
      {
        category: 'ADVANCED INFRASTRUCTURE',
        items: [
          {
            id: 'database',
            label: 'Database Explorer',
            icon: Database,
            description: 'SQLite tables & records'
          },
          {
            id: 'health',
            label: 'Health & Auto-Healer',
            icon: HeartPulse,
            description: 'Automated self-healing status'
          }
        ]
      }
    ];

    return (
      <aside
        id="admin-sidebar"
        className={`hidden md:flex flex-col h-screen sticky top-0 border-r border-purple-500/30 bg-[#050613]/90 backdrop-blur-2xl transition-all duration-300 z-30 select-none shadow-[4px_0_24px_rgba(139,92,246,0.08)] ${
          isCollapsed ? 'w-[72px]' : 'w-72'
        }`}
      >
        {/* Top Action Bar: Back to Dashboard & Collapse */}
        <div className="h-16 px-3 border-b border-purple-500/20 bg-purple-950/20 flex items-center justify-between gap-2">
          {/* Back to Dashboard Button */}
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCollapsed
                ? 'p-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 w-full justify-center'
                : 'px-3 py-2 bg-gradient-to-r from-purple-600/25 to-indigo-600/25 hover:from-purple-600/40 hover:to-indigo-600/40 text-purple-200 border border-purple-500/40 hover:border-purple-400/60 shadow-sm flex-1'
            }`}
            title="Return to User Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-purple-300 shrink-0" />
            {!isCollapsed && <span className="truncate">← Back to Dashboard</span>}
          </button>

          {/* Collapse Toggle */}
          <button
            id="sidebar-collapse-toggle"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-purple-300 hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all cursor-pointer shrink-0"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Admin Header Title */}
        {!isCollapsed && (
          <div className="px-4 py-3 bg-gradient-to-b from-purple-950/30 to-transparent border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-100 tracking-wide uppercase">
                  Xorvila Admin
                </div>
                <div className="text-[10px] text-purple-400/80 font-mono">
                  Master Controller
                </div>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" title="Cluster Online" />
          </div>
        )}

        {/* Admin Navigation Slides List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 custom-scrollbar">
          {adminNavSections.map((section, idx) => (
            <div key={idx}>
              {!isCollapsed && (
                <div className="px-2 text-[10px] font-mono font-semibold tracking-wider text-purple-400/80 uppercase mb-1.5">
                  {section.category}
                </div>
              )}

              <div className="space-y-1">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isActive =
                    adminActiveTab === item.id ||
                    (item.id === 'servers' && adminActiveTab === 'storage');

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (onAdminTabChange) {
                          onAdminTabChange(item.id as AdminTab);
                        } else {
                          onNavigate('admin', item.id);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer relative group ${
                        isActive
                          ? 'bg-purple-600/25 text-purple-100 border border-purple-500/40 shadow-[0_0_16px_rgba(140,120,255,0.2)] font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                      } ${isCollapsed ? 'justify-center px-2' : ''}`}
                      title={item.label}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-purple-300' : 'text-zinc-400 group-hover:text-zinc-200'
                      }`} />

                      {!isCollapsed && (
                        <div className="flex-1 text-left flex items-center justify-between min-w-0">
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}

                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-purple-400 shadow-[0_0_8px_#c084fc]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Admin Footer */}
        <div className="p-3 border-t border-purple-500/20 bg-black/50">
          {!isCollapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0">
                  {currentUser?.name ? currentUser.name[0].toUpperCase() : 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-zinc-200 truncate">
                    {currentUser?.name || 'Administrator'}
                  </div>
                  <div className="text-[10px] text-purple-400 font-mono truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Root Superadmin</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded-lg bg-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-md" title="Root Superadmin">
              {currentUser?.name ? currentUser.name[0].toUpperCase() : 'A'}
            </div>
          )}
        </div>
      </aside>
    );
  }

  // ==========================================
  // RENDER: Standard Dashboard User Sidebar
  // ==========================================
  return (
    <aside
      id="main-sidebar"
      className={`hidden md:flex flex-col h-screen sticky top-0 border-r border-[rgba(140,120,255,0.15)] bg-[#050711]/75 backdrop-blur-2xl transition-all duration-300 z-30 select-none ${
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
                  ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)] font-semibold'
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
                  ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)] font-semibold'
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

        {/* MARKETPLACE & EARNING */}
        <div>
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-mono font-semibold tracking-wider text-amber-400/90 uppercase mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Store & Rewards</span>
            </div>
          )}

          <div className="space-y-1">
            {/* Store (Resource Marketplace) */}
            <button
              onClick={() => onNavigate('store')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeView === 'store'
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              title="Resource Store"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left">Resource Store</span>}
              {!isCollapsed && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Shop
                </span>
              )}
            </button>

            {/* Earn Rewards (+Coins) */}
            <button
              onClick={() => onNavigate('earn-rewards')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeView === 'earn-rewards'
                  ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)] font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              title="Earn Rewards"
            >
              <Gift className="w-4 h-4 text-indigo-400 shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left">Earn Rewards</span>}
              {!isCollapsed && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Coins className="w-2.5 h-2.5 text-amber-400" />
                  <span>Free</span>
                </span>
              )}
            </button>
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

        {/* ACCOUNT & SECURITY */}
        <div>
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-mono font-semibold tracking-wider text-zinc-500 uppercase mb-1.5">
              Account & Security
            </div>
          )}

          <div className="space-y-1">
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

      {/* User Footer Profile & Quick Access with Coins Pill */}
      <div className="p-3 border-t border-[rgba(140,120,255,0.15)] bg-black/40 relative">
        {!isCollapsed ? (
          <div className="space-y-2">
            {/* Quick Wallet Pill */}
            <div
              onClick={() => onNavigate('store')}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold font-mono">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>{userCoins.toLocaleString()} Coins</span>
              </div>
              <span className="text-[10px] text-amber-400/80 font-medium hover:underline">
                Store →
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div
                onClick={() => onOpenAccountModal('profile')}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0">
                  {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-zinc-200 truncate group-hover:text-purple-300 transition-colors">
                    {currentUser?.name || 'User'}
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
          </div>
        ) : (
          <button
            onClick={() => onOpenAccountModal('profile')}
            className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md cursor-pointer block"
            title={`User Profile (${userCoins} Coins)`}
          >
            {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
          </button>
        )}
      </div>
    </aside>
  );
};
