import React, { useState } from 'react';
import { UsersRound, Plus, Shield, Trash2, X, Eye, EyeOff, Check, Loader2, AlertCircle } from 'lucide-react';
import { User, UserRole } from '../types';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc } from "firebase/firestore";

interface Props {
  staff: User[];
  setStaff: React.Dispatch<React.SetStateAction<User[]>>;
}

const AVAILABLE_PAGES = [
  { id: 'dashboard', name: 'Dashboard', icon: '📊' },
  { id: 'rentals', name: 'Agenda de Eventos', icon: '📅' },
  { id: 'budgets', name: 'Orçamentos', icon: '💼' },
  { id: 'customers', name: 'Clientes', icon: '👥' },
  { id: 'toys', name: 'Brinquedos', icon: '🎪' },
  { id: 'financial', name: 'Financeiro', icon: '💰' },
  { id: 'documents', name: 'Documentos', icon: '📄' },
  { id: 'staff', name: 'Colaboradores', icon: '👨‍💼' },
  { id: 'settings', name: 'Configurações', icon: '⚙️' }
];

const Staff: React.FC<Props> = ({ staff, setStaff }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<User & { password?: string }>>({
    name: '',
    email: '',
    password: '',
    role: UserRole.EMPLOYEE,
    allowedPages: []
  });

  const auth = getAuth();
  const db = getFirestore();

  const handleOpenModal = (user?: User) => {
    setError(null);
    if (user) {
      setEditingUser(user);
      setFormData({ ...user, password: '' });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: UserRole.EMPLOYEE, allowedPages: [] });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (userId: string) => {
    const confirmacao = window.confirm(
      "Atenção: Para apagar totalmente o e-mail do sistema de login, você precisaria acessar o Console do Firebase manualmente. \n\nDeseja remover este colaborador da sua lista de acesso agora?"
    );
    
    if (confirmacao) {
      try {
        setLoading(true);
        // Apaga do Firestore (tira o acesso às páginas)
        await deleteDoc(doc(db, "users", userId));
        setStaff(prev => prev.filter(u => u.id !== userId));
        alert("Colaborador removido com sucesso da base de dados!");
      } catch (e) {
        alert("Erro ao remover: " + e);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (editingUser) {
        // Atualiza apenas os dados no Firestore
        const updatedUser = { ...editingUser, ...formData } as User;
        delete (updatedUser as any).password; // Não salva senha no Firestore
        
        await setDoc(doc(db, "users", updatedUser.id), updatedUser, { merge: true });
        setStaff(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        setIsModalOpen(false);
      } else {
        // Tenta criar no Auth e no Firestore
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email!, formData.password!);
          const newUid = userCredential.user.uid;

          const newUser: User = {
            id: newUid,
            name: formData.name || '',
            email: formData.email!,
            role: UserRole.EMPLOYEE,
            allowedPages: formData.allowedPages || [],
            profilePhotoUrl: ''
          };

          await setDoc(doc(db, "users", newUid), newUser);
          setStaff(prev => [...prev, newUser]);
          setIsModalOpen(false);
        } catch (authError: any) {
          if (authError.code === 'auth/email-already-in-use') {
            setError("Este e-mail já existe no sistema de login. Tente usar outro ou recupere a senha.");
          } else {
            throw authError;
          }
        }
      }
    } catch (err: any) {
      setError("Erro inesperado: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight uppercase">Colaboradores</h1>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-[3px] mt-2">Gestão de Equipe e Permissões</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-slate-900 text-white px-8 py-5 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-2xl flex items-center justify-center gap-3">
          <Plus size={20} /> Novo Colaborador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((member) => (
          <div key={member.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative">
            <div className="flex items-start justify-between mb-6">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 overflow-hidden">
                {member.profilePhotoUrl ? (
                  <img src={member.profilePhotoUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <UsersRound size={28} />
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenModal(member)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all">
                  <Shield size={18} />
                </button>
                <button onClick={() => handleDelete(member.id)} className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">{member.name}</h3>
            <p className="text-slate-400 font-bold text-xs mb-6 lowercase">{member.email}</p>
            <div className="flex flex-wrap gap-2">
              {member.allowedPages?.map(pageId => (
                <span key={pageId} className="px-3 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-wider">
                  {AVAILABLE_PAGES.find(p => p.id === pageId)?.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl p-10 space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-800 uppercase">{editingUser ? 'Permissões' : 'Novo Colaborador'}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={20}/></button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-bold">
                <AlertCircle size={20} /> {error}
              </div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input required placeholder="Nome" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input required type="email" placeholder="E-mail" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={!!editingUser} />
              </div>

              {!editingUser && (
                <div className="relative">
                  <input required type={showPassword ? "text" : "password"} placeholder="Senha Inicial" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-4 text-slate-300">
                    {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                  </button>
                </div>
              )}

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acessos</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AVAILABLE_PAGES.map(page => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => togglePage(page.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        formData.allowedPages?.includes(page.id) ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-50 bg-slate-50 text-slate-400'
                      }`}
                    >
                      <span className="font-bold text-xs uppercase">{page.name}</span>
                      {formData.allowedPages?.includes(page.id) && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
              {loading ? <Loader2 className="animate-spin" size={20}/> : editingUser ? 'Salvar' : 'Criar'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Staff;
