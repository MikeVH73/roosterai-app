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
  
  // Stage 2: Preference validation (warn but don't block — AI was instructed to prefer)
  for (const shift of resolvedShifts) {
    const emp = relevantEmployees.find(e => e.id === shift.employeeId);
    if (!emp) continue;
    
    const isPreferred = (emp.preferred_departmentIds || []).includes(shift.departmentId);
    const isBackup = (emp.backup_departmentIds || []).includes(shift.departmentId);
    const hasLabels = (emp.preferred_departmentIds?.length > 0 || emp.backup_departmentIds?.length > 0);
    
    if (hasLabels && !isPreferred && !isBackup) {
      // Employee has NO relationship to this department — this should NOT happen
      const dept = scheduleDepts.find(d => d.id === shift.departmentId);
      issues.preferenceWarnings.push(
        `🔴 ${emp.first_name} ${emp.last_name} → ${dept?.name || shift.departmentId}: NIET in voorkeur OF backup — shift verwijderd`
      );
      shift._rejected = true;
    } else if (hasLabels && isBackup && !isPreferred) {
      const dept = scheduleDepts.find(d => d.id === shift.departmentId);
      issues.preferenceWarnings.push(
        `🟡 ${emp.first_name} ${emp.last_name} → ${dept?.name || shift.departmentId} op ${shift.date} (BACK-UP afdeling)`
      );
    }
  }
  
  // Remove rejected shifts from preference check
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
  
  // Stage 4: Time correction (force daypart times)
  for (const shift of dedupShifts) {
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
  for (const shift of dedupShifts) {
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