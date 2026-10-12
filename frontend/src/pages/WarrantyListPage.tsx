import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  FileBox, 
  ShieldAlert, 
  RotateCcw, 
  AlertCircle, 
  Copy, 
  Check, 
  Ban, 
  Loader2 
} from 'lucide-react';

import { EmptyState } from '../components/EmptyState';
import type { PageId, WarrantyRecordOnChain } from '../types';
import { ContractService, parseContractError } from '../services/contractService';

interface WarrantyListPageProps {
  onNavigate: (page: PageId) => void;
  isWalletConnected: boolean;
  userAddress: string | null;
  isCorrectNetwork: boolean;
}

export const WarrantyListPage: React.FC<WarrantyListPageProps> = ({
  onNavigate,
  isWalletConnected,
  userAddress,
  isCorrectNetwork,
}) => {
  const [records, setRecords] = useState<WarrantyRecordOnChain[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [rpcError, setRpcError] = useState<string | null>(null);

  // Revocation modal state
  const [selectedWarrantyToRevoke, setSelectedWarrantyToRevoke] = useState<WarrantyRecordOnChain | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Contract owner state for permission checking
  const [contractOwner, setContractOwner] = useState<string | null>(null);

  const fetchRecords = async () => {
    if (!isWalletConnected || !isCorrectNetwork) {
      setRecords([]);
      return;
    }

    try {
      setIsLoading(true);
      setRpcError(null);

      // Query contract owner
      try {
        const owner = await ContractService.getOwner();
        setContractOwner(owner.toLowerCase());
      } catch {
        // Non-fatal
      }

      // Query recent WarrantyIssued events
      const eventRecords = await ContractService.fetchRecentIssuedEvents(20);
      setRecords(eventRecords);
    } catch (err: any) {
      setRpcError(parseContractError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [isWalletConnected, isCorrectNetwork, userAddress]);


  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarrantyToRevoke) return;
    if (!revocationReason.trim()) {
      setRevokeError('Please provide a reason for voiding this warranty.');
      return;
    }

    try {
      setIsRevoking(true);
      setRevokeError(null);

      await ContractService.revokeWarranty(
        selectedWarrantyToRevoke.warrantyId,
        revocationReason.trim()
      );

      // Close modal & refresh records
      setSelectedWarrantyToRevoke(null);
      setRevocationReason('');
      await fetchRecords();
    } catch (err: any) {
      setRevokeError(parseContractError(err));
    } finally {
      setIsRevoking(false);
    }
  };

  // Determine if active user has permission to revoke a specific warranty
  const canUserRevoke = (record: WarrantyRecordOnChain): boolean => {
    if (!userAddress) return false;
    const lowerUser = userAddress.toLowerCase();
    const isOwner = contractOwner ? lowerUser === contractOwner : false;
    const isIssuer = lowerUser === record.issuingSeller.toLowerCase();
    return isOwner || isIssuer;
  };

  // Filter records based on search and status
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.warrantyId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.issuingSeller.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.detailsHash.toLowerCase().includes(searchQuery.toLowerCase());

    const now = Math.floor(Date.now() / 1000);
    const isExpired = now >= r.expiryTime;

    let matchesStatus = true;
    if (selectedStatus === 'active') {
      matchesStatus = !r.isRevoked && !isExpired;
    } else if (selectedStatus === 'expired') {
      matchesStatus = !r.isRevoked && isExpired;
    } else if (selectedStatus === 'revoked') {
      matchesStatus = r.isRevoked;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Warranty Directory</h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse and manage on-chain warranty tokens discovered from event logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchRecords}
            disabled={isLoading || !isWalletConnected}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold shadow-sm transition-all focus:ring-2 focus:ring-slate-500 focus:outline-none disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('issue')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            <span>New Warranty</span>
          </button>
        </div>
      </div>

      {/* RPC / Network Error Banner */}
      {rpcError && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-rose-300">Log Query Error</p>
            <p className="leading-relaxed text-slate-300">{rpcError}</p>
          </div>
        </div>
      )}

      {/* Controls Bar: Search & Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by warranty ID, issuing seller, or details hash..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all font-mono"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative sm:w-48">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Filter className="w-4 h-4" />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="expired">Expired Only</option>
            <option value="revoked">Revoked Only</option>
          </select>
        </div>
      </div>

      {/* Table / List Container */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-850/80 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Warranty ID</th>
                <th className="py-3 px-4">Details Hash</th>
                <th className="py-3 px-4">Issuing Seller</th>
                <th className="py-3 px-4">Purchase Date</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r) => {
                  const now = Math.floor(Date.now() / 1000);
                  const isExpired = now >= r.expiryTime;
                  const canRevoke = canUserRevoke(r) && !r.isRevoked;

                  return (
                    <tr key={r.warrantyId} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-4 text-indigo-300">
                        <div className="flex items-center gap-1.5 max-w-[140px] truncate" title={r.warrantyId}>
                          <span className="truncate">{r.warrantyId.slice(0, 10)}...{r.warrantyId.slice(-6)}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(r.warrantyId)}
                            className="text-slate-500 hover:text-white"
                          >
                            {copiedId === r.warrantyId ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-[120px] truncate" title={r.detailsHash}>
                        {r.detailsHash.slice(0, 10)}...
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-[130px] truncate" title={r.issuingSeller}>
                        {r.issuingSeller.slice(0, 6)}...{r.issuingSeller.slice(-4)}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(r.purchaseTime * 1000).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(r.expiryTime * 1000).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {r.isRevoked ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
                            REVOKED
                          </span>
                        ) : isExpired ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                            EXPIRED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canRevoke ? (
                          <button
                            type="button"
                            onClick={() => setSelectedWarrantyToRevoke(r)}
                            className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded-lg border border-rose-500/30 text-[10px] font-semibold transition-colors"
                          >
                            Revoke
                          </button>
                        ) : r.isRevoked ? (
                          <span className="text-slate-600 text-[10px]">Voided</span>
                        ) : (
                          <span className="text-slate-600 text-[10px]">No Permission</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-0">
                    <div className="py-12 px-6">
                      <EmptyState
                        icon={FileBox}
                        title={
                          !isWalletConnected
                            ? 'Connect Wallet to Query Records'
                            : isLoading
                            ? 'Searching Blockchain Event Logs...'
                            : 'No Warranty Records Discovered'
                        }
                        description={
                          !isWalletConnected
                            ? 'Connect your local MetaMask account to query WarrantyIssued events directly from the node.'
                            : 'Zero WarrantyIssued logs found on this contract. Issue your first warranty using the button below.'
                        }
                        actionText={isWalletConnected ? 'Issue a Warranty' : undefined}
                        onAction={isWalletConnected ? () => onNavigate('issue') : undefined}
                      />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info note */}
        <div className="p-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
            Showing {filteredRecords.length} of {records.length} discovered records
          </span>
          <span className="text-[11px] text-slate-500">
            Queries contract events locally via eth_getLogs
          </span>
        </div>
      </div>

      {/* Revocation Modal */}
      {selectedWarrantyToRevoke && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
              <Ban className="w-5 h-5" />
              <span>Revoke Warranty Record</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to permanently revoke warranty{' '}
              <code className="text-indigo-300 font-mono text-[11px]">
                {selectedWarrantyToRevoke.warrantyId.slice(0, 12)}...
              </code>
              . This updates the contract's <code className="text-slate-200">isRevoked</code> flag on-chain.
            </p>

            <form onSubmit={handleRevokeSubmit} className="space-y-4">
              <div>
                <label htmlFor="revokeReason" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Revocation Reason <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="revokeReason"
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  disabled={isRevoking}
                  placeholder="e.g. Product returned and refunded by customer"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {revokeError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs">
                  {revokeError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedWarrantyToRevoke(null)}
                  disabled={isRevoking}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRevoking}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-xl font-semibold transition-colors flex items-center gap-2"
                >
                  {isRevoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Confirm Revocation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
