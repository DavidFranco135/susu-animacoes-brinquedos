import React, { useState, useMemo, useEffect } from 'react';
import { Plus, X, Edit3, CheckCircle2, Download } from 'lucide-react';
import { Rental, RentalStatus, Customer, Toy, PaymentMethod } from '../types';

interface RentalsProps {
  rentals: Rental[];
  setRentals: React.Dispatch<React.SetStateAction<Rental[]>>;
  customers: Customer[];
  toys: Toy[];
  categories: string[];
}

const Rentals: React.FC<RentalsProps> = ({ rentals, setRentals, customers, toys, categories }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);

  // CORREÇÃO: Usamos uma função no estado inicial para garantir que categories[0] exista
  const [formData, setFormData] = useState<Partial<Rental>>({
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '18:00',
    toyIds: [],
    totalValue: 0,
    entryValue: 0,
    paymentMethod: 'PIX' as PaymentMethod,
    status: RentalStatus.PENDING,
    category: 'Geral'
  });

  // Atualiza a categoria inicial quando as categorias carregarem do Firebase
  useEffect(() => {
    if (categories.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: categories[0] }));
    }
  }, [categories]);

  const availableToysFiltered = useMemo(() => {
    return toys.filter(t => t.category === (formData.category || 'Geral'));
  }, [toys, formData.category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.toyIds?.length) return alert("Selecione cliente e itens!");

    const customer = customers.find(c => c.id === formData.customerId);
    const newRental: Rental = {
      ...formData,
      id: editingRental?.id || `r${Date.now()}`,
      customerName: customer?.name || '',
      status: formData.status || RentalStatus.PENDING,
    } as Rental;

    setRentals(prev => {
      const exists = prev.find(r => r.id === newRental.id);
      return exists ? prev.map(r => r.id === newRental.id ? newRental : r) : [...prev, newRental];
    });
    
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-black uppercase tracking-tighter">Reservas</h1>
        <button 
          onClick={() => {
            setEditingRental(null);
            setFormData({
              date: new Date().toISOString().split('T')[0],
              startTime: '14:00', endTime: '18:00',
              toyIds: [], totalValue: 0, entryValue: 0,
              paymentMethod: 'PIX', status: RentalStatus.PENDING,
              category: categories[0] || 'Geral'
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"
        >
          <Plus size={20} /> Nova Reserva
        </button>
      </header>

      {/* Listagem Simplificada */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rentals.map(rental => (
          <div key={rental.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
            <div className="flex justify-between font-bold text-xs text-blue-600 mb-2">
              <span>{rental.date.split('-').reverse().join('/')}</span>
              <button onClick={() => { setEditingRental(rental); setFormData(rental); setIsModalOpen(true); }}><Edit3 size={16}/></button>
            </div>
            <h3 className="font-black text-slate-800 uppercase">{rental.customerName}</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{rental.category}</p>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[32px] p-8">
            <h2 className="text-xl font-black uppercase mb-6">{editingRental ? 'Editar' : 'Nova'} Reserva</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Cliente</label>
                  <select required className="w-full p-3 bg-slate-50 rounded-xl" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}>
                    <option value="">Selecione...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-blue-500 uppercase">Categoria do Catálogo</label>
                  <select className="w-full p-3 bg-blue-50 text-blue-700 rounded-xl font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value, toyIds: []})}>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Itens de {formData.category}</label>
                <div className="bg-slate-50 p-4 rounded-xl max-h-40 overflow-y-auto border-2 border-dashed">
                  {availableToysFiltered.map(toy => (
                    <label key={toy.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer">
                      <input type="checkbox" checked={formData.toyIds?.includes(toy.id)} onChange={e => {
                        const ids = e.target.checked ? [...(formData.toyIds || []), toy.id] : (formData.toyIds || []).filter(id => id !== toy.id);
                        setFormData({...formData, toyIds: ids});
                      }} />
                      <span className="text-xs font-bold">{toy.name} - R$ {toy.price}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Total" className="p-3 bg-slate-900 text-white rounded-xl font-black" value={formData.totalValue} onChange={e => setFormData({...formData, totalValue: Number(e.target.value)})} />
                <input type="number" placeholder="Sinal" className="p-3 bg-emerald-50 text-emerald-700 rounded-xl font-black" value={formData.entryValue} onChange={e => setFormData({...formData, entryValue: Number(e.target.value)})} />
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-slate-400">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase">Salvar Reserva</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rentals;
