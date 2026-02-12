import React, { useState, useRef, useMemo } from 'react';
import { format, addDays, startOfWeek, isSameDay, parseISO, differenceInMinutes, addMinutes } from 'date-fns';
import { nl } from 'date-fns/locale';
import { GripVertical, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const DAYPARTS = [
  { id: 'morning', name: 'Ochtend', start: '06:00', end: '12:00', hours: 6 },
  { id: 'afternoon', name: 'Middag', start: '12:00', end: '18:00', hours: 6 },
  { id: 'evening', name: 'Avond', start: '18:00', end: '24:00', hours: 6 },
  { id: 'night', name: 'Nacht', start: '00:00', end: '06:00', hours: 6 }
];

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

// Helper: Calculate position percentage within daypart
const getShiftPosition = (shiftStart, daypartStart, daypartHours) => {
  const shiftMins = timeToMinutes(shiftStart);
  const daypartMins = timeToMinutes(daypartStart);
  const daypartTotalMins = daypartHours * 60;
  
  let offsetMins = shiftMins - daypartMins;
  if (offsetMins < 0) offsetMins += 24 * 60; // Handle overnight
  
  return (offsetMins / daypartTotalMins) * 100;
};

// Helper: Calculate width percentage
const getShiftWidth = (start, end, daypartHours) => {
  const startMins = timeToMinutes(start);
  let endMins = timeToMinutes(end);
  
  if (endMins <= startMins) endMins += 24 * 60;
  
  const durationMins = endMins - startMins;
  const daypartTotalMins = daypartHours * 60;
  
  return Math.min((durationMins / daypartTotalMins) * 100, 100);
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
  onShiftClick,
  onCellClick,
  currentWeekStart,
  selectedDayparts = ['morning', 'afternoon', 'evening', 'night']
}) {
  const queryClient = useQueryClient();
  const [draggedLocation, setDraggedLocation] = useState(null);
  const [dragOverLocation, setDragOverLocation] = useState(null);
  const [locationOrder, setLocationOrder] = useState(
    schedule?.location_order || locations.map(l => l.id)
  );
  const [resizingShift, setResizingShift] = useState(null);
  const resizeRef = useRef({ initialX: 0, initialWidth: 0, edge: null });

  // Use provided week start or default
  const weekStart = currentWeekStart || startOfWeek(new Date(), { weekStartsOn: 1 });

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Filter dayparts based on selection
  const filteredDayparts = useMemo(() => {
    return DAYPARTS.filter(dp => selectedDayparts.includes(dp.id));
  }, [selectedDayparts]);

  // Sort locations by custom order
  const sortedLocations = useMemo(() => {
    const orderMap = new Map(locationOrder.map((id, idx) => [id, idx]));
    return [...locations].sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? 999;
      const orderB = orderMap.get(b.id) ?? 999;
      return orderA - orderB;
    });
  }, [locations, locationOrder]);

  // Get shifts for specific location, date, and daypart
  const getShiftsForCell = (locationId, date, daypart) => {
    return shifts.filter(shift => {
      if (shift.locationId !== locationId) return false;
      if (!isSameDay(parseISO(shift.date), date)) return false;
      
      const shiftStart = timeToMinutes(shift.start_time);
      const daypartStart = timeToMinutes(daypart.start);
      const daypartEnd = timeToMinutes(daypart.end);
      
      // Handle overnight shifts
      if (daypartEnd < daypartStart) {
        return shiftStart >= daypartStart || shiftStart < daypartEnd;
      }
      return shiftStart >= daypartStart && shiftStart < daypartEnd;
    });
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

    // Save to backend
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

  const handleCellDrop = async (e, locationId, date, daypart) => {
    e.preventDefault();
    e.stopPropagation();
    
    const shiftId = e.dataTransfer.getData('shiftId');
    if (!shiftId) return;

    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;

    // Update shift with new location and date
    try {
      await base44.entities.Shift.update(shift.id, {
        locationId,
        date: format(date, 'yyyy-MM-dd'),
        start_time: daypart.start,
        end_time: daypart.end
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
    const shiftElement = e.target.closest('.shift-bar');
    const cellElement = e.target.closest('[data-daypart]');
    
    resizeRef.current = {
      initialX: e.clientX,
      initialStart: shift.start_time,
      initialEnd: shift.end_time,
      edge,
      cellElement,
      shiftElement
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
      
      const cellWidth = resizeRef.current.cellElement.offsetWidth;
      const daypartHours = parseFloat(resizeRef.current.cellElement.dataset.daypartHours);
      const minutesPerPixel = (daypartHours * 60) / cellWidth;
      const deltaMinutes = Math.round(deltaX * minutesPerPixel / 15) * 15;

      let newStart = resizeRef.current.initialStart;
      let newEnd = resizeRef.current.initialEnd;

      if (edge === 'left') {
        const startMins = timeToMinutes(resizeRef.current.initialStart) + deltaMinutes;
        newStart = minutesToTime(Math.max(0, Math.min(startMins, timeToMinutes(newEnd) - 15)));
      } else {
        const endMins = timeToMinutes(resizeRef.current.initialEnd) + deltaMinutes;
        newEnd = minutesToTime(Math.max(timeToMinutes(newStart) + 15, endMins));
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
              <div key={dayIdx} className="border-r border-slate-300" style={{ width: `${filteredDayparts.length * 160}px`, minWidth: `${filteredDayparts.length * 160}px` }}>
                <div className="text-center border-b border-slate-200 bg-slate-50 py-2">
                  <div className="font-semibold text-slate-800">
                    {format(day, 'EEEE', { locale: nl })}
                  </div>
                  <div className="text-sm text-slate-600">
                    {format(day, 'd MMM', { locale: nl })}
                  </div>
                </div>
                
                {/* Dayparts header */}
                <div className="flex border-b border-slate-200 bg-slate-50">
                  {filteredDayparts.map((daypart) => (
                    <div 
                      key={daypart.id} 
                      className="flex-1 text-center py-1.5 border-r border-slate-200 last:border-r-0"
                    >
                      <div className="text-[10px] font-semibold text-slate-700 uppercase">
                        {daypart.name}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        {daypart.start} - {daypart.end}
                      </div>
                    </div>
                  ))}
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
            {weekDays.map((day, dayIdx) => (
              <div key={dayIdx} className="border-r border-slate-300" style={{ width: `${filteredDayparts.length * 160}px`, minWidth: `${filteredDayparts.length * 160}px` }}>
                <div className="flex" style={{ minHeight: '120px' }}>
                  {filteredDayparts.map((daypart) => {
                    const cellShifts = getShiftsForCell(location.id, day, daypart);
                    
                    return (
                      <div
                        key={daypart.id}
                        className="flex-1 border-r border-slate-200 last:border-r-0 relative bg-white hover:bg-slate-50/30 transition-colors cursor-pointer"
                        data-daypart={daypart.id}
                        data-daypart-hours={daypart.hours}
                        onClick={(e) => {
                          if (e.target === e.currentTarget || e.target.closest('.empty-cell-click')) {
                            onCellClick?.(location.id, day, daypart);
                          }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleCellDrop(e, location.id, day, daypart)}
                      >
                        {/* Time grid lines (subtle) */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {[...Array(daypart.hours)].map((_, i) => (
                            <div key={i} className="flex-1 border-r border-slate-100 first:border-l-0" />
                          ))}
                        </div>

                        {/* Empty cell click area */}
                        <div className="absolute inset-0 empty-cell-click" />

                        {/* Shifts */}
                        <div className="absolute inset-0 p-1 flex flex-col gap-0.5 overflow-hidden pointer-events-none">
                          {cellShifts.map((shift, shiftIdx) => {
                            const employee = getEmployee(shift.employeeId);
                            const func = getFunction(shift.functionId);
                            const left = getShiftPosition(shift.start_time, daypart.start, daypart.hours);
                            const width = getShiftWidth(shift.start_time, shift.end_time, daypart.hours);
                            const duration = getShiftDuration(shift.start_time, shift.end_time, shift.break_duration);

                            return (
                              <div
                                key={shift.id}
                                className="absolute h-6 rounded shadow-sm border border-slate-300 hover:shadow-md transition-shadow group pointer-events-auto shift-bar"
                                style={{
                                  left: `${left}%`,
                                  width: `${width}%`,
                                  backgroundColor: func?.color || '#94a3b8',
                                  top: shiftIdx * 26 + 2
                                }}
                              >
                                {/* Resize handles */}
                                <div
                                  className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleResizeStart(e, shift, 'left');
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
                                  className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleResizeStart(e, shift, 'right');
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

                                {/* Content - draggable and double-clickable */}
                                <div 
                                  className="absolute inset-0 px-1.5 py-0.5 text-[10px] text-white font-medium truncate flex items-center gap-1 cursor-move"
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
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}