import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, Calendar, X, Plus, CheckCircle, Edit3, MessageCircle, Loader2, Trash2 } from 'lucide-react';
import { Rental, Toy, Customer, CompanySettings, RentalStatus, PaymentMethod, User } from '../types';
import { getFirestore, doc, deleteDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  const [editingBudget, setEditingBudget] = useState<Rental | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const budgetRef = useRef<HTMLDivElement>(null);
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

  // Calcula o valor total automaticamente
  useEffect(() => {
    const selectedToys = toys.filter(t => formData.toyIds?.includes(t.id));
    const total = selectedToys.reduce((acc, t) => acc + t.price, 0);
    setFormData(prev => ({ ...prev, totalValue: total }));
  }, [formData.toyIds, toys]);

  // FUNÇÃO PARA APAGAR ORÇAMENTO
  const handleDeleteBudget = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja apagar este orçamento?")) return;
    
    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, "rentals", id));
    } catch (error) {
      console.error("Erro ao apagar:", error);
      alert("Erro ao apagar orçamento.");
    } finally {
      setIsDeleting(null);
    }
  };

  // FUNÇÃO PARA GERAR PDF A4
  const generatePDF = async () => {
    if (!budgetRef.current) return;
    setIsGenerating(true);
    
    try {
      const element = budgetRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
      pdf.save(`Orcamento_${selectedRental?.customerName || 'Susu'}.pdf`);
    } catch (error) {
      alert("Erro ao gerar PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tight">Orçamentos</h1>
          <p className="text-slate-400 font-bold text-xs uppercase mt-1">Gerencie suas propostas comerciais</p>
        </div>
        <button 
          onClick={() => { setEditingBudget(null); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> Novo Orçamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rentals.map((rental) => (
          <div key={rental.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-blue-50 p-4 rounded-3xl text-blue-600">
                <FileText size={24} />
              </div>
              <button 
                onClick={() => handleDeleteBudget(rental.id)}
                className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
              >
                {isDeleting === rental.id ? <Loader2 className="animate-spin" size={20}/> : <Trash2 size={20} />}
              </button>
            </div>

            <h3 className="text-lg font-black text-slate-800 uppercase truncate">{rental.customerName}</h3>
            <p className="text-slate-400 font-bold text-[10px] uppercase mb-6">{new Date(rental.date).toLocaleDateString('pt-BR')}</p>

            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedRental(rental)}
                className="flex-1 bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
              >
                Visualizar PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE VISUALIZAÇÃO A4 */}
      {selectedRental && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-6 border-b flex justify-between items-center">
              <button 
                onClick={generatePDF}
                disabled={isGenerating}
                className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={16}/> : <Download size={16} />}
                {isGenerating ? "Gerando..." : "Baixar PDF A4"}
              </button>
              <button onClick={() => setSelectedRental(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-200 p-10">
              {/* ÁREA DO PDF (TAMANHO A4 REAL) */}
              <div 
                ref={budgetRef}
                className="bg-white mx-auto p-16 shadow-2xl text-slate-800"
                style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}
              >
                <div className="flex justify-between items-start border-b-4 border-blue-600 pb-10 mb-10">
                  <div>
                    <h1 className="text-5xl font-black text-blue-600 uppercase">Proposta</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Orçamento Comercial</p>
                  </div>
                  <div className="text-right uppercase">
                    <h2 className="text-xl font-black">{company.name}</h2>
                    <p className="text-sm font-bold text-slate-500">{company.phone}</p>
                  </div>
                </div>

                <div className="mb-12">
                  <span className="text-[10px] font-black text-blue-600 uppercase block mb-2">Cliente</span>
                  <h3 className="text-3xl font-black uppercase">{selectedRental.customerName}</h3>
                  <p className="text-lg font-bold text-slate-500 mt-2">Data do Evento: {new Date(selectedRental.date).toLocaleDateString('pt-BR')}</p>
                </div>

                <table className="w-full mb-10">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                      <th className="px-6 py-4 text-left">Descrição do Serviço</th>
                      <th className="px-6 py-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {toys.filter(t => selectedRental.toyIds.includes(t.id)).map(toy => (
                      <tr key={toy.id}>
                        <td className="px-6 py-5 font-bold text-slate-700 uppercase">{toy.name}</td>
                        <td className="px-6 py-5 text-right font-black">R$ {toy.price.toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end">
                  <div className="w-72 bg-slate-50 p-8 rounded-[32px] border-2 border-slate-100 text-right">
                    <span className="text-xs font-black text-slate-400 uppercase">Total Geral</span>
                    <p className="text-3xl font-black text-blue-600 mt-1">R$ {selectedRental.totalValue.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                
                <div className="mt-20 pt-10 border-t border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Este orçamento é válido por 5 dias.</p>
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
