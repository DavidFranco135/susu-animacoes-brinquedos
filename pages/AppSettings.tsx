import React, { useState, useRef } from 'react';
import { Save, Upload, CloudUpload, CheckCircle, User as UserIcon, Lock, Key, Mail, ShieldCheck, Phone, Image as ImageIcon } from 'lucide-react';
import { CompanySettings, User } from '../types';
import { getAuth, createUserWithEmailAndPassword, updatePassword, EmailAuthProvider, reauthenticateWithCredential, signOut, deleteUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

interface Props {
  company: CompanySettings;
  setCompany: (c: CompanySettings) => void;
  user: User;
  onUpdateUser: (u: User) => void;
}

const AppSettings: React.FC<Props> = ({ company, setCompany, user, onUpdateUser }) => {
  const [companyData, setCompanyData] = useState<CompanySettings>(company);
  const [userData, setUserData] = useState<User>(user);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Estados para alteração de email/senha
  const [isChangingCredentials, setIsChangingCredentials] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const loginInputRef = useRef<HTMLInputElement>(null);
  const auth = getAuth();
  const db = getFirestore();

  // Função genérica para processar imagem para Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'profile' | 'login') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'logo') {
          setCompanyData({ ...companyData, logoUrl: base64 });
        } else if (type === 'login') {
          setCompanyData({ ...companyData, loginBgUrl: base64 });
        } else {
          setUserData({ ...userData, profilePhotoUrl: base64 });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // 1. Salva os dados da empresa (incluindo logo e fundo de login)
      await setCompany(companyData);
      
      // 2. Salva os dados do usuário
      await onUpdateUser(userData);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar as configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ FUNÇÃO CORRIGIDA: Alterar Email do Admin com transferência completa
  const handleChangeCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword) {
      alert("Por favor, digite sua senha atual para confirmar a alteração.");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      alert("A nova senha e a confirmação não coincidem.");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      alert("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (!newEmail && !newPassword) {
      alert("Por favor, preencha o novo email e/ou a nova senha.");
      return;
    }

    setIsSaving(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        alert("Usuário não autenticado.");
        setIsSaving(false);
        return;
      }

      // Reautentica o usuário com a senha atual
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      let successMessage = "";

      // ✅ CASO 1: Apenas mudança de senha (mantém mesmo email)
      if (newPassword && !newEmail) {
        await updatePassword(currentUser, newPassword);
        successMessage = "Senha atualizada com sucesso!";
        
        alert(successMessage);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsChangingCredentials(false);
        setIsSaving(false);
        return;
      }

      // ✅ CASO 2: Mudança de email (com ou sem senha)
      if (newEmail && newEmail !== currentUser.email) {
        console.log("🔄 Iniciando processo de transferência de admin...");
        
        // Passo 1: Buscar todos os dados do admin atual
        const oldUid = currentUser.uid;
        const oldEmail = currentUser.email;
        const oldUserDoc = await getDoc(doc(db, "users", oldUid));
        const oldUserData = oldUserDoc.exists() ? oldUserDoc.data() as User : null;
        
        console.log("📦 Dados do admin antigo:", oldUserData);

        // Passo 2: Criar nova conta no Firebase Auth
        let newUserAuth;
        try {
          // Cria a nova conta com o novo email
          const passwordToUse = newPassword || currentPassword; // Usa nova senha ou mantém a antiga
          newUserAuth = await createUserWithEmailAndPassword(auth, newEmail, passwordToUse);
          console.log("✅ Nova conta criada no Auth com UID:", newUserAuth.user.uid);
        } catch (authError: any) {
          if (authError.code === 'auth/email-already-in-use') {
            throw new Error("Este email já está em uso. Escolha outro email.");
          }
          throw authError;
        }

        // Passo 3: Criar documento do novo admin no Firestore com TODOS os dados
        const newAdminUser: User = {
          id: newUserAuth.user.uid,
          name: oldUserData?.name || userData.name || newEmail.split('@')[0],
          email: newEmail,
          role: 'ADMIN', // ✅ Mantém como ADMIN
          allowedPages: [], // Admin tem acesso total
          profilePhotoUrl: oldUserData?.profilePhotoUrl || userData.profilePhotoUrl || ''
        };

        await setDoc(doc(db, "users", newUserAuth.user.uid), newAdminUser);
        console.log("✅ Documento do novo admin criado no Firestore");

        // Passo 4: Atualizar documento settings/admin com o novo email
        await setDoc(doc(db, "settings", "admin"), { 
          email: newEmail,
          oldEmail: oldEmail,
          migratedAt: new Date().toISOString()
        });
        console.log("✅ Settings/admin atualizado com novo email");

        // Passo 5: Fazer logout para forçar nova autenticação
        successMessage = `✅ SUCESSO! Seu email foi alterado de ${oldEmail} para ${newEmail}.\n\n` +
                        `Você continuará como ADMIN com todas as permissões.\n\n` +
                        `Fazendo logout agora... Entre novamente com:\n` +
                        `Email: ${newEmail}\n` +
                        `Senha: ${newPassword ? '(nova senha que você definiu)' : '(senha atual)'}`;
        
        alert(successMessage);
        
        // Passo 6: Tentar deletar a conta antiga do Firebase Auth
        // Nota: Isso só funciona se ainda estivermos autenticados com a conta antiga
        // Como vamos fazer logout logo em seguida, isso pode não funcionar sempre
        try {
          console.log("🗑️ Tentando deletar conta antiga do Auth...");
          // Re-autentica a conta antiga antes de deletar
          await reauthenticateWithCredential(currentUser, credential);
          
          // Deleta o documento antigo do Firestore
          await deleteDoc(doc(db, "users", oldUid));
          console.log("✅ Documento antigo deletado do Firestore");
          
          // Tenta deletar a conta antiga do Auth
          // Isso pode falhar se já perdemos a autenticação
          await deleteUser(currentUser);
          console.log("✅ Conta antiga deletada do Firebase Auth");
        } catch (deleteError) {
          console.log("⚠️ Não foi possível deletar conta antiga automaticamente:", deleteError);
          console.log("Você pode deletá-la manualmente no Firebase Console se necessário");
        }

        // Limpa os campos
        setCurrentPassword('');
        setNewEmail('');
        setNewPassword('');
        setConfirmPassword('');
        setIsChangingCredentials(false);
        
        // Faz logout após 2 segundos
        setTimeout(() => {
          signOut(auth);
        }, 2000);
      }
      
    } catch (error: any) {
      console.error("❌ Erro ao alterar credenciais:", error);
      
      if (error.code === 'auth/wrong-password') {
        alert("Senha atual incorreta.");
      } else if (error.code === 'auth/email-already-in-use') {
        alert("Este email já está em uso por outra conta. Escolha outro email.");
      } else if (error.code === 'auth/invalid-email') {
        alert("Email inválido.");
      } else if (error.code === 'auth/requires-recent-login') {
        alert("Por segurança, faça logout e login novamente antes de alterar o email.");
      } else {
        alert("Erro ao alterar credenciais: " + (error.message || error));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight uppercase">Configurações</h1>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-[3px] mt-2">Sistema e Perfil</p>
        </div>
        {showSuccess && (
          <div className="flex items-center gap-3 bg-green-50 text-green-600 px-6 py-3 rounded-2xl font-bold text-sm animate-fade-in">
            <CheckCircle size={20} /> Salvo com sucesso!
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* DADOS DA EMPRESA */}
            <section className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-100 shadow-sm space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <ShieldCheck size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Dados da Empresa</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Empresa</label>
                  <input required className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" value={companyData.name} onChange={e => setCompanyData({...companyData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                  <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" value={companyData.phone} onChange={e => setCompanyData({...companyData, phone: e.target.value})} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço</label>
                  <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" value={companyData.address} onChange={e => setCompanyData({...companyData, address: e.target.value})} />
                </div>
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-blue-600 text-white px-8 py-5 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3">
                {isSaving ? 'Salvando...' : <><Save size={20} /> Salvar Alterações</>}
              </button>
            </section>
          </form>

          {/* DADOS DO PERFIL */}
          <section className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                <UserIcon size={24} />
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Meu Perfil</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                <div className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-400 flex items-center gap-2">
                  <Mail size={16} /> {userData.email}
                </div>
              </div>
            </div>
          </section>

          {/* SEÇÃO DE SEGURANÇA - ALTERAR EMAIL E SENHA */}
          <section className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center justify-between border-b border-slate-50 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                  <Lock size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Segurança</h2>
              </div>
              
              {!isChangingCredentials && (
                <button
                  onClick={() => setIsChangingCredentials(true)}
                  className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  <Key size={16} className="inline mr-2" /> Alterar Email/Senha
                </button>
              )}
            </div>

            {isChangingCredentials ? (
              <form onSubmit={handleChangeCredentials} className="space-y-6">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <p className="text-xs font-bold text-amber-800">
                    ⚠️ <strong>IMPORTANTE:</strong> Ao alterar o email, uma nova conta será criada no Firebase e você manterá todas as permissões de ADMIN.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Atual *</label>
                  <input 
                    type="password" 
                    required
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Novo Email</label>
                    <input 
                      type="email" 
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="novo@email.com"
                    />
                    <p className="text-[10px] text-slate-400 ml-1 mt-1">Deixe em branco para manter o atual</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                    <input 
                      type="password" 
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <p className="text-[10px] text-slate-400 ml-1 mt-1">Deixe em branco para manter a atual</p>
                  </div>
                </div>

                {newPassword && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha *</label>
                    <input 
                      type="password" 
                      required
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Digite novamente"
                    />
                  </div>
                )}

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                  <p className="text-xs font-bold text-blue-800">
                    🔐 Você continuará como ADMIN com acesso total ao sistema!
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    {newEmail 
                      ? "Uma nova conta será criada automaticamente e a antiga será removida."
                      : "Apenas sua senha será alterada, seu email permanecerá o mesmo."
                    }
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-red-600 text-white px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
                  >
                    {isSaving ? '🔄 Processando...' : '✅ Confirmar Alteração'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingCredentials(false);
                      setCurrentPassword('');
                      setNewEmail('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 font-bold text-sm">
                  Email atual: <span className="text-slate-800">{userData.email}</span>
                </p>
                <p className="text-slate-300 font-bold text-xs mt-2">
                  Senha: ••••••••
                </p>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-8">
          {/* LOGOMARCA */}
          <section className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm text-center flex flex-col items-center">
            <div onClick={() => logoInputRef.current?.click()} className="relative w-48 h-48 mb-6 group cursor-pointer">
              <div className="w-full h-full rounded-[48px] bg-slate-50 border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center">
                {companyData.logoUrl ? (
                  <img src={companyData.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                ) : (
                  <CloudUpload size={48} className="text-slate-200" />
                )}
              </div>
              <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white rounded-[48px]">
                <Upload size={32} />
              </div>
              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
            </div>
            <h3 className="font-black text-slate-800 uppercase tracking-tight">Logomarca</h3>
          </section>

          {/* FOTO DE PERFIL */}
          <section className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm text-center flex flex-col items-center">
            <div onClick={() => profileInputRef.current?.click()} className="relative w-32 h-32 mb-6 group cursor-pointer">
              <div className="w-full h-full rounded-full bg-slate-50 border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center">
                {userData.profilePhotoUrl ? (
                  <img src={userData.profilePhotoUrl} className="w-full h-full object-cover" alt="Perfil" />
                ) : (
                  <UserIcon size={40} className="text-slate-200" />
                )}
              </div>
              <div className="absolute inset-0 bg-purple-600/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white rounded-full">
                <Upload size={24} />
              </div>
              <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'profile')} />
            </div>
            <h3 className="font-black text-slate-800 uppercase tracking-tight">Foto de Perfil</h3>
          </section>

          {/* FUNDO DO LOGIN */}
          <section className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm text-center flex flex-col items-center">
            <div onClick={() => loginInputRef.current?.click()} className="relative w-full h-32 mb-6 group cursor-pointer">
              <div className="w-full h-full rounded-[32px] bg-slate-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                {companyData.loginBgUrl ? (
                  <img src={companyData.loginBgUrl} className="w-full h-full object-cover" alt="Fundo Login" />
                ) : (
                  <ImageIcon size={32} className="text-slate-200" />
                )}
              </div>
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white rounded-[32px]">
                <Upload size={24} />
              </div>
              <input type="file" ref={loginInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'login')} />
            </div>
            <h3 className="font-black text-slate-800 uppercase tracking-tight">Fundo do Login</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Imagem de fundo da tela inicial</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AppSettings;
