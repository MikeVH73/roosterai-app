/**
 * tasks/vervanging.js
 * Vervangerszoekopdracht voor een ziek-gemelde medewerker.
 *
 * Logica (uit het plan):
 *
 * HARDE UITSLUITINGSCRITERIA
 *   1. Al ingeroosterd op hetzelfde tijdstip (overlappende shift op zelfde datum)
 *   2. Heeft niet de vereiste vaardigheidId / functionId voor de dienst
 *
 * SCORINGSFACTOREN (hogere score = betere match)
 *   +30  Afdelingsvoorkeur bevat de gevraagde afdeling
 *   +20  Contracturen nog beschikbaar (geen overuren — maandbudget)
 *   +10  ≥ 11 uur rust na vorige dienst
 *
 * 1e LIJN: kandidaten met score > 0
 * 2e LIJN: alle beschikbare (niet dubbel ingeroosterd + juiste skills), ongeacht voorkeur
 *
 * Output: schrijft AISuggestion naar Firestore met resultaat.
 */

'use strict';

const { query, updateDoc, createDoc } = require('../lib/firestore');
const { ask } = require('../lib/claude');

/**
 * @param {object} issue       – Paperclip issue object
 * @param {object} issue.metadata
 * @param {string} issue.id
 */
async function runVervanging(issue) {
  const { companyId, shiftId, employeeId, date, scheduleId, sickReportId } = issue.metadata || {};
  if (!companyId || !shiftId) throw new Error('Missing companyId or shiftId in metadata');

  // ─── 1. Laad de te vervangen dienst ───────────────────────────────────────
  const shifts = await query('shifts', { id: shiftId });
  const targetShift = shifts[0];
  if (!targetShift) throw new Error(`Shift ${shiftId} niet gevonden`);

  const { start_time, end_time, functionId, departmentId, locationId } = targetShift;

  // ─── 2. Laad alle actieve medewerkers van het bedrijf ─────────────────────
  const allEmployees = await query('employee_profiles', { companyId, status: 'active' });

  // ─── 3. Laad alle diensten op dezelfde datum (overlap-check) ──────────────
  const shiftsOnDate = await query('shifts', { companyId, date });

  // ─── 4. Bereken totale shifts per medewerker deze maand (contracturen) ────
  const yearMonth = date.slice(0, 7); // 'yyyy-MM'
  const allShiftsThisMonth = await query('shifts', { companyId });
  const shiftsThisMonth = allShiftsThisMonth.filter(s => s.date.startsWith(yearMonth));

  function totalHoursInMonth(empId) {
    return shiftsThisMonth
      .filter(s => s.employeeId === empId)
      .reduce((acc, s) => {
        const [sh, sm] = s.start_time.split(':').map(Number);
        const [eh, em] = s.end_time.split(':').map(Number);
        let h = (eh * 60 + em - sh * 60 - sm) / 60;
        if (h < 0) h += 24;
        return acc + h;
      }, 0);
  }

  function lastShiftEndBefore(empId, dateStr) {
    // De meest recente shift vóór dateStr
    const prev = allShiftsThisMonth
      .filter(s => s.employeeId === empId && s.date < dateStr)
      .sort((a, b) => (a.date > b.date ? -1 : 1));
    return prev[0] || null;
  }

  function shiftEndDateTime(shift) {
    const [h, m] = shift.end_time.split(':').map(Number);
    const d = new Date(`${shift.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
    return d;
  }

  function shiftStartDateTime(shift) {
    const [h, m] = shift.start_time.split(':').map(Number);
    return new Date(`${shift.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
  }

  // ─── 5. Bouw kandidatenlijst met scores ──────────────────────────────────
  const scored = [];

  for (const emp of allEmployees) {
    // Sla de ziek-gemelde medewerker zelf over
    if (emp.id === employeeId) continue;

    // Harde uitsluitingscriteria
    const alreadyScheduled = shiftsOnDate.some(
      s => s.employeeId === emp.id && s.id !== shiftId &&
        // Eenvoudige tijdoverlap-check (zelfde dag is al voldoende als filter)
        true
    );
    if (alreadyScheduled) continue;

    // Vereiste functie
    if (functionId && emp.functionId && emp.functionId !== functionId) continue;

    // Scoren
    let score = 0;

    // +30 afdelingsvoorkeur
    if (emp.department_preferences?.includes(departmentId)) score += 30;

    // +20 contracturen: minder dan contracturen verbruikt
    const contractHoursPerMonth = (emp.contract_hours || 0) * 4; // ruw: wekelijks * 4 weken
    const usedHours = totalHoursInMonth(emp.id);
    if (contractHoursPerMonth > 0 && usedHours < contractHoursPerMonth) score += 20;

    // +10 voldoende rust (≥ 11u na vorige dienst)
    const prevShift = lastShiftEndBefore(emp.id, date);
    if (prevShift) {
      const prevEnd = shiftEndDateTime(prevShift);
      const thisStart = shiftStartDateTime(targetShift);
      const restHours = (thisStart - prevEnd) / 3600000;
      if (restHours >= 11) score += 10;
    } else {
      // Geen vorige dienst → rustig genoeg
      score += 10;
    }

    scored.push({ emp, score });
  }

  // ─── 6. Selecteer 1e en 2e lijn ──────────────────────────────────────────
  const firstLine = scored.filter(c => c.score > 0).sort((a, b) => b.score - a.score);
  const secondLine = scored.filter(c => c.score === 0).sort((a, b) =>
    (a.emp.first_name + a.emp.last_name).localeCompare(b.emp.first_name + b.emp.last_name)
  );

  const topCandidates = (firstLine.length > 0 ? firstLine : secondLine).slice(0, 5);

  // ─── 7. Claude-motivatie (alleen voor top-5) ─────────────────────────────
  let aiMotivation = '';
  if (topCandidates.length > 0) {
    const candidateList = topCandidates
      .map((c, i) => `${i + 1}. ${c.emp.first_name} ${c.emp.last_name} (score ${c.score})`)
      .join('\n');

    aiMotivation = await ask(
      'Je bent een roosterplanner. Geef een korte motivatie (max 80 woorden) waarom de top-kandidaten geschikt zijn als vervanger. Schrijf in het Nederlands.',
      `Dienst: ${date} ${start_time}-${end_time}, afdeling-ID: ${departmentId}.\n\nTop-kandidaten:\n${candidateList}`
    );
  }

  // ─── 8. Sla AISuggestion op in Firestore ─────────────────────────────────
  const suggestionId = await createDoc('ai_suggestions', {
    companyId,
    type: 'vervanging',
    status: 'pending',
    scheduleId: scheduleId || null,
    shiftId,
    relatedEmployeeId: employeeId,
    date,
    source: 'paperclip',
    paperclip_issue_id: issue.id,
    suggestion: {
      firstLine: firstLine.map(c => ({
        employeeId: c.emp.id,
        name: `${c.emp.first_name} ${c.emp.last_name}`,
        score: c.score,
      })),
      secondLine: secondLine.map(c => ({
        employeeId: c.emp.id,
        name: `${c.emp.first_name} ${c.emp.last_name}`,
        score: c.score,
      })),
      aiMotivation,
    },
  });

  // ─── 9. Markeer sick_report als 'agent_working' ──────────────────────────
  if (sickReportId) {
    await updateDoc('sick_reports', sickReportId, { status: 'agent_working' });
  }

  return { suggestionId, topCandidatesCount: topCandidates.length };
}

module.exports = { runVervanging };
