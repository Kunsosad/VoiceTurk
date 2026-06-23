import React from 'react';

interface LoadingStateProps {
  message?: string;
  subtext?: string;
}

export function LoadingState({ 
  message = 'Đang xử lý kết nối...', 
  subtext = 'Hệ thống đang truy vấn thông tin trực tiếp từ cơ sở dữ liệu.' 
}: LoadingStateProps) {
  return (
    <div className="py-12 text-center animate-pulse">
      <div className="w-9 h-9 rounded-full border-2 border-zinc-700 border-t-cyan-500 animate-spin mx-auto mb-4" />
      <h3 className="text-xs font-bold text-zinc-350 mb-1.5 font-sans tracking-wide">
        {message}
      </h3>
      <p className="text-[10px] text-zinc-500 font-sans">
        {subtext}
      </p>
    </div>
  );
}
