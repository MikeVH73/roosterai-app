import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buildSchedulePrompt, calcHoursFromTime } from '@/components/ai/SchedulePromptBuilder';
import { processAIShifts } from '@/components/ai/ScheduleResponseProcessor';
import { generateDeterministicSchedule } from '@/components/ai/DeterministicScheduleEngine';

const testCases = [
  {
    id: 1,
    category: 'Planning & Roosters',
    name: 'Automatisch rooster genereren',
    description: 'Deterministisch rooster: code berekent exact de juiste slots, functies en urenverdeling — zonder AI',
    prompt: 'Genereer een rooster voor volgende week met alle beschikbare medewerkers.',
    expectedResult: 'Compleet rooster met exact het juiste aantal diensten per afdeling, juiste functies, eerlijke urenverdeling'
  },
  {
    id: 2,
    category: 'Planning & Roosters',
    name: 'Vervangingen suggereren',
    description: 'Test vervanging bij uitval/ziekte',
    prompt: 'Medewerker {{employee}} is ziek op {{date}}. Wie kan vervangen?',
    expectedResult: 'Lijst met 3 geschikte vervangers met redenen'
  },
  {
    id: 3,
    category: 'Planning & Roosters',
    name: 'Rooster optimaliseren',
    description: 'Test rooster verbeteren qua efficiency',
    prompt: 'Analyseer rooster {{schedule}} en geef optimalisatie suggesties voor betere verdeling.',
    expectedResult: 'Concrete verbeteringsvoorstellen'
  },
  {
    id: 4,
    category: 'Planning & Roosters',
    name: 'Conflicten oplossen',
    description: 'Test detectie van dubbele boekingen en rusttijd schendingen',
    prompt: 'Check rooster {{schedule}} op conflicten: dubbele diensten, te weinig rust tussen diensten.',
    expectedResult: 'Lijst met gevonden conflicten en oplossingen'
  },
  {
    id: 5,
    category: 'Personeelsbeheer',
    name: 'Geschikte medewerkers vinden',
    description: 'Test skill matching voor specifieke dienst',
    prompt: 'Wie kan werken op {{date}} in afdeling {{department}} met vaardigheden {{skills}}?',
    expectedResult: 'Lijst medewerkers met juiste skills en beschikbaarheid'
  },
  {
    id: 6,
    category: 'Personeelsbeheer',
    name: 'Werkdruk analyseren',
    description: 'Test identificatie van over/onderbelasting',
    prompt: 'Analyseer de werkdruk van alle medewerkers deze maand. Wie werkt te veel of te weinig?',
    expectedResult: 'Overzicht met over- en onderbelaste medewerkers'
  },
  {
    id: 7,
    category: 'Personeelsbeheer',
    name: 'Vaardigheden matchen',
    description: 'Test skill-based planning',
    prompt: 'Voor functie {{function}} zijn deze vaardigheden nodig: {{skills}}. Wie voldoet?',
    expectedResult: 'Lijst gekwalificeerde medewerkers'
  },
  {
    id: 8,
    category: 'Verzoeken & Communicatie',
    name: 'Verlofverzoeken beoordelen',
    description: 'Test impact analyse verlof',
    prompt: 'Medewerker {{employee}} vraagt verlof van {{startDate}} tot {{endDate}}. Wat is de impact?',
    expectedResult: 'Impact analyse met goedkeuringsadvies'
  },
  {
    id: 9,
    category: 'Verzoeken & Communicatie',
    name: 'Ruilverzoeken verwerken',
    description: 'Test dienstruil geschiktheid',
    prompt: '{{employee1}} wil dienst ruilen met {{employee2}} op {{date}}. Is dit geschikt?',
    expectedResult: 'Geschiktheid check met alternatieven indien nodig'
  },
  {
    id: 10,
    category: 'Verzoeken & Communicatie',
    name: 'WhatsApp berichten opstellen',
    description: 'Test automatische berichtgeneratie',
    prompt: 'Stel een WhatsApp bericht op voor vervangingsverzoek aan {{employee}} voor dienst op {{date}}.',
    expectedResult: 'Professioneel WhatsApp bericht'
  },
  {
    id: 11,
    category: 'Analyse & Inzichten',
    name: 'Trends identificeren',
    description: 'Test patroonherkenning',
    prompt: 'Analyseer de laatste 3 maanden. Welke trends zie je in ziekteverzuim en dienstruilen?',
    expectedResult: 'Overzicht van geïdentificeerde trends'
  },
  {
    id: 12,
    category: 'Analyse & Inzichten',
    name: 'Kosten voorspellen',
    description: 'Test loonkosten berekening',
    prompt: 'Bereken de verwachte loonkosten voor rooster {{schedule}} op basis van uurtarieven.',
    expectedResult: 'Totale kosten met breakdown per medewerker'
  },
  {
    id: 13,
    category: 'Analyse & Inzichten',
    name: 'Bezetting voorspellen',
    description: 'Test toekomstige personeelsbehoefte',
    prompt: 'Op basis van historische data, hoeveel personeel hebben we nodig volgende maand?',
    expectedResult: 'Voorspelling met onderbouwing'
  },
  {
    id: 14,
    category: 'Analyse & Inzichten',
    name: 'Rapportages maken',
    description: 'Test data analyse en rapportage',
    prompt: 'Maak een maandrapport met: aantal diensten, ziekteverzuim, overuren, kosten.',
    expectedResult: 'Gestructureerd rapport met cijfers'
  },
  {
    id: 15,
    category: 'Strategische Planning',
    name: 'Alternatieve roosters vergelijken',
    description: 'Test scenario analyse',
    prompt: 'Vergelijk 2 roosteropties: optie A met meer parttime, optie B met meer fulltime. Wat is beter?',
    expectedResult: 'Vergelijking met voor- en nadelen'
  },
  {
    id: 16,
    category: 'Strategische Planning',
    name: 'Best practices suggereren',
    description: 'Test data-gedreven adviezen',
    prompt: 'Op basis van onze historische data, wat zijn best practices voor efficiënte roostering?',
    expectedResult: 'Concrete best practice adviezen'
  },
  {
    id: 17,
    category: 'Strategische Planning',
    name: 'Capaciteitsplanning',
    description: 'Test langetermijn personeelsbehoefte',
    prompt: 'We verwachten 20% groei volgend kwartaal. Hoeveel extra personeel nodig en welke functies?',
    expectedResult: 'Capaciteitsplan met aantallen en functies'
  }
];

