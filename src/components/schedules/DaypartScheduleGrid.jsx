import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Plus, AlertTriangle, CheckCircle2, GripVertical } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function calculateShiftHours(shift) {
  const [startH, startM] = shift.start_time.split(':').map(Number);
  const [endH, endM] = shift.end_time.split(':').map(Number);
  let hours = (endH * 60 + endM - startH * 60 - startM) / 60;
  if (hours < 0) hours += 24;
  return hours;
}

function calculateBreakHours(shift) {
  return (shift.break_duration || 0) / 60;
}

function calculateNetHours(shift) {
  // Pauze komt BOVENOP de dienst, dus we trekken het NIET af
  return calculateShiftHours(shift);
}

export default function DaypartScheduleGrid({
  dayparts,
  employees,
  shifts,
  weekDays,
  staffingRequirements,
  functions,
  onCellClick,
  onShiftClick,
  onDaypartOrderChange,
  schedule
}) {
  const getInitials = (first, last) => {
    return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
  };

  const getFunctionColor = (funcId) => {
    const func = functions.find(f => f.id === funcId);
    return func?.color || '#3B82F6';
  };

  const sortedDayparts = useMemo(() => {
    // If schedule has custom order, use that
    if (schedule?.daypart_order?.length) {
      const orderedDayparts = [];
      schedule.daypart_order.forEach(id => {
        const dp = dayparts.find(d => d.id === id);
        if (dp) orderedDayparts.push(dp);
      });
      // Add any dayparts not in the custom order
      dayparts.forEach(dp => {
        if (!schedule.daypart_order.includes(dp.id)) {
          orderedDayparts.push(dp);
        }
      });
      return orderedDayparts;
    }
    // Otherwise use default sortOrder
    return [...dayparts].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [dayparts, schedule?.daypart_order]);

  // Get shifts for a specific daypart and day
  const getShiftsForCell = (date, daypartId) => {
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    return shifts.filter(s => 
      s.date === dateStr && 
      s.daypartId === daypartId
    );
  };

  // Get employee by ID
  const getEmployee = (employeeId) => {
    return employees.find(e => e.id === employeeId);
  };

  // Calculate subtotal per daypart per day
  const calculateDaypartSubtotal = (daypartId, date) => {
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    const daypartShifts = shifts.filter(s => s.date === dateStr && s.daypartId === daypartId);
    return daypartShifts.reduce((sum, s) => sum + calculateNetHours(s), 0);
  };

  // Calculate total hours per day (all dayparts)
  const calculateDayTotal = (date) => {
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    const dayShifts = shifts.filter(s => s.date === dateStr);
    return dayShifts.reduce((sum, s) => sum + calculateNetHours(s), 0);
  };

  // Get target hours for a daypart on a specific day
  const getTargetHours = (daypartId, date) => {
    const dayOfWeek = parseISO(date).getDay();
    const req = staffingRequirements.find(r => 
      r.daypartId === daypartId && 
      (r.specific_date === date || r.day_of_week === dayOfWeek)
    );
    return req?.targetHours || null;
  };

  const handleDragEnd = (result) => {
    if (!result.destination || !onDaypartOrderChange) return;

    const items = Array.from(sortedDayparts);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const newOrder = items.map(dp => dp.id);
    onDaypartOrderChange(newOrder);
  };

  if (sortedDayparts.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Geen dagdelen gedefinieerd voor deze afdeling.</p>
        <p className="text-sm mt-1">Configureer dagdelen bij de afdelingsinstellingen.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="sticky left-0 bg-slate-50 z-20 p-3 text-left text-sm font-medium text-slate-600 border-r border-slate-200 min-w-[200px]">
              Medewerker
            </th>
            {weekDays.map((day) => (
              <th 
                key={day.toISOString()} 
                className="p-3 text-center text-sm font-medium text-slate-600 border-r border-slate-200 last:border-r-0 min-w-[180px]"
              >
                <div className="text-sm">{format(day, 'EEEE', { locale: nl })}</div>
                <div className="text-lg font-semibold text-slate-900">{format(day, 'd MMM', { locale: nl })}</div>
              </th>
            ))}
          </tr>
        </thead>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="dayparts">
            {(provided) => (
              <tbody {...provided.droppableProps} ref={provided.innerRef}>
                {sortedDayparts.length === 0 ? (
                  <tr>
                    <td colSpan={1 + weekDays.length} className="p-8 text-center text-slate-500">
                      Geen dagdelen gedefinieerd
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* Daypart rows */}
                    {sortedDayparts.map((daypart, index) => (
                      <Draggable 
                        key={daypart.id} 
                        draggableId={daypart.id} 
                        index={index}
                        isDragDisabled={!onDaypartOrderChange}
                      >
                        {(provided, snapshot) => (
                          <tr 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`border-t border-slate-200 hover:bg-slate-50/30 ${
                              snapshot.isDragging ? 'bg-blue-50 shadow-lg' : ''
                            }`}
                          >
                            <td 
                              className="sticky left-0 bg-white z-10 border-r border-slate-200 min-w-[200px]"
                              style={{ 
                                backgroundColor: snapshot.isDragging ? `${daypart.color}20` : `${daypart.color}08` || '#FAFAFA',
                                borderLeft: `4px solid ${daypart.color}` || '#3B82F6'
                              }}
                            >
                              <div className="flex items-center gap-2 p-3">
                                {onDaypartOrderChange && (
                                  <div 
                                    {...provided.dragHandleProps}
                                    className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="flex flex-col gap-1 flex-1">
                                  <p className="font-medium text-sm text-slate-900">{daypart.name}</p>
                                  <p className="text-xs text-slate-500">
                                    {daypart.startTime} - {daypart.endTime}
                                  </p>
                                </div>
                              </div>
                            </td>
                  {weekDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const cellShifts = getShiftsForCell(dateStr, daypart.id);
                    const subtotal = calculateDaypartSubtotal(daypart.id, dateStr);
                    const targetHours = getTargetHours(daypart.id, dateStr);

                    return (
                      <td 
                        key={`${day.toISOString()}_${daypart.id}`}
                        className="p-2 align-top border-r border-slate-200 last:border-r-0 min-h-[80px] group/cell cursor-pointer hover:bg-slate-50"
                        style={{ backgroundColor: `${daypart.color}05` || '#FAFAFA' }}
                        onDoubleClick={(e) => {
                          if (e.target === e.currentTarget || e.target.closest('.add-shift-hint')) {
                            onCellClick?.(null, dateStr, daypart.id);
                          }
                        }}
                      >
                        <div className="space-y-1.5 min-h-[60px]" onDoubleClick={(e) => {
                          if (cellShifts.length === 0) {
                            e.stopPropagation();
                            onCellClick?.(null, dateStr, daypart.id);
                          }
                        }}>
                          {cellShifts.map((shift) => {
                            const employee = getEmployee(shift.employeeId);
                            if (!employee) return null;

                            const netHours = calculateNetHours(shift);

                            return (
                              <div
                                key={shift.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onShiftClick?.(shift);
                                }}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all hover:scale-[1.02] shadow-sm border"
                                style={{ 
                                  backgroundColor: `${getFunctionColor(shift.functionId)}15`,
                                  borderColor: `${getFunctionColor(shift.functionId)}40`
                                }}
                              >
                                <Avatar className="w-6 h-6 flex-shrink-0">
                                  <AvatarFallback 
                                    className="text-xs font-medium"
                                    style={{ 
                                      backgroundColor: `${getFunctionColor(shift.functionId)}30`,
                                      color: getFunctionColor(shift.functionId)
                                    }}
                                  >
                                    {getInitials(employee.first_name, employee.last_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-slate-900 truncate">
                                    {employee.first_name} {employee.last_name}
                                  </p>
                                  <p className="text-[10px] text-slate-500">
                                    {employee.contract_hours ? `${employee.contract_hours}u/week` : 'Flex'}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xs font-medium" style={{ color: getFunctionColor(shift.functionId) }}>
                                    {shift.start_time}-{shift.end_time}
                                  </p>
                                  <p className="text-[10px] text-slate-600 font-medium">
                                    {netHours.toFixed(1)}u
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Add button - shows on hover */}
                          {cellShifts.length === 0 && (
                            <div className="add-shift-hint h-full min-h-[60px] flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none">
                              <div className="flex items-center gap-2 text-slate-400 text-xs">
                                <Plus className="w-4 h-4" />
                                <span>Dubbelklik om toe te voegen</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                            );
                          })}
                          </tr>
                        )}
                      </Draggable>
                    ))}

              {/* Subtotal per dagdeel row */}
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                <td className="sticky left-0 bg-slate-50 z-10 p-3 border-r border-slate-200 text-sm text-slate-700">
                  Subtotaal per dagdeel
                </td>
                {weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  
                  return (
                    <td 
                      key={`${day.toISOString()}_subtotal`}
                      className="p-2 border-r border-slate-200 last:border-r-0"
                    >
                      <div className="space-y-1">
                        {sortedDayparts.map((daypart) => {
                          const subtotal = calculateDaypartSubtotal(daypart.id, dateStr);
                          if (subtotal === 0) return null;

                          const targetHours = getTargetHours(daypart.id, dateStr);
                          let statusColor = 'text-slate-700';
                          if (targetHours) {
                            const percentage = (subtotal / targetHours) * 100;
                            if (percentage < 80 || percentage > 120) statusColor = 'text-red-600';
                            else if (percentage < 95 || percentage > 105) statusColor = 'text-amber-600';
                            else statusColor = 'text-green-600';
                          }

                          return (
                            <div 
                              key={daypart.id}
                              className="text-xs flex items-center justify-between gap-2"
                            >
                              <span className="text-[10px] text-slate-600 truncate">
                                {daypart.name.substring(0, 12)}
                              </span>
                              <span className={`font-semibold ${statusColor}`}>
                                {subtotal.toFixed(1)}u
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Daily total row */}
              <tr className="border-t-2 border-slate-400 bg-slate-100 font-bold">
                <td className="sticky left-0 bg-slate-100 z-10 p-3 border-r border-slate-200 text-sm text-slate-900">
                  Totaal per dag
                </td>
                {weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dailyTotal = calculateDayTotal(dateStr);
                  
                  return (
                    <td 
                      key={`${day.toISOString()}_total`}
                      className="p-3 text-center text-sm text-slate-900 border-r border-slate-200 last:border-r-0"
                    >
                      {dailyTotal.toFixed(1)}u
                    </td>
                  );
                })}
                    </tr>
                  </>
                )}
                {provided.placeholder}
              </tbody>
            )}
          </Droppable>
        </DragDropContext>
      </table>
    </div>
  );
}