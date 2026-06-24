import React, { useState } from 'react';
import { useAuth } from '../useAuth';
import { RoleSelector } from './RoleSelector';
import { UserRole } from '../authTypes';
import { Chrome } from 'lucide-react';
import { requestGoogleAccessToken } from '../googleIdentity';

interface LoginFormProps {
  onSuccess: (role: UserRole) => void;
  onToggleButton: () => void;
}

export function LoginForm({ onSuccess, onToggleButton }: LoginFormProps) {
  const { login, googleLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('buyer');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setIsLoading(true);
    try {
      await login({ email: email.trim(), password: password.trim(), role });
      onSuccess(role);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const accessToken = await requestGoogleAccessToken();
      await googleLogin(accessToken, role);
      onSuccess(role);
    } catch (err: any) {
      setError(err?.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-sans">
          {error}
        </div>
      )}

      {/* Email Field */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-sans">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.name@example.com"
          className="w-full px-4 py-3 bg-zinc-950 border border-white/5 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-all font-sans"
          disabled={isLoading}
        />
      </div>

      {/* Password Field */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-sans">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
          className="w-full px-4 py-3 bg-zinc-950 border border-white/5 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-all font-sans"
          disabled={isLoading}
        />
      </div>

      {/* Role Selector integration */}
      <RoleSelector selectedRole={role} onChange={setRole} />

      {/* Button */}
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-3 rounded-full text-xs font-bold uppercase tracking-wider font-sans transition-all active:scale-98 cursor-pointer ${
          role === 'buyer'
            ? 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black shadow-lg shadow-teal-500/10 font-bold'
            : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/10 font-bold'
        }`}
      >
        {isLoading ? 'Verifying Credentials...' : 'Login'}
      </button>

      {/* Divider */}
      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-white/5"></div>
        <span className="flex-shrink mx-4 text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
          Or continue with
        </span>
        <div className="flex-grow border-t border-white/5"></div>
      </div>

      {/* Google Login Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full py-3 bg-zinc-950 hover:bg-zinc-900 border border-white/10 hover:border-white/20 rounded-full text-xs font-bold font-sans text-white transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
      >
        <Chrome className="w-4 h-4 text-rose-400 shrink-0" />
        <span>Continue with Google</span>
      </button>

      {/* Demo helper and switch account mode */}
      <div className="space-y-3 pt-2 text-center">
        <button
          type="button"
          onClick={onToggleButton}
          className="text-xs text-zinc-400 hover:text-white transition-all font-sans underline underline-offset-4 cursor-pointer"
        >
          New to VoiceTurk? Create an account
        </button>
        <p className="text-[10px] text-zinc-500 font-sans tracking-wide leading-relaxed">
          Demo mode: authentication is mocked for prototype only.
        </p>
      </div>
    </form>
  );
}
