import React, { useState, useRef, useMemo } from 'react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Clock, User, MapPin } from 'lucide-react';
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

// Smart collision detection - places overlapping shifts side by side
// BUT keeps consecutive shifts from same employee in same lane
const calculatePositionedShifts = (dayShifts) => {
  const positionedShifts = [];
  const sortedShifts = [...dayShifts].sort((a, b) => 
    timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );

  sortedShifts.forEach(shift => {
    const startMins = timeToMinutes(shift.start_time);
    let endMins = timeToMinutes(shift.end_time);
    if (endMins <= startMins) endMins += 24 * 60;

    let lane = 0;
    let placed = false;

    // Find the first available lane without conflicts
    while (!placed && lane < 10) {
      const hasConflict = positionedShifts.some(ps => {
        if (ps.lane !== lane) return false;
        
        // Same employee - check if consecutive (no overlap)
        if (ps.shift.employeeId === shift.employeeId) {
          const psStart = timeToMinutes(ps.shift.start_time);
          let psEnd = timeToMinutes(ps.shift.end_time);
          if (psEnd <= psStart) psEnd += 24 * 60;
          
          // No overlap means consecutive - allow same lane
          const hasOverlap = startMins < psEnd && endMins > psStart;
          return hasOverlap;
        }
        
        // Different employee - check normal overlap
        const psStart = timeToMinutes(ps.shift.start_time);
        let psEnd = timeToMinutes(ps.shift.end_time);
        if (psEnd <= psStart) psEnd += 24 * 60;
        return startMins < psEnd && endMins > psStart;
      });

      if (!hasConflict) {
        positionedShifts.push({ shift, lane });
        placed = true;
      } else {
        lane++;
      }
    }

    if (!placed) {
      positionedShifts.push({ shift, lane: 0 });
    }
  });

  return positionedShifts;
};

