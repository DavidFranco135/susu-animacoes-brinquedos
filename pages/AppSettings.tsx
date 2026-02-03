import React, { useState, useRef } from 'react';
import { Save, Upload, CloudUpload, CheckCircle, User as UserIcon, Lock, Key, Mail, ShieldCheck, Phone, Image as ImageIcon } from 'lucide-react';
import { CompanySettings, User } from '../types';
import { auth, db } from '../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

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
      
      // 2. Salva os dados do usuário (CORREÇÃO: agora salva a foto de perfil no Firebase)
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

  // ✅ FUNÇÃO CORRIGIDA: Cria nova conta quando altera email do admin
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

    // Se não tem email nem senha para alterar
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

      // ============= APENAS SENHA (sem mudar email) =============
      if (newPassword && !newEmail) {
        await updatePassword(currentUser, newPassword);
        successMessage = "Senha atualizada com sucesso!";
      }

      // ============= ALTERAÇÃO DE EMAIL =============
      if (newEmail && newEmail !== currentUser.email) {
        const passwordToUse = newPassword || currentPassword; // Usa nova senha se fornecida, senão usa a atual

        try {
          // 1. CRIA NOVA CONTA no Firebase Auth com o novo email
          const newUserCredential = await createUserWithEmailAndPassword(auth, newEmail, passwordToUse);
          const newUid = newUserCredential.user.uid;

          // 2. Cria documento do novo usuário no Firestore com role ADMIN
          const newUserData: User = {
            id: newUid,
            name: userData.name,
            email: newEmail,
            role: 'ADMIN' as any, // Mantém como ADMIN
            allowedPages: [],
            profilePhotoUrl: userData.profilePhotoUrl || ''
          };
          await setDoc(doc(db, "users", newUid), newUserData);

          // 3. Atualiza o email admin no settings
          await setDoc(doc(db, "settings", "admin"), { email: newEmail });

          successMessage = newPassword 
            ? "✅ Nova conta ADMIN criada com sucesso! Email e senha alterados. Faça login com as novas credenciais."
            : "✅ Nova conta ADMIN criada com sucesso! Use o novo email com a senha atual para fazer login.";

          // 4. Faz logout da conta antiga
          alert(successMessage);
          setTimeout(() => {
            signOut(auth);
          }, 2000);

        } catch (createError: any) {
          console.error("Erro ao criar nova conta:", createError);
          
          if (createError.code === 'auth/email-already-in-use') {
            // Se o email já existe, apenas atualiza as configurações
            alert("Este email já possui uma conta. Atualizando as configurações do sistema para usar este email como ADMIN.");
            
            await setDoc(doc(db, "settings", "admin"), { email: newEmail });
            
            if (newPassword) {
              await updatePassword(currentUser, newPassword);
            }
            
            successMessage = "Configurações atualizadas! Faça login com o email existente" + (newPassword ? " e a nova senha." : ".");
            alert(successMessage);
            setTimeout(() => signOut(auth), 2000);
          } else {
            throw createError;
          }
        }
      }

      // Limpa os campos
      setCurrentPassword('');
      setNewEmail('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingCredentials(false);
      
    } catch (error: any) {
      console.error("Erro ao alterar credenciais:", error);
      
      if (error.code === 'auth/wrong-password') {
        alert("Senha atual incorreta.");
      } else if (error.code === 'auth/invalid-email') {
        alert("Email inválido.");
      } else if (error.code === 'auth/requires-recent-login') {
        alert("Por segurança, faça logout e login novamente antes de alterar o email.");
      } else {
        alert("Erro ao alterar credenciais: " + error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">Configurações</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[4px] mt-3">Perfil e Sistema</p>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={isSaving}
          className="bg-blue-600 text-white px-10 py-4 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
        >
          {isSaving ? 'A guardar...' : <><Save size={20}/> Salvar Alterações</> }
        </button>
      </header>

      {showSuccess && (
        <div className="bg-emerald-500 text-white p-4 rounded-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle size={20} /> <span className="font-black uppercase text-xs tracking-widest">Alterações salvas com sucesso!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* PERFIL DO UTILIZADOR */}
          <section className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center gap-8 border-b border-slate-50 pb-6">
              <div onClick={() => profileInputRef.current?.click()} className="relative group cursor-pointer">
                <div className="w-24 h-24 rounded-3xl bg-slate-100 overflow-hidden border-4 border-white shadow-lg flex items-center justify-center">
                  {userData.profilePhotoUrl ? (
                    <img src={userData.profilePhotoUrl} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={32} className="text-slate-300" />
                  )}
                </div>
                <div className="absolute inset-0 bg-blue-600/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-3xl text-white">
                  <Upload size={20} />
                </div>
                <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'profile')} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Foto de Perfil</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Clique para alterar o seu avatar</p>
              </div>
            </div>

            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input 
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0 outline-none focus:ring-2 focus:ring-blue-500/20" 
                      value={userData.name} 
                      onChange={e => setUserData({...userData, name: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                    <div className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold text-slate-400 flex items-center gap-2">
                      <Mail size={16} /> {userData.email}
                    </div>
                  </div>
               </div>
            </div>
          </section>

          {/* ✅ NOVA SEÇÃO: ALTERAR EMAIL E SENHA */}
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
                    ⚠️ Por segurança, você precisa confirmar sua senha atual para fazer alterações.
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Novo Email (Opcional)</label>
                    <input 
                      type="email" 
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="novo@email.com"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha (Opcional)</label>
                    <input 
                      type="password" 
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>

                {newPassword && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
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
                    🔐 Uma nova conta ADMIN será criada com o novo email!
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    {newPassword 
                      ? "Após a alteração, faça login com o novo email e a nova senha."
                      : "Após a alteração, faça login com o novo email e a senha atual."
                    }
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-red-600 text-white px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Processando...' : 'Confirmar Alteração'}
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

          {/* DADOS DA EMPRESA */}
          <section className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><ShieldCheck size={24}/></div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Dados da Empresa</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome Fantasia</label>
                <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" value={companyData.name} onChange={e=>setCompanyData({...companyData, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">WhatsApp de Vendas</label>
                <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" value={companyData.phone} onChange={e=>setCompanyData({...companyData, phone: e.target.value})} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Endereço Sede</label>
                <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" value={companyData.address} onChange={e=>setCompanyData({...companyData, address: e.target.value})} />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          {/* LOGOMARCA */}
          <section className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm text-center flex flex-col items-center">
            <div onClick={() => logoInputRef.current?.click()} className="relative w-48 h-48 mb-6 group cursor-pointer">
              <div className="w-full h-full rounded-[48px] bg-slate-50 border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center">
                {companyData.logoUrl ? (
                  <img src={companyData.logoUrl} className="w-full h-full object-cover" />
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

          {/* NOVO: FOTO DA TELA DE LOGIN */}
          <section className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm text-center flex flex-col items-center">
            <div onClick={() => loginInputRef.current?.click()} className="relative w-full h-32 mb-6 group cursor-pointer">
              <div className="w-full h-full rounded-[32px] bg-slate-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                {companyData.loginBgUrl ? (
                  <img src={companyData.loginBgUrl} className="w-full h-full object-cover" />
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
