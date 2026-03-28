/**
 * lib/paperclip.js
 * Helpers voor het Paperclip heartbeat-protocol.
 *
 * Verwachte env-vars:
 *   PAPERCLIP_API_URL   – bijv. http://localhost:3100
 *   PAPERCLIP_API_KEY   – lang-levende agent API key
 */

function apiUrl(path) {
  const base = (process.env.PAPERCLIP_API_URL || '').replace(/\/$/, '');
  return `${base}${path}`;
}

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.PAPERCLIP_API_KEY}`,
  };
}

// ─── Agent identity ────────────────────────────────────────────────────────

async function getMe() {
  const res = await fetch(apiUrl('/api/agents/me'), { headers: headers() });
  if (!res.ok) throw new Error(`GET /api/agents/me → ${res.status}`);
  return res.json();
}

// ─── Issues / tasks ────────────────────────────────────────────────────────

/**
 * Haal de open taken op die aan deze agent zijn toegewezen.
 * @param {string} agentId
 * @returns {Promise<object[]>}
 */
async function listMyIssues(agentId) {
  const res = await fetch(
    apiUrl(`/api/agents/${agentId}/issues?status=open`),
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`GET issues → ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.issues || []);
}

/**
 * Claim een taak (optimistic lock). Gooit fout bij 409 (al geclaimd).
 * @param {string} issueId
 */
async function checkoutIssue(issueId) {
  const res = await fetch(apiUrl(`/api/issues/${issueId}/checkout`), {
    method: 'POST',
    headers: headers(),
  });
  if (res.status === 409) throw new Error('ALREADY_CLAIMED');
  if (!res.ok) throw new Error(`checkout → ${res.status}`);
}

/**
 * Markeer taak als afgerond.
 * @param {string} issueId
 * @param {string} [comment]
 */
async function doneIssue(issueId, comment = '') {
  const body = { status: 'done' };
  if (comment) body.comment = comment;
  const res = await fetch(apiUrl(`/api/issues/${issueId}`), {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH done → ${res.status}`);
}

/**
 * Voeg een comment toe aan een taak.
 * @param {string} issueId
 * @param {string} text
 */
async function commentIssue(issueId, text) {
  const res = await fetch(apiUrl(`/api/issues/${issueId}/comments`), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ text }),
  });
  if (!res.ok) console.warn(`comment → ${res.status}`);
}

module.exports = { getMe, listMyIssues, checkoutIssue, doneIssue, commentIssue };
