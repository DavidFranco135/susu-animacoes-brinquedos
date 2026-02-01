import React, { useState, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Legend, ComposedChart, Line
} from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Plus, X, Filter, Download, DollarSign, ChevronRight, PieChart as PieIcon, Activity, BarChart3, Clock, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { FinancialTransaction, Rental, RentalStatus, User, PaymentMethod } from '../types';

interface Props {
  rentals: Rental[];
  setRentals: React.Dispatch<React.SetStateAction<Rental[]>>;
  transactions: FinancialTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
}

const Financial: React.FC<Props> = ({ rentals, setRentals, transactions, setTransactions }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; type: 'INCOME' | 'EXPENSE' | 'PROFIT' | 'PENDING' | null }>({
    isOpen: false,
    type: null
  });
  
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<string>(String(now.getMonth() + 1).padStart(2, '0'));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const filteredData = useMemo(() => {
    const yearMatch = (date: string) => date.startsWith(filterYear);
    const monthMatch = (date: string) => filterMonth === 'ALL' || date.includes(`-${filterMonth}-`);
    return {
      rentals: rentals.filter(r => yearMatch(r.date) && monthMatch(r.date)),
      transactions: transactions.filter(t => yearMatch(t.date) && monthMatch(t.date))
    };
  }, [rentals, transactions, filterYear, filterMonth]);

  const realizedIncomeEntries = useMemo(() => {
    const entries: any[] = [];
    filteredData.rentals.forEach(r => {
      if (r.status === RentalStatus.CANCELLED) return;
      if (r.entryValue > 0) entries.push({ id: `s-${r.id}`, date: r.date, description: `Sinal: ${r.customerName}`, value: r.entryValue, type: 'INCOME' });
      if (r.status === RentalStatus.COMPLETED) {
        const balance = r.totalValue - (r.entryValue || 0);
        if (balance > 0) entries.push({ id: `l-${r.id}`, date: r.date, description: `Saldo: ${r.customerName}`, value: balance, type: 'INCOME' });
      }
    });
    filteredData.transactions.filter(t => t.type !== 'EXPENSE').forEach(t => entries.push({ ...t, value: Number(t.value) }));
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredData]);

  const totalRealizedIncome = useMemo(() => realizedIncomeEntries.reduce((acc, e) => acc + e.value, 0), [realizedIncomeEntries]);
  const totalExpenses = useMemo(() => filteredData.transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.value), 0), [filteredData]);
  const netProfit = totalRealizedIncome - totalExpenses;
  const profitMargin = totalRealizedIncome > 0 ? (netProfit / totalRealizedIncome) * 100 : 0;
  const totalPending = useMemo(() => filteredData.rentals.filter(r => r.status !== RentalStatus.CANCELLED && r.status !== RentalStatus.COMPLETED).reduce((acc, r) => acc + (r.totalValue - (r.entryValue || 0)), 0), [filteredData]);

  const expenseByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredData.transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
        const cat = t.category || 'Outros';
        cats[cat] = (cats[cat] || 0) + Number(t.value);
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const monthlyData = useMemo(() => {
    return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => {
      const mStr = String(i+1).padStart(2,'0');
      const mRentals = rentals.filter(r => r.date.includes(`${filterYear}-${mStr}`));
      const mTrans = transactions.filter(t => t.date.includes(`${filterYear}-${mStr}`));
      const inc = mRentals.reduce((acc, r) => acc + (r.status === RentalStatus.COMPLETED ? r.totalValue : r.entryValue), 0) + 
                  mTrans.filter(t => t.type !== 'EXPENSE').reduce((acc, t) => acc + Number(t.value), 0);
      const exp = mTrans.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.value), 0);
      return { name: m, receita: inc, lucro: inc - exp };
    });
  }, [rentals, transactions, filterYear]);

  const handleSettleDebt = (rentalId: string) => {
    if (!confirm("Confirmar quitação?")) return;
    setRentals(prev => prev.map(r => r.id === rentalId ? { ...r, status: RentalStatus.COMPLETED, entryValue: r.totalValue } : r));
  };

  const StatCard = ({ title, value, sub, icon, color, type, isMoney = true }: any) => (
    <div onClick={() => type && setDetailModal({ isOpen: true, type })} className={`bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm transition-all group relative overflow-hidden ${type ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1' : ''}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform`}></div>
      <div className="relative z-10">
        <div className={`p-4 bg-${color}-50 text-${color}-600 w-fit rounded-2xl mb-6`}>{icon}</div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</p>
        <h3 className="text-2xl font-black text-slate-800">{isMoney ? 'R$ ' : ''}{value.toLocaleString('pt-BR', { minimumFractionDigits: isMoney ? 2 : 1 })}{!isMoney && '%'}</h3>
        <p className={`text-[10px] font-bold mt-2 uppercase tracking-tight flex items-center gap-1 text-${color}-500`}>{sub} {type && <ChevronRight size={12}/>}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Painel Financeiro</h1>
          <p className="text-slate-500 font-medium">Controle de lucros e despesas.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center gap-2">
            <Plus size={18} /> Novo Lançamento
        </button>
      </header>

      <div className="bg-white p-6 rounded-[32px] border flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Filter size={18} className="text-slate-400" />
          <select className="bg-slate-50 px-4 py-2 rounded-xl font-bold border-0 text-sm" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}>
            <option value="ALL">TODOS OS MESES</option>
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
              <option key={m} value={m}>{new Date(2000, Number(m)-1).toLocaleString('pt-BR', {month: 'long'})}</option>
            ))}
          </select>
          <select className="bg-slate-50 px-4 py-2 rounded-xl font-bold border-0 text-sm" value={filterYear} onChange={e=>setFilterYear(e.target.value)}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y.toString()}>{y}</option>)}
          </select>
        </div>
        <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo em Caixa</p>
            <p className="text-xl font-black text-emerald-600">R$ {netProfit.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Entradas" value={totalRealizedIncome} sub="Receita" icon={<TrendingUp size={24}/>} color="emerald" type="INCOME" />
        <StatCard title="Saídas" value={totalExpenses} sub="Gastos" icon={<TrendingDown size={24}/>} color="red" type="EXPENSE" />
        <StatCard title="A Receber" value={totalPending} sub="Pendentes" icon={<Clock size={24}/>} color="amber" type="PENDING" />
        <StatCard title="Margem" value={profitMargin} sub="Lucratividade" icon={<Activity size={24}/>} color="purple" type="PROFIT" isMoney={false} />
        <StatCard title="Lucro Líquido" value={netProfit} sub="Líquido" icon={<DollarSign size={24}/>} color="blue" type="PROFIT" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="bg-white p-8 rounded-[50px] border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3"><div className="w-1.5 h-6 bg-red-500 rounded-full" /> Gastos / Categoria</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseByCategory} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[50px] border border-slate-100 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3"><div className="w-1.5 h-6 bg-blue-600 rounded-full" /> Performance Mensal</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="receita" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                <Line type="monotone" dataKey="lucro" stroke="#3B82F6" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {detailModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[400] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-10 border-b flex justify-between items-center">
                    <h2 className="text-2xl font-black text-slate-800 uppercase">Detalhamento</h2>
                    <button onClick={() => setDetailModal({ isOpen: false, type: null })} className="p-4 bg-slate-50 rounded-2xl text-slate-400"><X size={24}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-10">
                    <table className="w-full text-left">
                        <thead><tr className="text-[11px] font-black text-slate-400 uppercase border-b"><th className="pb-4">Data</th><th className="pb-4">Descrição</th><th className="pb-4 text-right">Valor</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {detailModal.type === 'INCOME' && realizedIncomeEntries.map(e => (
                                <tr key={e.id}><td className="py-4 text-sm">{new Date(e.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td><td className="py-4 font-bold uppercase text-xs">{e.description}</td><td className="py-4 text-right font-black text-emerald-600">R$ {e.value.toLocaleString('pt-BR')}</td></tr>
                            ))}
                            {detailModal.type === 'EXPENSE' && filteredData.transactions.filter(t => t.type === 'EXPENSE').map(t => (
                                <tr key={t.id}><td className="py-4 text-sm">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td><td className="py-4 font-bold uppercase text-xs">{t.description}</td><td className="py-4 text-right font-black text-red-500">R$ {Number(t.value).toLocaleString('pt-BR')}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Financial;
