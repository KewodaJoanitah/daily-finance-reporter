import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import AccountantDashboard from './components/AccountantDashboard';
import DirectorDashboard from './components/DirectorDashboard';
import { getMe, logout as apiLogout } from './api';
import './styles/App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      getMe()
        .then(u => setUser(u))
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function handleLogin(userObj) { setUser(userObj); }
  async function handleLogout() { await apiLogout(); setUser(null); }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', background:'#0a1e3c', color:'#fff', fontSize:16 }}>
      Loading...
    </div>
  );

  if (!user) return <LoginScreen onLogin={handleLogin} />;
  if (user.role === 'accountant') return <AccountantDashboard onLogout={handleLogout} user={user} />;
  if (user.role === 'director') return <DirectorDashboard onLogout={handleLogout} user={user} />;
  return null;
}