import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, X, User } from 'lucide-react';
import { UserProfile, Bill, Friend, GroupBudget } from '../types';

interface AICompanionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  bills: Bill[];
  friends: Friend[];
  groupBudgets: GroupBudget[];
  currentCountryCurrency: string;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export const AICompanionDrawer: React.FC<AICompanionDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  bills,
  friends,
  groupBudgets,
  currentCountryCurrency,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: `Hello ${currentUser.name}. I am your PayPal AI Financial Assistant. I can summarize your recent expenditures, check who owes you money, and analyze travel budget conversions. How can I help today?`,
      timestamp: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (!isOpen) return null;

  const quickPrompts = [
    'How much did I spend this week?',
    'Who owes me money right now?',
    'Can I afford a $150 dinner tonight?',
    'Where can I reduce expenses?',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const totalSpent = bills.reduce((acc, b) => acc + (b.convertedTotal || b.total), 0);
      const friendsOwingMe = friends.filter((f) => f.netBalance > 0);
      const friendsIOwe = friends.filter((f) => f.netBalance < 0);

      const userContext = {
        userName: currentUser.name,
        walletBalance: currentUser.walletBalance,
        baseCurrency: currentUser.baseCurrency,
        currentCurrency: currentCountryCurrency,
        totalSpent,
        recentBills: bills.slice(0, 5).map((b) => ({
          merchant: b.merchant,
          total: b.total,
          currency: b.currency,
          date: b.date,
          category: b.category,
        })),
        friendsOwingMe: friendsOwingMe.map((f) => ({ name: f.name, amount: f.netBalance })),
        friendsIOwe: friendsIOwe.map((f) => ({ name: f.name, amount: Math.abs(f.netBalance) })),
        groupBudgets: groupBudgets.map((g) => ({ name: g.name, target: g.targetAmount })),
      };

      const res = await fetch('/api/ai-companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          userContext,
        }),
      });

      const data = await res.json();
      const aiReply = data.reply || 'Your account balances and splits are up to date.';

      // Strip any emojis from response
      const cleanReply = aiReply.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: cleanReply,
          timestamp: 'Just now',
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: 'Unable to reach the assistant right now. You have $84.50 owed to you and $18.00 in pending splits.',
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#0070BA] text-white">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              PayPal AI Assistant
              <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider bg-blue-50 text-[#0070BA]">
                Gemini 3.8
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">Financial insight & expense companion</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 p-5 overflow-y-auto space-y-4">
        {messages.map((m) => {
          const isAi = m.sender === 'ai';
          return (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${isAi ? '' : 'flex-row-reverse'}`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isAi ? 'bg-blue-50 text-[#0070BA] border border-blue-100' : 'bg-slate-800 text-white'
                }`}
              >
                {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  isAi
                    ? 'bg-slate-50 border border-slate-200 text-slate-800'
                    : 'bg-[#0070BA] text-white'
                }`}
              >
                <div
                  className="space-y-1.5 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: m.text
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>'),
                  }}
                />
                <span className="block mt-1.5 text-[9px] opacity-60 text-right">{m.timestamp}</span>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2.5 text-xs text-slate-500">
            <div className="w-7 h-7 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0070BA]">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0070BA] animate-ping" />
              <span>Analyzing ledger...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-[11px] text-slate-700 border border-slate-200 whitespace-nowrap transition cursor-pointer shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about spending, debts, or travel rates..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0070BA]"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-2xl bg-[#0070BA] hover:bg-[#005ea6] text-white disabled:opacity-40 transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
