export function exportCSV(reports) {
  if (!reports.length) { alert('No reports to export.'); return; }

  const rows = [
    ['Date', 'Type', 'Category', 'Item', 'Qty', 'Unit price', 'Total', 'Income total', 'Expense total', 'Balance'],
  ];

  reports.forEach(r => {
    r.incRows.forEach(i => {
      if (i.amount)
        rows.push([r.date, 'Income', '', i.label, '', '', i.amount, r.totalInc, '', '']);
    });
    r.expRows.forEach(e => {
      rows.push([r.date, 'Expense', e.cat, e.item, e.qty, e.unit, e.total, '', r.totalExp, r.balance]);
    });
  });

  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'daily_finance_reports.csv';
  a.click();
}