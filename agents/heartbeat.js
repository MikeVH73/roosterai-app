/**
 * heartbeat.js
 * Paperclip agent hoofdscript — volgt het 8-staps heartbeat-protocol.
 *
 * Stap 1  GET /api/agents/me                  → eigen agent-ID ophalen
 * Stap 2  GET /api/agents/:id/issues           → open taken ophalen
 * Stap 3  POST /api/issues/:id/checkout        → taak claimen (stop bij 409)
 * Stap 4  dispatch op metadata.taskType        → juiste task-handler aanroepen
 * Stap 5  (in task-handler) Firestore lezen
 * Stap 6  (in task-handler) Claude aanroepen indien nodig
 * Stap 7  (in task-handler) AISuggestion schrijven naar Firestore
 * Stap 8  PATCH /api/issues/:id  { status: 'done' }
 *
 * Gebruik:
 *   node heartbeat.js
 *
 * Env-vars (vereist):
 *   PAPERCLIP_API_URL         bijv. http://localhost:3100
 *   PAPERCLIP_API_KEY         lang-levende agent API key
 *   FIREBASE_SERVICE_ACCOUNT  pad naar serviceAccount.json of inline JSON
 *   ANTHROPIC_API_KEY         Anthropic API key (voor AI-taken)
 */

'use strict';

const { getMe, listMyIssues, checkoutIssue, doneIssue, commentIssue } = require('./lib/paperclip');
const { runVervanging } = require('./tasks/vervanging');

// ─── Dispatcher ────────────────────────────────────────────────────────────

const TASK_HANDLERS = {
  vervanging: runVervanging,
  // Voeg hier later toe: verlof_analyse, ruil_check, optimalisatie, deterministisch
};

// ─── Heartbeat loop ────────────────────────────────────────────────────────

async function heartbeat() {
  // Stap 1 — eigen identiteit ophalen
  const me = await getMe();
  const agentId = me.id;
  console.log(`[heartbeat] Agent: ${me.name || agentId}`);

  // Stap 2 — open taken ophalen
  const issues = await listMyIssues(agentId);
  console.log(`[heartbeat] ${issues.length} open taken`);

  if (issues.length === 0) {
    console.log('[heartbeat] Niets te doen.');
    return;
  }

  for (const issue of issues) {
    const taskType = issue.metadata?.taskType;
    console.log(`\n[heartbeat] Taak ${issue.id} — type: ${taskType}`);

    // Stap 3 — claimen (stop bij conflict)
    try {
      await checkoutIssue(issue.id);
    } catch (err) {
      if (err.message === 'ALREADY_CLAIMED') {
        console.log(`[heartbeat]   → Al geclaimd, sla over.`);
        continue;
      }
      throw err;
    }

    // Stap 4-7 — dispatch
    const handler = TASK_HANDLERS[taskType];
    if (!handler) {
      console.warn(`[heartbeat]   → Geen handler voor taskType '${taskType}'`);
      await doneIssue(issue.id, `Geen handler beschikbaar voor taskType '${taskType}'`);
      continue;
    }

    try {
      const result = await handler(issue);
      const summary = JSON.stringify(result || {});
      console.log(`[heartbeat]   → Klaar: ${summary}`);

      // Stap 8 — done
      await doneIssue(issue.id, summary);
    } catch (err) {
      console.error(`[heartbeat]   → Fout bij verwerking:`, err.message);
      await commentIssue(issue.id, `Fout: ${err.message}`).catch(() => {});
      // Niet als done markeren — Paperclip kan opnieuw proberen
    }
  }
}

// ─── Opstarten ─────────────────────────────────────────────────────────────

heartbeat()
  .then(() => {
    console.log('\n[heartbeat] Klaar.');
    process.exit(0);
  })
  .catch(err => {
    console.error('[heartbeat] Fatale fout:', err);
    process.exit(1);
  });
