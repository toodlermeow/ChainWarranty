import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import type { PageId, WalletState } from '../types';

interface LayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  wallet: WalletState;
  onConnectWallet: () => void;
  onSwitchAccount: () => void;
  onDisconnectWallet: () => void;
  onClearWalletError: () => void;
  formatAddress: (addr: string | null) => string;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentPage,
  onNavigate,
  wallet,
  onConnectWallet,
  onSwitchAccount,
  onDisconnectWallet,
  onClearWalletError,
  formatAddress,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentPage={currentPage}
        onNavigate={onNavigate}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        wallet={wallet}
        onConnectWallet={onConnectWallet}
        onSwitchAccount={onSwitchAccount}
        onDisconnectWallet={onDisconnectWallet}
        onClearWalletError={onClearWalletError}
        formatAddress={formatAddress}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        ChainWarranty &copy; {new Date().getFullYear()} — Blockchain-Based Digital Warranty Card System. Built for Academic Project Demonstration.
      </footer>
    </div>
  );
};
