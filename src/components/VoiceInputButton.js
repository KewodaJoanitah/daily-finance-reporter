import React, { useState, useRef } from 'react';

export const EXPENSE_CATEGORIES = [
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

function isSpeechSupported() {
  return typeof window !== 'undefined' &&
    (window.location.protocol === 'https:' ||
     window.location.hostname === 'localhost' ||
     window.location.hostname === '127.0.0.1') &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

export default function VoiceInputButton({ onValue, label = '' }) {
  const [listening, setListening] = useState(false);
  const [toast, setToast] = useState('');
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackVal, setFallbackVal] = useState('');
  const [transcript, setTranscript] = useState('');
  const recRef = useRef(null);

  function showToast(msg, autohide = false) {
    setToast(msg);
    if (autohide) setTimeout(() => setToast(''), 2500);
  }

  function handleClick() {
    // If speech not supported (HTTP on network IP), show fallback popup
    if (!isSpeechSupported()) {
      setShowFallback(true);
      setFallbackVal('');
      setTranscript('');
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (recRef.current) { recRef.current.stop(); recRef.current = null; }

    const rec = new SR();
    rec.lang = 'en-UG'; // Try Uganda English first
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    recRef.current = rec;
    setListening(true);
    showToast('🎤 Listening... speak the amount');

    rec.onresult = e => {
      // Try all alternatives
      let val = null;
      for (let i = 0; i < e.results[0].length; i++) {
        const spoken = e.results[0][i].transcript.trim().toLowerCase();
        setTranscript(spoken);
        val = parseSpoken(spoken);
        if (val !== null) break;
      }
      if (val !== null) {
        onValue(val);
        showToast(`✓ Got: UGX ${val.toLocaleString()}`, true);
      } else {
        // Show fallback so user can type it manually
        setShowFallback(true);
        setFallbackVal('');
      }
      setListening(false);
      recRef.current = null;
    };

    rec.onerror = (e) => {
      setListening(false);
      setToast('');
      recRef.current = null;
      // On any error show the fallback input
      setShowFallback(true);
      setFallbackVal('');
    };

    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };

    try {
      rec.start();
    } catch (e) {
      setListening(false);
      setShowFallback(true);
    }
  }

  function handleFallbackSubmit() {
    const val = parseFloat(fallbackVal);
    if (!isNaN(val) && val > 0) {
      onValue(Math.round(val));
      setShowFallback(false);
      setFallbackVal('');
    }
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

      {/* Fallback popup for HTTP / unsupported environments */}
      {showFallback && (
        <div className="fallback-overlay" onClick={() => setShowFallback(false)}>
          <div className="fallback-modal" onClick={e => e.stopPropagation()}>
            <div className="fallback-title">
              🎤 Voice not available on HTTP
            </div>
            <p className="fallback-sub">
              Voice input requires HTTPS. Type the amount below:
            </p>
            {transcript && (
              <p className="fallback-heard">Heard: "<i>{transcript}</i>"</p>
            )}
            <input
              type="number"
              className="fallback-input"
              placeholder="Enter amount (UGX)"
              value={fallbackVal}
              onChange={e => setFallbackVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleFallbackSubmit(); }}
              autoFocus
            />
            <div className="fallback-actions">
              <button className="btn-sm" onClick={() => setShowFallback(false)}>Cancel</button>
              <button className="btn" onClick={handleFallbackSubmit}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}