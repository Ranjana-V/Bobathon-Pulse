import { useState, useEffect, useRef } from 'react';
import { formatBobResponse } from '../utils';

export default function ChatPanel({ incident, messages, onMessagesUpdate }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
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

  async function sendChat(textOverride, isVoice=false) {
    const displayMsg = (textOverride || input).trim();
    if (!incident || !displayMsg || sending) return;
    const apiMsg = (isVoice && !/(speak|say|voice)/i.test(displayMsg))
      ? displayMsg + ' — speak the answer'
      : displayMsg;
    setInput('');
    setSending(true);
    setThinking(true);

    const optimistic = [...messages, { role: 'user', content: displayMsg }];
    onMessagesUpdate(optimistic);

    try {
      const r = await fetch(`/api/incidents/${incident.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: apiMsg }),
      });
      const data = await r.json();
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
      sendChat(transcript,true);
    };

    recognition.start();
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
            className="mic-btn"
            onClick={handleVoice}
            disabled={sending}
            title="Voice input"
          >
            {listening ? '🔴' : '🎤'}
          </button>
          <button
            className="send-btn"
            onClick={() => sendChat()}
            disabled={!incident || sending || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}