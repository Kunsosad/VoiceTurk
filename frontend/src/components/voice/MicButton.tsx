import React from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff } from 'lucide-react';

interface MicButtonProps {
  isRecording: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function MicButton({ isRecording, onClick, disabled = false }: MicButtonProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* Pulsing visual outer rings under active captures */}
        {isRecording && (
          <>
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-rose-500/20"
            />
            <motion.div
              animate={{ scale: [1, 1.8, 1], opacity: [0.2, 0, 0.2] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
              className="absolute inset-0 rounded-full bg-rose-500/10"
            />
          </>
        )}

        <button
          onClick={onClick}
          disabled={disabled}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 border shadow-xl relative z-10 ${
            isRecording
              ? 'bg-rose-600 hover:bg-rose-500 border-rose-500/50 text-white'
              : 'bg-zinc-900 hover:bg-zinc-800 border-white/10 text-zinc-300 hover:text-white'
          } disabled:bg-zinc-950 disabled:text-zinc-650 disabled:border-white/5 disabled:scale-100 disabled:cursor-not-allowed`}
        >
          {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
      </div>
      
      <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-500">
        {isRecording ? 'Đang thu âm...' : 'Nhấp để ghi âm'}
      </span>
    </div>
  );
}
export default MicButton;
