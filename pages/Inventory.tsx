import React, { useState, useRef } from 'react';
import { Plus, Search, Edit3, X, Save, Upload, Trash2, Settings, Maximize } from 'lucide-react';
import { Toy, ToyStatus, User, UserRole } from '../types';

interface InventoryProps {
  toys: Toy[];
  setToys: (action: any) => void;
  categories: string[];
  setCategories: (cats: string[]) => void;
}

const Inventory: React.FC<InventoryProps> = ({ toys, setToys, categories, setCategories }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingToy, setEditingToy] = useState<Toy | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Toy>>({
    name: '', category: categories[0] || 'Geral', price: 0, imageUrl: '', size: '', quantity: 1, status: ToyStatus.AVAILABLE
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const toyData: Toy = {
      ...formData,
      id: editingToy?.id || `toy_${Date.now()}`,
      price: Number(formData.price) || 0,
      quantity: Number(formData.quantity) || 1,
    } as Toy;

    setToys((prev: Toy[]) => {
      const exists = prev.find(t => t.id === toyData.id);
      return exists ? prev.map(t => t.id === toyData.id ? toyData : t) : [toyData, ...prev];
    });

    setIsModalOpen(false);
    setEditingToy(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black">Catálogo</h1>
        <button onClick={() => { setEditingToy(null); setIsModalOpen(true); }} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
          <Plus size={20} /> Novo Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {toys.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())).map(toy => (
          <div key={toy.id} className="bg-white rounded-[30px] border p-4 shadow-sm">
            <img src={toy.imageUrl || 'https://via.placeholder.com/150'} className="w-full h-40 object-cover rounded-2xl mb-4" />
            <h3 className="font-black">{toy.name}</h3>
            <p className="text-blue-600 font-bold">R$ {Number(toy.price).toLocaleString('pt-BR')}</p>
            <p className="text-xs text-slate-400 uppercase font-black">{toy.category} | {toy.size}</p>
            <button onClick={() => { setEditingToy(toy); setFormData(toy); setIsModalOpen(true); }} className="mt-4 w-full py-2 bg-slate-100 rounded-xl font-bold text-xs hover:bg-blue-50 hover:text-blue-600 transition-all">Editar</button>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white w-full max-w-lg rounded-[40px] p-8 space-y-4">
            <h2 className="text-2xl font-black">{editingToy ? 'Editar' : 'Novo'} Brinquedo</h2>
            <div className="border-2 border-dashed rounded-3xl p-4 text-center">
               {formData.imageUrl && <img src={formData.imageUrl} className="h-20 mx-auto mb-2 rounded" />}
               <button type="button" onClick={() => fileInputRef.current?.click()} className="text-blue-600 font-black text-xs uppercase"><Upload size={16} className="inline mr-1"/> Foto do Dispositivo</button>
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            </div>
            <input placeholder="Nome" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <select className="p-4 bg-slate-50 rounded-2xl font-bold outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input placeholder="Tamanho (ex: 3x3)" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} />
            </div>
            <input type="number" placeholder="Preço" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-3xl font-black">SALVAR NO SISTEMA</button>
            <button type="button" onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 font-bold">Cancelar</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Inventory;
