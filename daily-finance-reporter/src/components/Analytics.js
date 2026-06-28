import React, { useState } from 'react';

function fmt(n) { return 'UGX ' + Math.round(n).toLocaleString(); }

// ── Date bucket helpers (self-contained, no external deps) ──────────────
function getWeekKey(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? 6 : day - 1; // Monday-start week
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}
function getMonthKey(dateStr) { return dateStr.slice(0, 7); }   // YYYY-MM
function getYearKey(dateStr) { return dateStr.slice(0, 4); }    // YYYY

function shortDayLabel(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function weekLabel(weekStartKey) {
  return new Date(weekStartKey + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function monthLabel(monthKey) {
  return new Date(monthKey + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

// Build the aggregated series the charts render, for a given period mode.
function buildSeries(reports, period) {
  const sorted = [...reports].sort((a, b) => a.date.localeCompare(b.date));

  if (period === 'daily') {
    return sorted.slice(-14).map(r => ({
      key: r.date,
      label: shortDayLabel(r.date),
      income: parseFloat(r.total_income) || 0,
      expense: parseFloat(r.total_expense) || 0,
      balance: parseFloat(r.balance) || 0,
    }));
  }

  const keyFn = period === 'weekly' ? getWeekKey : period === 'monthly' ? getMonthKey : getYearKey;
  const groups = {};
  sorted.forEach(r => {
    const k = keyFn(r.date);
    if (!groups[k]) groups[k] = { income: 0, expense: 0 };
    groups[k].income += parseFloat(r.total_income) || 0;
    groups[k].expense += parseFloat(r.total_expense) || 0;
  });

  const keys = Object.keys(groups).sort();
  const limit = period === 'weekly' ? 8 : period === 'monthly' ? 12 : 6;
  const labelFn = period === 'weekly' ? weekLabel : period === 'monthly' ? monthLabel : (k => k);

  return keys.slice(-limit).map(k => ({
    key: k,
    label: labelFn(k),
    income: groups[k].income,
    expense: groups[k].expense,
    balance: groups[k].income - groups[k].expense,
  }));
}

// ── Income vs Expense grouped bar chart ──────────────────────────────────
function IncomeExpenseChart({ data }) {
  const barGroupWidth = 56;
  const padding = { top: 20, right: 20, bottom: 46, left: 60 };
  const chartW = Math.max(360, data.length * barGroupWidth);
  const chartH = 220;
  const width = chartW + padding.left + padding.right;
  const height = chartH + padding.top + padding.bottom;

  const maxVal = Math.max(1, ...data.flatMap(d => [d.income, d.expense]));
  const barWidth = Math.min(20, barGroupWidth / 2 - 6);

  const y = v => padding.top + chartH - (v / maxVal) * chartH;
  const h = v => (v / maxVal) * chartH;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <line
            key={f}
            x1={padding.left} x2={width - padding.right}
            y1={padding.top + chartH * (1 - f)} y2={padding.top + chartH * (1 - f)}
            stroke="#eef2f7" strokeWidth="1"
          />
        ))}
        {data.map((d, i) => {
          const cx = padding.left + barGroupWidth * i + barGroupWidth / 2;
          return (
            <g key={d.key}>
              <rect x={cx - barWidth - 2} y={y(d.income)} width={barWidth} height={Math.max(1, h(d.income))} rx="3" fill="#2CC68F" />
              <rect x={cx + 2} y={y(d.expense)} width={barWidth} height={Math.max(1, h(d.expense))} rx="3" fill="#F07048" />
              <text x={cx} y={height - padding.bottom + 18} textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="Inter, sans-serif">
                {d.label}
              </text>
            </g>
          );
        })}
        <line x1={padding.left} x2={padding.left} y1={padding.top} y2={padding.top + chartH} stroke="#cbd5e1" />
        <line x1={padding.left} x2={width - padding.right} y1={padding.top + chartH} y2={padding.top + chartH} stroke="#cbd5e1" />
      </svg>
    </div>
  );
}

// ── Balance trend line chart ─────────────────────────────────────────────
function BalanceLineChart({ data }) {
  const pointGap = 56;
  const padding = { top: 20, right: 20, bottom: 46, left: 60 };
  const chartW = Math.max(360, (data.length - 1) * pointGap);
  const chartH = 180;
  const width = chartW + padding.left + padding.right;
  const height = chartH + padding.top + padding.bottom;

  const values = data.map(d => d.balance);
  const maxVal = Math.max(...values, 0);
  const minVal = Math.min(...values, 0);
  const range = (maxVal - minVal) || 1;

  const x = i => padding.left + (data.length === 1 ? chartW / 2 : (chartW / (data.length - 1)) * i);
  const y = v => padding.top + chartH - ((v - minVal) / range) * chartH;
  const zeroY = y(0);

  const points = data.map((d, i) => `${x(i)},${y(d.balance)}`).join(' ');

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <line x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} stroke="#cbd5e1" strokeDasharray="4 4" />
        <polyline points={points} fill="none" stroke="#185FA5" strokeWidth="2.5" />
        {data.map((d, i) => (
          <circle key={d.key} cx={x(i)} cy={y(d.balance)} r="4" fill={d.balance >= 0 ? '#0F6E56' : '#993C1D'} />
        ))}
        {data.map((d, i) => (
          <text key={d.key} x={x(i)} y={height - padding.bottom + 18} textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="Inter, sans-serif">
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ── Main Analytics page ──────────────────────────────────────────────────
export default function Analytics({ reports }) {
  const [period, setPeriod] = useState('monthly');

  if (!reports || reports.length === 0) {
    return <div className="card"><p className="empty-msg">No data yet to show analytics.</p></div>;
  }

  const data = buildSeries(reports, period);
  const totalInc = data.reduce((s, d) => s + d.income, 0);
  const totalExp = data.reduce((s, d) => s + d.expense, 0);
  const net = totalInc - totalExp;

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

      <div className="metrics-grid">
        <div className="metric">
          <div className="mlabel">Income (shown range)</div>
          <div className="mval inc">{fmt(totalInc)}</div>
        </div>
        <div className="metric">
          <div className="mlabel">Expenses (shown range)</div>
          <div className="mval exp">{fmt(totalExp)}</div>
        </div>
        <div className="metric">
          <div className="mlabel">Net</div>
          <div className={`mval ${net >= 0 ? 'bal' : 'loss'}`}>{fmt(net)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Income vs Expenses</div>
        <div className="chart-legend">
          <span><i style={{ background: '#2CC68F' }} /> Income</span>
          <span><i style={{ background: '#F07048' }} /> Expenses</span>
        </div>
        <IncomeExpenseChart data={data} />
      </div>

      <div className="card">
        <div className="card-title">Balance trend</div>
        <BalanceLineChart data={data} />
      </div>
    </div>
  );
}
