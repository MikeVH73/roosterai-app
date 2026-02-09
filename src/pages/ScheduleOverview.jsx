import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import ScheduleWeekView from '@/components/schedules/ScheduleWeekView';
import DaypartScheduleGrid from '@/components/schedules/DaypartScheduleGrid';
import { 
  Calendar,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';

function calculateNetHours(shift) {
  const [startH, startM] = shift.start_time.split(':').map(Number);
  const [endH, endM] = shift.end_time.split(':').map(Number);
  let hours = (endH * 60 + endM - startH * 60 - startM) / 60;
  if (hours < 0) hours += 24;
  const breakHours = (shift.break_duration || 0) / 60;
  return Math.max(0, hours - breakHours);
}

export default function ScheduleOverview() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());

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
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Gepubliceerde roosters</p>
                  <p className="text-3xl font-bold text-slate-900">{publishedSchedules.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Concepten</p>
                  <p className="text-3xl font-bold text-slate-900">{draftSchedules.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Actieve medewerkers</p>
                  <p className="text-3xl font-bold text-slate-900">{employees.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
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
                  
                  // Calculate week days
                  const weekDays = [];
                  for (let i = 0; i < 7; i++) {
                    const day = new Date(currentWeekStart);
                    day.setDate(day.getDate() + i);
                    if (day >= scheduleStart && day <= scheduleEnd) {
                      weekDays.push(day);
                    }
                  }

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

                  const handlePrevWeek = () => {
                    const newStart = new Date(currentWeekStart);
                    newStart.setDate(newStart.getDate() - 7);
                    setCurrentWeekStart(newStart);
                  };

                  const handleNextWeek = () => {
                    const newStart = new Date(currentWeekStart);
                    newStart.setDate(newStart.getDate() + 7);
                    setCurrentWeekStart(newStart);
                  };
                  
                  return (
                    <div key={schedule.id}>
                      <div className="p-6 border-t-2 border-slate-200">
                        {/* Header with navigation */}
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div>
                              <h3 className="text-xl font-semibold text-slate-900">{schedule.name}</h3>
                              <p className="text-sm text-slate-500">
                                {format(parseISO(schedule.start_date), 'd MMM', { locale: nl })} - {format(parseISO(schedule.end_date), 'd MMM yyyy', { locale: nl })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handlePrevWeek}
                                className="h-8"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                              <span className="text-sm font-medium px-3">
                                Week {format(currentWeekStart, 'w', { locale: nl })}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleNextWeek}
                                className="h-8"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                            <Button 
                              onClick={() => navigate(createPageUrl('ScheduleEditor') + `?id=${schedule.id}`)}
                              className="bg-blue-600 hover:bg-blue-700"
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

                        {/* Schedule Grid */}
                        {weekDays.length === 0 ? (
                          <div className="p-12 text-center text-slate-500">
                            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p>Geen dagen in deze week vallen binnen de rooster periode</p>
                          </div>
                        ) : (
                          <DaypartScheduleGrid
                            dayparts={relevantDayparts}
                            employees={scheduleEmployees}
                            shifts={scheduleShifts}
                            weekDays={weekDays}
                            staffingRequirements={staffingRequirements}
                            functions={functions}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}