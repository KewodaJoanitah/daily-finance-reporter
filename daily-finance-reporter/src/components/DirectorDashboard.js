import React, { useState, useEffect } from 'react';
import { getReports, getReport } from '../api';
import Calculator from './Calculator';
import MessagesPanel from './MessagesPanel';
import Analytics from './Analytics';
import ReportsTable from './ReportsTable';
import '../styles/Dashboard.css';

function fmt(n) { return 'UGX ' + Math.round(n).toLocaleString(); }
function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}
function fmtShortDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function ReportDetailModal({ date, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReport(date)
      .then(data => setReport(data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [date]);

  const profit = report ? parseFloat(report.balance) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={e => e.stopPropagation()}>
        <div className="detail-modal-header">
          <div>
            <div className="detail-modal-date">{fmtDate(date)}</div>
            <div className="report-sub">Full report details</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <p className="empty-msg" style={{ textAlign: 'center', padding: '2rem' }}>Loading report...</p>
        ) : !report ? (
          <p className="empty-msg">Could not load report.</p>
        ) : (
          <>
            {/* Summary metrics */}
            <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '1.2rem' }}>
              <div className="metric">
                <div className="mlabel">Income</div>
                <div className="mval inc">{fmt(report.total_income)}</div>
              </div>
              <div className="metric">
                <div className="mlabel">Expenses</div>
                <div className="mval exp">{fmt(report.total_expense)}</div>
              </div>
              <div className="metric">
                <div className="mlabel">Balance</div>
                <div className={`mval ${profit >= 0 ? 'bal' : 'loss'}`}>{fmt(report.balance)}</div>
              </div>
              <div className="metric" style={{ background: profit >= 0 ? '#E1F5EE' : '#FAECE7' }}>
                <div className="mlabel">{profit >= 0 ? 'Profit' : 'Loss'}</div>
                <div className={`mval ${profit >= 0 ? 'profit' : 'loss'}`}>
                  {profit >= 0 ? '📈' : '📉'} {fmt(Math.abs(profit))}
                </div>
              </div>
            </div>

            {/* Income table */}
            <div className="detail-section-title inc-title">📥 Income</div>
            <table className="report-table" style={{ marginBottom: 20 }}>
              <thead>
                <tr><th>Item</th><th className="text-right">Amount</th></tr>
              </thead>
              <tbody>
                {report.income_entries.filter(r => parseFloat(r.amount) > 0).length === 0 ? (
                  <tr><td colSpan={2} className="empty-msg">No income entries</td></tr>
                ) : report.income_entries.filter(r => parseFloat(r.amount) > 0).map(r => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    <td className="text-right inc" style={{ fontWeight: 600 }}>{fmt(r.amount)}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700, background: '#f8f9fc' }}>
                  <td>Total income</td>
                  <td className="text-right inc">{fmt(report.total_income)}</td>
                </tr>
              </tbody>
            </table>

            {/* Expense table */}
            <div className="detail-section-title exp-title">📤 Expenses</div>
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
                {report.expense_entries.length === 0 ? (
                  <tr><td colSpan={5} className="empty-msg">No expense entries</td></tr>
                ) : report.expense_entries.map(r => (
                  <tr key={r.id}>
                    <td><span className="badge badge-exp">{r.category}</span></td>
                    <td>{r.item || '—'}</td>
                    <td className="text-right">{r.qty || '—'}</td>
                    <td className="text-right">{r.unit_price ? fmt(r.unit_price) : '—'}</td>
                    <td className="text-right exp" style={{ fontWeight: 600 }}>{fmt(r.total)}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700, background: '#f8f9fc' }}>
                  <td colSpan={4}>Total expenses</td>
                  <td className="text-right exp">{fmt(report.total_expense)}</td>
                </tr>
              </tbody>
            </table>

            {/* Balance summary */}
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
}


// ── Helpers ──
function getWeekKey(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay() + 1); // Monday
  return start.toISOString().split('T')[0];
}

function getMonthKey(dateStr) { return dateStr.substring(0, 7); }
function getYearKey(dateStr) { return dateStr.substring(0, 4); }

