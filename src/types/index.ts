export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  initials: string;
  avatarColor: string;
  paypalHandle: string;
  baseCurrency: string;
  walletBalance: number;
  biometricRegistered: boolean;
  pin: string;
  password?: string;
  pattern?: number[];
}

export interface Friend {
  id: string;
  name: string;
  email: string;
  phone: string;
  initials: string;
  avatarColor: string;
  paypalHandle: string;
  netBalance: number; // positive: owes me, negative: I owe them
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category: string;
  assignedToUserIds?: string[];
}

export interface BillSplit {
  userId: string;
  userName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'settled';
  settledAt?: string;
  paypalTxId?: string;
}

export interface Bill {
  id: string;
  merchant: string;
  date: string;
  currency: string;
  baseCurrency: string;
  exchangeRateAtScan: number;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  convertedTotal: number;
  category: string;
  splitType: 'equal' | 'exact' | 'itemized' | 'none';
  splits: BillSplit[];
  paidByUserId: string;
  sharedGroupId?: string;
  receiptImageUrl?: string;
  duplicateSignature?: string;
  fraudAlerts?: string[];
  aiAnalysis?: string;
  notes?: string;
  createdAt: string;
}

export interface GroupBudget {
  id: string;
  name: string;
  description: string;
  tag: string;
  targetAmount: number;
  currency: string;
  memberIds: string[];
  billIds: string[];
  createdBy: string;
  createdAt: string;
}

export interface RecurringBill {
  id: string;
  name: string;
  merchant: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'yearly';
  nextDueDate: string;
  daysUntilDue: number;
  category: string;
  status: 'pending' | 'paid';
  autoRemind: boolean;
}

export interface SavingsChallenge {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  savedAmount: number;
  currency: string;
  daysLeft: number;
  totalDays: number;
  completed: boolean;
  categoryTag: string;
}

export interface AppNotification {
  id: string;
  type: 'split_request' | 'bill_due' | 'payment_received' | 'budget_warning';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  amount?: number;
  currency?: string;
  fromUser?: string;
  actionableSplitId?: string;
}

export interface SimplifiedDebtTransfer {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
}

// PayPal API Integration Types
export interface PayPalOrder {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  intent: 'CAPTURE' | 'AUTHORIZE';
  amount: {
    currency_code: string;
    value: string;
  };
  payer?: {
    name?: { given_name: string; surname: string };
    email_address?: string;
    payer_id?: string;
  };
  create_time: string;
  update_time?: string;
  links: Array<{ href: string; rel: string; method: string }>;
}

export interface PayPalInvoiceItem {
  name: string;
  description?: string;
  quantity: string;
  unit_amount: {
    currency_code: string;
    value: string;
  };
  tax?: {
    name: string;
    percent: string;
  };
}

export interface PayPalInvoice {
  id: string;
  status: 'DRAFT' | 'SENT' | 'SCHEDULED' | 'PAID' | 'MARKED_AS_PAID' | 'CANCELLED' | 'REFUNDED';
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  recipient_email: string;
  recipient_name: string;
  items: PayPalInvoiceItem[];
  total_amount: {
    currency_code: string;
    value: string;
  };
  note?: string;
  shareable_link?: string;
}

export interface PayPalPayoutItem {
  recipient_type: 'EMAIL' | 'PHONE' | 'PAYPAL_ID';
  amount: {
    value: string;
    currency: string;
  };
  receiver: string;
  note: string;
  sender_item_id: string;
  recipient_name?: string;
  transaction_status?: 'SUCCESS' | 'PENDING' | 'FAILED';
  payout_item_id?: string;
}

export interface PayPalPayoutBatch {
  payout_batch_id: string;
  batch_status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'DENIED' | 'CANCELED';
  time_created: string;
  sender_batch_header: {
    sender_batch_id: string;
    email_subject: string;
    email_message: string;
  };
  items: PayPalPayoutItem[];
  total_amount: number;
  currency: string;
}

export interface PayPalSubscriptionPlan {
  id: string;
  product_id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  billing_cycles: Array<{
    frequency: { interval_unit: 'MONTH' | 'YEAR'; interval_count: number };
    tenure_type: 'REGULAR' | 'TRIAL';
    sequence: number;
    total_cycles: number;
    pricing_scheme: { fixed_price: { value: string; currency_code: string } };
  }>;
}

export interface PayPalDispute {
  dispute_id: string;
  create_time: string;
  update_time: string;
  disputed_transactions: Array<{
    buyer_transaction_id: string;
    seller_transaction_id: string;
    create_time: string;
    transaction_status: string;
    gross_amount: { currency_code: string; value: string };
  }>;
  reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED' | 'INCORRECT_SPLIT_CALCULATION' | 'DUPLICATE_TRANSACTION' | 'UNAUTHORIZED';
  status: 'WAITING_FOR_BUYER_RESPONSE' | 'UNDER_REVIEW' | 'RESOLVED' | 'RESOLVED_WITH_REFUND';
  dispute_amount: { currency_code: string; value: string };
  aiAnalysisSummary?: string;
}

export interface PayPalWebhookEvent {
  id: string;
  create_time: string;
  event_type: string;
  summary: string;
  resource_type: string;
  status: 'SUCCESS' | 'FAILED';
}
