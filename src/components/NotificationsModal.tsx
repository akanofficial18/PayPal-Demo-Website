import React from 'react';
import { X, Bell, Split, Calendar, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { AppNotification } from '../types';
import { formatCurrency } from '../utils/currencies';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onSettleNotification: (notif: AppNotification) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onSettleNotification,
}) => {
  if (!isOpen) return null;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'split_request':
        return <Split className="w-4 h-4 text-[#0070BA]" />;
      case 'bill_due':
        return <Calendar className="w-4 h-4 text-amber-600" />;
      case 'payment_received':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#0070BA]/10 text-[#0070BA]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Notifications & Alerts</h3>
              <p className="text-xs text-slate-500">Split requests, payments, and bill updates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-500 pb-2">
          <span>{notifications.length} notifications</span>
          <button onClick={onMarkAllAsRead} className="text-[#0070BA] hover:underline font-semibold">
            Mark all read
          </button>
        </div>

        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3.5 rounded-2xl border transition ${
                n.read
                  ? 'bg-slate-50 border-slate-200 text-slate-500'
                  : 'bg-blue-50/50 border-blue-200 text-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white border border-slate-200 shrink-0">
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 truncate">{n.title}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{n.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>

                  {n.type === 'split_request' && n.amount && (
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {formatCurrency(n.amount, n.currency || 'USD')}
                      </span>
                      <button
                        onClick={() => {
                          onSettleNotification(n);
                          onClose();
                        }}
                        className="px-3 py-1 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition"
                      >
                        <span>Settle with PayPal</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
