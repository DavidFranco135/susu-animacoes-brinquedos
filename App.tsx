import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged, 
  signOut 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  query,
  orderBy
} from "firebase/firestore";

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Rentals from './pages/Rentals';
import Financial from './pages/Financial';
import Staff from './pages/Staff';
import AppSettings from './pages/AppSettings';
import Availability from './pages/Availability';
import CustomersPage from './pages/CustomersPage';
import BudgetsPage from './pages/BudgetsPage';
import DocumentsPage from './pages/DocumentsPage';
import PublicRentalSummary from './pages/PublicRentalSummary';
import { Customer, Toy, Rental, User, UserRole, FinancialTransaction, CompanySettings as CompanyType } from './types';
import { User as UserIcon, Loader2 } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyBUvwY-e7h0KZyFJv7n0ignpzlMUGJIurU",
  authDomain: "niklaus-b2b.firebaseapp.com",
  projectId: "niklaus-b2b",
  storageBucket: "niklaus-b2b.firebasestorage.app",
  messagingSenderId: "936430517671",
  appId: "1:936430517671:web:6a0f1b86a39621d74c4a82",
  measurementId: "G-3VGKJGWFSY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const Login: React.FC = () => {
  const [email, setEmail] = useState('admsusu@gmail.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [displayPhoto, setDisplayPhoto] = useState<string>("https://images.unsplash.com/photo-1530103862676-fa8c91811678?q=80&w=500&auto=format&fit=crop");

  // Busca a foto de perfil salva para exibir no Login
  useEffect(() => {
    const userStr = localStorage.getItem('susu_user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData.profilePhotoUrl) setDisplayPhoto(userData.profilePhotoUrl);
      } catch (e) { console.error("Erro ao ler foto do perfil", e); }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if ((err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') && email === 'admsusu@gmail.com') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          return;
        } catch (createErr: any) {
          setError('Erro ao criar conta administrativa.');
        }
      } else {
        setError('E-mail ou senha inválidos.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 border border-slate-100 flex flex-col items-center">
        <div className="text-center mb-10 w-full flex flex-col items-center">
          {/* Foto dinâmica: Perfil do usuário ou Fallback de brinquedos */}
          <div className="w-32 h-32 bg-slate-50 rounded-[40px] flex items-center justify-center mb-6 shadow-xl border-4 border-white overflow-hidden relative">
             <img 
               key={displayPhoto}
               src={displayPhoto} 
               alt="Logo Login" 
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
            <input type="email" required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none font-bold" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
            <input type="password" required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none font-bold" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-br from-cyan-400 to-blue-600 text-white font-black py-5 rounded-2xl hover:shadow-2xl transition-all shadow-xl shadow-blue-100 uppercase tracking-widest text-sm flex items-center justify-center gap-3">
            {loading ? <Loader2 className="animate-spin" size={20}/> : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [toys, setToys] = useState<Toy[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<string[]>(['Infláveis', 'Animação / Recreação', 'Eletrônicos', 'Mesa/Jogos', 'Cama Elástica', 'Espaço Kids', 'Outros']);
  const [company, setCompany] = useState<CompanyType>({
    name: 'SUSU Animações e Brinquedos LTDA',
    cnpj: '00.000.000/0001-00',
    email: 'contato@susu.com',
    phone: '11999999999',
    address: 'Rua das Festas, 123, São Paulo - SP',
    contractTerms: 'Termos padrão...'
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        onSnapshot(userDocRef, (docSnap) => {
          let userData: User;
          if (docSnap.exists()) {
            userData = docSnap.data() as User;
          } else {
            userData = {
              id: firebaseUser.uid,
              name: firebaseUser.email?.split('@')[0] || 'Usuário',
              email: firebaseUser.email || '',
              role: firebaseUser.email === 'admsusu@gmail.com' ? UserRole.ADMIN : UserRole.EMPLOYEE
            };
            setDoc(userDocRef, userData);
          }
          setUser(userData);
          localStorage.setItem('susu_user', JSON.stringify(userData));
        });
      } else {
        setUser(null);
        localStorage.removeItem('susu_user');
      }
      setInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    onSnapshot(query(collection(db, "toys"), orderBy("name")), (snap) => {
      setToys(snap.docs.map(d => ({ ...d.data(), id: d.id } as Toy)));
    });

    onSnapshot(query(collection(db, "customers"), orderBy("name")), (snap) => {
      setCustomers(snap.docs.map(d => ({ ...d.data(), id: d.id } as Customer)));
    });

    onSnapshot(query(collection(db, "rentals"), orderBy("date", "desc")), (snap) => {
      setRentals(snap.docs.map(d => ({ ...d.data(), id: d.id } as Rental)));
    });

    onSnapshot(query(collection(db, "transactions"), orderBy("date", "desc")), (snap) => {
      setTransactions(snap.docs.map(d => ({ ...d.data(), id: d.id } as FinancialTransaction)));
    });

    // Monitora as configurações da empresa (incluindo a logomarca oficial)
    onSnapshot(doc(db, "settings", "company"), (docSnap) => {
      if (docSnap.exists()) setCompany(docSnap.data() as CompanyType);
    });

    onSnapshot(doc(db, "settings", "categories"), (docSnap) => {
      if (docSnap.exists()) setCategories(docSnap.data().list || []);
    });
  }, [user]);

  const handleUpdateUser = (updatedUser: User) => {
    if (user) {
      setDoc(doc(db, "users", user.id), updatedUser);
      localStorage.setItem('susu_user', JSON.stringify(updatedUser));
    }
  };

  const handleUpdateCompany = (updatedCompany: CompanyType) => {
    setDoc(doc(db, "settings", "company"), updatedCompany);
  };

  const handleUpdateCategories = (newList: string[]) => {
    setDoc(doc(db, "settings", "categories"), { list: newList });
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/resumo/:id" element={<PublicRentalSummary rentals={rentals} toys={toys} company={company} />} />
        <Route path="*" element={
          !user ? <Login /> : (
            <Layout user={user} onLogout={() => signOut(auth)} onUpdateUser={handleUpdateUser}>
              <Routes>
                <Route path="/" element={user.role === UserRole.ADMIN ? <Dashboard rentals={rentals} toysCount={toys.length} transactions={transactions} /> : <Navigate to="/reservas" />} />
                <Route path="/reservas" element={<Rentals rentals={rentals} setRentals={(a: any) => a(rentals).forEach((r: Rental) => setDoc(doc(db, "rentals", r.id), r))} customers={customers} setCustomers={() => {}} toys={toys} />} />
                <Route path="/brinquedos" element={<Inventory toys={toys} setToys={(a: any) => a(toys).forEach((t: Toy) => setDoc(doc(db, "toys", t.id), t))} categories={categories} setCategories={handleUpdateCategories} />} />
                <Route path="/clientes" element={<CustomersPage customers={customers} setCustomers={(a: any) => a(customers).forEach((c: Customer) => setDoc(doc(db, "customers", c.id), c))} />} />
                <Route path="/disponibilidade" element={<Availability rentals={rentals} toys={toys} />} />
                <Route path="/orcamentos" element={<BudgetsPage rentals={rentals} setRentals={(a: any) => a(rentals).forEach((r: Rental) => setDoc(doc(db, "rentals", r.id), r))} customers={customers} toys={toys} company={company} />} />
                <Route path="/financeiro" element={user.role === UserRole.ADMIN ? <Financial rentals={rentals} setRentals={()=>{}} transactions={transactions} setTransactions={(a: any) => a(transactions).forEach((t: FinancialTransaction) => setDoc(doc(db, "transactions", t.id), t))} /> : <Navigate to="/reservas" />} />
                <Route path="/contratos" element={<DocumentsPage type="contract" rentals={rentals} customers={customers} company={company} />} />
                <Route path="/recibos" element={<DocumentsPage type="receipt" rentals={rentals} customers={customers} company={company} />} />
                <Route path="/colaboradores" element={user.role === UserRole.ADMIN ? <Staff staff={[]} setStaff={()=>{}} /> : <Navigate to="/reservas" />} />
                <Route path="/configuracoes" element={user.role === UserRole.ADMIN ? <AppSettings company={company} setCompany={handleUpdateCompany} user={user} onUpdateUser={handleUpdateUser} /> : <Navigate to="/reservas" />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          )
        } />
      </Routes>
    </Router>
  );
};

export default App;
