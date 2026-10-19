import React, { useEffect, useState } from 'react';
import { RotateCw, Cpu, Activity, HardDrive, Server, Shield, Terminal, Key } from 'lucide-react';

/* 1. Top NProgress-Style Glowing Progress Line */
export const TopProgressBar: React.FC<{ active: boolean }> = ({ active }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(100);
      const timeout = setTimeout(() => setProgress(0), 300);
      return () => clearTimeout(timeout);
    }

    setProgress(15);
    const timer1 = setTimeout(() => setProgress(65), 150);
    const timer2 = setTimeout(() => setProgress(88), 400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [active]);

  if (progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-[9999] pointer-events-none overflow-hidden bg-black/20">
      <div
        className="h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-indigo-500 shadow-[0_0_14px_#a855f7] transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

/* 2. Floating Centered Glass Badge Loader (Matching Video exact design) */
export const FloatingLoaderBadge: React.FC<{ label?: string }> = ({
  label = 'Loading action...'
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
      <div className="px-5 py-3 rounded-2xl bg-[#080d22]/90 border border-purple-500/30 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
        <div className="relative flex items-center justify-center shrink-0">
          <div className="w-6 h-6 rounded-full border-2 border-purple-500/30 border-t-cyan-400 animate-spin" />
          <img
            src="https://i.imgur.com/jcw4JKg.png"
            alt="Xorvila"
            className="w-3.5 h-3.5 object-contain absolute inset-0 m-auto animate-pulse"
          />
        </div>
        <span className="text-xs font-mono font-medium text-zinc-200 tracking-wide">
          {label}
        </span>
      </div>
    </div>
  );
};

/* 3. Dedicated Content Skeleton Loaders for Every Page */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Welcome Banner Skeleton */}
      <div className="h-32 w-full rounded-2xl bg-slate-900/60 border border-white/10 p-6 flex flex-col justify-between relative overflow-hidden backdrop-blur-md">
        <div className="space-y-2">
          <div className="h-4 w-36 bg-purple-500/20 rounded animate-pulse" />
          <div className="h-7 w-64 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="h-3.5 w-80 bg-white/5 rounded animate-pulse" />
      </div>

      {/* 6 Metric Strip Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-900/50 border border-white/10 p-3.5 flex flex-col justify-between backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-8 bg-cyan-400/20 rounded animate-pulse" />
            </div>
            <div className="h-6 w-16 bg-white/15 rounded animate-pulse" />
            <div className="h-1.5 w-full bg-white/10 rounded-full animate-pulse" />
          </div>
        ))}
      </div>

      {/* Filter Toolbar Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/40 border border-white/10">
        <div className="h-9 w-64 bg-white/5 rounded-xl animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-9 w-28 bg-purple-600/20 rounded-xl border border-purple-500/30 animate-pulse" />
        </div>
      </div>

      {/* Server Card Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-slate-900/60 border border-white/10 p-5 flex flex-col justify-between backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 bg-white/15 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-6 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 animate-pulse" />
            </div>

            <div className="space-y-2 py-2">
              <div className="h-1.5 w-full bg-white/10 rounded-full animate-pulse" />
              <div className="flex justify-between">
                <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
              <div className="h-8 w-20 bg-white/10 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ServerDetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Server Header Banner */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-white/15 rounded animate-pulse" />
            <div className="h-3.5 w-64 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 bg-emerald-500/20 rounded-xl animate-pulse" />
          <div className="h-9 w-20 bg-amber-500/20 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* 4 Core Resource Gauges Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-900/50 border border-white/10 p-3.5 flex flex-col justify-between backdrop-blur-md">
            <div className="flex justify-between">
              <div className="h-3 w-20 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-8 bg-cyan-400/20 rounded animate-pulse" />
            </div>
            <div className="h-7 w-24 bg-white/15 rounded animate-pulse" />
            <div className="h-1.5 w-full bg-white/10 rounded-full animate-pulse" />
          </div>
        ))}
      </div>

      {/* Subtabs Bar Skeleton */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-lg bg-white/5 animate-pulse" />
        ))}
      </div>

      {/* Content Body Placeholder */}
      <div className="h-96 rounded-2xl bg-slate-900/60 border border-white/10 p-6 flex flex-col items-center justify-center gap-3 backdrop-blur-md">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
        <span className="text-xs font-mono text-cyan-300 tracking-wide animate-pulse">
          Loading container telemetry & workspace files...
        </span>
      </div>
    </div>
  );
};

