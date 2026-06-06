import React, { useState, useRef } from 'react';

const EXPENSE_CATEGORIES = [
  'Sports', 'Food & kitchen', 'Utilities', 'Salaries',
  'Transport', 'Medical', 'Stationery', 'Maintenance', 'Other expenses',
];

function parseSpoken(s) {
  s = s.replace(/ugx|shillings?|shs?|\/=/gi, '').trim().replace(/,/g, '');
  if (s.includes('million')) { const n = parseFloat(s); return isNaN(n) ? null : Math.round(n * 1000000); }
  if (s.includes('thousand') || s.endsWith('k')) { const n = parseFloat(s); return isNaN(n) ? null : Math.round(n * 1000); }
  const direct = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (!isNaN(direct) && direct > 0) return Math.round(direct);
  const words = {
    zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,
    ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,
    seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,
    sixty:60,seventy:70,eighty:80,ninety:90,hundred:100,thousand:1000,million:1000000,
  };
  const parts = s.split(/\s+/);
  let total = 0, cur = 0;
  for (const p of parts) {
    if (words[p] !== undefined) {
      const v = words[p];
      if (v === 100) cur = cur === 0 ? 100 : cur * 100;
      else if (v >= 1000) { cur = (cur === 0 ? 1 : cur) * v; total += cur; cur = 0; }
      else cur += v;
    }
  }
  total += cur;
  return total > 0 ? total : null;
}

export default function VoiceInputButton({ onValue, label = '' }) {
  const [listening, setListening] = useState(false);
  const [toast, setToast] = useState('');
  const recRef = useRef(null);

  function showToast(msg, autohide = false) {
    setToast(msg);
    if (autohide) setTimeout(() => setToast(''), 2500);
  }

  function handleClick() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice input requires Chrome or Edge browser.'); return; }
    if (recRef.current) { recRef.current.stop(); recRef.current = null; }

    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recRef.current = rec;
    setListening(true);
    showToast('🎤 Listening... speak the amount');

    rec.onresult = e => {
      const spoken = e.results[0][0].transcript.trim().toLowerCase();
      const val = parseSpoken(spoken);
      if (val !== null) {
        onValue(val);
        showToast(`✓ Got: UGX ${val.toLocaleString()}`, true);
      } else {
        showToast('Could not understand — try again', true);
      }
      setListening(false);
      recRef.current = null;
    };
    rec.onerror = () => { setListening(false); setToast(''); recRef.current = null; };
    rec.onend = () => { setListening(false); recRef.current = null; };
    rec.start();
  }

  return (
    <>
      <button
        type="button"
        className={`mic-btn${listening ? ' listening' : ''}`}
        onClick={handleClick}
        title={`Speak amount for ${label}`}
        aria-label="Voice input"
      >
        🎤
      </button>
      {toast && <div className="voice-toast">{toast}</div>}
    </>
  );
}

export { EXPENSE_CATEGORIES };