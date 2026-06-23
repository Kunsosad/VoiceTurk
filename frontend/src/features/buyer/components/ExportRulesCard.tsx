import React from 'react';
import { Card } from '../../../components/ui/Card';
import { ShieldCheck, HelpCircle } from 'lucide-react';

export function ExportRulesCard() {
  const rules = [
    "Only accepted recordings are included in final packages.",
    "Pending review recordings are strictly excluded.",
    "Retake or rejected recordings are excluded from training weights.",
    "Contributor reward is settled out of escrow only after buyer acceptance.",
    "Dataset can be exported only when target is fully reached."
  ];

  return (
    <Card className="p-5 border border-white/5 bg-[#0B0B12]/80 hover:border-emerald-500/20 transition-all text-left">
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-white">Export Rules</h3>
      </div>
      <ul className="space-y-2.5 font-sans text-xs text-zinc-400">
        {rules.map((rule, idx) => (
          <li key={idx} className="flex gap-2 items-start leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
            <span>{rule}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
