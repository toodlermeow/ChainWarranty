import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { IssueWarrantyPage } from './pages/IssueWarrantyPage';
import { VerifyWarrantyPage } from './pages/VerifyWarrantyPage';
import { WarrantyListPage } from './pages/WarrantyListPage';
import { useWallet } from './hooks/useWallet';
import type { PageId } from './types';

export default function App(): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const { wallet, connectWallet, switchAccount, disconnectWallet, clearError, formatAddress } = useWallet();

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={setCurrentPage}
            isWalletConnected={wallet.isConnected}
            userAddress={wallet.address}
            isCorrectNetwork={wallet.isCorrectNetwork}
          />
        );
      case 'issue':
        return (
          <IssueWarrantyPage
            onNavigate={setCurrentPage}
            isWalletConnected={wallet.isConnected}
            userAddress={wallet.address}
            isCorrectNetwork={wallet.isCorrectNetwork}
          />
        );
      case 'verify':
        return (
          <VerifyWarrantyPage
            onNavigate={setCurrentPage}
            isWalletConnected={wallet.isConnected}
            isCorrectNetwork={wallet.isCorrectNetwork}
          />
        );
      case 'list':
        return (
          <WarrantyListPage
            onNavigate={setCurrentPage}
            isWalletConnected={wallet.isConnected}
            userAddress={wallet.address}
            isCorrectNetwork={wallet.isCorrectNetwork}
          />
        );
      default:
        return (
          <DashboardPage
            onNavigate={setCurrentPage}
            isWalletConnected={wallet.isConnected}
            userAddress={wallet.address}
            isCorrectNetwork={wallet.isCorrectNetwork}
          />
        );
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      wallet={wallet}
      onConnectWallet={connectWallet}
      onSwitchAccount={switchAccount}
      onDisconnectWallet={disconnectWallet}
      onClearWalletError={clearError}
      formatAddress={formatAddress}
    >
      {renderCurrentPage()}
    </Layout>
  );
}
