import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Info, 
  Plus, 
  Search, 
  Layers, 
  Inbox,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { SummaryCard } from '../components/SummaryCard';
import { EmptyState } from '../components/EmptyState';
import type { PageId, WarrantyRecordOnChain } from '../types';
import { ContractService, parseContractError } from '../services/contractService';

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
  isWalletConnected: boolean;
  userAddress: string | null;
  isCorrectNetwork: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  isWalletConnected,
  userAddress,
  isCorrectNetwork,
}) => {
  const [records, setRecords] = useState<WarrantyRecordOnChain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rpcError, setRpcError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    if (!isWalletConnected || !isCorrectNetwork) {
      setRecords([]);
      return;
    }

    try {
      setIsLoading(true);
      setRpcError(null);
      const eventRecords = await ContractService.fetchRecentIssuedEvents(15);
      setRecords(eventRecords);
    } catch (err: any) {
      setRpcError(parseContractError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [isWalletConnected, isCorrectNetwork, userAddress]);


  // Derive counts from actual queried on-chain events
  const totalCount = records.length;
  const now = Math.floor(Date.now() / 1000);
  const activeCount = records.filter((r) => !r.isRevoked && now < r.expiryTime).length;
  const expiredCount = records.filter((r) => !r.isRevoked && now >= r.expiryTime).length;
  const revokedCount = records.filter((r) => r.isRevoked).length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time operational metrics for digital warranty records on the local blockchain.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchMetrics}
            disabled={isLoading || !isWalletConnected}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold shadow-sm transition-all focus:ring-2 focus:ring-slate-500 focus:outline-none disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh State</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('issue')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Warranty</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('verify')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all focus:ring-2 focus:ring-slate-500 focus:outline-none"
          >
            <Search className="w-4 h-4" />
            <span>Verify ID</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/50 text-indigo-200 text-xs">
        <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-indigo-300">Live Local Smart Contract Connection</p>
          <p className="text-slate-300 leading-relaxed">
            {isWalletConnected
              ? `Metrics are synchronized live from contract events emitted on the local Hardhat network. Showing real on-chain data without fabricated records.`
              : `MetaMask is not connected. Connect your wallet to load live contract events and metrics from the local Hardhat network.`}
          </p>
        </div>
      </div>

      {/* RPC / Query Error */}
      {rpcError && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-rose-300">Contract Query Notice</p>
            <p className="leading-relaxed text-slate-300">{rpcError}</p>
          </div>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Warranties"
          count={isWalletConnected ? totalCount : 0}
          subtitle={isWalletConnected ? `${totalCount} records indexed` : 'Connect wallet to view'}
          icon={ShieldCheck}
          colorScheme="blue"
        />
        <SummaryCard
          title="Active Warranties"
          count={isWalletConnected ? activeCount : 0}
          subtitle={isWalletConnected ? `${activeCount} currently valid` : 'Connect wallet to view'}
          icon={CheckCircle2}
          colorScheme="emerald"
        />
        <SummaryCard
          title="Expired Warranties"
          count={isWalletConnected ? expiredCount : 0}
          subtitle={isWalletConnected ? `${expiredCount} past expiration` : 'Connect wallet to view'}
          icon={Clock}
          colorScheme="amber"
        />
        <SummaryCard
          title="Revoked Warranties"
          count={isWalletConnected ? revokedCount : 0}
          subtitle={isWalletConnected ? `${revokedCount} voided on-chain` : 'Connect wallet to view'}
          icon={AlertTriangle}
          colorScheme="rose"
        />
      </div>

      {/* Recent Activity Container */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Recent Warranty Activity</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {records.length} events retrieved
          </span>
        </div>

        {records.length > 0 ? (
          <div className="space-y-2.5 font-mono text-xs">
            {records.slice(0, 5).map((r) => (
              <div
                key={r.warrantyId}
                className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-indigo-400 font-semibold truncate">
                    {r.warrantyId.slice(0, 14)}...{r.warrantyId.slice(-6)}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    by {r.issuingSeller.slice(0, 6)}...{r.issuingSeller.slice(-4)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-slate-400">
                    Expires: {new Date(r.expiryTime * 1000).toLocaleDateString()}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      r.isRevoked
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : now >= r.expiryTime
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    {r.isRevoked ? 'REVOKED' : now >= r.expiryTime ? 'EXPIRED' : 'ACTIVE'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Inbox}
            title={
              !isWalletConnected
                ? 'Wallet Disconnected'
                : isLoading
                ? 'Retrieving Event Logs...'
                : 'No Warranty Records Found'
            }
            description={
              !isWalletConnected
                ? 'Connect your local MetaMask account to retrieve live warranty metrics.'
                : 'Zero WarrantyIssued logs have been minted on the contract yet.'
            }
            actionText={isWalletConnected ? 'Issue First Warranty' : undefined}
            onAction={isWalletConnected ? () => onNavigate('issue') : undefined}
          />
        )}
      </div>
    </div>
  );
};
