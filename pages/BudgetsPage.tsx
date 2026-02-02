import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, X, Plus, CheckCircle, Edit3, MessageCircle, Trash2, Loader2, Printer } from 'lucide-react';
import { Rental, Toy, Customer, CompanySettings, RentalStatus, PaymentMethod, User } from '../types';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';

interface Props {
  rentals: Rental[];
  setRentals?: React.Dispatch<React.SetStateAction<Rental[]>>;
  customers: Customer[];
  toys: Toy[];
  company: CompanySettings;
}

const BudgetsPage: React.FC<Props> = ({ rentals, customers, toys, company }) => {
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const db = getFirestore();

  const [formData, setFormData] = useState<Partial<Rental>>({
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '18:00',
    toyIds: [],
    totalValue: 0,
    status: RentalStatus.PENDING,
    paymentMethod: 'PIX' as PaymentMethod
  });

  // Cálculo automático do valor
  useEffect(() => {
    const selectedToys = toys.filter(t => formData.toyIds?.includes(t.id));
    const total = selectedToys.reduce((acc, t) => acc + t.price, 0);
    setFormData(prev => ({ ...prev, totalValue: total }));
  }, [formData.toyIds, toys]);

  // FUNÇÃO PARA APAGAR
  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente apagar este orçamento?")) return;
    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, "rentals", id));
    } catch (e) {
      alert("Erro ao apagar.");
    } finally {
      setIsDeleting(null);
    }
  };

  // FUNÇÃO DE IMPRESSÃO (IGUAL ÀS OUTRAS PÁGINAS)
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Estilo para ocultar tudo na hora de imprimir, exceto o orçamento */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}} />

      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tight">Orçamentos</h1>
          <p className="text-slate-400 font-bold text-xs uppercase mt-1">Propostas Comerciais</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> Novo Orçamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
        {rentals.map((rental) => (
          <div key={rental.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-blue-50 p-4 rounded-3xl text-blue-600">
                <FileText size={24} />
              </div>
              <button 
                onClick={() => handleDelete(rental.id)}
                className="p-3 text-slate-300 hover:text-red-500 rounded-2xl transition-all"
              >
                {isDeleting === rental.id ? <Loader2 className="animate-spin" size={20}/> : <Trash2 size={20} />}
              </button>
            </div>

            <h3 className="text-lg font-black text-slate-800 uppercase truncate">{rental.customerName}</h3>
            <p className="text-slate-400 font-bold text-[10px] uppercase mb-6">{new Date(rental.date).toLocaleDateString('pt-BR')}</p>

            <button 
              onClick={() => setSelectedRental(rental)}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
            >
              Abrir Proposta
            </button>
          </div>
        ))}
      </div>

      {/* MODAL DE VISUALIZAÇÃO */}
      {selectedRental && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-6 border-b flex justify-between items-center bg-white">
              <button 
                onClick={handlePrint}
                className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2"
              >
                <Printer size={16} /> Imprimir / Salvar PDF
              </button>
              <button onClick={() => setSelectedRental(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 bg-slate-100">
              <div id="print-area" className="bg-white p-12 shadow-sm mx-auto w-full max-w-[210mm] text-slate-800">
                {/* CABEÇALHO */}
                <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
                  <h1 className="text-3xl font-black uppercase text-blue-600">Orçamento</h1>
                  <div className="text-right">
                    <p className="font-black uppercase">{company.name}</p>
                    <p className="text-xs font-bold text-slate-400">{company.phone}</p>
                  </div>
                </div>

                {/* INFO CLIENTE */}
                <div className="mb-10">
                  <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Cliente</p>
                  <h2 className="text-2xl font-black uppercase">{selectedRental.customerName}</h2>
                  <p className="text-sm font-bold text-slate-500">Data: {new Date(selectedRental.date).toLocaleDateString('pt-BR')}</p>
                </div>

                {/* TABELA */}
                <table className="w-full mb-10">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase">
                      <th className="py-4 text-left">Item</th>
                      <th className="py-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toys.filter(t => selectedRental.toyIds.includes(t.id)).map(toy => (
                      <tr key={toy.id} className="border-b border-slate-50">
                        <td className="py-4 font-bold text-slate-700 uppercase text-sm">{toy.name}</td>
                        <td className="py-4 text-right font-black">R$ {toy.price.toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* TOTAL */}
                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Total da Proposta</p>
                    <p className="text-3xl font-black text-blue-600">R$ {selectedRental.totalValue.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetsPage;
