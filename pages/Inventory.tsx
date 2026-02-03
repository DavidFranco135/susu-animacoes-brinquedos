import React, { useState, useRef } from 'react';
import { Plus, Search, Edit3, X, Save, Upload, Trash2, Settings, Maximize, ChevronLeft, ChevronRight } from 'lucide-react';
import { Toy, ToyStatus, User, UserRole } from '../types';
import { getFirestore, doc, deleteDoc, setDoc, addDoc, collection } from 'firebase/firestore';

interface InventoryProps {
  toys: Toy[];
  setToys: React.Dispatch<React.SetStateAction<Toy[]>>;
  categories: string[];
  setCategories: (cats: string[]) => void;
  user: User; // ← ADICIONADO: Recebe user via props
}

const Inventory: React.FC<InventoryProps> = ({ toys, setToys, categories, setCategories, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingToy, setEditingToy] = useState<Toy | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para visualização de álbum
  const [viewingAlbum, setViewingAlbum] = useState<Toy | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Estado para visualização de descrição completa
  const [viewingDescription, setViewingDescription] = useState<Toy | null>(null);

  // ← CORRIGIDO: Usa user recebido via props
  const isAdmin = user?.role === UserRole.ADMIN;
  
  const [formData, setFormData] = useState<Partial<Toy>>({
    name: '',
    category: categories[0] || 'Geral',
    price: 0,
    imageUrl: '',
    images: [],
    size: '',
    quantity: 1,
    description: '',
    status: ToyStatus.AVAILABLE
  });

  const filteredToys = toys.filter(toy => 
    toy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    toy.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (toy?: Toy) => {
    if (!isAdmin) return;
    if (toy) {
      setEditingToy(toy);
      // Migrar imageUrl para images se necessário
      const images = toy.images && toy.images.length > 0 
        ? toy.images 
        : toy.imageUrl 
          ? [toy.imageUrl] 
          : [];
      setFormData({ ...toy, images });
    } else {
      setEditingToy(null);
      const defaultImage = 'https://images.unsplash.com/photo-1533749047139-189de3cf06d3?auto=format&fit=crop&q=80&w=400';
      setFormData({
        name: '',
        category: categories[0] || 'Geral',
        price: 0,
        imageUrl: defaultImage,
        images: [defaultImage],
        size: '',
        quantity: 1,
        description: '',
        status: ToyStatus.AVAILABLE
      });
    }
    setUploadProgress('');
    setIsModalOpen(true);
  };

  // Função para comprimir imagem
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Criar canvas para redimensionar
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Definir tamanho máximo (800x800 pixels)
          let width = img.width;
          let height = img.height;
          const maxSize = 800;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Desenhar imagem redimensionada
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Converter para base64 com compressão (qualidade 0.7)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          
          // Verificar tamanho
          const sizeInBytes = (compressedBase64.length * 3) / 4;
          const sizeInKB = sizeInBytes / 1024;
          
          console.log(`Imagem comprimida: ${sizeInKB.toFixed(0)}KB`);
          
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadProgress('Comprimindo imagens...');
      const compressedImages: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validar tamanho original (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert(`A imagem ${file.name} deve ter no máximo 10MB`);
          continue;
        }

        // Validar tipo
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} não é uma imagem válida`);
          continue;
        }

        const compressedImage = await compressImage(file);
        compressedImages.push(compressedImage);
      }

      if (compressedImages.length > 0) {
        setFormData(prev => {
          const currentImages = prev.images || [];
          const newImages = [...currentImages, ...compressedImages];
          return { 
            ...prev, 
            images: newImages,
            imageUrl: newImages[0] // Manter compatibilidade
          };
        });
      }
      
      setUploadProgress('');
    } catch (error) {
      console.error('Erro ao comprimir imagens:', error);
      alert('Erro ao processar imagens. Tente outras fotos.');
      setUploadProgress('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => {
      const newImages = [...(prev.images || [])];
      newImages.splice(index, 1);
      return {
        ...prev,
        images: newImages,
        imageUrl: newImages[0] || '' // Manter compatibilidade
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || isSaving) return;
    
    setIsSaving(true);
    
    try {
      const db = getFirestore();
      setUploadProgress('Salvando no banco de dados...');

      const toyData: Omit<Toy, 'id'> = {
        name: formData.name || 'Sem Nome',
        category: formData.category || categories[0] || 'Geral',
        price: formData.price || 0,
        imageUrl: formData.images && formData.images.length > 0 ? formData.images[0] : formData.imageUrl || '',
        images: formData.images || [],
        size: formData.size || '',
        quantity: formData.quantity || 1,
        description: formData.description || '',
        status: formData.status as ToyStatus
      };

      if (editingToy) {
        // Editando brinquedo existente
        await setDoc(doc(db, "toys", editingToy.id), toyData);
        
        // Atualizar no estado local
        setToys(prev => prev.map(t => t.id === editingToy.id ? { ...toyData, id: editingToy.id } : t));
      } else {
        // Criando novo brinquedo
        const docRef = await addDoc(collection(db, "toys"), toyData);
        
        // Adicionar ao estado local
        setToys(prev => [...prev, { ...toyData, id: docRef.id }]);
      }

      setIsModalOpen(false);
      setEditingToy(null);
      setUploadProgress('');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar brinquedo. Tente novamente.');
      setUploadProgress('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteToy = async (id: string) => {
    if (!isAdmin) return;
    if (!window.confirm('Tem certeza que deseja excluir este brinquedo?')) return;

    try {
      const db = getFirestore();
      await deleteDoc(doc(db, "toys", id));
      setToys(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir brinquedo.');
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim() || !isAdmin) return;
    if (categories.includes(newCatName.trim())) {
      alert('Categoria já existe!');
      return;
    }

    const newCategories = [...categories, newCatName.trim()];
    setCategories(newCategories);
    
    try {
      const db = getFirestore();
      await setDoc(doc(db, "settings", "categories"), { list: newCategories });
      setNewCatName('');
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
    }
  };

  const handleRemoveCategory = async (catToRemove: string) => {
    if (!isAdmin) return;
    if (categories.length === 1) {
      alert('Você precisa ter pelo menos uma categoria!');
      return;
    }

    const newCategories = categories.filter(c => c !== catToRemove);
    setCategories(newCategories);
    
    try {
      const db = getFirestore();
      await setDoc(doc(db, "settings", "categories"), { list: newCategories });
    } catch (error) {
      console.error('Erro ao remover categoria:', error);
    }
  };

  const openAlbumViewer = (toy: Toy) => {
    setViewingAlbum(toy);
    setCurrentImageIndex(0);
  };

  const closeAlbumViewer = () => {
    setViewingAlbum(null);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (!viewingAlbum) return;
    const images = viewingAlbum.images && viewingAlbum.images.length > 0 
      ? viewingAlbum.images 
      : viewingAlbum.imageUrl 
        ? [viewingAlbum.imageUrl] 
        : [];
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (!viewingAlbum) return;
    const images = viewingAlbum.images && viewingAlbum.images.length > 0 
      ? viewingAlbum.images 
      : viewingAlbum.imageUrl 
        ? [viewingAlbum.imageUrl] 
        : [];
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const getToyMainImage = (toy: Toy): string => {
    if (toy.images && toy.images.length > 0) {
      return toy.images[0];
    }
    return toy.imageUrl || 'https://images.unsplash.com/photo-1533749047139-189de3cf06d3?auto=format&fit=crop&q=80&w=400';
  };

  const getToyImages = (toy: Toy): string[] => {
    if (toy.images && toy.images.length > 0) {
      return toy.images;
    }
    return toy.imageUrl ? [toy.imageUrl] : [];
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-8 md:mb-10">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input 
            type="text" 
            placeholder="Buscar brinquedos..." 
            className="w-full pl-14 pr-6 py-4 md:py-5 bg-white rounded-full border-0 text-slate-700 font-bold text-sm shadow-lg focus:ring-4 focus:ring-blue-100 transition-all" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        {isAdmin && (
          <>
            <button onClick={() => setIsCatModalOpen(true)} className="px-6 md:px-8 py-4 md:py-5 bg-slate-700 text-white rounded-full font-black text-xs md:text-sm uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 whitespace-nowrap">
              <Settings size={18}/> Categorias
            </button>
            <button onClick={() => handleOpenModal()} className="px-6 md:px-8 py-4 md:py-5 bg-blue-600 text-white rounded-full font-black text-xs md:text-sm uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 whitespace-nowrap">
              <Plus size={20}/> Adicionar
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filteredToys.map(toy => (
          <div key={toy.id} className="group bg-white rounded-[32px] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="relative h-56 md:h-64 overflow-hidden bg-slate-50">
              <img 
                src={getToyMainImage(toy)} 
                alt={toy.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 cursor-pointer" 
                onClick={() => openAlbumViewer(toy)}
              />
              {getToyImages(toy).length > 1 && (
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <Maximize size={12} />
                  {getToyImages(toy).length} fotos
                </div>
              )}
              <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest shadow-lg">
                {toy.category}
              </div>
            </div>
            <div className="p-4 md:p-6 space-y-3 md:space-y-4">
              <div>
                <h3 className="text-base md:text-lg font-black text-slate-800 mb-1 md:mb-2 leading-tight">{toy.name}</h3>
                {toy.size && <p className="text-xs md:text-sm text-slate-500 font-bold">Tamanho: {toy.size}</p>}
                {toy.description && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-400 line-clamp-2">{toy.description}</p>
                    {toy.description.length > 100 && (
                      <button
                        onClick={() => setViewingDescription(toy)}
                        className="text-xs text-blue-600 font-bold hover:text-blue-700 mt-1 underline"
                      >
                        Ver mais
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-slate-100">
                <div>
                  <p className="text-[10px] md:text-xs text-slate-500 font-black uppercase mb-1">Valor a partir de:</p>
                  <p className="text-xl md:text-1xl font-black text-blue-600">R$ {toy.price.toFixed(2)}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                      <button onClick={() => handleOpenModal(toy)} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit3 size={18} /></button>
                      <button onClick={() => handleDeleteToy(toy.id)} className="p-3 bg-red-50 text-red-400 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={18} /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Descrição Completa */}
      {viewingDescription && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] max-w-2xl w-full p-8 shadow-2xl relative">
            <button 
              onClick={() => setViewingDescription(null)}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-all"
            >
              <X size={24} className="text-slate-400" />
            </button>
            
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">{viewingDescription.name}</h2>
                <div className="flex items-center gap-3 text-sm text-slate-500 font-bold">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black uppercase">
                    {viewingDescription.category}
                  </span>
                  {viewingDescription.size && <span>• Tamanho: {viewingDescription.size}</span>}
                </div>
              </div>
              
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Descrição Completa</h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {viewingDescription.description}
                </p>
              </div>
              
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Valor da Locação a partir de:</p>
                  <p className="text-3xl font-black text-blue-600">R$ {viewingDescription.price.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visualizador de Álbum */}
      {viewingAlbum && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <button 
            onClick={closeAlbumViewer}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all"
          >
            <X size={32} className="text-white" />
          </button>
          
          <div className="relative w-full max-w-4xl">
            <img 
              src={getToyImages(viewingAlbum)[currentImageIndex]} 
              alt={viewingAlbum.name}
              className="w-full max-h-[80vh] object-contain rounded-3xl"
            />
            
            {getToyImages(viewingAlbum).length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all"
                >
                  <ChevronLeft size={32} className="text-white" />
                </button>
                
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all"
                >
                  <ChevronRight size={32} className="text-white" />
                </button>
                
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
                  <p className="text-white font-bold text-sm">
                    {currentImageIndex + 1} / {getToyImages(viewingAlbum).length}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Gerenciar Categorias */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] max-w-xl w-full p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-800">Gerenciar Categorias</h2>
              <button onClick={() => setIsCatModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Nova categoria..."
                  className="flex-1 px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddCategory()}
                />
                <button
                  onClick={handleAddCategory}
                  className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <Plus size={18} /> Adicionar
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="font-bold text-slate-700">{cat}</span>
                  <button
                    onClick={() => handleRemoveCategory(cat)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição/Criação */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-[40px] max-w-4xl w-full p-8 md:p-10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
                <h2 className="text-xl md:text-2xl font-black text-slate-800">{editingToy ? 'Editar Detalhes' : 'Novo Brinquedo'}</h2>
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSaving} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl disabled:opacity-50"><X size={20}/></button>
            </div>
            
            {uploadProgress && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                <p className="text-sm font-bold text-blue-600">{uploadProgress}</p>
              </div>
            )}
            
            <div className="space-y-6">
                {/* Galeria de Imagens */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Fotos do Brinquedo</label>
                  
                  {formData.images && formData.images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {formData.images.map((img, idx) => (
                        <div key={idx} className="relative group h-32 rounded-2xl overflow-hidden bg-slate-50 border-2 border-slate-200">
                          <img src={img} className="w-full h-full object-cover" alt={`Foto ${idx + 1}`} />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            disabled={isSaving}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 disabled:cursor-not-allowed"
                          >
                            <X size={16} />
                          </button>
                          {idx === 0 && (
                            <div className="absolute bottom-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-full text-[10px] font-bold">
                              Principal
                            </div>
                          )}
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSaving}
                        className="h-32 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 transition-all flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-600 disabled:cursor-not-allowed"
                      >
                        <Plus size={24} />
                        <span className="text-xs font-bold">Adicionar</span>
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-40 md:h-48 rounded-[32px] overflow-hidden bg-slate-50 border-2 border-dashed border-slate-200 relative group">
                      <div className="w-full h-full flex items-center justify-center text-slate-400 flex-col gap-2">
                        <Upload size={48} />
                        <p className="text-xs font-bold">Clique para adicionar fotos</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isSaving}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white flex-col gap-2 font-black text-xs uppercase tracking-widest disabled:cursor-not-allowed"
                      >
                        <Upload size={24}/> Adicionar Fotos
                      </button>
                    </div>
                  )}
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    multiple
                    onChange={handleImageUpload}
                    disabled={isSaving}
                  />
                  
                  <p className="text-xs text-slate-400 italic">
                    Você pode selecionar múltiplas fotos. A primeira será a foto principal.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Nome Comercial</label>
                        <input 
                          required 
                          disabled={isSaving}
                          className="w-full px-4 py-3 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 text-sm disabled:opacity-50" 
                          value={formData.name} 
                          onChange={e=>setFormData({...formData, name: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Categoria</label>
                        <select 
                          disabled={isSaving}
                          className="w-full px-4 py-3 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 text-sm disabled:opacity-50" 
                          value={formData.category} 
                          onChange={e=>setFormData({...formData, category: e.target.value})}
                        >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Tamanho (ex: 3x3m)</label>
                        <input 
                          disabled={isSaving}
                          className="w-full px-4 py-3 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 text-sm disabled:opacity-50" 
                          value={formData.size} 
                          onChange={e=>setFormData({...formData, size: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Quantidade Total</label>
                        <input 
                          type="number" 
                          disabled={isSaving}
                          className="w-full px-4 py-3 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 text-sm disabled:opacity-50" 
                          value={formData.quantity} 
                          onChange={e=>setFormData({...formData, quantity: Number(e.target.value)})} 
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Status Inicial</label>
                        <select 
                          disabled={isSaving}
                          className="w-full px-4 py-3 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 text-sm disabled:opacity-50" 
                          value={formData.status} 
                          onChange={e=>setFormData({...formData, status: e.target.value as ToyStatus})}
                        >
                            {Object.values(ToyStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Descrição do Brinquedo (Opcional)</label>
                    <textarea 
                      disabled={isSaving}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 rounded-2xl font-bold border-0 focus:ring-2 focus:ring-blue-500/20 text-sm disabled:opacity-50 resize-none" 
                      value={formData.description || ''} 
                      onChange={e=>setFormData({...formData, description: e.target.value})}
                      placeholder="Adicione detalhes sobre o brinquedo, como características especiais, idade recomendada, etc."
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Valor da Locação (R$)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      disabled={isSaving}
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-lg focus:ring-2 focus:ring-blue-500/20 outline-none disabled:opacity-50" 
                      value={formData.price} 
                      onChange={e=>setFormData({...formData, price: Number(e.target.value)})} 
                    />
                </div>
            </div>

            <button 
              type="submit" 
              disabled={isSaving} 
              className="w-full bg-blue-600 text-white py-4 md:py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Save size={18} className="inline mr-2" /> {isSaving ? uploadProgress || 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Inventory;
