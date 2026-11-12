import { SimplifiedDebtTransfer } from '../types';

export interface GroupMemberBalance {
  userId: string;
  userName: string;
  totalPaid: number;
  fairShare: number;
  netBalance: number; // totalPaid - fairShare
}

/**
 * Calculates simplified debt transfers to settle a group with minimum transactions.
 * Net balance = amount paid - fair share.
 * Positive net balance means they are owed money.
 * Negative net balance means they owe money.
 */
export function calculateSimplifiedDebts(
  memberBalances: GroupMemberBalance[],
  currency: string = 'USD'
): SimplifiedDebtTransfer[] {
  // Separate into debtors (owe money) and creditors (owed money)
  const debtors: { userId: string; userName: string; amount: number }[] = [];
  const creditors: { userId: string; userName: string; amount: number }[] = [];

  for (const m of memberBalances) {
    const net = Math.round(m.netBalance * 100) / 100;
    if (net < -0.01) {
      debtors.push({ userId: m.userId, userName: m.userName, amount: -net });
    } else if (net > 0.01) {
      creditors.push({ userId: m.userId, userName: m.userName, amount: net });
    }
  }

  // Sort descending by amount to maximize debt resolution per step
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: SimplifiedDebtTransfer[] = [];

  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0.01) {
      transfers.push({
        fromUserId: debtor.userId,
        fromUserName: debtor.userName,
        toUserId: creditor.userId,
        toUserName: creditor.userName,
        amount: Math.round(settleAmount * 100) / 100,
        currency,
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount <= 0.01) i++;
    if (creditor.amount <= 0.01) j++;
  }

  return transfers;
}
