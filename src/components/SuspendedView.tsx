import React from 'react';
import { Lock, ShieldAlert, ArrowLeft, LogOut, HelpCircle, Mail, AlertTriangle } from 'lucide-react';

interface Props {
  type?: 'user' | 'server';
  serverName?: string;
  reason?: string;
  onReturnHome: () => void;
  onLogout?: () => void;
}

export const SuspendedView: React.FC<Props> = ({
  type = 'server',
  serverName,
  reason,
  onReturnHome,
  onLogout
}) => {
  const isUserSuspension = type === 'user';

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl rounded-3xl border border-rose-500/30 bg-slate-950/85 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(244,63,94,0.18)] relative overflow-hidden text-center space-y-6">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-rose-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-purple-600/15 blur-3xl" />

        {/* Lock Icon Badge */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600/30 via-rose-500/20 to-amber-500/10 p-0.5 border border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.3)]">
          <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#070a18]">
            <ShieldAlert className="h-10 w-10 text-rose-400 animate-pulse" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-rose-950/80 border border-rose-500/40 text-rose-300">
            <Lock className="w-3.5 h-3.5" />
            <span>{isUserSuspension ? 'ACCOUNT SUSPENDED' : 'SERVER SUSPENDED'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {isUserSuspension ? 'Access Temporarily Restricted' : `"${serverName || 'Bot Container'}" is Suspended`}
          </h2>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            {isUserSuspension
              ? 'Your account has been placed on administrative hold. You cannot start, deploy, or modify active bot containers until reviewed.'
              : 'This bot container has been suspended by an administrator. Process execution and API connectivity are currently blocked.'}
          </p>
        </div>

        {/* Reason Box */}
        <div className="rounded-2xl bg-black/40 border border-rose-500/20 p-4 text-left font-mono text-xs text-zinc-300 space-y-2">
          <div className="flex items-center gap-2 text-rose-400 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Suspension Notice & Details:</span>
          </div>
          <p className="text-zinc-400 pl-6 leading-relaxed">
            {reason || (isUserSuspension
              ? 'Reason: Excessive resource consumption or terms of service review. Please contact support.'
              : 'Reason: Admin manual freeze or quota violation. Contact system administrator to unsuspend.')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={onReturnHome}
            className="px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.15] text-zinc-200 hover:text-white text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>

          {isUserSuspension && onLogout ? (
            <button
              onClick={onLogout}
              className="px-5 py-2.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-200 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          ) : (
            <a
              href="mailto:support@xorvila.com"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Contact Administrator</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
