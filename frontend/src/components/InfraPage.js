import { useState, useRef, useEffect } from 'react';
import { formatBobResponse } from '../utils';

const SUGGESTIONS = [
  'What is the current latency for inventory-svc?',
  'List all pods and their CPU usage',
  'Are there any error spikes right now?',
  'Show recent deployments for checkout-svc',
];

export default function InfraPage({ onGoToIncidents }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  async function send(text) {
    const msg = (text || input).trim();
    if (!msg || thinking) return;
    setInput('');

    const next = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    setThinking(true);

    try {
      const r = await fetch('/api/infra/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: messages }),
      });
      const data = await r.json();
      setMessages([...next, { role: 'bob', content: data.reply || 'No response.' }]);
    } catch {
      setMessages([...next, { role: 'bob', content: 'Could not reach backend.' }]);
    } finally {
      setThinking(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="infra-page">
      {/* Header */}
      <div className="infra-header">
        <div className="infra-header-left">
          <div className="infra-logo">PULSE<em>.</em></div>
          <span className="infra-tagline">Infrastructure Assistant</span>
        </div>
        <button className="infra-nav-btn" onClick={onGoToIncidents}>
          Incidents →
        </button>
      </div>

      {/* Chat container */}
      <div className="infra-body">
        {empty ? (
          <div className="infra-empty">
            <div className="infra-empty-icon">⬡</div>
            <p className="infra-empty-title">Ask about your infra</p>
            <p className="infra-empty-sub">
              Pods, metrics, latency, logs, deployments — BOB checks live data.
            </p>
            <div className="infra-suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="infra-suggestion" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="infra-messages">
            {messages.map((m, i) => (
              <div key={i} className={`infra-msg infra-msg-${m.role}`}>
                <div className="infra-msg-role">
                  {m.role === 'bob' ? 'BOB' : 'You'}
                </div>
                <div
                  className="infra-msg-bubble"
                  dangerouslySetInnerHTML={{ __html: formatBobResponse(m.content) }}
                />
              </div>
            ))}
            {thinking && (
              <div className="infra-msg infra-msg-bob">
                <div className="infra-msg-role">BOB</div>
                <div className="infra-thinking">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="infra-input-wrap">
        <div className="infra-input-row">
          <textarea
            className="infra-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about pods, latency, logs, deployments…"
            rows={1}
          />
          <button
            className="infra-send"
            onClick={() => send()}
            disabled={thinking || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}