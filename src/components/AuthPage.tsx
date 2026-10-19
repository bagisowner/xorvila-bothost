import React, { useState } from 'react';
import { fetchApi, setAuthToken } from '../lib/api';
import { User } from '../types';
import { Shield, Key, UserCheck, Lock, Mail, UserPlus, ArrowRight, Zap, CheckCircle2, Server } from 'lucide-react';
import { useNotifications } from '../lib/notifications';

interface Props {
  onSuccess: (user: User) => void;
}

export const AuthPage: React.FC<Props> = ({ onSuccess }) => {
  const { addToast } = useNotifications();
  const [tab, setTab] = useState<'login' | 'register'>(() => {
    try {
      const search = window.location.search;
      const path = window.location.pathname;
      if (search.includes('register') || path.includes('register')) {
        return 'register';
      }
    } catch (e) {}
    return 'login';
  });

  const switchTab = (newTab: 'login' | 'register') => {
    setTab(newTab);
    setErrorMsg('');
    try {
      window.history.pushState({}, '', `/auth?=${newTab}`);
    } catch (e) {}
  };

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please provide both email/username and password');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetchApi<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password })
      });

      if (res.success && res.data) {
        setAuthToken(res.data.token);
        addToast({
          type: 'success',
          title: 'Welcome Back!',
          message: `Authenticated as ${res.data.user.name || res.data.user.email}`
        });
        onSuccess(res.data.user);
      } else {
        setErrorMsg(res.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setErrorMsg('Please fill in all required registration fields');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetchApi<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password })
      });

      if (res.success && res.data) {
        setAuthToken(res.data.token);
        addToast({
          type: 'success',
          title: 'Account Provisioned!',
          message: `Welcome to Xorvila, ${res.data.user.name}!`
        });
        onSuccess(res.data.user);
      } else {
        setErrorMsg(res.error || 'Registration failed');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdminLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetchApi<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin', password: 'admin' })
      });

      if (res.success && res.data) {
        setAuthToken(res.data.token);
        addToast({
          type: 'success',
          title: 'Admin Session Activated',
          message: 'LoggedIn as Root Administrator'
        });
        onSuccess(res.data.user);
      } else {
        // Fallback register if admin missing
        const regRes = await fetchApi<{ token: string; user: User }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name: 'System Admin', email: 'admin', password: 'admin' })
        });
        if (regRes.success && regRes.data) {
          setAuthToken(regRes.data.token);
          onSuccess(regRes.data.user);
        }
      }
    } catch (err) {
      setErrorMsg('Demo admin login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-y-auto selection:bg-purple-500 selection:text-white select-none">
      {/* Universal Background Wallpaper */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-20">
        <img
          src="https://i.imgur.com/0SCLxYy.png"
          alt="Xorvila Background"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center fixed inset-0 scale-[1.01] brightness-125 contrast-105"
        />
        <div className="absolute inset-0 bg-[#050711]/45 backdrop-blur-[0.5px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050711]/60 via-[#050711]/30 to-[#050711]/80" />
      </div>

      {/* Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[150px]" />
      </div>

      {/* Main Authentication Container */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 my-8 items-center">
        {/* Left Side: Product Branding & Features Showcase */}
        <div className="md:col-span-5 space-y-6 text-left">
          <div className="inline-flex items-center gap-3">
            <img
              src="https://i.imgur.com/jcw4JKg.png"
              alt="Xorvila Logo"
              className="w-12 h-12 object-contain rounded-2xl drop-shadow-[0_0_20px_rgba(168,85,247,0.6)]"
            />
            <div>
              <h1 className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-purple-300 via-indigo-200 to-cyan-300 bg-clip-text text-transparent uppercase">
                XORVILA
              </h1>
              <p className="text-xs font-mono text-cyan-400">Bot Cloud Runtime & Orchestration</p>
            </div>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed">
            Next-gen containerized hosting environment with automated file persistence, streaming terminal logs, and live health monitors.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md">
              <img
                src="https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg"
                alt="Python"
                className="w-6 h-6 object-contain"
              />
              <div>
                <div className="text-xs font-semibold text-zinc-200">Python 3.11 Runtime</div>
                <div className="text-[10px] text-zinc-400 font-mono">Full venv support & pip package manager</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md">
              <img
                src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg"
                alt="Node.js"
                className="w-6 h-6 object-contain"
              />
              <div>
                <div className="text-xs font-semibold text-zinc-200">Node.js 20 LTS Runtime</div>
                <div className="text-[10px] text-zinc-400 font-mono">npm package installer & process isolation</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md">
              <Server className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-xs font-semibold text-zinc-200">Permanent VPS Storage</div>
                <div className="text-[10px] text-zinc-400 font-mono">Auto-synced disk storage & auto-healer</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login / Register Form Card */}
        <div className="md:col-span-7">
          <div className="rounded-2xl border border-white/15 bg-[#080c1d]/80 backdrop-blur-2xl shadow-[0_15px_50px_rgba(0,0,0,0.8)] p-6 sm:p-8 space-y-6 relative overflow-hidden">
            {/* Top ambient glow bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-cyan-400 to-indigo-500" />

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-black/50 border border-white/10">
              <button
                type="button"
                onClick={() => switchTab('login')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tab === 'login'
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Key className="w-3.5 h-3.5 text-purple-400" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab('register')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tab === 'register'
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Register Account</span>
              </button>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono animate-in fade-in">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={tab === 'login' ? handleLogin : handleRegister} className="space-y-4">
              {tab === 'register' && (
                <div>
                  <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Alex Mercer"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500/80 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                  Email Address / Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin or user@domain.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500/80 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500/80 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)] flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>{tab === 'login' ? 'Sign In to Cluster' : 'Create Xorvila Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick One-Click Demo Admin Login */}
            <div className="pt-4 border-t border-white/10 text-center">
              <div className="text-[11px] font-mono text-zinc-400 mb-2">Instant Quick Access</div>
              <button
                type="button"
                onClick={handleDemoAdminLogin}
                disabled={loading}
                className="w-full py-2 px-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 text-xs font-mono transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>Sign in as Root Admin (Demo)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
