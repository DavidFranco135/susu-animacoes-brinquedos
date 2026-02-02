import React, { useState, useRef } from 'react';
import { Plus, Search, Edit3, X, Save, Upload, Trash2, Settings, Maximize } from 'lucide-react';
import { Toy, ToyStatus, User, UserRole } from '../types';

interface InventoryProps {
  toys: Toy[];
  setToys: React.Dispatch<React.SetStateAction<Toy[]>>;
  categories: string[];
  setCategories: (cats: string[]) => void;
}

const Inventory: React.FC<InventoryProps> = ({ toys = [], setToys, categories = [], setCategories }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingToy, setEditingToy] = useState<Toy | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Toy>>({
    name: '',
    category: '',
    price: 0,
    imageUrl: '',
    size: '',
    quantity: 1,
    status: ToyStatus.AVAILABLE
  });

  const handleOpenModal = (toy?: Toy) => {
    if (toy) {
      setEditingToy(toy);
      setFormData(toy);
    } else {
      setEditingToy(null);
      setFormData({
        name: '',
        category: categories[0] || 'Geral',
        price: 0,
        imageUrl: 'https://via.placeholder.com/400x300?text=Sem+Foto',
        size: '',
        quantity: 1,
        status: ToyStatus.AVAILABLE
      });
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Criamos o objeto do brinquedo garantindo que números sejam números
    const toyData: Toy = {
      id: editingToy?.id || `toy_${Date.now()}`,
      name: formData.name || '',
      category: formData.category || 'Geral',
      price: Number(formData.price) || 0,
      imageUrl: formData.imageUrl || '',
      size: formData.size || '',
      quantity: Number(formData.quantity) || 1,
      description: formData.description || '',
      status: formData.status as ToyStatus || ToyStatus.AVAILABLE
    };

    // LOGICA DE SALVAMENTO REFORÇADA
    setToys((prevToys) => {
      const exists = prevToys.find(t => t.id === toyData.id);
      let newToysList;
      
      if (exists) {
        // Atualiza item existente
        newToysList = prevToys.map(t => t.id === toyData.id ? toyData : t);
      } else {
        // Adiciona novo item no início da lista
        newToysList = [toyData, ...prevToys];
      }
      
      return newToysList;
    });

    setIsModalOpen(false);
    setEditingToy(null);
    alert("Item salvo com sucesso!");
  };

  const filteredToys = (toys || []).filter(toy =>
    toy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    toy.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-800">Catálogo</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all"
        >
          <Plus size={20} /> Adicionar Brinquedo
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar brinquedos..." 
          className="w-full pl-12 pr-4 py-3 bg-white border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredToys.map(toy => (
          <div key={toy.id} className="bg-white rounded-[30px] border p-4 shadow-sm hover:shadow-md transition-all">
            <img src={toy.imageUrl} className="w-full h-40 object-cover rounded-[20px] mb-4" alt={toy.name} />
            <h3 className="font-black text-slate-800 text-lg">{toy.name}</h3>
            <p className="text-blue-600 font-bold">R$ {(Number(toy.price) || 0).toLocaleString('pt-BR')}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => handleOpenModal(toy)} className="flex-1 py-2 bg-slate-100 rounded-xl text-xs font-bold hover:bg-slate-200">Editar</button>
              <button 
                onClick={() => setToys(prev => prev.filter(t => t.id !== toy.id))}
                className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white w-full max-w-lg rounded-[40px] p-8 space-y-6 shadow-2xl">
            <h2 className="text-2xl font-black">{editingToy ? 'Editar' : 'Novo'} Brinquedo</h2>
            
            <div className="space-y-4">
              <div className="flex flex-col items-center p-4 border-2 border-dashed rounded-3xl gap-2">
                {formData.imageUrl && <img src={formData.imageUrl} className="h-24 rounded-lg" />}
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-blue-600 font-bold text-sm">
                  <Upload className="inline mr-2" size={16}/> Carregar Foto
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} accept="image/*" />
              </div>

              <input required placeholder="Nome do brinquedo" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-4">
                <select className="p-4 bg-slate-50 rounded-2xl outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" placeholder="Preço" className="p-4 bg-slate-50 rounded-2xl outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>

              <input placeholder="Tamanho (ex: 3x3m)" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} />
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-slate-500">Cancelar</button>
              <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg">SALVAR</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Inventory;
