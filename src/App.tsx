import React, { useState, useEffect } from 'react';
import {
  Scan,
  CreditCard,
  Users,
  Bot,
  Bell,
  Lock,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Sparkles,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Clock,
  WifiOff,
  Wifi,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Search,
  Wallet,
  ArrowRight,
  Receipt,
  PiggyBank,
  History,
  Check,
  Split,
  AlertTriangle,
  LogOut,
} from 'lucide-react';
import {
  UserProfile,
  Friend,
  Bill,
  GroupBudget,
  RecurringBill,
  SavingsChallenge,
  AppNotification,
} from './types';
import {
  INITIAL_USER,
  DEMO_PERSONAS,
  INITIAL_FRIENDS,
  INITIAL_GROUP_BUDGETS,
  INITIAL_BILLS,
  INITIAL_RECURRING_BILLS,
  INITIAL_SAVINGS_CHALLENGES,
  INITIAL_NOTIFICATIONS,
} from './utils/mockData';
import {
  SUPPORTED_COUNTRIES,
  CountryCurrency,
  formatCurrency,
  convertCurrency,
} from './utils/currencies';

// Component imports
import { TravelCurrencyBar } from './components/TravelCurrencyBar';
import { BillScannerModal } from './components/BillScannerModal';
import { QRModal } from './components/QRModal';
import { PayPalCheckoutModal } from './components/PayPalCheckoutModal';
import { BiometricModal } from './components/BiometricModal';
import { AICompanionDrawer } from './components/AICompanionDrawer';
import { DebtGraphVisualizer } from './components/DebtGraphVisualizer';
import { GroupBudgetModal } from './components/GroupBudgetModal';
import { NotificationsModal } from './components/NotificationsModal';
import { SavingsChallengesCard } from './components/SavingsChallengesCard';
import { LoginPage } from './components/LoginPage';
import { PayPalApiHub } from './components/PayPalApiHub';

