import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Server,
  Plus,
  Terminal,
  FileCode,
  Key,
  Shield,
  BookOpen,
  Activity,
  Cpu,
  Layers,
  Database,
  ArrowRight,
  X,
  LayoutDashboard,
  User as UserIcon
} from 'lucide-react';
import { XorvilaAiIcon } from './icons/XorvilaAiIcon';
import { BotServer, User } from '../types';
import { AppView } from './Sidebar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  servers: BotServer[];
  currentUser: User | null;
  onSelectServer: (id: string, tab?: string) => void;
  onOpenCreateModal: () => void;
  onNavigate: (view: AppView, tab?: string) => void;
  onOpenAccountModal: (tab?: 'profile' | 'tokens' | 'quotas' | 'security') => void;
  onOpenAiDebugger: () => void;
  onOpenHealthMonitor: () => void;
}

export const CommandPalette: React.FC<Props> = ({
  isOpen,
  onClose,
  servers,
  currentUser,
  onSelectServer,
  onOpenCreateModal,
  onNavigate,
  onOpenAccountModal,
  onOpenAiDebugger,
  onOpenHealthMonitor
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  interface CommandItem {
    id: string;
    category: 'Servers' | 'Actions' | 'Navigation' | 'Admin' | 'System';
    title: string;
    subtitle?: string;
    icon: React.ElementType;
    action: () => void;
    badge?: string;
  }

  const items: CommandItem[] = [
    // Actions
    {
      id: 'create-bot',
      category: 'Actions',
      title: 'Deploy New Bot Container',
      subtitle: 'Create a Python or Node.js permanent bot',
      icon: Plus,
      action: () => {
        onClose();
        onOpenCreateModal();
      },
      badge: 'Action'
    },
    {
      id: 'ai-debugger',
      category: 'Actions',
      title: 'Open AI Log Diagnoser',
      subtitle: 'Analyze crash stacks and runtime errors with XorvilaAi',
      icon: XorvilaAiIcon as any,
      action: () => {
        onClose();
        onOpenAiDebugger();
      },
      badge: 'AI'
    },

    // Navigation (Available to All)
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Dashboard Overview',
      subtitle: 'Platform statistics and cluster summary',
      icon: LayoutDashboard,
      action: () => {
        onClose();
        onNavigate('dashboard');
      }
    },
    {
      id: 'nav-servers',
      category: 'Navigation',
      title: 'Bot Instances List',
      subtitle: 'Manage all hosted Python and Node.js containers',
      icon: Server,
      action: () => {
        onClose();
        onNavigate('servers');
      }
    },
    {
      id: 'nav-tokens',
      category: 'Navigation',
      title: 'API Tokens & Keys',
      subtitle: 'Manage personal access tokens and REST auth',
      icon: Key,
      action: () => {
        onClose();
        onNavigate('tokens');
      }
    },
    {
      id: 'nav-docs',
      category: 'Navigation',
      title: 'REST API Documentation',
      subtitle: 'HTTP endpoints, curl examples, and WebSocket specs',
      icon: BookOpen,
      action: () => {
        onClose();
        onNavigate('docs');
      }
    },
    {
      id: 'nav-quotas',
      category: 'Navigation',
      title: 'Resource Quotas & Limits',
      subtitle: 'Inspect vCPU, RAM, and NVMe allocations',
      icon: Layers,
      action: () => {
        onClose();
        onNavigate('quotas');
      }
    },
    {
      id: 'nav-security',
      category: 'Navigation',
      title: 'Security & 2FA',
      subtitle: 'Change password, multi-factor auth, and active sessions',
      icon: Shield,
      action: () => {
        onClose();
        onNavigate('security');
      }
    },
    {
      id: 'nav-profile',
      category: 'Navigation',
      title: 'User Profile Settings',
      subtitle: 'Update account username and preferences',
      icon: UserIcon,
      action: () => {
        onClose();
        onOpenAccountModal('profile');
      }
    }
  ];

  // Admin Items (Admin Only)
  if (isAdmin) {
    items.push(
      {
        id: 'nav-admin-database',
        category: 'Admin',
        title: 'Database Explorer & Backups',
        subtitle: 'Direct SQLite table management, SQL queries, and snapshots',
        icon: Database,
        action: () => {
          onClose();
          onNavigate('admin', 'database');
        },
        badge: 'Admin'
      },
      {
        id: 'nav-admin-health',
        category: 'Admin',
        title: 'System Health & Auto-Healer',
        subtitle: 'Diagnose runtime daemons and automated failover repair',
        icon: Activity,
        action: () => {
          onClose();
          onNavigate('admin', 'health');
        },
        badge: 'Admin'
      },
      {
        id: 'nav-admin-panel',
        category: 'Admin',
        title: 'Central Administration Panel',
        subtitle: 'User management, cluster overview, and audit administration',
        icon: Shield,
        action: () => {
          onClose();
          onNavigate('admin', 'overview');
        },
        badge: 'Admin'
      }
    );
  }

  // Add individual bot instances to search
  servers.forEach(s => {
    items.push({
      id: `server-${s.id}`,
      category: 'Servers',
      title: s.name,
      subtitle: `${s.runtime} • ${s.status.toUpperCase()} • ${s.ramLimit}MB RAM`,
      icon: Server,
      action: () => {
        onClose();
        onSelectServer(s.id);
      },
      badge: s.status
    });
  });

  const filteredItems = items.filter(item => {
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#0c0d19] border border-[rgba(140,120,255,0.3)] shadow-2xl overflow-hidden glow-ambient flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08]">
          <Search className="w-5 h-5 text-purple-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search bot instances, tokens, console..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              No matching commands or bot instances found for &quot;{query}&quot;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30'
                      : 'text-zinc-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/[0.05] text-zinc-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-100 truncate">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-zinc-500 truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-black/40 text-zinc-400 border border-white/5">
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Helper */}
        <div className="px-4 py-2 bg-black/40 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>esc to close</span>
          </div>
          <span>Xorvila Command Palette</span>
        </div>
      </div>
    </div>
  );
};
