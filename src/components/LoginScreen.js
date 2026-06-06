import React, { useState } from 'react';
import '../styles/App.css';

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const ok = onLogin(username, password);
    if (!ok) setError('Invalid username or password.');
    else setError('');
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-icon">🏫</div>
        <h1 className="login-title">Daily Finance Reporter</h1>
        <p className="login-sub">Sign in to continue</p>
        <form onSubmit={handleSubmit}>
          <div className="fg">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className="fg">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="login-err">{error}</p>}
          <button type="submit" className="btn btn-full">Sign in</button>
        </form>
        <p className="login-hint">
          Demo: <b>accountant</b> / acc123 &nbsp;|&nbsp; <b>director</b> / dir123
        </p>
      </div>
    </div>
  );
}