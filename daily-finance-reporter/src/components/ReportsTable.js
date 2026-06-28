import React, { useState } from 'react';

function fmt(n) { return 'UGX ' + Math.round(n).toLocaleString(); }
function fmtPlain(n) { return Math.round(n).toString(); }

// ── Date bucket helpers (self-contained, no external deps) ──────────────
function getDayKey(dateStr) { return dateStr; }
function dayLabel(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}
function getWeekKey(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? 6 : day - 1; // Monday-start week
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}
function weekRangeLabel(weekStartKey) {
  const start = new Date(weekStartKey + 'T12:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const endStr = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}
function getMonthKey(dateStr) { return dateStr.slice(0, 7); } // YYYY-MM
function monthLabel(monthKey) {
  return new Date(monthKey + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
function getYearKey(dateStr) { return dateStr.slice(0, 4); } // YYYY
function yearLabel(yearKey) { return yearKey; }

// Aggregates every report into buckets — no truncation, this is the full record.
function buildFullSeries(reports, period) {
  const keyFn = period === 'daily' ? getDayKey
    : period === 'weekly' ? getWeekKey
    : period === 'monthly' ? getMonthKey
    : getYearKey;
  const labelFn = period === 'daily' ? dayLabel
    : period === 'weekly' ? weekRangeLabel
    : period === 'monthly' ? monthLabel
    : yearLabel;

  const groups = {};
  reports.forEach(r => {
    const k = keyFn(r.date);
    if (!groups[k]) groups[k] = { income: 0, expense: 0, count: 0 };
    groups[k].income += parseFloat(r.total_income) || 0;
    groups[k].expense += parseFloat(r.total_expense) || 0;
    groups[k].count += 1;
  });

  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a)) // newest period first
    .map(k => ({
      key: k,
      label: labelFn(k),
      income: groups[k].income,
      expense: groups[k].expense,
      balance: groups[k].income - groups[k].expense,
      count: groups[k].count,
    }));
}

// ── Plain CSV download, no extra dependencies ────────────────────────────
function downloadCSV(filename, headers, rows) {
  const esc = v => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(','), ...rows.map(row => row.map(esc).join(','))];
  const csv = lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const PERIOD_META = {
  daily: { label: 'Date', tabLabel: '📅 Daily', title: 'Daily breakdown' },
  weekly: { label: 'Week', tabLabel: '📆 Weekly', title: 'Weekly breakdown' },
  monthly: { label: 'Month', tabLabel: '🗓️ Monthly', title: 'Monthly breakdown' },
  yearly: { label: 'Year', tabLabel: '📊 Yearly', title: 'Yearly breakdown' },
};

export default function ReportsTable({ reports }) {
  const [period, setPeriod] = useState('daily');

  if (!reports || reports.length === 0) {
    return <div className="card"><p className="empty-msg">No data yet to show in tables.</p></div>;
  }

  const data = buildFullSeries(reports, period);
  const meta = PERIOD_META[period];

  const totalInc = data.reduce((s, d) => s + d.income, 0);
  const totalExp = data.reduce((s, d) => s + d.expense, 0);
  const totalCount = data.reduce((s, d) => s + d.count, 0);

  function handleExport() {
    const headers = [meta.label, 'Income (UGX)', 'Expenses (UGX)', 'Balance (UGX)', 'Reports'];
    const rows = data.map(d => [d.label, fmtPlain(d.income), fmtPlain(d.expense), fmtPlain(d.balance), d.count]);
    rows.push(['Total', fmtPlain(totalInc), fmtPlain(totalExp), fmtPlain(totalInc - totalExp), totalCount]);
    downloadCSV(`dfr_${period}_report.csv`, headers, rows);
  }

  return (
    <div>
      <div className="period-tabs">
        {Object.keys(PERIOD_META).map(key => (
          <button
            key={key}
            className={period === key ? 'active' : ''}
            onClick={() => setPeriod(key)}
          >
            {PERIOD_META[key].tabLabel}
          </button>
        ))}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>{meta.title}</div>
          <button className="btn-sm" onClick={handleExport}>⬇ Export CSV</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="report-table">
            <thead>
              <tr>
                <th>{meta.label}</th>
                <th className="text-right">Income</th>
                <th className="text-right">Expenses</th>
                <th className="text-right">Balance</th>
                <th className="text-right">Reports</th>
              </tr>
            </thead>
            <tbody>
              {data.map(d => (
                <tr key={d.key}>
                  <td>{d.label}</td>
                  <td className="text-right num">{fmt(d.income)}</td>
                  <td className="text-right num">{fmt(d.expense)}</td>
                  <td className={`text-right num ${d.balance >= 0 ? 'inc' : 'exp'}`}>{fmt(d.balance)}</td>
                  <td className="text-right num">{d.count}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="table-total-row">
                <td><strong>Total</strong></td>
                <td className="text-right num"><strong>{fmt(totalInc)}</strong></td>
                <td className="text-right num"><strong>{fmt(totalExp)}</strong></td>
                <td className="text-right num"><strong>{fmt(totalInc - totalExp)}</strong></td>
                <td className="text-right num"><strong>{totalCount}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}