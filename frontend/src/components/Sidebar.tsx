import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Search, 
  ListFilter,
  ShieldAlert
} from 'lucide-react';
import type { PageId } from '../types';
import { NAV_ITEMS } from '../constants';


interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

const navIcons = {
  dashboard: LayoutDashboard,
  issue: PlusCircle,
  verify: Search,
  list: ListFilter,
};

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)] p-4">
      <div className="space-y-6">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">
            Menu Navigation
          </span>
          <div className="mt-2 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = navIcons[item.id];
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stage status indicator card */}
      <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 mb-1.5">
          <ShieldAlert className="w-4 h-4 text-indigo-400" />
          <span>Stage 2 Architecture</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Pure React + TypeScript UI foundation. Smart contracts, Web3 providers, and wallets will connect in later stages.
        </p>
      </div>
    </aside>
  );
};
