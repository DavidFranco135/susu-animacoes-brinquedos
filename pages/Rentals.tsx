import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, X, ChevronLeft, ChevronRight, Edit3, Calendar as CalendarIcon, List, CalendarDays, BarChart3, Clock, CheckCircle2, MapPin, UserPlus, FileSpreadsheet, Download, Phone, Share2, MessageCircle, Trash2, ClipboardList, Filter, DollarSign, Building2, Users, Search } from 'lucide-react';
import { Rental, RentalStatus, Customer, Toy, User, UserRole, PaymentMethod } from '../types';
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { db } from '../firebase';

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
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [viewTab, setViewTab] = useState<'Mês' | 'Ano' | 'Lista'>('Mês');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(toys.map(t => t.category)));
    return ['TODAS', ...uniqueCategories];
  }, [toys]);

  const [formData, setFormData] = useState<Partial<Rental>>({
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '18:00',
    status: RentalStatus.PENDING,
    toyIds: [],
    totalValue: 0,
    entryValue: 0,
    paymentMethod: 'PIX',
    eventAddress: '',
    additionalService: '',
    additionalServiceValue: 0
  });

  const [newCustomerData, setNewCustomerData] = useState<Partial<Customer>>({ 
    name: '', 
    phone: '', 
    address: '', 
    isCompany: false, 
    cnpj: '',
    cpf: '',
    notes: '' 
  });

  const [toyQuantities, setToyQuantities] = useState<{[key: string]: number}>({});
  const [toyCustomPrices, setToyCustomPrices] = useState<{[key: string]: number}>({});

  const handleOpenModal = (rental?: Rental) => {
    if (rental) {
      setEditingRental(rental);
      setFormData(rental);
      const quantities: {[key: string]: number} = {};
      rental.toyIds?.forEach(id => {
        quantities[id] = 1;
      });
      setToyQuantities(quantities);
      setToyCustomPrices({});
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
        paymentMethod: 'PIX',
        eventAddress: '',
        additionalService: '',
        additionalServiceValue: 0
      });
      setToyQuantities({});
      setToyCustomPrices({});
    }
    setIsAddingCustomer(false);
    setIsModalOpen(true);
  };

  const filteredRentals = useMemo(() => {
    return rentals.filter(rental => {
      const rentalDate = new Date(rental.date + 'T00:00:00');
      
      // Filtro por período (Mês/Ano/Lista)
      let periodMatch = true;
      if (viewTab === 'Mês') {
        periodMatch = rentalDate.getMonth() === currentDate.getMonth() && 
               rentalDate.getFullYear() === currentDate.getFullYear();
      } else if (viewTab === 'Ano') {
        periodMatch = rentalDate.getFullYear() === currentDate.getFullYear();
      }
      
      // Filtro por data customizada (quando preenchido, sobrescreve o filtro de período)
      if (startDateFilter || endDateFilter) {
        const rentalDateOnly = rental.date;
        if (startDateFilter && rentalDateOnly < startDateFilter) {
          periodMatch = false;
        }
        if (endDateFilter && rentalDateOnly > endDateFilter) {
          periodMatch = false;
        }
      }
      
      // Filtro por busca (nome ou documento)
      let searchMatch = true;
      if (searchTerm) {
        const customer = customers.find(c => c.id === rental.customerId);
        const searchLower = searchTerm.toLowerCase();
        searchMatch = 
          rental.customerName?.toLowerCase().includes(searchLower) ||
          customer?.cpf?.includes(searchTerm) ||
          customer?.cnpj?.includes(searchTerm) ||
          customer?.phone?.includes(searchTerm) ||
          false;
      }
      
      return periodMatch && searchMatch;
    }).sort((a, b) => a.date.localeCompare(b.date)); // ORDENAÇÃO POR DATA ASCENDENTE (mais próxima primeiro)
  }, [rentals, currentDate, viewTab, searchTerm, startDateFilter, endDateFilter, customers]);

  const filteredToys = useMemo(() => {
    if (selectedCategory === 'TODAS') return toys;
    return toys.filter(t => t.category === selectedCategory);
  }, [toys, selectedCategory]);

  const changeTime = (offset: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewTab === 'Mês') {
        newDate.setMonth(newDate.getMonth() + offset);
      } else if (viewTab === 'Ano') {
        newDate.setFullYear(newDate.getFullYear() + offset);
      }
      return newDate;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId) {
      alert('Por favor, selecione ou cadastre um cliente.');
      return;
    }
    if (!formData.date || !formData.startTime || !formData.endTime) {
      alert('Por favor, preencha data e horários.');
      return;
    }
    if (!formData.toyIds || formData.toyIds.length === 0) {
      alert('Por favor, selecione pelo menos um brinquedo.');
      return;
    }

    const toysData = formData.toyIds.map(id => {
      const qty = toyQuantities[id] || 1;
      const toy = toys.find(t => t.id === id);
      const customPrice = toyCustomPrices[id];
      const price = customPrice !== undefined && customPrice > 0 ? customPrice : (toy?.price || 0);
      return { id, quantity: qty, price };
    });

    const toysTotal = toysData.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const additionalValue = formData.additionalServiceValue || 0;
    const total = toysTotal + additionalValue;

    const rental: Rental = {
      id: editingRental?.id || `rental-${Date.now()}`,
      customerId: formData.customerId || '',
      customerName: formData.customerName || '',
      date: formData.date || '',
      startTime: formData.startTime || '',
      endTime: formData.endTime || '',
      status: formData.status || RentalStatus.PENDING,
      toyIds: formData.toyIds || [],
      toysData,
      totalValue: total,
      entryValue: formData.entryValue || 0,
      paymentMethod: formData.paymentMethod || 'PIX',
      eventAddress: formData.eventAddress || '',
      additionalService: formData.additionalService || '',
      additionalServiceValue: additionalValue,
      notes: formData.notes || '',
    };

    try {
      await setDoc(doc(db, "rentals", rental.id), rental);
      
      setRentals(prev => {
        const index = prev.findIndex(r => r.id === rental.id);
        if (index >= 0) {
          const newRentals = [...prev];
          newRentals[index] = rental;
          return newRentals;
        }
        return [...prev, rental];
      });
      
      setIsModalOpen(false);
      setEditingRental(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '18:00',
        status: RentalStatus.PENDING,
        toyIds: [],
        totalValue: 0,
        entryValue: 0,
        paymentMethod: 'PIX',
        eventAddress: '',
        additionalService: '',
        additionalServiceValue: 0
      });
      setToyQuantities({});
      setToyCustomPrices({});
    } catch (error) {
      console.error('Erro ao salvar reserva:', error);
      alert('Erro ao salvar reserva. Tente novamente.');
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomerData.name || !newCustomerData.phone) {
      alert('Nome e telefone são obrigatórios');
      return;
    }
    
    const newCustomer: Customer = {
      id: `customer-${Date.now()}`,
      name: newCustomerData.name,
      phone: newCustomerData.phone,
      address: newCustomerData.address || '',
      isCompany: newCustomerData.isCompany || false,
      cnpj: newCustomerData.cnpj || '',
      cpf: newCustomerData.cpf || '',
      notes: newCustomerData.notes || ''
    };

    try {
      await setDoc(doc(db, "customers", newCustomer.id), newCustomer);
      
      setCustomers(prev => [...prev, newCustomer]);
      
      setFormData({...formData, customerId: newCustomer.id, customerName: newCustomer.name});
      setIsAddingCustomer(false);
      setNewCustomerData({ 
        name: '', 
        phone: '', 
        address: '', 
        isCompany: false, 
        cnpj: '',
        cpf: '',
        notes: '' 
      });
    } catch (error) {
      console.error('Erro ao adicionar cliente:', error);
      alert('Erro ao adicionar cliente. Tente novamente.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta reserva?')) {
      try {
        await deleteDoc(doc(db, "rentals", id));
        setRentals(prev => prev.filter(r => r.id !== id));
      } catch (error) {
        console.error('Erro ao deletar reserva:', error);
        alert('Erro ao deletar reserva. Tente novamente.');
      }
    }
  };

  const toggleToySelection = (toyId: string) => {
    setFormData(prev => {
      const currentIds = prev.toyIds || [];
      const isSelected = currentIds.includes(toyId);
      
      if (isSelected) {
        const { [toyId]: _, ...restQuantities } = toyQuantities;
        setToyQuantities(restQuantities);
        const { [toyId]: __, ...restPrices } = toyCustomPrices;
        setToyCustomPrices(restPrices);
        return { ...prev, toyIds: currentIds.filter(id => id !== toyId) };
      } else {
        setToyQuantities({...toyQuantities, [toyId]: 1});
        return { ...prev, toyIds: [...currentIds, toyId] };
      }
    });
  };

  const getStatusIcon = (status: RentalStatus) => {
    switch(status) {
      case RentalStatus.PENDING: return <Clock size={14} className="text-orange-500" />;
      case RentalStatus.CONFIRMED: return <CheckCircle2 size={14} className="text-green-500" />;
      case RentalStatus.COMPLETED: return <CheckCircle2 size={14} className="text-blue-500" />;
      case RentalStatus.CANCELLED: return <X size={14} className="text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: RentalStatus) => {
    switch(status) {
      case RentalStatus.PENDING: return 'bg-gradient-to-br from-orange-400 to-orange-600 text-white';
      case RentalStatus.CONFIRMED: return 'bg-gradient-to-br from-green-400 to-green-600 text-white';
      case RentalStatus.COMPLETED: return 'bg-gradient-to-br from-blue-400 to-blue-600 text-white';
      case RentalStatus.CANCELLED: return 'bg-gradient-to-br from-red-400 to-red-600 text-white';
      default: return 'bg-gradient-to-br from-gray-400 to-gray-600 text-white';
    }
  };

  const getStatusText = (status: RentalStatus) => {
    switch(status) {
      case RentalStatus.PENDING: return 'Pendente';
      case RentalStatus.CONFIRMED: return 'Confirmada';
      case RentalStatus.COMPLETED: return 'Concluída';
      case RentalStatus.CANCELLED: return 'Cancelada';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleChangeStatus = async (rentalId: string, newStatus: RentalStatus) => {
    try {
      const rental = rentals.find(r => r.id === rentalId);
      if (!rental) return;
      
      const updatedRental = { ...rental, status: newStatus };
      await setDoc(doc(db, "rentals", rentalId), updatedRental);
      
      setRentals(prev => prev.map(r => r.id === rentalId ? updatedRental : r));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status. Tente novamente.');
    }
  };

  const handleShareWhatsApp = (rental: Rental) => {
    const message = `*Resumo da Reserva*%0A%0A*Cliente:* ${rental.customerName}%0A*Data:* ${formatDate(rental.date)}%0A*Horário:* ${rental.startTime} - ${rental.endTime}%0A*Local:* ${rental.eventAddress}%0A*Total:* R$ ${rental.totalValue.toFixed(2)}%0A%0AVeja mais detalhes em: ${window.location.origin}/#/resumo/${rental.id}`;
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const exportToExcel = () => {
    const data = filteredRentals.map(r => ({
      Data: r.date,
      Cliente: r.customerName,
      Horário: `${r.startTime} - ${r.endTime}`,
      Local: r.eventAddress,
      Status: getStatusText(r.status),
      'Valor Total': r.totalValue,
      Entrada: r.entryValue,
      'Forma de Pagamento': r.paymentMethod
    }));
    
    console.log('Exportar para Excel:', data);
    alert('Funcionalidade de exportação será implementada');
  };

  useEffect(() => {
    if (location.state?.openModal) {
      handleOpenModal();
    }
  }, [location]);

  return (
    <div className="p-8 space-y-8 max-w-[2000px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Reservas</h1>
          <p className="text-slate-500 font-bold mt-1 text-sm">Gerencie todas as locações</p>
        </div>
        
        <button 
          onClick={() => handleOpenModal()} 
          className="bg-gradient-to-br from-blue-500 to-blue-700 text-white px-8 py-4 rounded-3xl font-black flex items-center gap-3 shadow-2xl shadow-blue-100 hover:scale-105 transition-all uppercase tracking-widest text-sm"
        >
          <Plus size={20} strokeWidth={3} /> Nova Reserva
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {(['Mês', 'Ano', 'Lista'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setViewTab(tab)}
            className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
              viewTab === tab 
                ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-xl shadow-blue-100' 
                : 'bg-white text-slate-600 hover:bg-slate-50 shadow-sm'
            }`}
          >
            {tab === 'Mês' && <CalendarIcon className="inline mr-2" size={16} />}
            {tab === 'Ano' && <CalendarDays className="inline mr-2" size={16} />}
            {tab === 'Lista' && <List className="inline mr-2" size={16} />}
            {tab}
          </button>
        ))}
      </div>

      {viewTab !== 'Lista' && (
        <div className="flex items-center justify-between bg-white rounded-3xl p-6 shadow-xl">
          <button onClick={() => changeTime(-1)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all">
            <ChevronLeft size={24} className="text-slate-600 font-black" />
          </button>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-widest">
            {viewTab === 'Mês' 
              ? currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
              : currentDate.getFullYear()
            }
          </h2>
          <button onClick={() => changeTime(1)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all">
            <ChevronRight size={24} className="text-slate-600 font-black" />
          </button>
        </div>
      )}

      {viewTab === 'Lista' && (
        <div className="bg-white rounded-3xl shadow-xl p-8 space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por cliente, CPF, CNPJ ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            
            <div className="flex gap-3">
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none"
                placeholder="Data inicial"
              />
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none"
                placeholder="Data final"
              />
              <button
                onClick={exportToExcel}
                className="px-6 py-4 bg-green-500 text-white rounded-2xl font-black hover:bg-green-600 transition-all flex items-center gap-2"
              >
                <Download size={18} /> Excel
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredRentals.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <ClipboardList size={64} className="mx-auto mb-4 opacity-30" />
                <p className="font-bold text-lg">Nenhuma reserva encontrada</p>
              </div>
            ) : (
              filteredRentals.map(rental => {
                const customer = customers.find(c => c.id === rental.customerId);
                const rentalToys = rental.toysData?.map(td => ({
                  ...toys.find(t => t.id === td.id),
                  quantity: td.quantity,
                  customPrice: td.price
                })).filter(t => t) || [];

                return (
                  <div key={rental.id} className="bg-slate-50 rounded-2xl p-6 hover:bg-slate-100 transition-all border-2 border-slate-100">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-xl font-black text-slate-800">{rental.customerName}</h3>
                          <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${getStatusColor(rental.status)}`}>
                            {getStatusText(rental.status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <CalendarIcon size={16} className="text-slate-400" />
                            <span className="font-bold">{formatShortDate(rental.date)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock size={16} className="text-slate-400" />
                            <span className="font-bold">{rental.startTime} - {rental.endTime}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin size={16} className="text-slate-400" />
                            <span className="font-bold">{rental.eventAddress || 'Não informado'}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone size={16} className="text-slate-400" />
                            <span className="font-bold">{customer?.phone || 'Não informado'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                          <DollarSign size={20} className="text-green-600" />
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-green-600">
                              R$ {rental.totalValue.toFixed(2)}
                            </span>
                            {rental.entryValue > 0 && (
                              <span className="text-xs font-bold text-slate-500">
                                (Entrada: R$ {rental.entryValue.toFixed(2)})
                              </span>
                            )}
                          </div>
                        </div>

                        {rentalToys.length > 0 && (
                          <div className="pt-2">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Brinquedos:</p>
                            <div className="flex flex-wrap gap-2">
                              {rentalToys.map((toy: any, idx: number) => (
                                <span key={idx} className="px-3 py-1 bg-white rounded-full text-xs font-bold text-slate-600 border border-slate-200">
                                  {toy?.name} {toy?.quantity > 1 && `(${toy?.quantity}x)`}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleOpenModal(rental)}
                          className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-xl transition-all font-bold"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleShareWhatsApp(rental)}
                          className="px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-xl transition-all font-bold"
                        >
                          WhatsApp
                        </button>
                        <button
                          onClick={() => handleDelete(rental.id)}
                          className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-100">
            <div className="flex justify-between items-center text-sm">
              <span className="font-black text-blue-900 uppercase tracking-widest">
                Total de reservas: {filteredRentals.length}
              </span>
              <span className="font-black text-blue-900 uppercase tracking-widest">
                Valor total: R$ {filteredRentals.reduce((sum, r) => sum + r.totalValue, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {viewTab === 'Mês' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRentals.map(rental => {
            const customer = customers.find(c => c.id === rental.customerId);
            return (
              <div key={rental.id} className={`${getStatusColor(rental.status)} rounded-[40px] p-8 shadow-2xl relative overflow-hidden group hover:scale-105 transition-all cursor-pointer`} onClick={() => handleOpenModal(rental)}>
                <div className="absolute top-4 right-4 flex gap-2">
                  {getStatusIcon(rental.status)}
                </div>
                
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-1">Cliente</p>
                    <h3 className="font-black text-xl tracking-tight">{rental.customerName}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="font-black opacity-70 uppercase tracking-widest mb-1">Data</p>
                      <p className="font-bold">{new Date(rental.date + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}</p>
                    </div>
                    <div>
                      <p className="font-black opacity-70 uppercase tracking-widest mb-1">Horário</p>
                      <p className="font-bold">{rental.startTime}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-1">Local</p>
                    <p className="font-bold text-sm truncate">{rental.eventAddress}</p>
                  </div>

                  <div className="pt-4 border-t border-white/20">
                    <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-1">Valor Total</p>
                    <p className="text-2xl font-black">R$ {rental.totalValue.toFixed(2)}</p>
                  </div>
                </div>

                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
                  <Edit3 size={20} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewTab === 'Ano' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({length: 12}, (_, i) => {
            const monthDate = new Date(currentDate.getFullYear(), i, 1);
            const monthRentals = rentals.filter(r => {
              const rentalDate = new Date(r.date + 'T00:00:00');
              return rentalDate.getMonth() === i && rentalDate.getFullYear() === currentDate.getFullYear();
            });
            const monthTotal = monthRentals.reduce((sum, r) => sum + r.totalValue, 0);

            return (
              <div key={i} className="bg-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all">
                <h3 className="font-black text-lg text-slate-800 mb-4 uppercase tracking-widest">
                  {monthDate.toLocaleDateString('pt-BR', { month: 'long' })}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Reservas</span>
                    <span className="text-2xl font-black text-blue-600">{monthRentals.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total</span>
                    <span className="text-lg font-black text-green-600">R$ {monthTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-[50px] w-full max-w-6xl my-8 shadow-2xl border-4 border-white/50 max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-gradient-to-br from-blue-500 to-blue-700 text-white p-8 rounded-t-[46px] flex justify-between items-center z-10 shadow-xl">
                      <h2 className="text-3xl font-black uppercase tracking-widest">{editingRental ? 'Editar Reserva' : 'Nova Reserva'}</h2>
                      <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/20 rounded-2xl transition-all">
                          <X size={28} strokeWidth={3} />
                      </button>
                  </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-3xl border-2 border-blue-100 space-y-4">
                      <div className="flex items-center gap-2 text-blue-700">
                          <Users size={20} />
                          <h3 className="font-black text-sm uppercase tracking-widest">Informações do Cliente</h3>
                      </div>
                      
                      {!isAddingCustomer ? (
                          <div className="space-y-4">
                              <div className="space-y-1">
                                  <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">Selecione o Cliente</label>
                                  <select 
                                      className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" 
                                      value={formData.customerId || ''} 
                                      onChange={e => {
                                          const customer = customers.find(c => c.id === e.target.value);
                                          setFormData({...formData, customerId: e.target.value, customerName: customer?.name || ''});
                                      }}
                                      required
                                  >
                                      <option value="">Selecionar...</option>
                                      {customers.map(c => (
                                          <option key={c.id} value={c.id}>{c.name} {c.isCompany ? '(Empresa)' : ''}</option>
                                      ))}
                                  </select>
                              </div>
                              <button 
                                  type="button" 
                                  onClick={() => setIsAddingCustomer(true)} 
                                  className="w-full bg-gradient-to-br from-green-400 to-green-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] transition-all"
                              >
                                  <UserPlus size={16} /> Cadastrar Novo Cliente
                              </button>
                          </div>
                      ) : (
                          <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                      <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">Nome Completo *</label>
                                      <input type="text" className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={newCustomerData.name} onChange={e => setNewCustomerData({...newCustomerData, name: e.target.value})} required />
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">Telefone *</label>
                                      <input type="tel" className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={newCustomerData.phone} onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})} required />
                                  </div>
                              </div>

                              <div className="flex items-center gap-3 bg-white/50 p-4 rounded-2xl">
                                  <input 
                                      type="checkbox" 
                                      id="isCompany" 
                                      checked={newCustomerData.isCompany} 
                                      onChange={e => setNewCustomerData({...newCustomerData, isCompany: e.target.checked})} 
                                      className="w-5 h-5 rounded-lg"
                                  />
                                  <label htmlFor="isCompany" className="font-black text-sm text-blue-700 uppercase tracking-widest cursor-pointer flex items-center gap-2">
                                      <Building2 size={16} /> É uma empresa?
                                  </label>
                              </div>

                              {newCustomerData.isCompany && (
                                  <div className="space-y-1">
                                      <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">CNPJ</label>
                                      <input type="text" className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={newCustomerData.cnpj} onChange={e => setNewCustomerData({...newCustomerData, cnpj: e.target.value})} />
                                  </div>
                              )}

                              {!newCustomerData.isCompany && (
                                  <div className="space-y-1">
                                      <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">CPF</label>
                                      <input type="text" className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={newCustomerData.cpf} onChange={e => setNewCustomerData({...newCustomerData, cpf: e.target.value})} />
                                  </div>
                              )}

                              <div className="space-y-1">
                                  <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">Endereço</label>
                                  <input type="text" className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={newCustomerData.address} onChange={e => setNewCustomerData({...newCustomerData, address: e.target.value})} />
                              </div>

                              <div className="space-y-1">
                                  <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">Observações</label>
                                  <textarea className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none" rows={2} value={newCustomerData.notes} onChange={e => setNewCustomerData({...newCustomerData, notes: e.target.value})} />
                              </div>

                              <div className="flex gap-3">
                                  <button 
                                      type="button" 
                                      onClick={handleAddCustomer} 
                                      className="flex-1 bg-gradient-to-br from-green-400 to-green-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:scale-[1.02] transition-all"
                                  >
                                      ✓ Salvar Cliente
                                  </button>
                                  <button 
                                      type="button" 
                                      onClick={() => setIsAddingCustomer(false)} 
                                      className="flex-1 bg-slate-200 text-slate-700 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-300 transition-all"
                                  >
                                      Cancelar
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-3xl border-2 border-orange-100 space-y-4">
                      <div className="flex items-center gap-2 text-orange-700">
                          <CalendarIcon size={20} />
                          <h3 className="font-black text-sm uppercase tracking-widest">Data e Horário do Evento</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-orange-400 uppercase tracking-widest ml-1">Data do Evento</label>
                              <input type="date" className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-orange-500/20 outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-orange-400 uppercase tracking-widest ml-1">Horário Início</label>
                              <input type="time" className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-orange-500/20 outline-none" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} required />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-orange-400 uppercase tracking-widest ml-1">Horário Término</label>
                              <input type="time" className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-orange-500/20 outline-none" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} required />
                          </div>
                      </div>

                      <div className="space-y-1">
                          <label className="text-[9px] font-black text-orange-400 uppercase tracking-widest ml-1">Local do Evento</label>
                          <input type="text" className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-orange-500/20 outline-none" value={formData.eventAddress} onChange={e => setFormData({...formData, eventAddress: e.target.value})} placeholder="Endereço completo..." />
                      </div>

                      <div className="space-y-1">
                          <label className="text-[9px] font-black text-orange-400 uppercase tracking-widest ml-1">Status da Reserva</label>
                          <select className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-orange-500/20 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as RentalStatus})}>
                              <option value={RentalStatus.PENDING}>Pendente</option>
                              <option value={RentalStatus.CONFIRMED}>Confirmada</option>
                              <option value={RentalStatus.COMPLETED}>Concluída</option>
                              <option value={RentalStatus.CANCELLED}>Cancelada</option>
                          </select>
                      </div>

                      <div className="space-y-1">
                          <label className="text-[9px] font-black text-orange-400 uppercase tracking-widest ml-1">Observações Gerais</label>
                          <textarea className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-orange-500/20 outline-none resize-none" rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Informações adicionais..." />
                      </div>
                  </div>

                  <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-6 rounded-3xl border-2 border-pink-100 space-y-4">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-pink-700">
                              <BarChart3 size={20} />
                              <h3 className="font-black text-sm uppercase tracking-widest">Selecione os Brinquedos</h3>
                          </div>
                          <div className="flex gap-2">
                              {categories.map(cat => (
                                  <button
                                      key={cat}
                                      type="button"
                                      onClick={() => setSelectedCategory(cat)}
                                      className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                                          selectedCategory === cat 
                                              ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg' 
                                              : 'bg-white text-pink-700 hover:bg-pink-50'
                                      }`}
                                  >
                                      {cat}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2">
                          {filteredToys.length === 0 ? (
                              <div className="col-span-full text-center py-8 text-slate-400">
                                  <p className="font-bold">Nenhum brinquedo disponível nesta categoria</p>
                              </div>
                          ) : (
                              filteredToys.map(toy => {
                                  const isSelected = formData.toyIds?.includes(toy.id);
                                  const quantity = toyQuantities[toy.id] || 1;
                                  const currentPrice = toyCustomPrices[toy.id] !== undefined ? toyCustomPrices[toy.id] : toy.price;
                                  
                                  return (
                                      <div 
                                          key={toy.id} 
                                          onClick={() => toggleToySelection(toy.id)}
                                          className={`relative rounded-2xl p-4 cursor-pointer transition-all ${
                                              isSelected 
                                                  ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-xl scale-105' 
                                                  : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
                                          }`}
                                      >
                                          {toy.imageUrl && (
                                              <img src={toy.imageUrl} alt={toy.name} className="w-full h-32 object-cover rounded-xl mb-3" />
                                          )}
                                          <h4 className={`font-black text-sm mb-2 ${isSelected ? 'text-white' : 'text-slate-800'}`}>{toy.name}</h4>
                                          <p className={`text-xs mb-2 ${isSelected ? 'opacity-90' : 'text-slate-500'}`}>{toy.category}</p>
                                          <p className={`text-lg font-black ${isSelected ? 'text-white' : 'text-blue-600'}`}>
                                              R$ {toy.price.toFixed(2)}
                                          </p>
                                          <p className={`text-[10px] font-bold mt-1 ${isSelected ? 'opacity-80' : 'text-slate-400'}`}>
                                              Disponível: {toy.quantity}
                                          </p>
                                          
                                          {isSelected && (
                                              <div className="mt-4 space-y-3 border-t border-white/20 pt-4" onClick={(e) => e.stopPropagation()}>
                                                  {/* Controle de Quantidade */}
                                                  <div className="flex items-center justify-between gap-2">
                                                      <span className="text-xs font-bold text-white opacity-80">Qtd:</span>
                                                      <div className="flex items-center gap-2">
                                                          <button
                                                              type="button"
                                                              onClick={(e) => {
                                                                  e.preventDefault();
                                                                  if (quantity > 1) {
                                                                      setToyQuantities({...toyQuantities, [toy.id]: quantity - 1});
                                                                  }
                                                              }}
                                                              className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center font-black text-white transition-all text-sm"
                                                          >
                                                              -
                                                          </button>
                                                          <input
                                                              type="number"
                                                              min="1"
                                                              max={toy.quantity}
                                                              value={quantity}
                                                              onChange={(e) => {
                                                                  const val = parseInt(e.target.value) || 1;
                                                                  if (val >= 1 && val <= toy.quantity) {
                                                                      setToyQuantities({...toyQuantities, [toy.id]: val});
                                                                  }
                                                              }}
                                                              className="w-14 h-7 rounded-lg bg-white text-blue-600 text-center font-black text-sm border-0 outline-none"
                                                          />
                                                          <button
                                                              type="button"
                                                              onClick={(e) => {
                                                                  e.preventDefault();
                                                                  if (quantity < toy.quantity) {
                                                                      setToyQuantities({...toyQuantities, [toy.id]: quantity + 1});
                                                                  }
                                                              }}
                                                              className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center font-black text-white transition-all text-sm"
                                                          >
                                                              +
                                                          </button>
                                                      </div>
                                                  </div>
                                                  
                                                  {/* Preço Customizado */}
                                                  <div className="flex items-center justify-between gap-2">
                                                      <span className="text-xs font-bold text-white opacity-80">Valor:</span>
                                                      <div className="flex items-center gap-2">
                                                          <span className="text-xs font-bold text-white opacity-60">R$</span>
                                                          <input
                                                              type="number"
                                                              step="0.01"
                                                              min="0"
                                                              value={currentPrice}
                                                              onChange={(e) => {
                                                                  const val = parseFloat(e.target.value) || 0;
                                                                  setToyCustomPrices({...toyCustomPrices, [toy.id]: val});
                                                              }}
                                                              className="w-20 h-7 rounded-lg bg-white text-blue-600 text-center font-black text-sm border-0 outline-none px-2"
                                                              placeholder={toy.price.toFixed(2)}
                                                          />
                                                      </div>
                                                  </div>
                                                  
                                                  {/* Total */}
                                                  <div className="flex items-center justify-between pt-2 border-t border-white/20">
                                                      <span className="text-xs font-bold text-white opacity-80">Total:</span>
                                                      <span className="text-sm font-black text-white">
                                                          R$ {(currentPrice * quantity).toFixed(2)}
                                                      </span>
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  );
                              })
                          )}
                      </div>
                  </div>

                  <div className="p-6 bg-purple-50 rounded-3xl border-2 border-purple-100 space-y-4">
                      <div className="flex items-center gap-2 text-purple-700">
                          <DollarSign size={20} />
                          <h3 className="font-black text-sm uppercase tracking-widest">Serviço Adicional (Opcional)</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-purple-400 uppercase tracking-widest ml-1">Descrição do Adicional</label>
                              <input 
                                  type="text" 
                                  className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-purple-500/20 outline-none" 
                                  value={formData.additionalService || ''} 
                                  onChange={e => setFormData({...formData, additionalService: e.target.value})} 
                                  placeholder="Ex: Monitoria, Decoração, Som..." 
                              />
                          </div>
                          
                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-purple-400 uppercase tracking-widest ml-1">Valor do Adicional (R$)</label>
                              <input 
                                  type="number" 
                                  step="0.01" 
                                  className="w-full px-6 py-4 bg-white rounded-2xl font-bold border-0 focus:ring-2 focus:ring-purple-500/20 outline-none" 
                                  value={formData.additionalServiceValue || 0} 
                                  onChange={e => setFormData({...formData, additionalServiceValue: Number(e.target.value)})} 
                                  placeholder="0.00" 
                              />
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Total</label>
                          <div className="relative">
                              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black">R$</span>
                              <input type="number" step="0.01" readOnly className="w-full pl-14 pr-6 py-5 bg-slate-100 rounded-2xl font-black text-2xl text-slate-900 border-0 cursor-not-allowed" value={formData.totalValue?.toFixed(2)} />
                          </div>
                      </div>

                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sinal Pago (Entrada)</label>
                          <div className="relative">
                              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-600 font-black">R$</span>
                              <input type="number" step="0.01" className="w-full pl-14 pr-6 py-5 bg-emerald-50 rounded-2xl font-black text-xl text-emerald-700 border-0 focus:ring-2 focus:ring-emerald-500/20 outline-none" value={formData.entryValue} onChange={e => setFormData({...formData, entryValue: Number(e.target.value)})} />
                          </div>
                      </div>

                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Forma de Pagamento</label>
                          <select className="w-full px-6 py-5 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 outline-none" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}>
                              <option value="PIX">PIX</option>
                              <option value="DINHEIRO">Dinheiro</option>
                              <option value="DEBITO">Débito</option>
                              <option value="CREDITO">Crédito</option>
                          </select>
                      </div>
                  </div>

                  <button type="submit" className="w-full bg-gradient-to-br from-blue-500 to-blue-700 text-white py-6 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all text-lg">
                      {editingRental ? '✓ Atualizar Reserva' : '+ Criar Reserva'}
                  </button>
              </form>
          </div>
      )}
    </div>
  );
};

export default Rentals;
