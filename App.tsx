import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
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
import { Loader2 } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyBUvwY-e7h0KZyFJv7n0ignpzlMUGJIurU",
  authDomain: "niklaus-b2b.firebaseapp.com",
  projectId: "niklaus-b2b",
  storageBucket: "niklaus-b2b.appspot.com",
  messagingSenderId: "367175248550",
  appId: "1:367175248550:web:48a91443657b98f98ec43f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [toys, setToys] = useState<Toy[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<string[]>(['Geral', 'Infláveis', 'Jogos', 'Alimentação']);
  const [company, setCompany] = useState<CompanyType>({
    name: 'SUSU Animações',
    logoUrl: '',
    address: '',
    phone: '',
    email: '',
    contractTerms: ''
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const savedUser = localStorage.getItem('susu_user');
        setUser(savedUser ? JSON.parse(savedUser) : { id: firebaseUser.uid, email: firebaseUser.email, name: 'Admin', role: UserRole.ADMIN });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Sync Collections
    const unsubRentals = onSnapshot(query(collection(db, \"rentals\"), orderBy(\"date\", \"desc\")), (snap) => {
      setRentals(snap.docs.map(d => d.data() as Rental));
    });
    const unsubCustomers = onSnapshot(collection(db, \"customers\"), (snap) => {
      setCustomers(snap.docs.map(d => d.data() as Customer));
    });
    const unsubToys = onSnapshot(collection(db, \"toys\"), (snap) => {
      setToys(snap.docs.map(d => d.data() as Toy));
    });
    const unsubTransactions = onSnapshot(collection(db, \"transactions\"), (snap) => {
      setTransactions(snap.docs.map(d => d.data() as FinancialTransaction));
    });
    const unsubCompany = onSnapshot(doc(db, \"settings\", \"company\"), (snap) => {
      if (snap.exists()) setCompany(snap.data() as CompanyType);
    });
    const unsubCats = onSnapshot(doc(db, \"settings\", \"categories\"), (snap) => {
      if (snap.exists()) setCategories(snap.data().list);
    });

    return () => {
      unsubAuth(); unsubRentals(); unsubCustomers(); unsubToys(); unsubTransactions(); unsubCompany(); unsubCats();
    };
  }, []);

  const handleUpdateCompany = (newCompany: CompanyType) => {
    setCompany(newCompany);
    setDoc(doc(db, \"settings\", \"company\"), newCompany);
  };

  const handleUpdateCategories = (newList: string[]) => {
    setCategories(newList);
    setDoc(doc(db, \"settings\", \"categories\"), { list: newList });
  };

  if (loading) return (
    <div className=\"min-h-screen bg-slate-50 flex items-center justify-center\">
      <Loader2 className=\"animate-spin text-blue-600\" size={48} />
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route path=\"/resumo-publico/:id\" element={<PublicRentalSummary rentals={rentals} toys={toys} company={company} />} />
        <Route path=\"/*\" element={
          !user ? <Navigate to=\"/login\" /> : (
            <Layout user={user} onLogout={() => signOut(auth)} onUpdateUser={setUser}>
              <Routes>
                <Route path=\"/\" element={<Dashboard rentals={rentals} toysCount={toys.length} transactions={transactions} />} />
                <Route path=\"/clientes\" element={<CustomersPage customers={customers} setCustomers={(action: any) => {
                  const next = typeof action === 'function' ? action(customers) : action;
                  next.forEach((c: Customer) => setDoc(doc(db, \"customers\", c.id), c));
                }} />} />
                <Route path=\"/brinquedos\" element={<Inventory toys={toys} setToys={(action: any) => {
                  const next = typeof action === 'function' ? action(toys) : action;
                  next.forEach((t: Toy) => setDoc(doc(db, \"toys\", t.id), t));
                }} categories={categories} setCategories={handleUpdateCategories} />} />
                <Route path=\"/disponibilidade\" element={<Availability rentals={rentals} toys={toys} />} />
                <Route path=\"/reservas\" element={<Rentals 
                  rentals={rentals} 
                  setRentals={(action: any) => {
                    const next = typeof action === 'function' ? action(rentals) : action;
                    next.forEach((r: Rental) => setDoc(doc(db, \"rentals\", r.id), r));
                  }} 
                  customers={customers} 
                  toys={toys} 
                  categories={categories} // Passando as categorias dinâmicas
                />} />
                <Route path=\"/orcamentos\" element={<BudgetsPage rentals={rentals} customers={customers} toys={toys} company={company} />} />
                <Route path=\"/financeiro\" element={user.role === UserRole.ADMIN ? <Financial rentals={rentals} setRentals={()=>{}} transactions={transactions} setTransactions={(action: any) => {
                    const next = typeof action === 'function' ? action(transactions) : action;
                    next.forEach((t: FinancialTransaction) => setDoc(doc(db, \"transactions\", t.id), t));
                }} /> : <Navigate to=\"/reservas\" />} />
                <Route path=\"/contratos\" element={<DocumentsPage type=\"contract\" rentals={rentals} customers={customers} company={company} />} />
                <Route path=\"/recibos\" element={<DocumentsPage type=\"receipt\" rentals={rentals} customers={customers} company={company} />} />
                <Route path=\"/configuracoes\" element={user.role === UserRole.ADMIN ? <AppSettings company={company} setCompany={handleUpdateCompany} user={user} onUpdateUser={setUser} /> : <Navigate to=\"/reservas\" />} />
                <Route path=\"*\" element={<Navigate to=\"/\" replace />} />
              </Routes>
            </Layout>
          )
        } />
      </Routes>
    </Router>
  );
};

export default App;
