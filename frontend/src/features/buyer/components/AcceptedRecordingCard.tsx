import React, { useState } from 'react';
import { Play, Pause, ChevronDown, ChevronUp, CheckCircle, Volume2, ShieldCheck, Tag, Info } from 'lucide-react';
import { Recording } from '../../../shared/types';
import { formatMoneyVND } from '../../../shared/formatters';

interface AcceptedRecordingCardProps {
  recording: Recording;
  index: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  key?: React.Key;
}

export function AcceptedRecordingCard({ recording, index, isPlaying, onTogglePlay }: AcceptedRecordingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const cleanId = recording.id.replace(/[^0-9]/g, '') || (index + 1).toString();
  const fileName = `rec-acc-${cleanId}.wav`;

  // Generate mock conversation dialogue if transcript is empty
  const dialogueTurns = [
    { role: 'customer', text: 'Chào em, shop mình bán hàng kiểu gì vậy? Live bảo tặng son mini mà anh nhận có thấy gì đâu?' },
    { role: 'agent', text: 'Dạ shop xin lỗi anh nhiều ạ. Anh cho em xin số điện thoại mua hàng để em kiểm tra xem nhân viên gói thiếu hay đơn mình chưa đủ điều kiện nhận quà nha anh.' },
    { role: 'customer', text: 'Thôi thôi, đừng lý do! Rõ ràng trên live hứa cứ chốt đơn mỹ phẩm là có quà. Bây giờ giao thiếu là lừa đảo rồi!' },
    { role: 'agent', text: 'Dạ em hiểu bực bội của mình ạ. Em vừa kiểm tra thấy đúng là đơn của mình bị thiếu quà tặng. Shop cam kết sẽ gửi bù quà hoàn toàn miễn phí ngay trong hôm nay kèm voucher giảm giá 20k bồi thường được không anh?' },
    { role: 'customer', text: 'Gửi bù thật đấy nhé? Không lại mất thời gian của tôi.' }
  ];

  return (
    <div className="bg-[#0B0B12]/90 border border-white/5 rounded-xl p-4 space-y-4 hover:border-cyan-500/20 transition-all text-left">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/2 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Volume2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white">{fileName}</span>
              <span className="px-1.5 py-0.5 text-[8px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded uppercase font-bold">
                Accepted
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5">Contributor: {recording.contributorName}</p>
          </div>
        </div>

        {/* Play & Detail Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onTogglePlay}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer select-none ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/5'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause size={12} className="fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={12} className="fill-current" />
                <span>Play audio</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-lg text-xs text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
          >
            <span>View details</span>
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Row details */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10.5px] text-zinc-500 font-mono">
        <span>Duration: <b className="text-zinc-300">{recording.duration}</b></span>
        <span>Reward: <b className="text-teal-400">{formatMoneyVND(recording.rewardAmount)}</b></span>
        <span>Submitted: <b className="text-zinc-400">{recording.recordedTime}</b></span>
      </div>

      {/* Audio player simulator bar when playing */}
      {isPlaying && (
        <div className="p-3 bg-zinc-950/80 rounded-lg border border-cyan-500/10 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono text-cyan-400">0:12 / {recording.duration}</span>
            <div className="flex-1 flex items-end gap-0.5 h-6 overflow-hidden">
              {Array.from({ length: 32 }).map((_, i) => (
                <span
                  key={i}
                  className="flex-1 bg-cyan-500/70 rounded-full animate-pulse"
                  style={{
                    height: `${Math.floor(Math.random() * 20) + 4}px`,
                    animationDelay: `${i * 45}ms`
                  }}
                />
              ))}
            </div>
            <span className="text-[9px] font-mono text-zinc-500 uppercase">Streaming PCM</span>
          </div>
        </div>
      )}

      {/* Expanded details section */}
      {isExpanded && (
        <div className="pt-3 border-t border-white/5 space-y-4 text-xs animate-fadeIn">
          {/* Quality check indicators */}
          <div>
            <span className="text-[9px] font-mono text-[#6F6B7E] uppercase block font-bold mb-1.5">
              Quality Verifications
            </span>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-bold flex items-center gap-1 select-none">
                <CheckCircle size={10} /> Voice detected
              </span>
              <span className="px-2 py-1 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-bold flex items-center gap-1 select-none">
                <CheckCircle size={10} /> Volume OK
              </span>
              <span className="px-2 py-1 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-bold flex items-center gap-1 select-none">
                <CheckCircle size={10} /> Silence OK
              </span>
              <span className="px-2 py-1 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-bold flex items-center gap-1 select-none">
                <CheckCircle size={10} /> Duration OK
              </span>
            </div>
          </div>

          {/* Context brief / Dialogue summary */}
          <div>
            <span className="text-[9px] font-mono text-[#6F6B7E] uppercase block font-bold mb-1">
              Conversation Summary
            </span>
            <p className="text-zinc-300 leading-relaxed italic bg-white/2 p-2.5 rounded border border-white/5">
              "{recording.contextSnapshot}"
            </p>
          </div>

          {/* Structural labeling tags */}
          <div>
            <span className="text-[9px] font-mono text-[#6F6B7E] uppercase block font-bold mb-1.5">
              Dataset Metadata Labels
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono bg-zinc-950/60 p-3 rounded-lg border border-white/5">
              <div>
                <span className="text-zinc-500">campaignId:</span> <span className="text-cyan-400 font-bold">{recording.campaignId}</span>
              </div>
              <div>
                <span className="text-zinc-500">recordingId:</span> <span className="text-white">{recording.id}</span>
              </div>
              <div>
                <span className="text-zinc-500">role:</span> <span className="text-zinc-300">contributor support agent</span>
              </div>
              <div>
                <span className="text-zinc-500">scenario:</span> <span className="text-zinc-300">livestream_gift_complaint</span>
              </div>
              <div>
                <span className="text-zinc-500">aiCustomerPersona:</span> <span className="text-zinc-300">angry_customer_disappointed</span>
              </div>
              <div>
                <span className="text-zinc-500">sentiment/intent:</span> <span className="text-amber-400 font-bold">Frustrated / Refund Demanded</span>
              </div>
            </div>
          </div>

          {/* Collapsible dialogue panel */}
          <div className="space-y-2">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="w-full text-center py-2 bg-zinc-900 hover:bg-zinc-850 border border-white/5 text-[11px] font-bold text-zinc-300 hover:text-white rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 select-none"
            >
              <span>{showTranscript ? 'Hide conversation preview' : 'Show conversation preview'}</span>
              {showTranscript ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showTranscript && (
              <div className="bg-zinc-950 p-4 rounded-xl border border-white/5 space-y-3.5 max-h-[220px] overflow-y-auto">
                {dialogueTurns.map((turn, tIdx) => (
                  <div key={tIdx} className={`flex flex-col ${turn.role === 'customer' ? 'items-start' : 'items-end'}`}>
                    <span className="text-[9px] font-mono text-[#6F6B7E] uppercase mb-0.5">
                      {turn.role === 'customer' ? 'Customer (AI virtual bot)' : 'Agent (Human contributor)'}
                    </span>
                    <p className={`p-2.5 rounded-lg max-w-[85%] text-[11.5px] leading-relaxed ${
                      turn.role === 'customer'
                        ? 'bg-rose-950/20 text-rose-200 border border-rose-500/10 text-left'
                        : 'bg-cyan-950/20 text-cyan-200 border border-cyan-500/10 text-left'
                    }`}>
                      {turn.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
