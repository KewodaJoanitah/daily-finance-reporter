import React, { useState } from 'react';
import '../styles/Dashboard.css';

function fmt(n) {
  return 'UGX ' + Math.round(n).toLocaleString();
}

function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function DirectorDashboard({ onLogout, reports }) {
  const [tab, setTab] = useState('overview');

  const totalInc = reports.reduce((s, r) => s + r.totalInc, 0);
  const totalExp = reports.reduce((s, r) => s + r.totalExp, 0);
  const totalBal = totalInc - totalExp;
  const latest = reports[0] || null;

  return (
    <div className="page">
      <div className="topbar">
        <div className="user-info">
          <div className="avatar director">DR</div>
          <div>
            <div className="user-name">Director</div>
            <div className="user-role">Reports &amp; overview</div>
          </div>
        </div>
        <button className="btn-sm" onClick={onLogout}>Sign out</button>
      </div>

      <div className="metrics-grid">
        <div className="metric">
          <div className="mlabel">Total income</div>
          <div className="mval inc">{fmt(totalInc)}</div>
        </div>
        <div className="metric">
          <div className="mlabel">Total expenses</div>
          <div className="mval exp">{fmt(totalExp)}</div>
        </div>
        <div className="metric">
          <div className="mlabel">Net balance</div>
          <div className={`mval ${totalBal >= 0 ? 'profit' : 'loss'}`}>{fmt(totalBal)}</div>
        </div>
        <div className="metric">
          <div className="mlabel">Reports saved</div>
          <div className="mval">{reports.length}</div>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>
          Latest report
        </button>
        <button className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')}>
          All reports
        </button>
      </div>

      {tab === 'overview' && (
        <div>
          {!latest ? (
            <div className="card"><p className="empty-msg">No reports submitted yet.</p></div>
          ) : (
            <>
              <div className={`profit-banner ${latest.balance >= 0 ? 'pos' : 'neg'}`}>
                <div>
                  <div className="pl">{fmtDate(latest.date)}</div>
                  <div className="pv">{fmt(Math.abs(latest.balance))}</div>
                  <div className="pl">{latest.balance >= 0 ? 'Net profit' : 'Net loss'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="pl">Balance carried forward</div>
                  <div className="pv-sm">{fmt(latest.balance)}</div>
                </div>
              </div>

              <div className="card">
                <h3 className="card-title">Income</h3>
                <table className="report-table">
                  <thead>
                    <tr><th>Item</th><th className="text-right">Amount</th></tr>
                  </thead>
                  <tbody>
                    {latest.incRows.filter(r => r.amount).map(r => (
                      <tr key={r.id}>
                        <td>{r.label}</td>
                        <td className="text-right inc">{fmt(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h3 className="card-title" style={{ marginTop: '1rem' }}>Expenses</h3>
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
                    {latest.expRows.length === 0 ? (
                      <tr><td colSpan={5} className="empty-msg">No expenses</td></tr>
                    ) : latest.expRows.map(r => (
                      <tr key={r.id}>
                        <td><span className="badge badge-exp">{r.cat}</span></td>
                        <td>{r.item || '—'}</td>
                        <td className="text-right">{r.qty || '—'}</td>
                        <td className="text-right">{r.unit ? fmt(r.unit) : '—'}</td>
                        <td className="text-right exp">{fmt(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="total-row" style={{ paddingTop: 10, marginTop: 6 }}>
                  <span>Total expenses</span>
                  <span className="exp">{fmt(latest.totalExp)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'daily' && (
        <div>
          {reports.length === 0 ? (
            <div className="card"><p className="empty-msg">No reports yet.</p></div>
          ) : (
            reports.map(r => (
              <div key={r.date} className="card" style={{ marginBottom: 12 }}>
                <div className="day-card-head" style={{ marginBottom: 10 }}>
                  <span className="day-date">{fmtDate(r.date)}</span>
                  <span className={`badge ${r.balance >= 0 ? 'badge-profit' : 'badge-loss'}`}>
                    {r.balance >= 0 ? 'Profit' : 'Loss'}: {fmt(Math.abs(r.balance))}
                  </span>
                </div>
                <div className="metrics-grid" style={{ marginBottom: 10 }}>
                  <div className="metric" style={{ padding: '8px 10px' }}>
                    <div className="mlabel">Income</div>
                    <div className="mval inc" style={{ fontSize: 15 }}>{fmt(r.totalInc)}</div>
                  </div>
                  <div className="metric" style={{ padding: '8px 10px' }}>
                    <div className="mlabel">Expenses</div>
                    <div className="mval exp" style={{ fontSize: 15 }}>{fmt(r.totalExp)}</div>
                  </div>
                  <div className="metric" style={{ padding: '8px 10px' }}>
                    <div className="mlabel">Balance b/f</div>
                    <div className="mval bal" style={{ fontSize: 15 }}>{fmt(r.balance)}</div>
                  </div>
                </div>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Category</th><th>Item</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Unit</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.expRows.length === 0 ? (
                      <tr><td colSpan={5} className="empty-msg">No expenses</td></tr>
                    ) : r.expRows.map(x => (
                      <tr key={x.id}>
                        <td><span className="badge badge-exp">{x.cat}</span></td>
                        <td>{x.item || '—'}</td>
                        <td className="text-right">{x.qty || '—'}</td>
                        <td className="text-right">{x.unit ? fmt(x.unit) : '—'}</td>
                        <td className="text-right exp">{fmt(x.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}