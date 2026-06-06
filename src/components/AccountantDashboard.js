import React, { useState, useEffect } from 'react';
import IncomeTable from './IncomeTable';
import ExpenseTable from './ExpenseTable';
import { exportCSV } from '../utils/exportCSV';
import '../styles/Dashboard.css';

const today = new Date().toISOString().split('T')[0];

function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmt(n) {
  return 'UGX ' + Math.round(n).toLocaleString();
}

function defaultIncRows() {
  return [
    { id: Date.now() + 1, label: 'Balance b/f', amount: '' },
    { id: Date.now() + 2, label: 'Withdrawal', amount: '' },
    { id: Date.now() + 3, label: 'Collections', amount: '' },
  ];
}

export default function AccountantDashboard({ onLogout, reports, onSave }) {
  const [tab, setTab] = useState('today');
  const [reportDate, setReportDate] = useState(today);
  const [incRows, setIncRows] = useState(defaultIncRows());
  const [expRows, setExpRows] = useState([]);
  const [saved, setSaved] = useState(false);

  const totalInc = incRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalExp = expRows.reduce((s, r) => s + (r.total || 0), 0);
  const balance = totalInc - totalExp;

  // Load existing report when date changes
  useEffect(() => {
    const existing = reports.find(r => r.date === reportDate);
    if (existing) {
      setIncRows(existing.incRows);
      setExpRows(existing.expRows);
    } else {
      setIncRows(defaultIncRows());
      setExpRows([]);
    }
  }, [reportDate, reports]);

  function handleSave() {
    onSave({
      date: reportDate,
      incRows,
      expRows,
      totalInc,
      totalExp,
      balance,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleClear() {
    if (window.confirm('Clear all entries for this report?')) {
      setIncRows(defaultIncRows());
      setExpRows([]);
    }
  }

  function loadReport(date) {
    setReportDate(date);
    setTab('today');
  }

  return (
    <div className="page">
      <div className="topbar">
        <div className="user-info">
          <div className="avatar">AC</div>
          <div>
            <div className="user-name">Accountant</div>
            <div className="user-role">Daily finance entry</div>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn-sm" onClick={() => exportCSV(reports)}>⬇ Export CSV</button>
          <button className="btn-sm" onClick={onLogout}>Sign out</button>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>
          Today's report
        </button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
          Past reports
        </button>
      </div>

      {tab === 'today' && (
        <div className="card">
          <div className="report-header">
            <div>
              <div className="report-date-label">{fmtDate(reportDate)}</div>
              <div className="report-sub">Daily finance report</div>
            </div>
            <input
              type="date"
              value={reportDate}
              onChange={e => setReportDate(e.target.value)}
            />
          </div>

          <p className="voice-hint">
            🎤 Tap the microphone button next to any amount field to speak the value
          </p>

          <div className="section-title">Income</div>
          <IncomeTable rows={incRows} onChange={setIncRows} />

          <div className="section-title" style={{ marginTop: '1.4rem' }}>Expenses</div>
          <ExpenseTable rows={expRows} onChange={setExpRows} />

          <div className="summary-block">
            <div className="summary-row">
              <span>Total income</span>
              <span className="inc">{fmt(totalInc)}</span>
            </div>
            <div className="summary-row">
              <span>Total expenses</span>
              <span className="exp">{fmt(totalExp)}</span>
            </div>
            <div className="summary-row total-row">
              <span>Balance carried forward</span>
              <span style={{ color: balance >= 0 ? '#185FA5' : '#A32D2D' }}>{fmt(balance)}</span>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-sm" onClick={handleClear}>Clear</button>
            <button className="btn" onClick={handleSave}>✓ Save report</button>
          </div>
          {saved && <p className="save-msg">✅ Report saved successfully.</p>}
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <h3 className="card-title">Saved reports</h3>
          {reports.length === 0 ? (
            <p className="empty-msg">No saved reports yet.</p>
          ) : (
            reports.map(r => (
              <div key={r.date} className="day-card" onClick={() => loadReport(r.date)}>
                <div className="day-card-head">
                  <span className="day-date">{fmtDate(r.date)}</span>
                  <span className={`badge ${r.balance >= 0 ? 'badge-profit' : 'badge-loss'}`}>
                    {r.balance >= 0 ? 'Profit' : 'Loss'}: {fmt(Math.abs(r.balance))}
                  </span>
                </div>
                <div className="day-card-meta">
                  <span>Income: <b className="inc">{fmt(r.totalInc)}</b></span>
                  <span>Expenses: <b className="exp">{fmt(r.totalExp)}</b></span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}