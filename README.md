# 🌐 PaySplit AI — Smart Global Bills & Expense Hub
### PayPal AI Hackathon Edition

PaySplit AI is an intelligent financial companion and multi-party expense settlement hub powered by PayPal developer APIs and multimodal AI. It combines multimodal bill OCR scanning, automated debt simplification, multi-currency live conversions, biometrics & multi-factor authentication, and direct PayPal API workflows.

---

## 🚀 Key Highlights & PayPal Hackathon Integrations

### 1. Complete PayPal API Suite
- **PayPal Orders v2 API** (`/api/paypal/orders/create`, `/api/paypal/orders/:id/capture`): Seamless checkout and payment capture for bill splits and direct payments.
- **PayPal Invoicing v2 API** (`/api/paypal/invoices/create`, `/api/paypal/invoices/:id/send`, `/api/paypal/invoices/generate-number`): Automatically generates itemized digital split invoices sent straight to friends' emails.
- **PayPal Payouts v1 API** (`/api/paypal/payouts/create`, `/api/paypal/payouts/:id`): Instant batch payouts to reimburse group members in 1-click.
- **PayPal Subscriptions & Billing Agreements v1 API** (`/api/paypal/subscriptions/create`, `/api/paypal/subscriptions/plans`): Recurring expense tracking and subscription management (utilities, streaming, rent).
- **PayPal Disputes API** (`/api/paypal/disputes`, `/api/paypal/disputes/:id/provide-evidence`): AI-assisted receipt analysis for transaction protection and bill discrepancies.
- **PayPal Identity & OAuth 2.0** (`/api/paypal/oauth/token`, `/api/paypal/identity/userinfo`): Secure token exchange and identity synchronization.
- **PayPal Smart QR Codes**: Real-time generation of encrypted dynamic payment QR payloads for instant in-person settlement.

### 2. Multi-Method Secure Login & Authentication
- 🔑 **Password Authentication**: Standard secure email/username + password credentials with toggle visibility.
- 🌀 **Interactive Pattern Lock**: 9-node interactive vector pattern grid with drag connecting lines, instant touch/mouse verification, and security resets.
- 👆 **Fingerprint / Biometrics**: WebAuthn biometric simulation with pulsing biometric ring sensor and hardware-like haptic feedback.
- 📱 **Phone Number + OTP Verification**: Dynamic country code selector, real SMS dispatch simulation, 60-second cooldown timer, and auto-focusing 6-pin OTP inputs.
- 👤 **Quick Demo Personas**: Instant 1-click login as Alex Miller (Host), Sarah Chen (Friend), Rahul Sharma (Buddy), or Emma Watson (Co-traveler).

### 3. AI Receipt Vision & Financial Intelligence
- Multimodal OCR invoice & receipt analysis extracting line-items, tax, tips, and category breakdowns.
- Automated duplicate receipt detection & bill tampering alerts.
- Debt simplification graph engine minimizing total cross-friend payment transactions.
- Real-time multi-currency exchange rates supporting 11+ global currencies with live travel conversions.

---

## 🛠️ Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti
- **Backend**: Node.js, Express, TSX, Vite 8
- **AI Engine**: Google Gemini Multimodal Vision & System Instruction Reasoning
- **Payment Gateway**: PayPal Developer REST APIs (Sandbox & Live)

---

## ⚡ Getting Started Locally

### Prerequisites
- Node.js (v18+)
- npm or bun

### 1. Installation
```bash
npm install --legacy-peer-deps
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your optional keys (Gemini API key and PayPal Sandbox credentials). PaySplit AI features built-in high-fidelity fallbacks and realistic sandbox simulation if keys are omitted.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Production Build
```bash
npm run build
npm start
```
