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
  Building2
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
  const { currentCompany, hasPermission, canUseAI } = useCompany();
  const companyId = currentCompany?.id;

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

  const activeSchedules = schedules.filter(s => s.status === 'published' || s.status === 'draft');
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Week Chart */}
            <WeekChart shifts={thisWeekShifts} weekStart={weekStart} />
            {/* Active Schedules */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Actieve roosters</CardTitle>
                  <Link to={createPageUrl('Schedules')}>
                    <Button variant="ghost" size="sm" className="text-blue-600">
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
                        to={createPageUrl('ScheduleEditor') + `?id=${schedule.id}`}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <CalendarDays className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{schedule.name}</p>
                            <p className="text-sm text-slate-500">
                              {format(parseISO(schedule.start_date), 'd MMM', { locale: nl })} - {format(parseISO(schedule.end_date), 'd MMM yyyy', { locale: nl })}
                            </p>
                          </div>
                        </div>
                        <Badge variant={schedule.status === 'published' ? 'default' : 'secondary'}>
                          {schedule.status === 'published' ? 'Gepubliceerd' : 'Concept'}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 mb-4">Nog geen roosters aangemaakt</p>
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

            {/* Subscription Status */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Abonnement</span>
                  <Badge style={{ backgroundColor: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: 'none' }}>
                    {currentCompany?.subscription_plan?.charAt(0).toUpperCase() + currentCompany?.subscription_plan?.slice(1)}
                  </Badge>
                </div>
                {currentCompany?.subscription_status === 'trial' && (
                  <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                    <p className="font-medium">Proefperiode actief</p>
                    <p className="text-xs mt-1" style={{ color: '#fcd34d' }}>
                      Verloopt op {currentCompany?.trial_ends_at ? format(parseISO(currentCompany.trial_ends_at), 'd MMMM yyyy', { locale: nl }) : 'Onbekend'}
                    </p>
                  </div>
                )}
                {hasPermission('manage_billing') && (
                  <Link to={createPageUrl('Billing')}>
                    <Button variant="outline" className="w-full mt-4" size="sm">
                      Beheer abonnement
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}