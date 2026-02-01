import React, { useState } from 'react';
import { CompanySettings, User, UserRole } from '../types';
import { Save, Building2, User as UserIcon, Camera, Globe, Mail, Phone, MapPin, FileText, CheckCircle2 } from 'lucide-react';

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

  // Função para salvar Logomarca e dados da Empresa
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
      logoUrl: formData.get('logoUrl') as string, // Campo da Logomarca Oficial
    };

    setCompany(updatedCompany);
    showSuccess('Configurações da empresa salvas com sucesso!');
  };

  // Função para salvar Foto de Perfil e dados do Usuário
  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const updatedUser: User = {
      ...user,
      name: formData.get('userName') as string,
      profilePhotoUrl: formData.get('profilePhotoUrl') as string, // Campo da Foto de Perfil
    };

    onUpdateUser(updatedUser);
    
    // CRUCIAL: Atualiza o localStorage para que a foto apareça no Login imediatamente
    localStorage.setItem('susu_user', JSON.stringify(updatedUser));
    
    showSuccess('Seu perfil foi atualizado!');
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">Configurações</h1>
        <p className="text-slate-500 font-medium">Gerencie os dados da sua empresa e seu perfil de acesso.</p>
      </header>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center gap-3 font-bold animate-in zoom-in duration-300">
          <CheckCircle2 size={20} /> {successMessage}
        </div>
      )}

      <div className="flex gap-2 mb-8 bg-slate-100 p-1.5 rounded-[24px] w-fit">
        <button 
          onClick={() => setActiveTab('company')}
          className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'company' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2"><Building2 size={16}/> Empresa</div>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2"><UserIcon size={16}/> Meu Perfil</div>
        </button>
      </div>

      {activeTab === 'company' ? (
        <form onSubmit={handleCompanySubmit} className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-10 space-y-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
                {company.logoUrl ? (
                  <img src={company.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                ) : (
                  <Building2 className="text-slate-300" size={32} />
                )}
              </div>
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight">Logomarca Oficial</h3>
                <p className="text-xs text-slate-400 font-medium mb-3">Aparece em orçamentos e recibos.</p>
                <input 
                  name="logoUrl" 
                  defaultValue={company.logoUrl} 
                  placeholder="URL da Imagem (https://...)"
                  className="text-xs w-full max-w-md px-4 py-2 bg-slate-50 rounded-xl border-0 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome da Empresa</label>
                <input name="name" defaultValue={company.name} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">CNPJ</label>
                <input name="cnpj" defaultValue={company.cnpj} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">E-mail de Contato</label>
                <input name="email" defaultValue={company.email} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Telefone</label>
                <input name="phone" defaultValue={company.phone} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Endereço Completo</label>
              <input name="address" defaultValue={company.address} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Termos do Contrato (Texto Padrão)</label>
              <textarea name="contractTerms" defaultValue={company.contractTerms} rows={6} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-medium border-0 text-sm" />
            </div>
          </div>
          <div className="p-10 bg-slate-50 border-t flex justify-end">
            <button type="submit" className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
              <Save size={18} /> Salvar Empresa
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleProfileSubmit} className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-10 space-y-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-blue-50 rounded-[32px] border-2 border-blue-100 flex items-center justify-center overflow-hidden">
                {user.profilePhotoUrl ? (
                  <img src={user.profilePhotoUrl} className="w-full h-full object-cover" alt="Perfil" />
                ) : (
                  <UserIcon className="text-blue-200" size={32} />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-800 uppercase tracking-tight">Sua Foto de Perfil</h3>
                <p className="text-xs text-slate-400 font-medium mb-3">Esta foto aparecerá na tela de login e nos relatórios.</p>
                <input 
                  name="profilePhotoUrl" 
                  defaultValue={user.profilePhotoUrl} 
                  placeholder="URL da sua foto (Ex: link do Imgur, Drive público...)"
                  className="text-xs w-full px-4 py-2 bg-slate-50 rounded-xl border-0 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Seu Nome</label>
                <input name="userName" defaultValue={user.name} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-0" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">E-mail de Acesso</label>
                <input disabled value={user.email} className="w-full px-6 py-4 bg-slate-100 rounded-2xl font-bold border-0 text-slate-400 cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nível de Acesso</label>
                <div className="px-6 py-4 bg-slate-100 rounded-2xl font-black text-xs uppercase text-blue-600 border-0">
                  {user.role === UserRole.ADMIN ? 'Administrador Geral' : 'Colaborador'}
                </div>
              </div>
            </div>
          </div>
          <div className="p-10 bg-slate-50 border-t flex justify-end">
            <button type="submit" className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
              <Save size={18} /> Atualizar Perfil
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AppSettings;
