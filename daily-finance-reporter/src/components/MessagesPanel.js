import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  getNotificationSummary,
  getMessages,
  sendMessage,
  markMessagesRead,
  markReportsSeen,
} from '../api';

function timeAgo(dateStr) {
  const diffSec = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function MessagesPanel({ user, onViewNewReports }) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState({ unread_messages: 0, unseen_reports: 0 });
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const wrapRef = useRef(null);
  const bottomRef = useRef(null);

  // Poll notification counts every 20s, regardless of whether the panel is open.
  useEffect(() => {
    let cancelled = false;
    function poll() {
      getNotificationSummary()
        .then(data => { if (!cancelled) setCounts(data); })
        .catch(() => {});
    }
    poll();
    const id = setInterval(poll, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Close the panel when clicking outside it.
  useEffect(() => {
    function handleOutsideClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  // Auto-scroll to the latest message whenever the list changes while open.
  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoadingMessages(true);
    getMessages()
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoadingMessages(false));

    if (counts.unread_messages > 0) {
      markMessagesRead()
        .then(() => setCounts(c => ({ ...c, unread_messages: 0 })))
        .catch(() => {});
    }
  }

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft('');
    try {
      const msg = await sendMessage(body);
      setMessages(prev => [...prev, msg]);
    } catch (err) {
      console.error('Send message failed:', err);
    } finally {
      setSending(false);
    }
  }

  function handleViewReports() {
    markReportsSeen()
      .then(() => setCounts(c => ({ ...c, unseen_reports: 0 })))
      .catch(() => {});
    setOpen(false);
    if (onViewNewReports) onViewNewReports();
  }

  const totalBadge = (counts.unread_messages || 0) + (counts.unseen_reports || 0);
  const otherRoleLabel = user?.role === 'accountant' ? 'Director' : 'Accountant';

  const panel = (
    <div className="notif-panel">
      {counts.unseen_reports > 0 && (
        <div className="notif-report-alert" onClick={handleViewReports}>
          📄 {counts.unseen_reports} new report{counts.unseen_reports > 1 ? 's' : ''} added — tap to view
        </div>
      )}

      <div className="notif-panel-title">Message {otherRoleLabel}</div>

      <div className="notif-messages">
        {loadingMessages ? (
          <p className="empty-msg">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="empty-msg">No messages yet. Say hello 👋</p>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`notif-bubble ${m.sender === user?.id ? 'sent' : 'received'}`}>
              <div className="notif-bubble-text">{m.body}</div>
              <div className="notif-bubble-time">{timeAgo(m.created_at)}</div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="notif-composer">
        <input
          type="text"
          placeholder={`Message the ${otherRoleLabel.toLowerCase()}…`}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
        />
        <button onClick={handleSend} disabled={sending || !draft.trim()}>Send</button>
      </div>
    </div>
  );

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button className="notif-bell btn-sm" onClick={handleToggle}>
        🔔
        {totalBadge > 0 && (
          <span className="notif-badge">{totalBadge > 9 ? '9+' : totalBadge}</span>
        )}
      </button>
      {open && createPortal(panel, document.body)}
    </div>
  );
}
