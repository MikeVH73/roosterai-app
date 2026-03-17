import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, BookTemplate, ChevronDown, Info, PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import SaveTemplateDialog from '@/components/planning/SaveTemplateDialog';

const DAYS = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO'];
const DAY_LABELS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
const PREFERRED_DAYS_MAP = { 'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3, 'friday': 4, 'saturday': 5, 'sunday': 6 };

export default function PlanningGrid({
  schedules,
  dayparts,
  departments,
  functions,
  employees,
  allEmployees,
  selectedDepartmentId,
  companyId,
}) {
  const queryClient = useQueryClient();
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [requiredHours, setRequiredHours] = useState({}); // { "daypartId_dayIndex": hours }
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);

  const selectedSchedule = schedules.find(s => s.id === selectedScheduleId);

  // Fetch existing shifts for the selected schedule
  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', selectedScheduleId],
    queryFn: () => base44.entities.Shift.filter({ companyId, scheduleId: selectedScheduleId }),
    enabled: !!selectedScheduleId,
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['planning-templates', companyId],
    queryFn: () => base44.entities.AISuggestion.filter({ companyId, context_type: 'alternative_schedule' }),
    enabled: !!companyId,
  });

  const visibleDayparts = dayparts.filter(dp =>
    selectedDepartmentId === 'all' || dp.departmentId === selectedDepartmentId
  );

  const getDeptName = (id) => departments.find(d => d.id === id)?.name || '';
  const getFuncName = (id) => functions.find(f => f.id === id)?.name || '';

  const getInitials = (first, last) =>
    `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();

  // Calculate total hours per employee from requiredHours cells
  const getEmployeeHoursForDay = useCallback((employee, dayIndex) => {
    let total = 0;
    visibleDayparts.forEach(dp => {
      const key = `${dp.id}_${dayIndex}`;
      const hrs = parseFloat(requiredHours[key] || 0);
      total += hrs;
    });
    return total;
  }, [visibleDayparts, requiredHours]);

  // Check if employee has preferred day
  const hasPreferredDay = (employee, dayIndex) => {
    const prefs = employee.preferences?.preferred_days || [];
    return prefs.some(d => PREFERRED_DAYS_MAP[d?.toLowerCase()] === dayIndex);
  };

  // Score employee match for the whole planning
  const getEmployeeScore = (employee) => {
    let totalRequired = 0;
    let matchedHours = 0;
    let preferredDayBonus = 0;

    DAYS.forEach((_, dayIndex) => {
      let dayRequired = 0;
      visibleDayparts.forEach(dp => {
        const key = `${dp.id}_${dayIndex}`;
        dayRequired += parseFloat(requiredHours[key] || 0);
      });
      totalRequired += dayRequired;
      if (dayRequired > 0 && hasPreferredDay(employee, dayIndex)) {
        preferredDayBonus += dayRequired;
      }
    });

    if (totalRequired === 0) return 'neutral';

    const contractHrs = employee.contract_hours || 0;
    const diff = Math.abs(contractHrs - totalRequired);
    const hourMatch = diff <= 2; // within 2 hours tolerance
    const hasPreference = preferredDayBonus > 0;

    if (hourMatch && hasPreference) return 'perfect';
    if (hourMatch) return 'good';
    if (hasPreference) return 'partial';
    return 'neutral';
  };

  // Row styles: subtle left-border accent only, no background color change
  const scoreStyles = {
    perfect: { borderLeft: '4px solid #16a34a' },
    good:    { borderLeft: '4px solid #34d399' },
    partial: { borderLeft: '4px solid #f59e0b' },
    neutral: { borderLeft: '4px solid transparent' },
  };
  const scoreBadgeStyles = {
    perfect: { backgroundColor: 'rgba(22,163,74,0.12)', color: '#16a34a', border: '1px solid #16a34a' },
    good:    { backgroundColor: 'rgba(52,211,153,0.12)', color: '#059669', border: '1px solid #34d399' },
    partial: { backgroundColor: 'rgba(245,158,11,0.12)', color: '#b45309', border: '1px solid #f59e0b' },
    neutral: {},
  };
  const scoreLabels = { perfect: '✓ Perfecte match', good: '✓ Goede match', partial: '~ Gedeeltelijke match', neutral: '' };

  const hasAnyHours = Object.values(requiredHours).some(v => parseFloat(v) > 0);

  return (
    <div className="space-y-4">
      {/* Schedule selector + actions */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Rooster:</span>
          <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Kies een rooster..." />
            </SelectTrigger>
            <SelectContent>
              {schedules.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} {s.status === 'published' ? '✓' : '(concept)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {templates.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Template:</span>
            <Select onValueChange={(id) => {
              const tpl = templates.find(t => t.id === id);
              if (tpl?.suggested_patch?.requiredHours) {
                setRequiredHours(tpl.suggested_patch.requiredHours);
              }
            }}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Laad template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex-1" />

        {hasAnyHours && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSaveTemplateOpen(true)}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Opslaan als template
          </Button>
        )}
      </div>

      {/* Dagdelen / uren invoer raster */}
      {visibleDayparts.length > 0 ? (
        <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-light)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Dagdelen — vul benodigde uren in per dag</span>
            <div className="flex items-center gap-1 ml-2">
              <Info className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Medewerkers kleuren groen zodra ze overeenkomen met de uren en voorkeur</span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-light)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="px-4 py-3 text-left font-semibold w-64" style={{ color: 'var(--color-text-secondary)' }}>Dagdeel</th>
                {DAYS.map((d, i) => (
                  <th key={d} className="px-2 py-3 text-center font-semibold w-20" style={{ color: 'var(--color-text-secondary)' }}>
                    <div>{d}</div>
                    <div className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>{DAY_LABELS[i].slice(0, 3)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleDayparts.map((dp, idx) => (
                <tr
                  key={dp.id}
                  style={{ borderBottom: idx < visibleDayparts.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dp.color || '#6366f1' }}
                      />
                      <div>
                        <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{dp.name}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {dp.startTime} – {dp.endTime} · {getDeptName(dp.departmentId)}
                        </div>
                      </div>
                    </div>
                  </td>
                  {DAYS.map((_, dayIndex) => {
                    const key = `${dp.id}_${dayIndex}`;
                    return (
                      <td key={dayIndex} className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={requiredHours[key] || ''}
                          onChange={(e) =>
                            setRequiredHours(prev => ({ ...prev, [key]: e.target.value }))
                          }
                          placeholder="—"
                          className="w-16 text-center rounded-lg border px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2"
                          style={{
                            backgroundColor: requiredHours[key] ? 'rgba(99,102,241,0.08)' : 'var(--color-surface-light)',
                            borderColor: requiredHours[key] ? '#6366f1' : 'var(--color-border)',
                            color: 'var(--color-text-primary)',
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 rounded-xl border text-center text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          {selectedDepartmentId === 'all'
            ? 'Kies een afdeling om de bijbehorende dagdelen te tonen.'
            : 'Geen dagdelen gevonden voor deze afdeling.'}
        </div>
      )}

      {/* Medewerkers tabel */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            Beschikbare medewerkers
          </span>
          <Badge variant="secondary">{employees.length}</Badge>
          {hasAnyHours && (
            <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>
              Groen = goed passend op uren & voorkeur
            </span>
          )}
        </div>

        {employees.length === 0 ? (
          <div className="p-8 rounded-xl border text-center text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
            Geen medewerkers gevonden voor de geselecteerde filters.
          </div>
        ) : (
          <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-light)', borderBottom: '1px solid var(--color-border)' }}>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Medewerker</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Functie</th>
                  {DAYS.map((d) => (
                    <th key={d} className="px-2 py-3 text-center font-semibold w-14" style={{ color: 'var(--color-text-secondary)' }}>{d}</th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Contract/wk</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Voorkeur shifts</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Voorkeur afdelingen</th>
                  {hasAnyHours && (
                    <th className="px-4 py-3 text-center font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Match</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => {
                  const score = hasAnyHours ? getEmployeeScore(emp) : 'neutral';
                  const style = scoreStyles[score];
                  const preferredDepts = (emp.preferred_departmentIds || [])
                    .map(id => departments.find(d => d.id === id)?.name)
                    .filter(Boolean);
                  const preferredShifts = emp.preferences?.preferred_shifts || [];

                  return (
                    <tr
                      key={emp.id}
                      style={{
                        ...scoreStyles[score],
                        borderBottom: idx < employees.length - 1 ? '1px solid var(--color-border)' : 'none',
                        backgroundColor: 'var(--color-surface)',
                        transition: 'background-color 150ms',
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-light)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7 flex-shrink-0">
                            <AvatarImage src={emp.avatar_url} />
                            <AvatarFallback className="text-xs text-white" style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #94a3b8 100%)' }}>
                              {getInitials(emp.first_name, emp.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium whitespace-nowrap">
                            {emp.last_name}, {emp.first_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                        {getFuncName(emp.functionId) || '—'}
                      </td>
                      {DAYS.map((_, dayIndex) => {
                        const isPref = hasPreferredDay(emp, dayIndex);
                        const hrs = getEmployeeHoursForDay(emp, dayIndex);
                        const hasHrsRequired = Object.entries(requiredHours).some(
                          ([k, v]) => k.endsWith(`_${dayIndex}`) && parseFloat(v) > 0
                        );
                        return (
                          <td key={dayIndex} className="px-1 py-3 text-center">
                            <div
                              className="w-10 h-8 mx-auto rounded-lg flex items-center justify-center text-xs font-medium"
                              title={isPref ? 'Voorkeur voor deze dag' : ''}
                              style={{
                                backgroundColor: isPref && hasHrsRequired
                                  ? '#bbf7d0'
                                  : hasHrsRequired
                                  ? 'var(--color-surface-light)'
                                  : 'transparent',
                                color: isPref && hasHrsRequired ? '#166534' : 'var(--color-text-muted)',
                                border: isPref && hasHrsRequired ? '1px solid #86efac' : 'none',
                                fontWeight: isPref ? 700 : 400,
                              }}
                            >
                              {isPref ? '★' : ''}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {emp.contract_hours ? `${emp.contract_hours}u` : '—'}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)', maxWidth: '180px' }}>
                        <span className="truncate block text-xs">
                          {preferredShifts.length > 0 ? preferredShifts.join(', ') : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)', maxWidth: '200px' }}>
                        <span className="truncate block text-xs">
                          {preferredDepts.length > 0 ? preferredDepts.join(', ') : '—'}
                        </span>
                      </td>
                      {hasAnyHours && (
                        <td className="px-4 py-3 text-center">
                          {score !== 'neutral' && (
                            <span
                              className="text-xs px-2 py-1 rounded-md font-medium whitespace-nowrap"
                              style={scoreBadgeStyles[score]}
                            >
                              {scoreLabels[score]}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SaveTemplateDialog
        open={saveTemplateOpen}
        onClose={() => setSaveTemplateOpen(false)}
        requiredHours={requiredHours}
        companyId={companyId}
        onSaved={() => {
          setSaveTemplateOpen(false);
          queryClient.invalidateQueries(['planning-templates', companyId]);
        }}
      />
    </div>
  );
}