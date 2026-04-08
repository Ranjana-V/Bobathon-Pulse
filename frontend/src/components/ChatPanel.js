import { useState, useEffect, useRef } from 'react';
import { formatBobResponse } from '../utils';

export default function ChatPanel({ incident, messages, onMessagesUpdate }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

async function sendChat() {
    if (!incident || !input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    setThinking(true);

    // Optimistically add user message for immediate feedback
    const optimistic = [...messages, { role: 'user', content: msg }];
    onMessagesUpdate(optimistic);

    try {
      const r = await fetch(`/api/incidents/${incident.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await r.json();
      // DB response is authoritative — use it directly, it includes the user msg
      onMessagesUpdate(data.messages || optimistic);
    } catch (e) {
      onMessagesUpdate([...optimistic, { role: 'bob', content: 'Sorry, encountered an error. Please try again.' }]);
    } finally {
      setSending(false);
      setThinking(false);
    }
  }
  
  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  }

  return (
    <div className="chat-area">
      <div className="chat-header">
        <span className="chat-context">
          {incident
            ? `Context: ${incident.service} — ${incident.title.substring(0, 50)}`
            : 'No incident selected'}
        </span>
        <span className="chat-hint">Ask anything about this incident or your infra</span>
      </div>

      {!incident ? (
        <div className="chat-no-incident">
          <span style={{ fontSize: 22, opacity: 0.2 }}>⬡</span>
          <span>Select an incident to start chatting with BOB</span>
        </div>
      ) : (
        <div className="messages">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === 'bob' ? 'bob' : 'user'}`}>
              <div className="msg-role">{m.role === 'bob' ? 'BOB' : 'You'}</div>
              <div
                className="msg-bubble"
                dangerouslySetInnerHTML={{ __html: formatBobResponse(m.content) }}
              />
            </div>
          ))}
          {thinking && (
            <div className="msg bob">
              <div className="msg-role">BOB</div>
              <div className="thinking">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="chat-input-wrap">
        <div className="chat-row">
          <textarea
            className="chat-in"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask BOB anything — incident details, infra status, kubectl queries…"
            rows={1}
          />
          <button
            className="send-btn"
            onClick={sendChat}
            disabled={!incident || sending || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
