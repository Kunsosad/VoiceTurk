import React, { useState } from 'react';
import { useAuth } from '../useAuth';
import { RoleSelector } from './RoleSelector';
import { UserRole } from '../authTypes';
import { Chrome } from 'lucide-react';

interface RegisterFormProps {
  onSuccess: (role: UserRole) => void;
  onToggleButton: () => void;
}

export function RegisterForm({ onSuccess, onToggleButton }: RegisterFormProps) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('buyer');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role
      });
      onSuccess(role);
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError(null);
    setIsLoading(true);
    try {
      // Mock Google OAuth sequence
      await new Promise(resolve => setTimeout(resolve, 800));
      const isBuyer = role === 'buyer';
      await register({
        fullName: isBuyer ? 'Vy Tran (Google)' : 'Minh Pham (Google)',
        email: isBuyer ? 'buyer.google@gmail.com' : 'contributor.google@gmail.com',
        password: 'google-sso-bypass-key-12345',
        role
      });
      onSuccess(role);
    } catch (err: any) {
      setError('Google registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-sans">
          {error}
        </div>
      )}

      {/* Name Field */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-sans">
          Full Name
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Vy Tran or Minh Pham"
          className="w-full px-4 py-2.5 bg-zinc-950 border border-white/5 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-all font-sans"
          disabled={isLoading}
        />
      </div>

      {/* Email Field */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-sans">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.name@example.com"
          className="w-full px-4 py-2.5 bg-zinc-950 border border-white/5 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-all font-sans"
          disabled={isLoading}
        />
      </div>

      {/* Password Fields Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-sans">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-4 py-2.5 bg-zinc-950 border border-white/5 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-all font-sans"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-sans">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-4 py-2.5 bg-zinc-950 border border-white/5 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-all font-sans"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Role Selection */}
      <RoleSelector selectedRole={role} onChange={setRole} />

      {/* Register Button */}
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-3 rounded-full text-xs font-bold uppercase tracking-wider font-sans transition-all active:scale-98 cursor-pointer ${
          role === 'buyer'
            ? 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black shadow-lg shadow-teal-500/10 font-bold'
            : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/10 font-bold'
        }`}
      >
        {isLoading ? 'Creating Account...' : 'Create account'}
      </button>

      {/* Divider */}
      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-white/5"></div>
        <span className="flex-shrink mx-4 text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
          Or continue with
        </span>
        <div className="flex-grow border-t border-white/5"></div>
      </div>

      {/* Google Sign-Up Button */}
      <button
        type="button"
        onClick={handleGoogleRegister}
        disabled={isLoading}
        className="w-full py-3 bg-zinc-950 hover:bg-zinc-900 border border-white/10 hover:border-white/20 rounded-full text-xs font-bold font-sans text-white transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
      >
        <Chrome className="w-4 h-4 text-rose-400 shrink-0" />
        <span>Continue with Google</span>
      </button>

      {/* Link to login */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onToggleButton}
          className="text-xs text-zinc-400 hover:text-white transition-all font-sans underline underline-offset-4 cursor-pointer"
        >
          Already have an account? Login
        </button>
      </div>
    </form>
  );
}
