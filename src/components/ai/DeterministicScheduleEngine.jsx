/**
 * DeterministicScheduleEngine
 * 
 * Builds the schedule deterministically.
 * 
 * Rules:
 * - Preferred employees fill their full contract hours on their own department first.
 * - Function is NOT a hard block — department membership is the primary gate.
 * - Backup employees (can be from other locations) are ONLY used when:
 *     a) No preferred employee with remaining budget is available, AND
 *     b) The backup is not already scheduled in ANY other roster on that day.
 * - The same backup can appear in multiple departments' backup groups.
 */

import { calcHoursFromTime } from './SchedulePromptBuilder';

const DAY_NAMES = { 0: 'zondag', 1: 'maandag', 2: 'dinsdag', 3: 'woensdag', 4: 'donderdag', 5: 'vrijdag', 6: 'zaterdag' };

/**
 * Main entry point: generate a complete schedule deterministically.
 */
export function generateDeterministicSchedule({
  scheduleDepts,
  scheduleDayparts,
  staffingReqs,
  relevantEmployees,
  weekDates,
  daypartHoursMap,
  scheduleLocationId,
  alreadyPlannedHours,
  vacationRequests = [],
  functions = [],
  allCompanyShifts = [],   // All shifts across ALL rosters — used to check backup availability
}) {
  const log = [];
  const warnings = [];

  // ── Step 1: Build all required slots ──
  const slots = buildSlots(scheduleDepts, scheduleDayparts, staffingReqs, weekDates, daypartHoursMap);
  log.push(`📋 ${slots.length} shift-slots aangemaakt uit bezettingsnormen`);

  // ── Step 2: Build employee budget tracker ──
  const budgets = buildBudgets(relevantEmployees, alreadyPlannedHours);

  // ── Step 3: For each slot, find valid candidates and assign ──
  const assignments = [];
  const unresolved = [];

  // ── Determine department processing order ──
  // Key insight: departments whose preferred employees are EXCLUSIVE to that dept
  // must be processed first, so those employees don't get "stolen" by other depts.
  
  // Build all slots with their static candidate lists
  const allSlotsWithCandidates = slots.map(slot => {
    const candidates = findCandidates(slot, relevantEmployees, scheduleDepts, vacationRequests, functions);
    return { ...slot, candidates };
  });

  // Calculate "exclusivity score" per department:
  // How many of this dept's preferred employees ONLY work in this department?
  const deptExclusivity = {};
  for (const slot of allSlotsWithCandidates) {
    if (deptExclusivity[slot.departmentId] !== undefined) continue;
    const preferredIds = slot.candidates.filter(c => c.isPreferred).map(c => c.employeeId);
    let exclusiveCount = 0;
    for (const empId of preferredIds) {
      const emp = relevantEmployees.find(e => e.id === empId);
      if (!emp) continue;
      // Employee is "exclusive" if they only appear as preferred in ONE department
      const otherDepts = allSlotsWithCandidates.filter(s => 
        s.departmentId !== slot.departmentId && 
        s.candidates.some(c => c.employeeId === empId && c.isPreferred)
      );
      if (otherDepts.length === 0) exclusiveCount++;
    }
    // Score = ratio of exclusive preferred staff (higher = process first)
    const totalPreferred = preferredIds.length;
    deptExclusivity[slot.departmentId] = totalPreferred > 0 ? exclusiveCount / totalPreferred : 0;
  }

  // Sort slots: departments with more exclusive preferred staff first, then by fewest total candidates
  allSlotsWithCandidates.sort((a, b) => {
    const excA = deptExclusivity[a.departmentId] ?? 0;
    const excB = deptExclusivity[b.departmentId] ?? 0;
    if (excB !== excA) return excB - excA; // Higher exclusivity first
    return a.candidates.length - b.candidates.length; // Fewer candidates first as tiebreaker
  });

  for (const slot of allSlotsWithCandidates) {
    const { candidates } = slot;

    if (candidates.length === 0) {
      unresolved.push({
        departmentId: slot.departmentId,
        departmentName: slot.departmentName,
        daypartId: slot.daypartId,
        daypartName: slot.daypartName,
        date: slot.date,
        dayName: slot.dayName,
        reason: 'Geen enkele medewerker beschikbaar met juiste functie'
      });
      warnings.push(`❌ ${slot.departmentName} - ${slot.daypartName} op ${slot.dayName} ${slot.date}: geen kandidaten`);
      continue;
    }

    // Check if any preferred candidates still have budget — if so, block backups from being used
    const preferredCandidates = candidates.filter(c => c.isPreferred);
    const backupCandidates = candidates.filter(c => c.isBackup);
    const anyPreferredHasBudget = preferredCandidates.some(c => {
      const budget = budgets[c.employeeId];
      if (!budget) return false;
      const effectiveMax = c.maxHoursPreference ? Math.min(budget.maxThisWeek, c.maxHoursPreference) : budget.maxThisWeek;
      const hasConflict = assignments.some(a => {
        if (a.employeeId !== c.employeeId || a.date !== slot.date) return false;
        const aStart = a.start_time || '00:00';
        const aEnd = a.end_time || '23:59';
        return aStart < slot.endTime && aEnd > slot.startTime;
      });
      return !hasConflict && (budget.planned + slot.nettoHours <= effectiveMax * 1.05);
    });

    // If preferred employees can still cover this slot, don't allow backups
    const effectiveCandidates = (anyPreferredHasBudget && backupCandidates.length > 0)
      ? preferredCandidates
      : candidates;

    // Rank candidates
    const ranked = rankCandidates(effectiveCandidates, slot, budgets, assignments);

    if (ranked.length === 0) {
      unresolved.push({
        departmentId: slot.departmentId,
        departmentName: slot.departmentName,
        daypartId: slot.daypartId,
        daypartName: slot.daypartName,
        date: slot.date,
        dayName: slot.dayName,
        reason: 'Alle kandidaten hebben al hun urenbudget bereikt'
      });
      warnings.push(`⚠️ ${slot.departmentName} - ${slot.daypartName} op ${slot.dayName} ${slot.date}: alle kandidaten vol`);
      continue;
    }

    // Pick the best candidate
    const chosen = ranked[0];
    const emp = relevantEmployees.find(e => e.id === chosen.employeeId);
    const empName = emp ? `${emp.first_name} ${emp.last_name}` : chosen.employeeId;
    
    // Record assignment
    budgets[chosen.employeeId].planned += slot.nettoHours;
    budgets[chosen.employeeId].assignedDates.push(slot.date);
    budgets[chosen.employeeId].assignedSlots.push(`${slot.departmentId}_${slot.daypartId}_${slot.date}`);

    const dp = scheduleDayparts.find(d => d.id === slot.daypartId);
    
    assignments.push({
      employeeId: chosen.employeeId,
      departmentId: slot.departmentId,
      locationId: scheduleLocationId,
      daypartId: slot.daypartId,
      date: slot.date,
      start_time: dp?.startTime || slot.startTime,
      end_time: dp?.endTime || slot.endTime,
      break_duration: dp?.break_duration || 0,
      _meta: {
        employeeName: empName,
        departmentName: slot.departmentName,
        daypartName: slot.daypartName,
        isBackup: chosen.isBackup,
        score: chosen.score,
      }
    });

    if (chosen.isBackup) {
      warnings.push(`🟡 ${empName} ingezet als BACK-UP op ${slot.departmentName} - ${slot.daypartName} ${slot.dayName}`);
    }
  }

  // ── Step 4: Build summary ──
  const summary = buildSummary(assignments, unresolved, budgets, relevantEmployees, log, warnings);

  return { assignments, unresolved, summary, log, warnings, budgets };
}


