import { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { DollarSign, Droplets, Sprout, Hammer, Plus, Trash2, TrendingUp, Calculator, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function TrackerScreen({ onBack }: { onBack: () => void }) {
  const { expenses, addExpense, deleteExpense, t } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [newExpense, setNewExpense] = useState({ 
    category: 'seeds', 
    amount: '', 
    description: '', 
    date: new Date().toISOString().split('T')[0] 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addExpense({
      ...newExpense,
      amount: parseFloat(newExpense.amount)
    });
    setNewExpense({ category: 'seeds', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    setIsAdding(false);
  };

  const stats = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    // Mock ROI Calculation
    // Assuming a typical urban garden produces $15 worth of produce for every $1 spent on seeds/soil over time
    // This is a simplified model for the demo
    const estimatedYieldValue = total * 2.5; 
    const roi = total > 0 ? ((estimatedYieldValue - total) / total) * 100 : 0;

    return { total, byCategory, estimatedYieldValue, roi };
  }, [expenses]);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'water': return <Droplets size={16} />;
      case 'seeds': return <Sprout size={16} />;
      case 'tools': return <Hammer size={16} />;
      default: return <DollarSign size={16} />;
    }
  };

  return (
    <div className="pb-24 px-5 pt-6">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-emerald-950 tracking-tight">{t('expenses_tracker')}</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Financial Analysis</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-100 active:scale-95 transition-all"
        >
          <Plus size={20} />
        </button>
      </header>

      {/* ROI Summary Card - More compact */}
      <div className="bg-emerald-950 rounded-[2.5rem] p-6 text-white mb-8 relative overflow-hidden shadow-2xl shadow-emerald-900/20">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <TrendingUp size={80} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Calculator size={12} className="text-emerald-400" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500">Performance Index</span>
          </div>
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <p className="text-emerald-500/60 text-[9px] font-black uppercase tracking-widest mb-1">Investment</p>
              <h2 className="text-2xl font-black">₹{stats.total.toFixed(2)}</h2>
            </div>
            <div>
              <p className="text-emerald-500/60 text-[9px] font-black uppercase tracking-widest mb-1">Projected ROI</p>
              <h2 className="text-2xl font-black text-emerald-400">+{stats.roi.toFixed(0)}%</h2>
            </div>
          </div>
          <div className="pt-4 border-t border-white/10">
            <p className="text-[10px] text-emerald-100/60 leading-relaxed font-medium italic">
              "Your garden is currently yielding <span className="text-emerald-400 font-bold">₹{stats.estimatedYieldValue.toFixed(2)}</span> in value."
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white border-2 border-zinc-900 rounded-3xl p-6 mb-8"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Category</label>
                  <select 
                    value={newExpense.category}
                    onChange={e => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-xl px-4 py-2 focus:border-zinc-900 outline-none transition-colors"
                  >
                    <option value="seeds">Seeds</option>
                    <option value="soil">Soil</option>
                    <option value="fertilizer">Fertilizer</option>
                    <option value="water">Water</option>
                    <option value="tools">Tools</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Amount (₹)</label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={e => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-xl px-4 py-2 focus:border-zinc-900 outline-none transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Description</label>
                <input 
                  required
                  value={newExpense.description}
                  onChange={e => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-xl px-4 py-2 focus:border-zinc-900 outline-none transition-colors"
                  placeholder="What did you buy?"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Date</label>
                <input 
                  type="date"
                  value={newExpense.date}
                  onChange={e => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-xl px-4 py-2 focus:border-zinc-900 outline-none transition-colors"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="submit"
                  className="flex-1 bg-zinc-900 text-white font-bold py-3 rounded-xl hover:bg-zinc-800 transition-colors"
                >
                  Log Expense
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-6 bg-zinc-100 text-zinc-600 font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Recent Transactions</h3>
        {expenses.map((expense) => (
          <motion.div 
            key={expense.id}
            layout
            className="bg-white border-2 border-zinc-100 rounded-2xl p-4 flex items-center justify-between group hover:border-zinc-200 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400">
                {getCategoryIcon(expense.category)}
              </div>
              <div>
                <h4 className="font-bold text-zinc-900">{expense.description}</h4>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                  {expense.category} • {new Date(expense.date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-black text-zinc-900">-₹{expense.amount.toFixed(2)}</span>
              <button 
                onClick={() => deleteExpense(expense.id)}
                className="p-2 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}

        {expenses.length === 0 && (
          <div className="text-center py-12 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
            <DollarSign className="mx-auto text-zinc-300 mb-2" size={32} />
            <p className="text-zinc-500 text-sm font-medium">No expenses logged yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
