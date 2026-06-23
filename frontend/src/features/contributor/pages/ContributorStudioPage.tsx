import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Headphones, CheckCircle2, MessageSquare, AudioLines, Loader2, Mic, Square, CheckCircle, RefreshCw, Send, X } from 'lucide-react';
import { Campaign, AppView } from '../../../shared/types';
import { AIAvatar } from '../../../components/voice/AIAvatar';

interface ContributorStudioPageProps {
  campaign: Campaign;
  onFinish: (recDuration: string) => void;
  onToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function ContributorStudioPage({ campaign, onFinish, onToast }: ContributorStudioPageProps) {
  const [aiState, setAiState] = useState<'Idle' | 'Speaking' | 'Listening' | 'Thinking' | 'Waiting'>('Idle');
  const [currentTurn, setCurrentTurn] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [hasRecordedTurn, setHasRecordedTurn] = useState(false);
  const [isCheckingAudio, setIsCheckingAudio] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ role: 'AI' | 'You', text: string }>>([]);
  const [showHistorySidebar, setShowHistorySidebar] = useState(true);

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const aiDialogueLines = [
    "Tôi mua trong live vì thấy nói có quà tặng mini, giờ nhận hàng lại không có. Bên bạn làm ăn thế à, có phải lừa khách không?",
    "Tôi không muốn chờ xử lý nữa! Nếu không có quà thì làm ơn hoàn lại tiền hàng cho tôi tương ứng đi. Shop lớn mà làm việc thiếu uy tín quá!"
  ];