/**
 * Build all required slot objects from staffing requirements.
 */
function buildSlots(scheduleDepts, scheduleDayparts, staffingReqs, weekDates, daypartHoursMap) {
  const slots = [];
  
  for (const req of staffingReqs) {
    if (!req.targetHours || req.targetHours <= 0) continue;
    
    const dept = scheduleDepts.find(d => d.id === req.departmentId);
    const dp = scheduleDayparts.find(d => d.id === req.daypartId);
    if (!dept || !dp) continue;
    
    const date = weekDates[req.day_of_week];
    if (!date) continue;
    
    const nettoHours = daypartHoursMap[dp.id] || 0;
    const numSlots = req.min_staff || 1;

    for (let i = 0; i < numSlots; i++) {
      slots.push({
        departmentId: dept.id,
        departmentName: dept.name,
        daypartId: dp.id,
        daypartName: dp.name,
        date,
        dayOfWeek: req.day_of_week,
        dayName: DAY_NAMES[req.day_of_week] || `dag ${req.day_of_week}`,
        startTime: dp.startTime,
        endTime: dp.endTime,
        breakDuration: dp.break_duration || 0,
        nettoHours,
        slotIndex: i,
      });
    }
  }
  
  return slots;
}

/**
 * Build per-employee budget tracker.
 */
