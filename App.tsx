const Login: React.FC = () => {
  const [email, setEmail] = useState('admsusu@gmail.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Lógica para carregar a foto do LocalStorage ANTES da primeira renderização
  const [displayPhoto] = useState(() => {
    const userStr = localStorage.getItem('susu_user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        // Se houver foto salva, usa ela, senão usa a padrão de balões
        return userData.profilePhotoUrl || "https://images.unsplash.com/photo-1530103862676-fa8c91811678?q=80&w=500&auto=format&fit=crop";
      } catch (e) { 
        return "https://images.unsplash.com/photo-1530103862676-fa8c91811678?q=80&w=500&auto=format&fit=crop"; 
      }
    }
    return "https://images.unsplash.com/photo-1530103862676-fa8c91811678?q=80&w=500&auto=format&fit=crop";
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError('E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 border border-slate-100 flex flex-col items-center">
        <div className="text-center mb-10 w-full flex flex-col items-center">
          {/* O segredo está nestes estilos inline (style={{...}}) que garantem o tamanho antes do CSS carregar */}
          <div 
            style={{ width: '128px', height: '128px', minHeight: '128px', minWidth: '128px' }} 
            className="bg-slate-50 rounded-[40px] flex items-center justify-center mb-6 shadow-xl border-4 border-white overflow-hidden relative"
          >
             <img 
               src={displayPhoto} 
               alt="Logo Login" 
               style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
               className="w-full h-full object-cover"
               onError={(e) => {
                 (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1530103862676-fa8c91811678?q=80&w=500&auto=format&fit=crop";
               }}
             />
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase tracking-widest">Painel Administrativo</h2>
          <p className="text-slate-400 mt-1 font-medium text-sm">SUSU Animações e Brinquedos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          {error && <div className="p-4 bg-red-50 text-red-500 text-xs font-bold rounded-2xl text-center">{error}</div>}
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
            <input 
              type="email" 
              required 
              className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none font-bold text-slate-700" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
            <input 
              type="password" 
              required 
              className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none font-bold text-slate-700" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 uppercase tracking-widest text-sm flex items-center justify-center gap-3 active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={20}/> : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};
