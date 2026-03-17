import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Info, PlusCircle, Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import SaveTemplateDialog from '@/components/planning/SaveTemplateDialog';
import { format, addDays, getISOWeek, startOfMonth, endOfMonth } from 'date-fns';
import { nl } from 'date-fns/locale';

const DAYS = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO'];

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function calcShiftHours(shift) {
  if (!shift.start_time || !shift.end_time) return 0;
  const [sh, sm] = shift.start_time.split(':').map(Number);
  const [eh, em] = shift.end_time.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  mins -= (shift.break_duration || 0);
  return Math.max(0, mins / 60);
}

function getInitials(first, last) {
  return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
}

export default function PlanningDaypartsPanel({
  schedules,
  dayparts,
  departments,
  functions,
  employees,
  filteredEmployees,
  selectedEmployeeIds,
  selectedDepartmentId,
  companyId,
  requiredHours,
  onRequiredHoursChange,
}) {
  const queryClient = useQueryClient();
  const setRequiredHours = onRequiredHoursChange;
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [currentWeekMonday, setCurrentWeekMonday] = useState(() => getMondayOfWeek(new Date()));
  const [addingEmployeeId, setAddingEmployeeId] = useState(null);

  const weekNumber = getISOWeek(currentWeekMonday);
  const weekYear = currentWeekMonday.getFullYear();
  const weekDates = DAYS.map((_, i) => addDays(currentWeekMonday, i));
  const weekStart = format(currentWeekMonday, 'yyyy-MM-dd');
  const weekEnd = format(addDays(currentWeekMonday, 6), 'yyyy-MM-dd');

  // Auto-select schedule based on department
  const selectedSchedule = (() => {
    if (!selectedDepartmentId || selectedDepartmentId === 'all') return null;
    return schedules.find(s => s.departmentIds?.includes(selectedDepartmentId)) || null;
  })();
  const selectedScheduleId = selectedSchedule?.id || '';

  const visibleDayparts = dayparts.filter(dp =>
    selectedDepartmentId === 'all' || dp.departmentId === selectedDepartmentId
  );

  // Fetch shifts for this schedule (all time, to calculate monthly hours too)
  const { data: allShifts = [] } = useQuery({
    queryKey: ['shifts-all', selectedScheduleId, weekYear],
    queryFn: () => base44.entities.Shift.filter({ companyId, scheduleId: selectedScheduleId }),
    enabled: !!selectedScheduleId,
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['planning-templates', companyId],
    queryFn: () => base44.entities.AISuggestion.filter({ companyId, context_type: 'alternative_schedule' }),
    enabled: !!companyId,
  });

  // Filter shifts for this week
  const weekShifts = allShifts.filter(s => s.date >= weekStart && s.date <= weekEnd);

  // Filter shifts for this month
  const monthStart = format(startOfMonth(currentWeekMonday), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentWeekMonday), 'yyyy-MM-dd');
  const monthShifts = allShifts.filter(s => s.date >= monthStart && s.date <= monthEnd);

  const getShiftsForCell = (daypartId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return weekShifts.filter(s => s.daypartId === daypartId && s.date === dateStr);
  };

  // Hours this week per employee
  const getWeekHoursForEmployee = (empId) => {
    return weekShifts
      .filter(s => s.employeeId === empId)
      .reduce((sum, s) => sum + calcShiftHours(s), 0);
  };

  // Hours this month per employee (excluding current week to show "already worked")
  const getMonthHoursForEmployee = (empId) => {
    return monthShifts
      .filter(s => s.employeeId === empId)
      .reduce((sum, s) => sum + calcShiftHours(s), 0);
  };

  // Total hours per day (sum of all shift hours on that date)
  const getDayTotalHours = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return weekShifts
      .filter(s => s.date === dateStr)
      .reduce((sum, s) => sum + calcShiftHours(s), 0);
  };

  // Total hours this week across all shifts
  const weekTotalHours = weekShifts.reduce((sum, s) => sum + calcShiftHours(s), 0);

  // Mutations
  const createShiftMutation = useMutation({
    mutationFn: (shiftData) => base44.entities.Shift.create(shiftData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts-all', selectedScheduleId] }),
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (shiftId) => base44.entities.Shift.delete(shiftId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts-all', selectedScheduleId] }),
  });

  const handleAssignSelected = async () => {
    if (!selectedScheduleId) {
      toast.error('Geen rooster gekoppeld aan deze afdeling.');
      return;
    }
    if (selectedEmployeeIds.size === 0) {
      toast.error('Selecteer eerst een medewerker in de middelste kolom.');
      return;
    }
    const hasHours = Object.values(requiredHours).some(v => parseFloat(v) > 0);
    if (!hasHours) {
      toast.error('Vul eerst uren in bij de dagdelen.');
      return;
    }

    for (const empId of selectedEmployeeIds) {
      const emp = employees.find(e => e.id === empId);
      if (!emp) continue;
      setAddingEmployeeId(empId);
      const promises = [];
      visibleDayparts.forEach(dp => {
        DAYS.forEach((_, dayIndex) => {
          const key = `${dp.id}_${dayIndex}`;
          if (parseFloat(requiredHours[key] || 0) > 0) {
            const date = format(weekDates[dayIndex], 'yyyy-MM-dd');
            promises.push(createShiftMutation.mutateAsync({
              companyId,
              scheduleId: selectedScheduleId,
              employeeId: empId,
              departmentId: dp.departmentId,
              daypartId: dp.id,
              functionId: emp.functionId,
              date,
              start_time: dp.startTime,
              end_time: dp.endTime,
              break_duration: dp.break_duration ?? 0,
              shift_type: 'regular',
              status: 'scheduled',
            }));
          }
        });
      });
      await Promise.all(promises);
    }
    setAddingEmployeeId(null);
    toast.success(`${selectedEmployeeIds.size} medewerker(s) ingepland voor week ${weekNumber}`);
  };

  const handleRemoveShift = async (shiftId) => {
    try {
      await deleteShiftMutation.mutateAsync(shiftId);
    } catch {
      queryClient.invalidateQueries({ queryKey: ['shifts-all', selectedScheduleId] });
    }
  };

  const hasAnyHours = Object.values(requiredHours).some(v => parseFloat(v) > 0);
  const selectedDept = departments.find(d => d.id === selectedDepartmentId);

  return (
    <div className="space-y-3">

      {/* Week navigator */}
      <div
        className="flex items-center justify-between px-4 py-2.5 rounded-xl border"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <Button variant="ghost" size="sm" onClick={() => setCurrentWeekMonday(prev => addDays(prev, -7))} className="gap-1">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <div className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Week {weekNumber} · {weekYear}
          </div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {format(currentWeekMonday, 'd MMM', { locale: nl })} – {format(addDays(currentWeekMonday, 6), 'd MMM yyyy', { locale: nl })}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setCurrentWeekMonday(prev => addDays(prev, 7))} className="gap-1">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Status bar */}
      {(!selectedDepartmentId || selectedDepartmentId === 'all') ? (
        <div className="p-3 rounded-lg border text-sm flex items-center gap-2"
          style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderColor: '#f59e0b', color: '#b45309' }}>
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>Kies een afdeling in de linker kolom om te beginnen.</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg border text-xs"
          style={{ backgroundColor: 'var(--color-surface-light)', borderColor: 'var(--color-border)' }}>
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedDept?.color || '#6366f1' }} />
          <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{selectedDept?.name}</span>
          {selectedSchedule ? (
            <span style={{ color: 'var(--color-text-muted)' }}>
              Rooster: <strong>{selectedSchedule.name}</strong>
              {selectedSchedule.status === 'published' ? ' ✓' : ' (concept)'}
            </span>
          ) : (
            <span style={{ color: '#b45309' }}>— Geen rooster gekoppeld</span>
          )}

          {templates.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span style={{ color: 'var(--color-text-muted)' }}>Template:</span>
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
                <option value="">Laad template...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.description}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Dagdelen raster */}
      {visibleDayparts.length > 0 && (
        <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <div className="px-3 py-2 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-light)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Dagdelen — vul benodigde uren in
            </span>
            <div className="flex items-center gap-2">
              {selectedEmployeeIds.size > 0 && hasAnyHours && (
                <button
                  onClick={handleAssignSelected}
                  disabled={!!addingEmployeeId}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{
                    backgroundColor: 'rgba(99,102,241,0.12)',
                    color: '#6366f1',
                    border: '1px solid rgba(99,102,241,0.4)',
                    cursor: addingEmployeeId ? 'not-allowed' : 'pointer',
                    opacity: addingEmployeeId ? 0.6 : 1,
                  }}
                >
                  {addingEmployeeId
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <PlusCircle className="w-3 h-3" />
                  }
                  Inplannen ({selectedEmployeeIds.size})
                </button>
              )}
              {hasAnyHours && (
                <Button variant="outline" size="sm" onClick={() => setSaveTemplateOpen(true)} className="gap-1 text-xs h-7">
                  <Save className="w-3 h-3" /> Opslaan als template
                </Button>
              )}
            </div>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-light)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="px-3 py-2 text-left font-semibold w-48" style={{ color: 'var(--color-text-secondary)' }}>Dagdeel</th>
                {DAYS.map((d, i) => (
                  <th key={d} className="px-1 py-2 text-center font-semibold min-w-[100px]" style={{ color: 'var(--color-text-secondary)' }}>
                    <div className="font-bold">{d}</div>
                    <div className="font-normal text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {format(weekDates[i], 'd MMM', { locale: nl })}
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center font-semibold w-16" style={{ color: 'var(--color-text-secondary)' }}>Totaal</th>
              </tr>
            </thead>
            <tbody>
              {/* Input rijen per dagdeel */}
              {visibleDayparts.map((dp, idx) => (
                <tr key={dp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dp.color || '#6366f1' }} />
                      <div>
                        <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{dp.name}</div>
                        <div style={{ color: 'var(--color-text-muted)' }}>{dp.startTime}–{dp.endTime}</div>
                      </div>
                    </div>
                  </td>
                  {DAYS.map((_, dayIndex) => {
                    const key = `${dp.id}_${dayIndex}`;
                    const cellShifts = getShiftsForCell(dp.id, weekDates[dayIndex]);
                    return (
                      <td key={dayIndex} className="px-1 py-1 align-top" style={{ minWidth: 100 }}>
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
                        {/* Ingeplande medewerkers */}
                        <div className="space-y-0.5">
                          {cellShifts.map(shift => {
                            const shiftEmp = employees.find(e => e.id === shift.employeeId);
                            return (
                              <div
                                key={shift.id}
                                className="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: shiftEmp?.color ? `${shiftEmp.color}22` : 'rgba(99,102,241,0.12)',
                                  border: `1px solid ${shiftEmp?.color || '#6366f1'}44`,
                                }}
                              >
                                <span className="truncate font-medium" style={{ color: 'var(--color-text-primary)', maxWidth: 60 }}>
                                  {shiftEmp ? `${shiftEmp.first_name} ${shiftEmp.last_name?.charAt(0)}.` : '?'}
                                </span>
                                <button
                                  onClick={() => handleRemoveShift(shift.id)}
                                  className="flex-shrink-0 hover:text-red-500 transition-colors"
                                  style={{ color: 'var(--color-text-muted)' }}
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
                  {/* Totaal uren voor dit dagdeel */}
                  <td className="px-2 py-1 text-center font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {(() => {
                      const total = DAYS.reduce((sum, _, i) => sum + parseFloat(requiredHours[`${dp.id}_${i}`] || 0), 0);
                      return total > 0 ? `${total}u` : '—';
                    })()}
                  </td>
                </tr>
              ))}

              {/* Totaal uren per dag rij */}
              <tr style={{ backgroundColor: 'var(--color-surface-light)', borderTop: '2px solid var(--color-border)' }}>
                <td className="px-3 py-2 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  Totaal uren/dag
                </td>
                {DAYS.map((_, dayIndex) => {
                  const dayTotal = visibleDayparts.reduce((sum, dp) => sum + parseFloat(requiredHours[`${dp.id}_${dayIndex}`] || 0), 0);
                  const actualHours = getDayTotalHours(weekDates[dayIndex]);
                  return (
                    <td key={dayIndex} className="px-1 py-2 text-center">
                      {dayTotal > 0 && (
                        <div className="font-bold font-mono" style={{ color: '#6366f1' }}>{dayTotal}u nodig</div>
                      )}
                      {actualHours > 0 && (
                        <div className="font-mono" style={{ color: '#16a34a' }}>{actualHours.toFixed(1)}u gepland</div>
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-center font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {weekTotalHours > 0 ? `${weekTotalHours.toFixed(1)}u` : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Medewerker uren overzicht */}
      {weekShifts.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-light)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Uren overzicht medewerkers — week {weekNumber}
            </span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-light)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Medewerker</th>
                <th className="px-3 py-2 text-center font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Contract/wk</th>
                <th className="px-3 py-2 text-center font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Ingepland week {weekNumber}</th>
                <th className="px-3 py-2 text-center font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Totaal deze maand</th>
                <th className="px-3 py-2 text-center font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Nog beschikbaar</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Get unique employees with shifts this week
                const empIds = [...new Set(weekShifts.map(s => s.employeeId))];
                return empIds.map((empId, idx) => {
                  const emp = employees.find(e => e.id === empId);
                  if (!emp) return null;
                  const weekHrs = getWeekHoursForEmployee(empId);
                  const monthHrs = getMonthHoursForEmployee(empId);
                  const contractWk = emp.contract_hours || 0;
                  // Rough monthly capacity = contract hours * 4.33 weeks
                  const monthCapacity = contractWk * 4.33;
                  const remaining = Math.max(0, monthCapacity - monthHrs);
                  const isOver = monthHrs > monthCapacity;

                  return (
                    <tr
                      key={empId}
                      style={{ borderBottom: idx < empIds.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6 flex-shrink-0">
                            <AvatarImage src={emp.avatar_url} />
                            <AvatarFallback className="text-xs text-white" style={{ background: emp.color || '#6366f1', fontSize: 9 }}>
                              {getInitials(emp.first_name, emp.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {emp.first_name} {emp.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                        {contractWk ? `${contractWk}u` : '—'}
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-bold" style={{ color: '#6366f1' }}>
                        {weekHrs.toFixed(1)}u
                      </td>
                      <td className="px-3 py-2 text-center font-mono" style={{ color: isOver ? '#ef4444' : 'var(--color-text-primary)' }}>
                        {monthHrs.toFixed(1)}u
                        {contractWk > 0 && (
                          <span className="ml-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            / {monthCapacity.toFixed(0)}u
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center font-mono">
                        {contractWk > 0 ? (
                          <span
                            className="px-2 py-0.5 rounded font-bold"
                            style={{
                              backgroundColor: isOver ? 'rgba(239,68,68,0.1)' : remaining < contractWk ? 'rgba(245,158,11,0.1)' : 'rgba(22,163,74,0.1)',
                              color: isOver ? '#ef4444' : remaining < contractWk ? '#b45309' : '#16a34a',
                            }}
                          >
                            {isOver ? `+${(monthHrs - monthCapacity).toFixed(1)}u over` : `${remaining.toFixed(1)}u`}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
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