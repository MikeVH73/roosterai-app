import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function calculateShiftHours(shift) {
  const [startH, startM] = shift.start_time.split(':').map(Number);
  const [endH, endM] = shift.end_time.split(':').map(Number);
  let hours = (endH * 60 + endM - startH * 60 - startM) / 60;
  if (hours < 0) hours += 24;
  return hours;
}

function calculateBreakHours(shift) {
  return (shift.break_duration || 0) / 60;
}

function calculateNetHours(shift) {
  return Math.max(0, calculateShiftHours(shift) - calculateBreakHours(shift));
}

export default function DaypartScheduleGrid({
  dayparts,
  employees,
  shifts,
  weekDays,
  staffingRequirements,
  functions,
  onCellClick,
  onShiftClick
}) {
  const getInitials = (first, last) => {
    return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
  };

  const getFunctionColor = (funcId) => {
    const func = functions.find(f => f.id === funcId);
    return func?.color || '#3B82F6';
  };

  const sortedDayparts = useMemo(() => {
    return [...dayparts].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [dayparts]);

  // Get shifts for a specific employee, day, and daypart
  const getShiftsForCell = (employeeId, date, daypartId) => {
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    return shifts.filter(s => 
      s.employeeId === employeeId && 
      s.date === dateStr && 
      s.daypartId === daypartId
    );
  };

  // Calculate total hours per employee per day
  const calculateEmployeeDayTotal = (employeeId, date) => {
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    const dayShifts = shifts.filter(s => s.employeeId === employeeId && s.date === dateStr);
    return dayShifts.reduce((sum, s) => sum + calculateNetHours(s), 0);
  };

  // Calculate total hours per day (all employees)
  const calculateDayTotal = (date) => {
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    const dayShifts = shifts.filter(s => s.date === dateStr);
    return dayShifts.reduce((sum, s) => sum + calculateNetHours(s), 0);
  };

  // Calculate subtotal per daypart per day
  const calculateDaypartSubtotal = (daypartId, date) => {
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    const daypartShifts = shifts.filter(s => s.date === dateStr && s.daypartId === daypartId);
    return daypartShifts.reduce((sum, s) => sum + calculateNetHours(s), 0);
  };

  // Get target hours for a daypart on a specific day
  const getTargetHours = (daypartId, date) => {
    const dayOfWeek = parseISO(date).getDay();
    const req = staffingRequirements.find(r => 
      r.daypartId === daypartId && 
      (r.specific_date === date || r.day_of_week === dayOfWeek)
    );
    return req?.targetHours || null;
  };

  if (sortedDayparts.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Geen dagdelen gedefinieerd voor deze afdeling.</p>
        <p className="text-sm mt-1">Configureer dagdelen bij de afdelingsinstellingen.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="sticky left-0 bg-slate-50 z-20 p-3 text-left text-sm font-medium text-slate-600 border-r border-slate-200 min-w-[180px]">
              Medewerker
            </th>
            {weekDays.map((day) => (
              <th 
                key={day.toISOString()} 
                className="p-3 text-center text-sm font-medium text-slate-600 border-r border-slate-200 last:border-r-0 min-w-[200px]"
              >
                <div>{format(day, 'EEEE', { locale: nl })}</div>
                <div className="text-lg font-semibold text-slate-900">{format(day, 'd MMM', { locale: nl })}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <tr>
              <td colSpan={1 + weekDays.length} className="p-8 text-center text-slate-500">
                Geen medewerkers gevonden voor dit rooster
              </td>
            </tr>
          ) : (
            <>
              {/* Employee rows */}
              {employees.map((employee) => (
                <tr key={employee.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="sticky left-0 bg-white z-10 p-3 border-r border-slate-200 min-w-[180px]">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-medium">
                          {getInitials(employee.first_name, employee.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 text-sm truncate">
                          {employee.first_name} {employee.last_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {employee.contract_hours ? `${employee.contract_hours}u/week` : 'Flex'}
                        </p>
                      </div>
                    </div>
                  </td>
                  {weekDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const employeeDayTotal = calculateEmployeeDayTotal(employee.id, dateStr);

                    return (
                      <td 
                        key={`${day.toISOString()}_${employee.id}`}
                        className="p-2 align-top border-r border-slate-200 last:border-r-0 bg-white min-w-[200px]"
                      >
                        <div className="space-y-2">
                          {sortedDayparts.map((daypart) => {
                            const cellShifts = getShiftsForCell(employee.id, dateStr, daypart.id);
                            
                            if (cellShifts.length === 0) return null;

                            return (
                              <div 
                                key={daypart.id}
                                className="rounded-lg p-2 border border-slate-200"
                                style={{ 
                                  backgroundColor: `${daypart.color}10` || '#F8FAFC',
                                  borderColor: `${daypart.color}40` || '#E2E8F0'
                                }}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span 
                                    className="text-xs font-medium"
                                    style={{ color: daypart.color || '#64748B' }}
                                  >
                                    {daypart.name}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {daypart.startTime}-{daypart.endTime}
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  {cellShifts.map((shift) => {
                                    const breakHours = calculateBreakHours(shift);
                                    const netHours = calculateNetHours(shift);
                                    return (
                                      <div
                                        key={shift.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onShiftClick?.(shift);
                                        }}
                                        className="px-2 py-1.5 rounded text-xs cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
                                        style={{ 
                                          backgroundColor: `${getFunctionColor(shift.functionId)}20`,
                                          borderLeft: `3px solid ${getFunctionColor(shift.functionId)}`
                                        }}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium" style={{ color: getFunctionColor(shift.functionId) }}>
                                            {shift.start_time}-{shift.end_time}
                                          </span>
                                          <span className="text-[10px] text-slate-600 font-medium">
                                            {netHours.toFixed(1)}u
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}

                          {employeeDayTotal > 0 && (
                            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                              <span className="text-xs text-slate-500">Totaal</span>
                              <span className="text-xs font-semibold text-slate-700">
                                {employeeDayTotal.toFixed(1)}u
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Subtotal per dagdeel */}
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td className="sticky left-0 bg-slate-50 z-10 p-3 border-r border-slate-200 text-sm font-semibold text-slate-700">
                  Subtotaal per dagdeel
                </td>
                {weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  
                  return (
                    <td 
                      key={`${day.toISOString()}_subtotal`}
                      className="p-2 border-r border-slate-200 last:border-r-0"
                    >
                      <div className="space-y-1">
                        {sortedDayparts.map((daypart) => {
                          const subtotal = calculateDaypartSubtotal(daypart.id, dateStr);
                          if (subtotal === 0) return null;

                          const targetHours = getTargetHours(daypart.id, dateStr);
                          let statusColor = 'text-slate-700';
                          if (targetHours) {
                            const percentage = (subtotal / targetHours) * 100;
                            if (percentage < 80 || percentage > 120) statusColor = 'text-red-600';
                            else if (percentage < 95 || percentage > 105) statusColor = 'text-amber-600';
                            else statusColor = 'text-green-600';
                          }

                          return (
                            <div 
                              key={daypart.id}
                              className="text-xs flex items-center justify-between px-2 py-1 rounded"
                              style={{ backgroundColor: `${daypart.color}20` || '#F8FAFC' }}
                            >
                              <span style={{ color: daypart.color || '#64748B' }}>
                                {daypart.name}
                              </span>
                              <span className={`font-semibold ${statusColor}`}>
                                {subtotal.toFixed(1)}u
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Daily total row */}
              <tr className="border-t-2 border-slate-400 bg-slate-100 font-bold">
                <td className="sticky left-0 bg-slate-100 z-10 p-3 border-r border-slate-200 text-sm text-slate-900">
                  Totaal per dag
                </td>
                {weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dailyTotal = calculateDayTotal(dateStr);
                  
                  return (
                    <td 
                      key={`${day.toISOString()}_total`}
                      className="p-3 text-center text-sm text-slate-900 border-r border-slate-200 last:border-r-0"
                    >
                      {dailyTotal.toFixed(1)}u
                    </td>
                  );
                })}
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}