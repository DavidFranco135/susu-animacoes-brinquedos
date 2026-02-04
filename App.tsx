import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, onSnapshot, doc, setDoc, query, orderBy, deleteDoc } from "firebase/firestore";

import { UserProvider, useUser } from './contexts/UserContext';
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
import PublicCatalog from './PublicCatalog';
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

const AppContent: React.FC = () => {
  const { user, loading } = useUser();
  const [staff, setStaff] = useState<User[]>([]);
  const [toys, setToys] = useState<Toy[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [company, setCompany] = useState<CompanyType | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubStaff = onSnapshot(collection(db, "users"), (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as User[]);
    });

    const unsubToys = onSnapshot(collection(db, "toys"), (snapshot) => {
      setToys(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Toy[]);
    });

    const unsubRentals = onSnapshot(query(collection(db, "rentals"), orderBy("date", "desc")), (snapshot) => {
      setRentals(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Rental[]);
    });

    const unsubCompany = onSnapshot(doc(db, "settings", "company"), (doc) => {
      if (doc.exists()) setCompany(doc.data() as CompanyType);
    });

    return () => {
      unsubStaff(); unsubToys(); unsubRentals(); unsubCompany();
    };
  }, [user]);

  const handleUpdateCompany = async (newCompany: CompanyType) => {
    await setDoc(doc(db, "settings", "company"), newCompany);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    await setDoc(doc(db, "users", updatedUser.id), updatedUser);
  };

  const hasAccess = (pageId: string) => {
    if (user?.role === UserRole.ADMIN) return true;
    return user?.allowedPages?.includes(pageId);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  if (!user) return <Navigate to="/login" />;

  return (
    <Router>
      <Layout user={user} onLogout={() => signOut(auth)}>
        <Routes>
          <Route index element={<Dashboard rentals={rentals} toys={toys} customers={customers} staff={staff} />} />
          <Route path="/reservas" element={<Rentals rentals={rentals} setRentals={setRentals} toys={toys} customers={customers} />} />
          <Route path="/inventario" element={hasAccess('toys') ? <Inventory toys={toys} setToys={setToys} categories={categories} setCategories={setCategories} /> : <Navigate to="/" />} />
          
          {/* CORREÇÃO: setStaff agora é uma função simples, sem setDoc/forEach escondido */}
          <Route path="/colaboradores" element={
            user.role === UserRole.ADMIN ? (
              <Staff staff={staff} setStaff={setStaff} />
            ) : <Navigate to="/" />
          } />

          <Route path="/configuracoes" element={user.role === UserRole.ADMIN ? <AppSettings company={company || {} as CompanyType} setCompany={handleUpdateCompany} user={user} onUpdateUser={handleUpdateUser} /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

const App: React.FC = () => (
  <UserProvider>
    <AppContent />
  </UserProvider>
);

export default App;
