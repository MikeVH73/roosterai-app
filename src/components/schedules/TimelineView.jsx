import React, { useState, useRef, useMemo } from 'react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { GripVertical, Clock } from 'lucide-react';
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
  
  // Calculate day width dynamically based on available width and number of active days
  const numActiveDays = weekDays.length;
  const minDayWidth = 200;
  let calculatedDayWidth = minDayWidth;
  if (numActiveDays > 0 && timelineWidth > 0) {
    calculatedDayWidth = Math.max(minDayWidth, timelineWidth / numActiveDays);
  }
  
  const DAY_WIDTH = calculatedDayWidth;
  const PIXELS_PER_MINUTE = DAY_WIDTH / totalMinutes;



  const sortedLocations = useMemo(() => {
    const orderMap = new Map(locationOrder.map((id, idx) => [id, idx]));
    return [...locations].sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? 999;
      const orderB = orderMap.get(b.id) ?? 999;
      return orderA - orderB;
    });
  }, [locations, locationOrder]);

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
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('shiftId', shift.id);
    isDraggingOrResizing.current = true;
  };

  const handleShiftDragEnd = () => {
    isDraggingOrResizing.current = false;
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
      <div ref={timelineRef} className="overflow-x-auto overflow-y-auto flex-1">
        <div className="min-w-max relative">
        <div className="sticky top-0 z-20 bg-white border-b border-slate-300">
          <div className="flex">
            <div className="w-48 flex-shrink-0 border-r border-slate-300 bg-slate-50 p-3">
              <div className="font-semibold text-slate-700 text-sm">Locaties</div>
            </div>

            {weekDays.map((day, dayIdx) => (
              <div key={dayIdx} className="border-r border-slate-200" style={{ width: `${DAY_WIDTH}px`, flex: `1 0 ${DAY_WIDTH}px` }}>
                <div className="text-center bg-white py-2.5">
                  <div className="font-semibold text-slate-800 text-sm">
                    {format(day, 'EEEE', { locale: nl })}
                  </div>
                  <div className="text-xs text-slate-600">
                    {format(day, 'd MMM', { locale: nl })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline with hours spanning all days */}
          <div className="flex border-t border-slate-200">
            <div className="w-48 flex-shrink-0 border-r border-slate-300 bg-slate-50" />

            {weekDays.map((day, dayIdx) => (
              <div key={dayIdx} className="relative border-r border-slate-200 bg-slate-50" style={{ width: `${DAY_WIDTH}px`, flex: `1 0 ${DAY_WIDTH}px`, height: '32px' }}>
                {hourMarkers.map((marker, idx) => (
                  <div 
                    key={idx} 
                    className="absolute inset-y-0 border-l border-slate-300"
                    style={{ left: `${marker.position}px` }}
                  >
                    <span className="absolute -top-1 left-0.5 text-[11px] text-slate-600 font-medium">
                      {marker.label.replace(':00', '')}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {sortedLocations.map((location) => (
          <div
            key={location.id}
            className={`flex border-b border-slate-200 hover:bg-slate-50/50 transition-colors ${
              dragOverLocation === location.id ? 'bg-blue-50' : ''
            }`}
            draggable
            onDragStart={(e) => handleLocationDragStart(e, location.id)}
            onDragOver={(e) => handleLocationDragOver(e, location.id)}
            onDrop={(e) => handleLocationDrop(e, location.id)}
            onDragEnd={() => {
              setDraggedLocation(null);
              setDragOverLocation(null);
            }}
          >
            <div className="w-48 flex-shrink-0 border-r border-slate-300 bg-white p-3 flex items-center gap-2 cursor-move hover:bg-slate-50 transition-colors">
              <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 text-sm truncate">{location.name}</div>
                {location.code && (
                  <div className="text-xs text-slate-500">{location.code}</div>
                )}
              </div>
            </div>

            {weekDays.map((day, dayIdx) => {
              const dayShifts = getShiftsForDay(location.id, day);
              const cellHeight = Math.max(100, dayShifts.length * 38 + 20);

              return (
                <div 
                  key={dayIdx} 
                  className="border-r border-slate-200 relative bg-white hover:bg-slate-50/50 transition-colors" 
                  style={{ width: `${DAY_WIDTH}px`, flex: `1 0 ${DAY_WIDTH}px`, minHeight: `${cellHeight}px` }}
                  data-day-container
                  onClick={(e) => {
                    if (isDraggingOrResizing.current) {
                      isDraggingOrResizing.current = false;
                      return;
                    }
                    // Only trigger on direct clicks on empty space
                    if (e.target === e.currentTarget || e.target.closest('[data-empty-area]')) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const offsetX = e.clientX - rect.left;
                      const clickedMinutes = Math.round((offsetX / PIXELS_PER_MINUTE) / 15) * 15;
                      const clickedTime = minutesToTime(clickedMinutes);
                      
                      onCellClick?.(location.id, day, null, clickedTime);
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDayDrop(e, location.id, day)}
                >
                  {/* Vertical grid lines every 2 hours */}
                  {hourMarkers.map((marker, idx) => (
                    <div
                      key={`grid-${idx}`}
                      className="absolute inset-y-0 border-r border-slate-300 pointer-events-none"
                      style={{ left: `${marker.position}px` }}
                    />
                  ))}

                  <div className="absolute inset-0" data-empty-area />

                  <div className="absolute inset-0 p-1 pointer-events-none">
                    {dayShifts.map((shift, shiftIdx) => {
                      const employee = getEmployee(shift.employeeId);
                      const func = getFunction(shift.functionId);
                      
                      let startMins = timeToMinutes(shift.start_time);
                      let endMins = timeToMinutes(shift.end_time);
                      if (endMins <= startMins) endMins += 24 * 60;
                      
                      // Adjust for timeline start offset
                      const rawStartMins = timeToMinutes(shift.start_time);
                      const rawEndMins = timeToMinutes(shift.end_time) + (timeToMinutes(shift.end_time) < rawStartMins ? 24 * 60 : 0);
                      
                      // Position relative to timeline start
                      startMins = (rawStartMins - startTimeOffset + 24 * 60) % (24 * 60);
                      const shiftDurationMins = rawEndMins - rawStartMins;
                      endMins = startMins + shiftDurationMins;
                      
                      const leftPx = startMins * PIXELS_PER_MINUTE;
                      const widthPx = (endMins - startMins) * PIXELS_PER_MINUTE;
                      const duration = getShiftDuration(shift.start_time, shift.end_time, shift.break_duration);

                      return (
                        <div
                          key={shift.id}
                          className="absolute h-7 rounded-md shadow-sm border border-white hover:shadow-lg transition-all group pointer-events-auto"
                          style={{
                            left: `${leftPx}px`,
                            width: `${widthPx}px`,
                            backgroundColor: func?.color || '#94a3b8',
                            top: shiftIdx * 32 + 6
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div 
                            className="absolute inset-0 px-2 py-1 text-[11px] text-white font-semibold truncate flex items-center gap-1.5 cursor-move z-10"
                            draggable
                            onDragStart={(e) => handleShiftDragStart(e, shift)}
                            onDragEnd={handleShiftDragEnd}
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              onShiftClick?.(shift);
                            }}
                          >
                            {/* Resize handles - thin edges only */}
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
                              <span className="text-white/95 text-[10px] flex-shrink-0 font-semibold ml-auto">
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
        ))}
        </div>
      </div>
    </div>
  );
}