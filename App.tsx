import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
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
  orderBy,
  deleteDoc
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

// ... (firebaseConfig mantido igual)

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toys, setToys] = useState<Toy[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [company, setCompany] = useState<CompanyType | null>(null);
  const [categories, setCategories] = useState<string[]>(['Geral', 'Infláveis', 'Eletrônicos', 'Jogos']);

  const auth = getAuth();
  const db = getFirestore();

  // Efeito de Autenticação e Dados (Mantido original)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await doc(db, "users", firebaseUser.uid);
        onSnapshot(userDoc, (doc) => {
          if (doc.exists()) {
            setUser(doc.data() as User);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Listeners do Firestore (Mantido original)
    const qToys = query(collection(db, "toys"));
    onSnapshot(qToys, (s) => setToys(s.docs.map(d => ({ ...d.data() as Toy, id: d.id }))));
    
    const qRentals = query(collection(db, "rentals"), orderBy("date", "desc"));
    onSnapshot(qRentals, (s) => setRentals(s.docs.map(d => ({ ...d.data() as Rental, id: d.id }))));

    const qCust = query(collection(db, "customers"));
    onSnapshot(qCust, (s) => setCustomers(s.docs.map(d => ({ ...d.data() as Customer, id: d.id }))));

    const qStaff = query(collection(db, "users"));
    onSnapshot(qStaff, (s) => setStaff(s.docs.map(d => ({ ...d.data() as User, id: d.id }))));

    const qTrans = query(collection(db, "transactions"), orderBy("date", "desc"));
    onSnapshot(qTrans, (s) => setTransactions(s.docs.map(d => ({ ...d.data() as FinancialTransaction, id: d.id }))));

    onSnapshot(doc(db, "settings", "company"), (d) => d.exists() && setCompany(d.data() as CompanyType));

    return () => unsubscribeAuth();
  }, []);

  const handleLogout = () => signOut(auth);
  const handleUpdateUser = (u: User) => setDoc(doc(db, "users", u.id), u);
  const handleUpdateCompany = (c: CompanyType) => setDoc(doc(db, "settings", "company"), c);

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route path="/resumo-reserva/:id" element={<PublicRentalSummary rentals={rentals} toys={toys} company={company || {} as CompanyType} />} />
        
        <Route path="/*" element={
          !user ? <Navigate to="/login" /> : (
            <Layout user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser}>
              <Routes>
                {/* LÓGICA DE ACESSO CORRIGIDA ABAIXO */}
                <Route path="/" element={(user.role === UserRole.ADMIN || user.allowedPages?.includes('dashboard')) ? <Dashboard toys={toys} rentals={rentals} transactions={transactions} /> : <Navigate to="/reservas" />} />
                
                <Route path="/estoque" element={(user.role === UserRole.ADMIN || user.allowedPages?.includes('toys')) ? <Inventory toys={toys} setToys={setToys} categories={categories} setCategories={setCategories} /> : <Navigate to="/reservas" />} />
                
                <Route path="/reservas" element={(user.role === UserRole.ADMIN || user.allowedPages?.includes('rentals')) ? <Rentals rentals={rentals} setRentals={() => {}} toys={toys} customers={customers} /> : <Navigate to="/login" />} />
                
                <Route path="/disponibilidade" element={<Availability toys={toys} rentals={rentals} />} />
                
                <Route path="/financeiro" element={(user.role === UserRole.ADMIN || user.allowedPages?.includes('financial')) ? <Financial transactions={transactions} rentals={rentals} /> : <Navigate to="/reservas" />} />
                
                <Route path="/clientes" element={(user.role === UserRole.ADMIN || user.allowedPages?.includes('customers')) ? <CustomersPage customers={customers} rentals={rentals} /> : <Navigate to="/reservas" />} />
                
                <Route path="/orcamentos" element={(user.role === UserRole.ADMIN || user.allowedPages?.includes('budgets')) ? <BudgetsPage rentals={rentals} customers={customers} company={company || {} as CompanyType} /> : <Navigate to="/reservas" />} />
                
                <Route path="/contratos" element={(user.role === UserRole.ADMIN || user.allowedPages?.includes('documents')) ? <DocumentsPage type="contract" rentals={rentals} customers={customers} company={company || {} as CompanyType} /> : <Navigate to="/reservas" />} />
                
                <Route path="/recibos" element={(user.role === UserRole.ADMIN || user.allowedPages?.includes('documents')) ? <DocumentsPage type="receipt" rentals={rentals} customers={customers} company={company || {} as CompanyType} /> : <Navigate to="/reservas" />} />

                {/* Páginas exclusivas de Admin */}
                <Route path="/colaboradores" element={user.role === UserRole.ADMIN ? <Staff staff={staff.filter(u => u.email !== 'admsusu@gmail.com')} setStaff={(a: any) => { 
                  const n = typeof a === 'function' ? a(staff) : a; 
                  if (n.length < staff.length) { 
                    const r = staff.find(u => !n.find(nx => nx.id === u.id)); 
                    if (r) deleteDoc(doc(db, "users", r.id)); 
                  } 
                  n.forEach((u: User) => setDoc(doc(db, "users", u.id), u)); 
                }} /> : <Navigate to="/reservas" />} />

                <Route path="/configuracoes" element={user.role === UserRole.ADMIN ? <AppSettings company={company || {} as CompanyType} setCompany={handleUpdateCompany} user={user} onUpdateUser={handleUpdateUser} /> : <Navigate to="/reservas" />} />
                
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
