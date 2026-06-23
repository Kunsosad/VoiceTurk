import React from 'react';

interface EmptyStateProps {
  message?: string;
  subtext?: string;
}

export function EmptyState({ 
  message = 'Chưa có bản ghi dữ liệu nào.', 
  subtext = 'Hãy bắt đầu thêm tác vụ hoặc nội dung đầu tiên.' 
}: EmptyStateProps) {
  return (
    <div className="py-12 px-4 rounded-2xl border border-dashed border-white/10 text-center max-w-md mx-auto">
      <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/5 mx-auto flex items-center justify-center mb-3">
        <span className="text-zinc-500 font-mono text-sm">∅</span>
      </div>
      <h3 className="text-sm font-bold text-white mb-1.5 font-sans">
        {message}
      </h3>
      <p className="text-[11px] text-zinc-400 font-sans max-w-xs mx-auto">
        {subtext}
      </p>
    </div>
  );
}
