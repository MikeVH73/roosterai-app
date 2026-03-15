/**
 * SchedulePromptBuilder
 * 
 * Builds a structured, department-by-department prompt for the AI scheduler.
 * Each department section lists ONLY the employees who can work there,
 * clearly separated into PREFERRED and BACKUP workers.
 */

const daysOfWeekNames = { 0: 'zondag', 1: 'maandag', 2: 'dinsdag', 3: 'woensdag', 4: 'donderdag', 5: 'vrijdag', 6: 'zaterdag' };

export function calcHoursFromTime(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
}

/**
 * For each department in this schedule, build a list of PREFERRED and BACKUP employees.
 * Returns: { [deptId]: { preferred: [...], backup: [...] } }
 */
function buildDeptEmployeeMap(scheduleDepts, relevantEmployees, functions) {
  const result = {};
  
  for (const dept of scheduleDepts) {
    result[dept.id] = { preferred: [], backup: [] };
    
    for (const emp of relevantEmployees) {
      const empDepts = emp.departmentIds || [];
      if (!empDepts.includes(dept.id)) continue;
      
      const func = functions.find(f => f.id === emp.functionId);
      const empInfo = {
        id: emp.id,
        naam: `${emp.first_name} ${emp.last_name}`,
        functieId: emp.functionId,
        functieNaam: func?.name || 'Onbekend',
        maxWeek: emp._maxThisWeek || 0,
        contractUren: emp.contract_hours || emp.contractUren || 0,
      };
      
      // Check function match — HARD FILTER: skip employees with wrong function entirely
      if (dept.allowedFunctionIds?.length > 0 && !dept.allowedFunctionIds.includes(emp.functionId)) {
        // Do NOT include this employee for this department at all
        continue;
      }
      
      const isPreferred = (emp.preferred_departmentIds || []).includes(dept.id);
      const isBackup = (emp.backup_departmentIds || []).includes(dept.id);
      
      // If employee has no preferred/backup labels at all, treat as preferred
      const hasLabels = (emp.preferred_departmentIds?.length > 0 || emp.backup_departmentIds?.length > 0);
      
      if (isPreferred || (!hasLabels && !isBackup)) {
        result[dept.id].preferred.push(empInfo);
      } else if (isBackup) {
        result[dept.id].backup.push(empInfo);
      }
    }
  }
  return result;
}

/**
 * Build shift requirements grouped by department > daypart > day.
 * Returns an array of department blocks, each containing its daypart requirements.
 */
function buildDeptRequirementBlocks(scheduleDepts, scheduleDayparts, staffingReqs, weekDates, daypartHoursMap) {
  const blocks = [];
  
  for (const dept of scheduleDepts) {
    const deptDayparts = scheduleDayparts.filter(dp => dp.departmentId === dept.id);
    const deptReqs = staffingReqs.filter(r => r.departmentId === dept.id);
    
    if (deptReqs.length === 0) continue;
    
    const shiftLines = [];
    let deptShiftCount = 0;
    
    for (const dp of deptDayparts) {
      const dpReqs = deptReqs.filter(r => r.daypartId === dp.id && r.targetHours > 0);
      if (dpReqs.length === 0) continue;
      
      const nettoUren = daypartHoursMap[dp.id] || 0;
      const brutoUren = calcHoursFromTime(dp.startTime, dp.endTime);
      const dpBreak = dp.break_duration || 0;
      
      for (const r of dpReqs) {
        const dayNum = r.day_of_week;
        const dayName = daysOfWeekNames[dayNum] || `dag ${dayNum}`;
        const dateStr = weekDates[dayNum] || 'ONBEKEND';
        const shiftsNeeded = r.min_staff || 1;
        deptShiftCount += shiftsNeeded;
        
        shiftLines.push({
          daypartId: dp.id,
          daypartName: dp.name,
          dayNum,
          dayName,
          dateStr,
          startTime: dp.startTime,
          endTime: dp.endTime,
          breakDuration: dpBreak,
          nettoUren,
          brutoUren,
          targetHours: r.targetHours,
          shiftsNeeded,
        });
      }
    }
    
    // Sort by day of week, then by start time
    shiftLines.sort((a, b) => a.dayNum - b.dayNum || a.startTime.localeCompare(b.startTime));
    
    blocks.push({
      deptId: dept.id,
      deptName: dept.name,
      shiftLines,
      totalShifts: deptShiftCount,
    });
  }
  
  return blocks;
}

