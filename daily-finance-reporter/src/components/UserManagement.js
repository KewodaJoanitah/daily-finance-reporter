import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deactivateUser } from '../api';

const ROLES = ['accountant', 'director'];

const ROLE_LABELS = {
  accountant: '🧾 Accountant',
  director: '📋 Director',
};

function Badge({ active }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      background: active ? '#dcfce7' : '#fee2e2',
      color: active ? '#15803d' : '#b91c1c',
    }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '', last_name: '', role: 'accountant' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // user id of action in progress

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    setError('');
    getUsers()
      .then(setUsers)
      .catch(err => setError(err?.response?.data?.error || 'Failed to load users.'))
      .finally(() => setLoading(false));
  }

  function handleFormChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (formError) setFormError('');
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError('Username, email, and password are all required.');
      return;
    }
    setFormLoading(true);
    setFormError('');
    try {
      const newUser = await createUser(form);
      setUsers(prev => [...prev, newUser]);
      setForm({ username: '', email: '', password: '', first_name: '', last_name: '', role: 'accountant' });
      setShowForm(false);
    } catch (err) {
      const data = err?.response?.data || {};
      const msg = data.error || Object.values(data).flat().join(' ') || 'Failed to create user.';
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleRoleChange(user, newRole) {
    setActionLoading(user.id);
    try {
      const updated = await updateUser(user.id, { role: newRole });
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to update role.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleActive(user) {
    if (user.id === currentUser?.id) return; // can't deactivate yourself
    setActionLoading(user.id);
    try {
      if (user.is_active) {
        // Deactivate via DELETE (soft delete)
        await deactivateUser(user.id);
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: false } : u));
      } else {
        // Reactivate via PATCH
        const updated = await updateUser(user.id, { is_active: true });
        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to update user status.');
    } finally {
      setActionLoading(null);
    }
  }

  const activeCount = users.filter(u => u.is_active).length;
  const isSelf = (u) => u.id === currentUser?.id;

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
            {activeCount} active · {users.length} total
          </div>
        </div>
        <button
          className="btn-sm"
          style={{ background: '#185FA5', color: '#fff', border: 'none' }}
          onClick={() => { setShowForm(s => !s); setFormError(''); }}
        >
          {showForm ? '✕ Cancel' : '+ Add user'}
        </button>
      </div>

      {/* Add user form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">New user account</div>
          {formError && <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{formError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>First name</label>
              <input name="first_name" value={form.first_name} onChange={handleFormChange} placeholder="Jane" className="form-input-plain" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Last name</label>
              <input name="last_name" value={form.last_name} onChange={handleFormChange} placeholder="Doe" className="form-input-plain" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Username <span style={{color:'#b91c1c'}}>*</span></label>
              <input name="username" value={form.username} onChange={handleFormChange} placeholder="janedoe" className="form-input-plain" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Email <span style={{color:'#b91c1c'}}>*</span></label>
              <input name="email" value={form.email} onChange={handleFormChange} placeholder="jane@school.ug" type="email" className="form-input-plain" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Password <span style={{color:'#b91c1c'}}>*</span></label>
              <input name="password" value={form.password} onChange={handleFormChange} placeholder="Min. 6 characters" type="password" className="form-input-plain" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Role <span style={{color:'#b91c1c'}}>*</span></label>
              <select name="role" value={form.role} onChange={handleFormChange} className="form-input-plain">
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleCreate}
              disabled={formLoading}
              className="btn-sm"
              style={{ background: '#0F6E56', color: '#fff', border: 'none', opacity: formLoading ? 0.6 : 1 }}
            >
              {formLoading ? 'Creating…' : '✓ Create account'}
            </button>
          </div>
        </div>
      )}

      {/* User list */}
      {loading ? (
        <div className="card"><p className="empty-msg">Loading users…</p></div>
      ) : error ? (
        <div className="card"><p className="empty-msg" style={{ color: '#b91c1c' }}>{error}</p></div>
      ) : users.length === 0 ? (
        <div className="card"><p className="empty-msg">No users yet. Add one above.</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="report-table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.55 }}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : '—'}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{u.email}</div>
                    {u.is_staff && <span style={{ fontSize: 10, color: '#185FA5', fontWeight: 700 }}>⭐ Admin</span>}
                    {isSelf(u) && <span style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, marginLeft: 4 }}>You</span>}
                  </td>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{u.username}</td>
                  <td>
                    {isSelf(u) ? (
                      <span style={{ fontSize: 12 }}>{ROLE_LABELS[u.role]}</span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u, e.target.value)}
                        disabled={actionLoading === u.id}
                        style={{
                          background: '#f8fafc',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '4px 8px',
                          fontSize: 12,
                          fontFamily: "'Inter', sans-serif",
                          cursor: 'pointer',
                        }}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    )}
                  </td>
                  <td><Badge active={u.is_active} /></td>
                  <td className="text-right">
                    {!isSelf(u) && (
                      <button
                        onClick={() => handleToggleActive(u)}
                        disabled={actionLoading === u.id}
                        style={{
                          background: u.is_active ? '#fee2e2' : '#dcfce7',
                          color: u.is_active ? '#b91c1c' : '#15803d',
                          border: 'none',
                          borderRadius: 8,
                          padding: '5px 12px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: actionLoading === u.id ? 'default' : 'pointer',
                          fontFamily: "'Inter', sans-serif",
                          opacity: actionLoading === u.id ? 0.5 : 1,
                        }}
                      >
                        {actionLoading === u.id ? '…' : u.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11.5, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
        Deactivated accounts cannot log in but their report history is preserved.
        Reactivate anytime to restore access.
      </div>
    </div>
  );
}
