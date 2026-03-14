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
        contractUren: emp.contract_hours || 0,
      };
      
      // Check function match
      if (dept.allowedFunctionIds?.length > 0 && !dept.allowedFunctionIds.includes(emp.functionId)) {
        empInfo.functieMismatch = true;
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
  
  // Build the per-department sections
  const deptSections = deptBlocks.map(block => {
    const empMap = deptEmployeeMap[block.deptId] || { preferred: [], backup: [] };
    
    // Format employees for this department
    const prefLines = empMap.preferred.map(e => {
      const warn = e.functieMismatch ? ' ⚠️FUNCTIE-MISMATCH' : '';
      return `    ✅ ID="${e.id}" ${e.naam} (${e.functieNaam}) max=${e.maxWeek}u/week${warn}`;
    });
    const backupLines = empMap.backup.map(e => {
      const warn = e.functieMismatch ? ' ⚠️FUNCTIE-MISMATCH' : '';
      return `    🔶 ID="${e.id}" ${e.naam} (${e.functieNaam}) max=${e.maxWeek}u/week${warn}`;
    });
    
    // Format shift requirements as a table
    const shiftTable = block.shiftLines.map(s => 
      `  ${s.dayName} ${s.dateStr} | ${s.daypartName} | ${s.startTime}-${s.endTime} | ${s.nettoUren}u netto | pauze=${s.breakDuration}min | ${s.shiftsNeeded} medewerker(s) nodig | daypartId="${s.daypartId}"`
    ).join('\n');
    
    return `
═══════════════════════════════════════
AFDELING: ${block.deptName} (ID="${block.deptId}")
═══════════════════════════════════════
TOTAAL: ${block.totalShifts} shifts nodig

SHIFT-OPDRACHTEN:
${shiftTable}

BESCHIKBARE MEDEWERKERS (VOORKEUR - gebruik EERST):
${prefLines.length > 0 ? prefLines.join('\n') : '    (geen voorkeur-medewerkers)'}

BACK-UP MEDEWERKERS (ALLEEN als voorkeur niet beschikbaar):
${backupLines.length > 0 ? backupLines.join('\n') : '    (geen back-up medewerkers)'}
`;
  }).join('\n');
  
  // Build simple employee overview with remaining hours tracking
  const empOverview = relevantEmployees.map(e => {
    return `  ID="${e.id}" ${e.first_name} ${e.last_name}: max=${e._maxThisWeek}u/week (maand: ${e._alreadyPlanned}/${e._monthlyMax}u)`;
  }).join('\n');
  
  const prompt = `Je bent de AI Planning Assistent voor ${companyName}.

OPDRACHT: Genereer een weekrooster voor ${weekStartStr} t/m ${weekEndStr}.
Locatie: ${locationName} (ID="${scheduleLocationId}")

════════════════════════════════
STAP-VOOR-STAP INSTRUCTIES
════════════════════════════════

STAP 1: Lees per AFDELING de shift-opdrachten en beschikbare medewerkers.
STAP 2: Wijs EERST voorkeur-medewerkers (✅) toe. Gebruik backup (🔶) ALLEEN als er niet genoeg voorkeur is.
STAP 3: Houd het weekbudget bij: elke shift kost X netto uren. STOP als een medewerker op max zit.
STAP 4: Als een shift niet gevuld kan worden, meld het in unresolved_issues.

════════════════════════════════
HARDE REGELS (KRITIEK - VOLG EXACT)
════════════════════════════════

1. GEBRUIK ALLEEN ID's uit deze prompt. Kopieer letterlijk.
2. MAX 1 SHIFT PER MEDEWERKER PER DAGDEEL PER DAG. Twee verschillende dagdelen op dezelfde dag MAG.
3. EXACT AANTAL SHIFTS: Maak PRECIES het aantal shifts dat in elke shift-opdracht staat (het "medewerker(s) nodig" getal). NOOIT MEER. Als er staat "1 medewerker(s) nodig", maak dan EXACT 1 shift voor dat dagdeel op die dag.
4. VOORKEUR IS VERPLICHT: Gebruik ALLEEN ✅-medewerkers. Gebruik 🔶 back-up medewerkers UITSLUITEND als er voor een specifieke shift-opdracht GEEN ENKELE ✅-medewerker meer beschikbaar is (alle op max uren of al ingepland op dat dagdeel).
5. FUNCTIE-MISMATCH: Medewerkers met ⚠️FUNCTIE-MISMATCH alleen als allerlaatste optie.
6. URENBUDGET: NOOIT meer plannen dan max uren/week. Bij twijfel → minder plannen.
7. TIJDEN: Kopieer start_time, end_time en break_duration EXACT uit de shift-opdracht.
8. ELKE shift-opdracht MOET gevuld worden met PRECIES het gevraagde aantal, tenzij er echt niemand beschikbaar is.
9. GEEN EXTRA SHIFTS: Het totaal aantal shifts in je antwoord moet EXACT gelijk zijn aan het totaal hieronder. Niet meer, niet minder.

════════════════════════════════
AFDELINGEN & OPDRACHTEN
════════════════════════════════
${deptSections}

════════════════════════════════
URENBUDGET ALLE MEDEWERKERS
════════════════════════════════
${empOverview}

CAPACITEIT: ${totalAvailableHours}u beschikbaar, ~${Math.round(totalNeededHours)}u nodig.
TOTAAL SHIFTS: ${totalShiftsNeeded}

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