  // Auto scroll transcript to bottom
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, isCheckingAudio]);

  // Initialize the first AI Customer lines
  useEffect(() => {
    setAiState('Speaking');
    const timer = setTimeout(() => {
      setTranscript([{ role: 'AI', text: aiDialogueLines[0] }]);
      setAiState('Listening');
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  // Timer simulation for active vocal notes
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartRecording = () => {
    setRecordingSeconds(0);
    setIsRecording(true);
    setAiState('Waiting');
    onToast("Microphone connected. Recording environment active...", "info");
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsCheckingAudio(true);
    setAiState('Thinking');

    // Simulate automated quick audio QA checks
    setTimeout(() => {
      setIsCheckingAudio(false);
      setHasRecordedTurn(true);
      setAiState('Idle');
      onToast("Acoustic frequency analysis completed. Optimal spectrum verified.", "success");
    }, 1400);
  };

  const handleSendResponse = () => {
    if (!hasRecordedTurn) return;

    const contributorResponses = [
      "Chào chị ạ, em rất tiếc về sự cố này. Mong chị thông cảm, em sẽ kiểm tra vận đơn livestream để kích hoạt gửi bù quà ngay cho chị ạ.",
      "Dạ thưa chị, bên em hoàn toàn thấu hiểu bức xúc của chị. Em xin phép hoàn voucher bù đắp giá trị quà tặng hoặc gửi bù ngay ngày mai kèm thư xin lỗi ạ."
    ];

    const currentContributorResponseIndex = currentTurn - 1;
    const contributorText = contributorResponses[currentContributorResponseIndex] || "Dạ vâng, bên em sẽ hỗ trợ ngay cho chị ạ.";

    const updatedTranscript = [...transcript, { role: 'You' as const, text: contributorText }];
    setTranscript(updatedTranscript);
    setHasRecordedTurn(false);
    
    if (currentTurn < 2) {
      setAiState('Thinking');
      setTimeout(() => {
        setAiState('Speaking');
        setTimeout(() => {
          setTranscript([...updatedTranscript, { role: 'AI', text: aiDialogueLines[1] }]);
          setCurrentTurn(2);
          setAiState('Listening');
        }, 2200);
      }, 1400);
    } else {
      setAiState('Idle');
      onToast("Dialogue sequence completed. All tracks captured successfully.", "success");
    }
  };

  const handleRecordAgain = () => {
    setHasRecordedTurn(false);
    setRecordingSeconds(0);
    onToast("Discarded current track. Ready for new retake.", "info");
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getLatestDialogue = () => {
    if (isRecording) {
      return { text: "RECORDING LIVE... please respond naturally in Vietnamese according to the prompt constraints.", isUser: true, active: true };
    }
    if (isCheckingAudio) {
      return { text: "SPECTRUM EVALUATION SEQUENCE... please hold sound level", isUser: false, active: true };
    }
    if (hasRecordedTurn) {
      return { text: "TRACK CAPTURED. Tap 'Send Response' button below to dispatch dialogue frames.", isUser: true, active: false };
    }
    
    if (transcript.length === 0) {
      return { text: "Establishing secure acoustic channel stream...", isUser: false, active: false };
    }

    const latest = transcript[transcript.length - 1];
    return {
      text: latest.text,
      isUser: latest.role === 'You',
      active: true
    };
  };

  const subtitle = getLatestDialogue();

  return (
    <div id="contributor-studio-screen" className="relative text-white min-h-[460px] lg:min-h-[520px] rounded-3xl bg-[#030307] border border-white/8 shadow-2xl flex flex-col justify-between overflow-hidden p-6 animate-fadeIn font-sans">
      {/* Laser backgrounds */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-cyber-grid opacity-5 pointer-events-none" />

      {/* 1. Cinematic Header Banner */}
      <div className="relative z-10 flex items-center justify-between gap-4 border-b border-white/5 pb-4 text-left bg-transparent">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-violet-950/40 border border-violet-500/20 items-center justify-center text-violet-300">
            <Headphones size={18} className="animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-violet-400 font-mono font-bold tracking-widest uppercase bg-violet-400/5 px-2 py-0.5 rounded border border-violet-500/15">
                Professional Recording Studio
              </span>
              <span className="text-[10px] text-[#A8A5B5] font-mono">ID: #{campaign.id}</span>
            </div>
            <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight pt-0.5">{campaign.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Turn count feedback */}
          <div className="flex items-center gap-2 bg-zinc-950/85 border border-white/5 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-[#A8A5B5] font-mono">Turn:</span>
            <span className="text-violet-400 font-bold font-mono text-sm">{currentTurn}</span>
            <span className="text-zinc-650 font-mono text-[10px]">/ 2 max</span>
          </div>

          <button
            id="btn-finish-conversation"
            onClick={() => onFinish("1m 15s")}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-full shadow-lg transition-all cursor-pointer flex items-center gap-1 border border-emerald-500/40 hover:shadow-emerald-500/10 select-none font-sans"
          >
            <CheckCircle2 size={13} />
            Submit Dialogue Track
          </button>
        </div>
      </div>

      {/* 2. Main Studio Stage */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 items-stretch">
        
        {/* CENTER stage: Holographic AI Avatar & subtitle tracker (8 cols) */}
        <div className="lg:col-span-8 bg-zinc-950/20 border border-white/5 rounded-2xl p-6 flex flex-col justify-between items-center relative overflow-hidden min-h-[320px] lg:min-h-[380px]">
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/50 backdrop-blur-md border border-white/5 text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[#A8A5B5]">CUSTOMER PROFILE:</span>
            <span className="text-amber-400 font-bold">Angry Livestream Buyer</span>
          </div>

          {/* Toggle Transcript */}
          <button
            onClick={() => setShowHistorySidebar(!showHistorySidebar)}
            className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full bg-zinc-900/50 backdrop-blur-md border border-white/5 text-[11px] hover:text-white text-[#A8A5B5] transition-all flex items-center gap-1 cursor-pointer select-none"
          >
            <MessageSquare size={12} />
            <span>{showHistorySidebar ? 'Collapse panel' : 'Dialogue Log (Full Transcript)'}</span>
          </button>

          {/* AI Avatar Frame */}
          <div className="flex-1 flex items-center justify-center w-full py-4 relative bg-transparent">
            <div className="absolute inset-0 bg-radial-gradient from-[#1a103c]/20 via-transparent to-transparent opacity-60 pointer-events-none" />
            <AIAvatar state={aiState} size={250} />
          </div>

          {/* Live Subtitle HUD */}
          <div className="w-full max-w-2xl bg-zinc-950/75 backdrop-blur-md border border-white/8 p-4.5 rounded-2xl shadow-2xl relative text-left">
            <div className="absolute -top-2 left-6 px-2 py-0.5 rounded bg-zinc-950 border border-white/10 text-[8.5px] font-mono text-[#6F6B7E] uppercase tracking-widest font-bold">
              Real-time Transcript Feed (Subtitle stream)
            </div>
            
            <div className="flex gap-3 text-left items-start bg-transparent pt-1">
              {subtitle.isUser ? (
                <div className="w-7 h-7 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold font-mono">
                  YOU
                </div>
              ) : (
                <div className="w-7 h-7 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold font-mono">
                  CUST
                </div>
              )}
              
              <p className={`text-xs leading-relaxed flex-1 ${
                subtitle.isUser 
                  ? 'text-teal-200 font-semibold' 
                  : 'text-violet-100 font-medium'
              }`}>
                {subtitle.text}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: Conversational Log (4 cols) */}
        {showHistorySidebar && (
          <div className="lg:col-span-4 bg-[#07070C]/80 border border-white/5 rounded-2xl p-4.5 flex flex-col justify-between space-y-4 max-h-[500px] lg:max-h-none overflow-hidden backdrop-blur-md animate-slideRight">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <span className="text-[10px] text-[#A8A5B5] font-mono uppercase tracking-widest flex items-center gap-1.5 font-bold">
                <AudioLines size={12} className="text-violet-400" />
                <span>SOUNDBOARD TRANSCRIPT</span>
              </span>
              <span className="px-2 py-0.5 bg-zinc-950 rounded border border-white/5 text-[9px] text-[#6F6B7E] font-mono font-semibold">
                Acoustic Stream Active
              </span>
            </div>

            {/* Custom conversational chats */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 text-xs text-left max-h-[280px] lg:max-h-[350px]">
              {transcript.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-550 gap-2">
                  <Loader2 size={18} className="animate-spin text-[#8B5CF6]" />
                  <p className="text-[10.5px] font-mono">Initializing secure studio environment and audio nodes...</p>
                </div>
              ) : (
                transcript.map((line, index) => (
                  <div
                    key={index}
                    className={`flex flex-col space-y-1 ${
                      line.role === 'AI' ? 'items-start' : 'items-end'
                    } animate-fadeIn`}
                  >
                    <span className="text-[8.5px] font-mono text-[#6F6B7E] px-1 font-bold">
                      {line.role === 'AI' ? 'AI CUSTOMER' : 'YOU (CONTRIBUTOR)'}
                    </span>
                    
                    <div className={`p-3 rounded-2xl leading-relaxed max-w-[90%] font-medium ${
                      line.role === 'AI'
                        ? 'bg-violet-950/20 text-violet-100 rounded-tl-sm border border-violet-500/10'
                        : 'bg-teal-950/20 text-[#A2E2DF] rounded-tr-sm border border-teal-500/10 font-semibold'
                    }`}>
                      {line.text}
                    </div>
                  </div>
                ))
              )}

              {isCheckingAudio && (
                <div className="flex items-center gap-2 text-[10px] text-amber-300 italic font-mono bg-amber-500/5 p-2 rounded-lg border border-amber-500/15">
                  <Loader2 className="animate-spin" size={10} />
                  Acoustics module analyzing audio frequency constraints...
                </div>
              )}
              
              <div ref={transcriptEndRef} />
            </div>

            {/* Suggestions Prompter */}
            <div className="bg-zinc-950/60 rounded-xl p-3 border border-white/5 text-left space-y-1.5">
              <span className="text-[9px] text-[#6F6B7E] font-mono uppercase tracking-widest block font-bold">
                Dialogue Prompter Guide
              </span>
              <div className="flex flex-col gap-1 text-[10.5px] text-[#A8A5B5] leading-relaxed">
                <span className="px-2.5 py-1.5 rounded bg-[#030307] border border-white/5 font-mono text-[9.5px] block text-white font-semibold">
                  {currentTurn === 1 
                    ? "Explain the mini-gift stream logistics issue and promise immediate dispatch." 
                    : "Offer full gift value refund vouchers or priority express re-ship tomorrow."}
                </span>
                <span className="text-[9px] italic text-[#6F6B7E]">
                  * Please speak naturally in natural Vietnamese. Maintain comfortable pacing.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Floating Controller Glassmorphism bar at bottom */}
      <div className="relative z-10 bg-zinc-950/70 backdrop-blur-xl border border-white/8 rounded-2xl py-4.5 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-3xl text-left bg-transparent">
        <div className="flex items-center gap-4 w-full sm:w-auto text-left bg-transparent">
          
          {/* Main Micro recording triggers */}
          {!isRecording && !hasRecordedTurn ? (
            <button
              id="btn-start-record"
              disabled={isCheckingAudio || aiState === 'Speaking' || aiState === 'Thinking'}
              onClick={handleStartRecording}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all relative group shrink-0 ${
                aiState === 'Speaking' || aiState === 'Thinking'
                  ? 'bg-zinc-900 border-zinc-800 cursor-not-allowed text-zinc-650'
                  : 'bg-gradient-to-tr from-rose-600 to-rose-500 border border-rose-400/30 hover:from-rose-500 hover:to-rose-450 hover:scale-105 active:scale-95 shadow-rose-500/10 cursor-pointer'
              }`}
            >
              <span className="absolute inset-0 rounded-full bg-rose-500/10 group-hover:animate-ping pointer-events-none" />
              <Mic size={18} className="relative z-10" />
            </button>
          ) : isRecording ? (
            <button
              id="btn-stop-record"
              onClick={handleStopRecording}
              className="w-14 h-14 rounded-full bg-white border-2 border-rose-500 flex items-center justify-center text-[#ef4444] shadow-3xl hover:scale-105 active:scale-95 transition-all cursor-pointer relative shrink-0"
            >
              <span className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
              <Square size={14} fill="currentColor" stroke="none" className="relative z-10 animate-pulse" />
            </button>
          ) : (
            <div className="w-14 h-14 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-[#2cd4bf] shadow-md shrink-0 animate-pulse">
              <CheckCircle size={18} />
            </div>
          )}

          {/* LED Signal and text feedbacks */}
          <div>
            <span className="text-[10px] text-[#A8A5B5] font-mono tracking-wider block uppercase font-bold text-left">
              {isRecording ? 'Capturing audio input...' : hasRecordedTurn ? 'Speech chunk recorded' : 'Awaiting next speaker turn'}
            </span>
            <div className="flex items-center gap-2 pt-0.5 bg-transparent justify-start">
              <h4 className="text-xs sm:text-xs font-bold text-white leading-none">
                {isRecording ? 'Encoding vocal waveforms...' : hasRecordedTurn ? 'Acoustic spectrum verified clean' : 'Tap microphone button to respond'}
              </h4>
              <span className="text-zinc-650">•</span>
              <span className="text-xs font-mono font-bold text-violet-400 bg-violet-400/5 px-2 py-0.5 rounded border border-violet-500/10 shrink-0">
                {formatTimer(recordingSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time reactive Audio bar */}
        {isRecording && (
          <div className="hidden md:flex flex-1 max-w-[180px] h-8 bg-zinc-950/40 rounded-xl px-3 border border-white/5 items-center justify-around gap-1 overflow-hidden mx-4">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [4, Math.random() * 20 + 4, 4] }}
                transition={{ duration: 0.3 + Math.random() * 0.25, repeat: Infinity, ease: 'easeOut' }}
                className="w-1.5 bg-[#8B5CF6] rounded-full"
                style={{ height: 4 }}
              />
            ))}
          </div>
        )}

        {/* Interactive action submit and retakes */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end bg-transparent">
          {hasRecordedTurn && (
            <div className="flex items-center gap-2 justify-end w-full sm:w-auto animate-scaleIn bg-transparent">
              <button
                id="btn-record-again"
                onClick={handleRecordAgain}
                className="px-3.5 py-2 hover:bg-white/5 border border-white/8 hover:text-white text-xs font-semibold text-[#A8A5B5] rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={12} />
                <span>Retake</span>
              </button>
              
              <button
                id="btn-send-response"
                onClick={handleSendResponse}
                className="px-4.5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-full text-xs font-bold shadow-lg hover:shadow-violet-500/15 transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer font-sans"
              >
                <Send size={11} />
                <span>Send Response</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default ContributorStudioPage;
