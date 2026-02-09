import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import { 
  Calendar,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Users,
  Clock
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
                <div className="border-b border-slate-200 px-4 pt-4 overflow-x-auto">
                  <TabsList className="bg-transparent">
                    {activeSchedules.map(schedule => {
                      const hasConflicts = scheduleConflicts[schedule.id];
                      return (
                        <TabsTrigger 
                          key={schedule.id} 
                          value={schedule.id}
                          className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        >
                          {hasConflicts && (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                          {schedule.name}
                          <Badge className={statusConfig[schedule.status].color}>
                            {statusConfig[schedule.status].label}
                          </Badge>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>

                {activeSchedules.map(schedule => {
                  const stats = getScheduleStats(schedule);
                  const hasConflicts = scheduleConflicts[schedule.id];
                  
                  return (
                    <div key={schedule.id} className={selectedScheduleId === schedule.id || (!selectedScheduleId && schedule === activeSchedules[0]) ? 'block' : 'hidden'}>
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-6">
                          <div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">{schedule.name}</h3>
                            <p className="text-slate-500">
                              {format(parseISO(schedule.start_date), 'd MMMM', { locale: nl })} - {format(parseISO(schedule.end_date), 'd MMMM yyyy', { locale: nl })}
                            </p>
                            {schedule.description && (
                              <p className="text-sm text-slate-600 mt-2">{schedule.description}</p>
                            )}
                          </div>
                          <Button 
                            onClick={() => navigate(createPageUrl('ScheduleEditor') + `?id=${schedule.id}`)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Open rooster
                          </Button>
                        </div>

                        {hasConflicts && (
                          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-red-900 mb-1">Bezettingsproblemen gedetecteerd</h4>
                              <p className="text-sm text-red-700">
                                Dit rooster heeft dagen waar de bezetting significant onder of boven de norm ligt. 
                                Bekijk het rooster voor details of gebruik de AI Assistent voor suggesties.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-2 text-slate-600 mb-1">
                              <Clock className="w-4 h-4" />
                              <span className="text-sm">Totaal uren</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{stats.totalHours.toFixed(0)}</p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-2 text-slate-600 mb-1">
                              <Users className="w-4 h-4" />
                              <span className="text-sm">Medewerkers</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{stats.employeeCount}</p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-2 text-slate-600 mb-1">
                              <Calendar className="w-4 h-4" />
                              <span className="text-sm">Diensten</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{stats.shiftCount}</p>
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
    </div>
  );
}