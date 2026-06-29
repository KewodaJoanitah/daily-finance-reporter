import React, { useState, useEffect } from 'react';
import IncomeTable from './IncomeTable';
import ExpenseTable from './ExpenseTable';
import Analytics from './Analytics';
import ReportsTable from './ReportsTable';
import { getReports, getReport, saveReport as apiSaveReport } from '../api';
import { createPortal } from 'react-dom';
import Calculator from './Calculator';
import MessagesPanel from './MessagesPanel';
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

function calcChange(current, prev) {
  if (!prev || parseFloat(prev) === 0) return null;
  const pct = ((current - parseFloat(prev)) / Math.abs(parseFloat(prev))) * 100;
  if (!isFinite(pct)) return null;
  return pct.toFixed(1);
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

// ── Modal component ──
function Modal({ message, onClose, onEdit }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-icon">⚠️</div>
        <h3 className="modal-title">Report already exists</h3>
        <p className="modal-msg">{message}</p>
        <div className="modal-actions">
          <button className="btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={onEdit}>Edit existing report</button>
        </div>
      </div>
    </div>
  );
}


// ── Helpers ──
function getWeekKeyAcc(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay() + 1);
  return start.toISOString().split('T')[0];
}
function getMonthKeyAcc(dateStr) { return dateStr.substring(0, 7); }
function getYearKeyAcc(dateStr) { return dateStr.substring(0, 4); }