/**
 * Main function: builds the complete structured prompt.
 */
export function buildSchedulePrompt({
  companyName,
  scheduleLocationId,
  locationName,
  weekStartStr,
  weekEndStr,
  monthStartStr,
  monthEndStr,
  scheduleDepts,
  scheduleDayparts,
  relevantEmployees,
  staffingReqs,
  weekDates,
  daypartHoursMap,
  functions,
  totalAvailableHours,
  totalNeededHours,
}) {
  const deptEmployeeMap = buildDeptEmployeeMap(scheduleDepts, relevantEmployees, functions);
  const deptBlocks = buildDeptRequirementBlocks(scheduleDepts, scheduleDayparts, staffingReqs, weekDates, daypartHoursMap);
  
  let totalShiftsNeeded = deptBlocks.reduce((sum, b) => sum + b.totalShifts, 0);
  
  // Calculate total targetHours per department for the week (= bezettingsnorm)
  const deptWeekTargetHours = {};
  for (const block of deptBlocks) {
    let totalTarget = 0;
    for (const s of block.shiftLines) {
      totalTarget += s.targetHours * s.shiftsNeeded;
    }
    deptWeekTargetHours[block.deptId] = totalTarget;
  }
  const grandTotalTargetHours = Object.values(deptWeekTargetHours).reduce((a, b) => a + b, 0);
  
  // Build the per-department sections
  const deptSections = deptBlocks.map(block => {
    const empMap = deptEmployeeMap[block.deptId] || { preferred: [], backup: [] };
    const weekTarget = deptWeekTargetHours[block.deptId] || 0;
    
    // Format employees for this department
    const prefLines = empMap.preferred.map(e => {
      return `    ✅ ID="${e.id}" ${e.naam} (${e.functieNaam}) contract=${e.contractUren}u/week max_deze_week=${e.maxWeek}u`;
    });
    const backupLines = empMap.backup.map(e => {
      return `    🔶 ID="${e.id}" ${e.naam} (${e.functieNaam}) contract=${e.contractUren}u/week max_deze_week=${e.maxWeek}u`;
    });
    
    // Format shift requirements as a table
    const shiftTable = block.shiftLines.map(s => 
      `  ${s.dayName} ${s.dateStr} | ${s.daypartName} | ${s.startTime}-${s.endTime} | ${s.nettoUren}u netto | pauze=${s.breakDuration}min | ${s.shiftsNeeded} medewerker(s) nodig | daypartId="${s.daypartId}"`
    ).join('\n');
    
    return `
═══════════════════════════════════════
AFDELING: ${block.deptName} (ID="${block.deptId}")
═══════════════════════════════════════
WEEKNORM BEZETTING: ${weekTarget} uren totaal deze week
TOTAAL: ${block.totalShifts} shifts nodig

SHIFT-OPDRACHTEN:
${shiftTable}

BESCHIKBARE MEDEWERKERS (VOORKEUR - gebruik EERST):
${prefLines.length > 0 ? prefLines.join('\n') : '    (geen voorkeur-medewerkers)'}

BACK-UP MEDEWERKERS (ALLEEN als voorkeur niet beschikbaar):
${backupLines.length > 0 ? backupLines.join('\n') : '    (geen back-up medewerkers)'}
`;
  }).join('\n');
  
  // Build employee overview with target shifts calculation
  const empOverview = relevantEmployees.map(e => {
    const func = functions.find(f => f.id === e.functionId);
    return `  ID="${e.id}" ${e.first_name} ${e.last_name} (${func?.name || 'Onbekend'}): contract=${e.contractUren || e.contract_hours || 0}u/week, max_deze_week=${e._maxThisWeek}u (maand: ${e._alreadyPlanned}/${e._monthlyMax}u)`;
  }).join('\n');
  
  const prompt = `Je bent de AI Planning Assistent voor ${companyName}.

OPDRACHT: Genereer een weekrooster voor ${weekStartStr} t/m ${weekEndStr}.
Locatie: ${locationName} (ID="${scheduleLocationId}")

════════════════════════════════
STAP-VOOR-STAP INSTRUCTIES
════════════════════════════════

STAP 1: Lees per AFDELING de shift-opdrachten en beschikbare medewerkers.
STAP 2: Wijs EERST voorkeur-medewerkers (✅) toe. Gebruik backup (🔶) ALLEEN als er niet genoeg voorkeur is.
STAP 3: Verdeel uren EERLIJK over alle medewerkers. Elke medewerker moet zoveel mogelijk richting zijn contract-uren komen.
  - Bereken per medewerker: hoeveel diensten = contracturen / netto uren per dienst (afgerond).
  - Verdeel deze diensten over de week. Geef NIET alle diensten aan 1 of 2 medewerkers.
STAP 4: Houd per medewerker een running total bij. STOP zodra max_deze_week bereikt is.
STAP 5: Als een shift niet gevuld kan worden, meld het in unresolved_issues.

════════════════════════════════
HARDE REGELS (KRITIEK - VOLG EXACT)
════════════════════════════════

1. GEBRUIK ALLEEN medewerkers uit de ✅ en 🔶 lijsten per afdeling. Er staan ALLEEN medewerkers met de JUISTE FUNCTIE in deze lijsten.
2. GEBRUIK ALLEEN ID's uit deze prompt. Kopieer letterlijk.
3. MAX 1 SHIFT PER MEDEWERKER PER DAGDEEL PER DAG. Twee verschillende dagdelen op dezelfde dag MAG.
4. EXACT AANTAL SHIFTS: Maak PRECIES het aantal shifts dat in elke shift-opdracht staat (het "medewerker(s) nodig" getal). NOOIT MEER.
5. VOORKEUR IS VERPLICHT: Gebruik ALLEEN ✅-medewerkers. Gebruik 🔶 back-up medewerkers UITSLUITEND als er voor een specifieke shift-opdracht GEEN ENKELE ✅-medewerker meer beschikbaar is.
6. EERLIJKE URENVERDELING: Elke medewerker moet zo dicht mogelijk bij zijn contracturen komen. Vermijd dat sommigen veel te weinig en anderen te veel krijgen.
7. URENBUDGET: NOOIT meer plannen dan max_deze_week. Bij twijfel → minder plannen.
8. TIJDEN: Kopieer start_time, end_time en break_duration EXACT uit de shift-opdracht.
9. ELKE shift-opdracht MOET gevuld worden met PRECIES het gevraagde aantal, tenzij er echt niemand beschikbaar is.
10. GEEN EXTRA SHIFTS: Het totaal aantal shifts in je antwoord moet EXACT gelijk zijn aan het totaal hieronder. Niet meer, niet minder.

════════════════════════════════
AFDELINGEN & OPDRACHTEN
════════════════════════════════
${deptSections}

════════════════════════════════
URENBUDGET ALLE MEDEWERKERS
════════════════════════════════
${empOverview}

CAPACITEIT: ${totalAvailableHours}u beschikbaar van medewerkers, ${Math.round(grandTotalTargetHours)}u bezettingsnorm, ~${Math.round(totalNeededHours)}u nodig in shifts.
TOTAAL SHIFTS: ${totalShiftsNeeded}

BELANGRIJK: De BEZETTINGSNORM (${Math.round(grandTotalTargetHours)}u) is hoeveel uur er totaal ingevuld moet worden.
Verdeel dit eerlijk over alle beschikbare medewerkers op basis van hun contracturen.

════════════════════════════════
VOORBEELD SHIFT-OBJECT
════════════════════════════════
{
  "employeeId": "exact-hex-id-uit-lijst",
  "departmentId": "exact-hex-id-uit-lijst",
  "locationId": "${scheduleLocationId}",
  "daypartId": "exact-hex-id-uit-shift-opdracht",
  "date": "YYYY-MM-DD",
  "start_time": "HH:mm",
  "end_time": "HH:mm",
  "break_duration": 0
}`;

  return { prompt, totalShiftsNeeded };
}