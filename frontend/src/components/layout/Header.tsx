import React, { useState } from 'react';
import { AppView, Role } from '../../shared/types';
import { useAuth } from '../../features/auth/useAuth';
import { ShieldCheck, Menu, X, ChevronDown, LogOut, RefreshCw, User, Landmark, FileCheck } from 'lucide-react';

interface HeaderProps {
  activeRole: Role;
  onRoleChange: (role: Role) => void;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
}

export function Header({ activeRole, onRoleChange, currentView, onNavigate, onLogout }: HeaderProps) {
  const { user, switchRole, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  const userName = user?.fullName || (activeRole === 'buyer' ? 'Vy Tran' : 'Minh Pham');
  const userEmail = user?.email || (activeRole === 'buyer' ? 'vy.tran@support.ai' : 'minh.pham@voiceartist.vn');
  const userInitials = user?.avatarInitials || (activeRole === 'buyer' ? 'VT' : 'MP');
  const currentRoleLabel = activeRole === 'buyer' ? 'Buyer Console' : 'Contributor Studio';

  const toggleRole = () => {
    const newRole = activeRole === 'buyer' ? 'contributor' : 'buyer';
    switchRole(newRole);
    onRoleChange(newRole);
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    onNavigate(newRole === 'buyer' ? 'buyer-campaigns' : 'contributor-campaigns');
  };

  const handleSignOut = async () => {
    await logout();
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    onLogout();
  };

  const handleNavigate = (view: AppView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-45 bg-[#050509]/90 backdrop-blur-md border-b border-white/5 selection:bg-teal-500/30 text-white font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* LEFT: LOGO */}
          <div 
            className="flex items-center gap-2 cursor-pointer select-none" 
            onClick={() => handleNavigate(activeRole === 'buyer' ? 'buyer-campaigns' : 'contributor-campaigns')}
          >
            <div className="p-1.5 border border-cyan-500/30 bg-cyan-950/40 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-sm font-extrabold text-white tracking-widest uppercase">
              VoiceTurk
            </span>
          </div>

          {/* MIDDLE: DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-1">
            {activeRole === 'buyer' ? (
              <>
                <button
                  onClick={() => handleNavigate('buyer-campaigns')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    currentView.startsWith('buyer-campaign') || currentView === 'buyer-recording-review' || currentView === 'buyer-create-agent'
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Campaigns
                </button>
                <button
                  onClick={() => handleNavigate('buyer-finance')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    currentView === 'buyer-finance'
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Finance
                </button>
                <button
                  onClick={() => handleNavigate('buyer-certificates')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    currentView === 'buyer-certificates' || currentView === 'buyer-certificate-detail'
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Certificates
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleNavigate('contributor-campaigns')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    currentView.startsWith('contributor-campaign') || currentView === 'contributor-consent' || currentView === 'contributor-studio' || currentView === 'contributor-session-summary'
                      ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Campaigns
                </button>
                <button
                  onClick={() => handleNavigate('contributor-finance')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    currentView === 'contributor-finance'
                      ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Finance
                </button>
                <button
                  onClick={() => handleNavigate('contributor-agreements')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    currentView === 'contributor-agreements'
                      ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Agreements
                </button>
              </>
            )}

            {/* Switch Role Button */}
            <button
              onClick={toggleRole}
              className="ml-3 px-3 py-1.5 text-xs font-bold text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/15 rounded-lg border border-teal-500/25 transition-all cursor-pointer flex items-center gap-1"
            >
              <RefreshCw size={12} />
              Switch role
            </button>
          </nav>

          {/* RIGHT: DESKTOP USER MENU */}
          <div className="hidden md:flex items-center gap-4 relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 group p-1.5 hover:bg-white/5 rounded-lg transition-all select-none cursor-pointer border border-transparent hover:border-white/5"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-900 to-indigo-950 flex items-center justify-center text-[10px] font-extrabold text-teal-300 border border-white/10 shadow">
                {userInitials}
              </div>
              <span className="text-xs font-semibold text-zinc-300 group-hover:text-white hidden lg:block">
                {userName}
              </span>
              <ChevronDown size={14} className="text-zinc-500 group-hover:text-zinc-300" />
            </button>

            {/* Desktop User Menu Dropdown */}
            {userDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
                <div className="absolute right-0 top-12 w-64 bg-zinc-950/95 border border-white/10 rounded-xl p-4 shadow-2xl z-50 animate-scaleIn space-y-3 font-sans">
                  <div className="pb-3 border-b border-white/5 space-y-1 text-left">
                    <p className="text-xs font-extrabold text-white">{userName}</p>
                    <p className="text-[10px] text-zinc-400 font-mono leading-none">{userEmail}</p>
                    <div className="pt-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        activeRole === 'buyer' 
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                          : 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                      }`}>
                        {currentRoleLabel}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={toggleRole}
                      className="w-full text-left px-2.5 py-2 text-xs font-semibold text-zinc-400 hover:text-teal-400 hover:bg-teal-500/5 rounded-lg transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <RefreshCw size={13} />
                      Switch role to {activeRole === 'buyer' ? 'Contributor' : 'Buyer'}
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-2.5 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 rounded-lg transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut size={13} />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* MOBILE NAVIGATION TRIGGER */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

        </div>
      </div>

      {/* MOBILE COLLAPSED DRAWER MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-950/95 border-b border-white/5 py-4 px-4 space-y-4 animate-scaleIn">
          <div className="flex flex-col gap-2">
            
            {/* Quick Profile readout on Mobile header */}
            <div className="pb-3 border-b border-white/5 px-2">
              <p className="text-xs font-extrabold text-white">{userName}</p>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{userEmail}</p>
              <p className="text-[9.5px] font-bold text-cyan-400 font-sans mt-2 tracking-wide uppercase">
                {currentRoleLabel}
              </p>
            </div>

            {/* Navigation links based on role */}
            {activeRole === 'buyer' ? (
              <>
                <button
                  onClick={() => handleNavigate('buyer-campaigns')}
                  className="text-left py-2.5 px-3 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5"
                >
                  Campaigns
                </button>
                <button
                  onClick={() => handleNavigate('buyer-finance')}
                  className="text-left py-2.5 px-3 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5"
                >
                  Finance
                </button>
                <button
                  onClick={() => handleNavigate('buyer-certificates')}
                  className="text-left py-2.5 px-3 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5"
                >
                  Certificates
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleNavigate('contributor-campaigns')}
                  className="text-left py-2.5 px-3 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5"
                >
                  Campaigns
                </button>
                <button
                  onClick={() => handleNavigate('contributor-finance')}
                  className="text-left py-2.5 px-3 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5"
                >
                  Finance
                </button>
                <button
                  onClick={() => handleNavigate('contributor-agreements')}
                  className="text-left py-2.5 px-3 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5"
                >
                  Agreements
                </button>
              </>
            )}

            <div className="h-px bg-white/5 w-full my-1" />

            {/* Quick action triggers */}
            <button
              onClick={toggleRole}
              className="w-full text-center py-2.5 text-xs font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-lg hover:bg-teal-500/15 transition-all flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={13} />
              Switch to {activeRole === 'buyer' ? 'Contributor Studio' : 'Buyer Console'}
            </button>
            <button
              onClick={handleSignOut}
              className="w-full text-center py-2.5 text-xs font-bold text-rose-450 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded-lg transition-all flex items-center justify-center gap-1.5"
            >
              <LogOut size={13} />
              Logout
            </button>

          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
