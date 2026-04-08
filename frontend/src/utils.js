export function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso.endsWith('Z') ? iso : iso + 'Z').getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  return Math.floor(m / 60) + 'h ago';
}

export function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso.endsWith('Z') ? iso : iso + 'Z')
    .toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function colorClass(s) {
  if (['resolved', 'auto_resolved'].includes(s)) return 'green';
  if (s === 'investigating') return 'amber';
  return 'red';
}

export function parseJson(val, fallback = []) {
  if (!val) return fallback;
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export function formatBobResponse(text) {
  if (!text) return '';
  text = text
    .replace(/\[using tool attempt_completion.*?---output---/gs, '')
    .replace(/---output---/g, '')
    .replace(/\[using tool \w.*?\]/g, '')
    .trim();
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  const lines = text.split('\n');
  let html = '';
  let inList = false;
  for (let line of lines) {
    line = line.trim();
    if (!line) {
      if (inList) { html += '</ol>'; inList = false; }
      html += '<br>';
      continue;
    }
    const listMatch = line.match(/^(\d+)[.)]\s+(.+)/);
    if (listMatch) {
      if (!inList) { html += '<ol style="margin:6px 0 6px 16px;padding:0">'; inList = true; }
      html += '<li style="margin:3px 0;line-height:1.6">' + listMatch[2] + '</li>';
    } else {
      if (inList) { html += '</ol>'; inList = false; }
      if (/^[A-Z][A-Z ]+:/.test(line)) {
        html += '<div style="font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:var(--dim);margin:10px 0 4px;text-transform:uppercase">' + line + '</div>';
      } else {
        html += '<div style="margin:2px 0">' + line + '</div>';
      }
    }
  }
  if (inList) html += '</ol>';
  return html || text;
}
