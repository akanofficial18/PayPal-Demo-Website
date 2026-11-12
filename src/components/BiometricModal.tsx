import React, { useState, useEffect } from 'react';
import { Fingerprint, ShieldCheck, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

interface BiometricModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  requireForPayment?: boolean;
  amount?: number;
  currencySymbol?: string;
}

export const BiometricModal: React.FC<BiometricModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
  title = 'Security Verification',
  description = 'Touch sensor or enter PIN to authenticate your PayPal session',
  requireForPayment = false,
  amount,
  currencySymbol = '$',
}) => {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [pinMode, setPinMode] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setScanState('idle');
      setPinMode(false);
      setPin('');
      setPinError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulateScan = () => {
    setScanState('scanning');
    setTimeout(() => {
      setScanState('success');
      setTimeout(() => {
        onSuccess();
      }, 600);
    }, 900);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234') {
      setScanState('success');
      setTimeout(() => {
        onSuccess();
      }, 500);
    } else {
      setPinError(true);
      setPin('');
      setTimeout(() => setPinError(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm p-6 overflow-hidden border rounded-3xl bg-white border-slate-200 shadow-2xl text-center">
        <div className="inline-flex p-3 mb-3 rounded-2xl bg-[#0070BA]/10 text-[#0070BA]">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">{description}</p>

        {requireForPayment && amount !== undefined && (
          <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs uppercase tracking-wider text-slate-500">Authorizing Transfer</span>
            <div className="text-2xl font-bold text-[#0070BA]">
              {currencySymbol}{amount.toFixed(2)}
            </div>
          </div>
        )}

        {!pinMode ? (
          <div className="mt-6 flex flex-col items-center">
            <button
              onClick={handleSimulateScan}
              disabled={scanState === 'scanning' || scanState === 'success'}
              className={`relative group w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 border-2 cursor-pointer ${
                scanState === 'scanning'
                  ? 'border-[#0070BA] bg-blue-50 scale-105'
                  : scanState === 'success'
                  ? 'border-emerald-500 bg-emerald-50 scale-105'
                  : 'border-slate-200 hover:border-[#0070BA] bg-slate-50 hover:bg-blue-50/50'
              }`}
            >
              {scanState === 'scanning' && (
                <div className="absolute inset-0 rounded-full border-2 border-[#0070BA] border-t-transparent animate-spin" />
              )}
              {scanState === 'success' ? (
                <CheckCircle2 className="w-12 h-12 text-emerald-600 animate-bounce" />
              ) : (
                <Fingerprint
                  className={`w-12 h-12 transition-colors ${
                    scanState === 'scanning' ? 'text-[#0070BA]' : 'text-slate-600 group-hover:text-[#0070BA]'
                  }`}
                />
              )}
            </button>

            <span className="mt-4 text-xs font-medium text-slate-600">
              {scanState === 'idle' && 'Tap sensor to authenticate'}
              {scanState === 'scanning' && 'Verifying biometrics...'}
              {scanState === 'success' && 'Verified!'}
            </span>

            <button
              onClick={() => setPinMode(true)}
              className="mt-5 text-xs text-[#0070BA] hover:underline flex items-center gap-1.5 transition-colors font-medium"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Use Backup PIN (1234)
            </button>
          </div>
        ) : (
          <form onSubmit={handlePinSubmit} className="mt-5">
            <label className="block text-xs font-medium text-slate-500 mb-2">
              Enter 4-digit PIN (Default: 1234)
            </label>
            <input
              type="password"
              maxLength={4}
              value={pin}
              autoFocus
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-32 py-2 text-center text-2xl tracking-[0.5em] font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#0070BA]"
            />

            {pinError && (
              <div className="mt-2 text-xs text-rose-600 flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Incorrect PIN. Use 1234.
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPinMode(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
              >
                Back to Biometrics
              </button>
              <button
                type="submit"
                disabled={pin.length < 4}
                className="flex-1 py-2 text-xs font-semibold text-white bg-[#0070BA] rounded-xl hover:bg-[#005ea6] transition disabled:opacity-40"
              >
                Verify PIN
              </button>
            </div>
          </form>
        )}

        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-5 text-xs text-slate-400 hover:text-slate-600 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
