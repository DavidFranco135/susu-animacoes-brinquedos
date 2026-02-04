import React, { useState } from 'react';
import { UsersRound, Plus, ShieldCheck, Shield, Trash2, X, Eye, EyeOff, Check, Loader2, RefreshCw } from 'lucide-react';
import { User, UserRole } from '../types';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc } from "firebase/firestore";

interface Props {
  staff: User[];
  setStaff: React.Dispatch<React.SetStateAction<User[]>>;
}

const AVAILABLE_PAGES = [
  { id: 'dashboard', name: 'Dashboard', icon: '📊' },
  { id: 'rentals', name: 'Agenda', icon: '📅' },
  { id: 'budgets', name: 'Orçamentos', icon: '💼' },
  { id: 'customers', name: 'Clientes', icon: '👥' },
  { id: 'toys', name: 'Brinquedos', icon: '🎪' },
  { id: 'financial', name: 'Financeiro', icon: '💰' },
  { id: 'staff', name: 'Colaboradores', icon: '👨‍💼' }
];

const Staff: React.FC<Props> = ({ staff, setStaff }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '', email: '', password: '', role: UserRole.STAFF, allowedPages: []
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm("⚠️ EXCLUIR DEFINITIVAMENTE?\n\nO usuário perderá o acesso e os dados serão apagados do banco.")) return;
    
    setLoading(true);
    try {
      const db = getFirestore();
      await deleteDoc(doc(db, "users", id));
      // Não precisa de setStaff manual, o onSnapshot do App.tsx cuida disso.
    } catch (e: any) {
      alert("Erro ao excluir: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const db = getFirestore();

    try {
      if (editingUser) {
        await setDoc(doc(db, "users", editingUser.id), { ...formData, id: editingUser.id });
      } else {
        const auth = getAuth();
        const res = await createUserWithEmailAndPassword(auth, formData.email!, formData.password!);
        await setDoc(doc(db, "users", res.user.uid), {
          ...formData,
          id: res.user.uid,
          password: '' // Não guarda senha no Firestore
        });
      }
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      alert("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-slate-800 uppercase flex items-center gap-3">
          <UsersRound className="text-blue-600" size={32} /> Colaboradores
        </h1>
        <button onClick={() => { setEditingUser(null); setFormData({name:'', email:'', role: UserRole.STAFF, allowedPages:[]}); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2">
          <Plus size={18} /> Novo Acesso
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((u) => (
          <div key={u.id} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${u.role === UserRole.ADMIN ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                {u.role === UserRole.ADMIN ? <ShieldCheck /> : <Shield />}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingUser(u); setFormData(u); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600"><RefreshCw size={18}/></button>
                <button onClick={() => handleDelete(u.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18}/></button>
              </div>
            </div>
            <h3 className="font-black text-slate-800 uppercase">{u.name}</h3>
            <p className="text-slate-400 text-sm mb-4">{u.email}</p>
            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${u.role === UserRole.ADMIN ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
              {u.role}
            </span>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative">
            <button type="button" onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600"><X size={24}/></button>
            <h2 className="text-xl font-black uppercase mb-6">{editingUser ? 'Editar' : 'Novo'} Acesso</h2>
            
            <div className="space-y-4">
              <input placeholder="Nome" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} required />
              <input placeholder="E-mail" type="email" disabled={!!editingUser} className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold disabled:opacity-50" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} required />
              
              {!editingUser && (
                <div className="relative">
                  <input placeholder="Senha" type={showPassword ? 'text' : 'password'} className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-400">
                    {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                  </button>
                </div>
              )}

              <div className="flex gap-4">
                <button type="button" onClick={() => setFormData({...formData, role: UserRole.STAFF})} className={`flex-1 p-4 rounded-2xl font-black text-[10px] uppercase border-2 ${formData.role === UserRole.STAFF ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100'}`}>Staff</button>
                <button type="button" onClick={() => setFormData({...formData, role: UserRole.ADMIN})} className={`flex-1 p-4 rounded-2xl font-black text-[10px] uppercase border-2 ${formData.role === UserRole.ADMIN ? 'border-amber-500 bg-amber-50 text-amber-600' : 'border-slate-100'}`}>Admin</button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase mt-8 hover:bg-blue-700 shadow-lg flex items-center justify-center">
              {loading ? <Loader2 className="animate-spin" /> : 'Salvar Acesso'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Staff;
