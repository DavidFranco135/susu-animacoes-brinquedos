import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initializeApp } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import { getFirestore, collection, onSnapshot, doc, query, orderBy } from "firebase/firestore";

import { UserProvider, useUser } from './contexts/UserContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Staff from './pages/Staff';
import { User, UserRole, Toy, Rental, CompanySettings as CompanyType } from './types';
import { Loader2 } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyBUvwY-e7h0KZyFJv7n0ignpzlMUGJIurU",
  authDomain: "niklaus-b2b.firebaseapp.com",
  projectId: "niklaus-b2b",
  storageBucket: "niklaus-b2b.firebasestorage.app",
  messagingSenderId: "936430517671",
  appId: "1:936430517671:web:6a0f1b86a39621d74c4a82"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const AppContent: React.FC = () => {
  const { user, loading } = useUser();
  const [staff, setStaff] = useState<User[]>([]);
  const [toys, setToys] = useState<Toy[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);

  useEffect(() => {
    if (!user) return;

    // Monitora a coleção de usuários
    const unsubStaff = onSnapshot(collection(db, "users"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as User[];
      setStaff(data);
    });

    // Monitora a coleção de brinquedos
    const unsubToys = onSnapshot(collection(db, "toys"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Toy[];
      setToys(data);
    });

    return () => { unsubStaff(); unsubToys(); };
  }, [user]);

  // Tela de carregamento para evitar tela branca no início
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  return (
    <Router>
      <Layout user={user} onLogout={() => signOut(auth)}>
        <Routes>
          <Route index element={<Dashboard rentals={rentals} toys={toys} customers={[]} staff={staff} />} />
          <Route path="/inventario" element={<Inventory toys={toys} setToys={() => {}} categories={[]} setCategories={() => {}} />} />
          
          {/* ROTA SIMPLIFICADA PARA EVITAR ERROS */}
          <Route path="/colaboradores" element={
            user.role === UserRole.ADMIN ? (
              <Staff staff={staff} setStaff={setStaff} />
            ) : <Navigate to="/" />
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}
