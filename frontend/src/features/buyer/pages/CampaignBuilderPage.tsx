import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Radio, Sliders, Play, Square, Headphones, Activity, Sparkles, 
  Bot, Volume2, VolumeX, AlertCircle, Mic 
} from 'lucide-react';
import AIAvatar from '../../../components/voice/AIAvatar';
import { AppView } from '../../../shared/types';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

interface CampaignBuilderPageProps {
  onCreate: (data: any) => void;
  onCancel: () => void;
}

export function CampaignBuilderPage({ onCreate, onCancel }: CampaignBuilderPageProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [agentProgressStage, setAgentProgressStage] = useState<'greeting' | 'industry' | 'emotion' | 'contributor' | 'volume' | 'proposal'>('greeting');
  const [typedInput, setTypedInput] = useState('');
  
  // Voice controls
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [vocalAvatar, setVocalAvatar] = useState('Mỹ An (Sài Gòn)');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState('');
  
  // Storage for user choices
  const [answers, setAnswers] = useState({
    scenario: '',
    industry: '',
    emotion: '',
    contributor: '',
    volume: ''
  });

  // Dialogue messaging history
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Auto Scroll Chat Ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleTTSPlay = (textToSpeak: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = speechRate;
      
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI'));
      if (viVoice) {
        utterance.voice = viVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("TTS is blocked or unsupported in preview frame:", err);
    }
  };

  const handleStartConversation = () => {
    setHasStarted(true);
    setIsAiSpeaking(true);
    
    const initialText = "Welcome Vy Tran! I am your AI Coach. What specific customer-support scenario or client complaint do you want to collect Vietnamese audio samples for?";
    
    const initialMsg = {
      sender: 'ai',
      text: initialText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatHistory([initialMsg]);
    handleTTSPlay(initialText);

    setTimeout(() => {
      setIsAiSpeaking(false);
    }, 4500);
  };

  const handleProcessMessageSubmit = (messageText: string) => {
    if (!messageText.trim() || isAiSpeaking || isListening || isProcessing) return;

    const userMsg = {
      sender: 'user',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const currentChat = [...chatHistory, userMsg];
    setChatHistory(currentChat);
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      let nextStage: 'greeting' | 'industry' | 'emotion' | 'contributor' | 'volume' | 'proposal' = 'greeting';
      let replyText = '';
      const updatedAnswers = { ...answers };

      if (agentProgressStage === 'greeting') {
        updatedAnswers.scenario = messageText;
        nextStage = 'industry';
        replyText = `The scenario description "${messageText}" is excellent. Next, what core industry sector does this campaign apply to? (e.g., Cosmetics & Beauty, Consumer Electronics, or E-commerce Logistics?)`;
      } else if (agentProgressStage === 'industry') {
        updatedAnswers.industry = messageText;
        nextStage = 'emotion';
        replyText = `Perfect, "${messageText}" is a high-demand sector. To refine the AI customer avatar, what tone or emotional profile should the AI customer exhibit? (e.g., Angry & demanding immediate refund, Anxious about packet delays, or Polished but skeptical?)`;
      } else if (agentProgressStage === 'emotion') {
        updatedAnswers.emotion = messageText;
        nextStage = 'contributor';
        replyText = `The emotional profile "${messageText}" is set. Under what job title should the human contributor (roleplay agent) respond? (e.g., Calm CSR Representative, or Authorized Escalation Manager?)`;
      } else if (agentProgressStage === 'contributor') {
        updatedAnswers.contributor = messageText;
        nextStage = 'volume';
        replyText = `Role "${messageText}" configured. Finally, what is the target payload volume (number of completed dialogues) for this campaign? I recommend 40, 60, or 100 verified conversation runs.`;
      } else if (agentProgressStage === 'volume') {
        updatedAnswers.volume = messageText;
        nextStage = 'proposal';
        replyText = `Spectacular! I have compiled your entries into a customized campaign blueprint. Review the locked metadata form on the right. Tap Validate to launch the secured escrow and broadcast the campaign.`;
      } else {
        const normalized = messageText.toLowerCase();
        if (normalized.includes('modify') || normalized.includes('change') || normalized.includes('adjust') || normalized.includes('not yet') || normalized.includes('no')) {
          replyText = `Understood. Let me know which exact detail from the scenario, role, or scale you would like to revise, and I will update it instantly!`;
        } else if (normalized.includes('confirm') || normalized.includes('approve') || normalized.includes('yes') || normalized.includes('ok') || normalized.includes('activate')) {
          replyText = `Excellent! Initializing escrow funding contract and publishing campaign to contributor queues... Please stand by.`;
          setTimeout(() => {
            handleFinalizeCampaign(updatedAnswers, currentChat);
          }, 1500);
        } else {
          replyText = `I have updated the additional constraints: "${messageText}". The draft campaign is successfully synchronized. Please review the details below and tap Validate to activate.`;
        }
        nextStage = 'proposal';
      }

      setAnswers(updatedAnswers);
      setAgentProgressStage(nextStage);
      setIsAiSpeaking(true);

      const aiMsg = {
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatHistory(prev => [...prev, aiMsg]);
      handleTTSPlay(replyText);

      const speechDelay = Math.max(3000, replyText.length * 40);
      setTimeout(() => {
        setIsAiSpeaking(false);
      }, speechDelay);

    }, 1500);
  };

  const triggerVoiceSpeechSimulation = () => {
    if (isAiSpeaking || isListening || isProcessing) return;
    setIsListening(true);
    setTranscriptDraft("AI VoiceBot is capturing simulated ambient sound elements...");

    setTimeout(() => {
      setIsListening(false);
      setIsProcessing(true);
      setTranscriptDraft("Translating raw waveforms into text payload...");

      setTimeout(() => {
        setIsProcessing(false);
        setTranscriptDraft("");

        let voiceResponse = "";
        if (agentProgressStage === 'greeting') {
          voiceResponse = "Focus on missing livestream giveaways";
        } else if (agentProgressStage === 'industry') {
          voiceResponse = "Cosmetics and health and beauty sector";
        } else if (agentProgressStage === 'emotion') {
          voiceResponse = "Frustrated client demanding immediate escalation";
        } else if (agentProgressStage === 'contributor') {
          voiceResponse = "Patient and empathetic support associate";
        } else if (agentProgressStage === 'volume') {
          voiceResponse = "Targeting 60 diversified speech samples";
        } else {
          voiceResponse = "I agree to validate and deploy this campaign now";
        }

        handleProcessMessageSubmit(voiceResponse);
      }, 1000);
    }, 2500);
  };

  const handleMuteToggle = () => {
    if (voiceEnabled) {
      try { 
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel(); 
        }
      } catch(e){}
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const handleActiveCancelAttempt = () => {
    if (agentProgressStage !== 'proposal' && chatHistory.length > 1) {
      setShowCancelModal(true);
    } else {
      onCancel();
    }
  };

  const handleFinalizeCampaign = (finalAnswers = answers, finalHistory = chatHistory) => {
    try { 
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel(); 
      }
    } catch(e){}
    
    const derivedName = finalAnswers.scenario 
      ? `Vietnamese Campaign: ${finalAnswers.scenario.split(' ').slice(0, 5).join(' ')}...` 
      : `Vietnamese CSR Service Dataset`;
      
    onCreate({
      name: derivedName,
      industry: finalAnswers.industry || "Cosmetics & Aesthetics support",
      context: finalAnswers.scenario || "Khách hàng mua mỹ phẩm qua livestream bị thiếu quà tặng, vô cùng giận dữ.",
      aiCustomerRole: finalAnswers.emotion || "Khách hàng bực bội giận dữ, nghi ngờ uy tín.",
      contributorRole: finalAnswers.contributor || "Chuyên viên chăm sóc khách hàng điềm tĩnh xoa dịu.",
      targetRecordings: finalAnswers.volume.includes('100') ? 100 : finalAnswers.volume.includes('40') ? 40 : 60,
      pricePerRecording: 8000,
      chatHistory: finalHistory
    });
  };

  const targetVol = answers.volume.includes('100') ? 100 : answers.volume.includes('40') ? 40 : 60;
  const escrowBudget = targetVol * 8000;

  return (
    <div id="create-campaign-screen" className="max-w-6xl mx-auto space-y-6 text-left py-4 animate-scaleIn relative font-sans">
      
      {/* Alert Warning Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fadeIn text-white">
          <div className="bg-[#0D0D15] border border-red-500/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle size={24} className="text-red-400 shrink-0" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Cancel campaign creation?</h3>
            </div>
            <p className="text-xs text-[#A8A5B5] leading-relaxed">
              You are ending the dialogue session before completing the setup. All message records will be discarded. Do you wish to leave?
            </p>
            <div className="flex items-center gap-3 justify-end pt-2">
              <Button 
                variant="outline"
                onClick={() => setShowCancelModal(false)}
              >
                Resume session
              </Button>
              <Button 
                variant="rose"
                onClick={() => {
                  setShowCancelModal(false);
                  onCancel();
                }}
              >
                Exit builder
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
        <div className="flex items-center gap-3 text-left">
          <div className="p-2.5 rounded-xl bg-[#0b0c15] text-violet-400 border border-violet-500/20 animate-pulse">
            <Radio size={20} className="text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">AI Campaign Builder</h1>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-extrabold flex items-center gap-1">
                Live Refiner
              </span>
            </div>
            <p className="text-xs text-[#A8A5B5]">AI Assistant guides campaign architecture and scenario definitions</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950/80 border border-white/5 rounded-lg text-xs">
            <Sliders size={12} className="text-violet-400" />
            <span className="text-[#6F6B7E] font-mono">Dialect:</span>
            <select 
              value={vocalAvatar} 
              onChange={(e) => setVocalAvatar(e.target.value)} 
              className="bg-transparent text-white font-semibold font-sans outline-none cursor-pointer border-0 p-0 text-xs focus:ring-0"
            >
              <option value="Mỹ An (Sài Gòn)" className="bg-zinc-950 text-white">Mỹ An (Sài Gòn)</option>
              <option value="Hoàng Đăng (Hà Nội)" className="bg-zinc-950 text-white">Hoàng Đăng (Hà Nội)</option>
              <option value="Vy Oanh (Đà Nẵng)" className="bg-zinc-950 text-white">Vy Oanh (Đà Nẵng)</option>
            </select>
          </div>

          <Button 
            variant="rose"
            size="sm"
            onClick={handleActiveCancelAttempt} 
            className="flex items-center gap-1 font-semibold"
          >
            <Square size={11} className="fill-white" />
            Cancel
          </Button>
        </div>
      </div>

      {!hasStarted ? (
        /* CALL INTERFACE PRE-START */
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#0B0B13] to-zinc-950 border border-white/10 p-8 md:p-12 text-center flex flex-col items-center justify-center min-h-[460px] shadow-2xl">
          <div className="max-w-md space-y-6 relative z-10">
            <div className="w-20 h-20 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto shadow-xl">
              <Headphones size={36} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Scenario Builder Workspace</h2>
              <p className="text-sm text-[#A8A5B5] leading-relaxed">
                Start dialogue to let the AI Coach guide you step-by-step in establishing speech boundaries, scenarios, roles, and target recording size.
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="cyan"
                size="lg"
                onClick={handleStartConversation}
                className="mx-auto flex items-center gap-2 font-bold px-8 py-4 text-base"
              >
                <Play size={14} className="fill-white ml-0.5" />
                Start Dialogue Builder
              </Button>
            </div>

            <div className="flex items-center justify-center gap-6 pt-4 text-[11px] text-[#6F6B7E] font-mono">
              <span className="flex items-center gap-1.5"><Activity size={12} className="text-teal-400" /> Synthesizer Active</span>
              <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-violet-400" /> Speech Engine Ready</span>
            </div>
          </div>
        </div>
      ) : (
        /* CALL INTERFACE ACTIVE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: CHAT VIEW PORT */}
          <div className="lg:col-span-7 bg-[#07070b]/90 border border-white/10 rounded-2xl flex flex-col justify-between min-h-[380px] h-[460px] lg:h-[500px] shadow-2xl relative text-white">
            
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-zinc-950/60 rounded-t-2xl z-10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] text-zinc-300 font-mono uppercase tracking-widest font-extrabold">LIVE STREAMING DIALOGUE LOG</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#6F6B7E]">
                <button 
                  onClick={handleMuteToggle} 
                  className={`p-1 rounded-full border transition-all cursor-pointer ${
                    voiceEnabled ? 'bg-violet-950/40 border-violet-500/20 text-violet-400' : 'bg-zinc-900 border-white/5 text-zinc-500'
                  }`}
                >
                  {voiceEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
                </button>
                <span>Mute / Unmute TTS</span>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
              {chatHistory.map((chat, idx) => (
                <div 
                  key={idx} 
                  className={`flex gap-3 max-w-[85%] animate-fadeIn ${
                    chat.sender === 'user' ? 'ml-auto justify-end text-right' : 'mr-auto justify-start text-left'
                  }`}
                >
                  {chat.sender === 'ai' && (
                    <div className="w-6 h-6 rounded-full bg-violet-950 border border-violet-500/20 flex items-center justify-center shrink-0">
                      <Bot size={13} className="text-violet-400" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[9px] font-mono text-[#6F6B7E] justify-start text-left">
                      <span className={chat.sender === 'ai' ? 'text-violet-400 font-bold' : 'text-cyan-400 font-bold'}>
                        {chat.sender === 'ai' ? 'AI VoiceBot' : 'Vy Tran (Enterprise)'}
                      </span>
                      <span>{chat.timestamp}</span>
                    </div>

                    <div className={`p-3 rounded-2xl text-xs leading-relaxed font-semibold shadow-md text-left ${
                      chat.sender === 'ai' 
                        ? 'bg-zinc-900/90 text-zinc-100 border border-white/5 rounded-tl-none font-sans' 
                        : 'bg-gradient-to-r from-cyan-950 to-indigo-955/80 text-cyan-100 border border-cyan-500/20 rounded-tr-none'
                    }`}>
                      {chat.text}
                    </div>
                  </div>

                  {chat.sender === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/20 flex items-center justify-center shrink-0">
                      <Headphones size={13} className="text-cyan-400" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Keyboard & Microphone bottom Controls */}
            <div className="p-4 border-t border-white/10 bg-zinc-950/80 rounded-b-2xl space-y-4 z-10">
              
              <div className="flex items-center justify-between text-[10px] font-mono border-b border-white/5 pb-2">
                <span className="text-cyan-400 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  AUDIO SPECTRA DEVIATION LOG
                </span>
                <span className="text-violet-400 flex items-center gap-1">
                  <Sparkles size={11} className="animate-pulse" /> Voice synthesis engine active
                </span>
              </div>

              {/* Central Voice trigger */}
              <div className="flex flex-col items-center justify-center py-1">
                <button
                  onClick={triggerVoiceSpeechSimulation}
                  disabled={isAiSpeaking || isListening || isProcessing}
                  className={`relative w-14 h-14 rounded-full border flex items-center justify-center transition-all duration-300 ${
                    isListening 
                      ? 'bg-red-950/70 border-red-500 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse scale-105' 
                      : 'bg-gradient-to-tr from-cyan-950 to-indigo-955/60 border-cyan-500/30 text-cyan-400 hover:border-cyan-400/80 hover:text-cyan-300 hover:scale-105 active:scale-95'
                  } disabled:opacity-30 disabled:pointer-events-none cursor-pointer`}
                  title="Click to simulate spoken dialogue"
                >
                  {isListening && (
                    <span className="absolute inset-0 rounded-full border border-red-500/60 animate-ping opacity-75" />
                  )}
                  <Mic size={20} className={isListening ? 'animate-bounce' : ''} />
                </button>
                <span className="text-[10px] text-[#A8A5B5] font-mono mt-2 font-bold tracking-wider uppercase select-none">
                  {isListening ? "COLLECTING AUDIO..." : isAiSpeaking ? "AI SYNTHESIZING..." : isProcessing ? "PROCESSING RESPONSE..." : "Click Microphone (Simulate) to use voice prompts"}
                </span>
              </div>

              {/* Suggestive Speech presets */}
              {!isAiSpeaking && !isListening && !isProcessing && (
                <div className="space-y-2 mt-1 select-none text-left">
                  <span className="text-[9px] text-[#6F6B7E] font-mono font-bold uppercase tracking-wider block">
                    Choose simulation replies:
                  </span>
                  
                  <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {(() => {
                      let suggestions: string[] = [];
                      if (agentProgressStage === 'greeting') {
                        suggestions = [
                          "Create a scenario for missing livestream giveaways",
                          "Create a scenario for gym membership accidental debit complaint",
                          "Create a scenario for a consumer frustrated with home delivery delays"
                        ];
                      } else if (agentProgressStage === 'industry') {
                        suggestions = [
                          "Apply the Cosmetics and Health & Beauty sector",
                          "Apply consumer electronics and appliance logistics",
                          "Apply fintech consumer credit microloans and wallets"
                        ];
                      } else if (agentProgressStage === 'emotion') {
                        suggestions = [
                          "Client is extremely angry and skeptical about store brand reputation",
                          "Client is highly anxious and worried about data protection issues",
                          "Client is polite but persistent and insists on speaking to a manager"
                        ];
                      } else if (agentProgressStage === 'contributor') {
                        suggestions = [
                          "Agent is polite, listens attentively, and prepares a voucher payout",
                          "Agent is matter-of-fact and walks the user through a technical fix",
                          "Agent is highly empathetic and initiates a free item replacement order"
                        ];
                      } else if (agentProgressStage === 'volume') {
                        suggestions = [
                          "Set a target scale of 60 accepted recordings",
                          "Set the standard budget of 40 completed voice samples",
                          "Deploy the enterprise-tier of 100 conversational tracks"
                        ];
                      } else if (agentProgressStage === 'proposal') {
                        suggestions = [
                          "I approve and authorize escrow deployment!",
                          "Hold, I would like to revise selected details"
                        ];
                      }
                      
                      return suggestions.map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (isAiSpeaking || isListening || isProcessing) return;
                            setIsListening(true);
                            setTranscriptDraft(`Selecting preset: "${sug}"`);
                            
                            setTimeout(() => {
                              setIsListening(false);
                              setIsProcessing(true);
                              setTranscriptDraft("Processing wave speech tokens...");
                              
                              setTimeout(() => {
                                setIsProcessing(false);
                                setTranscriptDraft("");
                                handleProcessMessageSubmit(sug);
                              }, 1100);
                            }, 1800);
                          }}
                          className="w-full text-left p-2 px-3 rounded-full bg-[#0d0e1b] hover:bg-cyan-950/35 border border-white/5 hover:border-cyan-500/30 text-[10.5px] text-[#A8A5B5] hover:text-cyan-300 font-semibold transition-all duration-200 cursor-pointer flex items-start gap-1.5 leading-relaxed"
                        >
                          <span className="text-cyan-400 shrink-0 font-bold">&gt;</span>
                          <span className="line-clamp-1">"{sug}"</span>
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {transcriptDraft && (
                <div className="p-2.5 bg-cyan-950/40 border border-cyan-500/20 text-[11px] text-cyan-300 font-mono text-center rounded-lg animate-scaleIn font-semibold">
                  {transcriptDraft}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: LIVE BLUEPRINT & STATUS */}
          <div className="lg:col-span-5 space-y-5 text-white">
            
            <Card className="p-5 flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden min-h-[280px]">
              <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest block font-black border-b border-cyan-500/10 pb-1.5 w-full relative z-10">
                AI VOICE PROFILE SPECTRA
              </span>
              <AIAvatar 
                state={
                  isAiSpeaking 
                    ? 'Speaking' 
                    : isListening 
                      ? 'Listening' 
                      : isProcessing 
                        ? 'Thinking' 
                        : 'Idle'
                } 
                size={140} 
              />
            </Card>

            {/* Campaign blueprint specifications state */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest">
                  Campaign Blueprint Parameters
                </span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/5 text-[9px] text-zinc-400 uppercase font-mono">
                  {agentProgressStage.toUpperCase()}
                </span>
              </div>

              <div className="space-y-3.5 text-xs text-left">
                <div>
                  <span className="text-[9px] text-[#6F6B7E] font-mono block uppercase">Dialogue Scenario:</span>
                  <div className="p-2.5 bg-zinc-950/60 border border-white/5 rounded-lg text-zinc-100 mt-1 min-h-[46px] leading-relaxed font-sans font-semibold">
                    {answers.scenario ? answers.scenario : (
                      <span className="text-[#6F6B7E] text-[11px] font-normal">Awaiting conversation transcript guidelines...</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[9px] text-[#6F6B7E] font-mono block uppercase">Industry sector:</span>
                    <span className="text-white mt-0.5 font-bold block min-h-[16px]">
                      {answers.industry || <span className="text-[#6F6B7E] text-[10px] font-normal italic">Pending...</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#6F6B7E] font-mono block uppercase">AI Customer Persona:</span>
                    <span className="text-violet-300 mt-0.5 font-bold block min-h-[16px]">
                      {answers.emotion || <span className="text-[#6F6B7E] text-[10px] font-normal italic">Pending...</span>}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  <div>
                    <span className="text-[9px] text-[#6F6B7E] font-mono block uppercase">Contributor Role:</span>
                    <span className="text-cyan-300 mt-0.5 font-bold block min-h-[16px]">
                      {answers.contributor || <span className="text-[#6F6B7E] text-[10px] font-normal italic">Pending...</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#6F6B7E] font-mono block uppercase">Campaign Target Scale:</span>
                    <span className="text-white mt-0.5 font-extrabold block min-h-[16px]">
                      {answers.volume ? `${targetVol} accepted recordings` : <span className="text-[#6F6B7E] text-[10px] font-normal italic">Pending...</span>}
                    </span>
                  </div>
                </div>

                {/* Secure Budget Estimate Calculator */}
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-[#6F6B7E]">
                    <span>RECOMMENDED PAYOUT / RECORDING:</span>
                    <span className="text-white font-bold">8,000 VND</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-[#6F6B7E]">
                    <span>PROPOSED SECURED ESCROW BUDGET:</span>
                    <span className="text-teal-400 font-extrabold">
                      {answers.volume ? `${escrowBudget.toLocaleString()} VND` : "Calculating..."}
                    </span>
                  </div>
                </div>

                {/* Validation Proposal Button trigger */}
                {agentProgressStage === 'proposal' && (
                  <div className="p-3 bg-teal-950/20 border border-teal-500/20 rounded-xl space-y-3.5 animate-fadeIn mt-4 text-left">
                    <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-widest block border-b border-teal-500/10 pb-1">
                      VALIDATE CAMPAIGN BLUEPRINT
                    </span>
                    <div className="space-y-2 text-[11.5px] leading-relaxed">
                      <div>
                        <label className="text-[#6F6B7E] font-mono block text-[8.5px] uppercase font-bold">Proposed Campaign Title:</label>
                        <input 
                          type="text" 
                          value={answers.scenario ? `Vietnamese CS: ${answers.scenario.split(' ').slice(0, 4).join(' ')}...` : 'Livestream Gift Complaint Dataset'}
                          disabled
                          className="w-full bg-zinc-950/80 border border-white/5 text-white/95 p-1.5 rounded text-[11px] mt-0.5 focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-[#A8A5B5]">
                        Click below to finalize project details, deploy the secure funds, and publish the campaign workspace to contributors immediately.
                      </p>
                    </div>

                    <div className="space-y-2 pt-1 font-sans">
                      <Button
                        variant="cyan"
                        className="w-full font-bold"
                        onClick={() => handleFinalizeCampaign()}
                      >
                        Activate Campaign & Secure Escrow
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          const userRefuseMsg = "I would like to modify selected details or change options.";
                          handleProcessMessageSubmit(userRefuseMsg);
                        }}
                      >
                        Let's modify options
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

          </div>

        </div>
      )}

    </div>
  );
}
export default CampaignBuilderPage;
