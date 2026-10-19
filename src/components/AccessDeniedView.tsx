import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, LayoutDashboard } from 'lucide-react';

interface Props {
  onReturnHome: () => void;
}

export const AccessDeniedView: React.FC<Props> = ({ onReturnHome }) => {
  return (
    <div id="access-denied-view" className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-[#080B18]/90 border border-rose-500/30 shadow-2xl glass-panel text-center space-y-5 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-rose-950/80 text-rose-300 border border-rose-500/40">
            <Lock className="w-3.5 h-3.5" />
            <span>403 FORBIDDEN</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-100">Administrator Privileges Required</h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The requested infrastructure control or database resource is restricted to authorized platform administrators.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onReturnHome}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg transition-all cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
