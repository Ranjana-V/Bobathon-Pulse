import { useState, useEffect, useCallback, useRef } from 'react';
import Topbar from './components/Topbar';
import IncidentList from './components/IncidentList';
import RCAPanel from './components/RCAPanel';
import ChatPanel from './components/ChatPanel';
import InfraPage from './components/InfraPage';
import './index.css';

export default function App() {
  const [page, setPage] = useState('infra'); // 'infra' | 'incidents'
  const [incidents, setIncidents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const chatCache = useRef({});
  const [messages, setMessages] = useState([]);

  // ── Load incident list ──────────────────────────────────────────────────
  const loadIncidents = useCallback(async () => {
    try {
      const r = await fetch('/api/incidents');
      const data = await r.json();
      setIncidents(data);
    } catch (e) {}
  }, []);

  // ── Load incident detail ────────────────────────────────────────────────
  const loadDetail = useCallback(async (id) => {
    try {
      const r = await fetch(`/api/incidents/${id}`);
      const inc = await r.json();
      inc.steps = typeof inc.steps === 'string' ? JSON.parse(inc.steps || '[]') : (inc.steps || []);
      inc.recommended_actions = typeof inc.recommended_actions === 'string'
        ? JSON.parse(inc.recommended_actions || '[]')
        : (inc.recommended_actions || []);
      setSelectedIncident(inc);
      chatCache.current[id] = inc.chat || [];
      if (selectedId === id) {
        setMessages(chatCache.current[id]);
      }
    } catch (e) {}
  }, [selectedId]);

  // ── Select incident ─────────────────────────────────────────────────────
  async function selectIncident(id) {
    setSelectedId(id);
    if (!chatCache.current[id]) chatCache.current[id] = [];
    setMessages(chatCache.current[id]);
    await loadDetail(id);
  }

  function handleMessagesUpdate(newMessages) {
    if (selectedId) {
      chatCache.current[selectedId] = newMessages;
    }
    setMessages(newMessages);
  }

  // ── Polling ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadIncidents();
    const t = setInterval(async () => {
      await loadIncidents();
      if (selectedId) await loadDetail(selectedId);
    }, 2000);
    return () => clearInterval(t);
  }, [loadIncidents, loadDetail, selectedId]);

  // ── Infra page ──────────────────────────────────────────────────────────
  if (page === 'infra') {
    return <InfraPage onGoToIncidents={() => setPage('incidents')} />;
  }

  // ── Incidents page ──────────────────────────────────────────────────────
  return (
    <>
      <Topbar incidents={incidents} onGoHome={() => setPage('infra')} />
      <div className="layout">
        <IncidentList
          incidents={incidents}
          selectedId={selectedId}
          onSelect={selectIncident}
        />
        <div className="right">
          <RCAPanel incident={selectedIncident} />
          <ChatPanel
            incident={selectedIncident}
            messages={messages}
            onMessagesUpdate={handleMessagesUpdate}
          />
        </div>
      </div>
    </>
  );
}