type TabKey = 'home' | 'scanner' | 'paypal' | 'pots' | 'dues' | 'transactions' | 'savings';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('paysplit_logged_in') === 'true';
  });

  const [currentPersonaKey, setCurrentPersonaKey] = useState<string>('user_alex');
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USER);

  const [friends, setFriends] = useState<Friend[]>(INITIAL_FRIENDS);
  const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS);
  const [groupBudgets, setGroupBudgets] = useState<GroupBudget[]>(INITIAL_GROUP_BUDGETS);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>(INITIAL_RECURRING_BILLS);
  const [savingsChallenges, setSavingsChallenges] = useState<SavingsChallenge[]>(INITIAL_SAVINGS_CHALLENGES);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);

  // Active Travel Country
  const [currentCountry, setCurrentCountry] = useState<CountryCurrency>(SUPPORTED_COUNTRIES[1]);

  // Active Tab: distinct views for each feature
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  // Transactions filter
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txFilter, setTxFilter] = useState<'all' | 'paid_by_me' | 'split_with_me'>('all');

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [qrInitialMode, setQrInitialMode] = useState<'my_qr' | 'scan'>('my_qr');
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [isAICompanionOpen, setIsAICompanionOpen] = useState(false);
  const [isGroupBudgetModalOpen, setIsGroupBudgetModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);

  // PayPal Checkout State
  const [checkoutTarget, setCheckoutTarget] = useState<{
    isOpen: boolean;
    recipientName: string;
    recipientPaypalHandle: string;
    amount: number;
    currency: string;
    splitId?: string;
    billTitle?: string;
  }>({
    isOpen: false,
    recipientName: '',
    recipientPaypalHandle: '',
    amount: 0,
    currency: 'USD',
  });

  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [pendingOfflineSyncCount, setPendingOfflineSyncCount] = useState(0);
  const [liveRates, setLiveRates] = useState<Record<string, { rate: number; symbol: string; name: string }>>({});

  useEffect(() => {
    fetch('/api/exchange-rates')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rates) {
          setLiveRates(data.rates);
        }
      })
      .catch((err) => console.warn('Exchange rates fetch:', err));
  }, []);

  const handleSwitchPersona = (key: string) => {
    setCurrentPersonaKey(key);
    const p = DEMO_PERSONAS[key] || INITIAL_USER;
    setCurrentUser(p);
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setCurrentPersonaKey(user.id);
    setIsLoggedIn(true);
    localStorage.setItem('paysplit_logged_in', 'true');
    localStorage.setItem('paysplit_user_id', user.id);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('paysplit_logged_in');
  };

  const totalSpentUSD = bills.reduce((acc, b) => acc + (b.convertedTotal || b.total), 0);
  const todaySpentUSD = bills
    .filter((b) => b.date === '2026-11-11' || b.date === new Date().toISOString().split('T')[0])
    .reduce((acc, b) => acc + (b.convertedTotal || b.total), 0);

  const totalOwedToMe = friends.filter((f) => f.netBalance > 0).reduce((acc, f) => acc + f.netBalance, 0);
  const totalIOwe = friends.filter((f) => f.netBalance < 0).reduce((acc, f) => acc + Math.abs(f.netBalance), 0);

  const handleSaveBill = (newBill: Bill) => {
    if (isOfflineMode) {
      setPendingOfflineSyncCount((prev) => prev + 1);
    }

    setBills([newBill, ...bills]);

    if (newBill.splits && newBill.splits.length > 0) {
      const updatedFriends = friends.map((f) => {
        const split = newBill.splits.find((s) => s.userId === f.id);
        if (split && split.status === 'pending') {
          return {
            ...f,
            netBalance: f.netBalance + split.amount,
          };
        }
        return f;
      });
      setFriends(updatedFriends);

      const otherSplits = newBill.splits.filter((s) => s.userId !== currentUser.id);
      if (otherSplits.length > 0) {
        const first = otherSplits[0];
        setNotifications((prev) => [
          {
            id: `notif_${Date.now()}`,
            type: 'split_request',
            title: `Split Request sent to ${first.userName}`,
            message: `Requested ${formatCurrency(first.amount, newBill.currency)} for ${newBill.merchant}`,
            amount: first.amount,
            currency: newBill.currency,
            timestamp: 'Just now',
            read: false,
          },
          ...prev,
        ]);
      }
    }
  };

  const handlePaymentSuccess = (txId: string, splitId?: string) => {
    setCheckoutTarget((prev) => ({ ...prev, isOpen: false }));

    const recipientHandle = checkoutTarget.recipientPaypalHandle;
    const targetFriend = friends.find((f) => f.paypalHandle === recipientHandle);

    if (targetFriend) {
      setFriends(
        friends.map((f) => {
          if (f.id === targetFriend.id) {
            return {
              ...f,
              netBalance: f.netBalance + checkoutTarget.amount,
            };
          }
          return f;
        })
      );
    }

    setCurrentUser((prev) => ({
      ...prev,
      walletBalance: Math.max(0, prev.walletBalance - checkoutTarget.amount),
    }));

    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        type: 'payment_received',
        title: 'Settled via PayPal Sandbox',
        message: `Paid ${formatCurrency(checkoutTarget.amount, checkoutTarget.currency)} to ${checkoutTarget.recipientName} (${txId})`,
        amount: checkoutTarget.amount,
        currency: checkoutTarget.currency,
        timestamp: 'Just now',
        read: false,
      },
      ...prev,
    ]);
  };

  const handleMarkAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const handleOpenSettle = (recipientName: string, paypalHandle: string, amount: number, currency: string, billTitle?: string) => {
    setCheckoutTarget({
      isOpen: true,
      recipientName,
      recipientPaypalHandle: paypalHandle,
      amount,
      currency,
      billTitle: billTitle || 'Split Settlement',
    });
  };

  const handleAddSavingsProgress = (id: string, amount: number) => {
    setSavingsChallenges((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = c.savedAmount + amount;
          return {
            ...c,
            savedAmount: updated,
            completed: updated >= c.targetAmount,
          };
        }
        return c;
      })
    );
  };

  const convertedBalance = convertCurrency(currentUser.walletBalance, currentUser.baseCurrency, currentCountry.currencyCode, liveRates);

  // Filtered transactions for the dedicated Activity tab
  const filteredBills = bills.filter((b) => {
    const matchesSearch =
      b.merchant.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(txSearchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (txFilter === 'paid_by_me') return b.paidByUserId === currentUser.id;
    if (txFilter === 'split_with_me') return b.paidByUserId !== currentUser.id;
    return true;
  });

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-900 flex flex-col font-sans pb-24 md:pb-12">
      {/* Biometric Lock Overlay */}
      {isBiometricLocked && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-[#0070BA] mb-4 shadow-xl">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">PayPal Session Locked</h2>
          <p className="mt-1 text-xs text-slate-300 max-w-xs">
            Authenticate with biometrics or PIN to unlock your account.
          </p>
          <button
            onClick={() => setIsBiometricModalOpen(true)}
            className="mt-6 px-6 py-2.5 rounded-full bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Unlock Session</span>
          </button>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0"
              style={{ backgroundColor: currentUser.avatarColor }}
              title={currentUser.name}
            >
              {currentUser.initials}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black italic tracking-tight text-[#003087]">
                Pay<span className="text-[#0070BA]">Pal</span>
              </span>
              <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-[#0070BA] uppercase">
                AI Bills
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={currentPersonaKey}
              onChange={(e) => handleSwitchPersona(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-xl border-none focus:outline-none cursor-pointer hidden sm:block"
              title="Switch demo user"
            >
              <option value="user_alex">Alex Miller (Host)</option>
              <option value="user_sarah">Sarah Chen (Friend)</option>
              <option value="user_rahul">Rahul Sharma (Buddy)</option>
              <option value="user_emma">Emma Watson (Co-traveler)</option>
            </select>

            <button
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              className={`p-2 rounded-xl transition ${
                isOfflineMode ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:bg-slate-100'
              }`}
              title="Toggle Offline Expense Mode"
            >
              {isOfflineMode ? <WifiOff className="w-4 h-4 text-amber-600" /> : <Wifi className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                setIsBiometricLocked(true);
                setIsBiometricModalOpen(true);
              }}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition"
              title="Lock app"
            >
              <Lock className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setQrInitialMode('scan');
                setIsQROpen(true);
              }}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition"
              title="Scan QR"
            >
              <Scan className="w-4 h-4 text-[#0070BA]" />
            </button>

            <button
              onClick={() => setIsNotificationsModalOpen(true)}
              className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {notifications.filter((n) => !n.read).length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRIMARY TOP TABS (Clean horizontal pill bar matching PayPal UI) */}
        <div className="max-w-4xl mx-auto px-4 pt-1 pb-2 overflow-x-auto scrollbar-none flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'home'
                ? 'bg-[#0070BA] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Account</span>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'scanner'
                ? 'bg-[#0070BA] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Bill Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('paypal')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'paypal'
                ? 'bg-[#0070BA] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-[#00CFDE]" />
            <span>PayPal APIs</span>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
              Hub
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pots')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'pots'
                ? 'bg-[#0070BA] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Shared Pots</span>
          </button>

          <button
            onClick={() => setActiveTab('dues')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'dues'
                ? 'bg-[#0070BA] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Pending Dues</span>
            {totalIOwe > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'transactions'
                ? 'bg-[#0070BA] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Activity</span>
          </button>

          <button
            onClick={() => setActiveTab('savings')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'savings'
                ? 'bg-[#0070BA] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PiggyBank className="w-3.5 h-3.5" />
            <span>Savings</span>
          </button>
        </div>
      </header>

      {/* MAIN BODY CONTAINER: Shows ONLY the selected tab! */}
      <main className="max-w-4xl w-full mx-auto px-4 py-5 space-y-5 flex-1">
        {isOfflineMode && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-600" />
              <span>Offline Mode: Bills cached locally and synced upon reconnecting.</span>
            </div>
            {pendingOfflineSyncCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px]">
                {pendingOfflineSyncCount} Pending Sync
              </span>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 1: ACCOUNT & BALANCE (HOME)
           ======================================================== */}
        {activeTab === 'home' && (
          <div className="space-y-5 animate-fade-in">
            {/* Account Balance Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                    Account Balance
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tracking-tight mt-1">
                    {formatCurrency(currentUser.walletBalance, currentUser.baseCurrency)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">Available in PayPal</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between min-w-[240px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      In {currentCountry.name} ({currentCountry.currencyCode})
                    </span>
                    <select
                      value={currentCountry.code}
                      onChange={(e) => {
                        const found = SUPPORTED_COUNTRIES.find((c) => c.code === e.target.value);
                        if (found) setCurrentCountry(found);
                      }}
                      className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-2 py-0.5 focus:outline-none"
                    >
                      {SUPPORTED_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-xl font-bold text-[#0070BA] font-mono mt-1">
                    {formatCurrency(convertedBalance, currentCountry.currencyCode)}
                  </div>

                  <div className="text-[10px] text-slate-500 flex items-center justify-between mt-1 pt-1 border-t border-slate-200">
                    <span>1 {currentUser.baseCurrency} = {formatCurrency(convertCurrency(1, currentUser.baseCurrency, currentCountry.currencyCode, liveRates), currentCountry.currencyCode)}</span>
                    <span className="text-emerald-600 font-semibold">0% Split Fee</span>
                  </div>
                </div>
              </div>

              {/* Fast Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <button
                  onClick={() => setActiveTab('scanner')}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs transition cursor-pointer shadow-sm"
                >
                  <Scan className="w-4 h-4" />
                  <span>Scan Bill</span>
                </button>

                <button
                  onClick={() => {
                    setQrInitialMode('my_qr');
                    setIsQROpen(true);
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-[#0070BA]" />
                  <span>My QR Code</span>
                </button>

                <button
                  onClick={() => setActiveTab('pots')}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
                >
                  <Users className="w-4 h-4 text-[#0070BA]" />
                  <span>Shared Pots</span>
                </button>

                <button
                  onClick={() => setIsAICompanionOpen(true)}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-[#0070BA] font-bold text-xs transition cursor-pointer border border-blue-200"
                >
                  <Bot className="w-4 h-4" />
                  <span>AI Advisor</span>
                </button>
              </div>
            </div>

            {/* Travel Currency Bar */}
            <TravelCurrencyBar
              currentCountry={currentCountry}
              onSelectCountry={(c) => setCurrentCountry(c)}
              baseWalletBalance={currentUser.walletBalance}
              baseCurrency={currentUser.baseCurrency}
              liveRates={liveRates}
            />

            {/* PayPal Cards Carousel */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Bank & Payment Cards</span>
                <span className="text-[#0070BA] hover:underline cursor-pointer">Manage</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#00457C] to-[#0070BA] p-4 text-white shadow-sm flex flex-col justify-between h-32">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold tracking-widest text-xs">VISA</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">PayPal Debit</span>
                  </div>
                  <div className="font-mono text-sm tracking-widest">
                    •••• •••• •••• 1165
                  </div>
                  <div className="flex items-center justify-between text-[10px] opacity-80">
                    <span>{currentUser.name}</span>
                    <span>EXP 08/28</span>
                  </div>
                  <div className="absolute -right-4 -bottom-6 text-7xl font-black italic text-white/10 select-none pointer-events-none">
                    P
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1546a0] to-[#0084d6] p-4 text-white shadow-sm flex flex-col justify-between h-32">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold tracking-widest text-xs">VISA</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Travel Preferred</span>
                  </div>
                  <div className="font-mono text-sm tracking-widest">
                    •••• •••• •••• 4820
                  </div>
                  <div className="flex items-center justify-between text-[10px] opacity-80">
                    <span>{currentUser.name}</span>
                    <span>EXP 11/29</span>
                  </div>
                  <div className="absolute -right-4 -bottom-6 text-7xl font-black italic text-white/10 select-none pointer-events-none">
                    P
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Summary of Dues & Recent Splits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setActiveTab('dues')}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm cursor-pointer hover:border-[#0070BA] transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Owed to You</span>
                  <span className="text-xs font-bold font-mono text-emerald-600">
                    +{formatCurrency(totalOwedToMe, currentUser.baseCurrency)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Rahul Sharma (${friends.find((f) => f.id === 'user_rahul')?.netBalance || 0}) and Emma Watson
                </p>
                <div className="mt-3 text-xs text-[#0070BA] font-bold flex items-center gap-1">
                  <span>View Dues</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div
                onClick={() => setActiveTab('dues')}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm cursor-pointer hover:border-[#0070BA] transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">You Owe</span>
                  <span className="text-xs font-bold font-mono text-rose-600">
                    -{formatCurrency(totalIOwe, currentUser.baseCurrency)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  To Sarah Chen for Uber airport transfer ($18.00)
                </p>
                <div className="mt-3 text-xs text-[#0070BA] font-bold flex items-center gap-1">
                  <span>Settle Now</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: AI BILL SCANNER & OCR
           ======================================================== */}
        {activeTab === 'scanner' && (
          <div className="space-y-5 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">AI Bill Counter & Optical OCR</h2>
                  <p className="text-xs text-slate-500">
                    Snap or upload paper receipts to extract line items, currency, and taxes via Gemini Vision.
                  </p>
                </div>
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="px-4 py-2 rounded-2xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Scan className="w-4 h-4" />
                  <span>Open Scanner Viewfinder</span>
                </button>
              </div>

              {/* Duplicate Receipt Guard Indicator Card */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-200 text-amber-900 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-amber-950 flex items-center gap-2">
                      <span>Multi-Factor Duplicate Receipt Scanner</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-200 text-amber-900">
                        Active
                      </span>
                    </div>
                    <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                      Automatically audits merchant names, transaction dates, and total amounts against all {bills.length} registered bills to block repeat scans and double charges.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-bold text-xs shrink-0 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Test Duplicate Detection</span>
                </button>
              </div>

              {/* Instant Sample Receipts Launcher */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Quick-Test Sample Receipts
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="p-3.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 text-left transition"
                  >
                    <div className="text-[10px] font-bold text-slate-400">JAPAN DINING</div>
                    <div className="font-bold text-slate-900 text-xs mt-0.5">Tokyo Izakaya</div>
                    <div className="text-xs text-[#0070BA] font-mono font-bold mt-1">¥7,480 JPY</div>
                  </button>

                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="p-3.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 text-left transition"
                  >
                    <div className="text-[10px] font-bold text-slate-400">TRANSIT</div>
                    <div className="font-bold text-slate-900 text-xs mt-0.5">Airport Uber</div>
                    <div className="text-xs text-emerald-600 font-mono font-bold mt-1">$66.00 USD</div>
                  </button>

                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="p-3.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 text-left transition"
                  >
                    <div className="text-[10px] font-bold text-slate-400">CAFE</div>
                    <div className="font-bold text-slate-900 text-xs mt-0.5">Artisan Bistro</div>
                    <div className="text-xs text-[#0070BA] font-mono font-bold mt-1">$59.19 USD</div>
                  </button>

                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="p-3.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 text-left transition"
                  >
                    <div className="text-[10px] font-bold text-slate-400">STORE</div>
                    <div className="font-bold text-slate-900 text-xs mt-0.5">Whole Foods</div>
                    <div className="text-xs text-indigo-600 font-mono font-bold mt-1">$128.40 USD</div>
                  </button>
                </div>
              </div>

              {/* Recently scanned bills list */}
              <div className="mt-5 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Scanned Bills Registered ({bills.length})
                </span>
                <div className="space-y-2.5">
                  {bills.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{b.merchant}</span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                            {b.category}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {b.date} • {b.items.length} line items extracted • {b.splitType} split
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="font-mono font-bold text-slate-900">
                          {formatCurrency(b.total, b.currency)}
                        </div>
                        {b.currency !== currentUser.baseCurrency && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            ≈ {formatCurrency(b.convertedTotal, currentUser.baseCurrency)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB: PAYPAL DEVELOPER REST APIS HUB
           ======================================================== */}
        {activeTab === 'paypal' && (
          <div className="animate-fade-in">
            <PayPalApiHub
              currentUser={currentUser}
              friends={friends}
              onOrderSettled={(amount, description) => {
                setNotifications((prev) => [
                  {
                    id: `notif_${Date.now()}`,
                    type: 'payment_received',
                    title: 'PayPal Order Captured',
                    message: `${description} for $${amount.toFixed(2)} completed successfully!`,
                    amount,
                    currency: 'USD',
                    timestamp: 'Just now',
                    read: false,
                  },
                  ...prev,
                ]);
              }}
            />
          </div>
        )}

        {/* ========================================================
            TAB 3: SHARED GROUP POTS & AI DEBT SIMPLIFICATION
           ======================================================== */}
        {activeTab === 'pots' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Shared Group Pots</h2>
                <p className="text-xs text-slate-500">
                  Pool expenses for trips and shared living. AI calculates the minimum transfers needed to square all debts.
                </p>
              </div>
              <button
                onClick={() => setIsGroupBudgetModalOpen(true)}
                className="px-3.5 py-2 rounded-2xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Pot</span>
              </button>
            </div>

            <div className="space-y-4">
              {groupBudgets.map((group) => (
                <DebtGraphVisualizer
                  key={group.id}
                  group={group}
                  bills={bills}
                  friends={friends}
                  currentUserId={currentUser.id}
                  onSettleTransfer={(t) => {
                    const friend = friends.find((f) => f.id === t.toUserId);
                    handleOpenSettle(
                      t.toUserName,
                      friend?.paypalHandle || 'facilitator',
                      t.amount,
                      t.currency,
                      `${group.name} Settlement`
                    );
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: PENDING DUES & RECURRING BILLS
           ======================================================== */}
        {activeTab === 'dues' && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-base font-bold text-slate-900">Pending Dues & Split Settlements</h2>
              <p className="text-xs text-slate-500">Track who owes what and settle instantly with PayPal</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Money friends owe you */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase">Friends Who Owe You</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600">
                    +{formatCurrency(totalOwedToMe, currentUser.baseCurrency)}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {friends
                    .filter((f) => f.netBalance > 0)
                    .map((f) => (
                      <div
                        key={f.id}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center"
                            style={{ backgroundColor: f.avatarColor }}
                          >
                            {f.initials}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{f.name}</div>
                            <div className="text-[10px] text-[#0070BA] font-mono">@{f.paypalHandle}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-bold text-emerald-600 font-mono">
                            {formatCurrency(f.netBalance, currentUser.baseCurrency)}
                          </div>
                          <a
                            href={`https://paypal.me/${currentUser.paypalHandle}/${f.netBalance}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-[#0070BA] hover:underline font-semibold inline-flex items-center gap-1 mt-0.5"
                          >
                            <span>Send Link</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Splits you owe */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase">Splits You Need to Pay</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-600">
                    -{formatCurrency(totalIOwe, currentUser.baseCurrency)}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {friends
                    .filter((f) => f.netBalance < 0)
                    .map((f) => {
                      const amount = Math.abs(f.netBalance);
                      return (
                        <div
                          key={f.id}
                          className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center"
                              style={{ backgroundColor: f.avatarColor }}
                            >
                              {f.initials}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900">{f.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{f.phone}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-bold text-rose-600 font-mono">
                              {formatCurrency(amount, currentUser.baseCurrency)}
                            </span>
                            <button
                              onClick={() =>
                                handleOpenSettle(f.name, f.paypalHandle, amount, currentUser.baseCurrency, `Settlement to ${f.name}`)
                              }
                              className="px-3 py-1.5 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs shadow-sm transition cursor-pointer"
                            >
                              Settle
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Recurring bills section */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 border-b border-slate-100 pb-3">
                <span className="font-bold text-slate-900">Upcoming Subscriptions & Bills</span>
                <span>Automatic Reminders</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {recurringBills.map((rb) => (
                  <div key={rb.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{rb.name}</div>
                      <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                        Due in {rb.daysUntilDue} days
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-slate-900">
                        {formatCurrency(rb.amount, rb.currency)}
                      </div>
                      <button
                        onClick={() => handleOpenSettle(rb.merchant, 'billing', rb.amount, rb.currency, `${rb.name} Auto-Pay`)}
                        className="text-[10px] text-[#0070BA] font-bold hover:underline"
                      >
                        Pre-pay
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: ACTIVITY & TRANSACTIONS (Matches '交易' in Screenshot)
           ======================================================== */}
        {activeTab === 'transactions' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Transaction History</h2>
                  <p className="text-xs text-slate-500">Receipt logs, splits, and PayPal payments</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={txSearchQuery}
                    onChange={(e) => setTxSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0070BA]"
                  />
                </div>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs">
                <button
                  onClick={() => setTxFilter('all')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    txFilter === 'all' ? 'bg-[#0070BA] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({bills.length})
                </button>
                <button
                  onClick={() => setTxFilter('paid_by_me')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    txFilter === 'paid_by_me' ? 'bg-[#0070BA] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Paid by You
                </button>
                <button
                  onClick={() => setTxFilter('split_with_me')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    txFilter === 'split_with_me' ? 'bg-[#0070BA] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Splits with Friends
                </button>
              </div>

              {/* Transactions List matching Screenshot */}
              <div className="divide-y divide-slate-100">
                {filteredBills.map((bill) => {
                  const isPaidByMe = bill.paidByUserId === currentUser.id;
                  const friend = friends.find((f) => f.id === bill.paidByUserId);
                  const avatarInitials = isPaidByMe ? currentUser.initials : friend?.initials || 'SC';
                  const avatarColor = isPaidByMe ? currentUser.avatarColor : friend?.avatarColor || '#E91E63';

                  return (
                    <div key={bill.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {avatarInitials}
                        </div>

                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <span>{bill.merchant}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold uppercase">
                              {bill.category}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {bill.date} • {isPaidByMe ? 'Paid by you' : 'Paid by ' + (friend?.name || 'friend')}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-slate-900">
                          {formatCurrency(bill.total, bill.currency)}
                        </div>
                        {bill.currency !== currentUser.baseCurrency && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            ≈ {formatCurrency(bill.convertedTotal, currentUser.baseCurrency)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 6: SAVINGS & DISCIPLINE
           ======================================================== */}
        {activeTab === 'savings' && (
          <div className="space-y-5 animate-fade-in">
            <SavingsChallengesCard
              challenges={savingsChallenges}
              onAddProgress={handleAddSavingsProgress}
              currency={currentUser.baseCurrency}
            />
          </div>
        )}
      </main>

      {/* FLOATING ASK PAYPAL AI BUTTON */}
      <div className="fixed bottom-16 sm:bottom-6 right-5 z-40">
        <button
          onClick={() => setIsAICompanionOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs shadow-lg transition-transform hover:scale-105 cursor-pointer"
        >
          <Bot className="w-4 h-4" />
          <span>Ask PayPal AI</span>
        </button>
      </div>

      {/* BOTTOM NAVIGATION BAR (Authentic Mobile PayPal Navigation) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 sm:hidden">
        <div className="grid grid-cols-6 h-14">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center text-[10px] font-bold transition ${
              activeTab === 'home' ? 'text-[#0070BA]' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Wallet className="w-4 h-4 mb-0.5" />
            <span>Account</span>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex flex-col items-center justify-center text-[10px] font-bold transition ${
              activeTab === 'scanner' ? 'text-[#0070BA]' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Scan className="w-4 h-4 mb-0.5" />
            <span>Scan</span>
          </button>

          <button
            onClick={() => setActiveTab('paypal')}
            className={`flex flex-col items-center justify-center text-[10px] font-bold transition ${
              activeTab === 'paypal' ? 'text-[#0070BA]' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <CreditCard className="w-4 h-4 mb-0.5 text-[#00CFDE]" />
            <span>APIs</span>
          </button>

          <button
            onClick={() => setActiveTab('pots')}
            className={`flex flex-col items-center justify-center text-[10px] font-bold transition ${
              activeTab === 'pots' ? 'text-[#0070BA]' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4 mb-0.5" />
            <span>Pots</span>
          </button>

          <button
            onClick={() => setActiveTab('dues')}
            className={`flex flex-col items-center justify-center text-[10px] font-bold transition ${
              activeTab === 'dues' ? 'text-[#0070BA]' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <CreditCard className="w-4 h-4 mb-0.5" />
            <span>Dues</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex flex-col items-center justify-center text-[10px] font-bold transition ${
              activeTab === 'transactions' ? 'text-[#0070BA]' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <History className="w-4 h-4 mb-0.5" />
            <span>Activity</span>
          </button>
        </div>
      </nav>

      {/* MODALS */}
      <BillScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSaveBill={handleSaveBill}
        friends={friends}
        groupBudgets={groupBudgets}
        existingBills={bills}
        currentUserId={currentUser.id}
        onOpenQRScanner={() => {
          setIsScannerOpen(false);
          setQrInitialMode('scan');
          setIsQROpen(true);
        }}
      />

      <QRModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        currentUser={currentUser}
        friends={friends}
        initialMode={qrInitialMode}
        onFriendScanned={(scanned) => {
          if (!friends.find((f) => f.id === scanned.id)) {
            setFriends([...friends, scanned]);
          }
          setIsScannerOpen(true);
        }}
      />

      <PayPalCheckoutModal
        isOpen={checkoutTarget.isOpen}
        onClose={() => setCheckoutTarget((prev) => ({ ...prev, isOpen: false }))}
        recipientName={checkoutTarget.recipientName}
        recipientPaypalHandle={checkoutTarget.recipientPaypalHandle}
        amount={checkoutTarget.amount}
        currency={checkoutTarget.currency}
        billTitle={checkoutTarget.billTitle}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <BiometricModal
        isOpen={isBiometricModalOpen}
        onSuccess={() => {
          setIsBiometricLocked(false);
          setIsBiometricModalOpen(false);
        }}
        onCancel={() => {
          if (!isBiometricLocked) {
            setIsBiometricModalOpen(false);
          }
        }}
      />

      <AICompanionDrawer
        isOpen={isAICompanionOpen}
        onClose={() => setIsAICompanionOpen(false)}
        currentUser={currentUser}
        bills={bills}
        friends={friends}
        groupBudgets={groupBudgets}
        currentCountryCurrency={currentCountry.currencyCode}
      />

      <GroupBudgetModal
        isOpen={isGroupBudgetModalOpen}
        onClose={() => setIsGroupBudgetModalOpen(false)}
        onSaveGroup={(g) => setGroupBudgets([...groupBudgets, g])}
        friends={friends}
        currentUserId={currentUser.id}
      />

      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllRead}
        onSettleNotification={(n) => {
          if (n.amount && n.fromUser) {
            handleOpenSettle(n.fromUser, 'sarahchen', n.amount, n.currency || 'USD', n.title);
          }
        }}
      />
    </div>
  );
}
