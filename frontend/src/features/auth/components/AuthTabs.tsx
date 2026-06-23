import React from 'react';

interface AuthTabsProps {
  activeTab: 'login' | 'register';
  onChange: (tab: 'login' | 'register') => void;
}

export function AuthTabs({ activeTab, onChange }: AuthTabsProps) {
  return (
    <div className="flex border-b border-white/5 mb-6">
      <button
        type="button"
        onClick={() => onChange('login')}
        className={`flex-1 pb-3 text-sm font-bold tracking-wide font-sans cursor-pointer transition-all border-b-2 text-center ${
          activeTab === 'login'
            ? 'border-cyan-500 text-white font-black'
            : 'border-transparent text-zinc-500 hover:text-zinc-300'
        }`}
      >
        Login
      </button>

      <button
        type="button"
        onClick={() => onChange('register')}
        className={`flex-1 pb-3 text-sm font-bold tracking-wide font-sans cursor-pointer transition-all border-b-2 text-center ${
          activeTab === 'register'
            ? 'border-violet-500 text-white font-black'
            : 'border-transparent text-zinc-500 hover:text-zinc-300'
        }`}
      >
        Register
      </button>
    </div>
  );
}
