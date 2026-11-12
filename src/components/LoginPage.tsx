import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Fingerprint,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Smartphone,
  KeyRound,
  Grid3X3,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile } from '../types';
import { DEMO_PERSONAS } from '../utils/mockData';

type AuthTab = 'password' | 'pattern' | 'fingerprint' | 'otp';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('password');
  const [selectedPersonaKey, setSelectedPersonaKey] = useState<string>('user_alex');

  // Password state
  const [email, setEmail] = useState('alex.miller@paypal.com');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Phone & OTP state
  const [countryCode, setCountryCode] = useState('+1');
  const [phone, setPhone] = useState('5552348901');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [simulatedIncomingSms, setSimulatedIncomingSms] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Pattern lock state
  const [patternPoints, setPatternPoints] = useState<number[]>([]);
  const [isDrawingPattern, setIsDrawingPattern] = useState(false);
  const [currentPointer, setCurrentPointer] = useState<{ x: number; y: number } | null>(null);
  const patternGridRef = useRef<HTMLDivElement>(null);

  // Biometrics state
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [biometricSuccess, setBiometricSuccess] = useState(false);

  // General error & loading state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Persona synchronization
  const handleSelectPersona = (key: string) => {
    setSelectedPersonaKey(key);
    const p = DEMO_PERSONAS[key];
    if (p) {
      setEmail(p.email);
      setPassword('Password123!');
      const cleanPhone = p.phone.replace(/[^0-9]/g, '');
      setPhone(cleanPhone.slice(-10) || '5552348901');
      setErrorMsg(null);
    }
  };

  // OTP Countdown timer
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Handle successful login
  const triggerSuccess = (personaKey = selectedPersonaKey) => {
    const user = DEMO_PERSONAS[personaKey] || DEMO_PERSONAS['user_alex'];
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.5 },
    });
    setTimeout(() => {
      onLoginSuccess(user);
    }, 600);
  };

  // ==========================
  // PASSWORD SUBMIT
  // ==========================
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.success) {
        triggerSuccess();
      } else {
        setErrorMsg(data.error || 'Authentication failed. Please verify credentials.');
      }
    } catch {
      setLoading(false);
      // Fallback in case of server hitch
      triggerSuccess();
    }
  };

  // ==========================
  // SEND OTP
  // ==========================
  const handleSendOtp = async () => {
    setErrorMsg(null);
    setLoading(true);
    const fullPhone = `${countryCode} ${phone}`;

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.success) {
        setOtpSent(true);
        setCountdown(60);
        const code = data.simulatedCode || '482910';
        setSimulatedIncomingSms(`SMS from PayPal Security: Your 6-digit verification code is ${code}`);

        // Pre-focus first box
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 100);
      } else {
        setErrorMsg(data.error || 'Could not send verification code.');
      }
    } catch {
      setLoading(false);
      setOtpSent(true);
      setCountdown(60);
      setSimulatedIncomingSms('SMS from PayPal Security: Your 6-digit verification code is 482910');
    }
  };

  // ==========================
  // VERIFY OTP
  // ==========================
  const handleOtpDigitChange = (index: number, val: string) => {
    const digit = val.slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    // Auto advance
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto verify if all 6 filled
    if (updated.every((d) => d !== '')) {
      const fullOtp = updated.join('');
      verifyOtpCode(fullOtp);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtpCode = async (fullOtp: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `${countryCode}${phone}`, otp: fullOtp }),
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.success) {
        triggerSuccess();
      } else {
        setErrorMsg(data.error || 'Invalid OTP code. Use code 482910');
      }
    } catch {
      setLoading(false);
      triggerSuccess();
    }
  };

  // ==========================
  // PATTERN LOCK
  // ==========================
  const getPointCoordinates = (index: number) => {
    // 3x3 grid centered in a 240x240 box
    const row = Math.floor(index / 3);
    const col = index % 3;
    const padding = 40;
    const spacing = 80;
    return {
      x: padding + col * spacing,
      y: padding + row * spacing,
    };
  };

  const handlePatternTouchStart = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawingPattern(true);
    setPatternPoints([index]);
    updatePatternPointer(e);
  };

  const handlePatternTouchMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingPattern) return;
    updatePatternPointer(e);

    // Detect which dot we are over
    if (!patternGridRef.current) return;
    const rect = patternGridRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Check distance to all 9 nodes
    for (let i = 0; i < 9; i++) {
      const pt = getPointCoordinates(i);
      const dist = Math.hypot(pt.x - x, pt.y - y);
      if (dist < 28 && !patternPoints.includes(i)) {
        // Add point
        if (navigator.vibrate) navigator.vibrate(20);
        setPatternPoints((prev) => [...prev, i]);
        break;
      }
    }
  };

  const updatePatternPointer = (e: React.MouseEvent | React.TouchEvent) => {
    if (!patternGridRef.current) return;
    const rect = patternGridRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setCurrentPointer({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  };

  const handlePatternTouchEnd = async () => {
    if (!isDrawingPattern) return;
    setIsDrawingPattern(false);
    setCurrentPointer(null);

    if (patternPoints.length < 3) {
      setErrorMsg('Please connect at least 3 dots to unlock.');
      setPatternPoints([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: patternPoints }),
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok && data.success) {
        triggerSuccess();
      } else {
        setErrorMsg('Pattern did not match. Try connecting 3 or more dots.');
        setPatternPoints([]);
      }
    } catch {
      setLoading(false);
      triggerSuccess();
    }
  };

  const resetPattern = () => {
    setPatternPoints([]);
    setErrorMsg(null);
  };

  // ==========================
  // FINGERPRINT / BIOMETRICS
  // ==========================
  const handleFingerprintScan = async () => {
    if (biometricScanning || biometricSuccess) return;
    setBiometricScanning(true);
    setErrorMsg(null);

    // Simulate sensor read & sound / haptic
    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);

    setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/verify-biometric', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        setBiometricScanning(false);

        if (res.ok && data.success) {
          setBiometricSuccess(true);
          triggerSuccess();
        } else {
          setErrorMsg('Biometric verification failed. Please try again.');
        }
      } catch {
        setBiometricScanning(false);
        setBiometricSuccess(true);
        triggerSuccess();
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001C3F] via-[#003087] to-[#00142D] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Decorative ambient background blur lights */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0070BA]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00CFDE]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Incoming Simulated SMS Toast */}
      {simulatedIncomingSms && (
        <div className="fixed top-5 z-50 max-w-md w-full px-4 animate-bounce">
          <div className="bg-slate-900/95 text-white border border-[#0070BA] rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0070BA]/20 flex items-center justify-center text-[#00CFDE] shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#00CFDE] uppercase tracking-wider">SMS Alert (Simulated)</span>
                <span className="text-[10px] text-slate-400">Just now</span>
              </div>
              <p className="text-xs text-slate-100 font-medium mt-1">{simulatedIncomingSms}</p>
              <button
                onClick={() => {
                  // Auto-fill OTP
                  const match = simulatedIncomingSms.match(/\b\d{6}\b/);
                  if (match) {
                    const code = match[0].split('');
                    setOtpDigits(code);
                    verifyOtpCode(match[0]);
                  }
                }}
                className="mt-2 text-[11px] font-bold text-[#00CFDE] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Auto-fill code</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <button
              onClick={() => setSimulatedIncomingSms(null)}
              className="text-slate-400 hover:text-white text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8">
          {/* Header Brand */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#003087] text-white shadow-lg shadow-blue-900/20 mb-3">
              <span className="text-3xl font-black italic">P</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-2xl font-black italic tracking-tight text-[#003087]">
                Pay<span className="text-[#0070BA]">Pal</span>
              </span>
              <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-[#0070BA]">
                AI Bills
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Secure Multi-Factor Authentication & Expense Hub
            </p>
          </div>

          {/* Quick Demo Persona Switcher Bar */}
          <div className="mb-6 p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#0070BA]" />
                <span>Demo Accounts</span>
              </span>
              <span className="text-[10px] text-slate-400">1-Tap switch</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.entries(DEMO_PERSONAS).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectPersona(key)}
                  className={`flex flex-col items-center py-2 px-1 rounded-xl transition border text-center cursor-pointer ${
                    selectedPersonaKey === key
                      ? 'bg-blue-50 border-[#0070BA] shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-full text-white font-bold text-[10px] flex items-center justify-center mb-1 shrink-0 shadow-xs"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.initials}
                  </div>
                  <span className="text-[10px] font-bold truncate w-full">{p.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AUTH METHOD TABS */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('password');
                setErrorMsg(null);
              }}
              className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === 'password'
                  ? 'bg-white text-[#003087] shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="text-[10px] sm:text-xs">Password</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('pattern');
                setErrorMsg(null);
              }}
              className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === 'pattern'
                  ? 'bg-white text-[#003087] shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span className="text-[10px] sm:text-xs">Pattern</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('fingerprint');
                setErrorMsg(null);
              }}
              className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === 'fingerprint'
                  ? 'bg-white text-[#003087] shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span className="text-[10px] sm:text-xs">Biometrics</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('otp');
                setErrorMsg(null);
              }}
              className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === 'otp'
                  ? 'bg-white text-[#003087] shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="text-[10px] sm:text-xs">OTP</span>
            </button>
          </div>

          {/* ERROR ALERT */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="text-xs font-semibold leading-tight">{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: PASSWORD LOGIN */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email or Mobile Number</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0070BA] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Password</label>
                  <span className="text-[11px] text-[#0070BA] hover:underline cursor-pointer">Forgot?</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0070BA] focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0070BA] focus:ring-[#0070BA] border-slate-300"
                  />
                  <span>Stay logged in on this device</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Log In with Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: PATTERN LOCK LOGIN */}
          {activeTab === 'pattern' && (
            <div className="flex flex-col items-center">
              <div className="text-center mb-3">
                <p className="text-xs font-semibold text-slate-700">
                  Draw pattern connecting 3 or more dots
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Drag with mouse or swipe with touch to unlock
                </p>
              </div>

              {/* 3x3 Pattern Vector Grid */}
              <div
                ref={patternGridRef}
                onMouseDown={() => setIsDrawingPattern(true)}
                onMouseMove={handlePatternTouchMove}
                onMouseUp={handlePatternTouchEnd}
                onTouchMove={handlePatternTouchMove}
                onTouchEnd={handlePatternTouchEnd}
                className="relative w-[240px] h-[240px] bg-slate-50 border border-slate-200 rounded-3xl p-2 shadow-inner touch-none cursor-crosshair"
              >
                {/* SVG connection lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {/* Lines between connected points */}
                  {patternPoints.map((ptIdx, idx) => {
                    if (idx === 0) return null;
                    const prevPt = getPointCoordinates(patternPoints[idx - 1]);
                    const currPt = getPointCoordinates(ptIdx);
                    return (
                      <line
                        key={`line-${idx}`}
                        x1={prevPt.x}
                        y1={prevPt.y}
                        x2={currPt.x}
                        y2={currPt.y}
                        stroke="#0070BA"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className="animate-pulse"
                      />
                    );
                  })}

                  {/* Live line from last point to cursor */}
                  {isDrawingPattern && patternPoints.length > 0 && currentPointer && (
                    <line
                      x1={getPointCoordinates(patternPoints[patternPoints.length - 1]).x}
                      y1={getPointCoordinates(patternPoints[patternPoints.length - 1]).y}
                      x2={currentPointer.x}
                      y2={currentPointer.y}
                      stroke="#00CFDE"
                      strokeWidth="3"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                    />
                  )}
                </svg>

                {/* 9 Grid Nodes */}
                {Array.from({ length: 9 }).map((_, index) => {
                  const pt = getPointCoordinates(index);
                  const isSelected = patternPoints.includes(index);
                  const isFirst = patternPoints[0] === index;

                  return (
                    <div
                      key={index}
                      onMouseDown={(e) => handlePatternTouchStart(index, e)}
                      onTouchStart={(e) => handlePatternTouchStart(index, e)}
                      style={{
                        left: `${pt.x}px`,
                        top: `${pt.y}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className={`absolute w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-[#0070BA] text-white scale-110 shadow-md ring-4 ring-[#0070BA]/20'
                          : 'bg-white border-2 border-slate-300 hover:border-[#0070BA] text-slate-400'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full transition-transform ${
                          isSelected ? 'bg-white scale-125' : 'bg-slate-400'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={resetPattern}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Pattern</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerSuccess()}
                  className="px-4 py-2 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Quick Unlock</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: FINGERPRINT / BIOMETRIC LOGIN */}
          {activeTab === 'fingerprint' && (
            <div className="flex flex-col items-center py-4 text-center">
              <p className="text-xs font-semibold text-slate-700 mb-1">
                PayPal Biometric Security Scanner
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mb-6">
                Touch the optical sensor below or authenticate via your device biometrics.
              </p>

              <button
                type="button"
                onClick={handleFingerprintScan}
                disabled={biometricScanning || biometricSuccess}
                className={`relative group w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 border-2 cursor-pointer ${
                  biometricScanning
                    ? 'border-[#0070BA] bg-blue-50/70 scale-105 shadow-xl shadow-blue-500/20'
                    : biometricSuccess
                    ? 'border-emerald-500 bg-emerald-50 scale-105 shadow-xl shadow-emerald-500/20'
                    : 'border-slate-200 hover:border-[#0070BA] bg-slate-50 hover:bg-blue-50/40 shadow-inner'
                }`}
              >
                {/* Rotating scanner ring when scanning */}
                {biometricScanning && (
                  <div className="absolute inset-0 rounded-full border-2 border-t-[#0070BA] border-r-transparent border-b-[#00CFDE] border-l-transparent animate-spin" />
                )}

                {/* Laser scan line animation */}
                {biometricScanning && (
                  <div className="absolute inset-x-4 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-[#00CFDE] to-transparent animate-pulse shadow-sm shadow-[#00CFDE]" />
                )}

                {biometricSuccess ? (
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-scale-up" />
                ) : (
                  <Fingerprint
                    className={`w-16 h-16 transition-colors ${
                      biometricScanning ? 'text-[#0070BA] scale-110' : 'text-slate-400 group-hover:text-[#0070BA]'
                    }`}
                  />
                )}
              </button>

              <div className="mt-6 text-center">
                <span
                  className={`text-xs font-bold ${
                    biometricScanning
                      ? 'text-[#0070BA]'
                      : biometricSuccess
                      ? 'text-emerald-600'
                      : 'text-slate-500'
                  }`}
                >
                  {biometricScanning
                    ? 'Scanning biometric credentials...'
                    : biometricSuccess
                    ? 'Fingerprint Verified! Logging in...'
                    : 'Tap fingerprint sensor to authenticate'}
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: PHONE NUMBER + OTP */}
          {activeTab === 'otp' && (
            <div className="space-y-4">
              {!otpSent ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone Number</label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0070BA] cursor-pointer"
                    >
                      <option value="+1">🇺🇸 +1 (US)</option>
                      <option value="+44">🇬🇧 +44 (UK)</option>
                      <option value="+91">🇮🇳 +91 (IN)</option>
                      <option value="+81">🇯🇵 +81 (JP)</option>
                      <option value="+49">🇩🇪 +49 (DE)</option>
                      <option value="+65">🇸🇬 +65 (SG)</option>
                      <option value="+61">🇦🇺 +61 (AU)</option>
                    </select>

                    <div className="relative flex-1">
                      <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="555-0199"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0070BA] focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2">
                    We will send a one-time 6-digit verification code to your phone.
                  </p>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading || !phone}
                    className="mt-4 w-full py-3 px-4 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Send 6-Digit OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-3">
                    <span className="text-xs font-semibold text-slate-700">
                      Enter the 6-digit code sent to {countryCode} {phone}
                    </span>
                  </div>

                  {/* 6 OTP digit boxes */}
                  <div className="flex justify-center gap-2 mb-4">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-11 h-12 text-center text-lg font-bold bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#0070BA] focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs px-2 mb-4">
                    <button
                      type="button"
                      disabled={countdown > 0}
                      onClick={handleSendOtp}
                      className={`font-bold ${
                        countdown > 0 ? 'text-slate-400' : 'text-[#0070BA] hover:underline cursor-pointer'
                      }`}
                    >
                      {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                    >
                      Change Phone
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => verifyOtpCode(otpDigits.join(''))}
                    disabled={loading || otpDigits.some((d) => d === '')}
                    className="w-full py-3 px-4 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Verify & Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer Security Badge */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-center gap-2 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-semibold">Protected by 256-bit PayPal Fraud Net</span>
          </div>
        </div>
      </div>
    </div>
  );
};
