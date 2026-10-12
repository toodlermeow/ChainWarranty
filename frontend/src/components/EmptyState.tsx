import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';


interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-10 bg-slate-800/40 border border-slate-800 rounded-2xl">
      <div className="p-4 bg-slate-800 rounded-2xl text-slate-400 mb-4 border border-slate-700/60 shadow-inner">
        <Icon className="w-8 h-8 text-indigo-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-200 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mb-5 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
