import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import ScheduleWeekView from '@/components/schedules/ScheduleWeekView';
import DaypartScheduleGrid from '@/components/schedules/DaypartScheduleGrid';
import MiniCalendar from '@/components/schedules/MiniCalendar';
import MonthCalendarGrid from '@/components/schedules/MonthCalendarGrid';
import ShiftDialog from '@/components/schedules/ShiftDialog';
import { 
  Calendar,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Settings2,
  Menu,
  X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth, addDays, addWeeks } from 'date-fns';
import { nl } from 'date-fns/locale';

function calculateNetHours(shift) {
  const [startH, startM] = shift.start_time.split(':').map(Number);
  const [endH, endM] = shift.end_time.split(':').map(Number);
  let hours = (endH * 60 + endM - startH * 60 - startM) / 60;
  if (hours < 0) hours += 24;
  // Pauze komt BOVENOP de dienst, dus we trekken het NIET af
  return hours;
}

export default function ScheduleOverview() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Week starts on Monday
  const [viewMode, setViewMode] = useState('week'); // 'day', 'week', 'month', 'year'
  const [visibleDays, setVisibleDays] = useState([1, 2, 3, 4, 5, 6, 0]); // 1=maandag, 0=zondag
  const [miniCalendarOpen, setMiniCalendarOpen] = useState(true);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedDaypartId, setSelectedDaypartId] = useState(null);
  const [currentScheduleId, setCurrentScheduleId] = useState(null);

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => base44.entities.Schedule.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: allShifts = [] } = useQuery({
    queryKey: ['all-shifts', companyId],
    queryFn: () => base44.entities.Shift.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: staffingRequirements = [] } = useQuery({
    queryKey: ['staffing-requirements', companyId],
    queryFn: () => base44.entities.StaffingRequirement.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  const { data: dayparts = [] } = useQuery({
    queryKey: ['dayparts', companyId],
    queryFn: () => base44.entities.DepartmentDaypart.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => base44.entities.EmployeeProfile.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  const { data: functions = [] } = useQuery({
    queryKey: ['functions', companyId],
    queryFn: () => base44.entities.Function.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', companyId],
    queryFn: () => base44.entities.Department.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', companyId],
    queryFn: () => base44.entities.Location.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  // Calculate conflicts per schedule
  const scheduleConflicts = useMemo(() => {
    const conflicts = {};
    
    schedules.forEach(schedule => {
      const scheduleShifts = allShifts.filter(s => s.scheduleId === schedule.id);
      const startDate = parseISO(schedule.start_date);
      const endDate = parseISO(schedule.end_date);
      
      let hasIssues = false;
      
      // Check each day in the schedule
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const dayOfWeek = currentDate.getDay();
        
        // Check each daypart
        dayparts.forEach(dp => {
          const requirements = staffingRequirements.filter(r => 
            r.daypartId === dp.id && 
            (r.specific_date === dateStr || r.day_of_week === dayOfWeek)
          );
          
          if (requirements.length > 0) {
            const targetHours = requirements.reduce((sum, r) => sum + (r.targetHours || 0), 0);
            const scheduledHours = scheduleShifts
              .filter(s => s.date === dateStr && s.daypartId === dp.id)
              .reduce((sum, s) => sum + calculateNetHours(s), 0);
            
            const percentage = targetHours > 0 ? (scheduledHours / targetHours) * 100 : 100;
            
            if (percentage < 80 || percentage > 120) {
              hasIssues = true;
            }
          }
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      conflicts[schedule.id] = hasIssues;
    });
    
    return conflicts;
  }, [schedules, allShifts, staffingRequirements, dayparts]);

  // Get schedule statistics
  const getScheduleStats = (schedule) => {
    const scheduleShifts = allShifts.filter(s => s.scheduleId === schedule.id);
    const totalHours = scheduleShifts.reduce((sum, s) => sum + calculateNetHours(s), 0);
    const employeeCount = new Set(scheduleShifts.map(s => s.employeeId)).size;
    
    return { totalHours, employeeCount, shiftCount: scheduleShifts.length };
  };

  const activeSchedules = schedules.filter(s => s.status !== 'archived');
  const publishedSchedules = activeSchedules.filter(s => s.status === 'published');
  const draftSchedules = activeSchedules.filter(s => s.status === 'draft');

  const statusConfig = {
    draft: { label: 'Concept', color: 'bg-slate-100 text-slate-700' },
    published: { label: 'Gepubliceerd', color: 'bg-green-100 text-green-700' },
    archived: { label: 'Gearchiveerd', color: 'bg-gray-100 text-gray-500' }
  };

  const handleCellClick = (employeeId, date, daypartId, scheduleId) => {
    setSelectedShift(null);
    setSelectedEmployeeId(employeeId);
    setSelectedDate(typeof date === 'string' ? date : format(date, 'yyyy-MM-dd'));
    setSelectedDaypartId(daypartId);
    setCurrentScheduleId(scheduleId);
    setShiftDialogOpen(true);
  };

  const handleShiftClick = (shift, scheduleId) => {
    setSelectedShift(shift);
    setSelectedEmployeeId(shift.employeeId);
    setSelectedDate(shift.date);
    setSelectedDaypartId(shift.daypartId);
    setCurrentScheduleId(scheduleId);
    setShiftDialogOpen(true);
  };

  const handleCloseShiftDialog = () => {
    setShiftDialogOpen(false);
    setSelectedShift(null);
    setSelectedEmployeeId(null);
    setSelectedDate(null);
    setSelectedDaypartId(null);
    setCurrentScheduleId(null);
  };

  if (schedulesLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar 
        title="Rooster Overzicht" 
        subtitle={`${activeSchedules.length} actieve roosters`}
      />

      <div className="p-6 max-w-7xl mx-auto">
        {/* Compact Statistics Bar */}
        <div className="flex items-center gap-6 mb-4 px-4 py-3 bg-white rounded-lg shadow-sm border border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Gepubliceerd</p>
              <p className="text-lg font-bold text-slate-900">{publishedSchedules.length}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Concepten</p>
              <p className="text-lg font-bold text-slate-900">{draftSchedules.length}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Medewerkers</p>
              <p className="text-lg font-bold text-slate-900">{employees.length}</p>
            </div>
          </div>
        </div>

        {/* Schedule Tabs */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Roosters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activeSchedules.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-medium text-slate-900 mb-2">Nog geen roosters</h3>
                <p className="text-slate-500 text-sm mb-6">
                  Maak je eerste rooster aan om te beginnen met plannen.
                </p>
                <Button onClick={() => navigate(createPageUrl('Schedules'))}>
                  Naar Roosters
                </Button>
              </div>
            ) : (
              <Tabs value={selectedScheduleId || activeSchedules[0]?.id} onValueChange={setSelectedScheduleId}>
                <div className="px-4 pt-4 pb-2 overflow-x-auto bg-gradient-to-b from-slate-50 to-white">
                  <div className="flex gap-2">
                    {activeSchedules.map(schedule => {
                      const hasConflicts = scheduleConflicts[schedule.id];
                      const isActive = (selectedScheduleId || activeSchedules[0]?.id) === schedule.id;
                      
                      return (
                        <button
                          key={schedule.id}
                          onClick={() => setSelectedScheduleId(schedule.id)}
                          className={`
                            relative min-w-[180px] max-w-[220px] px-4 py-3 rounded-t-xl font-medium text-sm transition-all
                            ${isActive 
                              ? 'bg-white shadow-lg -mb-px z-10 text-slate-900' 
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                            }
                          `}
                        >
                          <div className="flex flex-col items-start gap-1.5">
                            <div className="flex items-center gap-2 w-full">
                              {hasConflicts && (
                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                              )}
                              <span className="truncate flex-1 text-left">{schedule.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${statusConfig[schedule.status].color} text-[10px] px-1.5 py-0`}>
                                {statusConfig[schedule.status].label}
                              </Badge>
                              <span className="text-xs text-slate-400">
                                {format(parseISO(schedule.start_date), 'd MMM', { locale: nl })}
                              </span>
                            </div>
                          </div>
                          {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-xl" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {activeSchedules.map(schedule => {
                  const stats = getScheduleStats(schedule);
                  const hasConflicts = scheduleConflicts[schedule.id];
                  const isVisible = (selectedScheduleId || activeSchedules[0]?.id) === schedule.id;
                  
                  if (!isVisible) return null;

                  const scheduleStart = parseISO(schedule.start_date);
                  const scheduleEnd = parseISO(schedule.end_date);

                  const handleDaypartOrderChange = async (newOrder) => {
                    await base44.entities.Schedule.update(schedule.id, {
                      daypart_order: newOrder
                    });
                    queryClient.invalidateQueries(['schedules', companyId]);
                  };
                  
                  // Calculate visible days based on view mode
                  const calculateVisibleDays = () => {
                    let days = [];
                    
                    if (viewMode === 'day') {
                      days = [currentWeekStart];
                    } else if (viewMode === 'week') {
                      const weekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
                      for (let i = 0; i < 7; i++) {
                        const day = addDays(weekStart, i);
                        const dayOfWeek = day.getDay();
                        if (visibleDays.includes(dayOfWeek)) {
                          days.push(day);
                        }
                      }
                    } else if (viewMode === 'month') {
                      const monthStart = startOfMonth(currentWeekStart);
                      const monthEnd = endOfMonth(currentWeekStart);
                      let current = monthStart;
                      while (current <= monthEnd) {
                        if (visibleDays.includes(current.getDay())) {
                          days.push(new Date(current));
                        }
                        current = addDays(current, 1);
                      }
                    }
                    
                    return days.filter(day => day >= scheduleStart && day <= scheduleEnd);
                  };
                  
                  const weekDays = calculateVisibleDays();

                  // Get relevant departments and dayparts
                  const relevantDepartmentIds = schedule.departmentIds || [];
                  const relevantDayparts = dayparts.filter(dp => 
                    relevantDepartmentIds.includes(dp.departmentId)
                  );

                  // Filter employees for this schedule
                  const scheduleEmployees = employees.filter(emp => 
                    emp.departmentIds?.some(deptId => relevantDepartmentIds.includes(deptId))
                  );

                  const scheduleShifts = allShifts.filter(s => s.scheduleId === schedule.id);

                  const handlePrev = () => {
                    if (viewMode === 'day') {
                      setCurrentWeekStart(addDays(currentWeekStart, -1));
                    } else if (viewMode === 'week') {
                      setCurrentWeekStart(addWeeks(currentWeekStart, -1));
                    } else if (viewMode === 'month') {
                      setCurrentWeekStart(addDays(startOfMonth(currentWeekStart), -1));
                    }
                  };

                  const handleNext = () => {
                    if (viewMode === 'day') {
                      setCurrentWeekStart(addDays(currentWeekStart, 1));
                    } else if (viewMode === 'week') {
                      setCurrentWeekStart(addWeeks(currentWeekStart, 1));
                    } else if (viewMode === 'month') {
                      setCurrentWeekStart(addDays(endOfMonth(currentWeekStart), 1));
                    }
                  };

                  const handleDateSelect = (date) => {
                    if (viewMode === 'day') {
                      setCurrentWeekStart(date);
                    } else if (viewMode === 'week') {
                      setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
                    } else if (viewMode === 'month') {
                      setCurrentWeekStart(startOfMonth(date));
                    }
                  };
                  
                  const toggleDay = (dayIndex) => {
                    if (visibleDays.includes(dayIndex)) {
                      if (visibleDays.length > 1) {
                        setVisibleDays(visibleDays.filter(d => d !== dayIndex));
                      }
                    } else {
                      setVisibleDays([...visibleDays, dayIndex].sort());
                    }
                  };
                  
                  const dayNames = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
                  const dayNamesFull = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
                  
                  const getViewLabel = () => {
                    if (viewMode === 'day') {
                      return format(currentWeekStart, 'd MMMM yyyy', { locale: nl });
                    } else if (viewMode === 'week') {
                      return `Week ${format(currentWeekStart, 'w', { locale: nl })}`;
                    } else if (viewMode === 'month') {
                      return format(currentWeekStart, 'MMMM yyyy', { locale: nl });
                    }
                    return '';
                  };
                  
                  return (
                    <div key={schedule.id} className="border-t-2 border-slate-200">
                      <div className="flex">
                        {/* Mini Calendar Sidebar */}
                        {miniCalendarOpen && (
                          <div className="w-80 border-r border-slate-200 p-6 bg-slate-50 flex-shrink-0">
                            <MiniCalendar
                              selectedDate={currentWeekStart}
                              onDateSelect={handleDateSelect}
                            />
                          </div>
                        )}

                        {/* Main Content */}
                        <div className="flex-1 p-6 min-w-0">
                        {/* Compact Header with Controls */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {/* Toggle Mini Calendar */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setMiniCalendarOpen(!miniCalendarOpen)}
                              className="h-7 px-2 border-slate-300"
                            >
                              {miniCalendarOpen ? (
                                <>
                                  <X className="w-4 h-4 mr-1" />
                                  <span className="text-xs">Verberg kalender</span>
                                </>
                              ) : (
                                <>
                                  <Menu className="w-4 h-4 mr-1" />
                                  <span className="text-xs">Toon kalender</span>
                                </>
                              )}
                            </Button>
                            {/* View Mode Selector */}
                            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                              <Button
                                variant={viewMode === 'day' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('day')}
                                className={`h-7 px-3 text-xs ${viewMode === 'day' ? 'bg-white shadow-sm' : ''}`}
                              >
                                Dag
                              </Button>
                              <Button
                                variant={viewMode === 'week' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('week')}
                                className={`h-7 px-3 text-xs ${viewMode === 'week' ? 'bg-white shadow-sm' : ''}`}
                              >
                                Week
                              </Button>
                              <Button
                                variant={viewMode === 'month' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('month')}
                                className={`h-7 px-3 text-xs ${viewMode === 'month' ? 'bg-white shadow-sm' : ''}`}
                              >
                                Maand
                              </Button>
                            </div>
                            
                            {/* Navigation */}
                            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handlePrev}
                                className="h-7"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </Button>
                              <span className="text-xs font-medium px-3 min-w-[140px] text-center">
                                {getViewLabel()}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleNext}
                                className="h-7"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </Button>
                            </div>
                            
                            {/* Day Selector */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 px-3 text-xs">
                                  <Settings2 className="w-3 h-3 mr-1" />
                                  Dagen ({visibleDays.length})
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuLabel className="text-xs">Zichtbare dagen</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx, idx) => (
                                  <DropdownMenuCheckboxItem
                                    key={dayIdx}
                                    checked={visibleDays.includes(dayIdx)}
                                    onCheckedChange={() => toggleDay(dayIdx)}
                                  >
                                    {dayNamesFull[idx]}
                                  </DropdownMenuCheckboxItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          <Button 
                            size="sm"
                            onClick={() => navigate(createPageUrl('ScheduleEditor') + `?id=${schedule.id}`)}
                            className="bg-blue-600 hover:bg-blue-700 h-7 px-3 text-xs"
                          >
                            Bewerken
                          </Button>
                        </div>

                        {hasConflicts && (
                          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                            <div>
                              <p className="text-sm text-red-700">
                                Bezettingsproblemen gedetecteerd - bekijk details in de rooster editor
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Schedule Grid */}
                        <div className="w-full overflow-auto">
                          {viewMode === 'month' ? (
                            <MonthCalendarGrid
                              currentDate={currentWeekStart}
                              shifts={scheduleShifts}
                              dayparts={relevantDayparts}
                              staffingRequirements={staffingRequirements}
                              onDayClick={handleDateSelect}
                            />
                          ) : weekDays.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                              <p>Geen dagen in deze periode vallen binnen de rooster periode</p>
                            </div>
                          ) : (
                            <DaypartScheduleGrid
                              dayparts={relevantDayparts}
                              employees={scheduleEmployees}
                              shifts={scheduleShifts}
                              weekDays={weekDays}
                              staffingRequirements={staffingRequirements}
                              functions={functions}
                              onCellClick={(employeeId, date, daypartId) => handleCellClick(employeeId, date, daypartId, schedule.id)}
                              onShiftClick={(shift) => handleShiftClick(shift, schedule.id)}
                              onDaypartOrderChange={handleDaypartOrderChange}
                              schedule={schedule}
                            />
                          )}
                        </div>
                      </div>
                      </div>
                    </div>
                  );
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {currentScheduleId && (
        <ShiftDialog
          open={shiftDialogOpen}
          onClose={handleCloseShiftDialog}
          shift={selectedShift}
          scheduleId={currentScheduleId}
          employeeId={selectedEmployeeId}
          date={selectedDate}
          daypartId={selectedDaypartId}
          employees={employees.filter(emp => 
            emp.departmentIds?.some(deptId => 
              schedules.find(s => s.id === currentScheduleId)?.departmentIds?.includes(deptId)
            )
          )}
          departments={departments}
          dayparts={dayparts}
          locations={locations}
          functions={functions}
          schedule={schedules.find(s => s.id === currentScheduleId)}
        />
      )}
    </div>
  );
}