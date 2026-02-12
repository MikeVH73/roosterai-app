import React, { useState, useRef, useMemo } from 'react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { GripVertical, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

// Helper: Convert time string to minutes since midnight
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper: Convert minutes to time string
const minutesToTime = (mins) => {
  const hours = Math.floor(mins / 60) % 24;
  const minutes = mins % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Helper: Get shift duration in hours
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
  currentWeekStart,
  selectedDayparts = []
}) {
  const queryClient = useQueryClient();
  const [draggedLocation, setDraggedLocation] = useState(null);
  const [dragOverLocation, setDragOverLocation] = useState(null);
  const [locationOrder, setLocationOrder] = useState(
    schedule?.location_order || locations.map(l => l.id)
  );
  const [resizingShift, setResizingShift] = useState(null);
  const resizeRef = useRef({});

  // Use provided week start or default
  const weekStart = currentWeekStart || startOfWeek(new Date(), { weekStartsOn: 1 });

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Filter and sort dayparts
  const filteredDayparts = useMemo(() => {
    if (!dayparts.length) return [];
    const filtered = selectedDayparts.length 
      ? dayparts.filter(dp => selectedDayparts.includes(dp.id))
      : dayparts;
    return filtered.sort((a, b) => {
      const aStart = timeToMinutes(a.startTime);
      const bStart = timeToMinutes(b.startTime);
      return aStart - bStart;
    });
  }, [dayparts, selectedDayparts]);

  // Calculate total minutes for the day view
  const { totalMinutes, daypartRanges } = useMemo(() => {
    if (!filteredDayparts.length) return { totalMinutes: 0, daypartRanges: [] };
    
    const ranges = filteredDayparts.map(dp => {
      const start = timeToMinutes(dp.startTime);
      let end = timeToMinutes(dp.endTime);
      if (end <= start) end += 24 * 60;
      return { id: dp.id, name: dp.name, start, end, duration: end - start };
    });
    
    const total = ranges.reduce((sum, r) => sum + r.duration, 0);
    return { totalMinutes: total, daypartRanges: ranges };
  }, [filteredDayparts]);

  // Sort locations by custom order
  const sortedLocations = useMemo(() => {
    const orderMap = new Map(locationOrder.map((id, idx) => [id, idx]));
    return [...locations].sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? 999;
      const orderB = orderMap.get(b.id) ?? 999;
      return orderA - orderB;
    });
  }, [locations, locationOrder]);

  // Get all shifts for a day/location
  const getShiftsForDay = (locationId, date) => {
    return shifts.filter(shift => 
      shift.locationId === locationId && isSameDay(parseISO(shift.date), date)
    );
  };

  // Get employee info
  const getEmployee = (employeeId) => {
    return employees.find(e => e.id === employeeId);
  };

  // Get function info
  const getFunction = (functionId) => {
    return allFunctions.find(f => f.id === functionId);
  };

  // Location drag handlers
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

  // Shift drag handlers
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

    try {
      await base44.entities.Shift.update(shift.id, {
        locationId,
        date: format(date, 'yyyy-MM-dd')
      });
      queryClient.invalidateQueries(['shifts']);
    } catch (error) {
      console.error('Failed to move shift:', error);
    }
  };

  // Shift resize handlers
  const handleResizeStart = (e, shift, edge) => {
    e.stopPropagation();
    e.preventDefault();
    
    setResizingShift(shift.id);
    const dayContainer = e.currentTarget.closest('[data-day-container]');
    
    resizeRef.current = {
      initialX: e.clientX,
      initialStart: shift.start_time,
      initialEnd: shift.end_time,
      edge,
      containerWidth: dayContainer?.offsetWidth || 1,
      totalMinutes
    };

    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
    };

    const handleMouseUp = async (upEvent) => {
      upEvent.preventDefault();
      upEvent.stopPropagation();
      
      const deltaX = upEvent.clientX - resizeRef.current.initialX;
      if (Math.abs(deltaX) < 5) {
        setResizingShift(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        return;
      }
      
      const minutesPerPixel = resizeRef.current.totalMinutes / resizeRef.current.containerWidth;
      const deltaMinutes = Math.round(deltaX * minutesPerPixel / 15) * 15;

      let newStart = resizeRef.current.initialStart;
      let newEnd = resizeRef.current.initialEnd;

      if (edge === 'left') {
        const startMins = timeToMinutes(resizeRef.current.initialStart) + deltaMinutes;
        newStart = minutesToTime(Math.max(0, Math.min(startMins, timeToMinutes(newEnd) - 15)));
      } else {
        const endMins = timeToMinutes(resizeRef.current.initialEnd) + deltaMinutes;
        newEnd = minutesToTime(Math.max(timeToMinutes(newStart) + 15, Math.min(endMins, 24 * 60 - 15)));
      }

      try {
        await base44.entities.Shift.update(shift.id, {
          start_time: newStart,
          end_time: newEnd
        });
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

  if (!filteredDayparts.length) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Selecteer minimaal één dagdeel
      </div>
    );
  }

  const gridLineCount = Math.ceil(totalMinutes / 15);

  return (
    <div className="w-full overflow-auto bg-white rounded-lg border border-slate-200">
      <div className="min-w-max">
        {/* Header: Days and Dayparts */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-300">
          <div className="flex">
            {/* Location column header */}
            <div className="w-48 flex-shrink-0 border-r border-slate-300 bg-slate-50 p-3">
              <div className="font-semibold text-slate-700">Locaties</div>
            </div>

            {/* Days */}
            {weekDays.map((day, dayIdx) => (
              <div key={dayIdx} className="border-r border-slate-300" style={{ width: '800px', minWidth: '800px' }}>
                <div className="text-center border-b border-slate-200 bg-slate-50 py-2">
                  <div className="font-semibold text-slate-800">
                    {format(day, 'EEEE', { locale: nl })}
                  </div>
                  <div className="text-sm text-slate-600">
                    {format(day, 'd MMM', { locale: nl })}
                  </div>
                </div>
                
                {/* Dayparts header - continuous */}
                <div className="flex border-b border-slate-200 bg-slate-50">
                  {filteredDayparts.map((daypart, idx) => {
                    const range = daypartRanges[idx];
                    const widthPercent = (range.duration / totalMinutes) * 100;
                    
                    return (
                      <div 
                        key={daypart.id} 
                        className="text-center py-1.5 border-r border-slate-200 last:border-r-0"
                        style={{ width: `${widthPercent}%` }}
                      >
                        <div className="text-[10px] font-semibold text-slate-700 uppercase">
                          {daypart.name}
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          {daypart.startTime} - {daypart.endTime}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Body: Location rows */}
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
            {/* Location name */}
            <div className="w-48 flex-shrink-0 border-r border-slate-300 bg-white p-3 flex items-center gap-2 cursor-move">
              <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 truncate">{location.name}</div>
                {location.code && (
                  <div className="text-xs text-slate-500">{location.code}</div>
                )}
              </div>
            </div>

            {/* Days */}
            {weekDays.map((day, dayIdx) => {
              const dayShifts = getShiftsForDay(location.id, day);

              return (
                <div 
                  key={dayIdx} 
                  className="border-r border-slate-300 relative" 
                  style={{ width: '800px', minWidth: '800px', minHeight: '120px' }}
                  data-day-container
                  onClick={(e) => {
                    if (e.target.dataset.dayContainer !== undefined || e.target.closest('[data-empty-area]')) {
                      onCellClick?.(location.id, day, null);
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDayDrop(e, location.id, day)}
                >
                  {/* Continuous 15-minute grid lines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {[...Array(gridLineCount)].map((_, i) => {
                      const isHourLine = (i * 15) % 60 === 0;
                      return (
                        <div 
                          key={i} 
                          className={`flex-1 ${isHourLine ? 'border-r border-slate-300' : 'border-r border-slate-100'}`}
                          style={{ minWidth: '1px' }}
                        />
                      );
                    })}
                  </div>

                  {/* Empty click area */}
                  <div className="absolute inset-0" data-empty-area />

                  {/* Shifts - rendered continuously across the entire day */}
                  <div className="absolute inset-0 p-1 pointer-events-none">
                    {dayShifts.map((shift, shiftIdx) => {
                      const employee = getEmployee(shift.employeeId);
                      const func = getFunction(shift.functionId);
                      
                      // Calculate shift position as continuous minutes from first daypart start
                      const shiftStartMins = timeToMinutes(shift.start_time);
                      let shiftEndMins = timeToMinutes(shift.end_time);
                      if (shiftEndMins <= shiftStartMins) shiftEndMins += 24 * 60;
                      
                      const firstDaypartStart = daypartRanges[0].start;
                      
                      // Calculate position relative to the continuous timeline
                      let leftOffset = 0;
                      let shiftLeft = 0;
                      
                      for (const range of daypartRanges) {
                        if (shiftStartMins >= range.start && shiftStartMins < range.end) {
                          shiftLeft = leftOffset + (shiftStartMins - range.start);
                          break;
                        } else if (shiftStartMins < range.start) {
                          // Shift starts before this daypart
                          break;
                        }
                        leftOffset += range.duration;
                      }
                      
                      const shiftDuration = shiftEndMins - shiftStartMins;
                      const leftPercent = (shiftLeft / totalMinutes) * 100;
                      const widthPercent = (shiftDuration / totalMinutes) * 100;
                      const duration = getShiftDuration(shift.start_time, shift.end_time, shift.break_duration);

                      return (
                        <div
                          key={shift.id}
                          className="absolute h-6 rounded shadow-sm border border-slate-300 hover:shadow-md transition-shadow group pointer-events-auto"
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            backgroundColor: func?.color || '#94a3b8',
                            top: shiftIdx * 28 + 4
                          }}
                        >
                          {/* Resize handles */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-20 rounded-l"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleResizeStart(e, shift, 'left');
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => e.stopPropagation()}
                          />
                          <div
                            className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-20 rounded-r"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleResizeStart(e, shift, 'right');
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => e.stopPropagation()}
                          />

                          {/* Content */}
                          <div 
                            className="absolute inset-0 px-2 py-0.5 text-[10px] text-white font-medium truncate flex items-center gap-1.5 cursor-move"
                            draggable
                            onDragStart={(e) => handleShiftDragStart(e, shift)}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              onShiftClick?.(shift);
                            }}
                            style={{ marginLeft: '4px', marginRight: '4px' }}
                          >
                            <span className="truncate">
                              {employee ? `${employee.first_name} ${employee.last_name}` : 'Onbekend'}
                            </span>
                            <span className="text-white/90 text-[9px] flex-shrink-0">
                              {shift.start_time}-{shift.end_time}
                            </span>
                            <span className="text-white/90 text-[9px] flex-shrink-0 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {duration}u
                            </span>
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
  );
}