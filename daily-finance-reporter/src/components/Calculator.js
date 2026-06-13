import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Calculator() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState(null);
  const [op, setOp] = useState(null);
  const [resetNext, setResetNext] = useState(false);
  const [history, setHistory] = useState([]);
  const btnRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (btnRef.current && !btnRef.current.contains(e.target)) {
        const dropdown = document.getElementById('calc-dropdown-portal');
        if (dropdown && !dropdown.contains(e.target)) setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function fmtNum(n) {
    if (n === null || n === undefined) return '0';
    const num = parseFloat(n);
    if (isNaN(num)) return 'Error';
    const parts = num.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  function rawVal() { return parseFloat(display.replace(/,/g, '')) || 0; }

  function handleNum(val) {
    if (resetNext) {
      setDisplay(val === '.' ? '0.' : val);
      setResetNext(false);
    } else {
      if (val === '.' && display.includes('.')) return;
      setDisplay(display === '0' && val !== '.' ? val : display + val);
    }
  }

  function calculate(a, b, operator) {
    switch (operator) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 0;
      case '%': return a % b;
      default: return b;
    }
  }

  function handleOp(nextOp) {
    const current = rawVal();
    if (prev !== null && op && !resetNext) {
      const result = calculate(prev, current, op);
      setDisplay(fmtNum(result));
      setPrev(result);
    } else {
      setPrev(current);
    }
    setOp(nextOp);
    setResetNext(true);
  }

  function handleEquals() {
    if (op === null || prev === null) return;
    const current = rawVal();
    const result = calculate(prev, current, op);
    const entry = `${fmtNum(prev)} ${op} ${fmtNum(current)} = ${fmtNum(result)}`;
    setHistory(h => [entry, ...h.slice(0, 7)]);
    setDisplay(fmtNum(result));
    setPrev(null);
    setOp(null);
    setResetNext(true);
  }

  function handleClear() {
    setDisplay('0');
    setPrev(null);
    setOp(null);
    setResetNext(false);
  }

  function handleBackspace() {
    if (resetNext) return;
    const d = display.replace(/,/g, '');
    setDisplay(d.length <= 1 ? '0' : d.slice(0, -1));
  }

  const buttons = [
    { label: 'AC', type: 'fn', action: handleClear },
    { label: '+/−', type: 'fn', action: () => setDisplay(fmtNum(-rawVal())) },
    { label: '%', type: 'op', action: () => handleOp('%') },
    { label: '÷', type: 'op', action: () => handleOp('÷') },
    { label: '7', type: 'num', action: () => handleNum('7') },
    { label: '8', type: 'num', action: () => handleNum('8') },
    { label: '9', type: 'num', action: () => handleNum('9') },
    { label: '×', type: 'op', action: () => handleOp('×') },
    { label: '4', type: 'num', action: () => handleNum('4') },
    { label: '5', type: 'num', action: () => handleNum('5') },
    { label: '6', type: 'num', action: () => handleNum('6') },
    { label: '−', type: 'op', action: () => handleOp('−') },
    { label: '1', type: 'num', action: () => handleNum('1') },
    { label: '2', type: 'num', action: () => handleNum('2') },
    { label: '3', type: 'num', action: () => handleNum('3') },
    { label: '+', type: 'op', action: () => handleOp('+') },
    { label: '⌫', type: 'fn', action: handleBackspace },
    { label: '0', type: 'num', action: () => handleNum('0') },
    { label: '.', type: 'num', action: () => handleNum('.') },
    { label: '=', type: 'eq', action: handleEquals },
  ];

  const dropdown = (
    <div
      id="calc-dropdown-portal"
      style={{
        position: 'fixed',
        top: 80,
        right: 28,
        width: 300,
        background: '#1a1a2e',
        borderRadius: 20,
        padding: 16,
        zIndex: 999999,
        boxShadow: '0 16px 60px rgba(0,0,0,0.7)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div className="calc-header">
        <span className="calc-title">🧮 Calculator (UGX)</span>
        <button className="calc-close" onClick={() => setOpen(false)}>✕</button>
      </div>
      <div className="calc-expression">
        {prev !== null ? `${fmtNum(prev)} ${op || ''}` : '\u00a0'}
      </div>
      <div className="calc-display">
        {display.length > 14 ? display.slice(0, 14) + '…' : display}
      </div>
      <div className="calc-grid">
        {buttons.map((btn, i) => (
          <button
            key={i}
            className={`calc-btn calc-btn-${btn.type}`}
            onClick={btn.action}
          >
            {btn.label}
          </button>
        ))}
      </div>
      {history.length > 0 && (
        <div className="calc-history">
          <div className="calc-history-title">Recent calculations</div>
          {history.map((h, i) => (
            <div key={i} className="calc-history-row">{h}</div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        className="btn-sm calc-trigger"
        onClick={() => setOpen(o => !o)}
      >
        🧮 Calculator
      </button>
      {open && createPortal(dropdown, document.body)}
    </>
  );
}