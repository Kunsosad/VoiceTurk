import React from 'react';
import { UserRole } from '../authTypes';

interface RoleSelectorProps {
  selectedRole: UserRole;
  onChange: (role: UserRole) => void;
}

export function RoleSelector({ selectedRole, onChange }: RoleSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-sans">
        Select Workspace Role
      </label>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Buyer Option */}
        <button
          type="button"
          onClick={() => onChange('buyer')}
          className={`flex flex-col text-left p-4 rounded-xl border transition-all relative ${
            selectedRole === 'buyer'
              ? 'bg-cyan-950/40 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.15)] text-white'
              : 'bg-zinc-950/60 border-white/5 hover:border-white/10 text-zinc-400 hover:text-zinc-300'
          }`}
        >
          {selectedRole === 'buyer' && (
            <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-cyan-400" />
          )}
          <span className="text-xs font-bold font-sans tracking-wide">
            Buyer Console
          </span>
          <span className="text-[10px] text-zinc-400 font-sans leading-relaxed mt-1">
            Create campaigns, review recordings, and receive verified datasets.
          </span>
        </button>

        {/* Contributor Option */}
        <button
          type="button"
          onClick={() => onChange('contributor')}
          className={`flex flex-col text-left p-4 rounded-xl border transition-all relative ${
            selectedRole === 'contributor'
              ? 'bg-violet-950/40 border-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.15)] text-white'
              : 'bg-zinc-950/60 border-white/5 hover:border-white/10 text-zinc-400 hover:text-zinc-300'
          }`}
        >
          {selectedRole === 'contributor' && (
            <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-violet-400" />
          )}
          <span className="text-xs font-bold font-sans tracking-wide">
            Contributor Studio
          </span>
          <span className="text-[10px] text-zinc-400 font-sans leading-relaxed mt-1">
            Talk with AI Customers and earn from accepted recordings.
          </span>
        </button>
      </div>
    </div>
  );
}
