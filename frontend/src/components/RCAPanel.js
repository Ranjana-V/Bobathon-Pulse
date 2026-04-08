import { useEffect, useRef, useState } from 'react';
import { fmtTime, parseJson } from '../utils';

export default function RCAPanel({ incident }) {
  const scrollRef = useRef(null);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [incident]);

  // Reset executing state when incident status changes away from needs_action
  useEffect(() => {
    if (incident && incident.status !== 'needs_action') {
      setExecuting(false);
    }
  }, [incident?.status]);

  if (!incident) {
    return (
      <div className="rca-area">
        <div className="empty">
          <div className="empty-icon">◎</div>
          <p>Select an incident</p>
        </div>
      </div>
    );
  }

  const steps = parseJson(incident.steps, []);
  const recActions = parseJson(incident.recommended_actions, []);
  const conf = incident.rca_confidence || 0;
  const confClass = conf >= 75 ? 'hi' : conf >= 50 ? 'mid' : 'lo';
  const fix = incident.bob_executed_fix || incident.rca_action;
  const showRCA = !!(incident.rca_what || incident.rca_root_cause);
  const showActions = recActions.length > 0 && incident.status === 'needs_action';

  async function handleApprove(action) {
    setExecuting(true);
    try {
      await fetch(`/api/incidents/${incident.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, approved: true }),
      });
    } catch (e) {
      setExecuting(false);
    }
  }

  async function handleDismiss() {
    await fetch(`/api/incidents/${incident.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: '', approved: false }),
    });
  }

  return (
    <div className="rca-area">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div className="rca-header">
          <div className="rca-svc">{incident.service}</div>
          <div className="rca-title">{incident.title}</div>
          <div className="rca-meta">
            <span className={`badge ${incident.status}`}>{incident.status.replace('_', ' ')}</span>
            <span className="rca-source">
              via {incident.source || 'watcher'} · {fmtTime(incident.triggered_at)}
            </span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="rca-scroll" ref={scrollRef}>
          {/* Investigation steps */}
          <div className="steps-block">
            <div className="block-label">Investigation</div>
            <ul className="steps-list">
              {steps.map((s, i) => (
                <li key={i} className="step">
                  <div className="step-dot" />
                  <div className="step-txt">{s.text}</div>
                  <div className="step-ts">{fmtTime(s.ts)}</div>
                </li>
              ))}
            </ul>
            {incident.status === 'investigating' && (
              <div className="bob-spinner">
                <div className="spin" />
                <span>BOB is investigating…</span>
              </div>
            )}
          </div>

          {/* RCA fields */}
          {showRCA && (
            <div className="rca-fields">
              <div className="field">
                <div className="field-lbl">What happened</div>
                <div className="field-val">{incident.rca_what || '—'}</div>
              </div>
              <div className="field">
                <div className="field-lbl">Timeline</div>
                <div className="field-val mono">{incident.rca_timeline || '—'}</div>
              </div>
              <div className="field">
                <div className="field-lbl">Root cause</div>
                <div className="field-val">{incident.rca_root_cause || '—'}</div>
              </div>
              <div className="field">
                <div className="field-lbl">Confidence</div>
                <div className="conf-row">
                  <div className="conf-bar">
                    <div className={`conf-fill ${confClass}`} style={{ width: `${conf}%` }} />
                  </div>
                  <span className="conf-pct">{conf}%</span>
                </div>
              </div>
              {fix && fix.length > 3 && (
                <div className="field">
                  <div className="field-lbl">BOB executed fix</div>
                  <div className="fix-badge">✓ <span>{fix.substring(0, 140)}</span></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {showActions && (
          <div className="actions-block">
            {executing ? (
              <div className="executing-msg">
                <div className="spin" />
                BOB is executing the fix…
              </div>
            ) : (
              <>
                <button
                  className="act-btn approve"
                  onClick={() => handleApprove(recActions[0])}
                >
                  ✓ {recActions[0]}
                </button>
                <button className="act-btn dismiss" onClick={handleDismiss}>
                  Dismiss
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
