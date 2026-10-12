import React, { useState } from 'react';
import { 
  Wallet, 
  Copy, 
  Check, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  HelpCircle,
  RefreshCw
} from 'lucide-react';

import type { WalletState } from '../types';

interface WalletStatusProps {
  wallet: WalletState;
  onConnect: () => void;
  onSwitchAccount: () => void;
  onDisconnect: () => void;
  onClearError: () => void;
  formatAddress: (addr: string | null) => string;
}

export const WalletStatus: React.FC<WalletStatusProps> = ({
  wallet,
  onConnect,
  onSwitchAccount,
  onDisconnect,
  onClearError,
  formatAddress,
}) => {
  const [copied, setCopied] = useState(false);
  const [showNetworkGuide, setShowNetworkGuide] = useState(false);

  const copyToClipboard = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-2">
      {/* Top Action / Status Pill */}
      <div className="flex items-center gap-2">
        {!wallet.isConnected ? (
          <button
            type="button"
            onClick={onConnect}
            disabled={wallet.isConnecting}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
          >
            {wallet.isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wallet className="w-4 h-4" />
            )}
            <span>{wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {/* Account address pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-mono text-slate-200" title={wallet.address || ''}>
                {formatAddress(wallet.address)}
              </span>
              <button
                type="button"
                onClick={copyToClipboard}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="Copy full address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Switch Account button */}
            <button
              type="button"
              onClick={onSwitchAccount}
              disabled={wallet.isConnecting}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 transition-colors"
              title="Switch account in MetaMask"
            >
              <RefreshCw className={`w-3 h-3 ${wallet.isConnecting ? 'animate-spin' : ''}`} />
              <span>Switch</span>
            </button>

            {/* Disconnect button */}
            <button
              type="button"
              onClick={onDisconnect}
              className="text-xs px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}

        {/* Network status pill */}
        {wallet.isConnected && (
          <button
            type="button"
            onClick={() => setShowNetworkGuide(!showNetworkGuide)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-colors ${
              wallet.isCorrectNetwork
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            {wallet.isCorrectNetwork ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{wallet.expectedNetworkName} ({wallet.chainId})</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Wrong Network ({wallet.chainId ?? 'Unknown'})</span>
                <HelpCircle className="w-3.5 h-3.5 ml-0.5 text-amber-400" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Error notification banner */}
      {wallet.errorMessage && (
        <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-start justify-between gap-2 animate-fadeIn">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">{wallet.errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={onClearError}
            className="text-rose-400 hover:text-rose-100 text-xs px-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Network mismatch instructions drawer */}
      {(showNetworkGuide || (wallet.isConnected && !wallet.isCorrectNetwork)) && (
        <div className="p-4 bg-slate-900 border border-amber-500/40 rounded-xl text-xs text-slate-300 space-y-2.5 animate-fadeIn shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <AlertTriangle className="w-4 h-4" />
              <span>Target Network: {wallet.expectedNetworkName} (Chain ID: {wallet.expectedChainId})</span>
            </div>
            <button
              type="button"
              onClick={() => setShowNetworkGuide(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              Close
            </button>
          </div>

          <p className="text-slate-400 leading-relaxed">
            MetaMask is connected to Chain ID <span className="font-mono text-amber-300">{wallet.chainId ?? 'unknown'}</span>. To test with your local Hardhat node, configure this custom network in MetaMask:
          </p>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1 text-slate-300">
            <div><span className="text-slate-500">Network Name:</span> Hardhat Local</div>
            <div><span className="text-slate-500">New RPC URL:</span> http://127.0.0.1:8545</div>
            <div><span className="text-slate-500">Chain ID:</span> 31337</div>
            <div><span className="text-slate-500">Currency Symbol:</span> ETH</div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            <span>Contract Address: <span className="font-mono text-indigo-300">{wallet.contractAddress}</span></span>
          </div>
        </div>
      )}
    </div>
  );
};
