import React from 'react';
import { LandingNav } from '../components/LandingNav';
import { HeroSection } from '../components/HeroSection';
import { ProductFlow } from '../components/ProductFlow';
import { DemoCampaignCard } from '../components/DemoCampaignCard';
import { ProofLayerSection } from '../components/ProofLayerSection';

interface LandingPageProps {
  onNavigateToAuth: () => void;
}

export function LandingPage({ onNavigateToAuth }: LandingPageProps) {
  const handleScrollTo = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#050509] flex flex-col relative overflow-x-hidden selection:bg-teal-500/30 font-sans">
      
      {/* Ambient backgrounds */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] z-0 pointer-events-none" />
      <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-950/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] right-10 w-[500px] h-[500px] bg-gradient-to-br from-indigo-950/10 to-transparent blur-[140px] pointer-events-none" />

      {/* Public Landing Navigation Bar */}
      <LandingNav 
        onSignIn={onNavigateToAuth}
        onGetStarted={onNavigateToAuth}
        onScrollTo={handleScrollTo}
      />

      {/* Main Content Sections */}
      <main className="flex-1 relative z-10">
        
        {/* Cinematic Hero Header */}
        <HeroSection 
          onGetStarted={onNavigateToAuth} 
          onViewDemo={() => handleScrollTo('how-it-works')} 
        />

        {/* 5-Step Operational Flow */}
        <ProductFlow />

        {/* Live Active Sample Campaign Demo Card */}
        <DemoCampaignCard onTryCampaign={onNavigateToAuth} />

        {/* Cryptographic Trust & Verification Summary Section */}
        <ProofLayerSection />

      </main>

      {/* Public Single Footer */}
      <footer className="py-10 border-t border-white/5 relative z-10 text-center text-[10.5px] text-zinc-500 bg-[#050509] font-sans">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-2">
          <p className="max-w-md select-none leading-relaxed">
            Demo mode: proof records are simulated. Production verification can connect to Solana.
          </p>
          <div className="text-[10px] text-zinc-600 font-mono mt-1">
            &copy; {new Date().getFullYear()} VoiceTurk. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
