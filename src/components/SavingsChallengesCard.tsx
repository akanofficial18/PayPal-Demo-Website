import React from 'react';
import { Target, Plus, CheckCircle2 } from 'lucide-react';
import { SavingsChallenge } from '../types';
import { formatCurrency } from '../utils/currencies';

interface SavingsChallengesCardProps {
  challenges: SavingsChallenge[];
  onAddProgress: (challengeId: string, amount: number) => void;
  currency: string;
}

export const SavingsChallengesCard: React.FC<SavingsChallengesCardProps> = ({
  challenges,
  onAddProgress,
  currency,
}) => {
  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#0070BA]/10 text-[#0070BA]">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Savings & Discipline Goals</h3>
            <p className="text-[11px] text-slate-500">Track budgeted savings for trips and everyday spending</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {challenges.map((c) => {
          const progressPercent = Math.min(Math.round((c.savedAmount / c.targetAmount) * 100), 100);
          const isFinished = progressPercent >= 100;

          return (
            <div
              key={c.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{c.title}</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                    {c.categoryTag || 'TARGET'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{c.description}</p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-slate-500">
                    Saved {formatCurrency(c.savedAmount, c.currency)} of {formatCurrency(c.targetAmount, c.currency)}
                  </span>
                  <span className="text-[#0070BA] font-bold">{progressPercent}%</span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFinished ? 'bg-emerald-500' : 'bg-[#0070BA]'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                <span className="text-slate-500">{c.daysLeft} days remaining</span>
                {!isFinished ? (
                  <button
                    onClick={() => onAddProgress(c.id, 15)}
                    className="text-xs font-bold text-[#0070BA] hover:underline flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log +$15 Saved</span>
                  </button>
                ) : (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Goal Reached
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