function groupReportsAcc(reports, keyFn) {
  const groups = {};
  reports.forEach(r => {
    const key = keyFn(r.date);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return groups;
}

function sumGroupAcc(reps) {
  const inc = reps.reduce((s, r) => s + parseFloat(r.total_income), 0);
  const exp = reps.reduce((s, r) => s + parseFloat(r.total_expense), 0);
  return { inc, exp, bal: inc - exp };
}

function AccPeriodCard({ title, sub, inc, exp, bal, onClick, tag }) {
  const p = bal;
  return (
    <div className={`day-card${onClick ? ' clickable-report' : ''}`} onClick={onClick} style={{ marginBottom: 10 }}>
      <div className="day-card-head">
        <div>
          <div className="day-date">{title}</div>
          {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {tag && <span className="edit-tag">{tag}</span>}
          <span className={`badge ${p >= 0 ? 'badge-profit' : 'badge-loss'}`}>
            {p >= 0 ? 'Profit' : 'Loss'}: {fmt(Math.abs(p))}
          </span>
        </div>
      </div>
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginTop: 10 }}>
        <div className="metric" style={{ padding: '8px 12px' }}>
          <div className="mlabel">Income</div>
          <div className="mval inc" style={{ fontSize: 15 }}>{fmt(inc)}</div>
        </div>
        <div className="metric" style={{ padding: '8px 12px' }}>
          <div className="mlabel">Expenses</div>
          <div className="mval exp" style={{ fontSize: 15 }}>{fmt(exp)}</div>
        </div>
        <div className="metric" style={{ padding: '8px 12px' }}>
          <div className="mlabel">Balance</div>
          <div className={`mval ${p >= 0 ? 'bal' : 'loss'}`} style={{ fontSize: 15 }}>{fmt(bal)}</div>
        </div>
        <div className="metric" style={{ padding: '8px 12px', background: p >= 0 ? '#E1F5EE' : '#FAECE7' }}>
          <div className="mlabel">{p >= 0 ? 'Profit' : 'Loss'}</div>
          <div className={`mval ${p >= 0 ? 'profit' : 'loss'}`} style={{ fontSize: 15 }}>
            {p >= 0 ? '📈' : '📉'} {fmt(Math.abs(p))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountantReportsView({ reports, onLoadReport }) {
  const [period, setPeriod] = useState('daily');
  const [searchDate, setSearchDate] = useState('');

  if (reports.length === 0) {
    return <div className="card"><p className="empty-msg">No saved reports yet.</p></div>;
  }

  const filteredReports = searchDate
    ? reports.filter(r => r.date === searchDate)
    : reports;

  const DailyView = () => (
    <div>
      <div className="period-section-title">📅 Daily reports — click today to edit, past reports to view</div>
      {filteredReports.map(r => (
        <AccPeriodCard
          key={r.date}
          title={fmtDate(r.date)}
          inc={parseFloat(r.total_income)}
          exp={parseFloat(r.total_expense)}
          bal={parseFloat(r.balance)}
          onClick={() => onLoadReport(r.date)}
          tag={r.date === today ? '✏️ Edit today' : '👁 View details'}
        />
      ))}
    </div>
  );

  const WeeklyView = () => {
    const groups = groupReportsAcc(filteredReports, getWeekKeyAcc);
    const weeks = Object.keys(groups).sort().reverse();
    return (
      <div>
        <div className="period-section-title">📆 Weekly summaries</div>
        {weeks.map(weekStart => {
          const reps = groups[weekStart];
          const { inc, exp, bal } = sumGroupAcc(reps);
          const weekEnd = new Date(weekStart + 'T12:00:00');
          weekEnd.setDate(weekEnd.getDate() + 6);
          const label = `Week of ${new Date(weekStart + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
          return (
            <div key={weekStart}>
              <AccPeriodCard
                title={label}
                sub={`${reps.length} report${reps.length > 1 ? 's' : ''} this week`}
                inc={inc} exp={exp} bal={bal}
              />
              <div style={{ marginLeft: 16, marginBottom: 8 }}>
                  {reps.map(r => (
                    <div key={r.date} className="sub-report-row" onClick={() => onLoadReport(r.date)}>
                      <span className="sub-report-date">{new Date(r.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className="sub-report-inc">Inc: {fmt(r.total_income)}</span>
                      <span className="sub-report-exp">Exp: {fmt(r.total_expense)}</span>
                      <span className={`badge ${parseFloat(r.balance) >= 0 ? 'badge-profit' : 'badge-loss'}`} style={{ fontSize: 10 }}>
                        {fmt(r.balance)}
                      </span>
                      <span className="edit-tag" style={{ fontSize: 10 }}>{r.date === today ? "✏️ Edit" : "👁 View"}</span>
                    </div>
                  ))}
                </div>
            </div>
          );
        })}
      </div>
    );
  };

  const MonthlyView = () => {
    const groups = groupReportsAcc(filteredReports, getMonthKeyAcc);
    const months = Object.keys(groups).sort().reverse();
    return (
      <div>
        <div className="period-section-title">🗓️ Monthly summaries</div>
        {months.map(monthKey => {
          const reps = groups[monthKey];
          const { inc, exp, bal } = sumGroupAcc(reps);
          const label = new Date(monthKey + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
          return (
            <div key={monthKey}>
              <AccPeriodCard
                title={label}
                sub={`${reps.length} report${reps.length > 1 ? 's' : ''} this month`}
                inc={inc} exp={exp} bal={bal}
              />
              <div style={{ marginLeft: 16, marginBottom: 8 }}>
                  {reps.map(r => (
                    <div key={r.date} className="sub-report-row" onClick={() => onLoadReport(r.date)}>
                      <span className="sub-report-date">{new Date(r.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className="sub-report-inc">Inc: {fmt(r.total_income)}</span>
                      <span className="sub-report-exp">Exp: {fmt(r.total_expense)}</span>
                      <span className={`badge ${parseFloat(r.balance) >= 0 ? 'badge-profit' : 'badge-loss'}`} style={{ fontSize: 10 }}>
                        {fmt(r.balance)}
                      </span>
                      <span className="edit-tag" style={{ fontSize: 10 }}>{r.date === today ? "✏️ Edit" : "👁 View"}</span>
                    </div>
                  ))}
                </div>
            </div>
          );
        })}
      </div>
    );
  };

  const YearlyView = () => {
    const groups = groupReportsAcc(filteredReports, getYearKeyAcc);
    const years = Object.keys(groups).sort().reverse();
    return (
      <div>
        <div className="period-section-title">📊 Yearly summaries</div>
        {years.map(year => {
          const reps = groups[year];
          const { inc, exp, bal } = sumGroupAcc(reps);
          const monthGroups = groupReportsAcc(reps, getMonthKeyAcc);
          return (
            <div key={year}>
              <AccPeriodCard
                title={`Year ${year}`}
                sub={`${reps.length} report${reps.length > 1 ? 's' : ''} across ${Object.keys(monthGroups).length} month${Object.keys(monthGroups).length > 1 ? 's' : ''}`}
                inc={inc} exp={exp} bal={bal}
              />
              <div style={{ marginLeft: 16, marginBottom: 8 }}>
                  {Object.keys(monthGroups).sort().reverse().map(mk => {
                    const mreps = monthGroups[mk];
                    const ms = sumGroupAcc(mreps);
                    return (
                      <div key={mk} className="sub-report-row" style={{ cursor: 'default' }}>
                        <span className="sub-report-date">{new Date(mk + '-01').toLocaleDateString('en-GB', { month: 'long' })}</span>
                        <span className="sub-report-inc">Inc: {fmt(ms.inc)}</span>
                        <span className="sub-report-exp">Exp: {fmt(ms.exp)}</span>
                        <span className={`badge ${ms.bal >= 0 ? 'badge-profit' : 'badge-loss'}`} style={{ fontSize: 10 }}>
                          {fmt(ms.bal)}
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{mreps.length} days</span>
                      </div>
                    );
                  })}
                </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="period-tabs">
        {[
          { key: 'daily', label: '📅 Daily' },
          { key: 'weekly', label: '📆 Weekly' },
          { key: 'monthly', label: '🗓️ Monthly' },
          { key: 'yearly', label: '📊 Yearly' },
        ].map(p => (
          <button
            key={p.key}
            className={period === p.key ? 'active' : ''}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="date-search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="date"
          value={searchDate}
          onChange={e => setSearchDate(e.target.value)}
        />
        {searchDate && (
          <button className="date-search-clear" onClick={() => setSearchDate('')}>✕ Clear</button>
        )}
      </div>

      {filteredReports.length === 0 ? (
        <div className="card"><p className="empty-msg">No report found for {fmtDate(searchDate)}.</p></div>
      ) : (
        <>
          {period === 'daily' && <DailyView />}
          {period === 'weekly' && <WeeklyView />}
          {period === 'monthly' && <MonthlyView />}
          {period === 'yearly' && <YearlyView />}
        </>
      )}
    </div>
  );
}


// ── Read-only Report Detail Modal (for accountant viewing past reports) ──
function ReportDetailModal({ date, onClose }) {
  const [report, setReport] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getReport(date)
      .then(data => setReport(data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [date]);

  function fmt(n) { return 'UGX ' + Math.round(n).toLocaleString(); }
  function fmtDate(d) {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  const profit = report ? parseFloat(report.balance) : 0;

  const modalEl = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={e => e.stopPropagation()}>
        <div className="detail-modal-header">
          <div>
            <div className="detail-modal-date">{fmtDate(date)}</div>
            <div className="report-sub">Full report details — read only</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <p className="empty-msg" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</p>
        ) : !report ? (
          <p className="empty-msg">Could not load report.</p>
        ) : (
          <>
            <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '1.2rem' }}>
              <div className="metric"><div className="mlabel">Income</div><div className="mval inc">{fmt(report.total_income)}</div></div>
              <div className="metric"><div className="mlabel">Expenses</div><div className="mval exp">{fmt(report.total_expense)}</div></div>
              <div className="metric"><div className="mlabel">Balance</div><div className={`mval ${profit >= 0 ? 'bal' : 'loss'}`}>{fmt(report.balance)}</div></div>
              <div className="metric" style={{ background: profit >= 0 ? '#E1F5EE' : '#FAECE7' }}>
                <div className="mlabel">{profit >= 0 ? 'Profit' : 'Loss'}</div>
                <div className={`mval ${profit >= 0 ? 'profit' : 'loss'}`}>{profit >= 0 ? '📈' : '📉'} {fmt(Math.abs(profit))}</div>
              </div>
            </div>

            <div className="detail-section-title inc-title">📥 Income</div>
            <table className="report-table" style={{ marginBottom: 16 }}>
              <thead><tr><th>Item</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
              <tbody>
                {report.income_entries.filter(r => parseFloat(r.amount) > 0).map(r => (
                  <tr key={r.id}><td>{r.label}</td><td style={{ textAlign: 'right', color: '#0F6E56', fontWeight: 600 }}>{fmt(r.amount)}</td></tr>
                ))}
                <tr style={{ fontWeight: 700, background: '#f8f9fc' }}>
                  <td>Total income</td>
                  <td style={{ textAlign: 'right', color: '#0F6E56' }}>{fmt(report.total_income)}</td>
                </tr>
              </tbody>
            </table>

            <div className="detail-section-title exp-title">📤 Expenses</div>
            <table className="expense-detail-table">
              <thead>
                <tr>
                  <th style={{width:'20%'}}>Category</th>
                  <th style={{width:'28%'}}>Item</th>
                  <th className="right" style={{width:'10%'}}>Qty</th>
                  <th className="right" style={{width:'20%'}}>Unit price</th>
                  <th className="right" style={{width:'22%'}}>Total</th>
                </tr>
              </thead>
              <tbody>
                {report.expense_entries.length === 0 ? (
                  <tr><td colSpan={5} className="empty-msg">No expenses</td></tr>
                ) : report.expense_entries.map(r => (
                  <tr key={r.id}>
                    <td><span className="badge badge-exp">{r.category}</span></td>
                    <td>{r.item || ''}</td>
                    <td className="right">{r.qty ? parseFloat(r.qty).toLocaleString() : ''}</td>
                    <td className="right">{r.unit_price ? fmt(r.unit_price) : ''}</td>
                    <td className="right" style={{color:'#993C1D',fontWeight:700}}>{fmt(r.total)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={4}>Total expenses</td>
                  <td className="right" style={{color:'#993C1D'}}>{fmt(report.total_expense)}</td>
                </tr>
              </tbody>
            </table>

            <div className={`profit-banner ${profit >= 0 ? 'pos' : 'neg'}`} style={{ marginTop: 16 }}>
              <div>
                <div className="pl">Balance carried forward</div>
                <div className="pv">{fmt(report.balance)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="pl">{profit >= 0 ? 'Net profit' : 'Net loss'}</div>
                <div className="pv-sm">{fmt(Math.abs(profit))}</div>
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalEl, document.body);
}

export default function AccountantDashboard({ onLogout, user }) {
  const [tab, setTab] = useState('today');
  const [reportDate, setReportDate] = useState(today);
  const [incRows, setIncRows] = useState(defaultIncRows());
  const [expRows, setExpRows] = useState([]);
  const [reports, setReports] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modal, setModal] = useState(null);
  const [viewDate, setViewDate] = useState(null); // for read-only past report modal

  const totalInc = incRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalExp = expRows.reduce((s, r) => s + (r.total || 0), 0);
  const balance = totalInc - totalExp;

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

  // Load report when date changes
  useEffect(() => {
    setLoadingReport(true);
    setIsEditing(false);
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
        setIsEditing(true);
      })
      .catch(() => {
        // No report for this date — fresh form, reset everything
        setIncRows(defaultIncRows());
        setExpRows([]);
        setIsEditing(false);
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
          qty: r.qty !== '' && r.qty !== null && r.qty !== undefined ? parseFloat(r.qty) : null,
          unit_price: r.unit !== '' && r.unit !== null && r.unit !== undefined ? parseFloat(r.unit) : null,
          order: i,
        })),
        is_update: isEditing,
      };

      await apiSaveReport(payload);
      const updated = await getReports();
      setReports(updated);
      setIsEditing(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      // Handle duplicate report (409)
      if (err.response?.status === 409) {
        const data = err.response.data;
        setModal({ message: data.message, date: data.date });
      } else {
        alert('Failed to save report. Please try again.');
        console.error(err);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleEditExisting() {
    // Modal confirmed — switch to edit mode for that date
    if (modal?.date) {
      setReportDate(modal.date);
      setIsEditing(true);
    }
    setModal(null);
  }

  function handleClear() {
    if (window.confirm('Clear all entries for this report?')) {
      setIncRows(defaultIncRows());
      setExpRows([]);
    }
  }

  function loadReport(date) {
    if (date === today) {
      // Today — go to edit form
      setReportDate(date);
      setTab('today');
    } else {
      // Past report — open read-only detail modal
      setViewDate(date);
    }
  }

  return (
    <div className="page">
      {/* Duplicate report modal */}
      {modal && (
        <Modal
          message={modal.message}
          onClose={() => setModal(null)}
          onEdit={handleEditExisting}
        />
      )}

      {/* Read-only past report detail modal */}
      {viewDate && (
        <ReportDetailModal date={viewDate} onClose={() => setViewDate(null)} />
      )}

      <div className="topbar">
        <div className="user-info">
          <div className="avatar">AC</div>
          <div>
            <div className="user-name">{user?.first_name || 'Accountant'}</div>
            <div className="user-role">Daily finance entry</div>
          </div>
        </div>
        <div className="topbar-actions">
          <Calculator />
          <MessagesPanel user={user} />
          <button className="btn-sm" onClick={onLogout}>Sign out</button>
        </div>
      </div>

      <div className="tabs">
        <button
          className={tab === 'today' ? 'active' : ''}
          onClick={() => {
            setTab('today');
            // Always reset to today when clicking Today's report tab
            if (reportDate !== today) {
              setReportDate(today);
            }
          }}
        >
          {tab === 'today' && isEditing && reportDate !== today ? '✏️ Edit report' : "Today's report"}
        </button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
          Past reports
        </button>
        <button className={tab === 'analytics' ? 'active' : ''} onClick={() => setTab('analytics')}>
          📊 Analytics
        </button>
        <button className={tab === 'tables' ? 'active' : ''} onClick={() => setTab('tables')}>
          📋 Tables
        </button>
      </div>

      {tab === 'analytics' && <Analytics reports={reports} />}
      {tab === 'tables' && <ReportsTable reports={reports} />}

      {tab === 'today' && (
        <>
          {/* WIDGETS */}
          <div className="summary-widgets">
            <div className="widget w-bal">
              <div className="widget-top">
                <div className="widget-label">Total balance</div>
                <div className="widget-icon bal">💰</div>
              </div>
              <div className={`widget-value ${balance >= 0 ? 'bal' : 'loss'}`}>{fmt(balance)}</div>
              <ChangeTag value={balChange} />
            </div>
            <div className="widget w-inc">
              <div className="widget-top">
                <div className="widget-label">Income</div>
                <div className="widget-icon inc">📥</div>
              </div>
              <div className="widget-value inc">{fmt(totalInc)}</div>
              <ChangeTag value={incChange} />
            </div>
            <div className="widget w-exp">
              <div className="widget-top">
                <div className="widget-label">Expense</div>
                <div className="widget-icon exp">📤</div>
              </div>
              <div className="widget-value exp">{fmt(totalExp)}</div>
              <ChangeTag value={expChange} />
            </div>
          </div>

          {/* FORM */}
          <div className="card">
            <div className="report-header">
              <div>
                <div className="report-date-label">{fmtDate(reportDate)}</div>
                <div className="report-sub">
                  {loadingReport
                    ? 'Loading...'
                    : isEditing
                    ? '✏️ Editing existing report'
                    : '📝 New report'}
                </div>
              </div>
              <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} />
            </div>

            {/* Edit mode banner */}
            {isEditing && (
              <div className="edit-banner">
                ✏️ You are editing an existing report for <b>{fmtDate(reportDate)}</b>. Changes will overwrite the saved data.
              </div>
            )}

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
                {saving ? 'Saving...' : isEditing ? '✏️ Update report' : '✓ Save report'}
              </button>
            </div>
            {saved && (
              <p className="save-msg">
                ✅ Report {isEditing ? 'updated' : 'saved'} successfully.
              </p>
            )}
          </div>
        </>
      )}

      {tab === 'history' && (
        <AccountantReportsView reports={reports} onLoadReport={loadReport} />
      )}
    </div>
  );
}