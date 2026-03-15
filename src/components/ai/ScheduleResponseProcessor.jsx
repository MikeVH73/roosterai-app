/**
 * ScheduleResponseProcessor
 * 
 * Validates, corrects, and filters AI-generated shifts before saving to DB.
 * Handles: ID validation, preference enforcement, budget checks, dedup, time correction.
 */

import { calcHoursFromTime } from './SchedulePromptBuilder';

/**
 * Process AI response shifts through all validation stages.
 * Returns { validShifts, issues } where issues is a categorized log.
 */
export function processAIShifts({
  aiShifts,
  relevantEmployees,
  allEmployees,
  scheduleDepts,
  scheduleDayparts,
  daypartHoursMap,
  alreadyPlannedHours,
  nameToIdMap,
  staffingReqs,
}) {
  const issues = {
    idResolution: [],
    preferenceWarnings: [],
    budgetRejected: [],
    duplicateSkipped: [],
    timeCorrected: [],
    invalid: [],
  };
  
  // Build lookup maps
  const validEmployeeIds = new Set(relevantEmployees.map(e => e.id));
  const allEmployeeIds = new Set(allEmployees.map(e => e.id));
  const daypartLookup = {};
  scheduleDayparts.forEach(dp => { daypartLookup[dp.id] = dp; });
  
  // Stage 1: Resolve and validate employee IDs
  const resolvedShifts = [];
  for (const shift of aiShifts) {
    if (!shift.employeeId) {
      issues.invalid.push(`Shift zonder medewerker op ${shift.date} — overgeslagen`);
      continue;
    }
    
    // Valid employee for this roster
    if (validEmployeeIds.has(shift.employeeId)) {
      resolvedShifts.push(shift);
      continue;
    }
    
    // Valid employee but wrong roster
    if (allEmployeeIds.has(shift.employeeId)) {
      const emp = allEmployees.find(e => e.id === shift.employeeId);
      const name = emp ? `${emp.first_name} ${emp.last_name}` : shift.employeeId;
      issues.idResolution.push(`⚠️ ${name} hoort niet bij dit rooster — shift overgeslagen`);
      continue;
    }
    
    // Try name resolution
    const resolvedId = nameToIdMap[shift.employeeId.toLowerCase().trim()];
    if (resolvedId && validEmployeeIds.has(resolvedId)) {
      issues.idResolution.push(`Naam→ID: "${shift.employeeId}" → ${resolvedId}`);
      shift.employeeId = resolvedId;
      resolvedShifts.push(shift);
    } else if (resolvedId) {
      const emp = allEmployees.find(e => e.id === resolvedId);
      const name = emp ? `${emp.first_name} ${emp.last_name}` : shift.employeeId;
      issues.idResolution.push(`⚠️ ${name} hoort niet bij dit rooster — shift overgeslagen`);
    } else {
      issues.idResolution.push(`❌ Onbekende medewerker: "${shift.employeeId}" — shift overgeslagen`);
    }
  }
  
  // Stage 2: Preference validation — STRICT enforcement
  // First pass: mark each shift as preferred, backup, or rejected
  for (const shift of resolvedShifts) {
    const emp = relevantEmployees.find(e => e.id === shift.employeeId);
    if (!emp) continue;
    
    const isPreferred = (emp.preferred_departmentIds || []).includes(shift.departmentId);
    const isBackup = (emp.backup_departmentIds || []).includes(shift.departmentId);
    const hasLabels = (emp.preferred_departmentIds?.length > 0 || emp.backup_departmentIds?.length > 0);
    
    if (hasLabels && !isPreferred && !isBackup) {
      const dept = scheduleDepts.find(d => d.id === shift.departmentId);
      issues.preferenceWarnings.push(
        `🔴 ${emp.first_name} ${emp.last_name} → ${dept?.name || shift.departmentId}: NIET in voorkeur OF backup — shift verwijderd`
      );
      shift._rejected = true;
    } else if (hasLabels && isBackup && !isPreferred) {
      shift._isBackup = true;
    }
  }
  
  // Second pass: reject backup shifts if there are unused preferred employees for that slot
  // Group shifts by daypartId + date to check per slot
  const slotShifts = {};
  for (const shift of resolvedShifts) {
    if (shift._rejected) continue;
    const key = `${shift.daypartId}_${shift.date}_${shift.departmentId}`;
    if (!slotShifts[key]) slotShifts[key] = [];
    slotShifts[key].push(shift);
  }
  
  for (const [key, shifts] of Object.entries(slotShifts)) {
    const preferredInSlot = shifts.filter(s => !s._isBackup);
    const backupInSlot = shifts.filter(s => s._isBackup);
    
    if (backupInSlot.length > 0 && preferredInSlot.length > 0) {
      // There are preferred employees already assigned — check if backup is truly needed
      // Count how many staff are required for this slot
      const sampleShift = shifts[0];
      const dayOfWeek = new Date(sampleShift.date).getDay();
      const reqMatch = staffingReqs?.find(r => 
        r.daypartId === sampleShift.daypartId && 
        r.departmentId === sampleShift.departmentId && 
        r.day_of_week === dayOfWeek
      );
      const neededStaff = reqMatch?.min_staff || 1;
      
      if (preferredInSlot.length >= neededStaff) {
        // Enough preferred staff — reject ALL backup shifts for this slot
        for (const bs of backupInSlot) {
          const emp = relevantEmployees.find(e => e.id === bs.employeeId);
          const dept = scheduleDepts.find(d => d.id === bs.departmentId);
          issues.preferenceWarnings.push(
            `🔴 ${emp?.first_name} ${emp?.last_name} → ${dept?.name || bs.departmentId} op ${bs.date}: BACK-UP niet nodig (${preferredInSlot.length} voorkeur al beschikbaar) — shift verwijderd`
          );
          bs._rejected = true;
        }
      } else {
        // Not enough preferred — allow only the needed number of backups
        const backupsNeeded = neededStaff - preferredInSlot.length;
        for (let i = 0; i < backupInSlot.length; i++) {
          if (i < backupsNeeded) {
            const emp = relevantEmployees.find(e => e.id === backupInSlot[i].employeeId);
            const dept = scheduleDepts.find(d => d.id === backupInSlot[i].departmentId);
            issues.preferenceWarnings.push(
              `🟡 ${emp?.first_name} ${emp?.last_name} → ${dept?.name || backupInSlot[i].departmentId} op ${backupInSlot[i].date} (BACK-UP nodig: ${preferredInSlot.length}/${neededStaff} voorkeur)`
            );
          } else {
            const emp = relevantEmployees.find(e => e.id === backupInSlot[i].employeeId);
            const dept = scheduleDepts.find(d => d.id === backupInSlot[i].departmentId);
            issues.preferenceWarnings.push(
              `🔴 ${emp?.first_name} ${emp?.last_name} → ${dept?.name || backupInSlot[i].departmentId} op ${backupInSlot[i].date}: BACK-UP overbodig (al genoeg) — shift verwijderd`
            );
            backupInSlot[i]._rejected = true;
          }
        }
      }
    } else if (backupInSlot.length > 0 && preferredInSlot.length === 0) {
      // Only backups in this slot — allow but warn
      for (const bs of backupInSlot) {
        const emp = relevantEmployees.find(e => e.id === bs.employeeId);
        const dept = scheduleDepts.find(d => d.id === bs.departmentId);
        issues.preferenceWarnings.push(
          `🟡 ${emp?.first_name} ${emp?.last_name} → ${dept?.name || bs.departmentId} op ${bs.date} (BACK-UP, geen voorkeur-medewerkers beschikbaar)`
        );
      }
    }
  }
  
  // Remove rejected shifts
  const prefFilteredShifts = resolvedShifts.filter(s => !s._rejected);
  
  // Stage 3: Deduplication (no same employee + department + date)
  const assignmentTracker = {};
  const dedupShifts = [];
  for (const shift of prefFilteredShifts) {
    const key = `${shift.date}_${shift.departmentId}_${shift.employeeId}`;
    if (assignmentTracker[key]) {
      const emp = relevantEmployees.find(e => e.id === shift.employeeId);
      issues.duplicateSkipped.push(
        `${emp?.first_name || shift.employeeId} al ingeroosterd bij ${shift.departmentId} op ${shift.date}`
      );
      continue;
    }
    assignmentTracker[key] = true;
    dedupShifts.push(shift);
  }
  
  // Stage 3.5: Cap shifts per department+daypart+day to staffing requirement
  const cappedShifts = [];
  if (staffingReqs && staffingReqs.length > 0) {
    const slotTracker = {}; // key: deptId_daypartId_dayOfWeek → count
    
    // Build a lookup: deptId_daypartId_dayOfWeek → max allowed shifts
    const maxPerSlot = {};
    for (const r of staffingReqs) {
      if (!r.targetHours || r.targetHours <= 0) continue;
      const key = `${r.departmentId}_${r.daypartId}_${r.day_of_week}`;
      maxPerSlot[key] = r.min_staff || 1;
    }
    
    for (const shift of dedupShifts) {
      const shiftDayOfWeek = new Date(shift.date).getDay();
      const key = `${shift.departmentId}_${shift.daypartId}_${shiftDayOfWeek}`;
      const maxAllowed = maxPerSlot[key];
      
      // If there is NO staffing requirement for this combination, reject the shift
      if (maxAllowed === undefined) {
        const emp = relevantEmployees.find(e => e.id === shift.employeeId);
        const dp = daypartLookup[shift.daypartId];
        const dept = scheduleDepts.find(d => d.id === shift.departmentId);
        issues.invalid.push(
          `🚫 Geen bezettingsnorm: ${emp?.first_name || shift.employeeId} op ${shift.date} ${dept?.name || ''} ${dp?.name || ''} — geen requirement gevonden, shift verwijderd`
        );
        continue;
      }
      
      const currentCount = slotTracker[key] || 0;
      if (currentCount >= maxAllowed) {
        const emp = relevantEmployees.find(e => e.id === shift.employeeId);
        const dp = daypartLookup[shift.daypartId];
        const dept = scheduleDepts.find(d => d.id === shift.departmentId);
        issues.invalid.push(
          `🚫 Overcapaciteit: ${emp?.first_name || shift.employeeId} op ${shift.date} ${dept?.name || ''} ${dp?.name || ''} — al ${currentCount}/${maxAllowed} ingepland, shift verwijderd`
        );
        continue;
      }
      slotTracker[key] = currentCount + 1;
      cappedShifts.push(shift);
    }
  } else {
    cappedShifts.push(...dedupShifts);
  }
  
  // Stage 4: Time correction (force daypart times)
  for (const shift of cappedShifts) {
    const dp = daypartLookup[shift.daypartId];
    if (dp) {
      if (shift.start_time !== dp.startTime || shift.end_time !== dp.endTime) {
        issues.timeCorrected.push(
          `${shift.date}: ${shift.start_time}-${shift.end_time} → ${dp.startTime}-${dp.endTime}`
        );
        shift.start_time = dp.startTime;
        shift.end_time = dp.endTime;
      }
      shift.break_duration = dp.break_duration || 0;
    }
  }
  
  // Stage 5: Budget enforcement
  const budgetTracker = {};
  relevantEmployees.forEach(e => {
    const weeklyMax = e.contract_hours || 0;
    const monthlyMax = Math.round((weeklyMax * 13) / 3);
    const alreadyThisMonth = alreadyPlannedHours[e.id] || 0;
    const remainingThisMonth = Math.max(0, monthlyMax - alreadyThisMonth);
    budgetTracker[e.id] = {
      maxThisWeek: Math.min(weeklyMax, remainingThisMonth),
      planned: 0,
      name: `${e.first_name} ${e.last_name}`,
    };
  });
  
  const validShifts = [];
  for (const shift of cappedShifts) {
    if (!shift.employeeId || !budgetTracker[shift.employeeId]) {
      validShifts.push(shift);
      continue;
    }
    
    const budget = budgetTracker[shift.employeeId];
    const dp = daypartLookup[shift.daypartId];
    const shiftHours = dp 
      ? calcHoursFromTime(dp.startTime, dp.endTime) - (dp.break_duration || 0) / 60 
      : 4;
    
    if (budget.maxThisWeek > 0 && budget.planned + shiftHours > budget.maxThisWeek * 1.15) {
      issues.budgetRejected.push(
        `🚫 ${budget.name}: ${shift.date} geweigerd (${Math.round(budget.planned)}u + ${shiftHours}u = ${Math.round(budget.planned + shiftHours)}u, max=${budget.maxThisWeek}u)`
      );
      continue;
    }
    budget.planned += shiftHours;
    validShifts.push(shift);
  }
  
  return { validShifts, issues, budgetTracker };
}