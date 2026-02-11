import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";

function calculateNetHours(shift) {
  const [startH, startM] = shift.start_time.split(':').map(Number);
  const [endH, endM] = shift.end_time.split(':').map(Number);
  let hours = (endH * 60 + endM - startH * 60 - startM) / 60;
  if (hours < 0) hours += 24;
  const breakHours = (shift.break_duration || 0) / 60;
  return Math.max(0, hours - breakHours);
}

export default function MonthCalendarGrid({ 
  currentDate, 
  shifts, 
  dayparts,
  staffingRequirements,
  onDayClick 
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Week starts on Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const sortedDayparts = useMemo(() => {
    return [...dayparts].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [dayparts]);

  const calendarWeeks = useMemo(() => {
    const weeks = [];
    let currentWeekStart = calendarStart;
    
    while (currentWeekStart <= calendarEnd) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const day = addDays(currentWeekStart, i);
        week.push(day);
      }
      weeks.push(week);
      currentWeekStart = addDays(currentWeekStart, 7);
    }
    
    return weeks;
  }, [calendarStart, calendarEnd]);

  // Calculate hours per daypart per day
  const getHoursForDay = (date, daypartId) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayShifts = shifts.filter(s => s.date === dateStr && s.daypartId === daypartId);
    return dayShifts.reduce((sum, shift) => sum + calculateNetHours(shift), 0);
  };

  const getTargetHours = (date, daypartId) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    const req = staffingRequirements.find(r => 
      r.daypartId === daypartId && 
      (r.specific_date === dateStr || r.day_of_week === dayOfWeek)
    );
    return req?.targetHours || 0;
  };

  const weekDays = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Week Headers */}
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
        {weekDays.map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-slate-600 border-r border-slate-100 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarWeeks.map((week, weekIdx) => (
          <React.Fragment key={weekIdx}>
            {week.map((day, dayIdx) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayShifts = shifts.filter(s => s.date === dateStr);
              
              return (
                <div
                  key={dayIdx}
                  onClick={() => onDayClick?.(day)}
                  className={`
                    min-h-24 p-2 border-r border-b border-slate-100 cursor-pointer transition-colors
                    ${!isCurrentMonth ? 'bg-slate-50/50' : 'bg-white hover:bg-blue-50/30'}
                    ${dayIdx === 6 ? 'border-r-0' : ''}
                  `}
                >
                  <div className={`text-sm font-medium mb-1 ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-900'}`}>
                    {format(day, 'd')}
                  </div>
                  
                  {isCurrentMonth && sortedDayparts.length > 0 && (
                    <div className="space-y-0.5">
                      {sortedDayparts.map((daypart) => {
                        const hours = getHoursForDay(day, daypart.id);
                        const targetHours = getTargetHours(day, daypart.id);
                        
                        if (hours === 0 && targetHours === 0) return null;
                        
                        let statusColor = 'bg-slate-100 text-slate-700';
                        if (targetHours > 0) {
                          const percentage = (hours / targetHours) * 100;
                          if (percentage >= 95 && percentage <= 105) {
                            statusColor = 'bg-green-100 text-green-700';
                          } else if (percentage >= 80 && percentage < 95 || percentage > 105 && percentage <= 120) {
                            statusColor = 'bg-amber-100 text-amber-700';
                          } else if (percentage < 80 || percentage > 120) {
                            statusColor = 'bg-red-100 text-red-700';
                          }
                        }
                        
                        return (
                          <div
                            key={daypart.id}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${statusColor} flex items-center justify-between`}
                          >
                            <span className="truncate">{daypart.name}</span>
                            <span className="font-medium ml-1">{hours.toFixed(1)}u</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {dayShifts.length > 0 && (
                    <div className="mt-1 text-[10px] text-slate-400">
                      {dayShifts.length} dienst{dayShifts.length > 1 ? 'en' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}