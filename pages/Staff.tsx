import React, { useState } from 'react';
import { UsersRound, Plus, ShieldCheck, Shield, Trash2, X, Lock, Eye, EyeOff, Check, Loader2, AlertCircle, RefreshCw, Zap, AlertTriangle } from 'lucide-react';
import { User, UserRole } from '../types';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";

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
  const [emailConflict, setEmailConflict] = useState(false);
  
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
    setEmailConflict(false);
    if (user) {
      setEditingUser(user);
      setFormData(user);
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: UserRole.EMPLOYEE, allowedPages: [] });
    }
    setIsModalOpen(true);
  };

  // ✅ EXCLUSÃO NORMAL - PERMITE DELETAR QUALQUER USUÁRIO (incluindo ADMIN)
  const handleDelete = async (userId: string, userEmail: string, userRole: string) => {
    // ✅ Aviso especial se for ADMIN
    let confirmMessage = '';
    
    if (userRole === 'ADMIN') {
      confirmMessage = 
        `⚠️ ATENÇÃO: VOCÊ ESTÁ DELETANDO UM ADMINISTRADOR!\n\n` +
        `Email: ${userEmail}\n\n` +
        `⚠️ RISCOS:\n` +
        `• Você pode perder acesso ao sistema\n` +
        `• Outros admins podem perder acesso\n` +
        `• Configurações podem ser afetadas\n\n` +
        `TEM CERTEZA ABSOLUTA?`;
    } else {
      confirmMessage = `⚠️ Remover colaborador?\n\n${userEmail}`;
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    // ✅ Confirmação EXTRA para ADMIN
    if (userRole === 'ADMIN') {
      const doubleCheck = window.confirm(
        `🚨 ÚLTIMA CONFIRMAÇÃO!\n\n` +
        `Você TEM CERTEZA que quer deletar o ADMIN:\n` +
        `${userEmail}\n\n` +
        `Digite OK para confirmar.`
      );
      
      if (!doubleCheck) {
        return;
      }
    }

    setLoading(true);
    try {
      console.log('🗑️ Deletando usuário:', userId, userEmail, userRole);
      
      // Deleta do Firestore
      await deleteDoc(doc(db, "users", userId));
      
      // Remove do estado local
      setStaff(prev => prev.filter(u => u.id !== userId));
      
      alert(`✅ ${userEmail} foi removido com sucesso!`);
    } catch (e: any) {
      console.error("❌ Erro ao remover:", e);
      alert("❌ Erro ao remover: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 EXCLUSÃO FORÇADA - MÚLTIPLAS TENTATIVAS
  const handleForceDelete = async (userId: string, userEmail: string, userRole: string) => {
    let confirmMessage = `🚨 EXCLUSÃO FORÇADA\n\n`;
    
    if (userRole === 'ADMIN') {
      confirmMessage += 
        `⚠️⚠️⚠️ ESTE É UM ADMINISTRADOR! ⚠️⚠️⚠️\n\n` +
        `Email: ${userEmail}\n\n` +
        `DELETAR UM ADMIN PODE CAUSAR:\n` +
        `• Perda de acesso ao sistema\n` +
        `• Bloqueio de funcionalidades\n` +
        `• Problemas graves de configuração\n\n`;
    } else {
      confirmMessage += `Email: ${userEmail}\n\n`;
    }
    
    confirmMessage += 
      `Esta ação irá:\n` +
      `• Tentar deletar múltiplas vezes\n` +
      `• Forçar remoção do Firestore\n` +
      `• Recarregar a página\n\n` +
      `CONTINUAR?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔥 EXCLUSÃO FORÇADA');
      console.log('Email:', userEmail);
      console.log('UID:', userId);
      console.log('Role:', userRole);

      // TENTATIVA 1
      console.log('🗑️ Tentativa 1...');
      await deleteDoc(doc(db, "users", userId));
      console.log('✅ Tentativa 1 OK');

      setStaff(prev => prev.filter(u => u.id !== userId));
      await new Promise(resolve => setTimeout(resolve, 1000));

      // VERIFICAÇÃO 1
      console.log('🔍 Verificação 1...');
      const check1 = await getDoc(doc(db, "users", userId));
      
      if (check1.exists()) {
        console.log('⚠️ Ainda existe! Tentativa 2...');
        await deleteDoc(doc(db, "users", userId));
        console.log('✅ Tentativa 2 OK');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        const check2 = await getDoc(doc(db, "users", userId));
        
        if (check2.exists()) {
          console.log('⚠️ Ainda existe! Tentativa 3...');
          await deleteDoc(doc(db, "users", userId));
          console.log('✅ Tentativa 3 OK');
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          const checkFinal = await getDoc(doc(db, "users", userId));
          
          if (checkFinal.exists()) {
            console.error('❌ FALHOU após 3 tentativas');
            alert(
              `❌ FALHA NA EXCLUSÃO\n\n` +
              `O usuário não foi deletado após 3 tentativas.\n\n` +
              `Tente deletar manualmente:\n` +
              `Firebase Console → Firestore → users → ${userId}`
            );
            setLoading(false);
            return;
          }
        }
      }

      console.log('✅✅✅ SUCESSO TOTAL!');
      
      alert(
        `✅ EXCLUSÃO FORÇADA BEM-SUCEDIDA!\n\n` +
        `${userEmail} foi removido completamente.\n\n` +
        `A página será recarregada.`
      );

      setTimeout(() => window.location.reload(), 1000);

    } catch (e: any) {
      console.error('❌ ERRO:', e);
      alert(`❌ Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreConflict = async () => {
    setLoading(true);
    setError(null);
    try {
      alert("Criando perfil para email já existente no Firebase Auth.");
      
      const tempId = `old_user_${Date.now()}`;
      const newUser: User = {
        id: tempId,
        name: formData.name || 'Colaborador Recuperado',
        email: formData.email!,
        role: UserRole.EMPLOYEE,
        allowedPages: formData.allowedPages || [],
        profilePhotoUrl: ''
      };

      await setDoc(doc(db, "users", newUser.id), newUser);
      setStaff(prev => [...prev, newUser]);
      setIsModalOpen(false);
      alert("✅ Perfil criado!");
    } catch (e: any) {
      setError("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEmailConflict(false);

    try {
      if (editingUser) {
        // Editando usuário
        const updatedUser = { ...editingUser, ...formData } as User;
        await setDoc(doc(db, "users", updatedUser.id), updatedUser, { merge: true });
        setStaff(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        setIsModalOpen(false);
        alert("✅ Colaborador atualizado!");
      } else {
        // Criando novo usuário
        if (!formData.email || !formData.password) {
          setError("E-mail e senha são obrigatórios.");
          setLoading(false);
          return;
        }

        try {
          // ✅ Cria conta no Firebase Auth
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          const newUid = userCredential.user.uid;

          // ✅ Cria documento no Firestore
          const newUser: User = {
            id: newUid,
            name: formData.name || '',
            email: formData.email,
            role: UserRole.EMPLOYEE,
            allowedPages: formData.allowedPages || [],
            profilePhotoUrl: ''
          };

          await setDoc(doc(db, "users", newUid), newUser);
          setStaff(prev => [...prev, newUser]);
          setIsModalOpen(false);
          alert("✅ Colaborador criado! Ele já pode fazer login.");
        } catch (authError: any) {
          if (authError.code === 'auth/email-already-in-use') {
            setEmailConflict(true);
            setError("Este e-mail já está cadastrado no sistema.");
          } else {
            throw authError;
          }
        }
      }
    } catch (err: any) {
      setError("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePage = (pageId: string) => {
    const currentPages = formData.allowedPages || [];
    setFormData({
      ...formData,
      allowedPages: currentPages.includes(pageId)
        ? currentPages.filter(id => id !== pageId)
        : [...currentPages, pageId]
    });
  };

  return (
    <div className="space-y-8 pb-20">
      {/* ✅ AVISO IMPORTANTE */}
      <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={24} className="text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-black text-red-800 text-sm uppercase mb-2">⚠️ ATENÇÃO: Você pode deletar QUALQUER usuário!</h3>
            <p className="text-red-700 text-xs leading-relaxed">
              <strong>Incluindo ADMINISTRADORES!</strong> Tenha muito cuidado ao deletar usuários com role ADMIN. 
              Deletar um admin pode bloquear acesso ao sistema e causar problemas sérios.
              <br/><br/>
              <strong>Botões:</strong><br/>
              🟠 <strong>Laranja</strong> = Remover (uma tentativa)<br/>
              🔴 <strong>Vermelho</strong> = Forçar exclusão (3 tentativas)
            </p>
          </div>
        </div>
      </div>

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
            {/* ✅ Badge de ADMIN */}
            {member.role === 'ADMIN' && (
              <div className="absolute top-4 left-4 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                <ShieldCheck size={12} /> Admin
              </div>
            )}

            <div className="flex items-start justify-between mb-6">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors overflow-hidden">
                {member.profilePhotoUrl ? (
                  <img src={member.profilePhotoUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <UsersRound size={28} />
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenModal(member)} 
                  className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all" 
                  title="Editar"
                >
                  <Shield size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(member.id, member.email, member.role)} 
                  className="p-3 bg-orange-50 text-orange-400 rounded-xl hover:bg-orange-500 hover:text-white transition-all" 
                  title="Remover (1 tentativa)"
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  onClick={() => handleForceDelete(member.id, member.email, member.role)} 
                  className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all" 
                  title="🔥 Forçar Exclusão (3 tentativas)"
                >
                  <Zap size={18} />
                </button>
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">{member.name}</h3>
            <p className="text-slate-400 font-bold text-xs mb-6 lowercase">{member.email}</p>
            <div className="flex flex-wrap gap-2">
              {member.role === 'ADMIN' && (
                <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                  Acesso Total
                </span>
              )}
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
              <h2 className="text-2xl font-black text-slate-800 uppercase">{editingUser ? 'Editar Permissões' : 'Novo Colaborador'}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={20}/></button>
            </div>

            {error && (
              <div className={`p-6 rounded-2xl flex flex-col gap-4 ${emailConflict ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 text-red-600'}`}>
                <div className="flex items-center gap-3 text-sm font-bold">
                  <AlertCircle size={20} /> {error}
                </div>
                {emailConflict && (
                  <button 
                    type="button"
                    onClick={handleRestoreConflict}
                    className="flex items-center justify-center gap-2 bg-amber-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 transition-all"
                  >
                    <RefreshCw size={14} /> Criar Perfil
                  </button>
                )}
              </div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input 
                  required 
                  placeholder="Nome Completo" 
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
                <input 
                  required 
                  type="email" 
                  placeholder="E-mail de Login" 
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  disabled={!!editingUser} 
                />
              </div>

              {!editingUser && (
                <div className="relative">
                  <input 
                    required 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Senha (mínimo 6 caracteres)" 
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-6 top-4 text-slate-300"
                  >
                    {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                  </button>
                </div>
              )}

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Páginas Autorizadas</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AVAILABLE_PAGES.map(page => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => togglePage(page.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        formData.allowedPages?.includes(page.id) 
                          ? 'border-blue-600 bg-blue-50 text-blue-600' 
                          : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{page.icon}</span>
                        <span className="font-bold text-xs uppercase tracking-tight">{page.name}</span>
                      </div>
                      {formData.allowedPages?.includes(page.id) && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20}/> : editingUser ? '💾 Atualizar' : '✨ Criar Acesso'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Staff;
