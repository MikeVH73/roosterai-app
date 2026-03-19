import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import {
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Building2,
  MessageCircle,
  Bot
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlowCard } from "@/components/ui/glow-card";
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import WeekChart from '@/components/dashboard/WeekChart';
import DepartmentDistribution from '@/components/dashboard/DepartmentDistribution';
import ActionItems from '@/components/dashboard/ActionItems';
import EmployeeWeekSchedule from '@/components/dashboard/EmployeeWeekSchedule';
import TrialCountdown from '@/components/dashboard/TrialCountdown';
import OnboardingGuide from '@/components/dashboard/OnboardingGuide';

function StatCard({ title, value, icon: Icon, trend, trendLabel, color }) {
  const iconColors = {
    blue: { bg: 'rgba(56,189,248,0.15)', color: '#38bdf8' },
    green: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' },
    purple: { bg: 'rgba(129,140,248,0.15)', color: '#818cf8' },
    orange: { bg: 'rgba(251,146,60,0.15)', color: '#fb923c' },
  };
  const ic = iconColors[color] || iconColors.blue;

  return (
    <GlowCard glowColor={color} className="shadow-sm">
      <Card className="border-0 shadow-none" style={{ backgroundColor: 'var(--color-surface)' }}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>{title}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
              {trend && (
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-3 h-3" style={{ color: '#4ade80' }} />
                  <span className="text-xs font-medium" style={{ color: '#4ade80' }}>{trend}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{trendLabel}</span>
                </div>
              )}
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: ic.bg }}>
              <Icon className="w-6 h-6" style={{ color: ic.color }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </GlowCard>
  );
}

