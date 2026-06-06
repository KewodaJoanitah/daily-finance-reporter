import React from 'react';
import VoiceInputButton from './VoiceInputButton';

export default function IncomeTable({ rows, onChange }) {
  function updateRow(id, field, value) {
    onChange(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  function addRow() {
    onChange([...rows, { id: Date.now(), label: '', amount: '' }]);
  }

  function removeRow(id) {
    onChange(rows.filter(r => r.id !== id));
  }

  return (
    <div className="table-section">
      <div className="col-headers income-grid">
        <span>Item</span>
        <span className="text-right">Amount (UGX)</span>
        <span />
        <span />
      </div>

      {rows.map(row => (
        <div key={row.id} className="income-grid row-item">
          <input
            type="text"
            value={row.label}
            placeholder="Item name"
            onChange={e => updateRow(row.id, 'label', e.target.value)}
          />
          <input
            type="number"
            value={row.amount}
            placeholder="0"
            className="text-right"
            onChange={e => updateRow(row.id, 'amount', parseFloat(e.target.value) || '')}
          />
          <VoiceInputButton
            label={row.label || 'income'}
            onValue={val => updateRow(row.id, 'amount', val)}
          />
          <button
            type="button"
            className="btn-icon btn-remove"
            onClick={() => removeRow(row.id)}
            title="Remove row"
          >
            🗑
          </button>
        </div>
      ))}

      <button type="button" className="btn-sm" onClick={addRow} style={{ marginTop: 8 }}>
        + Add income item
      </button>
    </div>
  );
}