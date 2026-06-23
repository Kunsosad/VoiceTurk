import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Tag, Users, Info } from 'lucide-react';

export function CampaignLabelsCard() {
  return (
    <Card className="p-5 border border-white/5 bg-[#0B0B12]/80 hover:border-violet-500/20 transition-all text-left">
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
        <Tag className="w-4 h-4 text-violet-400 shrink-0" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-white">Campaign Labels</h3>
      </div>
      <div className="space-y-4 font-sans text-xs">
        <div>
          <label className="text-[10px] text-[#6F6B7E] font-mono uppercase block mb-1">Campaign:</label>
          <p className="text-white font-bold leading-relaxed">
            Livestream Gift Complaint Dataset
          </p>
        </div>

        <div>
          <label className="text-[10px] text-[#6F6B7E] font-mono uppercase block mb-1">Context:</label>
          <div className="p-2.5 bg-zinc-950/60 rounded-lg border border-white/5 text-zinc-300 leading-relaxed italic text-[11px]">
            "Khách mua mỹ phẩm qua livestream vì được hứa có quà tặng mini, nhưng khi nhận hàng lại không có. Khách bực và nghi shop lừa."
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-[#6F6B7E] font-mono uppercase block mb-1">AI Customer:</label>
            <p className="text-zinc-200 font-semibold leading-snug">
              Khách hàng bực, nghi ngờ và muốn shop xử lý ngay.
            </p>
          </div>
          <div>
            <label className="text-[10px] text-[#6F6B7E] font-mono uppercase block mb-1">Contributor:</label>
            <p className="text-zinc-200 font-semibold leading-snug">
              Nhân viên chăm sóc khách hàng của shop.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
          <span className="text-zinc-400">Conversation Limit</span>
          <span className="px-2 py-0.5 bg-zinc-900 border border-white/5 rounded text-[10px] font-mono text-zinc-300">
            Max 5 turns per side
          </span>
        </div>
      </div>
    </Card>
  );
}
