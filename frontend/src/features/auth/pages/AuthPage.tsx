import React, { useState } from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { UserRole } from '../authTypes';
import { AuthCard } from '../components/AuthCard';
import { AuthTabs } from '../components/AuthTabs';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import { safeStorage } from '../../../shared/safeStorage';

interface AuthPageProps {
  onLoginSuccess: (role: UserRole, fullName: string) => void;
  onNavigateHome: () => void;
}

export function AuthPage({ onLoginSuccess, onNavigateHome }: AuthPageProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  const handleSuccess = (role: UserRole) => {
    const savedUserStr = safeStorage.getItem('voiceturk_demo_user');
    let fullName = role === 'buyer' ? 'Vy Tran' : 'Minh Pham';
    if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        if (u && u.fullName) fullName = u.fullName;
      } catch (err) {
        console.error(err);
      }
    }
    onLoginSuccess(role, fullName);
  };

  return (
    <div className="w-full max-w-md mx-auto relative z-10 py-2 sm:py-4 flex flex-col items-center justify-center font-sans">
      
      {/* Back to landing button */}
      <div className="w-full flex justify-start mb-4">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-all cursor-pointer bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10"
        >
          <ArrowLeft size={14} />
          Back to landing
        </button>
      </div>

      <div className="w-full space-y-6">
        
        {/* Simple Brand Logo Header */}
        <div className="flex flex-col items-center text-center space-y-2 cursor-pointer" onClick={onNavigateHome}>
          <div className="p-2 border border-cyan-500/30 bg-cyan-950/40 rounded-xl w-fit">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </div>
          <span className="text-base font-extrabold text-white tracking-widest uppercase">
            VoiceTurk
          </span>
          <p className="text-[11px] text-zinc-400 font-medium">
            VoiceTurk Access Portal
          </p>
        </div>

        {/* Dynamic centered Card Container */}
        <AuthCard>
          <AuthTabs activeTab={activeTab} onChange={setActiveTab} />
          
          {activeTab === 'login' ? (
            <LoginForm
              onSuccess={handleSuccess}
              onToggleButton={() => setActiveTab('register')}
            />
          ) : (
            <RegisterForm
              onSuccess={handleSuccess}
              onToggleButton={() => setActiveTab('login')}
            />
          )}
        </AuthCard>

      </div>
    </div>
  );
}