function buildBudgets(relevantEmployees, alreadyPlannedHours) {
  const budgets = {};
  
  for (const emp of relevantEmployees) {
    const weeklyMax = emp.contract_hours || 0;
    const monthlyMax = Math.round((weeklyMax * 13) / 3);
    const alreadyPlanned = alreadyPlannedHours[emp.id] || 0;
    const remainingMonth = Math.max(0, monthlyMax - alreadyPlanned);
    const maxThisWeek = Math.min(weeklyMax, remainingMonth);
    
    budgets[emp.id] = {
      maxThisWeek,
      weeklyContract: weeklyMax,
      monthlyMax,
      alreadyPlanned,
      planned: 0,
      assignedDates: [],
      assignedSlots: [],
      name: `${emp.first_name} ${emp.last_name}`,
    };
  }
  
  return budgets;
}

/**
 * Find valid candidates for a slot. HARD filter on function + department.
 */
function findCandidates(slot, relevantEmployees, scheduleDepts, vacationRequests, functions) {
  const dept = scheduleDepts.find(d => d.id === slot.departmentId);
  const allowedFunctionIds = dept?.allowedFunctionIds || [];
  
  const candidates = [];
  
  for (const emp of relevantEmployees) {
    if (emp.status !== 'active') continue;
    
    // HARD FILTER 1: Employee must be assigned to this department
    const empDepts = emp.departmentIds || [];
    if (!empDepts.includes(slot.departmentId)) continue;
    
    // HARD FILTER 2: Employee's function must be in department's allowed functions
    if (allowedFunctionIds.length > 0 && emp.functionId) {
      if (!allowedFunctionIds.includes(emp.functionId)) continue;
    }
    
    // HARD FILTER 3: Check vacation/sick leave
    const isOnLeave = vacationRequests.some(v => 
      v.employeeId === emp.id && 
      v.status === 'approved' && 
      slot.date >= v.start_date && 
      slot.date <= v.end_date
    );
    if (isOnLeave) continue;
    
    // Determine preferred vs backup
    const isPreferred = (emp.preferred_departmentIds || []).includes(slot.departmentId);
    const isBackup = (emp.backup_departmentIds || []).includes(slot.departmentId);
    const hasLabels = (emp.preferred_departmentIds?.length > 0 || emp.backup_departmentIds?.length > 0);
    
    // If employee has labels but is neither preferred nor backup for this dept, skip
    if (hasLabels && !isPreferred && !isBackup) continue;
    
    candidates.push({
      employeeId: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      isPreferred: isPreferred || !hasLabels,
      isBackup: isBackup && !isPreferred,
      contractHours: emp.contract_hours || 0,
      preferredDays: emp.preferences?.preferred_days || [],
      unavailableDays: emp.preferences?.unavailable_days || [],
      notes: emp.preferences?.notes || '',
      maxHoursPreference: emp.preferences?.max_hours_per_week || null,
    });
  }
  
  return candidates;
}

/**
 * Rank candidates for a slot based on multiple criteria.
 * Returns sorted array with scores (higher = better).
 */
function rankCandidates(candidates, slot, budgets, existingAssignments) {
  const scored = [];
  
  for (const c of candidates) {
    const budget = budgets[c.employeeId];
    if (!budget) continue;
    
    // Check if employee still has budget
    const effectiveMax = c.maxHoursPreference 
      ? Math.min(budget.maxThisWeek, c.maxHoursPreference) 
      : budget.maxThisWeek;
    
    if (budget.planned + slot.nettoHours > effectiveMax * 1.05) continue;
    
    // Check if already assigned to same daypart on same date (any department)
    const alreadyOnThisDaypart = existingAssignments.some(
      a => a.employeeId === c.employeeId && a.date === slot.date && a.daypartId === slot.daypartId
    );
    if (alreadyOnThisDaypart) continue;

    // Check for TIME OVERLAP on same date (prevents double-booking with actual conflicting times)
    const hasTimeConflict = existingAssignments.some(a => {
      if (a.employeeId !== c.employeeId || a.date !== slot.date) return false;
      // Check if times overlap
      const aStart = a.start_time || '00:00';
      const aEnd = a.end_time || '23:59';
      const slotDp = slot.startTime;
      const slotEnd = slot.endTime;
      return aStart < slotEnd && aEnd > slotDp;
    });
    if (hasTimeConflict) continue;
    
    // Score calculation
    let score = 0;
    
    // 1. Preferred > Backup (+100 points)
    if (c.isPreferred) score += 100;
    
    // 2. Day preference matching (+50 points)
    const dayNameEnglish = dayOfWeekToEnglish(slot.dayOfWeek);
    if (c.preferredDays.length > 0 && c.preferredDays.includes(dayNameEnglish)) {
      score += 50;
    } else if (c.preferredDays.length > 0 && !c.preferredDays.includes(dayNameEnglish)) {
      score -= 30; // Penalty for non-preferred day
    }
    
    // 3. Check notes for day avoidance (e.g., "werkt liever nooit op woensdag")
    const avoidancePenalty = checkDayAvoidance(c.notes, slot.dayOfWeek);
    score += avoidancePenalty;
    
    // 4. Hours balance: strongly prefer employees who still need MORE hours to reach contract
    const hoursNeeded = effectiveMax - budget.planned;
    const fillRatio = effectiveMax > 0 ? budget.planned / effectiveMax : 1;
    score += Math.round((1 - fillRatio) * 80); // More empty = higher score (doubled weight)
    
    // 5. Spread: only a tiny penalty so preferred employees fill their hours first
    const uniqueDays = new Set(budget.assignedDates).size;
    score -= uniqueDays * 2; // Very small penalty per day already working
    
    // 6. Same dept same day: only penalize if it's the SAME daypart (true duplicate)
    // Multiple dayparts on same day in same dept is ALLOWED (e.g. morning + afternoon)
    const sameDeptSameDaypart = existingAssignments.filter(
      a => a.employeeId === c.employeeId && a.date === slot.date && a.departmentId === slot.departmentId && a.daypartId === slot.daypartId
    ).length;
    if (sameDeptSameDaypart > 0) score -= 200; // Heavy penalty only for true duplicate
    
    scored.push({
      ...c,
      score,
      hoursNeeded,
      fillRatio,
    });
  }
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  return scored;
}