export const AdminSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="h-20 rounded-2xl bg-slate-900/60 border border-white/10 p-4 flex items-center justify-between backdrop-blur-md">
        <div className="space-y-2">
          <div className="h-5 w-40 bg-white/15 rounded animate-pulse" />
          <div className="h-3 w-64 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-purple-600/20 rounded-xl animate-pulse" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-900/50 border border-white/10 p-4 space-y-2 backdrop-blur-md">
            <div className="h-3 w-20 bg-white/10 rounded animate-pulse" />
            <div className="h-7 w-16 bg-white/20 rounded animate-pulse" />
          </div>
        ))}
      </div>

      <div className="h-80 rounded-2xl bg-slate-900/60 border border-white/10 p-6 space-y-4 backdrop-blur-md">
        <div className="h-5 w-48 bg-white/15 rounded animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 w-full bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
};

export const GenericPageSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="h-16 rounded-2xl bg-slate-900/60 border border-white/10 p-4 flex items-center justify-between backdrop-blur-md">
        <div className="h-5 w-48 bg-white/15 rounded animate-pulse" />
        <div className="h-8 w-24 bg-white/10 rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-44 rounded-2xl bg-slate-900/60 border border-white/10 p-5 space-y-3 backdrop-blur-md">
            <div className="h-4 w-36 bg-white/15 rounded animate-pulse" />
            <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
            <div className="h-3 w-4/5 bg-white/5 rounded animate-pulse" />
            <div className="h-8 w-28 bg-purple-600/20 rounded-lg animate-pulse mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
};

/* 4. Full App Reload / Initial Load Skeleton (Shown on Browser Refresh) */
export const AppSkeletonLoader: React.FC = () => {
  return (
    <div className="min-h-screen text-slate-100 flex flex-col relative overflow-hidden bg-[#060918] select-none">
      {/* Top YouTube-Style Loading Bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 via-cyan-400 to-indigo-500 animate-pulse z-[9999] shadow-[0_0_14px_#a855f7]" />

      {/* Background Wallpaper Image */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-20">
        <img
          src="https://i.imgur.com/0SCLxYy.png"
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center fixed inset-0 scale-[1.01] brightness-125 contrast-105"
        />
        <div className="absolute inset-0 bg-[#060918]/50 backdrop-blur-[0.5px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#060918]/60 via-transparent to-[#060918]/85" />
      </div>

      {/* Main Skeleton Header */}
      <header className="h-14 sm:h-16 border-b border-purple-500/20 bg-[#060918]/80 backdrop-blur-2xl px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="https://i.imgur.com/jcw4JKg.png"
            alt="Xorvila"
            className="w-7 h-7 object-contain rounded-lg drop-shadow-[0_0_10px_rgba(168,85,247,0.6)] animate-pulse"
          />
          <span className="font-bold text-sm bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
            XORVILA
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <div className="h-8 w-64 bg-white/5 rounded-xl border border-white/10 animate-pulse" />
          <div className="h-8 w-8 rounded-full bg-purple-500/20 animate-pulse" />
        </div>
      </header>

      {/* Main Content Skeleton Body */}
      <div className="flex-1 flex min-w-0 relative">
        {/* Sidebar Skeleton */}
        <aside className="hidden md:block w-64 border-r border-purple-500/20 bg-[#060918]/80 backdrop-blur-2xl p-4 space-y-6 shrink-0">
          <div className="space-y-2">
            <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
            <div className="h-9 w-full bg-purple-600/20 rounded-xl border border-purple-500/30 animate-pulse" />
            <div className="h-9 w-full bg-white/5 rounded-xl animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-20 bg-white/10 rounded animate-pulse" />
            <div className="h-9 w-full bg-white/5 rounded-xl animate-pulse" />
            <div className="h-9 w-full bg-white/5 rounded-xl animate-pulse" />
            <div className="h-9 w-full bg-white/5 rounded-xl animate-pulse" />
          </div>
        </aside>

        {/* Dashboard Grid Skeleton */}
        <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
          <DashboardSkeleton />
        </main>

        {/* Floating Centered Glass Badge Loader (Matching Video exact design) */}
        <FloatingLoaderBadge label="Connecting to cluster engine..." />
      </div>
    </div>
  );
};
