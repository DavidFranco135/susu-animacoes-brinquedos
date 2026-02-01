import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged, 
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
import Inventory from './pages/Inventory'; // O componente que gerencia Brinquedos
import Rentals from './pages/Rentals';
import Financial from './pages/Financial';
import Staff from './pages/Staff';
import AppSettings from './pages/AppSettings';
import Availability from './pages/Availability';
import CustomersPage from './pages/CustomersPage';
import BudgetsPage from './pages/BudgetsPage';
import DocumentsPage from './pages/DocumentsPage';
import PublicRentalSummary from './pages/PublicRentalSummary';
import { Customer, Toy, Rental, User, UserRole, FinancialTransaction, CompanySettings } from './types';
import { Loader2 } from 'lucide-react';

// Configuração do Firebase (conforme seu arquivo)
const firebaseConfig = {
  apiKey: "AIzaSyBUvwY-e7h0KZyFJv7n0ignpzlMUGJIurU",
  authDomain: "niklaus-b2b.firebaseapp.com",
  projectId: "niklaus-b2b",
  storageBucket: "niklaus-b2b.appspot.com",
  messagingSenderId: "1056554531818",
  appId: "1:1056554531818:web:7f864e21a22459e956976b"
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
  const [categories, setCategories] = useState<string[]>(['Pula Pula', 'Tobogã', 'Animação', 'Pipoca/Algodão']);
  const [company, setCompany] = useState<CompanySettings>({
    name: 'SUSU Animações',
    address: '',
    phone: '',
    email: '',
    logoUrl: '',
    contractTerms: ''
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Simulação de busca de perfil, no real você buscaria no Firestore
        const savedUser = localStorage.getItem('susu_user');
        setUser(savedUser ? JSON.parse(savedUser) : {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Administrador',
          email: firebaseUser.email || '',
          role: UserRole.ADMIN
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Listeners em tempo real do Firestore
    const qRentals = query(collection(db, "rentals"), orderBy("date", "desc"));
    const unsubRentals = onSnapshot(qRentals, (snap) => {
      setRentals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Rental)));
    });

    const unsubToys = onSnapshot(collection(db, "toys"), (snap) => {
      setToys(snap.docs.map(d => ({ id: d.id, ...d.data() } as Toy)));
    });

    const unsubCustomers = onSnapshot(collection(db, "customers"), (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    });

    return () => {
      unsubscribeAuth();
      unsubRentals();
      unsubToys();
      unsubCustomers();
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Rota Pública de Resumo */}
        <Route path="/resumo/:id" element={<PublicRentalSummary rentals={rentals} toys={toys} company={company} />} />

        {/* Rotas Protegidas */}
        {!user ? (
          <Route path="*" element={<Navigate to="/login" />} />
        ) : (
          <Route path="*" element={
            <Layout user={user} onLogout={() => auth.signOut()} onUpdateUser={setUser}>
              <Routes>
                <Route path="/" element={<Dashboard rentals={rentals} toysCount={toys.length} transactions={transactions} />} />
                
                {/* CORREÇÃO AQUI: path="/brinquedos" para bater com o MENU */}
                <Route path="/brinquedos" element={
                  <Inventory 
                    toys={toys} 
                    setToys={setToys} 
                    categories={categories} 
                    setCategories={setCategories} 
                  />
                } />

                <Route path="/reservas" element={
                  <Rentals 
                    rentals={rentals} 
                    setRentals={setRentals} 
                    customers={customers} 
                    setCustomers={setCustomers} 
                    toys={toys} 
                  />
                } />

                <Route path="/clientes" element={<CustomersPage customers={customers} setCustomers={setCustomers} />} />
                <Route path="/disponibilidade" element={<Availability rentals={rentals} toys={toys} />} />
                <Route path="/orcamentos" element={<BudgetsPage rentals={rentals} customers={customers} toys={toys} company={company} />} />
                
                <Route path="/financeiro" element={
                  user.role === UserRole.ADMIN ? 
                  <Financial rentals={rentals} setRentals={setRentals} transactions={transactions} setTransactions={setTransactions} /> 
                  : <Navigate to="/reservas" />
                } />

                <Route path="/contratos" element={<DocumentsPage type="contract" rentals={rentals} customers={customers} company={company} />} />
                <Route path="/recibos" element={<DocumentsPage type="receipt" rentals={rentals} customers={customers} company={company} />} />
                
                <Route path="/colaboradores" element={
                  user.role === UserRole.ADMIN ? <Staff staff={[]} setStaff={()=>{}} /> : <Navigate to="/reservas" />
                } />

                <Route path="/configuracoes" element={
                  user.role === UserRole.ADMIN ? 
                  <AppSettings company={company} setCompany={setCompany} user={user} onUpdateUser={setUser} /> 
                  : <Navigate to="/reservas" />
                } />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          } />
        )}
      </Routes>
    </Router>
  );
};

export default App;
