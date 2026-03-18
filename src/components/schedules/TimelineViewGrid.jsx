import React, { useState, useRef, useMemo, Fragment } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { GripVertical, Clock, Plus, LayoutGrid, Edit } from 'lucide-react';
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

export default function TimelineViewGrid({
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
  onDepartmentPlan,
  currentWeekStart,
  activeDays = [0, 1, 2, 3, 4, 5, 6]
}) {
  const queryClient = useQueryClient();
  const [expandedRows, setExpandedRows] = useState({}); // Track extra rows per department
  const [draggedLocation, setDraggedLocation] = useState(null);
  const [dragOverLocation, setDragOverLocation] = useState(null);
  const [locationOrder, setLocationOrder] = useState(
    schedule?.location_order || locations.map(l => l.id)
  );
  const [resizingShift, setResizingShift] = useState(null);
  const [resizeTooltip, setResizeTooltip] = useState(null);
  const resizeRef = useRef({});
  const isDraggingOrResizing = useRef(false);
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

  const weekStart = currentWeekStart || startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = useMemo(() => {
    const allDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return allDays.filter(day => activeDays.includes(day.getDay()));
  }, [weekStart, activeDays]);

  const startTimeStr = schedule?.timeline_start_time || '06:00';
  const endTimeStr = schedule?.timeline_end_time || '06:00';
  const startTimeOffset = timeToMinutes(startTimeStr);
  const endTimeOffset = timeToMinutes(endTimeStr);

  let totalMinutes = endTimeOffset - startTimeOffset;
  if (totalMinutes <= 0) totalMinutes += 24 * 60;

  const numActiveDays = weekDays.length;
  const LOCATION_COL_WIDTH = 192;
  const availableWidth = timelineWidth - LOCATION_COL_WIDTH;
  const DAY_WIDTH = numActiveDays > 0 && availableWidth > 0
    ? availableWidth / numActiveDays
    : 800;

  const MINUTES_PER_CELL = 15;
  const CELLS_PER_DAY = totalMinutes / MINUTES_PER_CELL;
  const CELL_WIDTH = DAY_WIDTH / CELLS_PER_DAY;
  const PIXELS_PER_MINUTE = CELL_WIDTH / MINUTES_PER_CELL;

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

  const getEmployee = (employeeId) => employees.find(e => e.id === employeeId);
  const getFunction = (functionId) => allFunctions.find(f => f.id === functionId);

  const getShiftsForDepartmentDay = (locationId, departmentId, dateStr) => {
    return shifts.filter(s =>
      s.departmentId === departmentId &&
      s.date === dateStr &&
      (s.locationId === locationId || !s.locationId)
    );
  };

  const handleLocationDragStart = (e, locationId) => {
    setDraggedLocation(locationId);
    e.dataTransfer.effectAllowed = 'move';
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

    try {
      await base44.entities.Schedule.update(schedule.id, {
        location_order: newOrder
      });
      queryClient.invalidateQueries(['schedules']);
    } catch (error) {
      console.error('Failed to save location order:', error);
    }
  };

  const handleAddRow = (locationId, departmentId) => {
    const key = `${locationId}-${departmentId}`;
    setExpandedRows(prev => ({
      ...prev,
      [key]: (prev[key] || 0) + 1
    }));
  };

  const handleShiftDragStart = (e, shift) => {
    e.stopPropagation();
    if (!shift?.id) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', shift.id);
    isDraggingOrResizing.current = true;
  };

  const handleDayDrop = async (e, locationId, departmentId, dateToUse) => {
    e.preventDefault();
    e.stopPropagation();

    const shiftId = e.dataTransfer.getData('text/plain');
    if (!shiftId) {
      isDraggingOrResizing.current = false;
      return;
    }

    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) {
      isDraggingOrResizing.current = false;
      return;
    }

    const oldData = { ...shift };
    const targetDate = format(dateToUse, 'yyyy-MM-dd');

    try {
      await base44.entities.Shift.update(shift.id, {
        locationId,
        departmentId,
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

  const departmentColors = [
    'bg-blue-50', 'bg-green-50', 'bg-yellow-50', 'bg-purple-50', 'bg-pink-50',
    'bg-indigo-50', 'bg-orange-50', 'bg-teal-50', 'bg-cyan-50', 'bg-lime-50'
  ];

  if (!schedule || !locations || locations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Geen locaties beschikbaar
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border flex flex-col relative h-full" style={{
      backgroundColor: 'var(--color-surface)',
      borderColor: 'var(--color-border)'
    }}>
      {resizeTooltip && (
        <div 
          className="fixed z-50 px-3 py-2 rounded-lg shadow-xl text-sm font-semibold pointer-events-none"
          style={{
            left: `${resizeTooltip.x + 15}px`,
            top: `${resizeTooltip.y - 40}px`,
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)'
          }}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{resizeTooltip.time}</span>
          </div>
        </div>
      )}
      <div ref={timelineRef} className="overflow-auto flex-1 w-full h-full">
        <div className="w-full relative">

          {/* Grid rows per location/department */}
           {sortedLocations.map((location, locIdx) => {
             const departmentsForLocation = departments
               .filter(dept => dept.locationIds?.includes(location.id))
               .sort((a, b) => a.name.localeCompare(b.name));

             return (
               <div key={location.id}>
                 {/* Location name header - full width */}
                 <div
                   className="w-full border-b p-3 transition-colors"
                   style={{
                     borderColor: 'var(--color-border)',
                     backgroundColor: dragOverLocation === location.id ? 'var(--color-accent-light)' : 'var(--color-surface)'
                   }}
                   draggable
                   onDragStart={(e) => handleLocationDragStart(e, location.id)}
                   onDragOver={(e) => {
                     e.preventDefault();
                     setDragOverLocation(location.id);
                   }}
                   onDrop={(e) => handleLocationDrop(e, location.id)}
                   onDragLeave={() => setDragOverLocation(null)}
                 >
                   <div className="flex items-center gap-2 cursor-move">
                     <GripVertical className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                     <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                       {location.name}
                     </div>
                   </div>
                 </div>

                 {/* Day headers for this location */}
                 <div className="w-full border-b" style={{
                   borderColor: 'var(--color-border)',
                   backgroundColor: 'var(--color-surface)',
                   display: 'grid',
                   gridTemplateColumns: `repeat(${weekDays.length}, 1fr)`
                 }}>
                   {weekDays.map((day, dayIdx) => (
                     <div key={dayIdx} className="border-r p-2 text-center" style={{
                       borderColor: 'var(--color-border)'
                     }}>
                       <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                         {format(day, 'EEEE', { locale: nl })}
                       </div>
                       <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                         {format(day, 'd MMM', { locale: nl })}
                       </div>
                     </div>
                   ))}
                 </div>

                {/* Department rows */}
                {departmentsForLocation.map((dept, deptIdx) => {
                   // Calculate max shifts per day to determine row count dynamically
                   const maxShiftsPerDay = weekDays.reduce((max, day) => {
                     const dateStr = format(day, 'yyyy-MM-dd');
                     const dayShifts = getShiftsForDepartmentDay(location.id, dept.id, dateStr);
                     return Math.max(max, dayShifts.length);
                   }, 0);
                   const expandKey = `${location.id}-${dept.id}`;
                   const extraRows = expandedRows[expandKey] || 0;
                   const totalRows = Math.max(1, maxShiftsPerDay) + extraRows;

                   return (
                     <div key={dept.id}>
                       {/* Department label header */}
                       <div className="w-full border-b px-3 py-1.5 flex items-center justify-between" style={{
                         borderColor: 'var(--color-border)',
                         backgroundColor: locIdx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-light)'
                       }}>
                         <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                           {dept.name}
                         </span>
                         <div className="flex items-center gap-1">
                           {onDepartmentPlan && (
                             <button
                               title="Openen in Planningshulpmiddel"
                               onClick={() => onDepartmentPlan(dept.id)}
                               className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all hover:brightness-110"
                               style={{
                                 backgroundColor: 'rgba(57,220,20,0.18)',
                                 color: '#4ade80',
                                 border: '1px solid rgba(74,222,128,0.4)',
                               }}
                             >
                               <LayoutGrid className="w-3 h-3" />
                               Plannen
                             </button>
                           )}

                         </div>
                       </div>

                       {Array.from({ length: totalRows }).map((_, rowIdx) => (
                         <React.Fragment key={`${dept.id}-row-${rowIdx}`}>
                           <div
                             className="w-full border-b h-10"
                             style={{
                               borderColor: 'var(--color-border)',
                               backgroundColor: locIdx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-light)',
                               display: 'grid',
                               gridTemplateColumns: `repeat(${weekDays.length}, 1fr)`
                             }}
                           >
                             {/* Day cells with 15-min grid */}
                             {weekDays.map((day, dayIdx) => {
                               const dateStr = format(day, 'yyyy-MM-dd');
                               const dayShifts = getShiftsForDepartmentDay(location.id, dept.id, dateStr);
                               const shiftForThisRow = dayShifts[rowIdx];

                               return (
                                 <div
                                   key={dayIdx}
                                   className="border-r relative group/cell"
                                   style={{
                                     borderColor: 'var(--color-border)'
                                   }}
                                   onDragOver={(e) => e.preventDefault()}
                                   onDrop={(e) => handleDayDrop(e, location.id, dept.id, day)}
                                 >
                                   {/* Add button - only visible when cell is empty and on hover */}
                                   {!shiftForThisRow && rowIdx === 0 && (
                                     <button
                                       onClick={() => onCellClick?.(location.id, day, dept.id)}
                                       className="absolute top-1 left-1 w-5 h-5 rounded flex items-center justify-center transition-all opacity-0 group-hover/cell:opacity-30 hover:!opacity-100 hover:bg-slate-200 z-20"
                                       style={{ color: 'var(--color-text-muted)' }}
                                     >
                                       <Plus className="w-3 h-3" />
                                     </button>
                                   )}

                                   {/* Shift in this row */}
                                   {shiftForThisRow && (() => {
                                     const employee = getEmployee(shiftForThisRow.employeeId);
                                     const shiftColor = employee?.color || '#94a3b8';
                                     const shiftStartMins = timeToMinutes(shiftForThisRow.start_time);
                                     const shiftEndMins = timeToMinutes(shiftForThisRow.end_time);

                                     let offsetFromStart = shiftStartMins - startTimeOffset;
                                     if (offsetFromStart < 0) offsetFromStart += 24 * 60;

                                     let durationMins = shiftEndMins - shiftStartMins;
                                     if (durationMins <= 0) durationMins += 24 * 60;

                                     const leftPercent = (offsetFromStart / totalMinutes) * 100;
                                     const widthPercent = (durationMins / totalMinutes) * 100;

                                     const duration = getShiftDuration(shiftForThisRow.start_time, shiftForThisRow.end_time, shiftForThisRow.break_duration);

                                     return (
                                       <div
                                         className="absolute rounded-md shadow-sm border border-white hover:shadow-lg transition-all group pointer-events-auto z-10 flex items-center px-2 text-white text-xs font-semibold truncate"
                                         style={{
                                           backgroundColor: shiftColor,
                                           left: `${leftPercent}%`,
                                           width: `${widthPercent}%`,
                                           top: '2px',
                                           bottom: '2px'
                                         }}
                                         draggable
                                         onDragStart={(e) => handleShiftDragStart(e, shiftForThisRow)}
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           onShiftClick?.(shiftForThisRow);
                                         }}
                                         title={`${employee ? `${employee.first_name} ${employee.last_name}` : 'Onbekend'} | ${shiftForThisRow.start_time} - ${shiftForThisRow.end_time} | ${duration}u`}
                                       >
                                         <div
                                           className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity z-30"
                                           onMouseDown={(e) => {
                                             e.stopPropagation();
                                             e.preventDefault();
                                             handleResizeStart(e, shiftForThisRow, 'left');
                                           }}
                                           onClick={(e) => e.stopPropagation()}
                                         />
                                         <div
                                           className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity z-30"
                                           onMouseDown={(e) => {
                                             e.stopPropagation();
                                             e.preventDefault();
                                             handleResizeStart(e, shiftForThisRow, 'right');
                                           }}
                                           onClick={(e) => e.stopPropagation()}
                                         />
                                         <span className="truncate">
                                           {employee ? `${employee.first_name} ${duration}u` : `${duration}u`}
                                         </span>
                                       </div>
                                     );
                                   })()}
                                 </div>
                               );
                             })}
                           </div>

                           {/* Add row button - on last row */}
                           {rowIdx === totalRows - 1 && (
                             <div
                               className="w-full border-b h-8"
                               style={{
                                 borderColor: 'var(--color-border)',
                                 backgroundColor: 'var(--color-surface-light)',
                                 display: 'grid',
                                 gridTemplateColumns: `repeat(${weekDays.length}, 1fr)`
                               }}
                             >
                               <button
                                 onClick={() => handleAddRow(location.id, dept.id)}
                                 className="col-span-full flex items-center justify-center gap-1 text-xs font-medium hover:bg-blue-100 transition border-r"
                                 style={{ 
                                   color: 'var(--color-text-secondary)',
                                   borderColor: 'var(--color-border)'
                                 }}
                               >
                                 <Plus className="w-3 h-3" />
                                 Rij toevoegen
                               </button>
                             </div>
                           )}
                         </React.Fragment>
                       ))}
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