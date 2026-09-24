'use client';
import React, { useState } from 'react';
import { X, LogIn, UserPlus, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useStatsStore } from '@/stores/stats-store';
import { auth } from '@/lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (streak: number) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { setAuth } = useAuthStore();
  const { recordUserLoginStreak } = useStatsStore();

  if (!isOpen) return null;

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const targetEmail = loginEmail || email;
    const targetPassword = loginPassword || password;

    try {
      const res = await auth.login({
        email: targetEmail,
        password: targetPassword,
      });

      const token = res.data.access_token;
      if (!token) throw new Error('No token returned from server');

      localStorage.setItem('token', token);

      // Fetch user profile
      const meRes = await auth.getMe();
      const user = meRes.data;

      setAuth(user, token);

      // Calculate and update user streak on login
      const streak = recordUserLoginStreak(user.id);

      setSuccessMsg(`Welcome back, ${user.full_name || user.username}! Streak: ${streak} day${streak > 1 ? 's' : ''}.`);
      onSuccess?.(streak);

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const uname = username.trim() || email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
      const res = await auth.signup({
        email,
        username: uname,
        password,
        full_name: fullName.trim() || uname,
      });

      const token = res.data.access_token;
      if (!token) throw new Error('No token returned from server');

      localStorage.setItem('token', token);

      const meRes = await auth.getMe();
      const user = meRes.data;

      setAuth(user, token);

      const streak = recordUserLoginStreak(user.id);
      setSuccessMsg(`Account created! You started a ${streak}-day streak!`);
      onSuccess?.(streak);

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    handleLogin('aditya@codementor.dev', 'password123');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="relative w-full max-w-md bg-[#1e1e1e] border border-[#333333] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d2d2d] bg-[#181818]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#007acc] flex items-center justify-center text-white font-bold text-xs shadow-sm">
              CM
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">CodeMentor Account</h2>
              <p className="text-[11px] text-zinc-400">Log in everyday to maintain your coding streak</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-[#2a2d2e] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#2d2d2d] bg-[#161616]">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              tab === 'login'
                ? 'border-[#007acc] text-white bg-[#1e1e1e]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 text-[#007acc]" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              tab === 'signup'
                ? 'border-[#007acc] text-white bg-[#1e1e1e]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-[#89d185]" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs font-sans">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'login' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full bg-[#252526] text-white text-xs px-3 py-2 rounded border border-[#3c3c3c] focus:border-[#007acc] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#252526] text-white text-xs px-3 py-2 rounded border border-[#3c3c3c] focus:border-[#007acc] outline-none transition-colors"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#007acc] hover:bg-[#0062a3] text-white text-xs py-2 rounded font-medium shadow-sm transition-all"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5 justify-center">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  <span>Sign In & Update Streak</span>
                )}
              </Button>

              <div className="pt-2 border-t border-[#2d2d2d]">
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={loading}
                  className="w-full py-2 px-3 rounded bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>1-Click Demo Login (Aditya)</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Doe"
                  className="w-full bg-[#252526] text-white text-xs px-3 py-2 rounded border border-[#3c3c3c] focus:border-[#007acc] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="alex_dev"
                  className="w-full bg-[#252526] text-white text-xs px-3 py-2 rounded border border-[#3c3c3c] focus:border-[#007acc] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full bg-[#252526] text-white text-xs px-3 py-2 rounded border border-[#3c3c3c] focus:border-[#007acc] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-[#252526] text-white text-xs px-3 py-2 rounded border border-[#3c3c3c] focus:border-[#007acc] outline-none transition-colors"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1f883d] hover:bg-[#1a7f37] text-white text-xs py-2 rounded font-medium shadow-sm transition-all"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5 justify-center">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating account...</span>
                  </span>
                ) : (
                  <span>Create Account & Start Day 1 Streak</span>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
