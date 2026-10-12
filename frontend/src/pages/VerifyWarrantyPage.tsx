import React, { useState } from 'react';
import { 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  HelpCircle, 
  ShieldAlert, 
  Loader2, 
  Info 
} from 'lucide-react';

import type { PageId, VerificationResult, VerificationStatus } from '../types';
import { PRODUCT_CATEGORIES } from '../constants';
import { computeDetailsHash, isValidBytes32 } from '../utils/hashUtils';
import { ContractService, parseContractError } from '../services/contractService';

interface VerifyWarrantyPageProps {
  onNavigate: (page: PageId) => void;
  isWalletConnected: boolean;
  isCorrectNetwork: boolean;
}

export const VerifyWarrantyPage: React.FC<VerifyWarrantyPageProps> = ({
  isWalletConnected,
  isCorrectNetwork,
}) => {
  const [warrantyIdInput, setWarrantyIdInput] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [serialNumber, setSerialNumber] = useState('');

  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};

    if (!warrantyIdInput.trim()) {
      errs.warrantyId = 'Warranty ID is required.';
    } else if (!isValidBytes32(warrantyIdInput.trim())) {
      errs.warrantyId = 'Warranty ID must be a valid 32-byte hex string (0x followed by 64 hex characters).';
    }

    if (!productName.trim()) {
      errs.productName = 'Product name is required to verify details hash.';
    } else if (productName.includes('|')) {
      errs.productName = "Product name cannot contain delimiter '|'";
    }

    if (!category) {
      errs.category = 'Product category is required.';
    } else if (category.includes('|')) {
      errs.category = "Category cannot contain delimiter '|'";
    }

    if (!serialNumber.trim()) {
      errs.serialNumber = 'Serial number is required to verify details hash.';
    } else if (serialNumber.includes('|')) {
      errs.serialNumber = "Serial number cannot contain delimiter '|'";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setRpcError(null);
    setResult(null);

    if (!validate()) return;

    if (!isWalletConnected) {
      setRpcError('Please connect your MetaMask wallet to query the local Hardhat contract.');
      return;
    }

    if (!isCorrectNetwork) {
      setRpcError('Please switch MetaMask to Hardhat Local (Chain ID: 31337).');
      return;
    }

    try {
      setIsVerifying(true);

      // Compute canonical detailsHash from input fields
      const candidateHash = computeDetailsHash({
        category,
        productName,
        serialNumber,
      });

      // Call ContractService.verifyWarranty
      const verificationResult = await ContractService.verifyWarranty(
        warrantyIdInput.trim(),
        candidateHash
      );

      setResult(verificationResult);
    } catch (err: any) {
      setRpcError(parseContractError(err));
    } finally {
      setIsVerifying(false);
    }
  };

  // Status badge styling helper
  const renderStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'VALID':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>AUTHENTIC & VALID</span>
          </div>
        );
      case 'REVOKED':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs">
            <XCircle className="w-4 h-4" />
            <span>WARRANTY REVOKED</span>
          </div>
        );
      case 'EXPIRED':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs">
            <Clock className="w-4 h-4" />
            <span>WARRANTY EXPIRED</span>
          </div>
        );
      case 'HASH_MISMATCH':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold text-xs">
            <ShieldAlert className="w-4 h-4" />
            <span>DETAILS HASH MISMATCH</span>
          </div>
        );
      case 'NOT_FOUND':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 font-bold text-xs">
            <HelpCircle className="w-4 h-4" />
            <span>RECORD NOT FOUND</span>
          </div>
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Verify Warranty Authenticity</h1>
        <p className="text-sm text-slate-400 mt-1">
          Cryptographically verify a digital warranty card directly against the immutable smart contract ledger.
        </p>
      </div>

      {/* Honest Cryptographic Scope Notice */}
      <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/50 text-indigo-200 text-xs flex items-start gap-3">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-indigo-400" />
        <div className="space-y-1">
          <p className="font-semibold text-indigo-300">Cryptographic Scope Note</p>
          <p className="text-slate-300 leading-relaxed">
            A matching hash proves <strong>digital data consistency</strong> with the parameters stored on-chain by the issuing seller. It does not certify the physical authenticity of the physical goods or verify whether the seller entered accurate data.
          </p>
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleVerify} className="space-y-5" noValidate>
          {/* Warranty ID input */}
          <div>
            <label htmlFor="warrantyId" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Warranty ID (bytes32 hex) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="warrantyId"
                value={warrantyIdInput}
                onChange={(e) => {
                  setWarrantyIdInput(e.target.value);
                  if (fieldErrors.warrantyId) setFieldErrors((p) => ({ ...p, warrantyId: '' }));
                }}
                disabled={isVerifying}
                placeholder="0x..."
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                  fieldErrors.warrantyId
                    ? 'border-rose-500 focus:ring-rose-500/40'
                    : 'border-slate-700 focus:ring-indigo-500/40 focus:border-indigo-500'
                }`}
              />
            </div>
            {fieldErrors.warrantyId && (
              <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{fieldErrors.warrantyId}</span>
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
              Claimed Product Parameters for Hash Verification
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Name */}
              <div>
                <label htmlFor="v_productName" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Product Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="v_productName"
                  value={productName}
                  onChange={(e) => {
                    setProductName(e.target.value);
                    if (fieldErrors.productName) setFieldErrors((p) => ({ ...p, productName: '' }));
                  }}
                  disabled={isVerifying}
                  placeholder="e.g. Sony WH-1000XM5"
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 focus:outline-none"
                />
                {fieldErrors.productName && (
                  <p className="mt-1 text-xs text-rose-400">{fieldErrors.productName}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="v_category" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Category <span className="text-rose-400">*</span>
                </label>
                <select
                  id="v_category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (fieldErrors.category) setFieldErrors((p) => ({ ...p, category: '' }));
                  }}
                  disabled={isVerifying}
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="" disabled>Select category...</option>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {fieldErrors.category && (
                  <p className="mt-1 text-xs text-rose-400">{fieldErrors.category}</p>
                )}
              </div>

              {/* Serial Number */}
              <div className="sm:col-span-2">
                <label htmlFor="v_serial" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Serial Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="v_serial"
                  value={serialNumber}
                  onChange={(e) => {
                    setSerialNumber(e.target.value);
                    if (fieldErrors.serialNumber) setFieldErrors((p) => ({ ...p, serialNumber: '' }));
                  }}
                  disabled={isVerifying}
                  placeholder="e.g. SN-89472091-B"
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 focus:outline-none"
                />
                {fieldErrors.serialNumber && (
                  <p className="mt-1 text-xs text-rose-400">{fieldErrors.serialNumber}</p>
                )}
              </div>
            </div>
          </div>

          {/* RPC / Network Error Banner */}
          {rpcError && (
            <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-300">RPC Query Error</p>
                <p className="leading-relaxed text-slate-300">{rpcError}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Reading Smart Contract State...</span>
              </>
            ) : (
              <span>Verify On-Chain</span>
            )}
          </button>
        </form>
      </div>

      {/* Verification Result Card */}
      {result && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 animate-fadeIn shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs text-slate-400">Verification Outcome</span>
              <h2 className="text-lg font-bold text-white mt-0.5">Contract Status Report</h2>
            </div>
            <div>{renderStatusBadge(result.statusString)}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
              <span className="text-slate-500 block mb-1">Computed Candidate Hash:</span>
              <span className="text-slate-300 break-all">{result.computedDetailsHash}</span>
            </div>

            {result.onChainRecord && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                <span className="text-slate-500 block mb-1">Stored On-Chain Hash:</span>
                <span className="text-slate-300 break-all">{result.onChainRecord.detailsHash}</span>
              </div>
            )}
          </div>

          {result.onChainRecord && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2 text-xs">
              <div className="text-slate-400 font-semibold uppercase text-[11px] tracking-wider mb-2">
                On-Chain Record Breakdown
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500">Issuing Seller:</span>{' '}
                  <span className="text-indigo-300">{result.onChainRecord.issuingSeller}</span>
                </div>
                <div>
                  <span className="text-slate-500">Revocation Flag:</span>{' '}
                  <span className={result.onChainRecord.isRevoked ? 'text-rose-400' : 'text-emerald-400'}>
                    {result.onChainRecord.isRevoked ? 'REVOKED (True)' : 'ACTIVE (False)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Purchase Timestamp:</span>{' '}
                  <span>{new Date(result.onChainRecord.purchaseTime * 1000).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-500">Expiry Timestamp:</span>{' '}
                  <span>{new Date(result.onChainRecord.expiryTime * 1000).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}

          {result.statusString === 'NOT_FOUND' && (
            <p className="text-xs text-slate-400 leading-relaxed">
              The contract returned <code className="text-slate-300 font-mono">NOT_FOUND</code>. No record with this 32-byte warranty ID exists on the smart contract.
            </p>
          )}

          {result.statusString === 'HASH_MISMATCH' && (
            <p className="text-xs text-purple-300 leading-relaxed">
              The warranty ID exists, but the candidate details hash did not match the on-chain hash. This indicates the product name, category, or serial number does not match what was originally recorded.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
