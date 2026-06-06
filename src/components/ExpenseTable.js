import React, { useState } from 'react';
import VoiceInputButton, { EXPENSE_CATEGORIES } from './VoiceInputButton';

export default function ExpenseTable({ rows, onChange }) {
  const [selectedCat, setSelectedCat] = useState(EXPENSE_CATEGORIES[0]);

  function updateRow(id, field, value) {
    const updated = rows.map(r => {
      if (r.id !== id) return r;
      const next = { ...r, [field]: value };
      next.total = next.qty && next.unit
        ? Math.round(parseFloat(next.qty) * parseFloat(next.unit))
        : parseFloat(next.unit) || 0;
      return next;
    });
    onChange(updated);
  }

  function addRow() {
    onChange([...rows, { id: Date.now(), cat: selectedCat, item: '', qty: '', unit: '', total: 0 }]);
  }

  function removeRow(id) {
    onChange(rows.filter(r => r.id !== id));
  }

  const cats = [...new Set(rows.map(r => r.cat))];

  return (
    <div className="table-section">
      {rows.length === 0 && (
        <p className="empty-msg">No expense items yet. Select a category and click Add.</p>
      )}

      {cats.map(cat => (
        <div key={cat}>
          <div className="cat-header">{cat}</div>
          <div className="col-headers expense-grid">
            <span>Item description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit price</span>
            <span className="text-right">Total</span>
            <span /><span />
          </div>
          {rows.filter(r => r.cat === cat).map(row => (
            <div key={row.id} className="expense-grid row-item">
              <input
                type="text"
                value={row.item}
                placeholder="Item description"
                onChange={e => updateRow(row.id, 'item', e.target.value)}
              />
              <input
                type="number"
                value={row.qty}
                placeholder="Qty"
                className="text-right"
                onChange={e => updateRow(row.id, 'qty', e.target.value)}
              />
              <input
                type="number"
                value={row.unit}
                placeholder="Unit price"
                className="text-right"
                onChange={e => updateRow(row.id, 'unit', e.target.value)}
              />
              <span className="auto-calc">
                UGX {(row.total || 0).toLocaleString()}
              </span>
              <VoiceInputButton
                label={row.item || 'unit price'}
                onValue={val => updateRow(row.id, 'unit', val)}
              />
              <button
                type="button"
                className="btn-icon btn-remove"
                onClick={() => removeRow(row.id)}
                title="Remove"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      ))}

      <div className="add-row" style={{ marginTop: 10 }}>
        <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
          {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button type="button" className="btn-sm" onClick={addRow}>
          + Add expense item
        </button>
      </div>
    </div>
  );
}