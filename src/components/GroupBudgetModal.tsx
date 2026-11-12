import React, { useState } from 'react';
import { X, Layers, Plus, Check } from 'lucide-react';
import { GroupBudget, Friend } from '../types';

interface GroupBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveGroup: (group: GroupBudget) => void;
  friends: Friend[];
  currentUserId: string;
}

export const GroupBudgetModal: React.FC<GroupBudgetModalProps> = ({
  isOpen,
  onClose,
  onSaveGroup,
  friends,
  currentUserId,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('TRAVEL');
  const [targetAmount, setTargetAmount] = useState('1500');
  const [currency, setCurrency] = useState('USD');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(['user_sarah', 'user_rahul']);

  if (!isOpen) return null;

  const tagOptions = ['TRAVEL', 'HOME', 'DINING', 'EVENT', 'COMMUTE', 'PROJECT'];

  const toggleMember = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      setSelectedMemberIds(selectedMemberIds.filter((m) => m !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newGroup: GroupBudget = {
      id: `group_${Date.now()}`,
      name: name.trim(),
      description: description.trim() || 'Shared expenses pot',
      tag,
      targetAmount: parseFloat(targetAmount) || 1000,
      currency,
      memberIds: Array.from(new Set([currentUserId, ...selectedMemberIds])),
      billIds: [],
      createdBy: currentUserId,
      createdAt: new Date().toISOString().split('T')[0],
    };

    onSaveGroup(newGroup);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#0070BA]/10 text-[#0070BA]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">New Shared Budget Pot</h3>
              <p className="text-xs text-slate-500">Collectively log bills and simplify settlements</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
              Category Tag
            </label>
            <div className="flex flex-wrap gap-1.5">
              {tagOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    tag === t
                      ? 'bg-[#0070BA] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
              Pot Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tokyo Trip 2026, Apartment 4B"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0070BA]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                Target Budget
              </label>
              <input
                type="number"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-[#0070BA]"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0070BA] font-bold"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="SGD">SGD (S$)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-2">
              Add Members
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {friends.map((f) => {
                const isSelected = selectedMemberIds.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleMember(f.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs transition ${
                      isSelected
                        ? 'bg-blue-50 border-[#0070BA] text-[#0070BA]'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
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
                    {isSelected ? <Check className="w-4 h-4 text-[#0070BA]" /> : <Plus className="w-4 h-4 text-slate-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-4 py-3 rounded-2xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs shadow-sm transition cursor-pointer"
          >
            Create Shared Budget Pot
          </button>
        </form>
      </div>
    </div>
  );
};
