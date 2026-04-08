import { colorClass, timeAgo } from '../utils';

export default function IncidentList({ incidents, selectedId, onSelect }) {
  const active = incidents.filter(i => !['resolved', 'auto_resolved'].includes(i.status)).length;

  return (
    <div className="left">
      <div className="panel-label">
        <span>Incidents</span>
        {active > 0 && (
          <span style={{ color: 'var(--red)', fontSize: 9 }}>● ACTIVE</span>
        )}
      </div>
      <div className="incident-list">
        {incidents.length === 0 ? (
          <div className="no-inc">Watching for incidents…<br />All services nominal.</div>
        ) : (
          incidents.map(inc => (
            <div
              key={inc.id}
              className={`inc-card ${colorClass(inc.status)} ${selectedId === inc.id ? 'active' : ''}`}
              onClick={() => onSelect(inc.id)}
            >
              <div className="inc-svc">{inc.service}</div>
              <div className="inc-title" title={inc.title}>{inc.title}</div>
              <div className="inc-foot">
                <span className={`badge ${inc.status}`}>{inc.status.replace('_', ' ')}</span>
                <span className="inc-time">{timeAgo(inc.triggered_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
