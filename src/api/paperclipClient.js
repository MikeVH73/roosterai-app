/**
 * paperclipClient.js
 * Frontend wrapper voor de createPaperclipTask Cloud Function.
 * De Paperclip API key blijft altijd server-side; de browser roept alleen
 * de Firebase Cloud Function aan (met Firebase ID token als auth).
 */

import { auth } from './firebaseClient';

const FUNCTION_URL = import.meta.env.VITE_CREATE_PAPERCLIP_TASK_URL;

/**
 * Maak een Paperclip taak aan voor een AI agent.
 *
 * @param {object} options
 * @param {string} options.taskType        - 'vervanging' | 'optimalisatie' | 'conflicten' | 'verlof_analyse' | 'ruil_check' | 'deterministisch'
 * @param {string} options.companyId       - Firebase company ID
 * @param {string} options.assigneeAgentId - Paperclip agent ID die de taak oppakt
 * @param {string} options.goalId          - Paperclip goal ID (planning)
 * @param {string} [options.title]         - Optionele taaktitel (anders auto-gegenereerd)
 * @param {object} [options.metadata]      - Extra context: scheduleId, shiftId, employeeId, date, etc.
 * @returns {Promise<{ issueId: string, title: string }>}
 */
export async function createPaperclipTask({
  taskType,
  companyId,
  assigneeAgentId,
  goalId,
  title,
  metadata = {},
}) {
  if (!FUNCTION_URL) {
    throw new Error('VITE_CREATE_PAPERCLIP_TASK_URL is niet geconfigureerd in .env.local');
  }

  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Niet ingelogd');

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ taskType, companyId, assigneeAgentId, goalId, title, metadata }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Paperclip taak aanmaken mislukt');
  return data; // { issueId, title }
}
