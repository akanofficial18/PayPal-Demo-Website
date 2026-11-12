import React, { useState } from 'react';
import { Globe, ArrowRightLeft, TrendingUp, ChevronDown, Check } from 'lucide-react';
import { SUPPORTED_COUNTRIES, CountryCurrency, formatCurrency, convertCurrency } from '../utils/currencies';

interface TravelCurrencyBarProps {
  currentCountry: CountryCurrency;
  onSelectCountry: (country: CountryCurrency) => void;
  baseWalletBalance: number;
  baseCurrency: string;
  liveRates?: Record<string, { rate: number; symbol: string; name: string }>;
}

export const TravelCurrencyBar: React.FC<TravelCurrencyBarProps> = ({
  currentCountry,
  onSelectCountry,
  baseWalletBalance,
  baseCurrency,
  liveRates,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showQuickConvert, setShowQuickConvert] = useState(false);
  const [quickAmount, setQuickAmount] = useState('100');

  const localBalance = convertCurrency(baseWalletBalance, baseCurrency, currentCountry.currencyCode, liveRates);
  const currentRate = convertCurrency(1, baseCurrency, currentCountry.currencyCode, liveRates);
  const convertedQuick = convertCurrency(parseFloat(quickAmount) || 0, baseCurrency, currentCountry.currencyCode, liveRates);

  return (
    <div className="w-full rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Country & Location indicator */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#0070BA] transition"
            >
              <div className="w-6 h-6 rounded-md bg-[#0070BA] text-white font-bold text-[10px] flex items-center justify-center">
                {currentCountry.code}
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5 text-[#0070BA]" />
                  Travel Location
                </div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  {currentCountry.name} ({currentCountry.currencyCode})
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
              </div>
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute left-0 mt-2 z-50 w-64 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1 text-[10px] uppercase font-semibold text-slate-400">
                    Switch Destination Country
                  </div>
                  {SUPPORTED_COUNTRIES.map((c) => {
                    const isSelected = c.code === currentCountry.code;
                    return (
                      <button
                        key={c.code}
                        onClick={() => {
                          onSelectCountry(c);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                          isSelected
                            ? 'bg-[#0070BA]/10 text-[#0070BA] font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                            {c.code}
                          </span>
                          <span className="truncate">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                          <span>{c.currencyCode}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#0070BA]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* FX rate badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              1 {baseCurrency} = {currentCountry.currencySymbol}
              {currentRate.toFixed(currentCountry.decimals === 0 ? 0 : 2)} {currentCountry.currencyCode}
            </span>
          </div>
        </div>

        {/* Live Multi-Currency Balance Display */}
        <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div className="text-left md:text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
              Bank Balance in {currentCountry.currencyCode}
            </span>
            <div className="text-lg md:text-xl font-bold text-[#0070BA] font-mono tracking-tight flex items-center gap-1">
              <span>{formatCurrency(localBalance, currentCountry.currencyCode)}</span>
              {currentCountry.currencyCode !== baseCurrency && (
                <span className="text-xs text-slate-400 font-normal">
                  ({formatCurrency(baseWalletBalance, baseCurrency)})
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowQuickConvert(!showQuickConvert)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Quick Currency Converter"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Quick Currency Converter */}
      {showQuickConvert && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Convert:</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={quickAmount}
                onChange={(e) => setQuickAmount(e.target.value)}
                className="w-24 pl-6 pr-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-[#0070BA]"
              />
            </div>
            <span className="text-slate-600 font-medium">{baseCurrency}</span>
          </div>

          <div className="flex items-center gap-1.5 font-bold text-[#0070BA] font-mono">
            <span>=</span>
            <span>{formatCurrency(convertedQuick, currentCountry.currencyCode)}</span>
          </div>

          <div className="ml-auto text-[11px] text-slate-500">
            PayPal Global Rate Guarantee
          </div>
        </div>
      )}
    </div>
  );
};
