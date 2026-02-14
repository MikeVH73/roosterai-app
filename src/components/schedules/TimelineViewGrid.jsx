import React, { useState, useRef, useMemo } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { GripVertical, Clock, Plus } from 'lucide-react';
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
      s.locationId === locationId &&
      s.departmentId === departmentId &&
      s.date === dateStr
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
      <div ref={timelineRef} className="overflow-y-auto flex-1 w-full">
        <div className="w-full relative">
          {/* Header */}
          <div className="sticky top-0 z-20 border-b" style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)'
          }}>
            <div className="flex w-full">
              <div className="w-48 flex-shrink-0 border-r-2 p-3" style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface-light)'
              }}>
                <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Locaties</div>
              </div>
              {weekDays.map((day, dayIdx) => (
                <div key={dayIdx} className="border-r-2 flex-1" style={{
                  minWidth: '100px',
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-surface)'
                }}>
                  <div className="text-center py-2.5">
                    <div className="font-semibold text-sm px-2" style={{ color: 'var(--color-text-primary)' }}>
                      {format(day, 'EEEE', { locale: nl })}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {format(day, 'd MMM', { locale: nl })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grid rows per location/department */}
          {sortedLocations.map(location => {
            const departmentsForLocation = departments
              .filter(dept => dept.locationIds?.includes(location.id))
              .sort((a, b) => a.name.localeCompare(b.name));

            return (
              <div key={location.id}>
                {/* Location header */}
                <div
                  className="flex w-full border-b transition-colors"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: dragOverLocation === location.id ? 'var(--color-accent-light)' : 'transparent'
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
                  <div className="w-48 flex-shrink-0 border-r-2 p-3 flex items-center gap-2" style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface)'
                  }}>
                    <GripVertical className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                    <div className="flex-1">
                      <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {location.name}
                      </div>
                    </div>
                  </div>
                  {weekDays.map((day, dayIdx) => (
                    <div key={dayIdx} className="border-r-2 flex-1" style={{
                      minHeight: '40px',
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-surface)'
                    }} />
                  ))}
                </div>

                {/* Department rows */}
                {departmentsForLocation.map((dept, deptIdx) => {
                  const baseRowCount = 7;
                  const expandKey = `${location.id}-${dept.id}`;
                  const extraRows = expandedRows[expandKey] || 0;
                  const totalRows = baseRowCount + extraRows;

                  return (
                    <div key={dept.id}>
                      {Array.from({ length: totalRows }).map((_, rowIdx) => (
                        <div
                          key={`${dept.id}-row-${rowIdx}`}
                          className="flex w-full border-b h-10"
                          style={{
                            borderColor: 'var(--color-border)',
                            backgroundColor: deptIdx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-light)'
                          }}
                        >
                          {/* Department label on first row */}
                          <div className="w-48 flex-shrink-0 border-r-2 p-2 flex items-center" style={{
                            borderColor: 'var(--color-border)',
                            backgroundColor: rowIdx === 0 ? 'var(--color-surface)' : 'transparent',
                            fontSize: '12px',
                            color: 'var(--color-text-primary)'
                          }}>
                            {rowIdx === 0 ? (
                              <span className="font-medium">{dept.name}</span>
                            ) : null}
                          </div>

                          {/* Day cells with 15-min grid */}
                          {weekDays.map((day, dayIdx) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const dayShifts = getShiftsForDepartmentDay(location.id, dept.id, dateStr);
                            const shiftForThisRow = dayShifts[rowIdx];

                            return (
                              <div
                                key={dayIdx}
                                className="border-r-2 relative flex-1 flex"
                                style={{
                                  borderColor: 'var(--color-border)',
                                  minWidth: '100px'
                                }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDayDrop(e, location.id, dept.id, day)}
                              >
                                {/* 15-min cell grid */}
                                {Array.from({ length: Math.round(CELLS_PER_DAY) }).map((_, cellIdx) => (
                                  <div
                                    key={cellIdx}
                                    className="border-r border-opacity-20 flex-1"
                                    style={{
                                      borderColor: 'var(--color-border)',
                                      minWidth: `${CELL_WIDTH}px`,
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                      const clickedMinutes = cellIdx * MINUTES_PER_CELL;
                                      const clickedTime = minutesToTime(startTimeOffset + clickedMinutes);
                                      onCellClick?.(location.id, day, dept.id, clickedTime);
                                    }}
                                  />
                                ))}

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

                                  const leftPx = offsetFromStart * PIXELS_PER_MINUTE;
                                  const widthPx = durationMins * PIXELS_PER_MINUTE;
                                  const duration = getShiftDuration(shiftForThisRow.start_time, shiftForThisRow.end_time, shiftForThisRow.break_duration);

                                  return (
                                    <div
                                      className="absolute h-8 rounded-md shadow-sm border border-white hover:shadow-lg transition-all group pointer-events-auto z-10 flex items-center px-2 text-white text-xs font-semibold truncate"
                                      style={{
                                        left: `${leftPx}px`,
                                        width: `${widthPx}px`,
                                        backgroundColor: shiftColor,
                                        top: '1px',
                                        bottom: '1px'
                                      }}
                                      draggable
                                      onDragStart={(e) => handleShiftDragStart(e, shiftForThisRow)}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onShiftClick?.(shiftForThisRow);
                                      }}
                                      title={`${employee?.first_name} ${employee?.last_name} | ${shiftForThisRow.start_time} - ${shiftForThisRow.end_time} | ${duration}u`}
                                    >
                                      {employee?.first_name} {duration}u
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      ))}

                      {/* Add row button */}
                      {rowIdx === baseRowCount - 1 && (
                        <div
                          className="flex w-full border-b h-8"
                          style={{
                            borderColor: 'var(--color-border)',
                            backgroundColor: 'var(--color-surface-light)'
                          }}
                        >
                          <div className="w-48 flex-shrink-0 border-r-2" style={{ borderColor: 'var(--color-border)' }} />
                          <button
                            onClick={() => handleAddRow(location.id, dept.id)}
                            className="w-full flex items-center justify-center gap-1 text-xs font-medium hover:bg-blue-100 transition"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            <Plus className="w-3 h-3" />
                            Rij toevoegen
                          </button>
                        </div>
                      )}
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