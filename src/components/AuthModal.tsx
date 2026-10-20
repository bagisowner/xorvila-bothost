import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { fetchApi, setAuthToken } from '../lib/api';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Cpu,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Gift
} from 'lucide-react';
import { XorvilaAiIcon } from './icons/XorvilaAiIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  canClose?: boolean;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  canClose = true
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [referralsEnabled, setReferralsEnabled] = useState(true);

  useEffect(() => {
    fetchApi<{ referralsEnabled: boolean }>('/auth/public-config')
      .then(res => {
        if (res.success && res.data) {
          setReferralsEnabled(res.data.referralsEnabled !== false);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      setEmailOrUsername('');
      setPassword('');
      setConfirmPassword('');
      setName('');
      setUsername('');
      setReferralCode('');
      setShowPassword(false);
      setTwoFactorCode('');
      setRequires2FA(false);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  // Password strength score (0-4)
  const calculateStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = calculateStrength(password);
  const strengthLabels = ['Too Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = [
    'bg-zinc-700',
    'bg-rose-500',
    'bg-amber-500',
    'bg-cyan-500',
    'bg-emerald-500'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === 'login') {
      const trimmed = emailOrUsername.trim();
      if (!trimmed || !password) {
        setErrorMsg('Please enter both your identifier and password.');
        setLoading(false);
        return;
      }

      const res = await fetchApi<{ user?: User; token?: string; requires2FA?: boolean }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: trimmed,
          username: trimmed,
          username_or_email: trimmed,
          password,
          rememberMe,
          twoFactorCode: twoFactorCode.trim() || undefined
        })
      });

      if (res.success && res.data) {
        if (res.data.requires2FA && !twoFactorCode) {
          setRequires2FA(true);
          setLoading(false);
          return;
        }

        if (res.data.token && res.data.user) {
          setAuthToken(res.data.token);
          setSuccessMsg('Authentication successful! Loading dashboard...');
          setTimeout(() => {
            onSuccess(res.data!.user!);
            onClose();
          }, 350);
        } else {
          setErrorMsg('Authentication succeeded but session token was missing.');
        }
      } else {
        setErrorMsg(res.error?.message || 'Login failed. Please check your credentials.');
      }
    } else {
      // Register Mode
      const trimmedEmail = emailOrUsername.trim();
      const chosenUser = (username || name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user').trim();

      if (!trimmedEmail || !password || !name.trim()) {
        setErrorMsg('Please complete all required fields.');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please re-enter.');
        setLoading(false);
        return;
      }

      const res = await fetchApi<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: trimmedEmail,
          username: chosenUser,
          password,
          name: name.trim(),
          referralCode: referralCode.trim() || undefined
        })
      });

      if (res.success && res.data) {
        setAuthToken(res.data.token);
        setSuccessMsg('Account created successfully! Initializing workspace...');
        setTimeout(() => {
          onSuccess(res.data.user);
          onClose();
        }, 400);
      } else {
        setErrorMsg(res.error?.message || 'Registration failed. Please try a different email or username.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#090d1a] shadow-[0_0_50px_rgba(0,0,0,0.8)] p-6 space-y-5 my-8 relative overflow-hidden">
        {/* Subtle top ambient glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-32 bg-gradient-to-r from-purple-600/30 via-cyan-500/30 to-indigo-600/30 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-3">
            <img
              src="https://i.imgur.com/jcw4JKg.png"
              alt="Xorvila Logo"
              className="w-9 h-9 object-contain rounded-xl drop-shadow-[0_0_12px_rgba(168,85,247,0.4)] shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-wide text-zinc-100 uppercase">
                  Xorvila Core
                </h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                  v2.4
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Bot Cloud Runtime & Orchestration</p>
            </div>
          </div>

          {canClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab Switcher: Sign In vs Create Account */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.03] border border-white/[0.08] relative z-10">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.35)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.35)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs relative z-10">
          {mode === 'register' && (
            <>
              <div>
                <label className="text-zinc-300 block mb-1 font-medium">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.1] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 block mb-1 font-medium flex items-center justify-between">
                  <span>Username</span>
                  <span className="text-[10px] text-zinc-500">3-30 characters</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-zinc-500 text-xs">@</span>
                  <input
                    type="text"
                    required
                    placeholder="choose_username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.1] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all font-mono text-xs"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-zinc-300 block mb-1 font-medium">
              {mode === 'login' ? 'Username or Email Address' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={mode === 'login' ? 'text' : 'email'}
                required
                autoComplete={mode === 'login' ? 'username' : 'email'}
                placeholder={mode === 'login' ? 'Enter username or email address' : 'name@example.com'}
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.1] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-300 block mb-1 font-medium">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2 rounded-xl bg-white/[0.03] border border-white/[0.1] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength indicator for registration */}
            {mode === 'register' && password && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1 h-1">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`flex-1 rounded-full h-full transition-colors ${
                        step <= strength ? strengthColors[strength] : 'bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center text-[10px] text-zinc-500">
                  <span>Strength: {strengthLabels[strength]}</span>
                  <span>Min 6 characters</span>
                </div>
              </div>
            )}
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="text-zinc-300 block mb-1 font-medium">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.1] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all text-xs"
                  />
                </div>
              </div>

              {referralsEnabled && (
                <div>
                  <label className="text-zinc-300 block mb-1 font-medium flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-purple-300">
                      <Gift className="w-3.5 h-3.5 text-purple-400" /> Referral Code
                    </span>
                    <span className="text-[10px] text-zinc-500">Optional</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. XOR-ADMIN"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl bg-purple-950/20 border border-purple-500/30 text-purple-200 placeholder-zinc-600 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 transition-all font-mono uppercase text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Invited by a friend? Enter their referral code to support them!
                  </p>
                </div>
              )}
            </>
          )}

          {requires2FA && (
            <div className="pt-1 p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-1.5">
              <label className="text-cyan-300 block font-semibold flex items-center gap-1.5 text-xs">
                <Shield className="w-3.5 h-3.5 text-cyan-400" /> Two-Factor Authentication (2FA)
              </label>
              <p className="text-[11px] text-zinc-400">
                Enter the 6-digit TOTP code from your authenticator application:
              </p>
              <input
                type="text"
                maxLength={6}
                autoFocus
                placeholder="000000"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-3 py-2 text-center text-lg tracking-[0.3em] font-mono rounded-lg bg-zinc-950 border border-cyan-500/60 text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          )}

          {/* Session options for Login */}
          {mode === 'login' && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 text-zinc-400 cursor-pointer select-none hover:text-zinc-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-zinc-900 border-zinc-700 text-purple-600 focus:ring-0 focus:ring-offset-0"
                />
                <span>Remember this device (7 days)</span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-2.5 rounded-xl font-semibold text-xs bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Assurance Badge */}
        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-center gap-2 text-[11px] text-zinc-500 text-center">
          <Shield className="w-3.5 h-3.5 text-cyan-500/70 shrink-0" />
          <span>Encrypted Session • JWT & SQLite Protection • Multi-Tenant RBAC</span>
        </div>
      </div>
    </div>
  );
};
