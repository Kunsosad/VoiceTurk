import React from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footerActions,
  maxWidth = 'md' 
}: ModalProps) {
  if (!isOpen) return null;

  let widthClass = 'max-w-md';
  if (maxWidth === 'sm') widthClass = 'max-w-sm';
  if (maxWidth === 'lg') widthClass = 'max-w-lg';
  if (maxWidth === 'xl') widthClass = 'max-w-4xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 selection:bg-teal-500/30 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      {/* Content Container */}
      <div className={`relative w-full ${widthClass} bg-zinc-950 border border-white/10 rounded-2xl p-6 shadow-2xl relative z-10 transition-all animate-fadeIn`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
          <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wider">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-900 border border-white/5 hover:border-white/15 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer active:scale-90 transition-all text-sm font-bold leading-none"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="max-h-[70vh] overflow-y-auto pr-1 text-zinc-350 text-xs text-left leading-relaxed font-sans space-y-4">
          {children}
        </div>

        {/* Footer */}
        {footerActions && (
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/5 mt-5">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
}
