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

import {
  Customer,
  Toy,
  Rental,
  User,
  UserRole,
  FinancialTransaction,
  CompanySettings as CompanyType
} from './types';

import { User as UserIcon, Loader2 } from 'lucide-react';

/* 🔥 Firebase */
const firebaseConfig = {
  apiKey: "AIzaSyBUvwY-e7h0KZyFJv7n0ignpzlMUGJIurU",
  authDomain: "niklaus-b2b.firebaseapp.com",
  projectId: "niklaus-b2b",
  storageBucket: "niklaus-b2b.firebasestorage.app",
  messagingSenderId: "936430517671",
  appId: "1:936430517671:web:6a0f1b86a39621d74c4a82"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/* 🔐 LOGIN */
const Login: React.FC = () => {
  const [email, setEmail] = useState('admsusu@gmail.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if ((err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') && email === 'admsusu@gmail.com') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        setError('E-mail ou senha inválidos.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md space-y-6">
        <div className="text-center">
          <UserIcon className="mx-auto mb-4 text-blue-500" size={48} />
          <h1 className="font-black text-xl">Painel Administrativo</h1>
        </div>

        {error && <div className="text-red-500 text-sm text-center">{error}</div>}

        <input className="w-full p-4 rounded-xl bg-slate-100" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" className="w-full p-4 rounded-xl bg-slate-100" value={password} onChange={e => setPassword(e.target.value)} />

        <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">
          {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Entrar'}
        </button>
      </form>
    </div>
  );
};

/* 🧠 APP */
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  const [toys, setToys] = useState<Toy[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [staff, setStaff] = useState<User[]>([]);

  const [company, setCompany] = useState<CompanyType>({
    name: 'SUSU Animações',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    contractTerms: ''
  });

  /* 🔐 AUTH */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setInitializing(false);
        return;
      }

      const ref = doc(db, "users", firebaseUser.uid);

      onSnapshot(ref, snap => {
        let data: User;

        if (snap.exists()) {
          data = snap.data() as User;
        } else {
          data = {
            id: firebaseUser.uid,
            name: firebaseUser.email?.split('@')[0] || 'Admin',
            email: firebaseUser.email || '',
            role: firebaseUser.email === 'admsusu@gmail.com'
              ? UserRole.ADMIN
              : UserRole.EMPLOYEE
          };
          setDoc(ref, data);
        }

        setUser(data);
        localStorage.setItem('susu_user', JSON.stringify(data));
        setInitializing(false);
      });
    });

    return () => unsub();
  }, []);

  /* 👥 STAFF */
  useEffect(() => {
    if (!user || user.role !== UserRole.ADMIN) return;

    const q = query(collection(db, "users"), orderBy("name"));
    const unsub = onSnapshot(q, snap => {
      setStaff(snap.docs.map(d => ({ ...d.data(), id: d.id } as User)));
    });

    return () => unsub();
  }, [user]);

  if (initializing) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <Router>
      {!user ? <Login /> : (
        <Layout user={user} onLogout={() => signOut(auth)} onUpdateUser={() => {}}>
          <Routes>
            <Route path="/" element={<Dashboard rentals={rentals} toysCount={toys.length} transactions={transactions} />} />
            <Route path="/colaboradores" element={<Staff staff={staff} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      )}
    </Router>
  );
};

export default App;
