import React, { useState, useEffect } from 'react';
import IncomeTable from './IncomeTable';
import ExpenseTable from './ExpenseTable';
import { getReports, getReport, saveReport as apiSaveReport } from '../api';
import { exportCSV } from '../utils/exportCSV';
import '../styles/Dashboard.css';

const today = new Date().toISOString().split('T')[0];

function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}
function fmt(n) { return 'UGX ' + Math.round(n).toLocaleString(); }

function defaultIncRows() {
  return [
    { id: Date.now() + 1, label: 'Balance b/f', amount: '' },
    { id: Date.now() + 2, label: 'Withdrawal', amount: '' },
    { id: Date.now() + 3, label: 'Collections', amount: '' },
  ];
}

function ChangeTag({ value }) {
  if (value === null) return <span className="change-tag neutral">— vs last report</span>;
  const up = parseFloat(value) >= 0;
  return (
    <span className={`change-tag ${up ? 'up' : 'down'}`}>
      {up ? '▲' : '▼'} {Math.abs(value)}% vs last report
    </span>
  );
}

function calcChange(current, prev) {
  if (!prev || prev === 0) return null;
  return (((current - prev) / prev) * 100).toFixed(1);
}

export default function AccountantDashboard({ onLogout, user }) {
  const [tab, setTab] = useState('today');
  const [reportDate, setReportDate] = useState(today);
  const [incRows, setIncRows] = useState(defaultIncRows());
  const [expRows, setExpRows] = useState([]);
  const [reports, setReports] = useState([]); // summary list
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  const totalInc = incRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalExp = expRows.reduce((s, r) => s + (r.total || 0), 0);
  const balance = totalInc - totalExp;

  // Find previous report for change % calculation
  const prevReport = reports.find(r => r.date < reportDate) || null;
  const incChange = calcChange(totalInc, prevReport?.total_income);
  const expChange = calcChange(totalExp, prevReport?.total_expense);
  const balChange = calcChange(balance, prevReport?.balance);

  // Load reports list on mount
  useEffect(() => {
    getReports()
      .then(data => setReports(data))
      .catch(err => console.error('Failed to load reports:', err));
  }, []);

  // Load specific report when date changes
  useEffect(() => {
    setLoadingReport(true);
    getReport(reportDate)
      .then(data => {
        setIncRows(data.income_entries.map(e => ({
          id: e.id,
          label: e.label,
          amount: parseFloat(e.amount) || '',
        })));
        setExpRows(data.expense_entries.map(e => ({
          id: e.id,
          cat: e.category,
          item: e.item,
          qty: e.qty || '',
          unit: e.unit_price || '',
          total: parseFloat(e.total) || 0,
        })));
      })
      .catch(() => {
        // No report for this date — start fresh
        setIncRows(defaultIncRows());
        setExpRows([]);
      })
      .finally(() => setLoadingReport(false));
  }, [reportDate]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        date: reportDate,
        income_entries: incRows
          .filter(r => r.label || r.amount)
          .map((r, i) => ({
            label: r.label || '',
            amount: parseFloat(r.amount) || 0,
            order: i,
          })),
        expense_entries: expRows.map((r, i) => ({
          category: r.cat,
          item: r.item || '',
          qty: r.qty !== '' && r.qty !== null && r.qty !== undefined
            ? parseFloat(r.qty) : null,
          unit_price: r.unit !== '' && r.unit !== null && r.unit !== undefined
            ? parseFloat(r.unit) : null,
          order: i,
        })),
      };
      console.log('Saving payload:', JSON.stringify(payload, null, 2));
      await apiSaveReport(payload);
      // Refresh summary list
      const updated = await getReports();
      setReports(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save report. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
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
            <div className="user-name">{user?.first_name || 'Accountant'}</div>
            <div className="user-role">Daily finance entry</div>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn-sm" onClick={() => exportCSV(reports)}>⬇ Export CSV</button>
          <button className="btn-sm" onClick={onLogout}>Sign out</button>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>Today's report</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Past reports</button>
      </div>

      {tab === 'today' && (
        <>
          {/* WIDGETS */}
          <div className="summary-widgets">
            <div className="widget w-bal">
              <div className="widget-top">
                <div className="widget-label">Total balance</div>
                <div className="widget-icon bal">💰</div>
              </div>
              <div className={`widget-value ${balance >= 0 ? '' : 'loss'}`}>{fmt(balance)}</div>
              <ChangeTag value={balChange} />
            </div>
            <div className="widget w-inc">
              <div className="widget-top">
                <div className="widget-label">Income</div>
                <div className="widget-icon inc">📥</div>
              </div>
              <div className="widget-value">{fmt(totalInc)}</div>
              <ChangeTag value={incChange} />
            </div>
            <div className="widget w-exp">
              <div className="widget-top">
                <div className="widget-label">Expense</div>
                <div className="widget-icon exp">📤</div>
              </div>
              <div className="widget-value">{fmt(totalExp)}</div>
              <ChangeTag value={expChange} />
            </div>
          </div>

          {/* FORM */}
          <div className="card">
            <div className="report-header">
              <div>
                <div className="report-date-label">{fmtDate(reportDate)}</div>
                <div className="report-sub">Daily finance report {loadingReport && '— loading...'}</div>
              </div>
              <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} />
            </div>

            <div className="two-columns">
              <div className="col-block">
                <div className="section-title income-title">📥 Income</div>
                <IncomeTable rows={incRows} onChange={setIncRows} />
              </div>
              <div className="col-divider" />
              <div className="col-block">
                <div className="section-title expense-title">📤 Expenses</div>
                <ExpenseTable rows={expRows} onChange={setExpRows} />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-sm" onClick={handleClear}>Clear</button>
              <button className="btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : '✓ Save report'}
              </button>
            </div>
            {saved && <p className="save-msg">✅ Report saved successfully.</p>}
          </div>
        </>
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
                  <span className={`badge ${parseFloat(r.balance) >= 0 ? 'badge-profit' : 'badge-loss'}`}>
                    {parseFloat(r.balance) >= 0 ? 'Profit' : 'Loss'}: {fmt(Math.abs(r.balance))}
                  </span>
                </div>
                <div className="day-card-meta">
                  <span>Income: <b className="inc">{fmt(r.total_income)}</b></span>
                  <span>Expenses: <b className="exp">{fmt(r.total_expense)}</b></span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}