export default function Dashboard() {
  const { currentCompany, hasPermission, canUseAI, user } = useCompany();
  const companyId = currentCompany?.id;
  const isEmployee = !hasPermission('manage_schedules');

  // My employee profile
  const { data: myProfile } = useQuery({
    queryKey: ['my-profile', companyId, user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.EmployeeProfile.filter({ companyId, email: user?.email });
      return profiles[0] || null;
    },
    enabled: !!companyId && !!user?.email
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => base44.entities.EmployeeProfile.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', companyId],
    queryFn: () => base44.entities.Department.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  // Fetch schedules
  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => base44.entities.Schedule.filter({ companyId }),
    enabled: !!companyId
  });

  // Fetch shifts for this week
  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', companyId, 'week'],
    queryFn: () => base44.entities.Shift.filter({ companyId }),
    enabled: !!companyId
  });

  // Fetch vacation requests
  const { data: vacationRequests = [] } = useQuery({
    queryKey: ['vacation-requests', companyId],
    queryFn: () => base44.entities.VacationRequest.filter({ companyId, status: 'pending' }),
    enabled: !!companyId
  });

  // Fetch swap requests
  const { data: swapRequests = [] } = useQuery({
    queryKey: ['swap-requests', companyId],
    queryFn: () => base44.entities.SwapRequest.filter({ companyId, status: 'pending' }),
    enabled: !!companyId
  });

  // Fetch AI suggestions
  const { data: aiSuggestions = [] } = useQuery({
    queryKey: ['ai-suggestions', companyId],
    queryFn: () => base44.entities.AISuggestion.filter({ companyId, status: 'pending' }),
    enabled: !!companyId
  });

  // Fetch functions (for onboarding guide)
  const { data: functions = [] } = useQuery({
    queryKey: ['functions', companyId],
    queryFn: () => base44.entities.Function.filter({ companyId }),
    enabled: !!companyId
  });

  // Fetch locations (for admin onboarding guide too)
  const { data: allLocations = [] } = useQuery({
    queryKey: ['all-locations', companyId],
    queryFn: () => base44.entities.Location.filter({ companyId }),
    enabled: !!companyId && !isEmployee
  });

  // Fetch locations for employee week schedule
  const { data: locations = [] } = useQuery({
    queryKey: ['locations', companyId],
    queryFn: () => base44.entities.Location.filter({ companyId }),
    enabled: !!companyId && isEmployee
  });

  // Fetch dayparts for employee week schedule
  const { data: dayparts = [] } = useQuery({
    queryKey: ['dayparts', companyId],
    queryFn: () => base44.entities.DepartmentDaypart.filter({ companyId }),
    enabled: !!companyId && isEmployee
  });

  // All shifts for the employee (not just this week, for the week navigator)
  const { data: allMyShifts = [] } = useQuery({
    queryKey: ['my-all-shifts', companyId, myProfile?.id],
    queryFn: () => base44.entities.Shift.filter({ companyId, employeeId: myProfile.id }),
    enabled: !!companyId && !!myProfile?.id && isEmployee
  });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const thisWeekShifts = shifts.filter(shift => {
    try {
      const shiftDate = parseISO(shift.date);
      return isWithinInterval(shiftDate, { start: weekStart, end: weekEnd });
    } catch {
      return false;
    }
  });

  // For employees: filter to only their own shifts and schedules
  const myShiftsThisWeek = isEmployee
    ? thisWeekShifts.filter(s => s.employeeId === myProfile?.id)
    : thisWeekShifts;

  const activeSchedules = schedules.filter(s => {
    if (s.status !== 'published' && s.status !== 'draft') return false;
    if (isEmployee && myProfile) {
      // Only show schedules that contain shifts for this employee
      return shifts.some(shift => shift.scheduleId === s.id && shift.employeeId === myProfile.id);
    }
    return true;
  });

  const pendingRequests = vacationRequests.length + swapRequests.length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopBar 
        title="Dashboard" 
        subtitle={format(new Date(), "EEEE d MMMM yyyy", { locale: nl })}
      />

      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {isEmployee ? (
            <>
              <StatCard
                title="Mijn diensten deze week"
                value={myShiftsThisWeek.length}
                icon={Calendar}
                color="green"
              />
              <StatCard
                title="Mijn verlofaanvragen"
                value={vacationRequests.filter(r => r.employeeId === myProfile?.id).length}
                icon={Clock}
                color="orange"
              />
            </>
          ) : (
            <>
              <StatCard
                title="Actieve medewerkers"
                value={employees.length}
                icon={Users}
                color="blue"
              />
              <StatCard
                title="Diensten deze week"
                value={thisWeekShifts.length}
                icon={Calendar}
                color="green"
              />
              <StatCard
                title="Openstaande verzoeken"
                value={pendingRequests}
                icon={Clock}
                color="orange"
              />
              <StatCard
                title="AI Suggesties"
                value={aiSuggestions.length}
                icon={Sparkles}
                color="purple"
              />
            </>
          )}
        </div>

        {/* Onboarding Guide - only for admins/planners when app is not fully set up */}
        {!isEmployee && (
          <div className="mb-6">
            <OnboardingGuide
              departments={departments}
              locations={allLocations}
              employees={employees}
              schedules={schedules}
              functions={functions}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Employee Week Schedule */}
            {isEmployee && (
              <EmployeeWeekSchedule 
                shifts={allMyShifts} 
                locations={locations} 
                departments={departments}
                dayparts={dayparts}
              />
            )}
            {/* Week Chart */}
            <WeekChart shifts={myShiftsThisWeek} weekStart={weekStart} />
            {/* Active Schedules */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Actieve roosters</CardTitle>
                  <Link to={createPageUrl('Schedules')}>
                    <Button variant="ghost" size="sm" style={{ color: '#38bdf8' }}>
                      Alle roosters
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {activeSchedules.length > 0 ? (
                  <div className="space-y-3">
                    {activeSchedules.slice(0, 3).map((schedule) => (
                      <Link 
                        key={schedule.id} 
                        to={isEmployee ? createPageUrl('ScheduleOverview') : createPageUrl('ScheduleEditor') + `?id=${schedule.id}`}
                        className="flex items-center justify-between p-4 rounded-xl transition-colors"
                        style={{ backgroundColor: 'var(--color-surface-light)' }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(56,189,248,0.15)' }}>
                            <CalendarDays className="w-5 h-5" style={{ color: '#38bdf8' }} />
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{schedule.name}</p>
                            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                              {format(parseISO(schedule.start_date), 'd MMM', { locale: nl })} - {format(parseISO(schedule.end_date), 'd MMM yyyy', { locale: nl })}
                            </p>
                          </div>
                        </div>
                        <Badge style={schedule.status === 'published'
                          ? { backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80', border: 'none' }
                          : { backgroundColor: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: 'none' }
                        }>
                          {schedule.status === 'published' ? 'Gepubliceerd' : 'Concept'}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarDays className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
                    <p className="mb-4" style={{ color: 'var(--color-text-muted)' }}>Nog geen roosters aangemaakt</p>
                    <Link to={createPageUrl('Schedules')}>
                      <Button size="sm">Eerste rooster maken</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Items */}
            {hasPermission('manage_requests') && (
              <ActionItems
                vacationRequests={vacationRequests}
                swapRequests={swapRequests}
                aiSuggestions={aiSuggestions}
              />
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Department Distribution */}
            {departments.length > 0 && (
              <DepartmentDistribution employees={employees} departments={departments} />
            )}

            {/* AI Assistent voor medewerkers */}
            {isEmployee && (
              <Link to={createPageUrl('MijnBerichten')}>
                <div className="rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)' }}>
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Planning Assistent</h3>
                    <p className="text-xs text-white/80">Stel vragen over je rooster of diensten</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/60 ml-auto" />
                </div>
              </Link>
            )}

            {/* WhatsApp AI Koppelen - alleen voor medewerkers */}
            {isEmployee && (
              <Card className="border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">WhatsApp Planning Assistent</h3>
                      <p className="text-sm text-white/80">Stel vragen via WhatsApp</p>
                    </div>
                  </div>
                  <p className="text-sm text-white/90 mb-4">
                    Koppel WhatsApp om je rooster op te vragen, diensten te ruilen of verlof aan te vragen — direct via je telefoon.
                  </p>
                  {myProfile?.whatsapp_opt_in ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-white/20">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span className="text-sm text-white font-medium flex-1">WhatsApp is gekoppeld</span>
                      </div>
                      <button
                        onClick={async () => {
                          if (myProfile) {
                            await base44.entities.EmployeeProfile.update(myProfile.id, { whatsapp_opt_in: false });
                            window.location.reload();
                          }
                        }}
                        className="w-full text-xs text-white/70 hover:text-white underline text-center py-1"
                      >
                        WhatsApp ontkoppelen
                      </button>
                    </div>
                  ) : (
                    <a
                      href={base44.agents.getWhatsAppConnectURL('planning_assistent')}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="w-full bg-white text-green-700 hover:bg-white/90 font-semibold">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Koppel WhatsApp
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* AI Assistant Card */}
            {hasPermission('use_ai') && (
              <Card className="border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)' }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">AI Assistent</h3>
                      <p className="text-sm text-white/80">Slimme roosterondersteuning</p>
                    </div>
                  </div>
                  <p className="text-sm text-white/90 mb-4">
                    Laat AI je helpen met vervangers zoeken, conflicten oplossen en roosters optimaliseren.
                  </p>
                  <Link to={createPageUrl('AIAssistant')}>
                    <Button className="w-full bg-white text-cyan-600 hover:bg-white/90">
                      Open AI Assistent
                    </Button>
                  </Link>
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/80">AI acties deze maand</span>
                      <span className="font-medium">
                        {currentCompany?.ai_actions_used || 0} / {currentCompany?.ai_actions_limit || 300}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Organisatie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                      <Building2 className="w-4 h-4" />
                      <span className="text-sm">Afdelingen</span>
                    </div>
                    <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{departments.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Medewerkers</span>
                    </div>
                    <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{employees.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Roosters</span>
                    </div>
                    <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{schedules.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription / Trial Countdown */}
            <TrialCountdown company={currentCompany} hasManageBilling={hasPermission('manage_billing')} />
          </div>
        </div>
      </div>
    </div>
  );
}