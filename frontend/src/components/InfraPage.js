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
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    const currentLength = messages.length + (thinking ? 1 : 0);
    if (currentLength > prevLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLengthRef.current = currentLength;
  }, [messages, thinking]);

  async function send(text, isVoice=false) {
    const displayMsg = (text || input).trim();
    if (!displayMsg || thinking) return;
    const apiMsg = (isVoice && !/(speak|say|voice)/i.test(displayMsg))
        ? displayMsg + ' — speak the answer'
        : displayMsg;
    setInput('');

    const next = [...messages, { role: 'user', content: displayMsg }];
    setMessages(next);
    setThinking(true);

    try {
      const r = await fetch('/api/infra/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: apiMsg, history: messages }),
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

  function handleVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    if (listening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      send(transcript,true);
    };

    recognition.start();
  }

  const empty = messages.length === 0;

  return (
    <div className="infra-page">
      <div className="infra-header">
        <div className="infra-header-left">
          <div className="infra-logo">PULSE<em>.</em></div>
          <span className="infra-tagline">Infrastructure Assistant</span>
        </div>
        <button className="infra-nav-btn" onClick={onGoToIncidents}>
          Incidents →
        </button>
      </div>

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
            className="infra-mic-btn"
            onClick={handleVoice}
            disabled={thinking}
            title="Voice input"
          >
            {listening ? '🔴' : '🎤'}
          </button>
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