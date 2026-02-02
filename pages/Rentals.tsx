import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, X, ChevronLeft, ChevronRight, Edit3, Calendar as CalendarIcon, List, CalendarDays, BarChart3, Clock, CheckCircle2, MapPin, UserPlus, FileSpreadsheet, Download, Phone, Share2, MessageCircle, Trash2, ClipboardList, Filter } from 'lucide-react';
import { Rental, RentalStatus, Customer, Toy, User, UserRole, PaymentMethod } from '../types';

interface RentalsProps {
  rentals: Rental[];
  setRentals: React.Dispatch<React.SetStateAction<Rental[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  toys: Toy[];
}

const Rentals: React.FC<RentalsProps> = ({ rentals, setRentals, customers, setCustomers, toys }) => {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOSModalOpen, setIsOSModalOpen] = useState(false);
  const [pdfIncludeValues, setPdfIncludeValues] = useState(true);
  const [selectedForOS, setSelectedForOS] = useState<Rental | null>(null);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [viewTab, setViewTab] = useState<'Mês' | 'Ano' | 'Lista'>('Mês');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Estado para filtro de categoria de brinquedos
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  // Extrair categorias únicas dos brinquedos
  const categories = useMemo(() => {
    const cats = toys.map(t => t.category || 'Geral');
    return ['Todas', ...Array.from(new Set(cats))];
  }, [toys]);

  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  const [formData, setFormData] = useState<Partial<Rental & { additionalValue: number }>>({
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '18:00',
    status: RentalStatus.PENDING,
    toyIds: [],
    totalValue: 0,
    entryValue: 0,
    additionalValue: 0, // Novo campo
    paymentMethod: 'PIX',
    eventAddress: ''
  });

  const handleOpenModal = (rental?: Rental) => {
    setSelectedCategory('Todas');
    if (rental) {
      setEditingRental(rental);
      setFormData({
        ...rental,
        additionalValue: (rental as any).additionalValue || 0
      });
    } else {
      setEditingRental(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '18:00',
        status: RentalStatus.PENDING,
        toyIds: [],
        totalValue: 0,
        entryValue: 0,
        additionalValue: 0,
        paymentMethod: 'PIX',
        eventAddress: ''
      });
    }
    setIsModalOpen(true);
  };

  // Cálculo do valor total: Soma dos brinquedos + Valor adicional
  useEffect(() => {
    const selectedToys = toys.filter(t => formData.toyIds?.includes(t.id));
    const toysTotal = selectedToys.reduce((acc, t) => acc + (t.price || 0), 0);
    const additional = Number(formData.additionalValue) || 0;
    const finalTotal = toysTotal + additional;

    if (finalTotal !== formData.totalValue) {
      setFormData(prev => ({ ...prev, totalValue: finalTotal }));
    }
  }, [formData.toyIds, formData.additionalValue, toys]);

  const filteredToys = useMemo(() => {
    if (selectedCategory === 'Todas') return toys;
    return toys.filter(t => t.category === selectedCategory);
  }, [toys, selectedCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) return alert("Selecione um cliente");

    const customer = customers.find(c => c.id === formData.customerId);
    const newRental: any = {
      ...formData,
      id: editingRental?.id || `r${Date.now()}`,
      customerName: customer?.name || 'Cliente',
      entryValue: Number(formData.entryValue) || 0,
      additionalValue: Number(formData.additionalValue) || 0
    };

    setRentals(prev => editingRental ? prev.map(r => r.id === editingRental.id ? newRental : r) : [...prev, newRental]);
    setIsModalOpen(false);
  };

  // ... (mantenha as funções handleDownloadPDF, handleCompleteEvent, etc, conforme seu original)

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* ... (Header e Tabela mantidos) ... */}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-2xl rounded-[40px] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">{editingRental ? 'Editar Reserva' : 'Nova Reserva'}</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Configure o cliente e atrações.</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-all"><X size={24}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Cliente */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente Solicitante</label>
                <select required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-slate-700 text-sm" value={formData.customerId} onChange={e => {
                  const cust = customers.find(c => c.id === e.target.value);
                  setFormData({...formData, customerId: e.target.value, eventAddress: cust?.address || ''});
                }}>
                  <option value="">Selecione na Base de Dados</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Filtro de Categoria e Seleção de Brinquedos */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Atrações</label>
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full">
                        <Filter size={12} className="text-slate-500"/>
                        <select 
                            className="bg-transparent text-[10px] font-bold uppercase text-slate-600 outline-none"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-6 bg-slate-50 rounded-[32px] border-2 border-slate-100">
                    {filteredToys.map(t => (
                        <label key={t.id} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${formData.toyIds?.includes(t.id) ? 'bg-white border-blue-500 shadow-sm' : 'bg-white/50 border-transparent hover:border-slate-200'}`}>
                            <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-blue-600" checked={formData.toyIds?.includes(t.id)} onChange={e => {
                                const current = formData.toyIds || [];
                                const next = e.target.checked ? [...current, t.id] : current.filter(id => id !== t.id);
                                setFormData({...formData, toyIds: next});
                            }} />
                            <div className="flex-1">
                                <p className="text-xs font-black text-slate-700">{t.name}</p>
                                <p className="text-[10px] font-bold text-slate-400">R$ {t.price?.toLocaleString('pt-BR')}</p>
                            </div>
                        </label>
                    ))}
                </div>
              </div>

              {/* Valor Adicional (Opção pedida) */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">Valor Adicional (Frete/Extras)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="w-full px-6 py-4 bg-blue-50 border-2 border-blue-100 rounded-2xl font-black text-blue-700 text-lg" 
                  value={formData.additionalValue || ''} 
                  onChange={e => setFormData({...formData, additionalValue: Number(e.target.value)})} 
                  placeholder="0,00"
                />
              </div>

              {/* Sinal Recebido */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Sinal Recebido (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="w-full px-6 py-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-black text-emerald-700 text-lg" 
                  value={formData.entryValue === 0 ? '' : formData.entryValue} 
                  onChange={e => setFormData({...formData, entryValue: Number(e.target.value)})} 
                  placeholder="0,00"
                />
              </div>

              {/* Endereço, Data, Hora e Status continuam aqui... */}
              {/* (Omitido para brevidade, mas devem ser mantidos do seu código original) */}
            </div>

            {/* Painel de Valores */}
            <div className="bg-slate-900 p-8 rounded-[40px] flex items-center justify-between text-white shadow-xl">
                 <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[3px] mb-1">Total (Itens + Adicional)</p>
                    <h3 className="text-3xl font-black">R$ {(formData.totalValue || 0).toLocaleString('pt-BR')}</h3>
                 </div>
                 <div className="text-right">
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-[2px] mb-1">A Receber</p>
                    <h3 className="text-xl font-black">R$ {((formData.totalValue || 0) - (formData.entryValue || 0)).toLocaleString('pt-BR')}</h3>
                 </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-400 font-black text-sm uppercase tracking-widest hover:bg-slate-50 rounded-3xl transition-all">Cancelar</button>
              <button type="submit" className="flex-[2] py-5 bg-blue-600 text-white font-black text-sm uppercase tracking-widest rounded-3xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                <CheckCircle2 size={18}/> {editingRental ? 'Confirmar Ajustes' : 'Agendar Locação'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* ... (Modal de OS mantido) ... */}
    </div>
  );
};

export default Rentals;
