import { Bill, ReceiptItem } from '../types';
import { formatCurrency } from './currencies';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  confidence: number; // 0 - 100
  reasons: string[];
  matchedBill: Bill | null;
  matchType: 'exact' | 'high_similarity' | 'none';
  recommendation: string;
}

/**
 * Normalizes merchant names by lowercasing, removing legal suffixes (inc, llc, corp, ltd, co)
 * and special characters for fuzzy matching.
 */
export function normalizeMerchant(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|corp|corporation|ltd|limited|co|company|technologies|market|store)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Checks a newly scanned receipt's merchant, date, and amount against existing bills.
 */
export function checkDuplicateReceipt(
  newReceipt: {
    merchant: string;
    date: string;
    total: number;
    currency: string;
    items?: ReceiptItem[];
  },
  existingBills: Bill[]
): DuplicateCheckResult {
  if (!newReceipt.merchant || !newReceipt.total || existingBills.length === 0) {
    return {
      isDuplicate: false,
      confidence: 0,
      reasons: [],
      matchedBill: null,
      matchType: 'none',
      recommendation: '',
    };
  }

  const normNewMerchant = normalizeMerchant(newReceipt.merchant);
  const newDate = newReceipt.date ? newReceipt.date.split('T')[0] : '';
  const newTotal = Math.round(newReceipt.total * 100) / 100;

  for (const existing of existingBills) {
    const normExistingMerchant = normalizeMerchant(existing.merchant);
    const existingDate = existing.date ? existing.date.split('T')[0] : '';
    const existingTotal = Math.round(existing.total * 100) / 100;

    const reasons: string[] = [];
    let score = 0;

    // 1. Merchant Match
    const exactMerchant = normNewMerchant.length > 2 && normNewMerchant === normExistingMerchant;
    const partialMerchant =
      normNewMerchant.length > 2 &&
      normExistingMerchant.length > 2 &&
      (normNewMerchant.includes(normExistingMerchant) || normExistingMerchant.includes(normNewMerchant));

    if (exactMerchant) {
      score += 45;
      reasons.push(`Merchant match: "${existing.merchant}"`);
    } else if (partialMerchant) {
      score += 35;
      reasons.push(`Similar merchant name: "${existing.merchant}"`);
    }

    // 2. Amount Match (accounting for small rounding or tax tolerance)
    const amountDiff = Math.abs(newTotal - existingTotal);
    const sameCurrency = (newReceipt.currency || '').toUpperCase() === (existing.currency || '').toUpperCase();

    if (amountDiff === 0 && sameCurrency) {
      score += 45;
      reasons.push(`Exact amount match: ${formatCurrency(existing.total, existing.currency)}`);
    } else if (amountDiff < 0.1 && sameCurrency) {
      score += 35;
      reasons.push(`Amount nearly identical (within $0.10): ${formatCurrency(existing.total, existing.currency)}`);
    }

    // 3. Date Match
    if (newDate && existingDate) {
      if (newDate === existingDate) {
        score += 20;
        reasons.push(`Identical transaction date: ${existingDate}`);
      } else {
        // Within 1 day (e.g. late night dining or UTC offset)
        const d1 = new Date(newDate).getTime();
        const d2 = new Date(existingDate).getTime();
        const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
        if (diffDays <= 1) {
          score += 10;
          reasons.push(`Date within 24 hours of existing entry (${existingDate})`);
        }
      }
    }

    // 4. Line Items Overlap Check (if available)
    if (newReceipt.items && existing.items && newReceipt.items.length > 0 && existing.items.length > 0) {
      const newNames = newReceipt.items.map((i) => i.name.toLowerCase());
      const existingNames = existing.items.map((i) => i.name.toLowerCase());
      const overlapping = newNames.filter((name) =>
        existingNames.some((ex) => ex.includes(name) || name.includes(ex))
      );
      if (overlapping.length > 0) {
        score += 15;
        reasons.push(`${overlapping.length} line items overlap (e.g. "${overlapping[0]}")`);
      }
    }

    // Clamp score
    const confidence = Math.min(score, 100);

    if (confidence >= 80) {
      return {
        isDuplicate: true,
        confidence,
        reasons,
        matchedBill: existing,
        matchType: 'exact',
        recommendation: `This receipt appears to be an exact duplicate of "${existing.merchant}" scanned on ${existing.date}. Discarding is recommended to avoid double billing.`,
      };
    } else if (confidence >= 65) {
      return {
        isDuplicate: true,
        confidence,
        reasons,
        matchedBill: existing,
        matchType: 'high_similarity',
        recommendation: `High similarity detected with an existing bill from "${existing.merchant}". Please verify before adding.`,
      };
    }
  }

  return {
    isDuplicate: false,
    confidence: 0,
    reasons: [],
    matchedBill: null,
    matchType: 'none',
    recommendation: '',
  };
}