/**
 * Check if employee notes indicate they want to avoid a specific day.
 */
function checkDayAvoidance(notes, dayOfWeek) {
  if (!notes) return 0;
  const lowerNotes = notes.toLowerCase();
  const dutchDays = {
    0: ['zondag'],
    1: ['maandag'],
    2: ['dinsdag'],
    3: ['woensdag'],
    4: ['donderdag'],
    5: ['vrijdag'],
    6: ['zaterdag'],
  };
  
  const dayNames = dutchDays[dayOfWeek] || [];
  for (const dayName of dayNames) {
    if (lowerNotes.includes(dayName) && 
        (lowerNotes.includes('niet') || lowerNotes.includes('liever niet') || lowerNotes.includes('nooit') || lowerNotes.includes('vrij'))) {
      return -80; // Strong penalty for explicitly avoided days
    }
  }
  return 0;
}

/**
 * Convert day-of-week number to English name (matching employee preferences format).
 */
function dayOfWeekToEnglish(dow) {
  const map = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
  return map[dow] || '';
}

/**
 * Build a human-readable summary of the schedule.
 */
function buildSummary(assignments, unresolved, budgets, relevantEmployees, log, warnings) {
  const lines = [...log];
  
  lines.push(`✅ ${assignments.length} shifts toegewezen`);
  if (unresolved.length > 0) {
    lines.push(`❌ ${unresolved.length} slots NIET gevuld`);
  }
  
  // Department breakdown
  const deptCounts = {};
  assignments.forEach(a => {
    const name = a._meta?.departmentName || a.departmentId;
    deptCounts[name] = (deptCounts[name] || 0) + 1;
  });
  lines.push('');
  lines.push('📊 Per afdeling:');
  for (const [name, count] of Object.entries(deptCounts)) {
    lines.push(`  ${name}: ${count} shifts`);
  }
  
  // Employee hours breakdown
  lines.push('');
  lines.push('👥 Per medewerker:');
  for (const emp of relevantEmployees) {
    const b = budgets[emp.id];
    if (!b) continue;
    const pct = b.weeklyContract > 0 ? Math.round((b.planned / b.weeklyContract) * 100) : 0;
    const status = b.planned === 0 ? '⚠️ niet ingeroosterd' : 
                   pct > 100 ? '🔴 over contract' : 
                   pct < 50 && b.weeklyContract > 0 ? '🟡 onder 50%' : '✅';
    lines.push(`  ${b.name}: ${Math.round(b.planned)}u / ${b.weeklyContract}u (${pct}%) ${status}`);
  }
  
  // Backup usage
  const backupCount = assignments.filter(a => a._meta?.isBackup).length;
  if (backupCount > 0) {
    lines.push('');
    lines.push(`🔶 ${backupCount} back-up inzetten`);
  }
  
  // Warnings
  if (warnings.length > 0) {
    lines.push('');
    lines.push('⚠️ Waarschuwingen:');
    warnings.forEach(w => lines.push(`  ${w}`));
  }
  
  return lines.join('\n');
}