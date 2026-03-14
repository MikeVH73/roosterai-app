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

const testCases = [
  {
    id: 1,
    category: 'Planning & Roosters',
    name: 'Automatisch rooster genereren',
    description: 'Test of AI een compleet rooster kan maken op basis van behoeftes',
    prompt: 'Genereer een rooster voor volgende week met alle beschikbare medewerkers. Houd rekening met contracturen en rusttijden.',
    expectedResult: 'Compleet rooster met alle diensten ingevuld'
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
    if (!canUseAI()) {
      alert('AI limiet bereikt');
      return;
    }

    setCurrentTest(testCase.id);
    setIsRunning(true);

    try {
      // Build context with REAL data
      const contextData = {
        bedrijf: currentCompany?.name,
        medewerkers: employees.map(e => ({
          id: e.id,
          naam: `${e.first_name} ${e.last_name}`,
          contracturen: e.contract_hours,
          contracttype: e.contract_type,
          afdelingen: e.departmentIds || [],
          functie: e.functionId,
          voorkeuren: e.preferences
        })),
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

      // Shared variables for Test 1 (used in prompt-building AND post-creation validation)
      let scheduleDayparts = [];
      let summaryReqs = [];
      let scheduleLocationId = null;

      // Special handling for Test 1: Generate actual schedule
      if (testCase.id === 1 && targetSchedule) {
        // Calculate dates within the schedule range
        const scheduleStart = new Date(targetSchedule.start_date);
        const scheduleEnd = new Date(targetSchedule.end_date);
        const today = new Date();
        
        // Find next Monday from today
        let weekStart = new Date(today);
        const currentDayOfWeek = weekStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysUntilMonday = currentDayOfWeek === 0 ? 1 : (8 - currentDayOfWeek); // If Sunday, next day is Monday. Otherwise calculate days until next Monday
        weekStart.setDate(weekStart.getDate() + daysUntilMonday);
        
        // If next Monday is before schedule start, use schedule start
        if (weekStart < scheduleStart) {
          weekStart = new Date(scheduleStart);
        }
        
        // Week ends 6 days later (Monday to Sunday = 7 days, but Monday counts as day 0)
        let weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
        
        // Ensure week doesn't exceed schedule end
        if (weekEnd > scheduleEnd) {
          weekEnd = new Date(scheduleEnd);
        }

        // Get dayparts for context - MOET EERST
        scheduleDayparts = dayparts.filter(dp => 
          targetSchedule.departmentIds?.includes(dp.departmentId)
        );

        // Update context data with dayparts
        contextData.dayparts = scheduleDayparts.map(dp => ({
          id: dp.id,
          naam: dp.name,
          afdelingId: dp.departmentId,
          startTijd: dp.startTime,
          eindTijd: dp.endTime
        }));

        // Add location-department mapping
        const scheduleLocations = locations.filter(l => targetSchedule.locationIds?.includes(l.id));
        contextData.locaties = scheduleLocations.map(loc => ({
          id: loc.id,
          naam: loc.name,
          afdelingen: departments.filter(d => d.locationIds?.includes(loc.id)).map(d => ({
            id: d.id,
            naam: d.name
          }))
        }));

        // Add staffing requirements if available
        const allRequirements = await base44.entities.StaffingRequirement.filter({ companyId });
        if (allRequirements.length > 0) {
          contextData.bezettingseisen = allRequirements
            .filter(r => targetSchedule.departmentIds?.includes(r.departmentId))
            .map(r => ({
              afdelingId: r.departmentId,
              dagdeelId: r.daypartId,
              locatieId: r.locationId,
              dag_van_week: r.day_of_week,
              doeluren: r.targetHours,
              min_bezetting: r.min_staff,
              optimaal: r.optimal_staff
            }));
        }

        // Determine which location this schedule is for
        scheduleLocationId = targetSchedule.locationIds?.[0] || null;

        // Helper: calculate hours from time range
        const calcHours = (start, end) => {
          const [sh, sm] = start.split(':').map(Number);
          const [eh, em] = end.split(':').map(Number);
          let diff = (eh * 60 + em) - (sh * 60 + sm);
          if (diff <= 0) diff += 24 * 60; // overnight
          return diff / 60;
        };

        // Build precise shift requirements per daypart per day
        summaryReqs = contextData.bezettingseisen || [];
        const shiftInstructions = [];
        let totalShiftsNeeded = 0;
        
        // Build a map of all dates in the week range
        const weekDates = {};
        for (let d = new Date(weekStart); d <= weekEnd; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
          weekDates[d.getDay()] = d.toISOString().split('T')[0];
        }
        
        for (const dp of scheduleDayparts) {
          const dept = departments.find(d => d.id === dp.departmentId);
          const deptName = dept?.name || 'Onbekend';
          const dpReqs = summaryReqs.filter(r => r.dagdeelId === dp.id);
          
          for (const r of dpReqs) {
            if (!r.doeluren || r.doeluren <= 0) continue;
            const dayName = daysOfWeekNames[r.dag_van_week] || `dag ${r.dag_van_week}`;
            // Each staffing requirement = exactly 1 shift per person needed
            // The shift covers the FULL daypart time range
            // The targetHours is the NETTO working time (doeluren)
            const shiftsNeeded = r.min_bezetting || 1;
            totalShiftsNeeded += shiftsNeeded;
            
            const dateForDay = weekDates[r.dag_van_week] || null;
            
            const dpBreak = dp.break_duration || 0;
            const breakInfo = dpBreak > 0 ? `Ja (${dpBreak} min)` : 'Nee (break_duration=0)';
            
            shiftInstructions.push(
              `OPDRACHT: ${deptName} > ${dp.name} op ${dayName}${dateForDay ? ` (${dateForDay})` : ''}:
  - Dagdeel ID: ${dp.id}
  - Afdeling ID: ${dp.departmentId}
  - Start: ${dp.startTime}, Eind: ${dp.endTime}
  - Pauze: ${breakInfo}
  - Benodigde medewerkers: ${shiftsNeeded}
  - Maak EXACT ${shiftsNeeded} shift(s) met start_time="${dp.startTime}" en end_time="${dp.endTime}" en break_duration=${dpBreak}
  - Datum: ${dateForDay || 'ONBEKEND'}`
            );
          }
        }
        
        const shiftInstructionsText = shiftInstructions.length > 0 
          ? shiftInstructions.join('\n\n') 
          : 'Geen bezettingsnormen gevonden.';

        systemPrompt = `Je bent de AI Planning Assistent voor ${currentCompany?.name}.

OPDRACHT: Genereer een weekrooster. Volg de EXACTE SHIFT-OPDRACHTEN hieronder letterlijk.

=== EXACTE SHIFT-OPDRACHTEN ===
${shiftInstructionsText}

TOTAAL: Maak EXACT ${totalShiftsNeeded} shifts.

=== STRIKTE REGELS (OVERTREDING = FOUT) ===
1. ELKE shift heeft EXACT de start_time en end_time van het dagdeel (NIET aanpassen!)
2. Elke medewerker mag MAXIMAAL 1 shift PER DAG PER AFDELING. NOOIT 2x dezelfde medewerker op dezelfde dag in dezelfde afdeling.
3. Elke medewerker mag MAXIMAAL 2 shifts per dag TOTAAL (bijv. 1 ochtend + 1 middag in VERSCHILLENDE afdelingen).
4. De medewerker MOET de afdeling in zijn/haar "afdelingen" array hebben.
5. Overschrijd NOOIT contract_hours per week per medewerker.
6. Minimaal 11 uur rust tussen twee diensten van dezelfde medewerker.
7. SPREIDING: Verdeel shifts over VERSCHILLENDE medewerkers. Niet steeds dezelfde persoon.
8. Als er niet genoeg medewerkers zijn, laat de shift WEG en meld in unresolved_issues.

=== BESCHIKBARE MEDEWERKERS ===
${JSON.stringify(contextData.medewerkers, null, 2)}

=== DAGDELEN (met tijden) ===
${JSON.stringify(contextData.dayparts, null, 2)}

=== AFDELINGEN ===
${JSON.stringify(contextData.afdelingen, null, 2)}

=== ROOSTER INFO ===
- Locatie ID: ${scheduleLocationId}
- Afdelingen: ${targetSchedule.departmentIds?.join(', ')}
- Periode: ${weekStart.toISOString().split('T')[0]} t/m ${weekEnd.toISOString().split('T')[0]}

=== VOORBEELD SHIFT ===
{ "employeeId": "abc123", "departmentId": "dept1", "locationId": "${scheduleLocationId}", "daypartId": "dp1", "date": "2026-03-16", "start_time": "07:00", "end_time": "11:00", "break_duration": 0 }
Merk op: start_time en end_time komen EXACT van het dagdeel. break_duration komt ook van het dagdeel (0 = geen pauze).`;

        responseSchema = {
          type: "object",
          properties: {
            shifts: {
              type: "array",
              description: `Array van EXACT ${totalShiftsNeeded} shifts`,
              items: {
                type: "object",
                properties: {
                  employeeId: { type: "string", description: "ID van medewerker" },
                  departmentId: { type: "string", description: "ID van afdeling" },
                  locationId: { type: "string", description: "Locatie ID" },
                  daypartId: { type: "string", description: "Dagdeel ID" },
                  date: { type: "string", description: "Datum YYYY-MM-DD" },
                  start_time: { type: "string", description: "Starttijd HH:mm = dagdeel startTijd" },
                  end_time: { type: "string", description: "Eindtijd HH:mm = dagdeel eindTijd" },
                  break_duration: { type: "number", description: "Pauze minuten van dagdeel (0=geen pauze)" }
                },
                required: ["employeeId", "departmentId", "locationId", "daypartId", "date", "start_time", "end_time"]
              }
            },
            unresolved_issues: {
              type: "array",
              description: "Bezettingsnormen die NIET volledig ingevuld konden worden",
              items: {
                type: "object",
                properties: {
                  daypart_name: { type: "string" },
                  date: { type: "string" },
                  target_hours: { type: "number" },
                  planned_hours: { type: "number" },
                  reason: { type: "string" }
                }
              }
            },
            summary: { type: "string", description: "Samenvatting" }
          },
          required: ["shifts", "unresolved_issues", "summary"]
        };
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: systemPrompt,
        response_json_schema: responseSchema
      });

      console.log('AI Response:', response);

      // Test 1: Create actual shifts
      if (testCase.id === 1 && targetSchedule) {
        // Check if AI actually generated shifts
        if (!response.shifts || !Array.isArray(response.shifts) || response.shifts.length === 0) {
          setTestResults({
            ...testResults,
            [testCase.id]: {
              status: 'failed',
              response: `❌ AI heeft geen shifts gegenereerd!\n\nAI antwoord was:\n${JSON.stringify(response, null, 2)}`,
              details: 'De AI heeft geen shifts array teruggegeven of deze was leeg',
              timestamp: new Date().toISOString()
            }
          });
          setIsRunning(false);
          setCurrentTest(null);
          return;
        }

        console.log(`AI genereerde ${response.shifts.length} shifts, gaan aanmaken...`);
        
        // STAP 0: Verwijder bestaande shifts voor deze week in dit rooster
        const existingWeekShifts = await base44.entities.Shift.filter({ 
          scheduleId: targetSchedule.id 
        });
        const weekStartStr = weekStart.toISOString().split('T')[0];
        const weekEndStr = weekEnd.toISOString().split('T')[0];
        const shiftsToDelete = existingWeekShifts.filter(s => 
          s.date >= weekStartStr && s.date <= weekEndStr
        );
        if (shiftsToDelete.length > 0) {
          console.log(`Verwijder ${shiftsToDelete.length} bestaande shifts voor week ${weekStartStr} - ${weekEndStr}`);
          for (const s of shiftsToDelete) {
            await base44.entities.Shift.delete(s.id);
          }
        }
        
        const createdShifts = [];
        const errors = [];
        const skipped = [];
        
        // Track employee assignments per day+department to prevent duplicates
        const assignmentTracker = {};
        
        for (const shift of response.shifts) {
          // Pre-check: prevent same employee on same day in same department
          const trackKey = `${shift.date}_${shift.departmentId}_${shift.employeeId}`;
          if (assignmentTracker[trackKey]) {
            skipped.push(`${shift.date}: ${shift.employeeId} al ingeroosterd bij ${shift.departmentId}`);
            continue;
          }
          assignmentTracker[trackKey] = true;
          
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
        }
        
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
              response: `❌ GEEN shifts aangemaakt!\n\nAI genereerde ${response.shifts.length} shifts, maar ze konden niet worden opgeslagen.\n\nFouten:\n${errors.join('\n')}`,
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
          
          const dpReqs = summaryReqs.filter(r => r.dagdeelId === dp.id);
          
          for (const r of dpReqs) {
            if (!r.doeluren || r.doeluren <= 0) continue;
            const dayName = daysOfWeekNames[r.dag_van_week] || `dag ${r.dag_van_week}`;
            const neededStaff = r.min_bezetting || 1;
            
            const matchingShifts = createdShifts.filter(s => {
              const shiftDay = new Date(s.date).getDay();
              return s.daypartId === dp.id && shiftDay === r.dag_van_week;
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
        const unresolvedMsg = (response.unresolved_issues && response.unresolved_issues.length > 0)
          ? `\n\n⚠️ ONOPGELOSTE PROBLEMEN (actie vereist van planner):\n${response.unresolved_issues.map(i => `  - ${i.daypart_name} op ${i.date}: ${i.planned_hours || 0}u / ${i.target_hours}u — ${i.reason}`).join('\n')}`
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
        // No shifts generated
        setTestResults({
          ...testResults,
          [testCase.id]: {
            status: 'failed',
            response: '❌ AI heeft geen shifts gegenereerd',
            details: JSON.stringify(response, null, 2),
            timestamp: new Date().toISOString()
          }
        });
      } else {
        setTestResults({
          ...testResults,
          [testCase.id]: {
            status: response.success ? 'passed' : 'failed',
            response: response.answer || response.summary || JSON.stringify(response, null, 2),
            details: response.details,
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
            Test alle 17 AI functionaliteiten systematisch. AI gebruik: {currentCompany?.ai_actions_used || 0} / {currentCompany?.ai_actions_limit || 300}
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
                            disabled={isRunning || !canUseAI()}
                            size="sm"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Test uitvoeren
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