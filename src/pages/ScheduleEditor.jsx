import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import ShiftDialog from '@/components/schedules/ShiftDialog';
import DaypartScheduleGrid from '@/components/schedules/DaypartScheduleGrid';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  Sparkles,
  AlertTriangle,
  Users,
  Loader2,
  Building2,
  LayoutGrid,
  List
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  format, 
  parseISO, 
  eachDayOfInterval, 
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks
} from 'date-fns';
import { nl } from 'date-fns/locale';

export default function ScheduleEditor() {
  const navigate = useNavigate();
  const { currentCompany, hasPermission, canUseAI } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const scheduleId = urlParams.get('id');

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedDaypartId, setSelectedDaypartId] = useState(null);
  const [viewMode, setViewMode] = useState('dayparts'); // 'dayparts', 'simple', or 'timeline'
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('all');

  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: async () => {
      const schedules = await base44.entities.Schedule.filter({ id: scheduleId });
      return schedules[0];
    },
    enabled: !!scheduleId
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', scheduleId],
    queryFn: () => base44.entities.Shift.filter({ scheduleId }),
    enabled: !!scheduleId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => base44.entities.EmployeeProfile.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', companyId],
    queryFn: () => base44.entities.Department.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  const { data: dayparts = [] } = useQuery({
    queryKey: ['dayparts', companyId],
    queryFn: () => base44.entities.DepartmentDaypart.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  const { data: staffingRequirements = [] } = useQuery({
    queryKey: ['staffing-requirements', companyId],
    queryFn: () => base44.entities.StaffingRequirement.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  const { data: functions = [] } = useQuery({
    queryKey: ['functions', companyId],
    queryFn: () => base44.entities.Function.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', companyId],
    queryFn: () => base44.entities.Location.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  const publishMutation = useMutation({
    mutationFn: () => base44.entities.Schedule.update(scheduleId, {
      status: 'published',
      published_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['schedule', scheduleId]);
    }
  });

  const updateDaypartOrderMutation = useMutation({
    mutationFn: (daypartOrder) => base44.entities.Schedule.update(scheduleId, {
      daypart_order: daypartOrder
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['schedule', scheduleId]);
    }
  });

  // Get the days to display
  const weekDays = useMemo(() => {
    if (!schedule) {
      return eachDayOfInterval({
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
      });
    }
    
    const scheduleStart = parseISO(schedule.start_date);
    const scheduleEnd = parseISO(schedule.end_date);
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    
    const displayStart = scheduleStart > currentWeekStart ? scheduleStart : currentWeekStart;
    const displayEnd = scheduleEnd < weekEnd ? scheduleEnd : weekEnd;
    
    if (displayStart > displayEnd) return [];
    
    return eachDayOfInterval({ start: displayStart, end: displayEnd });
  }, [schedule, currentWeekStart]);

  // Filter employees based on schedule departments and selected department
  const relevantEmployees = useMemo(() => {
    let filtered = employees;
    
    if (schedule?.departmentIds?.length) {
      filtered = filtered.filter(emp => 
        emp.departmentIds?.some(deptId => schedule.departmentIds.includes(deptId))
      );
    }
    
    if (selectedDepartmentId !== 'all') {
      filtered = filtered.filter(emp => 
        emp.departmentIds?.includes(selectedDepartmentId)
      );
    }
    
    return filtered;
  }, [employees, schedule, selectedDepartmentId]);

  // Get dayparts for selected department
  const relevantDayparts = useMemo(() => {
    if (selectedDepartmentId === 'all') {
      // Show dayparts from all relevant departments
      const deptIds = schedule?.departmentIds?.length 
        ? schedule.departmentIds 
        : departments.map(d => d.id);
      return dayparts.filter(dp => deptIds.includes(dp.departmentId));
    }
    return dayparts.filter(dp => dp.departmentId === selectedDepartmentId);
  }, [dayparts, selectedDepartmentId, schedule, departments]);

  // Get staffing requirements for selected department
  const relevantRequirements = useMemo(() => {
    if (selectedDepartmentId === 'all') {
      return staffingRequirements;
    }
    return staffingRequirements.filter(r => r.departmentId === selectedDepartmentId);
  }, [staffingRequirements, selectedDepartmentId]);

  const getInitials = (first, last) => {
    return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
  };

  const handleCellClick = (employeeId, date, daypartId = null) => {
    setSelectedShift(null);
    setSelectedEmployeeId(employeeId);
    setSelectedDate(typeof date === 'string' ? date : format(date, 'yyyy-MM-dd'));
    setSelectedDaypartId(daypartId);
    setShiftDialogOpen(true);
  };

  const handleShiftClick = (shift) => {
    setSelectedShift(shift);
    setSelectedEmployeeId(shift.employeeId);
    setSelectedDate(shift.date);
    setSelectedDaypartId(shift.daypartId);
    setShiftDialogOpen(true);
  };

  const handleCloseShiftDialog = () => {
    setShiftDialogOpen(false);
    setSelectedShift(null);
    setSelectedEmployeeId(null);
    setSelectedDate(null);
    setSelectedDaypartId(null);
  };

  const handleDaypartOrderChange = useCallback((newOrder) => {
    updateDaypartOrderMutation.mutate(newOrder);
  }, [updateDaypartOrderMutation]);

  const navigateWeek = (direction) => {
    setCurrentWeekStart(prev => 
      direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1)
    );
  };

  const getFunctionColor = (funcId) => {
    const func = functions.find(f => f.id === funcId);
    return func?.color || '#3B82F6';
  };

  const getShiftsForCell = (employeeId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter(s => s.employeeId === employeeId && s.date === dateStr);
  };

  if (scheduleLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="font-medium text-slate-900 mb-2">Rooster niet gevonden</h3>
            <Button onClick={() => navigate(createPageUrl('Schedules'))}>
              Terug naar roosters
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = {
    draft: { label: 'Concept', color: 'bg-slate-100 text-slate-700' },
    published: { label: 'Gepubliceerd', color: 'bg-green-100 text-green-700' },
    archived: { label: 'Gearchiveerd', color: 'bg-gray-100 text-gray-500' }
  };

  const relevantDepartments = schedule?.departmentIds?.length 
    ? departments.filter(d => schedule.departmentIds.includes(d.id))
    : departments;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopBar 
        title={schedule.name}
        subtitle={`${format(parseISO(schedule.start_date), 'd MMM', { locale: nl })} - ${format(parseISO(schedule.end_date), 'd MMM yyyy', { locale: nl })}`}
        actions={
          <div className="flex items-center gap-3">
            <Badge className={statusConfig[schedule.status].color}>
              {statusConfig[schedule.status].label}
            </Badge>
            {canUseAI() && (
              <Button 
                variant="outline" 
                onClick={() => navigate(createPageUrl('AIAssistant') + `?scheduleId=${scheduleId}`)}
              >
                <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                AI Assistent
              </Button>
            )}
            {schedule.status === 'draft' && hasPermission('manage_schedules') && (
              <Button 
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {publishMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Publiceren
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {/* Controls Bar */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigateWeek('prev')}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Vorige week
                </Button>
                <h3 className="font-medium text-slate-900">
                  Week {format(currentWeekStart, 'w', { locale: nl })} - {format(currentWeekStart, 'MMMM yyyy', { locale: nl })}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => navigateWeek('next')}>
                  Volgende week
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              <div className="flex items-center gap-3">
                <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                  <SelectTrigger className="w-48">
                    <Building2 className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Afdeling" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle afdelingen</SelectItem>
                    {relevantDepartments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Tabs value={viewMode} onValueChange={setViewMode}>
                  <TabsList>
                    <TabsTrigger value="dayparts" className="flex items-center gap-1">
                      <LayoutGrid className="w-4 h-4" />
                      Dagdelen
                    </TabsTrigger>
                    <TabsTrigger value="simple" className="flex items-center gap-1">
                      <List className="w-4 h-4" />
                      Simpel
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Schedule Grid */}
            {viewMode === 'dayparts' && relevantDayparts.length > 0 ? (
              <DaypartScheduleGrid
                dayparts={relevantDayparts}
                employees={relevantEmployees}
                shifts={shifts}
                weekDays={weekDays}
                staffingRequirements={relevantRequirements}
                functions={functions}
                onCellClick={handleCellClick}
                onShiftClick={handleShiftClick}
                onDaypartOrderChange={handleDaypartOrderChange}
                schedule={schedule}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="sticky left-0 bg-slate-50 z-10 p-3 text-left text-sm font-medium text-slate-600 w-48 border-r border-slate-200">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Medewerker
                        </div>
                      </th>
                      {weekDays.map((day) => (
                        <th key={day.toISOString()} className="p-3 text-center text-sm font-medium text-slate-600 min-w-32 border-r border-slate-100 last:border-r-0">
                          <div>{format(day, 'EEEE', { locale: nl })}</div>
                          <div className="text-lg font-semibold text-slate-900">{format(day, 'd')}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {relevantEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={weekDays.length + 1} className="p-8 text-center text-slate-500">
                          Geen medewerkers gevonden voor dit rooster
                        </td>
                      </tr>
                    ) : (
                      relevantEmployees.map((employee) => (
                        <tr key={employee.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                          <td className="sticky left-0 bg-white z-10 p-3 border-r border-slate-200">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-medium">
                                  {getInitials(employee.first_name, employee.last_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 text-sm truncate">
                                  {employee.first_name} {employee.last_name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {employee.contract_hours ? `${employee.contract_hours}u/week` : 'Flex'}
                                </p>
                              </div>
                            </div>
                          </td>
                          {weekDays.map((day) => {
                            const cellShifts = getShiftsForCell(employee.id, day);
                            return (
                              <td 
                                key={day.toISOString()} 
                                className="p-2 border-r border-slate-100 last:border-r-0 align-top min-h-20 cursor-pointer hover:bg-blue-50/50 transition-colors"
                                onClick={() => handleCellClick(employee.id, day)}
                              >
                                <div className="space-y-1 min-h-16">
                                  {cellShifts.map((shift) => (
                                    <div
                                      key={shift.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleShiftClick(shift);
                                      }}
                                      className="px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-all hover:scale-105"
                                      style={{ 
                                        backgroundColor: `${getFunctionColor(shift.functionId)}15`,
                                        borderLeft: `3px solid ${getFunctionColor(shift.functionId)}`
                                      }}
                                    >
                                      <p className="font-medium" style={{ color: getFunctionColor(shift.functionId) }}>
                                        {shift.start_time} - {shift.end_time}
                                      </p>
                                      {shift.notes && (
                                        <p className="text-slate-500 truncate">{shift.notes}</p>
                                      )}
                                    </div>
                                  ))}
                                  {cellShifts.length === 0 && (
                                    <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                      <Plus className="w-4 h-4 text-slate-300" />
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {viewMode === 'dayparts' && relevantDayparts.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                <p>Geen dagdelen gedefinieerd voor de geselecteerde afdeling(en).</p>
                <p className="text-sm mt-1">Configureer dagdelen bij de afdelingsinstellingen of schakel naar de simpele weergave.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ShiftDialog
        open={shiftDialogOpen}
        onClose={handleCloseShiftDialog}
        shift={selectedShift}
        scheduleId={scheduleId}
        employeeId={selectedEmployeeId}
        date={selectedDate}
        daypartId={selectedDaypartId}
        employees={relevantEmployees}
        departments={departments}
        dayparts={relevantDayparts}
        locations={locations}
        functions={functions}
        schedule={schedule}
      />
    </div>
  );
}