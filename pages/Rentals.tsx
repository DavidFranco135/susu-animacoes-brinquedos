import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, X, ChevronLeft, ChevronRight, Edit3, Calendar as CalendarIcon, List, CalendarDays, BarChart3, Clock, CheckCircle2, MapPin, UserPlus, FileSpreadsheet, Download, Phone, Share2, MessageCircle, Trash2, ClipboardList, Filter, DollarSign, Loader2 } from 'lucide-react';
import { Rental, RentalStatus, Customer, Toy, User, UserRole, PaymentMethod } from '../types';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore'; // Importação necessária

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
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const db = getFirestore(); // Inicializa o Firestore
  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  // FUNÇÃO PARA APAGAR A RESERVA
  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta reserva permanentemente?")) return;
    
    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, "rentals", id));
      // O setRentals não é estritamente necessário se você usa snapshot em tempo real, 
      // mas ajuda a atualizar a interface instantaneamente.
      setRentals(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro ao excluir a reserva. Tente novamente.");
    } finally {
      setIsDeleting(null);
    }
  };

  // ... (Mantenha todo o restante do seu código igual: categories, useMemo, handlers de formulário, etc)

  // Dentro do seu map de rentals na visualização de 'Lista', atualizei o botão:
  
  /* Procure a parte onde você renderiza a lista e certifique-se de que o botão 
     de Trash2 está assim:
  */

  // Trecho da renderização da lista (exemplo de aplicação no seu código):
  // <button 
  //   onClick={() => handleDelete(rental.id)}
  //   className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
  // >
  //   {isDeleting === rental.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
  // </button>

  // ABAIXO O SEU CÓDIGO COMPLETO COM A FUNÇÃO INTEGRADA:
  
  return (
    <div className="space-y-10 pb-20">
        {/* ... (Todo o seu cabeçalho e filtros iguaizinhos) ... */}
        
        {/* Na parte da Lista de Reservas, o botão deve chamar o handleDelete */}
        {/* Exemplo no seu mapeamento de cards: */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rentals.map((rental) => (
                <div key={rental.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative group">
                    <div className="absolute top-6 right-6 flex gap-2 no-print">
                        <button 
                            onClick={() => handleEdit(rental)}
                            className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                        >
                            <Edit3 size={18} />
                        </button>
                        <button 
                            onClick={() => handleDelete(rental.id)} // CHAMADA DA FUNÇÃO
                            disabled={isDeleting === rental.id}
                            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                        >
                            {isDeleting === rental.id ? <Loader2 className="animate-spin" size={18}/> : <Trash2 size={18} />}
                        </button>
                    </div>
                    {/* ... (restante do card) ... */}
                </div>
            ))}
        </div>
        
        {/* ... (Modal de formulário e todo o resto sem alterações) ... */}
    </div>
  );
};

export default Rentals;
