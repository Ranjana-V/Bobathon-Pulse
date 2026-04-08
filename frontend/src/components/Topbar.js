import { useState, useEffect } from 'react';

export default function Topbar({ incidents }) {
  const [clock, setClock] = useState('--:--:--');

  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const count = incidents.length;
  const active = incidents.filter(i => !['resolved', 'auto_resolved'].includes(i.status)).length;

  return (
    <div className="topbar">
      <div className="logo">PULSE<em>.</em></div>
      <div className="topbar-right">
        <div className="live-dot" />
        <span>{clock}</span>
        <span>·</span>
        <span>{count} incident{count !== 1 ? 's' : ''}</span>
        {active > 0 && (
          <span style={{ color: 'var(--red)', fontSize: 9 }}>● ACTIVE</span>
        )}
      </div>
    </div>
  );
}
