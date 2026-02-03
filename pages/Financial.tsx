import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Wallet, 
  ArrowUpCircle, ArrowDownCircle,
  BarChart3, Download, PieChart as PieChartIcon,
  Activity, TrendingDown as TrendingDownIcon,
  Plus, X, Save
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { Rental, FinancialTransaction, User } from '../types';

interface FinancialProps {
  rentals: Rental[];
  transactions: FinancialTransaction[];
  setTransactions: (action: any) => void;
}

const Financial: React.FC<FinancialProps> = ({ rentals = [], transactions = [], setTransactions }) => {
  const [viewTab, setViewTab] = useState<'Mês' | 'Ano'>('Mês');
  const [currentDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<'Receitas' | 'Despesas' | 'Lucro' | 'AReceber'>('Lucro');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // ✅ NOVO: Estados para o modal de lançamento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'EXPENSE' as 'EXPENSE' | 'INCOME',
    description: '',
    value: 0,
    category: '',
    date: new Date().toISOString().split('T')[0]
  });

  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  // Cores para os gráficos
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
    const despesas = filteredTrans.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + (Number(t.value) || 0), 0);
    const aReceber = filteredRentals.reduce((acc, r) => acc + ((Number(r.totalValue) || 0) - (Number(r.entryValue) || 0)), 0);
    const lucro = receitas - despesas;

    return { receitas, despesas, aReceber, lucro, filteredRentals, filteredTrans };
  }, [rentals, transactions, currentDate, viewTab]);

  // Dados do gráfico de área
  const chartData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months.map((m, i) => {
      const r = stats.filteredRentals.filter(rent => new Date(rent.date + 'T00:00:00').getMonth() === i).reduce((acc, rent) => acc + (Number(rent.entryValue) || 0), 0);
      const d = stats.filteredTrans.filter(t => t.type === 'EXPENSE' && new Date(t.date).getMonth() === i).reduce((acc, t) => acc + (Number(t.value) || 0), 0);
      const lucro = r - d;
      return { name: m, Entradas: r, Saídas: d, Lucro: lucro };
    });
  }, [stats, viewTab]);

  // Dados para gráfico de pizza (Receitas vs Despesas)
  const pieData = useMemo(() => [
    { name: 'Receitas', value: stats.receitas, color: '#10b981' },
    { name: 'Despesas', value: stats.despesas, color: '#ef4444' },
    { name: 'A Receber', value: stats.aReceber, color: '#f59e0b' }
  ], [stats]);

  // Dados para gráfico de barras (Por categoria de despesa)
  const expensesByCategory = useMemo(() => {
    const categories: {[key: string]: number} = {};
    stats.filteredTrans.filter(t => t.type === 'EXPENSE').forEach(t => {
      const cat = t.category || 'Outros';
      categories[cat] = (categories[cat] || 0) + (Number(t.value) || 0);
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [stats]);

  // Dados para gráfico de linha (Evolução do lucro)
  const profitTrendData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months.map((m, i) => {
      const r = stats.filteredRentals.filter(rent => new Date(rent.date + 'T00:00:00').getMonth() === i).reduce((acc, rent) => acc + (Number(rent.entryValue) || 0), 0);
      const d = stats.filteredTrans.filter(t => t.type === 'EXPENSE' && new Date(t.date).getMonth() === i).reduce((acc, t) => acc + (Number(t.value) || 0), 0);
      return { name: m, Lucro: r - d };
    });
  }, [stats]);

  // ✅ NOVA FUNÇÃO: Salvar lançamento
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.value || formData.value <= 0) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const newTransaction: FinancialTransaction = {
      id: `t${Date.now()}`,
      type: formData.type,
      description: formData.description,
      value: Number(formData.value),
      category: formData.category || 'Outros',
      date: formData.date
    };

    setTransactions([...transactions, newTransaction]);
    
    // Limpa o formulário
    setFormData({
      type: 'EXPENSE',
      description: '',
      value: 0,
      category: '',
      date: new Date().toISOString().split('T')[0]
    });
    
    setIsModalOpen(false);
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      const element = document.getElementById('financial-report-print');
      if (!element) {
        alert('Erro: Elemento não encontrado');
        return;
      }
      
      element.style.display = 'block';
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';
      element.style.width = '1200px';
      
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await (window as any).html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 1200,
        height: element.scrollHeight
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const { jsPDF } = (window as any).jspdf;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (imgHeight <= pageHeight - (margin * 2)) {
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = margin;
        
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - margin);
        
        while (heightLeft > 0) {
          position = heightLeft - imgHeight + margin;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      pdf.save(`relatorio-financeiro-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
      
      element.style.display = 'none';
      element.style.position = '';
      element.style.left = '';
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar o relatório PDF. Por favor, tente novamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight uppercase">Financeiro</h1>
          <p className="text-slate-500 font-medium">
            {viewTab === 'Mês' ? 
              `${currentDate.toLocaleDateString('pt-BR', { month: 'long' })} de ${currentDate.getFullYear()}` :
              currentDate.getFullYear()
            }
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {/* ✅ NOVO BOTÃO: Lançar Despesa/Receita */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg"
          >
            <Plus size={18} strokeWidth={3} /> Novo Lançamento
          </button>

          <button 
            onClick={handleDownloadPDF} 
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            <Download size={18} /> {isGeneratingPDF ? 'Gerando...' : 'Relatório PDF'}
          </button>
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border">
            <button onClick={() => setViewTab('Mês')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase ${viewTab === 'Mês' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Mês</button>
            <button onClick={() => setViewTab('Ano')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase ${viewTab === 'Ano' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Ano</button>
          </div>
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

      {/* Gráficos - Grade 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Área - Comparativo Financeiro */}
        <div className="bg-white p-8 rounded-[40px] border shadow-sm h-[400px]">
          <h3 className="text-sm font-black uppercase text-slate-400 mb-6 flex items-center gap-2">
            <BarChart3 size={18} /> Comparativo Mensal
          </h3>
          <ResponsiveContainer width="100%" height="90%">
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

        {/* Gráfico 2: Pizza - Distribuição */}
        <div className="bg-white p-8 rounded-[40px] border shadow-sm h-[400px]">
          <h3 className="text-sm font-black uppercase text-slate-400 mb-6 flex items-center gap-2">
            <PieChartIcon size={18} /> Distribuição Financeira
          </h3>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `R$ ${value.toLocaleString('pt-BR')}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 3: Barras - Despesas por Categoria */}
        <div className="bg-white p-8 rounded-[40px] border shadow-sm h-[400px]">
          <h3 className="text-sm font-black uppercase text-slate-400 mb-6 flex items-center gap-2">
            <BarChart3 size={18} /> Despesas por Categoria
          </h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={expensesByCategory}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(value: any) => `R$ ${value.toLocaleString('pt-BR')}`} contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)'}} />
              <Bar dataKey="value" fill="#ef4444" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 4: Linha - Evolução do Lucro */}
        <div className="bg-white p-8 rounded-[40px] border shadow-sm h-[400px]">
          <h3 className="text-sm font-black uppercase text-slate-400 mb-6 flex items-center gap-2">
            <Activity size={18} /> Evolução do Lucro
          </h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={profitTrendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(value: any) => `R$ ${value.toLocaleString('pt-BR')}`} contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)'}} />
              <Line type="monotone" dataKey="Lucro" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
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
                <td className="px-8 py-4 text-rose-500">- R$ {(Number(t.value) || 0).toLocaleString('pt-BR')}</td>
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

      {/* ✅ NOVO MODAL: Lançamento de Despesas/Receitas */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveTransaction} className="bg-white w-full max-w-2xl rounded-[40px] p-10 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Novo Lançamento</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'EXPENSE'})}
                className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                  formData.type === 'EXPENSE' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <ArrowDownCircle size={18} className="inline mr-2" /> Despesa
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'INCOME'})}
                className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                  formData.type === 'INCOME' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <ArrowUpCircle size={18} className="inline mr-2" /> Receita
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Descrição *</label>
                <input
                  type="text"
                  required
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Ex: Aluguel, Combustível, Manutenção..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20"
                    value={formData.value === 0 ? '' : formData.value}
                    onChange={e => setFormData({...formData, value: Number(e.target.value)})}
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data *</label>
                  <input
                    type="date"
                    required
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Categoria (Opcional)</label>
                <input
                  type="text"
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  placeholder="Ex: Operacional, Marketing, Transporte..."
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} /> Salvar Lançamento
            </button>
          </form>
        </div>
      )}

      {/* Elemento oculto para geração de PDF (mantém original) */}
      <div id="financial-report-print" style={{display: 'none'}} className="bg-white p-16">
        <div className="text-center mb-12 border-b-4 border-slate-900 pb-8">
          <h1 className="text-5xl font-black text-slate-900 uppercase mb-4">Relatório Financeiro</h1>
          <p className="text-slate-500 font-bold text-xl">
            {viewTab === 'Mês' ? 
              `${currentDate.toLocaleDateString('pt-BR', { month: 'long' })} de ${currentDate.getFullYear()}` :
              `Ano de ${currentDate.getFullYear()}`
            }
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-12">
          <div className="bg-emerald-50 p-8 rounded-3xl border-4 border-emerald-200">
            <p className="text-sm font-black uppercase text-emerald-600 mb-2">Receitas</p>
            <h3 className="text-4xl font-black text-emerald-700">R$ {(stats.receitas || 0).toLocaleString('pt-BR')}</h3>
          </div>

          <div className="bg-rose-50 p-8 rounded-3xl border-4 border-rose-200">
            <p className="text-sm font-black uppercase text-rose-600 mb-2">Despesas</p>
            <h3 className="text-4xl font-black text-rose-700">R$ {(stats.despesas || 0).toLocaleString('pt-BR')}</h3>
          </div>

          <div className="bg-blue-50 p-8 rounded-3xl border-4 border-blue-200">
            <p className="text-sm font-black uppercase text-blue-600 mb-2">Lucro</p>
            <h3 className="text-4xl font-black text-blue-700">R$ {(stats.lucro || 0).toLocaleString('pt-BR')}</h3>
          </div>

          <div className="bg-amber-50 p-8 rounded-3xl border-4 border-amber-200">
            <p className="text-sm font-black uppercase text-amber-600 mb-2">A Receber</p>
            <h3 className="text-4xl font-black text-amber-700">R$ {(stats.aReceber || 0).toLocaleString('pt-BR')}</h3>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-black text-slate-900 uppercase border-b-2 border-slate-200 pb-4">Detalhamento</h2>
          
          <div>
            <h3 className="text-lg font-black text-emerald-600 uppercase mb-4">Receitas</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="px-4 py-3 font-black text-xs uppercase">Descrição</th>
                  <th className="px-4 py-3 font-black text-xs uppercase">Data</th>
                  <th className="px-4 py-3 font-black text-xs uppercase text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {stats.filteredRentals.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="px-4 py-3 font-bold text-sm">Entrada: {r.customerName}</td>
                    <td className="px-4 py-3 text-slate-500 text-sm">{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-emerald-600 font-black text-right">R$ {(Number(r.entryValue) || 0).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-lg font-black text-rose-600 uppercase mb-4">Despesas</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="px-4 py-3 font-black text-xs uppercase">Descrição</th>
                  <th className="px-4 py-3 font-black text-xs uppercase">Data</th>
                  <th className="px-4 py-3 font-black text-xs uppercase text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {stats.filteredTrans.map(t => (
                  <tr key={t.id} className="border-b">
                    <td className="px-4 py-3 font-bold text-sm">{t.description}</td>
                    <td className="px-4 py-3 text-slate-500 text-sm">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-rose-600 font-black text-right">R$ {(Number(t.value) || 0).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Financial;
