import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, getAddress } from 'ethers';
import contractConfig from '../contracts/contractConfig.json';
import type { WalletState } from '../types';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useWallet() {
  const expectedChainId = Number(contractConfig.chainId);
  const expectedNetworkName =
    contractConfig.networkName === 'hardhat' ? 'Hardhat Local' : contractConfig.networkName;
  const contractAddress = contractConfig.address;

  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    isCorrectNetwork: false,
    expectedChainId,
    expectedNetworkName,
    contractAddress,
    isMetaMaskInstalled: typeof window !== 'undefined' && Boolean(window.ethereum),
    isConnecting: false,
    errorMessage: null,
  });

  // Helper to format/shorten address (e.g. 0x7099...79C8)
  const formatAddress = (addr: string | null): string => {
    if (!addr) return '';
    try {
      const checksummed = getAddress(addr);
      return `${checksummed.slice(0, 6)}...${checksummed.slice(-4)}`;
    } catch {
      return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    }
  };

  // Check initial connection and detect network
  const checkConnection = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setWallet((prev) => ({
        ...prev,
        isMetaMaskInstalled: false,
      }));
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      // Query raw eth_accounts to see currently active authorized accounts
      const accounts: string[] = await window.ethereum.request({ method: 'eth_accounts' });
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);

      if (accounts && accounts.length > 0) {
        const activeAddress = getAddress(accounts[0]);
        setWallet((prev) => ({
          ...prev,
          isConnected: true,
          address: activeAddress,
          chainId: currentChainId,
          isCorrectNetwork: currentChainId === expectedChainId,
          isMetaMaskInstalled: true,
          errorMessage: null,
        }));
      } else {
        setWallet((prev) => ({
          ...prev,
          isConnected: false,
          address: null,
          chainId: currentChainId,
          isCorrectNetwork: currentChainId === expectedChainId,
          isMetaMaskInstalled: true,
        }));
      }
    } catch {
      // Passive check failure is non-fatal
    }
  }, [expectedChainId]);

  // Connect wallet on explicit user action
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setWallet((prev) => ({
        ...prev,
        errorMessage: 'MetaMask is not installed. Please install MetaMask to interact with this application.',
      }));
      return;
    }

    setWallet((prev) => ({ ...prev, isConnecting: true, errorMessage: null }));

    try {
      const provider = new BrowserProvider(window.ethereum);

      // Request accounts from MetaMask
      let accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' });

      // If already connected or switching, query latest active account
      if (!accounts || accounts.length === 0) {
        accounts = await window.ethereum.request({ method: 'eth_accounts' });
      }

      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);

      if (accounts && accounts.length > 0) {
        const activeAddress = getAddress(accounts[0]);
        setWallet((prev) => ({
          ...prev,
          isConnected: true,
          address: activeAddress,
          chainId: currentChainId,
          isCorrectNetwork: currentChainId === expectedChainId,
          isConnecting: false,
          errorMessage: null,
        }));
      } else {
        setWallet((prev) => ({
          ...prev,
          isConnecting: false,
          errorMessage: 'No accounts selected in MetaMask.',
        }));
      }
    } catch (err: any) {
      let userFriendlyMsg = 'Failed to connect wallet.';
      if (err.code === 4001) {
        userFriendlyMsg = 'Connection request rejected by user.';
      } else if (err.code === -32002) {
        userFriendlyMsg = 'Connection request already pending in MetaMask. Please open your MetaMask popup.';
      } else if (err.message) {
        userFriendlyMsg = err.message;
      }

      setWallet((prev) => ({
        ...prev,
        isConnecting: false,
        errorMessage: userFriendlyMsg,
      }));
    }
  };

  // Switch or re-select account explicitly via MetaMask permission request
  const switchAccount = async () => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    try {
      setWallet((prev) => ({ ...prev, isConnecting: true, errorMessage: null }));
      // Prompt MetaMask's account selection modal
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });
      // After user chooses account in modal, fetch the new selected account
      const accounts: string[] = await window.ethereum.request({ method: 'eth_accounts' });
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);

      if (accounts && accounts.length > 0) {
        const activeAddress = getAddress(accounts[0]);
        setWallet((prev) => ({
          ...prev,
          isConnected: true,
          address: activeAddress,
          chainId: currentChainId,
          isCorrectNetwork: currentChainId === expectedChainId,
          isConnecting: false,
          errorMessage: null,
        }));
      }
    } catch (err: any) {
      if (err.code === 4001) {
        // User cancelled switcher modal
        setWallet((prev) => ({ ...prev, isConnecting: false }));
      } else {
        connectWallet();
      }
    }
  };

  // Disconnect wallet state in the UI
  const disconnectWallet = () => {
    setWallet((prev) => ({
      ...prev,
      isConnected: false,
      address: null,
      errorMessage: null,
    }));
  };

  // Clear error notice
  const clearError = () => {
    setWallet((prev) => ({ ...prev, errorMessage: null }));
  };

  // Event listeners for MetaMask account and chain changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return;
    }

    const handleAccountsChanged = (rawAccounts: string[]) => {
      if (!rawAccounts || rawAccounts.length === 0) {
        // User locked wallet or disconnected all accounts
        setWallet((prev) => ({
          ...prev,
          isConnected: false,
          address: null,
          errorMessage: null,
        }));
      } else {
        const activeAddress = getAddress(rawAccounts[0]);
        setWallet((prev) => ({
          ...prev,
          isConnected: true,
          address: activeAddress,
          errorMessage: null,
        }));
      }
    };

    const handleChainChanged = (hexChainId: string) => {
      const newChainId = parseInt(hexChainId, 16);
      setWallet((prev) => ({
        ...prev,
        chainId: newChainId,
        isCorrectNetwork: newChainId === expectedChainId,
      }));
    };

    const handleDisconnect = () => {
      setWallet((prev) => ({
        ...prev,
        isConnected: false,
        address: null,
      }));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('disconnect', handleDisconnect);

    // Initial check
    checkConnection();

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, [checkConnection, expectedChainId]);

  return {
    wallet,
    connectWallet,
    switchAccount,
    disconnectWallet,
    clearError,
    formatAddress,
  };
}
