import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  X,
  Check,
  AlertTriangle,
  Receipt,
  Plus,
  Trash2,
  Split,
  Layers,
  ArrowRight,
  QrCode,
  ShieldAlert,
  CopyX,
  FileCheck,
} from 'lucide-react';
import { Bill, ReceiptItem, Friend, GroupBudget } from '../types';
import { formatCurrency } from '../utils/currencies';
import { checkDuplicateReceipt, DuplicateCheckResult } from '../utils/duplicateScanner';
import confetti from 'canvas-confetti';

interface BillScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBill: (bill: Bill) => void;
  friends: Friend[];
  groupBudgets: GroupBudget[];
  existingBills: Bill[];
  currentUserId: string;
  onOpenQRScanner?: () => void;
}

export const BillScannerModal: React.FC<BillScannerModalProps> = ({
  isOpen,
  onClose,
  onSaveBill,
  friends,
  groupBudgets,
  existingBills,
  currentUserId,
  onOpenQRScanner,
}) => {
  const [step, setStep] = useState<'capture' | 'analyzing' | 'review_and_split'>('capture');
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Scanned Receipt parsed fields
  const [merchant, setMerchant] = useState('Shinjuku Omoide Izakaya');
  const [date, setDate] = useState('2026-11-11');
  const [currency, setCurrency] = useState('JPY');
  const [items, setItems] = useState<ReceiptItem[]>([
    { id: '1', name: 'Wagyu Beef Skewers (x4)', quantity: 2, price: 1800, category: 'Dining', assignedToUserIds: [] },
    { id: '2', name: 'Tonkotsu Special Ramen', quantity: 2, price: 2400, category: 'Dining', assignedToUserIds: [] },
    { id: '3', name: 'Draft Beer (Large)', quantity: 3, price: 2100, category: 'Dining', assignedToUserIds: [] },
    { id: '4', name: 'Edamame & Tsukemono', quantity: 1, price: 500, category: 'Dining', assignedToUserIds: [] },
  ]);
  const [subtotal, setSubtotal] = useState(6800);
  const [tax, setTax] = useState(680);
  const [tip, setTip] = useState(0);
  const [total, setTotal] = useState(7480);
  const [category, setCategory] = useState('Dining');
  const [notes, setNotes] = useState('');
  const [fraudAlerts, setFraudAlerts] = useState<string[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState('');

  // Duplicate Check Result State
  const [duplicateResult, setDuplicateResult] = useState<DuplicateCheckResult | null>(null);
  const [ignoredDuplicate, setIgnoredDuplicate] = useState(false);

  // Splitting state
  const [splitMode, setSplitMode] = useState<'equal' | 'itemized' | 'exact'>('equal');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>(['user_sarah', 'user_rahul']);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('group_tokyo');
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
  const [customPhone, setCustomPhone] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Real-time duplicate evaluation whenever merchant, date, total, or currency changes!
  useEffect(() => {
    if (step === 'review_and_split') {
      const result = checkDuplicateReceipt(
        {
          merchant,
          date,
          total,
          currency,
          items,
        },
        existingBills
      );
      setDuplicateResult(result);
    }
  }, [merchant, date, total, currency, items, existingBills, step]);

  if (!isOpen) return null;

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera error or permission denied:', err);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
        processImageOCR(dataUrl);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setCapturedImage(base64);
        processImageOCR(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadSampleReceipt = (type: 'tokyo_izakaya' | 'uber_ride' | 'coffee_brunch' | 'grocery') => {
    let hint = '';
    if (type === 'tokyo_izakaya') hint = 'japan tokyo izakaya';
    else if (type === 'uber_ride') hint = 'uber ride airport';
    else if (type === 'coffee_brunch') hint = 'bistro coffee artisan';
    else hint = 'grocery whole foods supermarket';

    setIgnoredDuplicate(false);
    processImageOCR(null, hint);
  };

  const processImageOCR = async (imageBase64: string | null, hint?: string) => {
    setStep('analyzing');
    setIgnoredDuplicate(false);
    try {
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          receiptHint: hint,
        }),
      });

      const data = await res.json();
      if (data.success && data.receipt) {
        const r = data.receipt;
        setMerchant(r.merchant || 'Sample Merchant');
        setDate(r.date || new Date().toISOString().split('T')[0]);
        setCurrency(r.currency || 'USD');
        setSubtotal(r.subtotal || 0);
        setTax(r.tax || 0);
        setTip(r.tip || 0);
        setTotal(r.total || 0);
        setCategory(r.category || 'Dining');
        setAiAnalysis(r.aiAnalysis || '');
        setFraudAlerts(r.fraudAlerts || []);

        const mappedItems: ReceiptItem[] = (r.items || []).map((it: any, idx: number) => ({
          id: `item_${Date.now()}_${idx}`,
          name: it.name,
          quantity: it.quantity || 1,
          price: it.price || 0,
          category: it.category || r.category || 'Dining',
          assignedToUserIds: [],
        }));
        setItems(mappedItems);

        // Run multi-factor duplicate scanner
        const dupCheck = checkDuplicateReceipt(
          {
            merchant: r.merchant || '',
            date: r.date || '',
            total: r.total || 0,
            currency: r.currency || 'USD',
            items: mappedItems,
          },
          existingBills
        );
        setDuplicateResult(dupCheck);

        setStep('review_and_split');
      } else {
        throw new Error('Failed to parse');
      }
    } catch (e) {
      console.error(e);
      setStep('review_and_split');
    }
  };

  const toggleFriendSelection = (fId: string) => {
    if (selectedFriendIds.includes(fId)) {
      setSelectedFriendIds(selectedFriendIds.filter((id) => id !== fId));
    } else {
      setSelectedFriendIds([...selectedFriendIds, fId]);
    }
  };

  const toggleItemAssignment = (itemId: string, friendId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const currentAssignees = item.assignedToUserIds || [];
        const isAssigned = currentAssignees.includes(friendId);
        const updated = isAssigned
          ? currentAssignees.filter((id) => id !== friendId)
          : [...currentAssignees, friendId];
        return { ...item, assignedToUserIds: updated };
      })
    );
  };

  const handleAddCustomPhone = () => {
    if (!customPhone.trim()) return;
    const dummyFriend: Friend = {
      id: `phone_${Date.now()}`,
      name: customPhone.trim(),
      email: `${customPhone.replace(/\D/g, '')}@sms.paysplit.ai`,
      phone: customPhone.trim(),
      initials: customPhone.trim().substring(0, 2).toUpperCase(),
      avatarColor: '#546E7A',
      paypalHandle: customPhone.replace(/\D/g, ''),
      netBalance: 0,
    };
    friends.push(dummyFriend);
    setSelectedFriendIds([...selectedFriendIds, dummyFriend.id]);
    setCustomPhone('');
  };

  const handleSaveAndSplit = () => {
    const allParticipantIds = Array.from(new Set([currentUserId, ...selectedFriendIds]));
    const participantCount = allParticipantIds.length;
    const exchangeRate = currency === 'JPY' ? 154.2 : currency === 'INR' ? 86.4 : currency === 'EUR' ? 0.92 : 1.0;
    const convertedTotal = currency === 'USD' ? total : total / exchangeRate;

    let computedSplits: any[] = [];

    if (splitMode === 'equal') {
      const share = total / participantCount;
      computedSplits = allParticipantIds.map((uid) => {
        const isMe = uid === currentUserId;
        const friend = friends.find((f) => f.id === uid);
        return {
          userId: uid,
          userName: isMe ? 'You' : friend?.name || uid,
          amount: Math.round(share * 100) / 100,
          currency,
          status: isMe ? 'settled' : 'pending',
        };
      });
    } else if (splitMode === 'itemized') {
      const userTotals: Record<string, number> = {};
      allParticipantIds.forEach((uid) => (userTotals[uid] = 0));

      items.forEach((it) => {
        const assignees = it.assignedToUserIds && it.assignedToUserIds.length > 0 ? it.assignedToUserIds : allParticipantIds;
        const itemCost = it.price * it.quantity;
        const perPerson = itemCost / assignees.length;
        assignees.forEach((uid) => {
          if (userTotals[uid] !== undefined) {
            userTotals[uid] += perPerson;
          }
        });
      });

      const subtotalItems = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
      const taxAndTip = tax + tip;
      allParticipantIds.forEach((uid) => {
        const proportion = subtotalItems > 0 ? userTotals[uid] / subtotalItems : 1 / participantCount;
        userTotals[uid] += taxAndTip * proportion;
      });

      computedSplits = allParticipantIds.map((uid) => {
        const isMe = uid === currentUserId;
        const friend = friends.find((f) => f.id === uid);
        return {
          userId: uid,
          userName: isMe ? 'You' : friend?.name || uid,
          amount: Math.round((userTotals[uid] || 0) * 100) / 100,
          currency,
          status: isMe ? 'settled' : 'pending',
        };
      });
    } else {
      computedSplits = allParticipantIds.map((uid) => {
        const isMe = uid === currentUserId;
        const friend = friends.find((f) => f.id === uid);
        const amount = customAmounts[uid] || total / participantCount;
        return {
          userId: uid,
          userName: isMe ? 'You' : friend?.name || uid,
          amount: Math.round(amount * 100) / 100,
          currency,
          status: isMe ? 'settled' : 'pending',
        };
      });
    }

    const newBill: Bill = {
      id: `bill_${Date.now()}`,
      merchant,
      date,
      currency,
      baseCurrency: 'USD',
      exchangeRateAtScan: exchangeRate,
      items,
      subtotal,
      tax,
      tip,
      total,
      convertedTotal: Math.round(convertedTotal * 100) / 100,
      category,
      splitType: selectedFriendIds.length > 0 ? splitMode : 'none',
      splits: computedSplits,
      paidByUserId: currentUserId,
      sharedGroupId: selectedGroupId || undefined,
      duplicateSignature: `${merchant.toLowerCase()}-${total}`,
      fraudAlerts,
      aiAnalysis,
      notes,
      createdAt: new Date().toISOString(),
    };

    onSaveBill(newBill);

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.6 },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl my-auto bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#0070BA]/10 text-[#0070BA]">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                AI Bill Counter & Split
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-[#0070BA]/10 text-[#0070BA]">
                  Duplicate Protected
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Audits merchant, date, and amount against existing bills to prevent duplicate expenses
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* STEP 1: CAPTURE */}
          {step === 'capture' && (
            <div className="space-y-6">
              {cameraActive ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-dashed border-[#0070BA] m-6 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="text-xs text-white font-medium bg-black/60 px-3 py-1 rounded-full">
                      Align receipt inside frame
                    </span>
                  </div>
                  <div className="absolute bottom-4 flex items-center gap-4">
                    <button
                      onClick={stopCamera}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs hover:bg-slate-700 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={takePhoto}
                      className="px-6 py-2.5 rounded-2xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Capture Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={startCamera}
                    className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#0070BA] bg-slate-50 hover:bg-blue-50/50 transition group text-center cursor-pointer"
                  >
                    <div className="p-4 rounded-2xl bg-[#0070BA]/10 text-[#0070BA] group-hover:scale-105 transition duration-200 mb-3">
                      <Camera className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">Take Photo with Camera</span>
                    <span className="text-xs text-slate-500 mt-1">Live optical receipt capture</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#0070BA] bg-slate-50 hover:bg-blue-50/50 transition group text-center cursor-pointer"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-105 transition duration-200 mb-3">
                      <Upload className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">Upload Receipt File</span>
                    <span className="text-xs text-slate-500 mt-1">PNG or JPEG format</span>
                  </button>
                </div>
              )}

              {/* Sample receipts & Duplicate Test Launcher */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-700">
                    Sample Receipts & Duplicate Scanner Tests:
                  </span>
                  <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Audit Guard
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => loadSampleReceipt('tokyo_izakaya')}
                    className="p-3 rounded-xl bg-amber-50/80 hover:bg-amber-100/80 border border-amber-300 text-left transition text-xs relative group"
                    title="Already in your ledger! Tests duplicate detection."
                  >
                    <span className="absolute top-1.5 right-1.5 text-[9px] uppercase font-bold px-1 rounded bg-amber-200 text-amber-900">
                      Duplicate Test
                    </span>
                    <div className="text-[10px] font-bold text-slate-500 mt-0.5">JAPAN</div>
                    <div className="font-semibold text-slate-900 mt-0.5">Tokyo Izakaya</div>
                    <div className="text-[11px] text-amber-800 font-mono font-bold mt-1">¥7,480 JPY</div>
                  </button>

                  <button
                    onClick={() => loadSampleReceipt('uber_ride')}
                    className="p-3 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-[#0070BA] text-left transition text-xs"
                  >
                    <div className="text-[10px] font-bold text-slate-400">TRANSIT</div>
                    <div className="font-semibold text-slate-900 mt-0.5">Airport Uber</div>
                    <div className="text-[11px] text-emerald-600 font-mono font-bold mt-1">$66.00 USD</div>
                  </button>

                  <button
                    onClick={() => loadSampleReceipt('coffee_brunch')}
                    className="p-3 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-[#0070BA] text-left transition text-xs"
                  >
                    <div className="text-[10px] font-bold text-slate-400">CAFE</div>
                    <div className="font-semibold text-slate-900 mt-0.5">Artisan Bistro</div>
                    <div className="text-[11px] text-[#0070BA] font-mono font-bold mt-1">$59.19 USD</div>
                  </button>

                  <button
                    onClick={() => loadSampleReceipt('grocery')}
                    className="p-3 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-[#0070BA] text-left transition text-xs"
                  >
                    <div className="text-[10px] font-bold text-slate-400">STORE</div>
                    <div className="font-semibold text-slate-900 mt-0.5">Whole Foods</div>
                    <div className="text-[11px] text-indigo-600 font-mono font-bold mt-1">$128.40 USD</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ANALYZING */}
          {step === 'analyzing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full border-4 border-[#0070BA]/20 border-t-[#0070BA] animate-spin" />
              <h3 className="text-base font-bold text-slate-900">Scanning Receipt & Auditing Duplicate Entries...</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Parsing merchant, line items, and running cross-reference comparison against your registered bills.
              </p>
            </div>
          )}

          {/* STEP 3: REVIEW & SPLIT */}
          {step === 'review_and_split' && (
            <div className="space-y-6 animate-fade-in">
              {/* COMPREHENSIVE DUPLICATE RECEIPT ALERT */}
              {duplicateResult && duplicateResult.isDuplicate && !ignoredDuplicate && (
                <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 space-y-3 shadow-sm animate-in zoom-in-95">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-200 text-amber-900 shrink-0">
                        <ShieldAlert className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-amber-950">
                            Duplicate Receipt Detected!
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-200 text-amber-900">
                            {duplicateResult.confidence}% Match
                          </span>
                        </div>
                        <p className="text-xs text-amber-800 mt-0.5">
                          {duplicateResult.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Matching Factor Checklist */}
                  <div className="bg-white/80 p-3 rounded-xl border border-amber-200 space-y-1.5 text-xs">
                    <div className="text-[11px] font-bold text-amber-950 uppercase tracking-wider mb-1">
                      Matched Check Attributes:
                    </div>
                    {duplicateResult.reasons.map((reason, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-amber-900">
                        <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  {/* Side-by-Side Comparison Box */}
                  {duplicateResult.matchedBill && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Left: Newly Scanned */}
                      <div className="p-3 rounded-xl bg-white border border-amber-200">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Current Scan (New)
                        </span>
                        <div className="font-bold text-slate-900">{merchant}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5 font-mono">Date: {date}</div>
                        <div className="text-sm font-black text-[#0070BA] font-mono mt-1">
                          {formatCurrency(total, currency)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">{items.length} extracted items</div>
                      </div>

                      {/* Right: Existing Record */}
                      <div className="p-3 rounded-xl bg-white border border-amber-200">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Existing Entry in Ledger
                        </span>
                        <div className="font-bold text-slate-900">{duplicateResult.matchedBill.merchant}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5 font-mono">
                          Date: {duplicateResult.matchedBill.date}
                        </div>
                        <div className="text-sm font-black text-slate-900 font-mono mt-1">
                          {formatCurrency(
                            duplicateResult.matchedBill.total,
                            duplicateResult.matchedBill.currency
                          )}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-medium mt-1">
                          Already logged & split with friends
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Duplicate Resolution Buttons */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    <button
                      onClick={() => setStep('capture')}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-900 text-white font-bold text-xs hover:bg-amber-800 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <CopyX className="w-4 h-4" />
                      <span>Discard Duplicate (Recommended)</span>
                    </button>

                    <button
                      onClick={() => setIgnoredDuplicate(true)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white text-amber-900 border border-amber-300 font-semibold text-xs hover:bg-amber-100/50 transition cursor-pointer"
                    >
                      Ignore & Register Anyway
                    </button>
                  </div>
                </div>
              )}

              {/* Notice when user chose to proceed anyway */}
              {duplicateResult && duplicateResult.isDuplicate && ignoredDuplicate && (
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Proceeding with potential duplicate receipt (user authorized).</span>
                  </div>
                  <button
                    onClick={() => setIgnoredDuplicate(false)}
                    className="text-[11px] font-bold text-[#0070BA] hover:underline"
                  >
                    Re-check
                  </button>
                </div>
              )}

              {aiAnalysis && (
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 text-[#00457C] text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0070BA] shrink-0" />
                  <span>{aiAnalysis}</span>
                </div>
              )}

              {/* Editable Merchant & Currency Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Merchant Name
                    </label>
                    <input
                      type="text"
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#0070BA]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-[#0070BA]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-[#0070BA] focus:outline-none"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="SGD">SGD (S$)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Subtotal</label>
                    <input
                      type="number"
                      value={subtotal}
                      onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Tax</label>
                    <input
                      type="number"
                      value={tax}
                      onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Total</label>
                    <input
                      type="number"
                      value={total}
                      onChange={(e) => setTotal(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#0070BA] rounded-lg text-xs font-mono font-bold text-[#0070BA] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Line Items ({items.length})
                  </span>
                  <button
                    onClick={() =>
                      setItems([
                        ...items,
                        {
                          id: `custom_${Date.now()}`,
                          name: 'New Item',
                          quantity: 1,
                          price: 10,
                          category: 'Dining',
                          assignedToUserIds: [],
                        },
                      ])
                    }
                    className="text-xs text-[#0070BA] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex-1 flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center font-mono font-bold text-slate-700 text-[11px]">
                          {item.quantity}x
                        </span>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems(items.map((i) => (i.id === item.id ? { ...i, name: val } : i)));
                          }}
                          className="bg-transparent text-slate-900 font-medium focus:outline-none flex-1 truncate"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-[#0070BA]">
                          {formatCurrency(item.price * item.quantity, currency)}
                        </span>

                        {splitMode === 'itemized' && (
                          <div className="flex items-center gap-1">
                            {friends.map((f) => {
                              const isAssigned = (item.assignedToUserIds || []).includes(f.id);
                              return (
                                <button
                                  key={f.id}
                                  onClick={() => toggleItemAssignment(item.id, f.id)}
                                  className={`w-6 h-6 rounded-full text-[10px] font-bold text-white transition ${
                                    isAssigned ? 'ring-2 ring-[#0070BA]' : 'opacity-40'
                                  }`}
                                  style={{ backgroundColor: f.avatarColor }}
                                  title={`Assign to ${f.name}`}
                                >
                                  {f.initials}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <button
                          onClick={() => setItems(items.filter((i) => i.id !== item.id))}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SPLIT OPTIONS */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Split className="w-4 h-4 text-[#0070BA]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Split with Friends
                    </span>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px]">
                    <button
                      onClick={() => setSplitMode('equal')}
                      className={`px-3 py-1 rounded-lg font-semibold transition ${
                        splitMode === 'equal' ? 'bg-white text-[#0070BA] shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      50/50 Equal
                    </button>
                    <button
                      onClick={() => setSplitMode('itemized')}
                      className={`px-3 py-1 rounded-lg font-semibold transition ${
                        splitMode === 'itemized' ? 'bg-white text-[#0070BA] shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      By Items
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2 flex items-center justify-between">
                    <span>Select Friends</span>
                    <button
                      onClick={onOpenQRScanner}
                      className="text-xs text-[#0070BA] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Scan Friend's QR
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {friends.map((f) => {
                      const selected = selectedFriendIds.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          onClick={() => toggleFriendSelection(f.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                            selected
                              ? 'bg-blue-50 border-[#0070BA] text-[#0070BA]'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                            style={{ backgroundColor: f.avatarColor }}
                          >
                            {f.initials}
                          </div>
                          <span>{f.name}</span>
                          {selected ? (
                            <Check className="w-3.5 h-3.5 text-[#0070BA]" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add by phone or PayPal username"
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0070BA]"
                    />
                    <button
                      onClick={handleAddCustomPhone}
                      disabled={!customPhone.trim()}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 disabled:opacity-40 transition"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>Assign to Shared Budget Pot</span>
                  </div>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0070BA]"
                  >
                    <option value="">No Shared Pot (One-off Bill)</option>
                    {groupBudgets.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({formatCurrency(g.targetAmount, g.currency)} budget)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between sticky bottom-0 z-20">
          {step === 'review_and_split' ? (
            <>
              <button
                onClick={() => setStep('capture')}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                Scan Another
              </button>

              <button
                onClick={handleSaveAndSplit}
                className="px-6 py-2.5 rounded-2xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                <span>Save & Request Split via PayPal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
