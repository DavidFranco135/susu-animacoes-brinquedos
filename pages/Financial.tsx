import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Wallet, 
  ArrowUpCircle, ArrowDownCircle,
  BarChart3
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Rental, FinancialTransaction } from '../types';

interface FinancialProps {
  rentals: Rental[];
  transactions: FinancialTransaction[];
  setTransactions: (action: any) => void;
}

const Financial: React.FC<FinancialProps> = ({ rentals = [], transactions = [], setTransactions }) => {
  const [viewTab, setViewTab] = useState<'Mês' | 'Ano'>('Mês');
  const [currentDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<'Receitas' | 'Despesas' | 'Lucro' | 'AReceber'>('Lucro');

  // Filtragem e Cálculos com proteção contra valores undefined
  const stats = useMemo(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    const filteredRentals = (rentals || []).filter(r => {
      const d = new Date(r.date + 'T00:00:00');
      return viewTab === 'Mês' ? (d.getMonth() === month && d.getFullYear() === year) : (d.getFullYear() === year);
    });

    const filteredTrans = (transactions || []).filter(t => {
      const d = new Date(t.date);
      return viewTab === 'Mês' ? (d.getMonth() === month && d.getFullYear() === year) : (d.getFullYear() === year);
    });

    const receitas = filteredRentals.reduce((acc, r) => acc + (Number(r.entryValue) || 0), 0);
    const despesas = filteredTrans.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const aReceber = filteredRentals.reduce((acc, r) => acc + ((Number(r.totalValue) || 0) - (Number(r.entryValue) || 0)), 0);
    const lucro = receitas - despesas;

    return { receitas, despesas, aReceber, lucro, filteredRentals, filteredTrans };
  }, [rentals, transactions, currentDate, viewTab]);

  // Dados do gráfico com proteção
  const chartData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months.map((m, i) => {
      const r = stats.filteredRentals.filter(rent => new Date(rent.date + 'T00:00:00').getMonth() === i).reduce((acc, rent) => acc + (Number(rent.entryValue) || 0), 0);
      const d = stats.filteredTrans.filter(t => t.type === 'EXPENSE' && new Date(t.date).getMonth() === i).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      return { name: m, Entradas: r, Saídas: d };
    });
  }, [stats, viewTab]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6">
        <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Fluxo de Caixa</h1>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border">
          <button onClick={() => setViewTab('Mês')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase ${viewTab === 'Mês' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Mês</button>
          <button onClick={() => setViewTab('Ano')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase ${viewTab === 'Ano' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Ano</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card Receitas */}
        <button onClick={() => setActiveFilter('Receitas')} className={`p-6 rounded-[35px] border-2 transition-all text-left ${activeFilter === 'Receitas' ? 'bg-emerald-500 border-emerald-200 text-white shadow-xl' : 'bg-white border-transparent'}`}>
          <ArrowUpCircle size={32} className={activeFilter === 'Receitas' ? 'text-white' : 'text-emerald-500'} />
          <p className="mt-4 text-[10px] font-black uppercase opacity-70">Receitas</p>
          <h3 className="text-2xl font-black">R$ {(stats.receitas || 0).toLocaleString('pt-BR')}</h3>
        </button>

        {/* Card Despesas */}
        <button onClick={() => setActiveFilter('Despesas')} className={`p-6 rounded-[35px] border-2 transition-all text-left ${activeFilter === 'Despesas' ? 'bg-rose-500 border-rose-200 text-white shadow-xl' : 'bg-white border-transparent'}`}>
          <ArrowDownCircle size={32} className={activeFilter === 'Despesas' ? 'text-white' : 'text-rose-500'} />
          <p className="mt-4 text-[10px] font-black uppercase opacity-70">Despesas</p>
          <h3 className="text-2xl font-black">R$ {(stats.despesas || 0).toLocaleString('pt-BR')}</h3>
        </button>

        {/* Card Lucro */}
        <button onClick={() => setActiveFilter('Lucro')} className={`p-6 rounded-[35px] border-2 transition-all text-left ${activeFilter === 'Lucro' ? 'bg-blue-600 border-blue-200 text-white shadow-xl' : 'bg-white border-transparent'}`}>
          <TrendingUp size={32} className={activeFilter === 'Lucro' ? 'text-white' : 'text-blue-600'} />
          <p className="mt-4 text-[10px] font-black uppercase opacity-70">Lucro</p>
          <h3 className="text-2xl font-black">R$ {(stats.lucro || 0).toLocaleString('pt-BR')}</h3>
        </button>

        {/* Card A Receber */}
        <button onClick={() => setActiveFilter('AReceber')} className={`p-6 rounded-[35px] border-2 transition-all text-left ${activeFilter === 'AReceber' ? 'bg-amber-500 border-amber-200 text-white shadow-xl' : 'bg-white border-transparent'}`}>
          <Wallet size={32} className={activeFilter === 'AReceber' ? 'text-white' : 'text-amber-500'} />
          <p className="mt-4 text-[10px] font-black uppercase opacity-70">A Receber</p>
          <h3 className="text-2xl font-black">R$ {(stats.aReceber || 0).toLocaleString('pt-BR')}</h3>
        </button>
      </div>

      <div className="bg-white p-8 rounded-[40px] border shadow-sm h-[400px]">
        <h3 className="text-sm font-black uppercase text-slate-400 mb-6 flex items-center gap-2">
          <BarChart3 size={18} /> Comparativo Financeiro
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} tickFormatter={(v) => `R$${v}`} />
            <Tooltip contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)'}} />
            <Area type="monotone" dataKey="Entradas" stroke="#10b981" fillOpacity={0.1} fill="#10b981" strokeWidth={3} />
            <Area type="monotone" dataKey="Saídas" stroke="#f43f5e" fillOpacity={0.1} fill="#f43f5e" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Listagem com proteção toLocaleString */}
      <div className="bg-white rounded-[30px] border overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
            <tr>
              <th className="px-8 py-4">Descrição</th>
              <th className="px-8 py-4">Data</th>
              <th className="px-8 py-4">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm font-bold">
            {(activeFilter === 'Receitas' || activeFilter === 'Lucro') && stats.filteredRentals.map(r => (
              <tr key={r.id}>
                <td className="px-8 py-4">Entrada: {r.customerName}</td>
                <td className="px-8 py-4 text-slate-400">{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td className="px-8 py-4 text-emerald-600">+ R$ {(Number(r.entryValue) || 0).toLocaleString('pt-BR')}</td>
              </tr>
            ))}
            {(activeFilter === 'Despesas' || activeFilter === 'Lucro') && stats.filteredTrans.map(t => (
              <tr key={t.id}>
                <td className="px-8 py-4">{t.description}</td>
                <td className="px-8 py-4 text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                <td className="px-8 py-4 text-rose-500">- R$ {(Number(t.amount) || 0).toLocaleString('pt-BR')}</td>
              </tr>
            ))}
            {activeFilter === 'AReceber' && stats.filteredRentals.map(r => (
              <tr key={r.id}>
                <td className="px-8 py-4">Pendente: {r.customerName}</td>
                <td className="px-8 py-4 text-slate-400">{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td className="px-8 py-4 text-amber-500">R$ {((Number(r.totalValue) || 0) - (Number(r.entryValue) || 0)).toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Financial;