export default function VerticalTimelineView({ 
  schedule, 
  shifts, 
  locations, 
  employees, 
  functions: allFunctions,
  departments,
  onShiftClick,
  onCellClick,
  onShiftUpdate,
  currentWeekStart,
  selectedDayparts = []
}) {
  const queryClient = useQueryClient();
  const [resizingShift, setResizingShift] = useState(null);
  const [compactMode, setCompactMode] = useState(false);
  const resizeRef = useRef({});

  const HOUR_HEIGHT = 40; // 40px per uur voor compactere weergave
  const PIXELS_PER_MINUTE = HOUR_HEIGHT / 60;

  const weekStart = currentWeekStart || startOfWeek(new Date(), { weekStartsOn: 1 });

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const getEmployee = (employeeId) => employees.find(e => e.id === employeeId);
  const getFunction = (functionId) => allFunctions.find(f => f.id === functionId);
  const getDepartment = (deptId) => departments?.find(d => d.id === deptId);
  const getLocation = (locId) => locations?.find(l => l.id === locId);

  // Group departments and their locations
  const relevantDepartments = useMemo(() => {
    if (!schedule?.departmentIds?.length) return departments || [];
    return (departments || []).filter(d => schedule.departmentIds.includes(d.id));
  }, [departments, schedule]);

  const departmentLocations = useMemo(() => {
    const result = {};
    relevantDepartments.forEach(dept => {
      const locs = locations.filter(loc => dept.locationIds?.includes(loc.id));
      if (locs.length > 0) {
        result[dept.id] = locs;
      }
    });
    return result;
  }, [relevantDepartments, locations]);

  const handleShiftDragStart = (e, shift) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('shiftId', shift.id);
  };

  const handleDayDrop = async (e, locationId, departmentId, date) => {
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
        departmentId,
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

  if (!schedule) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Geen rooster beschikbaar
      </div>
    );
  }

  if (!relevantDepartments.length || Object.keys(departmentLocations).length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Geen afdelingen of locaties beschikbaar voor dit rooster
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg border border-slate-200">
      {/* Compact mode toggle */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <span className="text-sm text-slate-600">Verticale Tijdlijn</span>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={compactMode}
            onChange={(e) => setCompactMode(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Compacte weergave</span>
        </label>
      </div>

      <div className="overflow-auto">
        <div className="flex min-w-max">
          {/* Time axis - left column */}
          <div className="w-20 flex-shrink-0 border-r border-slate-300 bg-slate-50 sticky left-0 z-20">
            {/* Header spacer - sticky */}
            <div className="h-16 border-b border-slate-300 flex items-center justify-center sticky top-0 z-30 bg-slate-50">
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            {/* Time labels */}
            {[...Array(24)].map((_, hour) => (
              <div 
                key={hour} 
                className="border-b border-slate-200 text-[10px] font-medium text-slate-600 px-1 flex items-start pt-0.5"
                style={{ height: `${HOUR_HEIGHT}px` }}
              >
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Department/Location columns - left side */}
          <div className="w-64 flex-shrink-0 border-r border-slate-300 bg-white sticky left-20 z-20 shadow-lg">
            {/* Header */}
            <div className="h-16 border-b border-slate-300 bg-slate-50 p-2 flex items-center sticky top-0 z-30">
              <span className="font-semibold text-slate-700 text-sm">Afdeling / Locatie</span>
            </div>
            {/* Department & Location rows */}
            <div className="overflow-y-auto" style={{ maxHeight: `${24 * HOUR_HEIGHT}px` }}>
              {relevantDepartments.map(dept => {
                const locs = departmentLocations[dept.id] || [];
                if (!locs.length) return null;

                return (
                  <div key={dept.id}>
                    {locs.map(loc => (
                      <div 
                        key={loc.id}
                        className="border-b border-slate-200 p-2 flex flex-col justify-center bg-white hover:bg-slate-50"
                        style={{ minHeight: '80px' }}
                      >
                        <div className="font-semibold text-slate-900 text-sm mb-1">{dept.name}</div>
                        <div className="text-slate-600 text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {loc.name}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Days columns with shifts */}
          {weekDays.map((day, dayIdx) => {
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            
            return (
              <div key={dayIdx} className="flex-1 min-w-[280px] border-r border-slate-300 last:border-r-0">
                {/* Day header - sticky */}
                <div className="h-16 border-b border-slate-300 bg-slate-50 p-2 sticky top-0 z-30 shadow-sm">
                  <div className="font-semibold text-slate-800 text-sm">
                    {format(day, 'EEEE', { locale: nl })}
                  </div>
                  <div className="text-xs text-slate-600">
                    {format(day, 'd MMMM yyyy', { locale: nl })}
                  </div>
                </div>

                {/* Department/Location rows */}
                {relevantDepartments.map(dept => {
                  const locs = departmentLocations[dept.id] || [];
                  if (!locs.length) return null;

                  return (
                    <div key={dept.id}>
                      {locs.map(loc => {
                        const dayShifts = shifts.filter(
                          s => s.locationId === loc.id && 
                               s.departmentId === dept.id && 
                               isSameDay(parseISO(s.date), day)
                        );

                        const positionedShifts = calculatePositionedShifts(dayShifts);
                        const maxLanes = Math.max(1, ...positionedShifts.map(ps => ps.lane + 1));

                        return (
                          <div 
                            key={loc.id}
                            className={`relative border-b border-slate-200 ${isWeekend ? 'bg-slate-50/30' : 'bg-white'} cursor-pointer`}
                            style={{ minHeight: '80px' }}
                            onClick={(e) => {
                              // Only trigger on direct clicks on empty space
                              if (e.target.classList.contains('timeline-cell')) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const offsetY = e.clientY - rect.top;
                                const clickedMinutes = Math.round((offsetY / PIXELS_PER_MINUTE) / 15) * 15;
                                const clickedTime = minutesToTime(clickedMinutes);
                                onCellClick?.(loc.id, day, null, dept.id, clickedTime);
                              }
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDayDrop(e, loc.id, dept.id, day)}
                          >
                            {/* Clickable overlay for empty space */}
                            <div className="timeline-cell absolute inset-0" style={{ height: `${24 * HOUR_HEIGHT}px` }} />
                            {/* Hour grid lines */}
                            {[...Array(24)].map((_, hour) => (
                              <div 
                                key={hour}
                                className="absolute w-full border-b border-slate-100 pointer-events-none"
                                style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                              />
                            ))}

                            {/* Shifts */}
                            {positionedShifts.map(({ shift, lane }) => {
                              const employee = getEmployee(shift.employeeId);
                              const func = getFunction(shift.functionId);
                              
                              const startMins = timeToMinutes(shift.start_time);
                              let endMins = timeToMinutes(shift.end_time);
                              if (endMins <= startMins) endMins += 24 * 60;
                              
                              const topPx = startMins * PIXELS_PER_MINUTE;
                              const heightPx = (endMins - startMins) * PIXELS_PER_MINUTE;
                              const duration = getShiftDuration(shift.start_time, shift.end_time, shift.break_duration);

                              const laneWidth = 100 / maxLanes;
                              const leftPosition = lane * laneWidth;

                              return (
                                <div
                                  key={shift.id}
                                  className="absolute rounded-lg shadow-md border-2 border-white hover:shadow-xl hover:z-30 transition-all group cursor-pointer overflow-hidden"
                                  style={{
                                    top: `${topPx}px`,
                                    height: `${heightPx}px`,
                                    left: `${leftPosition}%`,
                                    width: `${laneWidth - 1}%`,
                                    backgroundColor: func?.color || '#64748b',
                                    minHeight: '24px'
                                  }}
                                  draggable
                                  onDragStart={(e) => handleShiftDragStart(e, shift)}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    onShiftClick?.(shift);
                                  }}
                                >
                                  {/* Resize handles - block all clicks */}
                                  <div
                                    className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-30"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleResizeStart(e, shift, 'top');
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                    }}
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                    }}
                                  />
                                  <div
                                    className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-30"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleResizeStart(e, shift, 'bottom');
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                    }}
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                    }}
                                  />

                                  {/* Shift content - prevent click bubbling */}
                                  <div onClick={(e) => e.stopPropagation()} className="h-full">
                                    {compactMode ? (
                                      // Compact mode - vertical text
                                      <div className="h-full flex items-center justify-center p-1">
                                        <div className="transform -rotate-90 origin-center whitespace-nowrap text-white font-semibold text-[10px]">
                                          {employee ? `${employee.first_name} ${employee.last_name.charAt(0)}.` : '?'} • {shift.start_time}-{shift.end_time}
                                        </div>
                                      </div>
                                    ) : (
                                      // Normal mode - horizontal text
                                      <div className="px-2 py-1.5 text-white h-full flex flex-col justify-between">
                                        <div>
                                          <div className="font-semibold text-xs flex items-center gap-1 mb-0.5">
                                            <User className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">
                                              {employee ? `${employee.first_name} ${employee.last_name}` : 'Onbekend'}
                                            </span>
                                          </div>
                                          {func && (
                                            <div className="text-[10px] text-white/80 truncate">
                                              {func.name}
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-white/95 space-y-0.5">
                                          <div className="flex items-center gap-1 font-medium">
                                            <Clock className="w-2.5 h-2.5" />
                                            {shift.start_time} - {shift.end_time}
                                          </div>
                                          <div className="font-semibold">
                                            {duration}u {shift.break_duration > 0 && `(${shift.break_duration}m)`}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}