export default function AITestSuite() {
  const navigate = useNavigate();
  const { currentCompany, canUseAI } = useCompany();
  const companyId = currentCompany?.id;

  const [testResults, setTestResults] = useState({});
  const [currentTest, setCurrentTest] = useState(null);
  const [testInput, setTestInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => base44.entities.Schedule.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => base44.entities.EmployeeProfile.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', companyId],
    queryFn: () => base44.entities.Department.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', companyId],
    queryFn: () => base44.entities.Shift.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: functions = [] } = useQuery({
    queryKey: ['functions', companyId],
    queryFn: () => base44.entities.Function.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: dayparts = [] } = useQuery({
    queryKey: ['dayparts', companyId],
    queryFn: () => base44.entities.DepartmentDaypart.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', companyId],
    queryFn: () => base44.entities.Location.filter({ companyId }),
    enabled: !!companyId
  });

  const runTest = async (testCase) => {
    // Test 1 uses deterministic engine, no AI credits needed
    if (testCase.id !== 1 && !canUseAI()) {
      alert('AI limiet bereikt');
      return;
    }

    setCurrentTest(testCase.id);
    setIsRunning(true);

    try {
      // Build context with REAL data
      const contextData = {
        bedrijf: currentCompany?.name,
        medewerkers: employees.map(e => {
          const func = functions.find(f => f.id === e.functionId);
          return {
            id: e.id,
            naam: `${e.first_name} ${e.last_name}`,
            contracturen: e.contract_hours,
            contracttype: e.contract_type,
            afdelingen: e.departmentIds || [],
            functieId: e.functionId,
            functieNaam: func?.name || 'Onbekend',
            voorkeuren: e.preferences
          };
        }),
        afdelingen: departments.map(d => ({
          id: d.id,
          naam: d.name,
          code: d.code
        })),
        functies: functions.map(f => ({
          id: f.id,
          naam: f.name,
          code: f.code
        })),
        roosters: schedules.filter(s => s.status !== 'archived').map(s => ({
          id: s.id,
          naam: s.name,
          startdatum: s.start_date,
          einddatum: s.end_date
        }))
      };

      let finalPrompt = testInput || testCase.prompt;
      const targetSchedule = schedules[0];
      const targetEmployee = employees[0];
      const targetDate = new Date().toISOString().split('T')[0];

      // Replace placeholders with REAL data
      finalPrompt = finalPrompt.replace('{{schedule}}', targetSchedule?.name || 'het rooster');
      finalPrompt = finalPrompt.replace('{{employee}}', targetEmployee?.first_name || 'de medewerker');
      finalPrompt = finalPrompt.replace('{{employee1}}', employees[0]?.first_name || 'medewerker 1');
      finalPrompt = finalPrompt.replace('{{employee2}}', employees[1]?.first_name || 'medewerker 2');
      finalPrompt = finalPrompt.replace('{{department}}', departments[0]?.name || 'de afdeling');
      finalPrompt = finalPrompt.replace('{{date}}', targetDate);
      finalPrompt = finalPrompt.replace('{{startDate}}', targetDate);
      finalPrompt = finalPrompt.replace('{{endDate}}', new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]);

      let systemPrompt = `Je bent de AI Planning Assistent voor ${currentCompany?.name}.

KRITIEK: Gebruik ALLEEN de echte data hieronder. Verzin GEEN afdelingen, functies of medewerkers.

BESCHIKBARE DATA:
${JSON.stringify(contextData, null, 2)}

Vraag: ${finalPrompt}`;

      let responseSchema = {
        type: "object",
        properties: {
          answer: { type: "string", description: "Het antwoord" },
          success: { type: "boolean", description: "Of de test geslaagd is" },
          details: { type: "string", description: "Extra details" }
        }
      };

      const daysOfWeekNames = { 0: 'zondag', 1: 'maandag', 2: 'dinsdag', 3: 'woensdag', 4: 'donderdag', 5: 'vrijdag', 6: 'zaterdag' };

      // Shared variables for Test 1
      let scheduleDayparts = [];
      let summaryReqs = [];
      let scheduleLocationId = null;
      let weekStart = null;
      let weekEnd = null;
      let alreadyPlannedHours = {};
      let relevantEmployees = [];
      let scheduleDepts = [];
      let nameToIdMap = {};

      // Special handling for Test 1: Generate schedule DETERMINISTICALLY (no AI)
      if (testCase.id === 1 && targetSchedule) {
        // Calculate dates within the schedule range
        const scheduleStart = new Date(targetSchedule.start_date);
        const scheduleEnd = new Date(targetSchedule.end_date);
        const today = new Date();
        
        // Find next Monday from today
        weekStart = new Date(today);
        const currentDayOfWeek = weekStart.getDay();
        const daysUntilMonday = currentDayOfWeek === 0 ? 1 : (8 - currentDayOfWeek);
        weekStart.setDate(weekStart.getDate() + daysUntilMonday);
        if (weekStart < scheduleStart) weekStart = new Date(scheduleStart);
        weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
        if (weekEnd > scheduleEnd) weekEnd = new Date(scheduleEnd);

        scheduleDayparts = dayparts.filter(dp => targetSchedule.departmentIds?.includes(dp.departmentId));
        scheduleLocationId = targetSchedule.locationIds?.[0] || null;
        const scheduleDeptIds = targetSchedule.departmentIds || [];
        scheduleDepts = departments.filter(d => scheduleDeptIds.includes(d.id));
        
        // Filter employees for this roster
        relevantEmployees = employees.filter(e => {
          const empDepts = e.departmentIds || [];
          return empDepts.some(dId => scheduleDeptIds.includes(dId));
        });
        
        // Calculate per-daypart hours
        const daypartHoursMap = {};
        scheduleDayparts.forEach(dp => {
          const brutoUren = calcHoursFromTime(dp.startTime, dp.endTime);
          const pauzeUren = (dp.break_duration || 0) / 60;
          daypartHoursMap[dp.id] = brutoUren - pauzeUren;
        });
        
        // Monthly hours calculation
        const monthStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
        const monthEnd = new Date(weekStart.getFullYear(), weekStart.getMonth() + 1, 0);
        const monthStartStr = monthStart.toISOString().split('T')[0];
        const monthEndStr = monthEnd.toISOString().split('T')[0];
        
        const allMonthShifts = await base44.entities.Shift.filter({ companyId });
        const weekStartStr = weekStart.toISOString().split('T')[0];
        const weekEndStr = weekEnd.toISOString().split('T')[0];
        const monthShifts = allMonthShifts.filter(s => 
          s.date >= monthStartStr && s.date <= monthEndStr &&
          !(s.date >= weekStartStr && s.date <= weekEndStr)
        );
        
        alreadyPlannedHours = {};
        monthShifts.forEach(s => {
          const dp = dayparts.find(d => d.id === s.daypartId);
          if (!dp) return;
          const bruto = calcHoursFromTime(dp.startTime, dp.endTime);
          const pauze = (dp.break_duration || 0) / 60;
          alreadyPlannedHours[s.employeeId] = (alreadyPlannedHours[s.employeeId] || 0) + (bruto - pauze);
        });
        
        // Staffing requirements
        const allRequirements = await base44.entities.StaffingRequirement.filter({ companyId });
        summaryReqs = allRequirements
          .filter(r => scheduleDeptIds.includes(r.departmentId))
          .map(r => ({
            departmentId: r.departmentId,
            daypartId: r.daypartId,
            day_of_week: r.day_of_week,
            targetHours: r.targetHours,
            min_staff: r.min_staff || 1,
          }));
        
        // Build week dates map
        const weekDates = {};
        for (let d = new Date(weekStart); d <= weekEnd; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
          weekDates[d.getDay()] = d.toISOString().split('T')[0];
        }

        // Fetch vacation requests
        let vacationRequests = [];
        try {
          vacationRequests = await base44.entities.VacationRequest.filter({ companyId, status: 'approved' });
        } catch (e) { /* no vacations */ }

        // === RUN DETERMINISTIC ENGINE ===
        console.log('🚀 Starting Deterministic Schedule Engine...');
        const result = generateDeterministicSchedule({
          scheduleDepts,
          scheduleDayparts,
          staffingReqs: summaryReqs,
          relevantEmployees,
          weekDates,
          daypartHoursMap,
          scheduleLocationId,
          alreadyPlannedHours,
          vacationRequests,
          functions,
          allCompanyShifts: allMonthShifts, // Pass all shifts for cross-roster backup check
        });

        console.log(`Engine result: ${result.assignments.length} shifts, ${result.unresolved.length} unresolved`);
        console.log(result.summary);

        // Now we have deterministic shifts — skip AI entirely for structure
        // Use AI only if needed for preferences (future enhancement)
        
        // Delete existing shifts for this week
        const existingWeekShifts = await base44.entities.Shift.filter({ scheduleId: targetSchedule.id });
        const weekStartStr2 = weekStart.toISOString().split('T')[0];
        const weekEndStr2 = weekEnd.toISOString().split('T')[0];
        const shiftsToDelete = existingWeekShifts.filter(s => s.date >= weekStartStr2 && s.date <= weekEndStr2);
        
        const processBatch = async (items, fn, batchSize = 5, delayMs = 500) => {
          const results = [];
          for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(fn));
            results.push(...batchResults);
            if (i + batchSize < items.length) await new Promise(r => setTimeout(r, delayMs));
          }
          return results;
        };
        
        if (shiftsToDelete.length > 0) {
          console.log(`Verwijder ${shiftsToDelete.length} bestaande shifts`);
          await processBatch(shiftsToDelete, s => base44.entities.Shift.delete(s.id));
        }

        // Create the shifts from deterministic engine
        const createdShifts = [];
        const errors = [];
        
        await processBatch(result.assignments, async (shift) => {
          try {
            const created = await base44.entities.Shift.create({
              companyId,
              scheduleId: targetSchedule.id,
              employeeId: shift.employeeId,
              departmentId: shift.departmentId || null,
              locationId: shift.locationId || scheduleLocationId || null,
              daypartId: shift.daypartId || null,
              date: shift.date,
              start_time: shift.start_time,
              end_time: shift.end_time,
              break_duration: shift.break_duration ?? 0,
              status: 'scheduled'
            });
            createdShifts.push(created);
          } catch (err) {
            console.error('Shift creation error:', err);
            errors.push(`${shift.date}: ${err.message}`);
          }
        });

        const deletedMsg = shiftsToDelete.length > 0 ? ` (${shiftsToDelete.length} oude verwijderd)` : '';
        const allMatch = result.unresolved.length === 0 && errors.length === 0;
        const statusMsg = `${allMatch ? '✅' : '⚠️'} ${createdShifts.length} diensten aangemaakt${deletedMsg}`;
        
        const unresolvedMsg = result.unresolved.length > 0
          ? `\n\n❌ NIET GEVULDE SLOTS (${result.unresolved.length}):\n${result.unresolved.map(u => `  ${u.departmentName} - ${u.daypartName} op ${u.dayName} ${u.date}: ${u.reason}`).join('\n')}`
          : '';
        
        const errorMsg = errors.length > 0 
          ? `\n\n❌ Fouten bij opslaan (${errors.length}):\n${errors.slice(0, 5).join('\n')}` 
          : '';
        
        // Get date range
        const shiftDates = createdShifts.map(s => s.date).sort();
        const firstDate = shiftDates[0] || weekStartStr;
        const lastDate = shiftDates[shiftDates.length - 1] || weekEndStr;
        
        const shiftsPerDate = {};
        createdShifts.forEach(s => { shiftsPerDate[s.date] = (shiftsPerDate[s.date] || 0) + 1; });
        const dateBreakdown = Object.entries(shiftsPerDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => `  ${date}: ${count} diensten`)
          .join('\n');

        setTestResults({
          ...testResults,
          [testCase.id]: {
            status: allMatch ? 'passed' : 'failed',
            response: `🔧 DETERMINISTISCH ROOSTER (geen AI prompt gebruikt)\n\n${statusMsg}\nRooster: ${targetSchedule.name}\nPeriode: ${firstDate} t/m ${lastDate}\n\n${dateBreakdown}\n\n${result.summary}${unresolvedMsg}${errorMsg}`,
            details: `Bekijk week van ${firstDate} in rooster "${targetSchedule.name}"`,
            scheduleId: targetSchedule.id,
            scheduleName: targetSchedule.name,
            weekDate: firstDate,
            shiftsCreated: createdShifts.length,
            timestamp: new Date().toISOString()
          }
        });
        setIsRunning(false);
        setCurrentTest(null);
        setTestInput('');
        return;
      }

      // For non-schedule tests, use AI
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: systemPrompt,
        response_json_schema: responseSchema,
      });

      console.log('AI Response:', response);

      let aiResult = response;
      if (!aiResult.shifts && aiResult.response && typeof aiResult.response === 'object') {
        aiResult = aiResult.response;
      }

      // This block is legacy — Test 1 now returns early via deterministic engine
      if (false) {
        // Check if AI actually generated shifts
        if (!aiResult.shifts || !Array.isArray(aiResult.shifts) || aiResult.shifts.length === 0) {
          setTestResults({
            ...testResults,
            [testCase.id]: {
              status: 'failed',
              response: `❌ AI heeft geen shifts gegenereerd!\n\nAI antwoord was:\n${JSON.stringify(aiResult, null, 2).slice(0, 2000)}`,
              details: 'De AI heeft geen shifts array teruggegeven of deze was leeg',
              timestamp: new Date().toISOString()
            }
          });
          setIsRunning(false);
          setCurrentTest(null);
          return;
        }

        console.log(`AI genereerde ${aiResult.shifts.length} shifts, gaan verwerken...`);
        
        // STAP 0: Verwijder bestaande shifts voor deze week
        const existingWeekShifts = await base44.entities.Shift.filter({ scheduleId: targetSchedule.id });
        const weekStartStr2 = weekStart.toISOString().split('T')[0];
        const weekEndStr2 = weekEnd.toISOString().split('T')[0];
        const shiftsToDelete = existingWeekShifts.filter(s => s.date >= weekStartStr2 && s.date <= weekEndStr2);
        
        const processBatch = async (items, fn, batchSize = 5, delayMs = 500) => {
          const results = [];
          for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(fn));
            results.push(...batchResults);
            if (i + batchSize < items.length) await new Promise(r => setTimeout(r, delayMs));
          }
          return results;
        };
        
        if (shiftsToDelete.length > 0) {
          console.log(`Verwijder ${shiftsToDelete.length} bestaande shifts`);
          await processBatch(shiftsToDelete, s => base44.entities.Shift.delete(s.id));
        }
        
        // === PROCESS AI RESPONSE through all validation stages ===
        const { validShifts, issues, budgetTracker } = processAIShifts({
          aiShifts: aiResult.shifts,
          relevantEmployees,
          allEmployees: employees,
          scheduleDepts,
          scheduleDayparts,
          daypartHoursMap: (() => {
            const m = {};
            scheduleDayparts.forEach(dp => {
              m[dp.id] = calcHoursFromTime(dp.startTime, dp.endTime) - (dp.break_duration || 0) / 60;
            });
            return m;
          })(),
          alreadyPlannedHours,
          nameToIdMap,
          staffingReqs: summaryReqs,
        });
        
        // Log all issues
        const allIssueLines = [];
        if (issues.idResolution.length > 0) allIssueLines.push(...issues.idResolution);
        if (issues.preferenceWarnings.length > 0) allIssueLines.push(...issues.preferenceWarnings);
        if (issues.budgetRejected.length > 0) allIssueLines.push(...issues.budgetRejected);
        if (issues.duplicateSkipped.length > 0) allIssueLines.push(...issues.duplicateSkipped);
        if (allIssueLines.length > 0) console.warn('Verwerking issues:', allIssueLines);
        
        const createdShifts = [];
        const errors = [];
        const skipped = issues.duplicateSkipped;
        const daypartLookup = {};
        scheduleDayparts.forEach(dp => { daypartLookup[dp.id] = dp; });
        
        // Create shifts in batches
        await processBatch(validShifts, async (shift) => {
          try {
            const created = await base44.entities.Shift.create({
              companyId,
              scheduleId: targetSchedule.id,
              employeeId: shift.employeeId,
              departmentId: shift.departmentId || null,
              locationId: shift.locationId || scheduleLocationId || null,
              daypartId: shift.daypartId || null,
              functionId: shift.functionId || null,
              date: shift.date,
              start_time: shift.start_time,
              end_time: shift.end_time,
              break_duration: shift.break_duration ?? 0,
              status: 'scheduled'
            });
            createdShifts.push(created);
          } catch (err) {
            console.error('Shift creation error:', err);
            errors.push(`${shift.date}: ${err.message}`);
          }
        });
        
        if (skipped.length > 0) {
          console.warn(`${skipped.length} shifts overgeslagen (dubbele toewijzing):`, skipped);
        }

        // Verify shifts are actually in database
        const verifyShifts = await base44.entities.Shift.filter({ 
          scheduleId: targetSchedule.id 
        });
        console.log(`Verificatie: ${verifyShifts.length} shifts gevonden in database voor rooster ${targetSchedule.id}`);

        if (createdShifts.length === 0) {
          setTestResults({
            ...testResults,
            [testCase.id]: {
              status: 'failed',
              response: `❌ GEEN shifts aangemaakt!\n\nAI genereerde ${aiResult.shifts.length} shifts, maar ze konden niet worden opgeslagen.\n\nFouten:\n${errors.join('\n')}`,
              details: 'Alle shift creaties zijn mislukt',
              timestamp: new Date().toISOString()
            }
          });
          setIsRunning(false);
          setCurrentTest(null);
          return;
        }

        // === VALIDATIE ===
        const validationLines = [];
        let allMatch = true;
        let totalOk = 0;
        let totalFail = 0;
        
        // Groepeer validatie per afdeling
        const deptValidation = {};
        
        for (const dp of scheduleDayparts) {
          const dept = departments.find(d => d.id === dp.departmentId);
          const deptName = dept?.name || 'Onbekend';
          if (!deptValidation[deptName]) deptValidation[deptName] = { ok: 0, fail: 0, issues: [] };
          
          const dpReqs = summaryReqs.filter(r => r.daypartId === dp.id);
          
          for (const r of dpReqs) {
            if (!r.targetHours || r.targetHours <= 0) continue;
            const dayName = daysOfWeekNames[r.day_of_week] || `dag ${r.day_of_week}`;
            const neededStaff = r.min_staff || 1;
            
            const matchingShifts = createdShifts.filter(s => {
              const shiftDay = new Date(s.date).getDay();
              return s.daypartId === dp.id && shiftDay === r.day_of_week;
            });
            
            if (matchingShifts.length >= neededStaff) {
              deptValidation[deptName].ok++;
              totalOk++;
            } else {
              deptValidation[deptName].fail++;
              deptValidation[deptName].issues.push(`${dp.name} ${dayName}: ${matchingShifts.length}/${neededStaff}`);
              totalFail++;
              allMatch = false;
            }
          }
        }
        
        // Toon compacte samenvatting per afdeling
        for (const [deptName, val] of Object.entries(deptValidation)) {
          const total = val.ok + val.fail;
          const icon = val.fail === 0 ? '✅' : '⚠️';
          validationLines.push(`${icon} ${deptName}: ${val.ok}/${total} dagdeel-slots ingevuld`);
          if (val.issues.length > 0) {
            val.issues.forEach(i => validationLines.push(`   ❌ ${i}`));
          }
        }
        
        // Check 2: No duplicate employee per day per department
        const duplicateIssues = [];
        const shiftsByDateDept = {};
        createdShifts.forEach(s => {
          const key = `${s.date}_${s.departmentId}`;
          if (!shiftsByDateDept[key]) shiftsByDateDept[key] = [];
          shiftsByDateDept[key].push(s);
        });
        
        for (const [key, shiftsInGroup] of Object.entries(shiftsByDateDept)) {
          const empCounts = {};
          shiftsInGroup.forEach(s => {
            empCounts[s.employeeId] = (empCounts[s.employeeId] || 0) + 1;
          });
          for (const [empId, count] of Object.entries(empCounts)) {
            if (count > 1) {
              const emp = employees.find(e => e.id === empId);
              const empName = emp ? `${emp.first_name} ${emp.last_name}` : empId;
              const [date, deptId] = key.split('_');
              const deptObj = departments.find(d => d.id === deptId);
              duplicateIssues.push(`❌ ${empName} staat ${count}x op ${date} bij ${deptObj?.name || deptId}`);
              allMatch = false;
            }
          }
        }
        
        if (duplicateIssues.length > 0) {
          validationLines.push('', '🔴 DUBBELE INROOSTERINGEN:');
          validationLines.push(...duplicateIssues);
        }
        
        // Check 3: Preference and function mismatch warnings
        const prefIssues = [];
        const funcMismatches = [];
        createdShifts.forEach(s => {
          const emp = employees.find(e => e.id === s.employeeId);
          const dept = departments.find(d => d.id === s.departmentId);
          if (!emp || !dept) return;
          
          // Check voorkeur vs back-up
          const isPreferred = (emp.preferred_departmentIds || []).includes(s.departmentId);
          const isBackup = (emp.backup_departmentIds || []).includes(s.departmentId);
          
          if (isBackup) {
            prefIssues.push(`🟡 ${emp.first_name} ${emp.last_name} → ${dept.name} op ${s.date} (BACK-UP afdeling)`);
          }
          
          // Function mismatch check — ID-based: check if employee's function is in department's allowedFunctionIds
          if (emp.functionId && dept.allowedFunctionIds?.length > 0) {
            const func = functions.find(f => f.id === emp.functionId);
            if (!dept.allowedFunctionIds.includes(emp.functionId)) {
              funcMismatches.push(`⚠️ ${emp.first_name} ${emp.last_name} (${func?.name || 'Onbekend'}) → ${dept.name} op ${s.date}`);
            }
          }
        });
        if (prefIssues.length > 0) {
          validationLines.push('', `🟡 BACK-UP INZET (${prefIssues.length}x):`);
          validationLines.push(...prefIssues.slice(0, 10));
        }
        if (funcMismatches.length > 0) {
          validationLines.push('', `🔶 FUNCTIE-MISMATCH (${funcMismatches.length}x):`);
          validationLines.push(...funcMismatches.slice(0, 10));
        }
        
        // Report corrected times
        if (issues.timeCorrected.length > 0) {
          validationLines.push('', `🔧 TIJDEN GECORRIGEERD (${issues.timeCorrected.length}x):`);
          validationLines.push(...issues.timeCorrected.slice(0, 5));
        }
        
        // Report ID resolution
        if (issues.idResolution.length > 0) {
          validationLines.push('', `🔄 ID-RESOLUTIE (${issues.idResolution.length}x):`);
          validationLines.push(...issues.idResolution.slice(0, 10));
        }
        
        // Report preference violations
        if (issues.preferenceWarnings.length > 0) {
          validationLines.push('', `🟡 VOORKEUR/BACKUP WAARSCHUWINGEN (${issues.preferenceWarnings.length}x):`);
          validationLines.push(...issues.preferenceWarnings.slice(0, 10));
        }
        
        // Report budget rejections
        if (issues.budgetRejected.length > 0) {
          validationLines.push('', `🚫 SHIFTS GEWEIGERD door uren-overschrijding (${issues.budgetRejected.length}x):`);
          validationLines.push(...issues.budgetRejected.slice(0, 15));
        }
        
        // Report invalid shifts
        if (issues.invalid.length > 0) {
          validationLines.push('', `❌ ONGELDIGE SHIFTS (${issues.invalid.length}x):`);
          validationLines.push(...issues.invalid.slice(0, 10));
        }
        
        // Check 4: Contract hours utilization per employee (with monthly budget)
        const employeeHoursPlanned = {};
        createdShifts.forEach(s => {
          const dp = daypartLookup[s.daypartId];
          if (!dp) return;
          const brutoUren = calcHoursFromTime(dp.startTime, dp.endTime);
          const pauzeUren = (dp.break_duration || 0) / 60;
          const nettoUren = brutoUren - pauzeUren;
          employeeHoursPlanned[s.employeeId] = (employeeHoursPlanned[s.employeeId] || 0) + nettoUren;
        });
        
        const hourIssues = [];
        relevantEmployees.forEach(e => {
          const plannedThisWeek = employeeHoursPlanned[e.id] || 0;
          const weeklyMax = e.contract_hours || 0;
          const monthlyMax = Math.round((weeklyMax * 13) / 3);
          const alreadyThisMonth = Math.round(alreadyPlannedHours[e.id] || 0);
          const totalMonthAfter = alreadyThisMonth + plannedThisWeek;
          const weekPct = weeklyMax > 0 ? Math.round((plannedThisWeek / weeklyMax) * 100) : 0;
          
          if (weeklyMax > 0 && plannedThisWeek < weeklyMax * 0.5 && plannedThisWeek > 0) {
            hourIssues.push(`⚠️ ${e.first_name} ${e.last_name}: ${Math.round(plannedThisWeek)}u deze week van ${weeklyMax}u (${weekPct}%) — maand: ${Math.round(totalMonthAfter)}/${monthlyMax}u`);
          } else if (weeklyMax > 0 && plannedThisWeek === 0) {
            hourIssues.push(`❌ ${e.first_name} ${e.last_name}: NIET ingeroosterd (${weeklyMax}u beschikbaar)`);
          } else if (plannedThisWeek > weeklyMax * 1.1) {
            hourIssues.push(`🔴 ${e.first_name} ${e.last_name}: ${Math.round(plannedThisWeek)}u gepland, MAX=${weeklyMax}u OVERSCHREDEN`);
          } else if (totalMonthAfter > monthlyMax * 1.05) {
            hourIssues.push(`🔴 ${e.first_name} ${e.last_name}: Maandbudget overschreden: ${Math.round(totalMonthAfter)}/${monthlyMax}u`);
          }
        });
        
        if (hourIssues.length > 0) {
          validationLines.push('', `📊 UREN ANALYSE (${hourIssues.length} aandachtspunten):`);
          validationLines.push(...hourIssues.slice(0, 15));
          allMatch = false;
        }
        
        // Summary of hours distribution
        const totalPlannedWeek = Object.values(employeeHoursPlanned).reduce((a, b) => a + b, 0);
        const totalMaxWeek = relevantEmployees.reduce((sum, e) => sum + (e.contract_hours || 0), 0);
        validationLines.push('', `📈 WEEK TOTAAL: ${Math.round(totalPlannedWeek)}u gepland van ${totalMaxWeek}u beschikbaar (${Math.round(totalPlannedWeek/Math.max(totalMaxWeek,1)*100)}%)`);

        // Get date range and details of created shifts
        const shiftDates = createdShifts.map(s => s.date).sort();
        const firstDate = shiftDates[0];
        const lastDate = shiftDates[shiftDates.length - 1];
        
        // Count shifts per date
        const shiftsPerDate = {};
        createdShifts.forEach(s => {
          shiftsPerDate[s.date] = (shiftsPerDate[s.date] || 0) + 1;
        });
        
        const dateBreakdown = Object.entries(shiftsPerDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => `  ${date}: ${count} diensten`)
          .join('\n');
        
        // Unresolved issues from AI
        const unresolvedMsg = (aiResult.unresolved_issues && aiResult.unresolved_issues.length > 0)
          ? `\n\n⚠️ ONOPGELOSTE PROBLEMEN (actie vereist van planner):\n${aiResult.unresolved_issues.map(i => `  - ${i.daypart_name} op ${i.date}: ${i.planned_hours || 0}u / ${i.target_hours}u — ${i.reason}`).join('\n')}`
          : '';

        const deletedMsg = shiftsToDelete.length > 0 ? ` (${shiftsToDelete.length} oude verwijderd)` : '';
        const statusMsg = `${allMatch ? '✅' : '⚠️'} ${createdShifts.length} diensten aangemaakt${deletedMsg}`;
        const validationMsg = `\n\n📊 VALIDATIE (gepland vs bezettingsnorm):\n${validationLines.join('\n')}`;
        const errorMsg = errors.length > 0 
          ? `\n\n❌ Fouten bij aanmaken (${errors.length}):\n${errors.slice(0, 5).join('\n')}` 
          : '';
        const skippedMsg = skipped.length > 0
          ? `\n\n⛔ ${skipped.length} shifts overgeslagen (dubbele medewerker/dag/afdeling):\n${skipped.slice(0, 5).join('\n')}`
          : '';

        setTestResults({
          ...testResults,
          [testCase.id]: {
            status: allMatch ? 'passed' : 'failed',
            response: `${statusMsg}\nRooster: ${targetSchedule.name}\nPeriode: ${firstDate} t/m ${lastDate}\n\n${dateBreakdown}${validationMsg}${unresolvedMsg}${skippedMsg}${errorMsg}`,
            details: `Bekijk week van ${firstDate} in rooster "${targetSchedule.name}"`,
            scheduleId: targetSchedule.id,
            scheduleName: targetSchedule.name,
            weekDate: firstDate,
            shiftsCreated: createdShifts.length,
            timestamp: new Date().toISOString()
          }
        });
      } else if (testCase.id === 1) {
        // Test 1 but no targetSchedule found
        setTestResults({
          ...testResults,
          [testCase.id]: {
            status: 'failed',
            response: '❌ Geen rooster gevonden om shifts in te plannen. Maak eerst een rooster aan met afdelingen en locaties.',
            details: schedules.length === 0 
              ? 'Er zijn geen roosters in het systeem' 
              : `Er zijn ${schedules.length} roosters maar geen kon worden geselecteerd`,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        setTestResults({
          ...testResults,
          [testCase.id]: {
            status: aiResult.success ? 'passed' : 'failed',
            response: aiResult.answer || aiResult.summary || JSON.stringify(aiResult, null, 2),
            details: aiResult.details,
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      setTestResults({
        ...testResults,
        [testCase.id]: {
          status: 'error',
          response: error.message,
          timestamp: new Date().toISOString()
        }
      });
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
      setTestInput('');
    }
  };

  const categories = [...new Set(testCases.map(t => t.category))];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopBar 
        title="AI Test Suite" 
        subtitle="Test alle AI functionaliteiten"
      />

      <div className="p-6 max-w-7xl mx-auto">
        <Alert className="mb-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <Sparkles className="h-4 h-4" style={{ color: 'var(--color-accent)' }} />
          <AlertDescription style={{ color: 'var(--color-text-secondary)' }}>
            Test alle AI functionaliteiten. Test 1 gebruikt de DETERMINISTISCHE engine (geen AI credits). Overige tests gebruiken AI ({currentCompany?.ai_actions_used || 0} / {currentCompany?.ai_actions_limit || 300} credits).
          </AlertDescription>
        </Alert>

        {categories.map((category) => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {category}
            </h2>
            
            <div className="space-y-3">
              {testCases.filter(t => t.category === category).map((test) => {
                const result = testResults[test.id];
                const isActive = currentTest === test.id;

                return (
                  <Card 
                    key={test.id} 
                    className="border-0 shadow-sm"
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" style={{ color: 'var(--color-text-secondary)' }}>
                              Test {test.id}
                            </Badge>
                            <CardTitle className="text-base" style={{ color: 'var(--color-text-primary)' }}>
                              {test.name}
                            </CardTitle>
                            {result && (
                              result.status === 'passed' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : result.status === 'failed' ? (
                                <XCircle className="w-5 h-5 text-red-600" />
                              ) : (
                                <Clock className="w-5 h-5 text-orange-600" />
                              )
                            )}
                          </div>
                          <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                            {test.description}
                          </p>
                          <p className="text-xs font-mono rounded px-2 py-1 inline-block" style={{ backgroundColor: 'var(--color-surface-light)', color: 'var(--color-text-muted)' }}>
                            Verwacht: {test.expectedResult}
                          </p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      {!result && !isActive && (
                        <div className="space-y-3">
                          <Textarea
                            placeholder={test.prompt}
                            value={testInput}
                            onChange={(e) => setTestInput(e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                          <Button 
                            onClick={() => runTest(test)}
                            disabled={isRunning || (test.id !== 1 && !canUseAI())}
                            size="sm"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            {test.id === 1 ? 'Rooster genereren (deterministisch)' : 'Test uitvoeren'}
                          </Button>
                        </div>
                      )}

                      {isActive && (
                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Test wordt uitgevoerd...
                        </div>
                      )}

                      {result && (
                        <div className="space-y-3">
                          <div 
                            className="rounded-lg p-4"
                            style={{ backgroundColor: 'var(--color-surface-light)' }}
                          >
                            <p className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                              AI Antwoord:
                            </p>
                            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                              {result.response}
                            </p>
                            {result.details && (
                              <p className="text-xs mt-2 pt-2" style={{ 
                                color: 'var(--color-text-muted)', 
                                borderTop: '1px solid var(--color-border)' 
                              }}>
                                {result.details}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const newResults = { ...testResults };
                                delete newResults[test.id];
                                setTestResults(newResults);
                              }}
                            >
                              Opnieuw testen
                            </Button>
                            {result.scheduleId && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  const targetUrl = result.weekDate 
                                    ? createPageUrl('ScheduleEditor') + `?id=${result.scheduleId}&date=${result.weekDate}`
                                    : createPageUrl('ScheduleEditor') + `?id=${result.scheduleId}`;
                                  navigate(targetUrl);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <ChevronRight className="w-4 h-4 mr-1" />
                                {result.scheduleName || 'Rooster'} - Week {result.weekDate}
                              </Button>
                            )}
                            <Badge 
                              className={
                                result.status === 'passed' 
                                  ? 'bg-green-100 text-green-700'
                                  : result.status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-orange-100 text-orange-700'
                              }
                            >
                              {result.status === 'passed' ? 'Geslaagd' : result.status === 'failed' ? 'Mislukt' : 'Fout'}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {/* Summary */}
        <Card className="mt-8 border-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Test Resultaten
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>Geslaagd</p>
                <p className="text-2xl font-bold text-green-600">
                  {Object.values(testResults).filter(r => r.status === 'passed').length}
                </p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>Mislukt</p>
                <p className="text-2xl font-bold text-red-600">
                  {Object.values(testResults).filter(r => r.status === 'failed').length}
                </p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>Nog te testen</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {testCases.length - Object.keys(testResults).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}