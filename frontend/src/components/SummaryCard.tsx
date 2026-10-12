import React from 'react';
import type { LucideIcon } from 'lucide-react';


interface SummaryCardProps {
  title: string;
  count: number | string;
  subtitle: string;
  icon: LucideIcon;
  colorScheme: 'blue' | 'emerald' | 'amber' | 'rose';
}

const colorMap = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    iconColor: 'text-blue-400',
    pill: 'text-blue-400 bg-blue-500/10',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    iconColor: 'text-emerald-400',
    pill: 'text-emerald-400 bg-emerald-500/10',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    iconColor: 'text-amber-400',
    pill: 'text-amber-400 bg-amber-500/10',
  },
  rose: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    iconColor: 'text-rose-400',
    pill: 'text-rose-400 bg-rose-500/10',
  },
};

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  count,
  subtitle,
  icon: Icon,
  colorScheme,
}) => {
  const styles = colorMap[colorScheme];

  return (
    <div className={`p-5 rounded-2xl bg-slate-800/80 border ${styles.border} backdrop-blur-sm transition-all hover:border-slate-600 shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl ${styles.bg} ${styles.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-3xl font-extrabold text-white tracking-tight mb-1">{count}</div>
      <div className="text-xs text-slate-400 flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-500"></span>
        {subtitle}
      </div>
    </div>
  );
};
