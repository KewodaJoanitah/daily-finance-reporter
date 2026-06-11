import React, { useState, useEffect } from 'react';
import { getReports, getReport, getSummary } from '../api';
import '../styles/Dashboard.css';

function fmt(n) { return 'UGX ' + Math.round(n).toLocaleString(); }
function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function DirectorDashboard({ onLogout, user }) {
  const [tab, setTab] = useState('overview');
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState(null);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getReports(), getSummary()])
      .then(([reps, sum]) => {
        setReports(reps);
        setSummary(sum);
        // Load full latest report
        if (reps.length > 0) {
          return getReport(reps[0].date).then(full => setLatest(full));
        }
      })
      .catch(err => console.error('Director load error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page" style={{ color: '#fff', textAlign: 'center', paddingTop: '4rem' }}>
      Loading reports...
    </div>
  );

  return (
    <div className="page">
      <div className="topbar">
        <div className="user-info">
          <div className="avatar director">DR</div>
          <div>
            <div className="user-name">{user?.first_name || 'Director'}</div>
            <div className="user-role">Reports &amp; overview</div>
          </div>
        </div>
        <button className="btn-sm" onClick={onLogout}>Sign out</button>
      </div>

      {/* SUMMARY METRICS */}
      {summary && (
        <div className="metrics-grid" style={{ marginBottom: '1.4rem' }}>
          <div className="metric"><div className="mlabel">Total income</div><div className="mval inc">{fmt(summary.total_income)}</div></div>
          <div className="metric"><div className="mlabel">Total expenses</div><div className="mval exp">{fmt(summary.total_expense)}</div></div>
          <div className="metric"><div className="mlabel">Net balance</div><div className={`mval ${parseFloat(summary.total_balance) >= 0 ? 'profit' : 'loss'}`}>{fmt(summary.total_balance)}</div></div>
          <div className="metric"><div className="mlabel">Reports saved</div><div className="mval">{summary.report_count}</div></div>
        </div>
      )}

      <div className="tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Latest report</button>
        <button className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')}>All reports</button>
      </div>

      {/* LATEST REPORT */}
      {tab === 'overview' && (
        <div>
          {!latest ? (
            <div className="card"><p className="empty-msg">No reports submitted yet.</p></div>
          ) : (
            <>
              <div className={`profit-banner ${parseFloat(latest.balance) >= 0 ? 'pos' : 'neg'}`}>
                <div>
                  <div className="pl">{fmtDate(latest.date)}</div>
                  <div className="pv">{fmt(Math.abs(latest.balance))}</div>
                  <div className="pl">{parseFloat(latest.balance) >= 0 ? 'Net profit' : 'Net loss'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="pl">Balance carried forward</div>
                  <div className="pv-sm">{fmt(latest.balance)}</div>
                </div>
              </div>

              <div className="card">
                <h3 className="card-title">Income</h3>
                <table className="report-table" style={{ marginBottom: 16 }}>
                  <thead><tr><th>Item</th><th className="text-right">Amount</th></tr></thead>
                  <tbody>
                    {latest.income_entries.filter(r => r.amount > 0).map(r => (
                      <tr key={r.id}>
                        <td>{r.label}</td>
                        <td className="text-right inc" style={{ fontWeight: 600 }}>{fmt(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h3 className="card-title">Expenses</h3>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Category</th><th>Item</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Unit price</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latest.expense_entries.length === 0 ? (
                      <tr><td colSpan={5} className="empty-msg">No expenses</td></tr>
                    ) : latest.expense_entries.map(r => (
                      <tr key={r.id}>
                        <td><span className="badge badge-exp">{r.category}</span></td>
                        <td>{r.item || '—'}</td>
                        <td className="text-right">{r.qty || '—'}</td>
                        <td className="text-right">{r.unit_price ? fmt(r.unit_price) : '—'}</td>
                        <td className="text-right exp" style={{ fontWeight: 600 }}>{fmt(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="total-row">
                  <span>Total expenses</span>
                  <span className="exp">{fmt(latest.total_expense)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ALL REPORTS */}
      {tab === 'daily' && (
        <div>
          {reports.length === 0 ? (
            <div className="card"><p className="empty-msg">No reports yet.</p></div>
          ) : (
            reports.map(r => (
              <div key={r.date} className="card" style={{ marginBottom: 12 }}>
                <div className="day-card-head" style={{ marginBottom: 10 }}>
                  <span className="day-date">{fmtDate(r.date)}</span>
                  <span className={`badge ${parseFloat(r.balance) >= 0 ? 'badge-profit' : 'badge-loss'}`}>
                    {parseFloat(r.balance) >= 0 ? 'Profit' : 'Loss'}: {fmt(Math.abs(r.balance))}
                  </span>
                </div>
                <div className="metrics-grid">
                  <div className="metric" style={{ padding: '8px 12px' }}>
                    <div className="mlabel">Income</div>
                    <div className="mval inc" style={{ fontSize: 15 }}>{fmt(r.total_income)}</div>
                  </div>
                  <div className="metric" style={{ padding: '8px 12px' }}>
                    <div className="mlabel">Expenses</div>
                    <div className="mval exp" style={{ fontSize: 15 }}>{fmt(r.total_expense)}</div>
                  </div>
                  <div className="metric" style={{ padding: '8px 12px' }}>
                    <div className="mlabel">Balance</div>
                    <div className="mval bal" style={{ fontSize: 15 }}>{fmt(r.balance)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}