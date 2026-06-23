import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface AIAvatarProps {
  state: 'Idle' | 'Speaking' | 'Listening' | 'Thinking' | 'Waiting';
  size?: number;
}

export function AIAvatar({ state, size = 260 }: AIAvatarProps) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    let blinkTimeout: any;
    const triggerBlink = () => {
      setIsBlinking(true);
      blinkTimeout = setTimeout(() => {
        setIsBlinking(false);
        const nextBlinkTime = 3000 + Math.random() * 4000;
        scheduleNextBlink(nextBlinkTime);
      }, 150);
    };

    const scheduleNextBlink = (delay: number) => {
      blinkTimeout = setTimeout(triggerBlink, delay);
    };

    scheduleNextBlink(4000);

    return () => {
      clearTimeout(blinkTimeout);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    setTilt({
      x: x * 20,
      y: -y * 20,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const getGlowStyle = () => {
    switch (state) {
      case 'Speaking':
        return {
          boxShadow: '0 15px 50px rgba(139, 92, 246, 0.45), inset 0 0 30px rgba(139, 92, 246, 0.4), 0 0 20px rgba(139, 92, 246, 0.25)',
          borderColor: 'rgba(167, 139, 250, 0.75)',
          background: 'radial-gradient(circle at 50% 30%, rgba(20, 15, 45, 0.98) 0%, rgba(6, 4, 15, 0.99) 100%)',
        };
      case 'Listening':
        return {
          boxShadow: '0 15px 45px rgba(45, 212, 191, 0.4), inset 0 0 25px rgba(45, 212, 191, 0.35), 0 0 15px rgba(45, 212, 191, 0.15)',
          borderColor: 'rgba(45, 212, 191, 0.75)',
          background: 'radial-gradient(circle at 50% 30%, rgba(8, 30, 30, 0.98) 0%, rgba(3, 10, 14, 0.99) 100%)',
        };
      case 'Thinking':
        return {
          boxShadow: '0 15px 50px rgba(245, 158, 11, 0.35), inset 0 0 25px rgba(245, 158, 11, 0.3), 0 0 15px rgba(245, 158, 11, 0.1)',
          borderColor: 'rgba(251, 191, 36, 0.65)',
          background: 'radial-gradient(circle at 50% 30%, rgba(33, 22, 12, 0.98) 0%, rgba(10, 6, 4, 0.99) 100%)',
        };
      case 'Waiting':
        return {
          boxShadow: '0 10px 30px rgba(251, 191, 36, 0.25), inset 0 0 20px rgba(251, 191, 36, 0.18)',
          borderColor: 'rgba(251, 191, 36, 0.45)',
          background: 'radial-gradient(circle at 50% 30%, rgba(28, 22, 10, 0.98) 0%, rgba(8, 6, 2, 0.99) 100%)',
        };
      case 'Idle':
      default:
        return {
          boxShadow: '0 15px 40px rgba(139, 92, 246, 0.2), inset 0 0 20px rgba(139, 92, 246, 0.1), 0 0 20px rgba(14, 124, 134, 0.1)',
          borderColor: 'rgba(255, 255, 255, 0.12)',
          background: 'radial-gradient(circle at 50% 30%, rgba(12, 12, 22, 0.98) 0%, rgba(3, 3, 7, 0.99) 100%)',
        };
    }
  };

  const getStatusText = () => {
    switch (state) {
      case 'Speaking':
        return 'KHÁCH HÀNG AI ĐANG PHÁT BIỂU';
      case 'Listening':
        return 'ĐANG LẮNG NGHE PHẢN HỒI...';
      case 'Thinking':
        return 'ĐANG SUY NGHĨ...';
      case 'Waiting':
        return 'ĐANG CHỜ GHI ÂM';
      case 'Idle':
      default:
        return 'RẢNH RỖI';
    }
  };

  return (
    <div 
      id="ai-avatar-container" 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="flex flex-col items-center justify-center relative select-none p-6 transition-all duration-300"
      style={{
        perspective: 1000,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none scale-105">
        <motion.div 
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute w-[360px] h-[360px] rounded-full border border-dashed border-white/5 opacity-50 flex items-center justify-center"
          style={{ transform: 'perspective(500px) rotateX(68deg) translateZ(-40px)' }}
        >
          <div className="w-[310px] h-[310px] rounded-full border-2 border-white/5 flex items-center justify-center">
            <div className="w-[220px] h-[220px] rounded-full border border-dashed border-cyan-500/10" />
          </div>
        </motion.div>

        <motion.div 
          animate={{ rotate: [360, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute w-[330px] h-[330px] rounded-full opacity-35"
          style={{ transform: 'perspective(500px) rotateX(68deg) translateZ(-20px)' }}
        >
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-cyan-400" />
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-cyan-400" />
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-cyan-400" />
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-cyan-400" />
        </motion.div>
      </div>

      <div className="absolute -bottom-10 w-[240px] h-10 bg-radial-gradient from-violet-500/15 via-transparent to-transparent opacity-60 rounded-full blur-xl pointer-events-none" />

      {state === 'Speaking' && (
        <motion.div
          animate={{ scale: [1.12, 1.48, 1.12], opacity: [0.18, 0.01, 0.18] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute rounded-full border-2 border-violet-500/25"
          style={{ 
            width: size + 110, 
            height: size + 110,
            transform: `rotateX(${tilt.y * 0.4}deg) rotateY(${tilt.x * 0.4}deg)`,
          }}
        />
      )}

      {(state === 'Speaking' || state === 'Listening') && (
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.35, 0.02, 0.35] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'circOut' }}
          className={`absolute rounded-full border-2 ${state === 'Speaking' ? 'border-violet-500/35' : 'border-teal-400/35'}`}
          style={{ 
            width: size + 60, 
            height: size + 60,
            transform: `rotateX(${tilt.y * 0.5}deg) rotateY(${tilt.x * 0.5}deg)`,
          }}
        />
      )}

      <motion.div
        animate={
          state === 'Speaking'
            ? { scale: [1, 1.12, 1], opacity: [0.55, 0.1, 0.55] }
            : state === 'Listening'
            ? { scale: [1, 1.08, 1], opacity: [0.45, 0.12, 0.45] }
            : { scale: [1, 1.03, 1], opacity: [0.2, 0.06, 0.2] }
        }
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
        className={`absolute rounded-full border-2 ${state === 'Speaking' ? 'border-violet-500/40' : state === 'Listening' ? 'border-teal-400/40' : 'border-white/15'}`}
        style={{ 
          width: size + 20, 
          height: size + 20,
          transform: `rotateX(${tilt.y * 0.6}deg) rotateY(${tilt.x * 0.6}deg)`,
        }}
      />

      <div className="absolute w-full h-full inset-0 z-10 pointer-events-none overflow-hidden rounded-full font-sans">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: state === 'Thinking' ? 5 : 9, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 flex items-center justify-center scale-95"
        >
          <div className="w-[16px] h-[16px] rounded-full bg-cyan-400 border border-white/20 blur-[1px] absolute shadow-[0_0_12px_#2dd4bf]" style={{ top: '6%' }} />
          <div className="w-[12px] h-[12px] rounded-full bg-violet-500 border border-white/20 absolute shadow-[0_0_12px_#8b5cf6]" style={{ bottom: '6%' }} />
          {(state === 'Thinking' || state === 'Speaking') && (
            <div className="w-[10px] h-[10px] rounded-full bg-amber-400 border border-white/10 absolute shadow-[0_0_8px_#f59e0b]" style={{ left: '10%' }} />
          )}
        </motion.div>
      </div>

      <motion.div
        animate={
          state === 'Speaking'
            ? { y: [0, -4, 0] }
            : state === 'Listening'
            ? { y: [2, -2, 2] }
            : { y: [0, -1, 0] }
        }
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
          transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
          transition: 'transform 0.15s ease-out',
          ...getGlowStyle(),
        }}
        className="relative rounded-full border-2 overflow-hidden flex items-center justify-center shadow-[4px_22px_45px_rgba(0,0,0,0.85)] border-zinc-700/50"
      >
        <div className="absolute inset-0 bg-radial-gradient from-violet-950/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -bottom-8 w-full h-32 bg-cyan-500/15 blur-2xl rounded-full" />
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/8 via-transparent to-violet-500/12 opacity-70" />
        <div className="absolute inset-0 bg-cyber-grid opacity-10 pointer-events-none" />

        <svg
          viewBox="0 0 100 100"
          className="w-[92%] h-[92%] translate-y-[4px]"
          id="avatar-svg"
          style={{
            transform: 'translateZ(30px) scale(0.98)',
          }}
        >
          <defs>
            <radialGradient id="hairGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
            </radialGradient>
            
            <linearGradient id="cyberHair" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="50%" stopColor="#111827" />
              <stop offset="100%" stopColor="#2e1065" />
            </linearGradient>

            <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffe4e6" />
              <stop offset="100%" stopColor="#fbcfe8" />
            </linearGradient>

            <linearGradient id="jacketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="40%" stopColor="#1e1e3b" />
              <stop offset="100%" stopColor="#3b0764" />
            </linearGradient>

            <filter id="shadow3d">
              <feDropShadow dx="1" dy="2.5" stdDeviation="1.2" floodColor="#090514" floodOpacity="0.5" />
            </filter>
          </defs>

          <circle cx="50" cy="40" r="26" fill="url(#hairGlow)" opacity="0.8" />

          <motion.path 
            animate={{ d: [
              "M26,45 C20,30 30,12 50,12 C70,12 80,30 74,45 C78,48 76,55 76,55 C65,52 64,48 50,48 C36,48 35,52 24,55 C24,55 22,48 26,45 Z",
              "M25.5,45.5 C19.5,30.5 30,11.5 50.5,12 C70.5,12.5 79.5,30 73.5,45 C77.5,48 75.5,54.5 75.5,54.5 C64.5,51.5 63.5,47.5 50,47.5 C36.5,47.5 35.5,51.5 24,54.5 C24,54.5 21.5,47.5 25.5,45.5 Z",
              "M26,45 C20,30 30,12 50,12 C70,12 80,30 74,45 C78,48 76,55 76,55 C65,52 64,48 50,48 C36,48 35,52 24,55 C24,55 22,48 26,45 Z",
            ]}}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            fill="url(#cyberHair)" 
            filter="url(#shadow3d)" 
          />

          <circle cx="27" cy="46" r="4.5" fill="#FFE2D1" />
          <path d="M27,44.5 C25.5,44.5 25,46 26.5,47" stroke="#E2B199" strokeWidth="0.5" fill="none" />
          <circle cx="27" cy="49.5" r="1.5" fill="#2dd4bf" className="animate-pulse" />

          <circle cx="73" cy="46" r="4.5" fill="#FFE2D1" />
          <path d="M73,44.5 C74.5,44.5 75,46 73.5,47" stroke="#E2B199" strokeWidth="0.5" fill="none" />
          <circle cx="73" cy="49.5" r="1.5" fill="#2dd4bf" className="animate-pulse" />

          <path d="M43,52 L57,52 L57,64 L43,64 Z" fill="#F1CBB5" />
          <path d="M43,52 Q50,56 57,52 L57,55 Q50,59 43,55 Z" fill="#D39678" />

          <path d="M29,42 C29,26 40,24 50,24 C60,24 71,26 71,42 C71,56 61,64 50,64 C39,64 29,56 29,42 Z" fill="url(#skinGrad)" filter="url(#shadow3d)" />

          <path d="M28,38 C28,30 35,21 50,21 C65,21 72,30 72,38 C72,31 66,23 50,23 C34,23 28,31 28,38 Z" fill="#151322" />
          <motion.path 
            animate={{ d: [
              "M29,32 Q38,28 35,38 Q42,26 50,28 Q58,26 65,38 Q62,28 71,32 Q65,21 50,21 Q35,21 29,32 Z",
              "M28.5,32.5 Q38.5,28 34.5,38 Q42,25.5 50.5,27.5 Q58,25.5 64.5,38 L70.5,32 Q64.5,21.5 50.5,21.5 Q35.5,21.5 28.5,32.5 Z",
              "M29,32 Q38,28 35,38 Q42,26 50,28 Q58,26 65,38 Q62,28 71,32 Q65,21 50,21 Q35,21 29,32 Z"
            ]}}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            fill="url(#cyberHair)" 
          />

          <path d="M34,36 Q40,33 44,36" stroke="#252136" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M56,36 Q60,33 66,36" stroke="#252136" strokeWidth="1.8" strokeLinecap="round" fill="none" />

          {isBlinking ? (
            <path d="M34,41 L43,41" stroke="#252136" strokeWidth="2.5" strokeLinecap="round" />
          ) : (
            <>
              <ellipse cx="38.5" cy="41" rx="4.5" ry="5" fill="#0f091f" />
              <circle cx="39.5" cy="39.5" r="1.5" fill="#FFFFFF" />
              <circle cx="37.5" cy="42.5" r="0.7" fill="#60a5fa" opacity="0.85" />
            </>
          )}

          {isBlinking ? (
            <path d="M57,41 L66,41" stroke="#252136" strokeWidth="2.5" strokeLinecap="round" />
          ) : (
            <>
              <ellipse cx="61.5" cy="41" rx="4.5" ry="5" fill="#0f091f" />
              <circle cx="62.5" cy="39.5" r="1.5" fill="#FFFFFF" />
              <circle cx="60.5" cy="42.5" r="0.7" fill="#60a5fa" opacity="0.85" />
            </>
          )}

          <path 
            d="M26,38 L74,38 L74,44 C74,46 68,50 50,50 C32,50 26,46 26,44 Z" 
            fill={state === 'Speaking' ? 'rgba(139, 92, 246, 0.18)' : state === 'Listening' ? 'rgba(45, 212, 191, 0.18)' : 'rgba(255, 255, 255, 0.08)'} 
            stroke={state === 'Speaking' ? '#a78bfa' : state === 'Listening' ? '#2dd4bf' : '#ddc6ff'} 
            strokeWidth="1" 
            opacity="0.9" 
          />
          <path d="M28,39 L45,39 L40,49 L28,40" fill="white" opacity="0.25" />
          <path d="M52,39 L60,39 L57,48" fill="white" opacity="0.18" />

          <path d="M50,42 Q48,48 51,48" stroke="#D39678" strokeWidth="1.2" strokeLinecap="round" fill="none" />

          {state === 'Speaking' ? (
            <motion.path
              animate={{
                d: [
                  'M42,50 Q50,58 58,50 Q50,55 42,50 Z',
                  'M42,50 Q50,65 58,50 Q50,51 42,50 Z',
                  'M42,50 Q50,59 58,50 Q50,53 42,50 Z',
                  'M42,50 Q50,66 58,50 Q50,50 42,50 Z',
                ]
              }}
              transition={{ duration: 0.28, repeat: Infinity, ease: 'easeInOut' }}
              fill="#E15C64"
            />
          ) : state === 'Listening' ? (
            <path d="M43,51 Q50,57 57,51" stroke="#E15C64" strokeWidth="2.8" strokeLinecap="round" fill="none" />
          ) : state === 'Thinking' ? (
            <path d="M44,52 L56,52" stroke="#D39678" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          ) : (
            <path d="M43.5,51 Q50,56 56.5,51" stroke="#C26A5D" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          )}

          <ellipse cx="32" cy="46" rx="4.5" ry="2.2" fill="#FF8383" opacity="0.45" />
          <ellipse cx="68" cy="46" rx="4.5" ry="2.2" fill="#FF8383" opacity="0.45" />

          <path d="M16,68 C16,68 25,62 50,62 C75,62 84,68 84,68 L88,85 L12,85 Z" fill="url(#jacketGrad)" />
          <path d="M34,62 Q50,73 66,62" stroke={state === 'Speaking' ? '#a78bfa' : state === 'Listening' ? '#2dd4bf' : '#a855f7'} strokeWidth="2" fill="none" opacity="0.95" />
          <line x1="50" y1="67" x2="50" y2="82" stroke="#8B5CF6" strokeWidth="2" strokeDasharray="3,1.5" />
        </svg>

        <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-transparent to-violet-500/5 pointer-events-none" />

        {state === 'Speaking' && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center items-end gap-1 z-10">
            {[2, 5, 3, 6, 4, 7, 5, 6, 3, 5, 2].map((val, i) => (
              <motion.div
                key={i}
                animate={{ height: [6, 20 + val * 2.8, 6] }}
                transition={{ duration: 0.35 + i * 0.04, repeat: Infinity, ease: 'easeOut' }}
                className="w-1.5 bg-gradient-to-t from-violet-500 via-purple-400 to-cyan-300 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                style={{ height: 6 }}
              />
            ))}
          </div>
        )}

        {state === 'Listening' && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center items-end gap-1.5 z-10 w-full px-4">
            <div className="w-full flex items-center justify-center gap-0.5">
              {[1, 2.5, 4, 2.5, 1, 2.5, 4, 2.5, 1].map((lvl, i) => (
                <motion.div
                  key={i}
                  animate={{ scaleY: [1, 4 + lvl, 1] }}
                  transition={{ duration: 0.5, delay: i * 0.07, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-1 h-3.5 bg-teal-400 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.6)]"
                />
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <div className="mt-7 flex flex-col items-center gap-1 z-10 text-center font-sans">
        <div className={`px-4.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-widest flex items-center gap-2 border shadow-lg transition-all duration-300 ${
          state === 'Speaking'
            ? 'bg-violet-950/90 text-violet-300 border-violet-500/40 shadow-violet-500/15'
            : state === 'Listening'
            ? 'bg-teal-950/90 text-teal-300 border-teal-500/40 shadow-teal-500/15 animate-pulse'
            : state === 'Thinking'
            ? 'bg-amber-950/90 text-amber-300 border-amber-500/40 shadow-amber-500/10'
            : state === 'Waiting'
            ? 'bg-orange-950/90 text-orange-200 border-orange-500/20'
            : 'bg-zinc-950/80 text-[#A8A5B5] border-white/5'
        }`}>
          {state === 'Speaking' && <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping" />}
          {state === 'Listening' && <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping" />}
          {state === 'Thinking' && <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />}
          {getStatusText()}
        </div>

        <span className="text-[10px] text-[#A8A5B5] font-mono tracking-widest mt-1.5 uppercase font-medium bg-white/2 px-2 py-0.5 rounded border border-white/5">
          {state === 'Speaking' ? 'ĐỘNG LỰC GIỌNG NÓI THỜI GIAN THỰC' : 'ĐỒNG BỘ NGỮ CẢNH NHẬN THỨC'}
        </span>
      </div>
    </div>
  );
}

export default AIAvatar;
