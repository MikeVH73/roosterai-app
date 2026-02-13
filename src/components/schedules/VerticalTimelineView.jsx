import React, { useState, useRef, useMemo } from 'react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Clock, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (mins) => {
  const hours = Math.floor(mins / 60) % 24;
  const minutes = mins % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const getShiftDuration = (start, end, breakDuration = 0) => {
  const startMins = timeToMinutes(start);
  let endMins = timeToMinutes(end);
  if (endMins <= startMins) endMins += 24 * 60;
  return ((endMins - startMins - breakDuration) / 60).toFixed(1);
};

export default function VerticalTimelineView({ 
  schedule, 
  shifts, 
  locations, 
  employees, 
  functions: allFunctions,
  dayparts = [],
  onShiftClick,
  onCellClick,
  onShiftUpdate,
  currentWeekStart,
  selectedDayparts = []
}) {
  const queryClient = useQueryClient();
  const [resizingShift, setResizingShift] = useState(null);
  const resizeRef = useRef({});

  const HOUR_HEIGHT = 60; // 60px per uur
  const PIXELS_PER_MINUTE = HOUR_HEIGHT / 60;

  const weekStart = currentWeekStart || startOfWeek(new Date(), { weekStartsOn: 1 });

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const allDayparts = useMemo(() => {
    return [...dayparts].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [dayparts]);

  const visibleDayparts = useMemo(() => {
    return allDayparts.filter(dp => selectedDayparts.includes(dp.id));
  }, [allDayparts, selectedDayparts]);

  const getShiftsForDay = (locationId, date) => {
    return shifts.filter(shift => 
      shift.locationId === locationId && isSameDay(parseISO(shift.date), date)
    );
  };

  const getEmployee = (employeeId) => employees.find(e => e.id === employeeId);
  const getFunction = (functionId) => allFunctions.find(f => f.id === functionId);

  const handleShiftDragStart = (e, shift) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('shiftId', shift.id);
  };

  const handleDayDrop = async (e, locationId, date) => {
    e.preventDefault();
    e.stopPropagation();
    
    const shiftId = e.dataTransfer.getData('shiftId');
    if (!shiftId) return;

    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;

    const oldData = { ...shift };

    try {
      await base44.entities.Shift.update(shift.id, {
        locationId,
        date: format(date, 'yyyy-MM-dd')
      });
      onShiftUpdate?.(shift, oldData);
      queryClient.invalidateQueries(['shifts']);
    } catch (error) {
      console.error('Failed to move shift:', error);
    }
  };

  const handleResizeStart = (e, shift, edge) => {
    e.stopPropagation();
    e.preventDefault();
    
    setResizingShift(shift.id);
    
    resizeRef.current = {
      initialY: e.clientY,
      initialStart: shift.start_time,
      initialEnd: shift.end_time,
      edge,
      shift
    };

    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
    };

    const handleMouseUp = async (upEvent) => {
      upEvent.preventDefault();
      
      const deltaY = upEvent.clientY - resizeRef.current.initialY;
      const deltaMinutes = Math.round((deltaY / PIXELS_PER_MINUTE) / 15) * 15;

      if (Math.abs(deltaMinutes) < 15) {
        setResizingShift(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        return;
      }

      let currentStartMins = timeToMinutes(resizeRef.current.initialStart);
      let currentEndMins = timeToMinutes(resizeRef.current.initialEnd);
      if (currentEndMins <= currentStartMins) currentEndMins += 24 * 60;

      let newStart = resizeRef.current.initialStart;
      let newEnd = resizeRef.current.initialEnd;

      if (resizeRef.current.edge === 'top') {
        const newStartMins = Math.max(0, Math.min(currentStartMins + deltaMinutes, currentEndMins - 15));
        newStart = minutesToTime(newStartMins);
      } else {
        const newEndMins = Math.max(currentStartMins + 15, currentEndMins + deltaMinutes);
        newEnd = minutesToTime(newEndMins);
      }

      const oldData = { ...resizeRef.current.shift };

      try {
        await base44.entities.Shift.update(resizeRef.current.shift.id, {
          start_time: newStart,
          end_time: newEnd
        });
        onShiftUpdate?.(resizeRef.current.shift, oldData);
        queryClient.invalidateQueries(['shifts']);
      } catch (error) {
        console.error('Failed to resize shift:', error);
      }

      setResizingShift(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!schedule || !locations || locations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Geen locaties beschikbaar
      </div>
    );
  }

  if (!allDayparts.length) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Geen dagdelen beschikbaar
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto bg-white rounded-lg border border-slate-200">
      <div className="flex min-h-screen">
        {/* Time axis */}
        <div className="w-16 flex-shrink-0 border-r border-slate-300 bg-slate-50 sticky left-0 z-10">
          <div className="h-12 border-b border-slate-300" /> {/* Header spacer */}
          {[...Array(24)].map((_, hour) => (
            <div 
              key={hour} 
              className="border-b border-slate-200 text-xs text-slate-600 text-center py-1"
              style={{ height: `${HOUR_HEIGHT}px` }}
            >
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Days columns */}
        {weekDays.map((day, dayIdx) => {
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          
          return (
            <div key={dayIdx} className="flex-1 min-w-[200px] max-w-[300px] border-r border-slate-300 last:border-r-0">
              {/* Day header */}
              <div className="h-12 border-b border-slate-300 bg-slate-50 p-2 sticky top-0 z-10">
                <div className="font-semibold text-slate-800 text-sm">
                  {format(day, 'EEE', { locale: nl })}
                </div>
                <div className="text-xs text-slate-600">
                  {format(day, 'd MMM', { locale: nl })}
                </div>
              </div>

              {/* Time slots */}
              <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
                {/* Background grid */}
                {[...Array(24)].map((_, hour) => (
                  <div 
                    key={hour}
                    className={`absolute w-full border-b ${
                      hour % 2 === 0 ? 'border-slate-200' : 'border-slate-100'
                    } ${isWeekend ? 'bg-slate-50/50' : 'bg-white'}`}
                    style={{ 
                      top: `${hour * HOUR_HEIGHT}px`,
                      height: `${HOUR_HEIGHT}px`
                    }}
                  />
                ))}

                {/* Daypart backgrounds */}
                {visibleDayparts.map(daypart => {
                  const startMins = timeToMinutes(daypart.startTime);
                  let endMins = timeToMinutes(daypart.endTime);
                  if (endMins <= startMins) endMins += 24 * 60;
                  
                  const topPx = startMins * PIXELS_PER_MINUTE;
                  const heightPx = (endMins - startMins) * PIXELS_PER_MINUTE;

                  return (
                    <div 
                      key={daypart.id}
                      className="absolute w-full opacity-5 pointer-events-none"
                      style={{ 
                        top: `${topPx}px`, 
                        height: `${heightPx}px`,
                        backgroundColor: daypart.color || '#3b82f6'
                      }}
                    />
                  );
                })}

                {/* Shifts for all locations on this day */}
                <div 
                  className="absolute inset-0 cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const offsetY = e.clientY - rect.top;
                    const clickedMinutes = Math.round((offsetY / PIXELS_PER_MINUTE) / 15) * 15;
                    
                    let clickedDaypartId = null;
                    for (const dp of allDayparts) {
                      const startMins = timeToMinutes(dp.startTime);
                      let endMins = timeToMinutes(dp.endTime);
                      if (endMins <= startMins) endMins += 24 * 60;
                      if (clickedMinutes >= startMins && clickedMinutes < endMins) {
                        clickedDaypartId = dp.id;
                        break;
                      }
                    }

                    if (e.target === e.currentTarget) {
                      onCellClick?.(locations[0]?.id, day, clickedDaypartId);
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDayDrop(e, locations[0]?.id, day)}
                >
                  {locations.map((location, locIdx) => {
                    const dayShifts = getShiftsForDay(location.id, day);
                    
                    return dayShifts.map((shift) => {
                      const employee = getEmployee(shift.employeeId);
                      const func = getFunction(shift.functionId);
                      
                      const startMins = timeToMinutes(shift.start_time);
                      let endMins = timeToMinutes(shift.end_time);
                      if (endMins <= startMins) endMins += 24 * 60;
                      
                      const topPx = startMins * PIXELS_PER_MINUTE;
                      const heightPx = (endMins - startMins) * PIXELS_PER_MINUTE;
                      const duration = getShiftDuration(shift.start_time, shift.end_time, shift.break_duration);

                      // Calculate horizontal position (stacked if multiple locations)
                      const totalLocations = locations.length;
                      const widthPercent = 100 / totalLocations;
                      const leftPercent = (locIdx / totalLocations) * 100;

                      return (
                        <div
                          key={shift.id}
                          className="absolute rounded shadow-sm border-2 border-white hover:shadow-lg transition-all group cursor-pointer overflow-hidden"
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            backgroundColor: func?.color || '#94a3b8',
                            minHeight: '30px'
                          }}
                          draggable
                          onDragStart={(e) => handleShiftDragStart(e, shift)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onShiftClick?.(shift);
                          }}
                        >
                          {/* Resize handles */}
                          <div
                            className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleResizeStart(e, shift, 'top');
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div
                            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleResizeStart(e, shift, 'bottom');
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />

                          {/* Shift content */}
                          <div className="px-2 py-1 text-white h-full flex flex-col justify-between">
                            <div>
                              <div className="font-semibold text-xs truncate flex items-center gap-1">
                                <User className="w-3 h-3 flex-shrink-0" />
                                {employee ? `${employee.first_name} ${employee.last_name}` : 'Onbekend'}
                              </div>
                              {totalLocations > 1 && location.name && (
                                <div className="text-[10px] text-white/80 truncate">
                                  {location.name}
                                </div>
                              )}
                            </div>
                            <div className="text-[10px] text-white/90 space-y-0.5">
                              <div className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {shift.start_time} - {shift.end_time}
                              </div>
                              <div className="font-medium">
                                {duration}u {shift.break_duration > 0 && `(pauze: ${shift.break_duration}m)`}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}