function groupReports(reports, keyFn) {
  const groups = {};
  reports.forEach(r => {
    const key = keyFn(r.date);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return groups;
}

function sumGroup(reps) {
  const inc = reps.reduce((s, r) => s + parseFloat(r.total_income), 0);
  const exp = reps.reduce((s, r) => s + parseFloat(r.total_expense), 0);
  return { inc, exp, bal: inc - exp };
}

function PeriodCard({ title, sub, inc, exp, bal, onClick, tag }) {
  const p = bal;
  return (
    <div className="day-card clickable-report" onClick={onClick} style={{ marginBottom: 10 }}>
      <div className="day-card-head">
        <div>
          <div className="day-date">{title}</div>
          {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {tag && <span className="view-detail-tag">{tag}</span>}
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

function AllReportsView({ reports, onSelectDate }) {
  const [period, setPeriod] = useState('daily');
  const [searchDate, setSearchDate] = useState('');

  if (reports.length === 0) {
    return <div className="card"><p className="empty-msg">No reports yet.</p></div>;
  }

  const filteredReports = searchDate
    ? reports.filter(r => r.date === searchDate)
    : reports;

  // ── DAILY ──
  const DailyView = () => (
    <div>
      <div className="period-section-title">📅 Daily reports — click any to view full details</div>
      {filteredReports.map(r => (
        <PeriodCard
          key={r.date}
          title={fmtDate(r.date)}
          inc={parseFloat(r.total_income)}
          exp={parseFloat(r.total_expense)}
          bal={parseFloat(r.balance)}
          onClick={() => onSelectDate(r.date)}
          tag="👁 View details"
        />
      ))}
    </div>
  );

  // ── WEEKLY ──
  const WeeklyView = () => {
    const groups = groupReports(filteredReports, getWeekKey);
    const weeks = Object.keys(groups).sort().reverse();
    return (
      <div>
        <div className="period-section-title">📆 Weekly summaries</div>
        {weeks.map(weekStart => {
          const reps = groups[weekStart];
          const { inc, exp, bal } = sumGroup(reps);
          const weekEnd = new Date(weekStart + 'T12:00:00');
          weekEnd.setDate(weekEnd.getDate() + 6);
          const label = `Week of ${new Date(weekStart + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
          return (
            <div key={weekStart}>
              <PeriodCard
                title={label}
                sub={`${reps.length} report${reps.length > 1 ? 's' : ''} this week`}
                inc={inc} exp={exp} bal={bal}
              />
              {/* Sub-list of daily reports in this week */}
              <div style={{ marginLeft: 16, marginBottom: 8 }}>
                  {reps.map(r => (
                    <div
                      key={r.date}
                      className="sub-report-row"
                      onClick={() => onSelectDate(r.date)}
                    >
                      <span className="sub-report-date">{new Date(r.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className="sub-report-inc">Inc: {fmt(r.total_income)}</span>
                      <span className="sub-report-exp">Exp: {fmt(r.total_expense)}</span>
                      <span className={`badge ${parseFloat(r.balance) >= 0 ? 'badge-profit' : 'badge-loss'}`} style={{ fontSize: 10 }}>
                        {parseFloat(r.balance) >= 0 ? '+' : ''}{fmt(r.balance)}
                      </span>
                      <span className="view-detail-tag" style={{ fontSize: 10 }}>👁 Details</span>
                    </div>
                  ))}
                </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── MONTHLY ──
  const MonthlyView = () => {
    const groups = groupReports(filteredReports, getMonthKey);
    const months = Object.keys(groups).sort().reverse();
    return (
      <div>
        <div className="period-section-title">🗓️ Monthly summaries</div>
        {months.map(monthKey => {
          const reps = groups[monthKey];
          const { inc, exp, bal } = sumGroup(reps);
          const label = new Date(monthKey + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
          return (
            <div key={monthKey}>
              <PeriodCard
                title={label}
                sub={`${reps.length} report${reps.length > 1 ? 's' : ''} this month`}
                inc={inc} exp={exp} bal={bal}
              />
              <div style={{ marginLeft: 16, marginBottom: 8 }}>
                  {reps.map(r => (
                    <div key={r.date} className="sub-report-row" onClick={() => onSelectDate(r.date)}>
                      <span className="sub-report-date">{new Date(r.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className="sub-report-inc">Inc: {fmt(r.total_income)}</span>
                      <span className="sub-report-exp">Exp: {fmt(r.total_expense)}</span>
                      <span className={`badge ${parseFloat(r.balance) >= 0 ? 'badge-profit' : 'badge-loss'}`} style={{ fontSize: 10 }}>
                        {fmt(r.balance)}
                      </span>
                      <span className="view-detail-tag" style={{ fontSize: 10 }}>👁 Details</span>
                    </div>
                  ))}
                </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── YEARLY ──
  const YearlyView = () => {
    const groups = groupReports(filteredReports, getYearKey);
    const years = Object.keys(groups).sort().reverse();
    return (
      <div>
        <div className="period-section-title">📊 Yearly summaries</div>
        {years.map(year => {
          const reps = groups[year];
          const { inc, exp, bal } = sumGroup(reps);
          const monthGroups = groupReports(reps, getMonthKey);
          return (
            <div key={year}>
              <PeriodCard
                title={`Year ${year}`}
                sub={`${reps.length} report${reps.length > 1 ? 's' : ''} across ${Object.keys(monthGroups).length} month${Object.keys(monthGroups).length > 1 ? 's' : ''}`}
                inc={inc} exp={exp} bal={bal}
              />
              <div style={{ marginLeft: 16, marginBottom: 8 }}>
                {Object.keys(monthGroups).sort().reverse().map(mk => {
                  const mreps = monthGroups[mk];
                  const ms = sumGroup(mreps);
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
      {/* Period switcher */}
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

export default function DirectorDashboard({ onLogout, user }) {
  const [tab, setTab] = useState('overview');
  const [reports, setReports] = useState([]);
  const [latest, setLatest] = useState(null);
  const [todayReport, setTodayReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null); // for modal

  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    getReports()
      .then(reps => {
        setReports(reps);
        if (reps.length > 0) {
          getReport(reps[0].date).then(full => setLatest(full)).catch(() => {});
        }
        // Today's report is fetched separately — if the accountant hasn't
        // filed anything yet today, this just stays null (shown as zeros),
        // it's not treated as a load error.
        getReport(todayStr).then(full => setTodayReport(full)).catch(() => setTodayReport(null));
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
      {/* Report detail modal */}
      {selectedDate && (
        <ReportDetailModal date={selectedDate} onClose={() => setSelectedDate(null)} />
      )}

      <div className="topbar">
        <div className="user-info">
          <div className="avatar director">DR</div>
          <div>
            <div className="user-name">{user?.first_name || 'Director'}</div>
            <div className="user-role">Reports &amp; overview</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Calculator />
          <MessagesPanel user={user} onViewNewReports={() => setTab('daily')} />
          <button className="btn-sm" onClick={onLogout}>Sign out</button>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Latest report</button>
        <button className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')}>All reports</button>
        <button className={tab === 'analytics' ? 'active' : ''} onClick={() => setTab('analytics')}>📊 Analytics</button>
        <button className={tab === 'tables' ? 'active' : ''} onClick={() => setTab('tables')}>📋 Tables</button>
      </div>

      {tab === 'analytics' && <Analytics reports={reports} />}
      {tab === 'tables' && <ReportsTable reports={reports} />}

      {/* LATEST REPORT */}
      {tab === 'overview' && (
        <div>
          {/* SUMMARY WIDGETS — figures for today specifically, not the latest filed report */}
          {(() => {
            const inc = todayReport ? parseFloat(todayReport.total_income) : 0;
            const exp = todayReport ? parseFloat(todayReport.total_expense) : 0;
            const profit = todayReport ? parseFloat(todayReport.balance) : 0;
            const dayTag = `📅 ${fmtShortDate(todayStr)}`;
            return (
              <div className="summary-widgets" style={{ marginBottom: '1.4rem' }}>
                <div className="widget w-bal">
                  <div className="widget-top">
                    <div className="widget-label">Balance</div>
                    <div className="widget-icon bal">💰</div>
                  </div>
                  <div className={`widget-value ${profit >= 0 ? 'bal' : 'loss'}`}>{fmt(profit)}</div>
                  <span className="change-tag neutral">{dayTag}</span>
                </div>
                <div className="widget w-inc">
                  <div className="widget-top">
                    <div className="widget-label">Income</div>
                    <div className="widget-icon inc">📥</div>
                  </div>
                  <div className="widget-value inc">{fmt(inc)}</div>
                  <span className="change-tag neutral">{dayTag}</span>
                </div>
                <div className="widget w-exp">
                  <div className="widget-top">
                    <div className="widget-label">Expenses</div>
                    <div className="widget-icon exp">📤</div>
                  </div>
                  <div className="widget-value exp">{fmt(exp)}</div>
                  <span className="change-tag neutral">{dayTag}</span>
                </div>
              </div>
            );
          })()}

          {!latest ? (
            <div className="card"><p className="empty-msg">No reports submitted yet.</p></div>
          ) : (
            <div className="card">
              <h3 className="card-title">Most recent filed report — {fmtDate(latest.date)}</h3>
              <h3 className="card-title">Income</h3>
              <table className="report-table" style={{ marginBottom: 16 }}>
                <thead><tr><th>Item</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  {latest.income_entries.filter(r => r.amount > 0).map(r => (
                    <tr key={r.id}><td>{r.label}</td><td className="text-right inc" style={{ fontWeight: 600 }}>{fmt(r.amount)}</td></tr>
                  ))}
                </tbody>
              </table>
              <h3 className="card-title">Expenses</h3>
              <table className="report-table">
                <thead>
                  <tr><th>Category</th><th>Item</th><th className="text-right">Qty</th><th className="text-right">Unit price</th><th className="text-right">Total</th></tr>
                </thead>
                <tbody>
                  {latest.expense_entries.length === 0 ? (
                    <tr><td colSpan={5} className="empty-msg">No expenses</td></tr>
                  ) : latest.expense_entries.map(r => (
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
                    <td className="right" style={{color:'#993C1D'}}>{fmt(latest.total_expense)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ALL REPORTS — with period tabs */}
      {tab === 'daily' && (
        <AllReportsView reports={reports} onSelectDate={setSelectedDate} />
      )}
    </div>
  );
}