import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Scan, X, Copy, Check, Shield } from 'lucide-react';
import QRCode from 'qrcode';
import { UserProfile, Friend } from '../types';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  friends: Friend[];
  onFriendScanned: (scannedFriend: Friend) => void;
  initialMode?: 'my_qr' | 'scan';
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  friends,
  onFriendScanned,
  initialMode = 'my_qr',
}) => {
  const [activeTab, setActiveTab] = useState<'my_qr' | 'scan'>(initialMode);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [scannedSuccess, setScannedSuccess] = useState<Friend | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setScannedSuccess(null);
      const payload = JSON.stringify({
        id: currentUser.id,
        name: currentUser.name,
        phone: currentUser.phone,
        paypalHandle: currentUser.paypalHandle,
        app: 'paysplit.ai',
      });
      QRCode.toDataURL(payload, {
        width: 260,
        margin: 2,
        color: {
          dark: '#0070BA',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [isOpen, currentUser, initialMode]);

  useEffect(() => {
    if (isOpen && activeTab === 'scan') {
      startScannerCamera();
    } else {
      stopScannerCamera();
    }
    return () => {
      stopScannerCamera();
    };
  }, [isOpen, activeTab]);

  const startScannerCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn('Scanner camera fallback:', e);
    }
  };

  const stopScannerCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(`https://paypal.me/${currentUser.paypalHandle}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateScanFriend = (friend: Friend) => {
    setScannedSuccess(friend);
    setTimeout(() => {
      onFriendScanned(friend);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-center overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab switch */}
        <div className="inline-flex p-1 bg-slate-100 rounded-2xl mb-6">
          <button
            onClick={() => setActiveTab('my_qr')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'my_qr'
                ? 'bg-white text-[#0070BA] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            My QR Code
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'scan'
                ? 'bg-white text-[#0070BA] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            Scan QR
          </button>
        </div>

        {activeTab === 'my_qr' ? (
          <div className="flex flex-col items-center">
            {/* User Initials Avatar */}
            <div
              className="w-14 h-14 rounded-full text-white font-bold text-lg flex items-center justify-center mb-2 shadow-sm"
              style={{ backgroundColor: currentUser.avatarColor }}
            >
              {currentUser.initials}
            </div>

            <h3 className="text-base font-bold text-slate-900">{currentUser.name}</h3>
            <p className="text-xs font-mono text-[#0070BA] mb-4">paypal.me/{currentUser.paypalHandle}</p>

            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="PaySplit QR Code" className="w-48 h-48 mx-auto rounded-lg" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                  Generating QR...
                </div>
              )}
            </div>

            <p className="mt-4 text-xs text-slate-500 max-w-xs leading-relaxed">
              Scan to send money or request split with PayPal.
            </p>

            <button
              onClick={handleCopyLink}
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Copied PayPal.Me Link</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#0070BA]" />
                  <span>Copy paypal.me/{currentUser.paypalHandle}</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <h3 className="text-base font-bold text-slate-900 mb-1">Scan Friend's QR Code</h3>
            <p className="text-xs text-slate-500 mb-4">Point camera at friend's PaySplit QR</p>

            <div className="relative w-56 h-56 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-4 border-2 border-[#0070BA] rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-[#0070BA] animate-pulse" />
              </div>
            </div>

            {scannedSuccess && (
              <div className="mt-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                <span>Found {scannedSuccess.name}! Connecting...</span>
              </div>
            )}

            <div className="mt-4 w-full text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                Or select nearby contact:
              </span>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {friends.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleSimulateScanFriend(f)}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-xs transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full text-white font-bold text-[10px] flex items-center justify-center"
                        style={{ backgroundColor: f.avatarColor }}
                      >
                        {f.initials}
                      </div>
                      <span className="font-semibold text-slate-900">{f.name}</span>
                    </div>
                    <span className="text-[10px] text-[#0070BA] font-mono">@{f.paypalHandle}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
