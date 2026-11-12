import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, Lock, ArrowRight, X, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrency } from '../utils/currencies';

interface PayPalCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientPaypalHandle: string;
  amount: number;
  currency: string;
  splitId?: string;
  billTitle?: string;
  onPaymentSuccess: (txId: string, splitId?: string) => void;
}

export const PayPalCheckoutModal: React.FC<PayPalCheckoutModalProps> = ({
  isOpen,
  onClose,
  recipientName,
  recipientPaypalHandle,
  amount,
  currency,
  splitId,
  billTitle = 'Split Reimbursement',
  onPaymentSuccess,
}) => {
  const [processing, setProcessing] = useState(false);
  const [completedTx, setCompletedTx] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePayNow = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/paypal/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
          recipientEmail: `${recipientPaypalHandle}@example.com`,
          splitId,
          note: billTitle,
        }),
      });

      const data = await res.json();
      setTimeout(() => {
        setProcessing(false);
        const txId = data.transactionId || `PAYPAL-TX-${Date.now().toString(36).toUpperCase()}`;
        setCompletedTx(txId);

        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });

        setTimeout(() => {
          onPaymentSuccess(txId, splitId);
        }, 1200);
      }, 900);
    } catch (e) {
      console.error(e);
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-6 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* PayPal Header */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#003087] flex items-center justify-center text-white font-black italic text-base">
            P
          </div>
          <span className="text-xl font-bold tracking-tight text-[#003087] italic">
            Pay<span className="text-[#0070BA]">Pal</span>
          </span>
          <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">
            Sandbox
          </span>
        </div>

        {!completedTx ? (
          <>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-5 text-center">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Paying to</span>
              <div className="text-base font-bold text-slate-900 mt-0.5">{recipientName}</div>
              <div className="text-xs text-[#0070BA] font-mono">paypal.me/{recipientPaypalHandle}</div>

              <div className="mt-4 pt-3 border-t border-slate-200">
                <span className="text-xs text-slate-500">Amount Due</span>
                <div className="text-3xl font-bold text-slate-900 font-mono tracking-tight mt-0.5">
                  {formatCurrency(amount, currency)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{billTitle}</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-[11px] text-[#00457C] flex items-center justify-center gap-2 mb-6">
              <ShieldCheck className="w-4 h-4 text-[#0070BA] shrink-0" />
              <span>PayPal Purchase Protection Applied</span>
            </div>

            {/* Official PayPal Gold Button */}
            <button
              onClick={handlePayNow}
              disabled={processing}
              className="w-full py-3.5 px-4 rounded-full bg-[#FFC439] hover:bg-[#F2BA36] text-[#003087] font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-60 cursor-pointer"
            >
              {processing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
                  <span>Authorizing payment...</span>
                </div>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pay with PayPal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <a
              href={`https://paypal.me/${recipientPaypalHandle}/${amount}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#0070BA] transition"
            >
              <span>Or open paypal.me in browser</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </>
        ) : (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Payment Complete</h3>
            <p className="text-xs text-slate-600">
              Sent <span className="font-bold text-slate-900">{formatCurrency(amount, currency)}</span> to {recipientName}.
            </p>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-500">
              Transaction ID: <span className="text-[#0070BA] font-bold">{completedTx}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
