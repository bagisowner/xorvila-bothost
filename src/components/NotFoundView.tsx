import React from 'react';
import { FileQuestion, LayoutDashboard, ArrowLeft, Search, Compass } from 'lucide-react';

interface Props {
  onReturnHome: () => void;
  currentPath?: string;
}

export const NotFoundView: React.FC<Props> = ({ onReturnHome, currentPath }) => {
  const displayPath = currentPath || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/unknown');

  return (
    <div id="not-found-view" className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-lg w-full p-8 rounded-3xl bg-slate-950/85 border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.18)] glass-panel text-center space-y-6 backdrop-blur-2xl relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-cyan-600/20 blur-3xl" />

        {/* Floating 404 Icon */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600/30 via-indigo-600/20 to-cyan-500/10 p-0.5 border border-purple-500/40 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(139,92,246,0.3)]">
          <div className="w-full h-full rounded-[22px] bg-[#070a18] flex items-center justify-center text-purple-400">
            <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: '12s' }} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-sm">
            <span>404 PAGE NOT FOUND</span>
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight">You've Discovered Uncharted Space</h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
            The destination route you requested does not exist or has been relocated within the cluster.
          </p>
        </div>

        {/* Requested Path Badge */}
        <div className="rounded-2xl bg-black/50 border border-white/10 p-3 font-mono text-xs text-cyan-300 flex items-center justify-center gap-2">
          <span className="text-zinc-500">Path:</span>
          <span className="truncate max-w-[280px] font-semibold">{displayPath}</span>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onReturnHome}
            className="flex-1 min-w-[180px] flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all cursor-pointer active:scale-95"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
