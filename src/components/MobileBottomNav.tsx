import React from 'react';
import {
  LayoutDashboard,
  Server,
  Plus,
  User as UserIcon,
  Shield,
  Search,
  Key,
  Layers
} from 'lucide-react';
import { User } from '../types';
import { AppView } from './Sidebar';

interface Props {
  activeView: AppView;
  selectedServerId: string | null;
  currentUser: User | null;
  onNavigate: (view: AppView) => void;
  onOpenCreateModal: () => void;
  onOpenAccountModal: (tab?: 'profile' | 'tokens' | 'quotas' | 'security') => void;
  onOpenCommandPalette: () => void;
}

export const MobileBottomNav: React.FC<Props> = ({
  activeView,
  selectedServerId,
  currentUser,
  onNavigate,
  onOpenCreateModal,
  onOpenAccountModal,
  onOpenCommandPalette
}) => {
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#050711]/95 dark:bg-[#050711]/95 border-t border-[rgba(140,120,255,0.18)] backdrop-blur-xl px-2 py-1.5 pb-safe"
    >
      <div className="flex items-center justify-around">
        {/* Dashboard */}
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer ${
            activeView === 'dashboard' && !selectedServerId
              ? 'text-purple-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        {/* Bot Instances */}
        <button
          onClick={() => onNavigate('servers')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer ${
            activeView === 'servers'
              ? 'text-purple-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Server className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Bots</span>
        </button>

        {/* Center Deploy Button */}
        <button
          onClick={onOpenCreateModal}
          className="w-11 h-11 -mt-4 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
          title="Deploy Bot"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Admin / Tokens */}
        {isAdmin ? (
          <button
            onClick={() => onNavigate('admin', 'overview')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer ${
              activeView === 'admin'
                ? 'text-purple-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Admin</span>
          </button>
        ) : (
          <button
            onClick={() => onNavigate('tokens')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer ${
              activeView === 'tokens'
                ? 'text-purple-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Key className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Tokens</span>
          </button>
        )}

        {/* Account Profile */}
        <button
          onClick={() => onOpenAccountModal('profile')}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Account</span>
        </button>
      </div>
    </div>
  );
};
