import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import TimelineViewGrid from '@/components/schedules/TimelineViewGrid';
import MiniCalendar from '@/components/schedules/MiniCalendar';
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
  X,
  Maximize2,
  Minimize2
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
  // Trek pauze af van totale tijd om netto gewerkte uren te krijgen
  const breakHours = (shift.break_duration || 0) / 60;
  return hours - breakHours;
}

export default function ScheduleOverview() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Week starts on Monday
  const [viewMode, setViewMode] = useState('week'); // Always week view for timeline
  const [visibleDays, setVisibleDays] = useState([1, 2, 3, 4, 5, 6, 0]); // 1=maandag, 0=zondag
  const [miniCalendarOpen, setMiniCalendarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [fullscreenSchedule, setFullscreenSchedule] = useState(null);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
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

  const [selectedTimelineDayparts, setSelectedTimelineDayparts] = useState([]);

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--color-background)', minHeight: '100vh' }}>
      <div className="p-6">
        {/* Compact Statistics Bar with Title */}
        <div className="flex items-center justify-between mb-6 px-6 py-4 rounded-lg shadow-sm" style={{ backgroundColor: 'var(--color-surface-light)', borderColor: 'var(--color-border)' }}>
          {/* Left: Title */}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Rooster Overzicht</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{activeSchedules.length} actieve roosters</p>
          </div>
          
          {/* Right: Statistics Icons */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)' }}>
                <Calendar className="w-5 h-5" style={{ color: '#22c55e' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Gepubliceerd</p>
                <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{publishedSchedules.length}</p>
              </div>
            </div>
            <div className="w-px h-10" style={{ backgroundColor: 'var(--color-border)' }} />
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.15) 0%, rgba(148, 163, 184, 0.05) 100%)' }}>
                <TrendingUp className="w-5 h-5" style={{ color: '#94a3b8' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Concepten</p>
                <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{draftSchedules.length}</p>
              </div>
            </div>
            <div className="w-px h-10" style={{ backgroundColor: 'var(--color-border)' }} />
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0.05) 100%)' }}>
                <Users className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Medewerkers</p>
                <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{employees.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Tabs */}
        <Card className="border-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <CardContent className="p-0" style={{ backgroundColor: 'transparent' }}>
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
                <div className="px-4 pt-4 pb-2 overflow-x-auto" style={{ background: 'linear-gradient(to bottom, var(--color-surface-light), var(--color-surface))' }}>
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
                              ? 'shadow-lg -mb-px z-10' 
                              : 'hover:opacity-80'
                            }
                          `}
                          style={isActive ? {
                            backgroundColor: 'var(--color-surface)',
                            color: 'var(--color-text-primary)'
                          } : {
                            backgroundColor: 'var(--color-surface-light)',
                            color: 'var(--color-text-secondary)'
                          }}
                        >
                          <div className="flex flex-col items-start gap-1.5">
                            <div className="flex items-center gap-2 w-full">
                              {hasConflicts && (
                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                              )}
                              <span className="truncate flex-1 text-left">{schedule.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                className="text-[10px] px-1.5 py-0" 
                                style={{ 
                                  backgroundColor: schedule.status === 'published' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                                  color: schedule.status === 'published' ? '#22c55e' : 'var(--color-text-secondary)',
                                  border: `1px solid ${schedule.status === 'published' ? '#22c55e' : 'var(--color-border)'}`
                                }}
                              >
                                {statusConfig[schedule.status].label}
                              </Badge>
                              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                {format(parseISO(schedule.start_date), 'd MMM', { locale: nl })}
                              </span>
                            </div>
                          </div>
                          {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: 'linear-gradient(to right, var(--color-accent), var(--color-accent-light))' }} />
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
                  const currentMobileDay = isMobile && weekDays.length > 0 ? [weekDays[currentDayIndex] || weekDays[0]] : weekDays;

                  // Get relevant departments and dayparts
                  const relevantDepartmentIds = schedule.departmentIds || [];
                  const relevantDayparts = dayparts.filter(dp => 
                    relevantDepartmentIds.includes(dp.departmentId)
                  );

                  // Get relevant locations for this schedule
                  const relevantLocationIds = schedule.locationIds || [];
                  const relevantLocations = locations.filter(loc => 
                    relevantLocationIds.includes(loc.id)
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
                    if (isMobile) {
                      if (currentDayIndex < weekDays.length - 1) {
                        setCurrentDayIndex(currentDayIndex + 1);
                      } else {
                        setCurrentWeekStart(addWeeks(currentWeekStart, 1));
                        setCurrentDayIndex(0);
                      }
                    } else if (viewMode === 'day') {
                      setCurrentWeekStart(addDays(currentWeekStart, 1));
                    } else if (viewMode === 'week') {
                      setCurrentWeekStart(addWeeks(currentWeekStart, 1));
                    } else if (viewMode === 'month') {
                      setCurrentWeekStart(addDays(endOfMonth(currentWeekStart), 1));
                    }
                  };

                  const handlePrevMobile = () => {
                    if (currentDayIndex > 0) {
                      setCurrentDayIndex(currentDayIndex - 1);
                    } else {
                      setCurrentWeekStart(addWeeks(currentWeekStart, -1));
                      setCurrentDayIndex(6);
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
                    if (isMobile && weekDays.length > 0) {
                      const currentDay = weekDays[currentDayIndex] || weekDays[0];
                      return format(currentDay, 'EEEE d MMMM', { locale: nl });
                    }
                    if (viewMode === 'day') {
                      return format(currentWeekStart, 'd MMMM yyyy', { locale: nl });
                    } else if (viewMode === 'week') {
                      return `Week ${format(currentWeekStart, 'w', { locale: nl })}`;
                    } else if (viewMode === 'month') {
                      return format(currentWeekStart, 'MMMM yyyy', { locale: nl });
                    }
                    return '';
                  };
                  
                  const isFullscreen = fullscreenSchedule === schedule.id;

                  return (
                    <div key={schedule.id} style={{ borderTop: '2px solid var(--color-border)' }}>
                      {/* Main Content - Full Width */}
                      <div className={isFullscreen ? "fixed inset-0 z-50 p-6 overflow-auto" : "p-6"} style={isFullscreen ? { backgroundColor: 'var(--color-background)' } : {}}>
                        {/* Mini Calendar Toggle Button - Collapsed by default */}
                        {!miniCalendarOpen && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMiniCalendarOpen(true)}
                            className="mb-4"
                            style={{ 
                              borderColor: 'var(--color-border)', 
                              color: 'var(--color-text-primary)',
                              backgroundColor: 'var(--color-surface)'
                            }}
                          >
                            <Menu className="w-4 h-4 mr-2" />
                            Toon kalender
                          </Button>
                        )}
                        
                        {/* Mini Calendar Overlay */}
                        {miniCalendarOpen && (
                          <>
                            <div 
                              className="fixed inset-0 bg-black/50 z-40"
                              onClick={() => setMiniCalendarOpen(false)}
                            />
                            <div className="fixed left-0 top-0 bottom-0 w-80 p-6 z-50 shadow-2xl" style={{ backgroundColor: 'var(--color-surface)' }}>
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Kalender</h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setMiniCalendarOpen(false)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                              <MiniCalendar
                                selectedDate={currentWeekStart}
                                onDateSelect={handleDateSelect}
                              />
                            </div>
                          </>
                        )}
                        {/* Compact Header with Controls */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {/* Navigation */}
                            <div className="flex items-center gap-2 rounded-lg p-1" style={{ backgroundColor: 'var(--color-surface)' }}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={isMobile ? handlePrevMobile : handlePrev}
                                className="h-7"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </Button>
                              <span className={`text-xs font-medium px-3 text-center ${isMobile ? 'min-w-[180px]' : 'min-w-[140px]'}`} style={{ color: 'var(--color-text-primary)' }}>
                                {getViewLabel()}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleNext}
                                className="h-7"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                <ChevronRight className="w-3 h-3" />
                              </Button>
                            </div>
                            
                            {/* Day Selector - Hidden on mobile */}
                            {!isMobile && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 px-3 text-xs" style={{ 
                                    borderColor: 'var(--color-border)', 
                                    color: 'var(--color-text-primary)',
                                    backgroundColor: 'var(--color-surface)'
                                  }}>
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
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => setFullscreenSchedule(isFullscreen ? null : schedule.id)}
                              className="h-7 px-3 text-xs"
                              style={{ 
                                borderColor: 'var(--color-border)', 
                                color: 'var(--color-text-primary)',
                                backgroundColor: 'var(--color-surface)'
                              }}
                            >
                              {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => navigate(createPageUrl('ScheduleEditor') + `?id=${schedule.id}`)}
                              className="h-7 px-3 text-xs"
                              style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)', color: 'white' }}
                            >
                              Bewerken
                            </Button>
                          </div>
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

                        {/* Schedule Grid - Horizontal Timeline View */}
                        <div 
                          className="w-full overflow-auto"
                          onTouchStart={(e) => {
                            if (isMobile) {
                              const target = e.target;
                              // Only handle swipe if not on a shift element
                              if (!target.closest('[draggable="true"]')) {
                                e.currentTarget.touchStartX = e.touches[0].clientX;
                                e.currentTarget.touchStartY = e.touches[0].clientY;
                              }
                            }
                          }}
                          onTouchMove={(e) => {
                            if (isMobile && e.currentTarget.touchStartX) {
                              const diffX = e.currentTarget.touchStartX - e.touches[0].clientX;
                              const diffY = Math.abs(e.currentTarget.touchStartY - e.touches[0].clientY);
                              
                              // If horizontal swipe is more dominant than vertical
                              if (Math.abs(diffX) > diffY && Math.abs(diffX) > 10) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }
                          }}
                          onTouchEnd={(e) => {
                            if (isMobile && e.currentTarget.touchStartX) {
                              const touchEndX = e.changedTouches[0].clientX;
                              const diff = e.currentTarget.touchStartX - touchEndX;
                              
                              if (Math.abs(diff) > 50) {
                                e.preventDefault();
                                if (diff > 0) {
                                  handleNext();
                                } else {
                                  handlePrevMobile();
                                }
                              }
                              delete e.currentTarget.touchStartX;
                              delete e.currentTarget.touchStartY;
                            }
                          }}
                        >
                          {weekDays.length === 0 ? (
                            <div className="p-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
                              <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
                              <p>Geen dagen in deze periode vallen binnen de rooster periode</p>
                            </div>
                          ) : (
                            <TimelineViewGrid
                               schedule={schedule}
                               shifts={scheduleShifts}
                               locations={locations}
                               departments={departments}
                               employees={employees}
                               functions={functions}
                               dayparts={dayparts}
                               currentWeekStart={isMobile ? currentMobileDay[0] : currentWeekStart}
                               activeDays={isMobile ? [currentMobileDay[0].getDay()] : (schedule?.active_days || [0, 1, 2, 3, 4, 5, 6])}
                               onShiftClick={(shift) => handleShiftClick(shift, schedule.id)}
                               onShiftUpdate={(shift, oldData) => {
                                 queryClient.invalidateQueries(['all-shifts', companyId]);
                               }}
                               onCellClick={(locationId, date, departmentId, startTime) => {
                                 setSelectedShift(startTime ? { start_time: startTime } : null);
                                 setSelectedEmployeeId(null);
                                 setSelectedDate(format(date, 'yyyy-MM-dd'));
                                 setSelectedDaypartId(null);
                                 setCurrentScheduleId(schedule.id);
                                 setShiftDialogOpen(true);
                               }}
                             />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>

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
    </div>
  );
}