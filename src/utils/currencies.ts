export interface CountryCurrency {
  code: string;
  name: string;
  currencyCode: string;
  currencySymbol: string;
  defaultRateToUSD: number;
  decimals: number;
}

export const SUPPORTED_COUNTRIES: CountryCurrency[] = [
  { code: 'US', name: 'United States', currencyCode: 'USD', currencySymbol: '$', defaultRateToUSD: 1.0, decimals: 2 },
  { code: 'JP', name: 'Japan', currencyCode: 'JPY', currencySymbol: '¥', defaultRateToUSD: 154.2, decimals: 0 },
  { code: 'IN', name: 'India', currencyCode: 'INR', currencySymbol: '₹', defaultRateToUSD: 86.4, decimals: 2 },
  { code: 'GB', name: 'United Kingdom', currencyCode: 'GBP', currencySymbol: '£', defaultRateToUSD: 0.78, decimals: 2 },
  { code: 'EU', name: 'Eurozone', currencyCode: 'EUR', currencySymbol: '€', defaultRateToUSD: 0.92, decimals: 2 },
  { code: 'SG', name: 'Singapore', currencyCode: 'SGD', currencySymbol: 'S$', defaultRateToUSD: 1.34, decimals: 2 },
  { code: 'AE', name: 'United Arab Emirates', currencyCode: 'AED', currencySymbol: 'AED', defaultRateToUSD: 3.67, decimals: 2 },
  { code: 'TH', name: 'Thailand', currencyCode: 'THB', currencySymbol: 'THB', defaultRateToUSD: 34.8, decimals: 2 },
  { code: 'CA', name: 'Canada', currencyCode: 'CAD', currencySymbol: 'CA$', defaultRateToUSD: 1.39, decimals: 2 },
  { code: 'AU', name: 'Australia', currencyCode: 'AUD', currencySymbol: 'A$', defaultRateToUSD: 1.53, decimals: 2 },
  { code: 'CH', name: 'Switzerland', currencyCode: 'CHF', currencySymbol: 'CHF', defaultRateToUSD: 0.88, decimals: 2 },
];

export function getCurrencyInfo(currencyCode: string): CountryCurrency {
  const found = SUPPORTED_COUNTRIES.find((c) => c.currencyCode.toUpperCase() === currencyCode.toUpperCase());
  if (found) return found;
  return {
    code: currencyCode.substring(0, 2).toUpperCase(),
    name: currencyCode,
    currencyCode: currencyCode.toUpperCase(),
    currencySymbol: currencyCode.toUpperCase(),
    defaultRateToUSD: 1.0,
    decimals: 2,
  };
}

export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  const info = getCurrencyInfo(currencyCode);
  const formattedNumber = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: info.decimals,
    maximumFractionDigits: info.decimals,
  });
  const prefix = amount < 0 ? '-' : '';
  return `${prefix}${info.currencySymbol}${formattedNumber}`;
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  liveRates?: Record<string, { rate: number }>
): number {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return amount;

  const getRate = (code: string) => {
    if (liveRates && liveRates[code.toUpperCase()]) {
      return liveRates[code.toUpperCase()].rate;
    }
    const info = getCurrencyInfo(code);
    return info.defaultRateToUSD;
  };

  const rateFrom = getRate(fromCurrency);
  const rateTo = getRate(toCurrency);

  const inUSD = amount / rateFrom;
  return inUSD * rateTo;
}
