import React from 'react';
import { ArrowRight, Check, Sparkles, Zap } from 'lucide-react';
import { GroupBudget, Bill, Friend } from '../types';
import { calculateSimplifiedDebts, GroupMemberBalance } from '../utils/debtSimplification';
import { formatCurrency } from '../utils/currencies';

interface DebtGraphVisualizerProps {
  group: GroupBudget;
  bills: Bill[];
  friends: Friend[];
  currentUserId: string;
  onSettleTransfer: (transfer: { fromUserName: string; toUserName: string; toUserId: string; amount: number; currency: string }) => void;
}

export const DebtGraphVisualizer: React.FC<DebtGraphVisualizerProps> = ({
  group,
  bills,
  friends,
  currentUserId,
  onSettleTransfer,
}) => {
  const groupBills = bills.filter((b) => b.sharedGroupId === group.id);
  const memberIds = Array.from(new Set([...group.memberIds]));

  const getMember = (id: string) => {
    if (id === currentUserId) {
      return { name: 'You (Alex)', initials: 'AM', color: '#0070BA' };
    }
    const friend = friends.find((f) => f.id === id);
    return {
      name: friend?.name || id,
      initials: friend?.initials || id.substring(0, 2).toUpperCase(),
      color: friend?.avatarColor || '#546E7A',
    };
  };

  const totalPaidByMember: Record<string, number> = {};
  memberIds.forEach((id) => (totalPaidByMember[id] = 0));

  let totalGroupExpenditure = 0;
  groupBills.forEach((b) => {
    const amount = b.convertedTotal || b.total;
    totalGroupExpenditure += amount;
    if (totalPaidByMember[b.paidByUserId] !== undefined) {
      totalPaidByMember[b.paidByUserId] += amount;
    } else {
      totalPaidByMember[b.paidByUserId] = amount;
    }
  });

  const memberCount = Math.max(memberIds.length, 1);
  const fairSharePerPerson = totalGroupExpenditure / memberCount;

  const balances: GroupMemberBalance[] = memberIds.map((id) => {
    const paid = totalPaidByMember[id] || 0;
    const m = getMember(id);
    return {
      userId: id,
      userName: m.name,
      totalPaid: paid,
      fairShare: fairSharePerPerson,
      netBalance: paid - fairSharePerPerson,
    };
  });

  const simplifiedTransfers = calculateSimplifiedDebts(balances, group.currency);
  const rawTransactionCount = groupBills.length * (memberCount - 1);
  const simplifiedCount = simplifiedTransfers.length;
  const reductionPercentage = rawTransactionCount > 0
    ? Math.round(((rawTransactionCount - simplifiedCount) / rawTransactionCount) * 100)
    : 0;

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 p-5 space-y-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0070BA]/10 text-[#0070BA] uppercase">
              {group.tag || 'POT'}
            </span>
            <h3 className="text-base font-bold text-slate-900">{group.name}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Total Spend: <span className="text-slate-900 font-bold font-mono">{formatCurrency(totalGroupExpenditure, group.currency)}</span> • Fair share: <span className="font-mono text-slate-700">{formatCurrency(fairSharePerPerson, group.currency)}</span> per member
          </p>
        </div>

        {reductionPercentage > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>{reductionPercentage}% Fewer Transactions</span>
          </div>
        )}
      </div>

      {/* Member Balances */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-2.5">
          Member Balances
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {balances.map((m) => {
            const memInfo = getMember(m.userId);
            const isOwed = m.netBalance > 0.01;
            const owes = m.netBalance < -0.01;
            return (
              <div
                key={m.userId}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0"
                    style={{ backgroundColor: memInfo.color }}
                  >
                    {memInfo.initials}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-900 truncate">{m.userName}</div>
                    <div className="text-[10px] text-slate-500">Paid {formatCurrency(m.totalPaid, group.currency)}</div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`text-xs font-mono font-bold ${
                      isOwed ? 'text-emerald-600' : owes ? 'text-rose-600' : 'text-slate-400'
                    }`}
                  >
                    {isOwed ? `+${formatCurrency(m.netBalance, group.currency)}` : formatCurrency(m.netBalance, group.currency)}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500">
                    {isOwed ? 'Gets back' : owes ? 'Owes' : 'Settled'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simplified Transfers */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0070BA]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Simplified Settlement Transfers
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            {simplifiedTransfers.length} direct transfers needed
          </span>
        </div>

        {simplifiedTransfers.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-emerald-700 flex items-center justify-center gap-2">
            <Check className="w-4 h-4" />
            <span>Group is fully balanced. No transfers required.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {simplifiedTransfers.map((t, idx) => {
              const fromMem = getMember(t.fromUserId);
              const toMem = getMember(t.toUserId);
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                      <div
                        className="w-6 h-6 rounded-full text-white font-bold text-[10px] flex items-center justify-center"
                        style={{ backgroundColor: fromMem.color }}
                      >
                        {fromMem.initials}
                      </div>
                      <span>{t.fromUserName}</span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400 px-1">
                      <ArrowRight className="w-4 h-4 text-[#0070BA]" />
                      <span className="text-[10px] uppercase font-bold text-[#0070BA]">pays</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                      <div
                        className="w-6 h-6 rounded-full text-white font-bold text-[10px] flex items-center justify-center"
                        style={{ backgroundColor: toMem.color }}
                      >
                        {toMem.initials}
                      </div>
                      <span>{t.toUserName}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {formatCurrency(t.amount, t.currency)}
                    </span>

                    <button
                      onClick={() =>
                        onSettleTransfer({
                          fromUserName: t.fromUserName,
                          toUserName: t.toUserName,
                          toUserId: t.toUserId,
                          amount: t.amount,
                          currency: t.currency,
                        })
                      }
                      className="px-3.5 py-1.5 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <span>Settle via PayPal</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
