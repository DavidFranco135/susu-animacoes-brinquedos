import React, { useState, useRef } from 'react';
import { Save, Upload, CloudUpload, CheckCircle, User as UserIcon, Lock, Key, Mail, ShieldCheck, Phone, Image as ImageIcon } from 'lucide-react';
import { CompanySettings, User } from '../types';
import { auth } from '../firebase';
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, signOut, createUserWithEmailAndPassword } from 'firebase/auth';

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

  // ✅ FUNÇÃO CORRIGIDA: Agora CRIA automaticamente o usuário no Firebase Authentication
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

    // ✅ VALIDAÇÃO: Se alterar email, PRECISA fornecer nova senha
    if (newEmail && !newPassword) {
      alert("⚠️ Para alterar o email, você PRECISA definir uma nova senha também.\n\nIsso garante que você conseguirá fazer login com o novo email.");
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

      // Importar setDoc e doc do Firebase
      const { setDoc, doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');

      // Reautentica o usuário com a senha atual
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      let successMessage = "";

      // ✅ SE ESTÁ ALTERANDO APENAS A SENHA (sem alterar email)
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

      // ✅ SE ESTÁ ALTERANDO O EMAIL (FLUXO COMPLETO DE TRANSFERÊNCIA)
      if (newEmail && newEmail !== currentUser.email) {
        console.log("📧 Iniciando transferência de admin para:", newEmail);
        
        const oldUid = currentUser.uid;
        const oldEmail = currentUser.email;

        // PASSO 1: Criar NOVO usuário no Firebase Authentication
        let newUserCredential;
        try {
          console.log("🔐 Criando novo usuário no Firebase Authentication...");
          newUserCredential = await createUserWithEmailAndPassword(auth, newEmail, newPassword);
          console.log("✅ Novo usuário criado com UID:", newUserCredential.user.uid);
        } catch (authError: any) {
          console.error("❌ Erro ao criar usuário:", authError);
          if (authError.code === 'auth/email-already-in-use') {
            alert("❌ Este email já está cadastrado no sistema.\n\nUse outro email ou recupere a senha.");
          } else if (authError.code === 'auth/invalid-email') {
            alert("❌ Email inválido.");
          } else if (authError.code === 'auth/weak-password') {
            alert("❌ Senha muito fraca. Use no mínimo 6 caracteres.");
          } else {
            alert("❌ Erro ao criar novo usuário: " + authError.message);
          }
          setIsSaving(false);
          return;
        }

        const newUid = newUserCredential.user.uid;

        // PASSO 2: Criar documento do novo usuário admin no Firestore
        console.log("📄 Criando documento do novo admin no Firestore...");
        const newAdminData = {
          ...userData,
          id: newUid,
          email: newEmail
        };

        try {
          await setDoc(doc(db, "users", newUid), newAdminData);
          console.log("✅ Documento criado no Firestore");
        } catch (firestoreError: any) {
          console.error("❌ Erro ao criar documento:", firestoreError);
          alert("❌ Erro ao salvar dados no banco: " + firestoreError.message);
          setIsSaving(false);
          return;
        }

        // PASSO 3: Atualizar o email admin nas configurações
        console.log("⚙️ Atualizando configuração de admin...");
        try {
          await setDoc(doc(db, "settings", "admin"), { 
            email: newEmail,
            uid: newUid 
          });
          console.log("✅ Configuração atualizada");
        } catch (settingsError: any) {
          console.log("⚠️ Aviso ao atualizar settings:", settingsError);
        }

        // PASSO 4: Remover documento do usuário antigo (limpeza)
        try {
          console.log("🗑️ Removendo documento antigo...");
          await deleteDoc(doc(db, "users", oldUid));
          console.log("✅ Documento antigo removido");
        } catch (deleteError) {
          console.log("⚠️ Aviso ao remover documento:", deleteError);
        }

        successMessage = `✅ TRANSFERÊNCIA CONCLUÍDA!

📧 Novo email: ${newEmail}
🔐 Nova senha: definida
👑 Você continua como ADMIN

⚠️ IMPORTANTE:
- Você será deslogado em 3 segundos
- Faça login com o NOVO email e senha
- Email antigo: ${oldEmail} (sem acesso)`;

        alert(successMessage);

        // PASSO 5: Deslogar após 3 segundos
        console.log("⏳ Aguardando logout...");
        setTimeout(async () => {
          console.log("👋 Deslogando...");
          await signOut(auth);
        }, 3000);
      }

    } catch (error: any) {
      console.error("Erro ao alterar credenciais:", error);
      
      if (error.code === 'auth/wrong-password') {
        alert("Senha atual incorreta.");
      } else if (error.code === 'auth/email-already-in-use') {
        alert("Este email já está em uso por outra conta.");
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
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Configurações</h1>
        {showSuccess && (
          <div className="flex items-center gap-2 bg-green-50 border-2 border-green-500 text-green-700 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest">
            <CheckCircle size={20} />
            Salvo com sucesso!
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* DADOS DA EMPRESA */}
          <form onSubmit={handleSubmit}>
          <section className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <ShieldCheck size={24} />
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Dados da Empresa</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Empresa</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                  value={companyData.name}
                  onChange={e => setCompanyData({...companyData, name: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                  value={companyData.cnpj || ''}
                  onChange={e => setCompanyData({...companyData, cnpj: e.target.value})}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                  value={companyData.phone}
                  onChange={e => setCompanyData({...companyData, phone: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                  value={companyData.address}
                  onChange={e => setCompanyData({...companyData, address: e.target.value})}
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-blue-600 text-white px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? 'Salvando...' : <><Save size={20} /> Salvar Configurações</>}
              </button>
            </div>
          </section>
          </form>

          {/* MEUS DADOS */}
          <section className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                <UserIcon size={24} />
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Meus Dados</h2>
            </div>

            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input 
                      type="text" 
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha {newEmail ? '*' : '(Opcional)'}</label>
                    <input 
                      type="password" 
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                    {newEmail && (
                      <p className="text-[9px] text-red-600 font-bold ml-1">
                        * Obrigatório ao alterar email
                      </p>
                    )}
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
                    🔐 Você continuará como ADMIN mesmo após alterar o email!
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    {newEmail 
                      ? "Um novo usuário será criado automaticamente no sistema. Após a alteração, você será deslogado."
                      : "Após a alteração, faça logout e entre com as novas credenciais."
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
