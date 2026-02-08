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
  if (hours < 0) hours += 24; // overnight shift
  const breakHours = (shift.break_duration || 0) / 60;
  return Math.max(0, hours - breakHours);
}

function StaffingIndicator({ scheduledHours, targetHours }) {
  if (!targetHours) return null;
  
  const percentage = (scheduledHours / targetHours) * 100;
  let status, color, bgColor;
  
  if (percentage >= 95 && percentage <= 105) {
    status = 'ok';
    color = 'text-green-700';
    bgColor = 'bg-green-100';
  } else if (percentage >= 80 && percentage < 95) {
    status = 'warning';
    color = 'text-amber-700';
    bgColor = 'bg-amber-100';
  } else if (percentage > 105 && percentage <= 120) {
    status = 'over';
    color = 'text-amber-700';
    bgColor = 'bg-amber-100';
  } else {
    status = 'critical';
    color = 'text-red-700';
    bgColor = 'bg-red-100';
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${bgColor} ${color}`}>
            {status === 'ok' ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <AlertTriangle className="w-3 h-3" />
            )}
            <span>{scheduledHours.toFixed(1)}h / {targetHours}h</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{percentage.toFixed(0)}% bezetting</p>
          <p className="text-xs text-slate-400">
            {percentage < 95 ? 'Onderbezetting' : percentage > 105 ? 'Overbezetting' : 'Optimaal'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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

  // Calculate scheduled hours per daypart per day
  const scheduledHoursMap = useMemo(() => {
    const map = {};
    shifts.forEach(shift => {
      const key = `${shift.date}_${shift.daypartId}`;
      const hours = calculateShiftHours(shift);
      map[key] = (map[key] || 0) + hours;
    });
    return map;
  }, [shifts]);

  // Get target hours for a daypart on a specific day
  const getTargetHours = (daypartId, date) => {
    const dayOfWeek = parseISO(date).getDay();
    const req = staffingRequirements.find(r => 
      r.daypartId === daypartId && 
      (r.specific_date === date || r.day_of_week === dayOfWeek)
    );
    return req?.targetHours || null;
  };

  // Get shifts for a specific employee, day, and daypart
  const getShiftsForCell = (employeeId, date, daypartId) => {
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    return shifts.filter(s => 
      s.employeeId === employeeId && 
      s.date === dateStr && 
      s.daypartId === daypartId
    );
  };

  const sortedDayparts = [...dayparts].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

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
            <th className="sticky left-0 bg-slate-50 z-20 p-3 text-left text-sm font-medium text-slate-600 w-48 border-r border-slate-200">
              Medewerker
            </th>
            {weekDays.map((day) => (
              <th 
                key={day.toISOString()} 
                colSpan={sortedDayparts.length}
                className="p-3 text-center text-sm font-medium text-slate-600 border-r border-slate-200 last:border-r-0"
              >
                <div>{format(day, 'EEEE', { locale: nl })}</div>
                <div className="text-lg font-semibold text-slate-900">{format(day, 'd MMM', { locale: nl })}</div>
              </th>
            ))}
          </tr>
          {/* Daypart Headers */}
          <tr className="bg-slate-100/50">
            <th className="sticky left-0 bg-slate-100/50 z-20 p-2 border-r border-slate-200">
              <span className="text-xs text-slate-500">Dagdeel →</span>
            </th>
            {weekDays.map((day) => (
              sortedDayparts.map((daypart, dpIndex) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const scheduledHours = scheduledHoursMap[`${dateStr}_${daypart.id}`] || 0;
                const targetHours = getTargetHours(daypart.id, dateStr);
                
                return (
                  <th 
                    key={`${day.toISOString()}_${daypart.id}`}
                    className={`p-2 text-center min-w-28 ${
                      dpIndex < sortedDayparts.length - 1 ? 'border-r border-slate-100' : 'border-r border-slate-200'
                    }`}
                    style={{ backgroundColor: daypart.color || '#F8FAFC' }}
                  >
                    <div className="text-xs font-medium text-slate-700">{daypart.name}</div>
                    <div className="text-[10px] text-slate-500">{daypart.startTime}-{daypart.endTime}</div>
                    <div className="mt-1">
                      <StaffingIndicator 
                        scheduledHours={scheduledHours} 
                        targetHours={targetHours} 
                      />
                    </div>
                  </th>
                );
              })
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <tr>
              <td colSpan={1 + weekDays.length * sortedDayparts.length} className="p-8 text-center text-slate-500">
                Geen medewerkers gevonden voor dit rooster
              </td>
            </tr>
          ) : (
            employees.map((employee) => (
              <tr key={employee.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                <td className="sticky left-0 bg-white z-10 p-3 border-r border-slate-200">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-medium">
                        {getInitials(employee.first_name, employee.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {employee.contract_hours ? `${employee.contract_hours}u/week` : 'Flex'}
                      </p>
                    </div>
                  </div>
                </td>
                {weekDays.map((day) => (
                  sortedDayparts.map((daypart, dpIndex) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const cellShifts = getShiftsForCell(employee.id, dateStr, daypart.id);
                    
                    return (
                      <td 
                        key={`${day.toISOString()}_${daypart.id}_${employee.id}`}
                        className={`p-1 align-top min-h-16 cursor-pointer hover:bg-blue-50/50 transition-colors ${
                          dpIndex < sortedDayparts.length - 1 ? 'border-r border-slate-100' : 'border-r border-slate-200'
                        }`}
                        style={{ backgroundColor: `${daypart.color}30` || 'transparent' }}
                        onClick={() => onCellClick?.(employee.id, dateStr, daypart.id)}
                      >
                        <div className="space-y-1 min-h-12 p-1">
                          {cellShifts.map((shift) => (
                            <div
                              key={shift.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onShiftClick?.(shift);
                              }}
                              className="px-2 py-1 rounded text-xs cursor-pointer transition-all hover:scale-105 shadow-sm"
                              style={{ 
                                backgroundColor: `${getFunctionColor(shift.functionId)}15`,
                                borderLeft: `3px solid ${getFunctionColor(shift.functionId)}`
                              }}
                            >
                              <p className="font-medium" style={{ color: getFunctionColor(shift.functionId) }}>
                                {shift.start_time}-{shift.end_time}
                              </p>
                            </div>
                          ))}
                          {cellShifts.length === 0 && (
                            <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <Plus className="w-3 h-3 text-slate-300" />
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}