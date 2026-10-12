import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Calendar, 
  Tag, 
  Hash, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Copy,
  Check,
  ShieldCheck
} from 'lucide-react';
import type { WarrantyFormData, FormErrors, PageId, TransactionReceiptSummary } from '../types';
import { PRODUCT_CATEGORIES, WARRANTY_DURATION_OPTIONS } from '../constants';
import { calculateExpiryDate, getTodayDateString } from '../utils/dateUtils';
import { 
  computeDetailsHash, 
  generateSecureWarrantyId, 
  dateStringToUnixSeconds 
} from '../utils/hashUtils';
import { ContractService, parseContractError } from '../services/contractService';

interface IssueWarrantyPageProps {
  onNavigate: (page: PageId) => void;
  isWalletConnected: boolean;
  userAddress: string | null;
  isCorrectNetwork: boolean;
}

export const IssueWarrantyPage: React.FC<IssueWarrantyPageProps> = ({
  isWalletConnected,
  userAddress,
  isCorrectNetwork,
}) => {

  const [formData, setFormData] = useState<WarrantyFormData>({
    productName: '',
    productCategory: '',
    serialNumber: '',
    purchaseDate: getTodayDateString(),
    durationMonths: 12,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receiptSummary, setReceiptSummary] = useState<TransactionReceiptSummary | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);

  // Dynamic calculation of warranty expiry date
  const calculatedExpiryDate = useMemo(() => {
    return calculateExpiryDate(formData.purchaseDate, formData.durationMonths);
  }, [formData.purchaseDate, formData.durationMonths]);

  // Form validation function
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.productName.trim()) {
      newErrors.productName = 'Product name is required';
    } else if (formData.productName.includes('|')) {
      newErrors.productName = "Product name cannot contain the delimiter '|'";
    } else if (formData.productName.trim().length < 2) {
      newErrors.productName = 'Product name must be at least 2 characters';
    }

    if (!formData.productCategory) {
      newErrors.productCategory = 'Please select a product category';
    } else if (formData.productCategory.includes('|')) {
      newErrors.productCategory = "Category cannot contain the delimiter '|'";
    }

    if (!formData.serialNumber.trim()) {
      newErrors.serialNumber = 'Unique serial number is required';
    } else if (formData.serialNumber.includes('|')) {
      newErrors.serialNumber = "Serial number cannot contain the delimiter '|'";
    } else if (formData.serialNumber.trim().length < 3) {
      newErrors.serialNumber = 'Serial number must be at least 3 characters';
    }

    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Purchase date is required';
    } else {
      const selected = new Date(formData.purchaseDate);
      const today = new Date();
      if (isNaN(selected.getTime())) {
        newErrors.purchaseDate = 'Invalid date format';
      } else if (selected > today) {
        newErrors.purchaseDate = 'Purchase date cannot be in the future';
      }
    }

    if (!formData.durationMonths || formData.durationMonths <= 0) {
      newErrors.durationMonths = 'Please select a valid warranty duration';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'durationMonths' ? Number(value) : value,
    }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setReceiptSummary(null);

    if (!validate()) return;

    if (!isWalletConnected) {
      setSubmitError('Please connect your MetaMask wallet before issuing a warranty.');
      return;
    }

    if (!isCorrectNetwork) {
      setSubmitError('Your wallet is on the wrong network. Please switch to Hardhat Local (Chain ID: 31337).');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Compute canonical detailsHash
      const detailsHash = computeDetailsHash({
        category: formData.productCategory,
        productName: formData.productName,
        serialNumber: formData.serialNumber,
      });

      // 2. Generate secure non-zero bytes32 warranty ID
      const warrantyId = generateSecureWarrantyId();

      // 3. Convert timestamps to Unix seconds
      const purchaseTimestamp = dateStringToUnixSeconds(formData.purchaseDate);
      const expiryTimestamp = dateStringToUnixSeconds(calculatedExpiryDate);

      // 4. Submit transaction to smart contract & await receipt
      const receipt = await ContractService.issueWarranty(
        warrantyId,
        detailsHash,
        purchaseTimestamp,
        expiryTimestamp
      );

      // 5. Store confirmation details
      setReceiptSummary(receipt);

      // Reset form
      setFormData({
        productName: '',
        productCategory: '',
        serialNumber: '',
        purchaseDate: getTodayDateString(),
        durationMonths: 12,
      });
    } catch (err: any) {
      setSubmitError(parseContractError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copyTx = (tx: string) => {
    navigator.clipboard.writeText(tx);
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Issue Digital Warranty</h1>
        <p className="text-sm text-slate-400 mt-1">
          Mint an immutable, verifiable digital warranty card record directly on the blockchain.
        </p>
      </div>

      {/* Seller Permission Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs">
        <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-indigo-400" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-200">On-Chain Seller Access Control</p>
          <p className="text-slate-400 leading-relaxed">
            Only addresses authorized by the contract owner via <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-300">authorizeSeller</code> can mint warranties.
            {userAddress ? (
              <span className="block mt-1 text-slate-400">
                Connected address: <code className="text-indigo-300 font-mono">{userAddress}</code>
              </span>
            ) : null}
          </p>
        </div>
      </div>


      {/* Transaction Success Banner */}
      {receiptSummary && (
        <div className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs space-y-4 animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Warranty Successfully Minted on Blockchain!</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Transaction was confirmed in block <span className="font-mono text-emerald-300 font-semibold">#{receiptSummary.blockNumber}</span>. Your unique warranty identifier is generated and saved immutably.
          </p>

          <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-emerald-900/60 font-mono text-[11px]">
            <div className="flex items-center justify-between gap-2 overflow-hidden">
              <span className="text-slate-500">Warranty ID:</span>
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-indigo-300 truncate">{receiptSummary.warrantyId}</span>
                <button
                  type="button"
                  onClick={() => copyId(receiptSummary.warrantyId)}
                  className="p-1 hover:text-white text-slate-400"
                  title="Copy Warranty ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 overflow-hidden">
              <span className="text-slate-500">Tx Hash:</span>
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-slate-300 truncate">{receiptSummary.transactionHash}</span>
                <button
                  type="button"
                  onClick={() => copyTx(receiptSummary.transactionHash)}
                  className="p-1 hover:text-white text-slate-400"
                  title="Copy Tx Hash"
                >
                  {copiedTx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Details Hash:</span>
              <span className="text-slate-400 truncate">{receiptSummary.detailsHash}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Product Name */}
          <div>
            <label htmlFor="productName" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Product Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <FileText className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="productName"
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
                  errors.productName
                    ? 'border-rose-500 focus:ring-rose-500/40'
                    : 'border-slate-700 focus:ring-indigo-500/40 focus:border-indigo-500'
                }`}
              />
            </div>
            {errors.productName && (
              <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.productName}</span>
              </p>
            )}
          </div>

          {/* Category & Serial Number Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label htmlFor="productCategory" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Product Category <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Tag className="w-4 h-4" />
                </div>
                <select
                  id="productCategory"
                  name="productCategory"
                  value={formData.productCategory}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
                    errors.productCategory
                      ? 'border-rose-500 focus:ring-rose-500/40'
                      : 'border-slate-700 focus:ring-indigo-500/40 focus:border-indigo-500'
                  }`}
                >
                  <option value="" disabled>Select category...</option>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              {errors.productCategory && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.productCategory}</span>
                </p>
              )}
            </div>

            {/* Serial Number */}
            <div>
              <label htmlFor="serialNumber" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Serial Number <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="serialNumber"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  placeholder="e.g. SN-89472091-B"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
                    errors.serialNumber
                      ? 'border-rose-500 focus:ring-rose-500/40'
                      : 'border-slate-700 focus:ring-indigo-500/40 focus:border-indigo-500'
                  }`}
                />
              </div>
              {errors.serialNumber && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.serialNumber}</span>
                </p>
              )}
            </div>
          </div>

          {/* Purchase Date & Duration Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Purchase Date */}
            <div>
              <label htmlFor="purchaseDate" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Purchase Date <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  id="purchaseDate"
                  name="purchaseDate"
                  max={getTodayDateString()}
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
                    errors.purchaseDate
                      ? 'border-rose-500 focus:ring-rose-500/40'
                      : 'border-slate-700 focus:ring-indigo-500/40 focus:border-indigo-500'
                  }`}
                />
              </div>
              {errors.purchaseDate && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.purchaseDate}</span>
                </p>
              )}
            </div>

            {/* Warranty Duration */}
            <div>
              <label htmlFor="durationMonths" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Warranty Period <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Clock className="w-4 h-4" />
                </div>
                <select
                  id="durationMonths"
                  name="durationMonths"
                  value={formData.durationMonths}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all disabled:opacity-50"
                >
                  {WARRANTY_DURATION_OPTIONS.map((opt) => (
                    <option key={opt.months} value={opt.months}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Expiry Date Calculation Preview Card */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="text-xs text-slate-400 block">Calculated Expiry Date</span>
                <span className="text-sm font-semibold text-white">
                  {calculatedExpiryDate || 'Select valid purchase date'}
                </span>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
              +{formData.durationMonths} months
            </span>
          </div>

          {/* Error Banner */}
          {submitError && (
            <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-300">Transaction Failed</p>
                <p className="leading-relaxed text-slate-300">{submitError}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting to Blockchain... Please confirm in MetaMask</span>
                </>
              ) : (
                <span>Issue & Mint Warranty Record</span>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-2">
              Requires confirmation in MetaMask by an authorized seller address.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
