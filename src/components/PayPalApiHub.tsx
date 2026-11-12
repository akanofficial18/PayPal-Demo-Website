import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Send,
  FileText,
  Repeat,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Plus,
  Zap,
  Code2,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  PayPalOrder,
  PayPalInvoice,
  PayPalPayoutBatch,
  PayPalSubscriptionPlan,
  PayPalDispute,
  PayPalWebhookEvent,
  UserProfile,
  Friend,
} from '../types';
import {
  INITIAL_PAYPAL_ORDERS,
  INITIAL_PAYPAL_INVOICES,
  INITIAL_PAYPAL_PAYOUTS,
  INITIAL_PAYPAL_SUBSCRIPTION_PLANS,
  INITIAL_PAYPAL_DISPUTES,
  INITIAL_WEBHOOK_LOGS,
} from '../utils/mockData';
import { formatCurrency } from '../utils/currencies';

interface PayPalApiHubProps {
  currentUser: UserProfile;
  friends: Friend[];
  onOrderSettled?: (amount: number, description: string) => void;
}

type SubTab = 'orders' | 'invoicing' | 'payouts' | 'subscriptions' | 'disputes' | 'webhooks';

export const PayPalApiHub: React.FC<PayPalApiHubProps> = ({
  currentUser,
  friends,
  onOrderSettled,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('orders');
  const [loading, setLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Data states
  const [orders, setOrders] = useState<PayPalOrder[]>(INITIAL_PAYPAL_ORDERS);
  const [invoices, setInvoices] = useState<PayPalInvoice[]>(INITIAL_PAYPAL_INVOICES);
  const [payouts, setPayouts] = useState<PayPalPayoutBatch[]>(INITIAL_PAYPAL_PAYOUTS);
  const [plans, setPlans] = useState<PayPalSubscriptionPlan[]>(INITIAL_PAYPAL_SUBSCRIPTION_PLANS);
  const [disputes, setDisputes] = useState<PayPalDispute[]>(INITIAL_PAYPAL_DISPUTES);
  const [webhooks, setWebhooks] = useState<PayPalWebhookEvent[]>(INITIAL_WEBHOOK_LOGS);

  // New Order Form Modal/State
  const [orderAmount, setOrderAmount] = useState('35.00');
  const [orderCurrency, setOrderCurrency] = useState('USD');
  const [orderDescription, setOrderDescription] = useState('Dinner Bill Share');

  // New Invoice Form State
  const [invRecipientEmail, setInvRecipientEmail] = useState('sarah.chen@paypal.com');
  const [invRecipientName, setInvRecipientName] = useState('Sarah Chen');
  const [invItemName, setInvItemName] = useState('Tokyo Izakaya Split');
  const [invItemAmount, setInvItemAmount] = useState('42.50');

  // JSON viewer payload modal
  const [inspectedJson, setInspectedJson] = useState<{ title: string; data: any } | null>(null);

  // Dismiss banner after 4 seconds
  useEffect(() => {
    if (actionSuccessMsg) {
      const t = setTimeout(() => setActionSuccessMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [actionSuccessMsg]);

  // ==========================
  // 1. ORDERS API
  // ==========================
  const handleCreateOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/paypal/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(orderAmount) || 35.0,
          currency: orderCurrency,
          description: orderDescription,
        }),
      });
      const newOrder = await res.json();
      setOrders([newOrder, ...orders]);
      setLoading(false);
      setActionSuccessMsg(`Order ${newOrder.id} created successfully via PayPal Orders v2 API!`);
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
    } catch {
      setLoading(false);
    }
  };

  const handleCaptureOrder = async (orderId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/paypal/orders/${orderId}/capture`, {
        method: 'POST',
      });
      const data = await res.json();
      setLoading(false);

      setOrders(
        orders.map((o) => (o.id === orderId ? { ...o, status: 'COMPLETED' } : o))
      );

      setActionSuccessMsg(`Captured Order ${orderId}! Funds credited.`);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      if (onOrderSettled) {
        onOrderSettled(35.0, `PayPal Order ${orderId}`);
      }
    } catch {
      setLoading(false);
    }
  };

  // ==========================
  // 2. INVOICING API
  // ==========================
  const handleCreateInvoice = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/paypal/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: invRecipientEmail,
          recipient_name: invRecipientName,
          items: [
            {
              name: invItemName,
              quantity: 1,
              unit_amount: { currency_code: 'USD', value: invItemAmount },
            },
          ],
          currency: 'USD',
          note: 'PaySplit AI itemized invoice',
        }),
      });
      const invoice = await res.json();
      setInvoices([invoice, ...invoices]);
      setLoading(false);
      setActionSuccessMsg(`Invoice ${invoice.invoice_number} created via PayPal Invoicing v2!`);
    } catch {
      setLoading(false);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/paypal/invoices/${invoiceId}/send`, { method: 'POST' });
      const data = await res.json();
      setLoading(false);
      setInvoices(
        invoices.map((inv) => (inv.id === invoiceId ? { ...inv, status: 'SENT' } : inv))
      );
      setActionSuccessMsg(`Invoice ${invoiceId} sent to recipient with shareable payment link!`);
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
    } catch {
      setLoading(false);
    }
  };

  // ==========================
  // 3. PAYOUTS API (Batch settlement)
  // ==========================
  const handleExecuteBatchPayout = async () => {
    setLoading(true);
    // Find friends who are owed money
    const payoutFriends = friends.filter((f) => f.netBalance < 0);
    const items = payoutFriends.length > 0
      ? payoutFriends.map((f) => ({
          receiver: f.email,
          recipient_name: f.name,
          amount: { value: Math.abs(f.netBalance).toFixed(2), currency: 'USD' },
          note: 'PaySplit AI Batch Reimbursement',
        }))
      : [
          {
            receiver: 'sarah.chen@paypal.com',
            recipient_name: 'Sarah Chen',
            amount: { value: '18.00', currency: 'USD' },
            note: 'Transit reimbursement',
          },
        ];

    try {
      const res = await fetch('/api/paypal/payouts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, currency: 'USD' }),
      });
      const data = await res.json();
      setLoading(false);
      if (data.batch) {
        setPayouts([data.batch, ...payouts]);
      }
      setActionSuccessMsg(`PayPal Batch Payout executed! Reimbursed ${items.length} friend(s).`);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
    } catch {
      setLoading(false);
    }
  };

  // ==========================
  // 4. DISPUTE AI RESOLUTION
  // ==========================
  const handleProvideEvidence = async (disputeId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/paypal/disputes/${disputeId}/provide-evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_type: 'RECEIPT_OCR_VERIFICATION',
          notes: 'AI scanned line items prove accurate split calculation.',
        }),
      });
      const data = await res.json();
      setLoading(false);
      setDisputes(
        disputes.map((d) => (d.dispute_id === disputeId ? { ...d, status: 'UNDER_REVIEW' } : d))
      );
      setActionSuccessMsg(`AI Receipt evidence dispatched to PayPal Resolution Center!`);
    } catch {
      setLoading(false);
    }
  };

  // ==========================
  // 5. SIMULATE WEBHOOK
  // ==========================
  const handleSimulateWebhook = async (eventType: string, summary: string) => {
    try {
      const res = await fetch('/api/paypal/webhooks/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, summary }),
      });
      const data = await res.json();
      if (data.event) {
        setWebhooks([data.event, ...webhooks]);
        setActionSuccessMsg(`Simulated webhook dispatched: ${eventType}`);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: PayPal Hackathon Platform Status */}
      <div className="bg-gradient-to-r from-[#001C3F] via-[#003087] to-[#0070BA] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-white/5 transform skew-x-12 pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>PayPal Developer Sandbox</span>
              </span>
              <span className="text-xs font-mono text-blue-200">v2 REST APIs</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>PayPal AI Developer Hub</span>
              <Sparkles className="w-5 h-5 text-[#00CFDE]" />
            </h1>
            <p className="text-xs text-blue-100 max-w-xl mt-1">
              Test and trigger full PayPal APIs powering PaySplit AI: Orders v2, Invoicing v2, Payouts v1, Subscriptions, Disputes, and Webhook dispatchers.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#003087] font-black italic text-lg shadow-sm">
              P
            </div>
            <div>
              <div className="text-xs font-bold text-white">OAuth 2.0 Auth</div>
              <div className="text-[10px] text-emerald-300 font-mono">Status: Connected</div>
            </div>
          </div>
        </div>

        {/* Global Action Success Toast */}
        {actionSuccessMsg && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-500/90 text-white text-xs font-bold flex items-center gap-2 shadow-lg animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === 'orders'
              ? 'bg-[#0070BA] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Orders v2</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('invoicing')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === 'invoicing'
              ? 'bg-[#0070BA] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Invoicing v2</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
            {invoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('payouts')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === 'payouts'
              ? 'bg-[#0070BA] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Batch Payouts v1</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
            {payouts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('subscriptions')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === 'subscriptions'
              ? 'bg-[#0070BA] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span>Subscriptions v1</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
            {plans.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('disputes')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === 'disputes'
              ? 'bg-[#0070BA] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Disputes & AI</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
            {disputes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('webhooks')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === 'webhooks'
              ? 'bg-[#0070BA] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Webhooks Monitor</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
            {webhooks.length}
          </span>
        </button>
      </div>

      {/* SUB-TAB 1: ORDERS V2 */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          {/* Create Order Quick Action Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#0070BA]" />
                  <span>Create PayPal Checkout Order (v2/checkout/orders)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generates an authorized PayPal Order token with purchase units and dynamic HATEOAS capture links.
                </p>
              </div>

              <button
                onClick={handleCreateOrder}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create Order</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Amount</label>
                <input
                  type="number"
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0070BA]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Currency</label>
                <select
                  value={orderCurrency}
                  onChange={(e) => setOrderCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0070BA]"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Description / Bill Memo</label>
                <input
                  type="text"
                  value={orderDescription}
                  onChange={(e) => setOrderDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0070BA]"
                />
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Live PayPal Orders Ledger</h3>
            <div className="space-y-3">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-300 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{ord.id}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          ord.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Intent: <span className="font-mono">{ord.intent}</span> • Payer:{' '}
                      {ord.payer ? `${ord.payer.name?.given_name} (${ord.payer.email_address})` : 'Anonymous Guest'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Created: {new Date(ord.create_time).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <div className="text-right mr-2">
                      <div className="text-base font-black text-slate-900">
                        {ord.amount.currency_code} {ord.amount.value}
                      </div>
                    </div>

                    <button
                      onClick={() => setInspectedJson({ title: `Order ${ord.id}`, data: ord })}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
                      title="Inspect API JSON"
                    >
                      <Code2 className="w-4 h-4" />
                    </button>

                    {ord.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleCaptureOrder(ord.id)}
                        disabled={loading}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Capture Funds</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: INVOICING V2 */}
      {activeSubTab === 'invoicing' && (
        <div className="space-y-4">
          {/* Create Invoice Form */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0070BA]" />
                  <span>Draft Digital Split Invoice (v2/invoicing/invoices)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Creates an itemized PayPal invoice with automatic tax, tip, and shareable web link.
                </p>
              </div>

              <button
                onClick={handleCreateInvoice}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create Draft Invoice</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={invRecipientName}
                  onChange={(e) => setInvRecipientName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0070BA]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Recipient Email</label>
                <input
                  type="email"
                  value={invRecipientEmail}
                  onChange={(e) => setInvRecipientEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0070BA]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Item Title</label>
                <input
                  type="text"
                  value={invItemName}
                  onChange={(e) => setInvItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0070BA]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Amount ($)</label>
                <input
                  type="number"
                  value={invItemAmount}
                  onChange={(e) => setInvItemAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0070BA]"
                />
              </div>
            </div>
          </div>

          {/* Invoices List */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Issued Digital Invoices</h3>
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-300 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{inv.invoice_number}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'SENT'
                            ? 'bg-blue-100 text-[#0070BA]'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      To: <span className="font-bold">{inv.recipient_name}</span> ({inv.recipient_email})
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Items: {inv.items.map((it) => `${it.name} ($${it.unit_amount.value})`).join(', ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <div className="text-right mr-2">
                      <div className="text-base font-black text-slate-900">
                        ${inv.total_amount.value}
                      </div>
                      <div className="text-[10px] text-slate-400">Due {inv.due_date}</div>
                    </div>

                    <button
                      onClick={() => setInspectedJson({ title: `Invoice ${inv.invoice_number}`, data: inv })}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
                      title="Inspect API JSON"
                    >
                      <Code2 className="w-4 h-4" />
                    </button>

                    {inv.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSendInvoice(inv.id)}
                        disabled={loading}
                        className="px-3.5 py-1.5 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send via PayPal</span>
                      </button>
                    )}

                    {inv.shareable_link && (
                      <a
                        href={inv.shareable_link}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-white border border-slate-200 text-[#0070BA] hover:bg-blue-50 text-xs font-bold transition"
                        title="View Public Payment Link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: BATCH PAYOUTS V1 */}
      {activeSubTab === 'payouts' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#0070BA]" />
                  <span>PayPal Batch Payouts (v1/payments/payouts)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  Disburse split settlements directly into friends' PayPal accounts simultaneously with 1 batch API call. Eliminates manual one-by-one transfers.
                </p>
              </div>

              <button
                onClick={handleExecuteBatchPayout}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#003087] to-[#0070BA] hover:from-[#00266e] hover:to-[#005ea6] text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Zap className="w-4 h-4 text-[#00CFDE]" />
                <span>Execute Batch Payout</span>
              </button>
            </div>
          </div>

          {/* Payout Batches List */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Batch Disbursements History</h3>
            <div className="space-y-4">
              {payouts.map((batch) => (
                <div key={batch.payout_batch_id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{batch.payout_batch_id}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                          {batch.batch_status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Batch ID: {batch.sender_batch_header.sender_batch_id} • Created:{' '}
                        {new Date(batch.time_created).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-base font-black text-slate-900">
                          ${batch.total_amount.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">Total</span>
                      </div>
                      <button
                        onClick={() => setInspectedJson({ title: `Payout ${batch.payout_batch_id}`, data: batch })}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Recipient Item Rows */}
                  <div className="space-y-2">
                    {batch.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-50 text-[#0070BA] font-bold flex items-center justify-center text-[10px]">
                            {item.recipient_name?.slice(0, 2).toUpperCase() || 'P'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{item.recipient_name}</div>
                            <div className="text-[11px] text-slate-400">{item.receiver}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold text-emerald-600">
                            +${parseFloat(item.amount.value).toFixed(2)}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                            {item.transaction_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SUBSCRIPTIONS & RECURRING BILLS */}
      {activeSubTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Repeat className="w-4 h-4 text-[#0070BA]" />
              <span>PayPal Subscriptions v1 (Shared Utilities & Memberships)</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Automate monthly shared splits for utilities, streaming services, and rent with PayPal recurring billing agreements.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((pl) => (
                <div key={pl.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-slate-700">{pl.id}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                        {pl.status}
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-900">{pl.name}</div>
                    <p className="text-xs text-slate-500 mt-1">{pl.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-lg font-black text-slate-900">
                        ${pl.billing_cycles[0].pricing_scheme.fixed_price.value}
                      </span>
                      <span className="text-xs text-slate-500"> / month</span>
                    </div>

                    <button
                      onClick={() => {
                        setActionSuccessMsg(`Created PayPal subscription agreement for ${pl.name}!`);
                        confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs shadow-xs transition cursor-pointer"
                    >
                      Subscribe
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: DISPUTES & AI EVIDENCE */}
      {activeSubTab === 'disputes' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>PayPal Customer Disputes & AI Claim Resolution</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              When split participants dispute an expenditure, PaySplit AI compares OCR itemized tokens against transaction records and submits verifiable evidence automatically.
            </p>

            <div className="space-y-3">
              {disputes.map((disp) => (
                <div key={disp.dispute_id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{disp.dispute_id}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase">
                        {disp.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-sm font-black text-rose-600">
                      Disputed: ${disp.dispute_amount.value} {disp.dispute_amount.currency_code}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 font-semibold mb-2">
                    Reason: {disp.reason.replace(/_/g, ' ')}
                  </div>

                  {disp.aiAnalysisSummary && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 mb-3 text-xs text-blue-900">
                      <span className="font-bold flex items-center gap-1 mb-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#0070BA]" />
                        <span>AI Evidence Recommendation:</span>
                      </span>
                      {disp.aiAnalysisSummary}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setInspectedJson({ title: `Dispute ${disp.dispute_id}`, data: disp })}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
                    >
                      Inspect Data
                    </button>
                    {disp.status !== 'UNDER_REVIEW' && (
                      <button
                        onClick={() => handleProvideEvidence(disp.dispute_id)}
                        disabled={loading}
                        className="px-4 py-1.5 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Submit AI Evidence</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: LIVE WEBHOOKS MONITOR */}
      {activeSubTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#0070BA]" />
                  <span>Real-Time PayPal Webhooks Event Stream</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live asynchronous event listeners for captures, payouts, and automated invoice settlements.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSimulateWebhook('PAYMENT.CAPTURE.COMPLETED', 'Captured $42.50 USD from Sarah Chen')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Simulate Capture
                </button>
                <button
                  onClick={() => handleSimulateWebhook('INVOICING.INVOICE.PAID', 'Invoice INV-2026-0042 paid by Rahul Sharma')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Simulate Invoice Paid
                </button>
              </div>
            </div>

            <div className="space-y-2 font-mono">
              {webhooks.map((wh) => (
                <div
                  key={wh.id}
                  className="p-3 rounded-xl bg-slate-900 text-slate-100 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-bold text-[#00CFDE]">{wh.event_type}</span>
                    <span className="text-slate-400">({wh.id})</span>
                  </div>

                  <div className="text-slate-300 font-sans text-xs">{wh.summary}</div>

                  <span className="text-[10px] text-slate-500 shrink-0">
                    {new Date(wh.create_time).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* JSON Inspector Modal */}
      {inspectedJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 text-slate-100 border border-slate-700 rounded-3xl p-6 max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#00CFDE]" />
                <span className="text-xs font-bold font-mono text-white">{inspectedJson.title}</span>
              </div>
              <button
                onClick={() => setInspectedJson(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex-1 overflow-auto mt-4 p-3 bg-black/40 rounded-xl font-mono text-[11px] leading-relaxed text-emerald-400">
              <pre>{JSON.stringify(inspectedJson.data, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
