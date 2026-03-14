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

      // Shared variables for Test 1 (used in prompt-building AND post-creation validation)
      let scheduleDayparts = [];
      let summaryReqs = [];
      let scheduleLocationId = null;
      let weekStart = null;
      let weekEnd = null;

      // Special handling for Test 1: Generate actual schedule
      if (testCase.id === 1 && targetSchedule) {
        // Calculate dates within the schedule range
        const scheduleStart = new Date(targetSchedule.start_date);
        const scheduleEnd = new Date(targetSchedule.end_date);
        const today = new Date();
        
        // Find next Monday from today
        weekStart = new Date(today);
        const currentDayOfWeek = weekStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysUntilMonday = currentDayOfWeek === 0 ? 1 : (8 - currentDayOfWeek);
        weekStart.setDate(weekStart.getDate() + daysUntilMonday);
        
        // If next Monday is before schedule start, use schedule start
        if (weekStart < scheduleStart) {
          weekStart = new Date(scheduleStart);
        }
        
        // Week ends 6 days later (Monday to Sunday = 7 days, but Monday counts as day 0)
        weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
        
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
        
        // === FILTER MEDEWERKERS: Alleen medewerkers die bij afdelingen van DIT rooster horen ===
        const scheduleDeptIds = targetSchedule.departmentIds || [];
        const relevantEmployees = employees.filter(e => {
          const empDepts = e.departmentIds || [];
          return empDepts.some(dId => scheduleDeptIds.includes(dId));
        });
        
        // Helper: calculate hours from time range
        const calcHoursFromTime = (start, end) => {
          const [sh, sm] = start.split(':').map(Number);
          const [eh, em] = end.split(':').map(Number);
          let diff = (eh * 60 + em) - (sh * 60 + sm);
          if (diff <= 0) diff += 24 * 60;
          return diff / 60;
        };
        
        // Calculate per-daypart hours for planning
        const daypartHoursMap = {};
        scheduleDayparts.forEach(dp => {
          const brutoUren = calcHoursFromTime(dp.startTime, dp.endTime);
          const pauzeUren = (dp.break_duration || 0) / 60;
          daypartHoursMap[dp.id] = brutoUren - pauzeUren;
        });
        
        // === MAANDELIJKSE UREN BEREKENING ===
        // Bepaal de maand van deze week
        const monthStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
        const monthEnd = new Date(weekStart.getFullYear(), weekStart.getMonth() + 1, 0);
        const monthStartStr = monthStart.toISOString().split('T')[0];
        const monthEndStr = monthEnd.toISOString().split('T')[0];
        
        // Haal alle bestaande shifts voor deze maand op
        const allMonthShifts = await base44.entities.Shift.filter({ companyId });
        const monthShifts = allMonthShifts.filter(s => 
          s.date >= monthStartStr && s.date <= monthEndStr
        );
        
        // Bereken al ingeroosterde uren per medewerker deze maand
        const alreadyPlannedHours = {};
        monthShifts.forEach(s => {
          // Skip shifts in de huidige week (die worden vervangen)
          if (s.date >= weekStart.toISOString().split('T')[0] && s.date <= weekEnd.toISOString().split('T')[0]) return;
          const dp = dayparts.find(d => d.id === s.daypartId);
          if (!dp) return;
          const bruto = calcHoursFromTime(dp.startTime, dp.endTime);
          const pauze = (dp.break_duration || 0) / 60;
          alreadyPlannedHours[s.employeeId] = (alreadyPlannedHours[s.employeeId] || 0) + (bruto - pauze);
        });
        
        // Build enriched employee data with contract hours analysis
        const scheduleDepts = departments.filter(d => scheduleDeptIds.includes(d.id));
        contextData.medewerkers = relevantEmployees.map(e => {
          const func = functions.find(f => f.id === e.functionId);
          const empScheduleDepts = scheduleDepts.filter(d => (e.departmentIds || []).includes(d.id));
          
          // Voorkeur vs Back-up afdelingen (binnen dit rooster)
          const preferredInSchedule = empScheduleDepts.filter(d => 
            (e.preferred_departmentIds || []).includes(d.id)
          );
          const backupInSchedule = empScheduleDepts.filter(d => 
            (e.backup_departmentIds || []).includes(d.id)
          );
          // Afdelingen zonder voorkeur/backup label = behandel als voorkeur
          const unlabeledInSchedule = empScheduleDepts.filter(d => 
            !(e.preferred_departmentIds || []).includes(d.id) &&
            !(e.backup_departmentIds || []).includes(d.id)
          );
          
          // Maandelijkse uren berekening
          const weeklyHours = e.contract_hours || 0;
          const monthlyHours = Math.round((weeklyHours * 13) / 3); // 13 weken per kwartaal / 3 maanden
          const alreadyPlanned = Math.round(alreadyPlannedHours[e.id] || 0);
          const remainingThisMonth = Math.max(0, monthlyHours - alreadyPlanned);
          // Max inzetbaar deze week = min(weekelijkse uren, resterend deze maand)
          const maxThisWeek = Math.min(weeklyHours, remainingThisMonth);
          
          return {
            id: e.id,
            naam: `${e.first_name} ${e.last_name}`,
            contracturen_per_week: weeklyHours,
            contracturen_per_maand: monthlyHours,
            al_ingeroosterd_deze_maand: alreadyPlanned,
            resterend_deze_maand: remainingThisMonth,
            max_inzetbaar_deze_week: maxThisWeek,
            contracttype: e.contract_type,
            functieId: e.functionId,
            functieNaam: func?.name || 'Onbekend',
            voorkeur_afdelingen: [...preferredInSchedule, ...unlabeledInSchedule].map(d => ({ id: d.id, naam: d.name })),
            backup_afdelingen: backupInSchedule.map(d => ({ id: d.id, naam: d.name })),
            voorkeuren: e.preferences
          };
        });

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

        // Build employee hours budget summary for the prompt
        const employeeBudgetLines = contextData.medewerkers.map(e => {
          const deptNames = e.afdelingen_in_dit_rooster.map(d => d.naam).join(', ');
          return `  - ${e.naam} (${e.functieNaam}): ${e.contracturen}u/week, afdelingen: [${deptNames}]`;
        }).join('\n');
        
        // Calculate total available hours vs needed hours
        const totalAvailableHours = contextData.medewerkers.reduce((sum, e) => sum + (e.contracturen || 0), 0);
        let totalNeededHours = 0;
        for (const dp of scheduleDayparts) {
          const dpReqs = summaryReqs.filter(r => r.dagdeelId === dp.id);
          for (const r of dpReqs) {
            if (!r.doeluren || r.doeluren <= 0) continue;
            const shiftsNeeded = r.min_bezetting || 1;
            const hoursPerShift = daypartHoursMap[dp.id] || 4;
            totalNeededHours += shiftsNeeded * hoursPerShift;
          }
        }

        systemPrompt = `Je bent de AI Planning Assistent voor ${currentCompany?.name}.

OPDRACHT: Genereer een weekrooster. Volg de EXACTE SHIFT-OPDRACHTEN hieronder letterlijk.

=== EXACTE SHIFT-OPDRACHTEN ===
${shiftInstructionsText}

TOTAAL: Maak EXACT ${totalShiftsNeeded} shifts.

=== CAPACITEITSOVERZICHT ===
Totaal beschikbare uren (contracturen alle medewerkers): ${totalAvailableHours}u/week
Totaal benodigde uren (alle shifts): ~${Math.round(totalNeededHours)}u/week
${totalAvailableHours > totalNeededHours * 1.3 
  ? `⚠️ Er zijn MEER uren beschikbaar dan nodig. Verdeel de shifts eerlijk zodat iedereen werkt maar niemand meer dan contract_hours.`
  : totalAvailableHours < totalNeededHours 
    ? `⚠️ Er zijn MINDER uren beschikbaar dan nodig. Sommige shifts kunnen niet gevuld worden.`
    : `Capaciteit past goed bij de behoefte.`}

=== MEDEWERKERS BUDGET ===
${employeeBudgetLines}

=== STRIKTE REGELS (OVERTREDING = FOUT) ===

REGEL 1 - TIJDEN: ELKE shift heeft EXACT de start_time en end_time van het dagdeel. KOPIEER LETTERLIJK.

REGEL 2 - MAX 1 PER AFDELING PER DAG: Nooit 2x dezelfde medewerker op dezelfde dag in dezelfde afdeling.

REGEL 3 - MAX 2 SHIFTS PER DAG: Bijv. 1 ochtend + 1 middag. Aansluitende shifts (08:00-12:00 + 12:00-16:00) zijn TOEGESTAAN.

REGEL 4 - AFDELING MATCH: De medewerker MOET de afdeling in "afdelingen_in_dit_rooster" hebben.

REGEL 5 - FUNCTIE MATCH (BELANGRIJK!):
  Medewerkers moeten worden ingepland op afdelingen die passen bij hun FUNCTIE:
  - Functie "Bloedprikker" → plan in op afdelingen met "Bloedprikpoli" in de naam
  - Functie "Huisbezoeker" → plan in op afdelingen met "Huisbezoeken" in de naam
  - Functie "Baliemedewerker" → plan in op afdelingen met "Balie" in de naam
  Alleen als er ONVOLDOENDE medewerkers met de juiste functie zijn, mag je iemand anders inzetten. Meld dit in unresolved_issues.

REGEL 6 - CONTRACTUREN VOLLEDIG BENUTTEN:
  Plan elke medewerker in voor zoveel mogelijk van hun contracturen. 
  Voorbeeld: medewerker met 24u contract → plan ~24u aan shifts in (bijv. 6 shifts van 4u).
  Voorbeeld: medewerker met 40u contract → plan ~40u aan shifts in.
  NIET slechts 4-8 uur plannen als iemand 24-40u contract heeft!
  Verdeel shifts GELIJKMATIG over de week (bijv. 4-5 dagen voor 24u contract, niet alles op 1 dag).

REGEL 7 - RUSTTIJD: Minimaal 11 uur rust tussen twee diensten.

REGEL 8 - NIET GENOEG PERSONEEL: Als er niet genoeg medewerkers zijn, laat shift WEG en meld in unresolved_issues.

=== DAGDELEN (met tijden en netto uren per shift) ===
${JSON.stringify(contextData.dayparts.map(dp => ({
  ...dp, 
  netto_uren_per_shift: daypartHoursMap[dp.id] || '?'
})), null, 2)}

=== AFDELINGEN IN DIT ROOSTER ===
${JSON.stringify(scheduleDepts.map(d => ({ id: d.id, naam: d.name })), null, 2)}

=== ROOSTER INFO ===
- Locatie ID: ${scheduleLocationId}
- Locatie naam: ${scheduleLocations[0]?.name || 'Onbekend'}
- Periode: ${weekStart.toISOString().split('T')[0]} t/m ${weekEnd.toISOString().split('T')[0]}

=== VOORBEELD SHIFT ===
{ "employeeId": "abc123", "departmentId": "dept1", "locationId": "${scheduleLocationId}", "daypartId": "dp1", "date": "2026-03-16", "start_time": "07:00", "end_time": "11:00", "break_duration": 0 }`;

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
              description: "Bezettingsnormen die NIET volledig ingevuld konden worden, OF medewerkers met verkeerde functie ingezet",
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
            employee_hours_summary: {
              type: "array",
              description: "Overzicht uren per medewerker",
              items: {
                type: "object",
                properties: {
                  naam: { type: "string" },
                  contract_hours: { type: "number" },
                  planned_hours: { type: "number" },
                  shifts_count: { type: "number" }
                }
              }
            },
            summary: { type: "string", description: "Samenvatting met capaciteitsanalyse" }
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
        
        // Helper: process items in batches with delay to avoid rate limits
        const processBatch = async (items, fn, batchSize = 5, delayMs = 500) => {
          const results = [];
          for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(fn));
            results.push(...batchResults);
            if (i + batchSize < items.length) {
              await new Promise(r => setTimeout(r, delayMs));
            }
          }
          return results;
        };
        
        if (shiftsToDelete.length > 0) {
          console.log(`Verwijder ${shiftsToDelete.length} bestaande shifts voor week ${weekStartStr} - ${weekEndStr}`);
          await processBatch(shiftsToDelete, s => base44.entities.Shift.delete(s.id));
        }
        
        const createdShifts = [];
        const errors = [];
        const skipped = [];
        
        // Track employee assignments per day+department to prevent duplicates
        const assignmentTracker = {};
        
        // Build daypart lookup for server-side time correction
        const daypartLookup = {};
        scheduleDayparts.forEach(dp => { daypartLookup[dp.id] = dp; });
        
        // Filter, deduplicate, and correct shifts
        const validShifts = [];
        const correctedTimes = [];
        for (const shift of response.shifts) {
          const trackKey = `${shift.date}_${shift.departmentId}_${shift.employeeId}`;
          if (assignmentTracker[trackKey]) {
            skipped.push(`${shift.date}: ${shift.employeeId} al ingeroosterd bij ${shift.departmentId}`);
            continue;
          }
          assignmentTracker[trackKey] = true;
          
          // SERVER-SIDE CORRECTIE: Forceer dagdeel-tijden (AI kan fouten maken)
          const dp = daypartLookup[shift.daypartId];
          if (dp) {
            if (shift.start_time !== dp.startTime || shift.end_time !== dp.endTime) {
              correctedTimes.push(`${shift.date}: ${shift.start_time}-${shift.end_time} → ${dp.startTime}-${dp.endTime}`);
              shift.start_time = dp.startTime;
              shift.end_time = dp.endTime;
            }
            shift.break_duration = dp.break_duration || 0;
          }
          
          validShifts.push(shift);
        }
        
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
        
        // Check 3: Function mismatch warnings
        const funcMismatches = [];
        createdShifts.forEach(s => {
          const emp = employees.find(e => e.id === s.employeeId);
          const dept = departments.find(d => d.id === s.departmentId);
          if (emp && dept && emp.functionId) {
            const func = functions.find(f => f.id === emp.functionId);
            const funcName = func?.name?.toLowerCase() || '';
            const deptName = dept.name?.toLowerCase() || '';
            // Simple heuristic: if function name doesn't appear in dept name and vice versa
            const isLikelyMismatch = funcName && deptName && 
              !deptName.includes(funcName.split(' ')[0]) && 
              !funcName.includes(deptName.split(' ')[0]);
            if (isLikelyMismatch) {
              funcMismatches.push(`⚠️ ${emp.first_name} ${emp.last_name} (${func?.name}) → ${dept.name} op ${s.date}`);
            }
          }
        });
        if (funcMismatches.length > 0) {
          validationLines.push('', `🔶 FUNCTIE-MISMATCH (${funcMismatches.length}x):`);
          validationLines.push(...funcMismatches.slice(0, 10));
        }
        
        // Report corrected times
        if (correctedTimes.length > 0) {
          validationLines.push('', `🔧 TIJDEN GECORRIGEERD (${correctedTimes.length}x):`);
          validationLines.push(...correctedTimes.slice(0, 5));
        }
        
        // Check 4: Contract hours utilization per employee
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
        const relevantEmpIds = relevantEmployees.map(e => e.id);
        relevantEmployees.forEach(e => {
          const planned = employeeHoursPlanned[e.id] || 0;
          const contract = e.contract_hours || 0;
          const pct = contract > 0 ? Math.round((planned / contract) * 100) : 0;
          
          if (contract > 0 && planned < contract * 0.5) {
            hourIssues.push(`⚠️ ${e.first_name} ${e.last_name}: ${Math.round(planned)}u gepland van ${contract}u (${pct}%)`);
          } else if (planned > contract * 1.1) {
            hourIssues.push(`🔴 ${e.first_name} ${e.last_name}: ${Math.round(planned)}u gepland, CONTRACT=${contract}u OVERSCHREDEN`);
          }
        });
        
        if (hourIssues.length > 0) {
          validationLines.push('', `📊 CONTRACTUREN ANALYSE (${hourIssues.length} aandachtspunten):`);
          validationLines.push(...hourIssues.slice(0, 10));
          allMatch = false;
        }
        
        // Summary of hours distribution
        const totalPlanned = Object.values(employeeHoursPlanned).reduce((a, b) => a + b, 0);
        const totalContract = relevantEmployees.reduce((sum, e) => sum + (e.contract_hours || 0), 0);
        validationLines.push('', `📈 TOTAAL: ${Math.round(totalPlanned)}u gepland van ${totalContract}u beschikbaar (${Math.round(totalPlanned/totalContract*100)}%)`);

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