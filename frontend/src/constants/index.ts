import type { NavItem } from '../types';


export const APP_CONFIG = {
  appName: 'ChainWarranty',
  tagline: 'Blockchain-Based Digital Warranty Card System',
  version: '1.0.0',
} as const;

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Overview and status summary' },
  { id: 'issue', label: 'Issue Warranty', description: 'Create a new warranty record' },
  { id: 'verify', label: 'Verify Warranty', description: 'Authenticate by warranty ID' },
  { id: 'list', label: 'Warranty List', description: 'Browse and search warranty records' },
] as const;

export const PRODUCT_CATEGORIES: readonly string[] = [
  'Electronics & Gadgets',
  'Home Appliances',
  'Laptops & Computers',
  'Automotive & Spares',
  'Watches & Wearables',
  'Other',
] as const;

export const WARRANTY_DURATION_OPTIONS: readonly { label: string; months: number }[] = [
  { label: '6 Months', months: 6 },
  { label: '1 Year (12 Months)', months: 12 },
  { label: '2 Years (24 Months)', months: 24 },
  { label: '3 Years (36 Months)', months: 36 },
  { label: '5 Years (60 Months)', months: 60 },
] as const;
