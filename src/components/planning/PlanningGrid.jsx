import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Info, PlusCircle, Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import SaveTemplateDialog from '@/components/planning/SaveTemplateDialog';
import { format, startOfWeek, addDays, getISOWeek } from 'date-fns';
import { nl } from 'date-fns/locale';

const DAYS = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO'];
const PREFERRED_DAYS_MAP = { 'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3, 'friday': 4, 'saturday': 5, 'sunday': 6 };

// Get the Monday of a given week
function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function PlanningGrid({
  schedules,
  dayparts,
  departments,
  functions,
  employees,
  selectedDepartmentId,
  companyId,
}) {
  const queryClient = useQueryClient();
  const [requiredHours, setRequiredHours] = useState({});
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [currentWeekMonday, setCurrentWeekMonday] = useState(() => getMondayOfWeek(new Date()));

  // Auto-select the schedule based on selected department
  const selectedSchedule = (() => {
    if (!selectedDepartmentId || selectedDepartmentId === 'all') return null;
    // Find a schedule that includes this department
    return schedules.find(s => s.departmentIds?.includes(selectedDepartmentId)) || null;
  })();
  const selectedScheduleId = selectedSchedule?.id || '';

  // Week navigation
  const weekNumber = getISOWeek(currentWeekMonday);
  const weekYear = currentWeekMonday.getFullYear();
  const weekDates = DAYS.map((_, i) => addDays(currentWeekMonday, i));

  const goToPrevWeek = () => setCurrentWeekMonday(prev => addDays(prev, -7));
  const goToNextWeek = () => setCurrentWeekMonday(prev => addDays(prev, 7));

  // Fetch existing shifts for the selected schedule + week
  const weekStart = format(currentWeekMonday, 'yyyy-MM-dd');
  const weekEnd = format(addDays(currentWeekMonday, 6), 'yyyy-MM-dd');

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', selectedScheduleId, weekStart],
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

  // Get shifts for a specific daypart + date (from already-fetched shifts)
  const getShiftsForCell = (daypartId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter(s => s.daypartId === daypartId && s.date === dateStr);
  };

  // Get employee name by id
  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? `${emp.first_name} ${emp.last_name}` : '';
  };

  // Check if employee has preferred day
  const hasPreferredDay = (employee, dayIndex) => {
    const prefs = employee.preferences?.preferred_days || [];
    return prefs.some(d => PREFERRED_DAYS_MAP[d?.toLowerCase()] === dayIndex);
  };

  // Score employee match for the whole planning
  const getEmployeeScore = (employee) => {
    let totalRequired = 0;
    let preferredDayBonus = 0;

    DAYS.forEach((_, dayIndex) => {
      visibleDayparts.forEach(dp => {
        const key = `${dp.id}_${dayIndex}`;
        const hrs = parseFloat(requiredHours[key] || 0);
        totalRequired += hrs;
        if (hrs > 0 && hasPreferredDay(employee, dayIndex)) {
          preferredDayBonus += hrs;
        }
      });
    });

    if (totalRequired === 0) return 'neutral';

    const contractHrs = employee.contract_hours || 0;
    const diff = Math.abs(contractHrs - totalRequired);
    const hourMatch = diff <= 2;
    const hasPreference = preferredDayBonus > 0;

    if (hourMatch && hasPreference) return 'perfect';
    if (hourMatch) return 'good';
    if (hasPreference) return 'partial';
    return 'neutral';
  };

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

  // Mutation to create shifts
  const createShiftMutation = useMutation({
    mutationFn: (shiftData) => base44.entities.Shift.create(shiftData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts', selectedScheduleId] }),
  });

  // Mutation to delete a shift
  const deleteShiftMutation = useMutation({
    mutationFn: (shiftId) => base44.entities.Shift.delete(shiftId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts', selectedScheduleId] }),
  });

  const [addingEmployeeId, setAddingEmployeeId] = useState(null);

  const handleAssignEmployee = async (emp) => {
    if (!selectedScheduleId) {
      toast.error('Selecteer eerst een afdeling met een gekoppeld rooster.');
      return;
    }

    setAddingEmployeeId(emp.id);
    try {
      const promises = [];
      visibleDayparts.forEach(dp => {
        DAYS.forEach((_, dayIndex) => {
          const key = `${dp.id}_${dayIndex}`;
          if (parseFloat(requiredHours[key] || 0) > 0) {
            const date = format(weekDates[dayIndex], 'yyyy-MM-dd');
            promises.push(createShiftMutation.mutateAsync({
              companyId,
              scheduleId: selectedScheduleId,
              employeeId: emp.id,
              departmentId: dp.departmentId,
              daypartId: dp.id,
              functionId: emp.functionId,
              date,
              start_time: dp.startTime,
              end_time: dp.endTime,
              break_duration: dp.break_duration || 30,
              shift_type: 'regular',
              status: 'scheduled',
            }));
          }
        });
      });
      await Promise.all(promises);
      toast.success(`${emp.first_name} ${emp.last_name} ingepland voor week ${weekNumber}`);
    } finally {
      setAddingEmployeeId(null);
    }
  };

  const handleRemoveShift = async (shiftId) => {
    try {
      await deleteShiftMutation.mutateAsync(shiftId);
    } catch {
      // Shift was already removed, just refresh
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedScheduleId] });
    }
  };

  const hasAnyHours = Object.values(requiredHours).some(v => parseFloat(v) > 0);
  const selectedDept = departments.find(d => d.id === selectedDepartmentId);

  return (
    <div className="space-y-4">

      {/* Week navigator */}
      <div className="flex items-center justify-between p-3 rounded-xl border"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <Button variant="ghost" size="sm" onClick={goToPrevWeek} className="gap-1">
          <ChevronLeft className="w-4 h-4" /> Vorige week
        </Button>
        <div className="text-center">
          <div className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
            Week {weekNumber} · {weekYear}
          </div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {format(currentWeekMonday, 'd MMM', { locale: nl })} – {format(addDays(currentWeekMonday, 6), 'd MMM yyyy', { locale: nl })}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={goToNextWeek} className="gap-1">
          Volgende week <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* No department selected warning */}
      {(!selectedDepartmentId || selectedDepartmentId === 'all') && (
        <div className="p-3 rounded-lg border text-sm flex items-center gap-2"
          style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderColor: '#f59e0b', color: '#b45309' }}>
          <Info className="w-4 h-4 flex-shrink-0" />
          <span><strong>Stap 1:</strong> Kies een afdeling (rooster) via de kaarten hierboven.</span>
        </div>
      )}

      {/* Schedule info */}
      {selectedDept && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg border text-sm"
          style={{ backgroundColor: 'var(--color-surface-light)', borderColor: 'var(--color-border)' }}>
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedDept.color || '#6366f1' }}
          />
          <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{selectedDept.name}</span>
          {selectedSchedule ? (
            <span style={{ color: 'var(--color-text-muted)' }}>
              → Rooster: <strong>{selectedSchedule.name}</strong>
              {selectedSchedule.status === 'published' ? ' ✓' : ' (concept)'}
            </span>
          ) : (
            <span style={{ color: '#b45309' }}>
              — Geen rooster gekoppeld aan deze afdeling
            </span>
          )}

          {/* Template loader */}
          {templates.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Template laden:</span>
              <select
                className="text-xs px-2 py-1 rounded border"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                defaultValue=""
                onChange={(e) => {
                  const tpl = templates.find(t => t.id === e.target.value);
                  if (tpl?.suggested_patch?.requiredHours) {
                    setRequiredHours(tpl.suggested_patch.requiredHours);
                    toast.success('Template geladen');
                  }
                }}
              >
                <option value="">Kies template...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.description}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Dagdelen raster met ingevulde namen */}
      {visibleDayparts.length > 0 ? (
        <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <div className="p-3 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-light)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Dagdelen — vul benodigde uren in en plan medewerkers in
            </span>
            {hasAnyHours && (
              <Button variant="outline" size="sm" onClick={() => setSaveTemplateOpen(true)} className="gap-2">
                <Save className="w-3 h-3" /> Opslaan als template
              </Button>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-light)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="px-4 py-3 text-left font-semibold w-56" style={{ color: 'var(--color-text-secondary)' }}>Dagdeel</th>
                {DAYS.map((d, i) => (
                  <th key={d} className="px-2 py-2 text-center font-semibold min-w-[110px]" style={{ color: 'var(--color-text-secondary)' }}>
                    <div className="font-bold">{d}</div>
                    <div className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>
                      {format(weekDates[i], 'd MMM', { locale: nl })}
                    </div>
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
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dp.color || '#6366f1' }} />
                      <div>
                        <div className="font-medium text-xs" style={{ color: 'var(--color-text-primary)' }}>{dp.name}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {dp.startTime} – {dp.endTime}
                        </div>
                      </div>
                    </div>
                  </td>
                  {DAYS.map((_, dayIndex) => {
                    const key = `${dp.id}_${dayIndex}`;
                    const cellShifts = getShiftsForCell(dp.id, weekDates[dayIndex]);
                    return (
                      <td key={dayIndex} className="px-1 py-1 align-top" style={{ verticalAlign: 'top', minWidth: 110 }}>
                        {/* Uren invoer */}
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={requiredHours[key] || ''}
                          onChange={(e) => setRequiredHours(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder="—"
                          className="w-full text-center rounded border px-1 py-1 text-xs font-mono focus:outline-none focus:ring-1 mb-1"
                          style={{
                            backgroundColor: requiredHours[key] ? 'rgba(99,102,241,0.08)' : 'var(--color-surface-light)',
                            borderColor: requiredHours[key] ? '#6366f1' : 'var(--color-border)',
                            color: 'var(--color-text-primary)',
                          }}
                        />
                        {/* Ingeplande medewerkers in deze cel */}
                        <div className="space-y-0.5">
                          {cellShifts.map(shift => {
                            const shiftEmp = employees.find(e => e.id === shift.employeeId);
                            return (
                              <div
                                key={shift.id}
                                className="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded text-xs"
                                style={{
                                  backgroundColor: shiftEmp?.color ? `${shiftEmp.color}22` : 'rgba(99,102,241,0.12)',
                                  border: `1px solid ${shiftEmp?.color || '#6366f1'}44`,
                                  color: 'var(--color-text-primary)',
                                }}
                              >
                                <span className="truncate font-medium" style={{ maxWidth: 72 }}>
                                  {shiftEmp ? `${shiftEmp.first_name} ${shiftEmp.last_name?.charAt(0)}.` : '?'}
                                </span>
                                <button
                                  onClick={() => handleRemoveShift(shift.id)}
                                  className="flex-shrink-0 hover:text-red-500 transition-colors"
                                  title="Verwijder"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 rounded-xl border text-center text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          {selectedDepartmentId === 'all'
            ? 'Kies een afdeling om de bijbehorende dagdelen te tonen.'
            : 'Geen dagdelen gevonden voor deze afdeling.'}
        </div>
      )}

      {/* Medewerkers tabel */}
      {employees.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Beschikbare medewerkers
            </span>
            <Badge variant="secondary">{employees.length}</Badge>
            {hasAnyHours && (
              <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>
                Klik op "Inplannen" om een medewerker toe te voegen aan het rooster
              </span>
            )}
          </div>

          <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-light)', borderBottom: '1px solid var(--color-border)' }}>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Medewerker</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Functie</th>
                  {DAYS.map((d) => (
                    <th key={d} className="px-2 py-3 text-center font-semibold w-12" style={{ color: 'var(--color-text-secondary)' }}>{d}</th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Contract</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Voorkeur afdeling</th>
                  {hasAnyHours && (
                    <th className="px-4 py-3 text-center font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Match</th>
                  )}
                  {hasAnyHours && (
                    <th className="px-4 py-3 text-center font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Inplannen</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => {
                  const score = hasAnyHours ? getEmployeeScore(emp) : 'neutral';
                  const preferredDepts = (emp.preferred_departmentIds || [])
                    .map(id => departments.find(d => d.id === id)?.name)
                    .filter(Boolean);

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
                            <AvatarFallback className="text-xs text-white" style={{ background: emp.color || 'linear-gradient(135deg, #38bdf8 0%, #94a3b8 100%)' }}>
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
                        const hasHrsRequired = Object.entries(requiredHours).some(
                          ([k, v]) => k.endsWith(`_${dayIndex}`) && parseFloat(v) > 0
                        );
                        return (
                          <td key={dayIndex} className="px-1 py-3 text-center">
                            <div
                              className="w-8 h-7 mx-auto rounded flex items-center justify-center text-xs font-bold"
                              title={isPref ? 'Voorkeur voor deze dag' : ''}
                              style={{
                                backgroundColor: isPref && hasHrsRequired ? '#bbf7d0' : hasHrsRequired ? 'var(--color-surface-light)' : 'transparent',
                                color: isPref && hasHrsRequired ? '#166534' : 'var(--color-text-muted)',
                                border: isPref && hasHrsRequired ? '1px solid #86efac' : 'none',
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
                          {preferredDepts.length > 0 ? preferredDepts.join(', ') : '—'}
                        </span>
                      </td>
                      {hasAnyHours && (
                        <td className="px-4 py-3 text-center">
                          {score !== 'neutral' && (
                            <span className="text-xs px-2 py-1 rounded-md font-medium whitespace-nowrap" style={scoreBadgeStyles[score]}>
                              {scoreLabels[score]}
                            </span>
                          )}
                        </td>
                      )}
                      {hasAnyHours && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleAssignEmployee(emp)}
                            disabled={addingEmployeeId === emp.id}
                            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                            style={{
                              backgroundColor: 'rgba(99,102,241,0.1)',
                              color: '#6366f1',
                              border: '1px solid rgba(99,102,241,0.3)',
                              cursor: addingEmployeeId === emp.id ? 'not-allowed' : 'pointer',
                              opacity: addingEmployeeId === emp.id ? 0.6 : 1,
                            }}
                          >
                            {addingEmployeeId === emp.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <PlusCircle className="w-3 h-3" />
                            }
                            Inplannen
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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