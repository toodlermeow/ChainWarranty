import React from 'react';
import { ShieldCheck, Menu, X, LayoutDashboard, PlusCircle, Search, ListFilter } from 'lucide-react';
import { WalletStatus } from './WalletStatus';
import type { PageId, WalletState } from '../types';
import { APP_CONFIG, NAV_ITEMS } from '../constants';

interface NavbarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  wallet: WalletState;
  onConnectWallet: () => void;
  onSwitchAccount: () => void;
  onDisconnectWallet: () => void;
  onClearWalletError: () => void;
  formatAddress: (addr: string | null) => string;
}

const navIcons = {
  dashboard: LayoutDashboard,
  issue: PlusCircle,
  verify: Search,
  list: ListFilter,
};

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  mobileMenuOpen,
  setMobileMenuOpen,
  wallet,
  onConnectWallet,
  onSwitchAccount,
  onDisconnectWallet,
  onClearWalletError,
  formatAddress,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">{APP_CONFIG.appName}</span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                v{APP_CONFIG.version}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {NAV_ITEMS.map((item) => {
              const Icon = navIcons[item.id];
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Section: Wallet Status Button */}
          <div className="hidden sm:flex items-center space-x-3">
            <WalletStatus
              wallet={wallet}
              onConnect={onConnectWallet}
              onSwitchAccount={onSwitchAccount}
              onDisconnect={onDisconnectWallet}
              onClearError={onClearWalletError}
              formatAddress={formatAddress}
            />
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-900 px-4 pt-2 pb-4 space-y-3">
          {/* Mobile Wallet Controls */}
          <div className="pb-2 border-b border-slate-800">
            <WalletStatus
              wallet={wallet}
              onConnect={onConnectWallet}
              onSwitchAccount={onSwitchAccount}
              onDisconnect={onDisconnectWallet}
              onClearError={onClearWalletError}
              formatAddress={formatAddress}
            />
          </div>

          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = navIcons[item.id];
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
