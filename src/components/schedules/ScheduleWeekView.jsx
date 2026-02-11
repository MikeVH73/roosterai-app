import React from 'react';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";

function calculateNetHours(shift) {
  const [startH, startM] = shift.start_time.split(':').map(Number);
  const [endH, endM] = shift.end_time.split(':').map(Number);
  let hours = (endH * 60 + endM - startH * 60 - startM) / 60;
  if (hours < 0) hours += 24;
  // Pauze komt BOVENOP de dienst, dus we trekken het NIET af
  return hours;
}

export default function ScheduleWeekView({ schedule, shifts, employees, functions: allFunctions, dayparts }) {
  const startDate = parseISO(schedule.start_date);
  const endDate = parseISO(schedule.end_date);
  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
  
  // Generate days for the week
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    if (day >= startDate && day <= endDate) {
      days.push(day);
    }
  }

  // Group shifts by date and employee
  const shiftsByDateAndEmployee = {};
  shifts.forEach(shift => {
    if (!shiftsByDateAndEmployee[shift.date]) {
      shiftsByDateAndEmployee[shift.date] = {};
    }
    if (!shiftsByDateAndEmployee[shift.date][shift.employeeId]) {
      shiftsByDateAndEmployee[shift.date][shift.employeeId] = [];
    }
    shiftsByDateAndEmployee[shift.date][shift.employeeId].push(shift);
  });

  // Get unique employees with shifts
  const employeeIds = [...new Set(shifts.map(s => s.employeeId))];
  const employeesWithShifts = employees.filter(e => employeeIds.includes(e.id));

  const getFunctionColor = (functionId) => {
    const func = allFunctions.find(f => f.id === functionId);
    return func?.color || '#6366f1';
  };

  if (days.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        Geen dagen in deze week
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="p-3 text-left font-medium text-slate-700 border-b-2 border-slate-200 sticky left-0 bg-slate-50 z-10 min-w-[200px]">
              Medewerker
            </th>
            {days.map(day => (
              <th key={day.toISOString()} className="p-3 text-center font-medium text-slate-700 border-b-2 border-slate-200 min-w-[140px]">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500">{format(day, 'EEE', { locale: nl })}</span>
                  <span>{format(day, 'd MMM', { locale: nl })}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employeesWithShifts.length === 0 ? (
            <tr>
              <td colSpan={days.length + 1} className="p-8 text-center text-slate-500">
                Nog geen diensten ingepland
              </td>
            </tr>
          ) : (
            employeesWithShifts.map(employee => (
              <tr key={employee.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-3 sticky left-0 bg-white font-medium text-slate-900 border-r border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                      {employee.first_name[0]}{employee.last_name[0]}
                    </div>
                    <span>{employee.first_name} {employee.last_name}</span>
                  </div>
                </td>
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayShifts = shiftsByDateAndEmployee[dateStr]?.[employee.id] || [];
                  
                  return (
                    <td key={day.toISOString()} className="p-2 align-top">
                      {dayShifts.length === 0 ? (
                        <div className="text-center text-slate-300 text-sm">-</div>
                      ) : (
                        <div className="space-y-1">
                          {dayShifts.map(shift => {
                            const daypart = dayparts.find(d => d.id === shift.daypartId);
                            const netHours = calculateNetHours(shift);
                            
                            return (
                              <div
                                key={shift.id}
                                className="p-2 rounded-lg border text-xs"
                                style={{
                                  backgroundColor: `${getFunctionColor(shift.functionId)}15`,
                                  borderColor: `${getFunctionColor(shift.functionId)}40`
                                }}
                              >
                                <div className="font-medium text-slate-900 mb-1">
                                  {shift.start_time} - {shift.end_time}
                                </div>
                                {daypart && (
                                  <Badge 
                                    className="text-[10px] px-1 py-0 mb-1"
                                    style={{
                                      backgroundColor: daypart.color || '#64748b',
                                      color: 'white'
                                    }}
                                  >
                                    {daypart.name}
                                  </Badge>
                                )}
                                <div className="text-slate-600">
                                  {netHours.toFixed(1)}u
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}