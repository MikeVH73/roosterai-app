import React, { useState, useRef, useMemo } from 'react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { GripVertical, Clock, ChevronRight } from 'lucide-react';
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

export default function TimelineView({ 
  schedule, 
  shifts, 
  locations, 
  departments = [],
  employees, 
  functions: allFunctions,
  dayparts = [],
  onShiftClick,
  onCellClick,
  onShiftUpdate,
  currentWeekStart,
  selectedDayparts = [],
  activeDays = [0, 1, 2, 3, 4, 5, 6]
}) {
  const queryClient = useQueryClient();
  const [draggedLocation, setDraggedLocation] = useState(null);
  const [dragOverLocation, setDragOverLocation] = useState(null);
  const [locationOrder, setLocationOrder] = useState(
    schedule?.location_order || locations.map(l => l.id)
  );
  const [resizingShift, setResizingShift] = useState(null);
  const [resizeTooltip, setResizeTooltip] = useState(null);
  const resizeRef = useRef({});
  const isDraggingOrResizing = useRef(false);

  const weekStart = currentWeekStart || startOfWeek(new Date(), { weekStartsOn: 1 });

  const [timelineWidth, setTimelineWidth] = React.useState(0);
  const timelineRef = React.useRef(null);

  React.useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const weekDays = useMemo(() => {
    const allDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return allDays.filter(day => activeDays.includes(day.getDay()));
  }, [weekStart, activeDays]);

  const startTimeStr = schedule?.timeline_start_time || '06:00';
  const endTimeStr = schedule?.timeline_end_time || '06:00';
  const startTimeOffset = timeToMinutes(startTimeStr);
  const endTimeOffset = timeToMinutes(endTimeStr);
  
  // Calculate total hours between start and end (handling wrap-around midnight)
  let totalMinutes = endTimeOffset - startTimeOffset;
  if (totalMinutes <= 0) totalMinutes += 24 * 60;
  const totalHours = totalMinutes / 60;
  
  // Calculate day width dynamically - fill entire available width
  const numActiveDays = weekDays.length;
  const LOCATION_COL_WIDTH = 192; // w-48 = 192px
  const availableWidth = timelineWidth - LOCATION_COL_WIDTH;
  const DAY_WIDTH = numActiveDays > 0 && availableWidth > 0 
    ? availableWidth / numActiveDays 
    : 800;
  
  const PIXELS_PER_MINUTE = DAY_WIDTH / totalMinutes;
  
  // Calculate responsive font size based on day width
  const getFontSize = () => {
    if (DAY_WIDTH < 120) return 'text-[9px]';
    if (DAY_WIDTH < 150) return 'text-[10px]';
    return 'text-[11px]';
  };
  
  const fontSizeClass = getFontSize();



  const sortedLocations = useMemo(() => {
    const filteredLocations = schedule?.locationIds?.length > 0
      ? locations.filter(loc => schedule.locationIds.includes(loc.id))
      : locations;
    
    const orderMap = new Map(locationOrder.map((id, idx) => [id, idx]));
    return [...filteredLocations].sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? 999;
      const orderB = orderMap.get(b.id) ?? 999;
      return orderA - orderB;
    });
  }, [locations, locationOrder, schedule?.locationIds]);

  const displayRows = useMemo(() => {
    const rows = [];
    const scheduleDepartmentIds = schedule?.departmentIds || [];
    const departmentsInSchedule = departments.filter(dept => 
      scheduleDepartmentIds.length > 0 ? scheduleDepartmentIds.includes(dept.id) : true
    );

    sortedLocations.forEach(location => {
      rows.push({ type: 'location_header', id: location.id, data: location });

      const departmentsForLocation = departmentsInSchedule.filter(dept =>
        dept.locationIds?.includes(location.id)
      ).sort((a, b) => a.name.localeCompare(b.name));

      departmentsForLocation.forEach(department => {
        rows.push({ 
          type: 'department_row', 
          id: `${location.id}-${department.id}`, 
          data: department, 
          parentLocationId: location.id 
        });
      });
    });
    return rows;
  }, [sortedLocations, departments, schedule?.departmentIds]);

  const getShiftsForDay = (locationId, date) => {
    return shifts.filter(shift => 
      shift.locationId === locationId && isSameDay(parseISO(shift.date), date)
    );
  };

  // Generate hour markers for the timeline (every 2 hours for cleaner look)
  const hourMarkers = useMemo(() => {
    const markers = [];
    const numHours = Math.ceil(totalHours);
    const interval = totalHours <= 12 ? 2 : 2; // Show every 2 hours
    
    for (let i = 0; i <= numHours; i += interval) {
      if (i * 60 <= totalMinutes) {
        const hourMins = (startTimeOffset + i * 60) % (24 * 60);
        const displayHour = Math.floor(hourMins / 60);
        markers.push({
          label: `${String(displayHour).padStart(2, '0')}:00`,
          position: i * 60 * PIXELS_PER_MINUTE
        });
      }
    }
    return markers;
  }, [startTimeOffset, totalMinutes, totalHours, PIXELS_PER_MINUTE]);

  const getEmployee = (employeeId) => employees.find(e => e.id === employeeId);
  const getFunction = (functionId) => allFunctions.find(f => f.id === functionId);

  const handleLocationDragStart = (e, locationId) => {
    setDraggedLocation(locationId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleLocationDragOver = (e, locationId) => {
    e.preventDefault();
    if (draggedLocation && draggedLocation !== locationId) {
      setDragOverLocation(locationId);
    }
  };

  const handleLocationDrop = async (e, targetLocationId) => {
    e.preventDefault();
    if (!draggedLocation || draggedLocation === targetLocationId) return;

    const newOrder = [...locationOrder];
    const draggedIdx = newOrder.indexOf(draggedLocation);
    const targetIdx = newOrder.indexOf(targetLocationId);

    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedLocation);

    setLocationOrder(newOrder);
    setDraggedLocation(null);
    setDragOverLocation(null);

    try {
      await base44.entities.Schedule.update(schedule.id, {
        location_order: newOrder
      });
      queryClient.invalidateQueries(['schedules']);
    } catch (error) {
      console.error('Failed to save location order:', error);
    }
  };

  const handleShiftDragStart = (e, shift) => {
    e.stopPropagation();
    if (!shift?.id) {
      console.error('Cannot drag shift without ID');
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', shift.id);
    isDraggingOrResizing.current = true;
  };

  const handleShiftDragEnd = () => {
    isDraggingOrResizing.current = false;
  };

  const handleDayDrop = async (e, locationId, dateToUse) => {
    e.preventDefault();
    e.stopPropagation();

    const shiftId = e.dataTransfer.getData('text/plain');
    if (!shiftId) {
      isDraggingOrResizing.current = false;
      return;
    }

    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) {
      console.error('Shift not found:', shiftId);
      isDraggingOrResizing.current = false;
      return;
    }

    const oldData = { ...shift };
    const targetDate = format(dateToUse, 'yyyy-MM-dd');

    try {
      await base44.entities.Shift.update(shift.id, {
        locationId,
        date: targetDate
      });
      onShiftUpdate?.(shift, oldData);
      queryClient.invalidateQueries(['shifts']);
    } catch (error) {
      console.error('Failed to move shift:', error);
    } finally {
      isDraggingOrResizing.current = false;
    }
  };

  const handleResizeStart = (e, shift, edge) => {
    e.stopPropagation();
    e.preventDefault();
    
    setResizingShift(shift.id);
    isDraggingOrResizing.current = true;
    
    resizeRef.current = {
      initialX: e.clientX,
      initialStart: shift.start_time,
      initialEnd: shift.end_time,
      edge,
      shift
    };

    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
      
      const deltaX = moveEvent.clientX - resizeRef.current.initialX;
      const deltaMinutes = Math.round((deltaX / PIXELS_PER_MINUTE) / 15) * 15;

      let currentStartMins = timeToMinutes(resizeRef.current.initialStart);
      let currentEndMins = timeToMinutes(resizeRef.current.initialEnd);
      if (currentEndMins <= currentStartMins) currentEndMins += 24 * 60;

      let newStart = resizeRef.current.initialStart;
      let newEnd = resizeRef.current.initialEnd;

      if (resizeRef.current.edge === 'left') {
        const newStartMins = Math.max(0, Math.min(currentStartMins + deltaMinutes, currentEndMins - 15));
        newStart = minutesToTime(newStartMins);
      } else {
        const newEndMins = Math.max(currentStartMins + 15, currentEndMins + deltaMinutes);
        newEnd = minutesToTime(newEndMins);
      }

      setResizeTooltip({
        x: moveEvent.clientX,
        y: moveEvent.clientY,
        time: resizeRef.current.edge === 'left' ? newStart : newEnd,
        edge: resizeRef.current.edge
      });
    };

    const handleMouseUp = async (upEvent) => {
      upEvent.preventDefault();
      
      const deltaX = upEvent.clientX - resizeRef.current.initialX;
      const deltaMinutes = Math.round((deltaX / PIXELS_PER_MINUTE) / 15) * 15;

      setResizeTooltip(null);
      
      if (Math.abs(deltaMinutes) < 15) {
        setResizingShift(null);
        isDraggingOrResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        return;
      }

      let currentStartMins = timeToMinutes(resizeRef.current.initialStart);
      let currentEndMins = timeToMinutes(resizeRef.current.initialEnd);
      if (currentEndMins <= currentStartMins) currentEndMins += 24 * 60;

      let newStart = resizeRef.current.initialStart;
      let newEnd = resizeRef.current.initialEnd;

      if (resizeRef.current.edge === 'left') {
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
      setResizeTooltip(null);
      isDraggingOrResizing.current = false;
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

  return (
    <div className="w-full bg-white rounded-lg border border-slate-200 flex flex-col relative h-full">
      {resizeTooltip && (
        <div 
          className="fixed z-50 bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-sm font-semibold pointer-events-none"
          style={{
            left: `${resizeTooltip.x + 15}px`,
            top: `${resizeTooltip.y - 40}px`,
          }}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{resizeTooltip.time}</span>
          </div>
        </div>
      )}
      <div ref={timelineRef} className="overflow-y-auto flex-1 w-full">
        <div className="w-full relative">
        <div className="sticky top-0 z-20 bg-white border-b border-slate-300">
          <div className="flex w-full">
            <div className="w-48 flex-shrink-0 border-r border-slate-300 bg-slate-50 p-3">
              <div className="font-semibold text-slate-700 text-sm">Locaties</div>
            </div>

            {weekDays.map((day, dayIdx) => (
              <div key={dayIdx} className="border-r border-slate-200 flex-1" style={{ minWidth: '100px' }}>
                <div className="text-center bg-white py-2.5">
                  <div className={`font-semibold text-slate-800 ${DAY_WIDTH < 120 ? 'text-xs' : 'text-sm'} truncate px-2`}>
                    {format(day, 'EEEE', { locale: nl })}
                  </div>
                  <div className={`text-slate-600 ${DAY_WIDTH < 120 ? 'text-[10px]' : 'text-xs'}`}>
                    {format(day, 'd MMM', { locale: nl })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline with hours spanning all days */}
          <div className="flex border-t border-slate-200 w-full">
            <div className="w-48 flex-shrink-0 border-r border-slate-300 bg-slate-50" />

            {weekDays.map((day, dayIdx) => (
              <div key={dayIdx} className="relative border-r border-slate-200 bg-slate-50 flex-1" style={{ minWidth: '100px', height: '32px' }}>
                {hourMarkers.map((marker, idx) => (
                  <div 
                    key={idx} 
                    className="absolute inset-y-0 border-l border-slate-300"
                    style={{ left: `${marker.position}px` }}
                  >
                    <span className={`absolute top-1 left-0.5 text-slate-600 font-medium ${DAY_WIDTH < 120 ? 'text-[9px]' : 'text-[11px]'}`}>
                      {marker.label.replace(':00', '')}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          </div>

        {displayRows.map((row) => {
          const isLocationHeader = row.type === 'location_header';
          const isDepartmentRow = row.type === 'department_row';
          const location = isLocationHeader ? row.data : sortedLocations.find(l => l.id === row.parentLocationId);

          return (
            <div
              key={row.id}
              className={`flex w-full border-b border-slate-200 hover:bg-slate-50/50 transition-colors ${
                isLocationHeader && dragOverLocation === location.id ? 'bg-blue-50' : ''
              }`}
              draggable={isLocationHeader}
              onDragStart={isLocationHeader ? (e) => handleLocationDragStart(e, location.id) : undefined}
              onDragOver={isLocationHeader ? (e) => handleLocationDragOver(e, location.id) : undefined}
              onDrop={isLocationHeader ? (e) => handleLocationDrop(e, location.id) : undefined}
              onDragEnd={isLocationHeader ? () => {
                setDraggedLocation(null);
                setDragOverLocation(null);
              } : undefined}
            >
              <div className={`w-48 flex-shrink-0 border-r border-slate-300 bg-white p-3 flex items-center gap-2 ${
                isLocationHeader ? 'cursor-move hover:bg-slate-50' : 'pl-8'
              } transition-colors`}>
                {isLocationHeader ? (
                  <>
                    <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-sm break-words leading-tight">{row.data.name}</div>
                      {row.data.code && (
                        <div className="text-xs text-slate-500">{row.data.code}</div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-700 text-sm break-words leading-tight">{row.data.name}</div>
                      {row.data.code && (
                        <div className="text-xs text-slate-500">{row.data.code}</div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {weekDays.map((day, dayIdx) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                let dayShifts = [];
                let cellLocationId = location.id;
                let cellDepartmentId = null;

                if (isLocationHeader) {
                  dayShifts = shifts.filter(s => 
                    s.locationId === location.id && 
                    s.date === dateStr && 
                    !s.departmentId
                  );
                } else {
                  cellDepartmentId = row.data.id;
                  dayShifts = shifts.filter(s => 
                    s.locationId === row.parentLocationId && 
                    s.departmentId === row.data.id && 
                    s.date === dateStr
                  );
                }

                const cellHeight = Math.max(isDepartmentRow ? 60 : 80, dayShifts.length * 38 + 20);

                return (
                  <div 
                    key={dayIdx} 
                    className="border-r border-slate-200 relative bg-white hover:bg-slate-50/50 transition-colors flex-1" 
                    style={{ minWidth: '100px', minHeight: `${cellHeight}px` }}
                    data-day-container
                    data-date={dateStr}
                    onClick={(e) => {
                      if (isDraggingOrResizing.current) {
                        isDraggingOrResizing.current = false;
                        return;
                      }
                      if (e.target === e.currentTarget || e.target.closest('[data-empty-area]')) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const offsetX = e.clientX - rect.left;
                        const clickedMinutes = Math.round((offsetX / PIXELS_PER_MINUTE) / 15) * 15;
                        const clickedTime = minutesToTime(startTimeOffset + clickedMinutes);

                        onCellClick?.(cellLocationId, day, cellDepartmentId, clickedTime);
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.stopPropagation();
                      handleDayDrop(e, cellLocationId, day);
                    }}
                  >
                    {hourMarkers.map((marker, idx) => (
                      <div
                        key={`grid-${idx}`}
                        className="absolute inset-y-0 border-r border-slate-300 pointer-events-none"
                        style={{ left: `${marker.position}px` }}
                      />
                    ))}

                    <div className="absolute inset-0 pointer-events-none" data-empty-area />

                    <div className="absolute inset-0 p-1 pointer-events-none">
                      {dayShifts.map((shift, shiftIdx) => {
                        const employee = getEmployee(shift.employeeId);
                        const func = getFunction(shift.functionId);
                        const shiftColor = employee?.color || func?.color || '#94a3b8';

                        const shiftStartMins = timeToMinutes(shift.start_time);
                        const shiftEndMins = timeToMinutes(shift.end_time);

                        let offsetFromStart = shiftStartMins - startTimeOffset;
                        if (offsetFromStart < 0) {
                          offsetFromStart += 24 * 60;
                        }

                        let durationMins = shiftEndMins - shiftStartMins;
                        if (durationMins <= 0) {
                          durationMins += 24 * 60;
                        }

                        const leftPx = offsetFromStart * PIXELS_PER_MINUTE;
                        const widthPx = durationMins * PIXELS_PER_MINUTE;
                        const duration = getShiftDuration(shift.start_time, shift.end_time, shift.break_duration);

                        return (
                          <div
                            key={shift.id}
                            className="absolute h-7 rounded-md shadow-sm border border-white hover:shadow-lg transition-all group pointer-events-auto z-10"
                            style={{
                              left: `${leftPx}px`,
                              width: `${widthPx}px`,
                              backgroundColor: shiftColor,
                              top: shiftIdx * 32 + 6,
                              zIndex: 10 + shiftIdx
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div 
                              className={`absolute inset-0 px-2 py-1 ${fontSizeClass} text-white font-semibold truncate flex items-center gap-1.5 cursor-move z-10`}
                              draggable
                              onDragStart={(e) => handleShiftDragStart(e, shift)}
                              onDragEnd={handleShiftDragEnd}
                              onClick={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                onShiftClick?.(shift);
                              }}
                            >
                              <div
                                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity z-30"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleResizeStart(e, shift, 'left');
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity z-30"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleResizeStart(e, shift, 'right');
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="truncate">
                                {employee ? `${employee.first_name} ${employee.last_name}` : 'Onbekend'}
                              </span>
                              {widthPx > 60 && (
                                <span className={`text-white/95 flex-shrink-0 font-semibold ml-auto ${DAY_WIDTH < 120 ? 'text-[9px]' : 'text-[10px]'}`}>
                                  {duration}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        
        {/* Extra ruimte onder de laatste locatie */}
        <div className="h-32 bg-slate-50/30 border-b border-slate-200" />
        </div>
      </div>
    </div>
  );
}