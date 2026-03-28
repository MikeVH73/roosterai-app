/**
 * lib/claude.js
 * Thin Anthropic SDK wrapper voor agent scripts.
 *
 * Verwachte env-var:
 *   ANTHROPIC_API_KEY
 */

const Anthropic = require('@anthropic-ai/sdk');

let _client = null;

function getClient() {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY env var not set');
  _client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

/**
 * Roept Claude aan en retourneert de tekst-response.
 *
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {object} [options]
 * @param {string} [options.model]      - default: claude-sonnet-4-6
 * @param {number} [options.maxTokens]  - default: 1024
 * @returns {Promise<string>}
 */
async function ask(systemPrompt, userMessage, options = {}) {
  const { model = 'claude-sonnet-4-6', maxTokens = 1024 } = options;
  const response = await getClient().messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  return response.content[0]?.text || '';
}

module.exports = { ask };
