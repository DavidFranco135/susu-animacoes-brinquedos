import React, { useState } from 'react';
import { CompanySettings, User, UserRole } from '../types';
import { Save, Building2, User as UserIcon, CheckCircle2 } from 'lucide-react';

interface Props {
  company: CompanySettings;
  setCompany: (company: CompanySettings) => void;
  user: User;
  onUpdateUser: (user: User) => void;
}

const AppSettings: React.FC<Props> = ({ company, setCompany, user, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'company' | 'profile'>('company');
  const [successMessage, setSuccessMessage] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleCompanySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updatedCompany: CompanySettings = {
      ...company,
      name: formData.get('name') as string,
      cnpj: formData.get('cnpj') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      contractTerms: formData.get('contractTerms') as string,
      logoUrl: formData.get('logoUrl') as string,
    };
    setCompany(updatedCompany);
    showSuccess('Configurações da empresa salvas!');
  };

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Agora incluímos o campo 'title' (o texto embaixo da foto)
    const updatedUser: User = {
      ...user,
      name: formData.get('userName') as string,
      profilePhotoUrl: formData.get('profilePhotoUrl') as string,
      title: formData.get('userTitle') as string, // Novo campo aqui
    };

    onUpdateUser(updatedUser);
    localStorage.setItem('susu_user', JSON.stringify(updatedUser));
    showSuccess('Perfil atualizado com sucesso!');
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-700">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">Configurações</h1>
        <p className="text-slate-500 font-medium">Edite as informações do sistema e do seu perfil.</p>
      </header>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center gap-3 font-bold border border-emerald-100">
          <CheckCircle2 size={20} /> {successMessage}
        </div>
      )}

      <div className="flex gap-2 mb-8 bg-slate-100 p-1.5 rounded-[24px] w-fit">
        <button onClick={() => setActiveTab('company')} className={`px-8 py-3 rounded-2xl font-black text-xs uppercase transition-all ${activeTab === 'company' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Empresa</button>
        <button onClick={() => setActiveTab('profile')} className={`px-8 py-3 rounded-2xl font-black text-xs uppercase transition-all ${activeTab === 'profile' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Meu Perfil</button>
      </div>

      {activeTab === 'company' ? (
        <form onSubmit={handleCompanySubmit} className="bg-white rounded-[40px] border shadow-sm overflow-hidden p-10 space-y-8">
           {/* Campos da empresa permanecem iguais */}
           <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-slate-50 rounded-[32px] border flex items-center justify-center overflow-hidden">
                {company.logoUrl ? <img src={company.logoUrl} className="w-full h-full object-cover" /> : <Building2 className="text-slate-300" />}
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Link da Logomarca Oficial</label>
                <input name="logoUrl" defaultValue={company.logoUrl} className="w-full px-4 py-2 bg-slate-50 rounded-xl mt-1 border-0 font-bold" />
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input name="name" defaultValue={company.name} placeholder="Nome" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" />
              <input name="cnpj" defaultValue={company.cnpj} placeholder="CNPJ" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" />
           </div>
           <button type="submit" className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2"><Save size={18}/> Salvar Empresa</button>
        </form>
      ) : (
        <form onSubmit={handleProfileSubmit} className="bg-white rounded-[40px] border shadow-sm overflow-hidden p-10 space-y-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-blue-50 rounded-[32px] flex items-center justify-center overflow-hidden border-2 border-blue-100">
              {user.profilePhotoUrl ? <img src={user.profilePhotoUrl} className="w-full h-full object-cover" /> : <UserIcon className="text-blue-200" />}
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Link da Foto de Perfil</label>
              <input name="profilePhotoUrl" defaultValue={user.profilePhotoUrl} className="w-full px-4 py-2 bg-slate-50 rounded-xl mt-1 border-0 font-bold" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Seu Nome</label>
              <input name="userName" defaultValue={user.name} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" />
            </div>
            {/* NOVO CAMPO: Texto embaixo da foto */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Texto abaixo da foto (Cargo/Bio)</label>
              <input name="userTitle" defaultValue={user.title || ''} placeholder="Ex: Diretor de Eventos" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" />
            </div>
          </div>
          
          <button type="submit" className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2"><Save size={18}/> Atualizar Meu Perfil</button>
        </form>
      )}
    </div>
  );
};

export default AppSettings;
