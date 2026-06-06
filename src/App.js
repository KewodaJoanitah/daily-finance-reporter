import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import AccountantDashboard from './components/AccountantDashboard';
import DirectorDashboard from './components/DirectorDashboard';
import './styles/App.css';

const USERS = {
  accountant: { pass: 'acc123', role: 'accountant' },
  director: { pass: 'dir123', role: 'director' },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sfr_reports') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('sfr_reports', JSON.stringify(reports));
  }, [reports]);

  function handleLogin(username, password) {
    const u = USERS[username.toLowerCase().trim()];
    if (u && u.pass === password) {
      setUser({ username: username.toLowerCase().trim(), role: u.role });
      return true;
    }
    return false;
  }

  function handleLogout() {
    setUser(null);
  }

  function saveReport(report) {
    setReports(prev => {
      const idx = prev.findIndex(r => r.date === report.date);
      const updated = idx >= 0
        ? prev.map((r, i) => (i === idx ? report : r))
        : [...prev, report];
      return updated.sort((a, b) => b.date.localeCompare(a.date));
    });
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />;
  if (user.role === 'accountant')
    return <AccountantDashboard onLogout={handleLogout} reports={reports} onSave={saveReport} />;
  if (user.role === 'director')
    return <DirectorDashboard onLogout={handleLogout} reports={reports} />;
  return null;
}