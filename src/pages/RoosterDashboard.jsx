import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TimelineViewGrid from '@/components/schedules/TimelineViewGrid';
import MiniCalendar from '@/components/schedules/MiniCalendar';
import ShiftDialog from '@/components/schedules/ShiftDialog';
import {
  Calendar,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Users,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Menu,
  X,
  Maximize2,
  Minimize2,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  CalendarDays,
  Copy,
  Send,
  Archive,
  Eye,
  Eraser,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parseISO, differenceInDays, startOfWeek, addDays, addWeeks, startOfMonth, endOfMonth } from 'date-fns';
import { nl } from 'date-fns/locale';

function calculateNetHours(shift) {
  const [startH, startM] = shift.start_time.split(':').map(Number);
  const [endH, endM] = shift.end_time.split(':').map(Number);
  let hours = (endH * 60 + endM - startH * 60 - startM) / 60;
  if (hours < 0) hours += 24;
  const breakHours = (shift.break_duration || 0) / 60;
  return hours - breakHours;
}

const statusConfig = {
  draft: { label: 'Concept', color: 'bg-slate-100 text-slate-700' },
  published: { label: 'Gepubliceerd', color: 'bg-green-100 text-green-700' },
  archived: { label: 'Gearchiveerd', color: 'bg-gray-100 text-gray-500' }
};

export default function RoosterDashboard() {
  const navigate = useNavigate();
  const { currentCompany, hasPermission } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  // --- Kaarten sectie state ---
  const [cardsCollapsed, setCardsCollapsed] = useState(true);

  // --- Weekoverzicht state ---
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [visibleDays, setVisibleDays] = useState([1, 2, 3, 4, 5, 6, 0]);
  const [miniCalendarOpen, setMiniCalendarOpen] = useState(false);
  const [fullscreenSchedule, setFullscreenSchedule] = useState(null);

  // --- Shift dialog state ---
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedDaypartId, setSelectedDaypartId] = useState(null);
  const [currentScheduleId, setCurrentScheduleId] = useState(null);

  // --- Rooster bewerken dialog state ---
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({});

  // --- Data fetching ---
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

  // --- Mutations ---
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Schedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules', companyId]);
      setEditDialogOpen(false);
      setEditingSchedule(null);
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Schedule.create(data),
    onSuccess: (newSchedule) => {
      queryClient.invalidateQueries(['schedules', companyId]);
      setEditDialogOpen(false);
      navigate(createPageUrl('ScheduleEditor') + `?id=${newSchedule.id}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Schedule.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['schedules', companyId])
  });

  // --- Computed ---
  const activeSchedules = schedules.filter(s => s.status !== 'archived');
  const publishedSchedules = activeSchedules.filter(s => s.status === 'published');
  const draftSchedules = activeSchedules.filter(s => s.status === 'draft');

  const sortedSchedules = [...schedules].sort((a, b) => {
    const statusOrder = { draft: 0, published: 1, archived: 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status];
    return new Date(b.start_date) - new Date(a.start_date);
  });

  const scheduleConflicts = useMemo(() => {
    const conflicts = {};
    schedules.forEach(schedule => {
      const scheduleShifts = allShifts.filter(s => s.scheduleId === schedule.id);
      if (scheduleShifts.length === 0) { conflicts[schedule.id] = false; return; }
      const startDate = parseISO(schedule.start_date);
      const endDate = parseISO(schedule.end_date);
      let hasIssues = false;
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const dayOfWeek = currentDate.getDay();
        dayparts.forEach(dp => {
          const requirements = staffingRequirements.filter(r =>
            r.daypartId === dp.id &&
            (r.specific_date === dateStr || r.day_of_week === dayOfWeek) &&
            (r.targetHours || 0) > 0
          );
          if (requirements.length > 0) {
            const targetHours = requirements.reduce((sum, r) => sum + (r.targetHours || 0), 0);
            const scheduledHours = scheduleShifts
              .filter(s => s.date === dateStr && s.daypartId === dp.id)
              .reduce((sum, s) => sum + calculateNetHours(s), 0);
            if ((scheduledHours / targetHours) * 100 < 80) hasIssues = true;
          }
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      conflicts[schedule.id] = hasIssues;
    });
    return conflicts;
  }, [schedules, allShifts, staffingRequirements, dayparts]);

  const getShiftCount = (scheduleId) => allShifts.filter(s => s.scheduleId === scheduleId).length;
  const getDepartmentNames = (ids) => {
    if (!ids?.length) return 'Alle afdelingen';
    return ids.map(id => departments.find(d => d.id === id)?.name).filter(Boolean).join(', ');
  };

  // --- Edit dialog handlers ---
  const handleOpenEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name || '',
      description: schedule.description || '',
      start_date: schedule.start_date || '',
      end_date: schedule.end_date || '',
      departmentIds: schedule.departmentIds || [],
      locationIds: schedule.locationIds || [],
      status: schedule.status || 'draft',
      default_view_mode: schedule.default_view_mode || 'dayparts',
      timeline_start_time: schedule.timeline_start_time || '07:00',
      timeline_end_time: schedule.timeline_end_time || '17:00',
      active_days: schedule.active_days || [1, 2, 3, 4, 5],
    });
    setEditDialogOpen(true);
  };

  const handleOpenNew = () => {
    setEditingSchedule(null);
    const today = new Date();
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7);
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    setFormData({
      name: `Week ${format(nextMonday, 'w yyyy', { locale: nl })}`,
      description: '',
      start_date: format(nextMonday, 'yyyy-MM-dd'),
      end_date: format(nextSunday, 'yyyy-MM-dd'),
      departmentIds: [],
      locationIds: [],
      status: 'draft',
      default_view_mode: 'dayparts',
      timeline_start_time: '07:00',
      timeline_end_time: '17:00',
      active_days: [1, 2, 3, 4, 5],
    });
    setEditDialogOpen(true);
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    const submitData = { ...formData, companyId };
    if (editingSchedule) {
      await updateMutation.mutateAsync({ id: editingSchedule.id, data: submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  const toggleDepartment = (deptId) => setFormData(prev => ({
    ...prev,
    departmentIds: prev.departmentIds.includes(deptId)
      ? prev.departmentIds.filter(id => id !== deptId)
      : [...prev.departmentIds, deptId]
  }));

  const toggleLocation = (locId) => setFormData(prev => ({
    ...prev,
    locationIds: prev.locationIds.includes(locId)
      ? prev.locationIds.filter(id => id !== locId)
      : [...prev.locationIds, locId]
  }));

  const handleDelete = async (schedule) => {
    if (window.confirm(`Weet je zeker dat je "${schedule.name}" wilt verwijderen?`)) {
      if (selectedScheduleId === schedule.id) setSelectedScheduleId(null);
      await deleteMutation.mutateAsync(schedule.id);
    }
  };

  const handlePublish = async (schedule) => {
    await updateMutation.mutateAsync({ id: schedule.id, data: { status: 'published', published_at: new Date().toISOString() } });
  };

  const handleArchive = async (schedule) => {
    await updateMutation.mutateAsync({ id: schedule.id, data: { status: 'archived' } });
  };

  const handleClearShifts = async (schedule) => {
    const shiftCount = getShiftCount(schedule.id);
    if (!window.confirm(`Weet je zeker dat je alle ${shiftCount} diensten wilt verwijderen?`)) return;
    const scheduleShifts = allShifts.filter(s => s.scheduleId === schedule.id);
    await Promise.all(scheduleShifts.map(s => base44.entities.Shift.delete(s.id)));
    queryClient.invalidateQueries(['all-shifts', companyId]);
  };

  const handleDuplicate = async (schedule) => {
    const today = new Date();
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7);
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    await createMutation.mutateAsync({
      ...schedule,
      id: undefined,
      name: `${schedule.name} (kopie)`,
      start_date: format(nextMonday, 'yyyy-MM-dd'),
      end_date: format(nextSunday, 'yyyy-MM-dd'),
      status: 'draft',
      published_at: null,
      published_by: null,
      companyId
    });
  };

  // --- Shift dialog handlers ---
  const handleCloseShiftDialog = () => {
    setShiftDialogOpen(false);
    setSelectedShift(null);
    setSelectedEmployeeId(null);
    setSelectedDate(null);
    setSelectedDaypartId(null);
    setCurrentScheduleId(null);
  };

  // --- Week navigation ---
  const handlePrev = () => setCurrentWeekStart(addWeeks(currentWeekStart, -1));
  const handleNext = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const getWeekLabel = () => `Week ${format(currentWeekStart, 'w', { locale: nl })}`;

  const toggleDay = (dayIndex) => {
    if (visibleDays.includes(dayIndex)) {
      if (visibleDays.length > 1) setVisibleDays(visibleDays.filter(d => d !== dayIndex));
    } else {
      setVisibleDays([...visibleDays, dayIndex].sort());
    }
  };

  const dayNamesFull = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const currentSchedule = activeSchedules.find(s => s.id === (selectedScheduleId || activeSchedules[0]?.id));

  const weekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = currentSchedule
    ? [0, 1, 2, 3, 4, 5, 6]
        .map(i => addDays(weekStart, i))
        .filter(day => visibleDays.includes(day.getDay()))
        .filter(day => {
          const s = parseISO(currentSchedule.start_date);
          const e = parseISO(currentSchedule.end_date);
          return day >= s && day <= e;
        })
    : [];

  if (schedulesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--color-background)', minHeight: '100vh' }}>
      <div className="p-6 space-y-4">

        {/* === STATS BAR === */}
        <div className="flex items-center justify-between px-5 py-3 rounded-lg shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', border: '1px solid var(--color-border)' }}>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Rooster Dashboard</h1>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{activeSchedules.length} actieve roosters</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: '#22c55e' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Gepubliceerd</p>
                <p className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>{publishedSchedules.length}</p>
              </div>
            </div>
            <div className="w-px h-8" style={{ backgroundColor: 'var(--color-border)' }} />
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: '#94a3b8' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Concepten</p>
                <p className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>{draftSchedules.length}</p>
              </div>
            </div>
            <div className="w-px h-8" style={{ backgroundColor: 'var(--color-border)' }} />
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Medewerkers</p>
                <p className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>{employees.length}</p>
              </div>
            </div>
            {hasPermission('manage_schedules') && (
              <>
                <div className="w-px h-8" style={{ backgroundColor: 'var(--color-border)' }} />
                <Button size="sm" onClick={handleOpenNew} style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)', color: 'white' }}>
                  <Plus className="w-4 h-4 mr-1" />
                  Nieuw rooster
                </Button>
              </>
            )}
          </div>
        </div>

        {/* === ROOSTERKAARTEN (inklapbaar) === */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.5rem' }}>
          {/* Header van de kaarten sectie */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Alle Roosters ({sortedSchedules.length})
            </span>
            <button
              onClick={() => setCardsCollapsed(!cardsCollapsed)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all hover:brightness-110"
              style={{
                backgroundColor: cardsCollapsed ? 'var(--color-accent)' : 'var(--color-surface-light)',
                color: cardsCollapsed ? 'white' : 'var(--color-text-secondary)',
                border: cardsCollapsed ? 'none' : '1px solid var(--color-border)',
              }}
            >
              {cardsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              {cardsCollapsed ? 'Uitklappen' : 'Inklappen'}
            </button>
          </div>

          {!cardsCollapsed && (
            <div className="px-4 pb-4">
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                {sortedSchedules.map((schedule) => {
                  const days = differenceInDays(parseISO(schedule.end_date), parseISO(schedule.start_date)) + 1;
                  const shiftCount = getShiftCount(schedule.id);
                  const hasConflicts = scheduleConflicts[schedule.id];
                  const isSelected = (selectedScheduleId || activeSchedules[0]?.id) === schedule.id;

                  return (
                    <div
                      key={schedule.id}
                      onClick={() => schedule.status !== 'archived' && setSelectedScheduleId(schedule.id)}
                      className="flex-shrink-0 w-56 rounded-lg p-4 cursor-pointer transition-all"
                      style={{
                        backgroundColor: isSelected ? 'rgba(56,189,248,0.08)' : 'var(--color-surface-light)',
                        border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {hasConflicts && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                          <CalendarDays className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
                          <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{schedule.name}</span>
                        </div>
                        {hasPermission('manage_schedules') && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => navigate(`/PlanningTool?scheduleId=${schedule.id}&returnTo=RoosterDashboard`)}>
                                 <LayoutGrid className="w-4 h-4 mr-2" /> Openen in Planner
                               </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEdit(schedule)}>
                                <Edit className="w-4 h-4 mr-2" /> Bewerken
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(schedule)}>
                                <Copy className="w-4 h-4 mr-2" /> Dupliceren
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {schedule.status === 'draft' && (
                                <DropdownMenuItem onClick={() => handlePublish(schedule)}>
                                  <Send className="w-4 h-4 mr-2" /> Publiceren
                                </DropdownMenuItem>
                              )}
                              {schedule.status !== 'archived' && (
                                <DropdownMenuItem onClick={() => handleArchive(schedule)}>
                                  <Archive className="w-4 h-4 mr-2" /> Archiveren
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleClearShifts(schedule)} className="text-orange-600">
                                <Eraser className="w-4 h-4 mr-2" /> Rooster leegmaken
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(schedule)} className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" /> Verwijderen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      <Badge className={`text-[10px] px-1.5 py-0 ${statusConfig[schedule.status].color}`}>
                        {statusConfig[schedule.status].label}
                      </Badge>

                      <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                        {format(parseISO(schedule.start_date), 'd MMM', { locale: nl })} – {format(parseISO(schedule.end_date), 'd MMM yyyy', { locale: nl })}
                        <span className="ml-1" style={{ color: 'var(--color-text-muted)' }}>({days}d)</span>
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{getDepartmentNames(schedule.departmentIds)}</p>

                      <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{shiftCount} diensten</span>
                        {hasPermission('manage_schedules') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(schedule); }}
                            className="text-xs font-medium hover:opacity-70 transition-opacity"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            Bewerken
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* === WEEKOVERZICHT === */}
        {activeSchedules.length === 0 ? (
          <div className="p-12 text-center rounded-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
            <h3 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Nog geen roosters</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>Maak je eerste rooster aan om te beginnen.</p>
            {hasPermission('manage_schedules') && (
              <Button onClick={handleOpenNew}>
                <Plus className="w-4 h-4 mr-2" />Eerste rooster maken
              </Button>
            )}
          </div>
        ) : currentSchedule ? (
          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.5rem' }}>
            {/* Rooster tabs */}
            <div className="px-4 pt-4 overflow-x-auto" style={{ background: 'linear-gradient(to bottom, var(--color-surface-light), var(--color-surface))' }}>
              <div className="flex gap-2">
                {activeSchedules.map(schedule => {
                  const isActive = (selectedScheduleId || activeSchedules[0]?.id) === schedule.id;
                  const hasConflicts = scheduleConflicts[schedule.id];
                  return (
                    <button
                      key={schedule.id}
                      onClick={() => setSelectedScheduleId(schedule.id)}
                      className="relative min-w-[160px] px-4 py-2.5 rounded-t-lg font-medium text-sm transition-all"
                      style={isActive ? {
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text-primary)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        zIndex: 10,
                        marginBottom: '-1px',
                      } : {
                        backgroundColor: 'var(--color-surface-light)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-1.5">
                          {hasConflicts && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                          <span className="truncate">{schedule.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className="text-[10px] px-1.5 py-0"
                            style={{
                              backgroundColor: schedule.status === 'published' ? 'rgba(34,197,94,0.2)' : 'rgba(148,163,184,0.2)',
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
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: 'linear-gradient(to right, var(--color-accent), var(--color-accent-light))' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Weekweergave controls + grid */}
            <div className="p-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              {/* Mini kalender toggle */}
              {!miniCalendarOpen && (
                <Button variant="outline" size="sm" onClick={() => setMiniCalendarOpen(true)} className="mb-3 h-7 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-surface)' }}>
                  <Menu className="w-3.5 h-3.5 mr-1.5" />Toon kalender
                </Button>
              )}

              {miniCalendarOpen && (
                <>
                  <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMiniCalendarOpen(false)} />
                  <div className="fixed left-0 top-0 bottom-0 w-72 p-6 z-50 shadow-2xl" style={{ backgroundColor: 'var(--color-surface)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Kalender</h3>
                      <Button variant="ghost" size="sm" onClick={() => setMiniCalendarOpen(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <MiniCalendar
                      selectedDate={currentWeekStart}
                      onDateSelect={(date) => { setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 1 })); setMiniCalendarOpen(false); }}
                    />
                  </div>
                </>
              )}

              {/* Navigatie controls */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ backgroundColor: 'var(--color-surface-light)' }}>
                    <Button variant="ghost" size="sm" onClick={handlePrev} className="h-7 w-7 p-0" style={{ color: 'var(--color-text-secondary)' }}>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-xs font-medium px-3 min-w-[110px] text-center" style={{ color: 'var(--color-text-primary)' }}>
                      {getWeekLabel()}
                    </span>
                    <Button variant="ghost" size="sm" onClick={handleNext} className="h-7 w-7 p-0" style={{ color: 'var(--color-text-secondary)' }}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-surface)' }}>
                        <Settings2 className="w-3 h-3 mr-1" />Dagen ({visibleDays.length})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel className="text-xs">Zichtbare dagen</DropdownMenuLabel>
                      {[1, 2, 3, 4, 5, 6, 0].map((dayIdx, i) => (
                        <DropdownMenuCheckboxItem key={dayIdx} checked={visibleDays.includes(dayIdx)} onCheckedChange={() => toggleDay(dayIdx)}>
                          {dayNamesFull[i]}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setFullscreenSchedule(fullscreenSchedule === currentSchedule.id ? null : currentSchedule.id)}
                    className="h-7 w-7 p-0"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-surface)' }}
                  >
                    {fullscreenSchedule === currentSchedule.id ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </Button>
                  {hasPermission('manage_schedules') && (
                    <Button size="sm" className="h-7 px-3 text-xs" onClick={() => navigate(`/PlanningTool?scheduleId=${currentSchedule.id}&weekStart=${format(currentWeekStart, 'yyyy-MM-dd')}&returnTo=RoosterDashboard`)} style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)', color: 'white' }}>
                      <LayoutGrid className="w-3 h-3 mr-1" />
                      Openen in Planner
                    </Button>
                  )}
                </div>
              </div>

              {/* Tijdlijn grid */}
              {weekDays.length === 0 ? (
                <div className="p-10 text-center" style={{ color: 'var(--color-text-muted)' }}>
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Geen dagen in deze periode voor dit rooster</p>
                </div>
              ) : (
                <div className={fullscreenSchedule === currentSchedule.id ? "fixed inset-0 z-50 p-6 overflow-auto" : ""} style={fullscreenSchedule === currentSchedule.id ? { backgroundColor: 'var(--color-background)' } : {}}>
                  {fullscreenSchedule === currentSchedule.id && (
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => setFullscreenSchedule(null)}
                        className="h-8 px-3 text-xs gap-1.5"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-surface)' }}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Terug naar dashboard
                      </Button>
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{currentSchedule.name}</span>
                    </div>
                  )}
                  <TimelineViewGrid
                    schedule={currentSchedule}
                    shifts={allShifts.filter(s => s.scheduleId === currentSchedule.id)}
                    locations={locations}
                    departments={departments}
                    employees={employees}
                    functions={functions}
                    dayparts={dayparts}
                    currentWeekStart={currentWeekStart}
                    activeDays={currentSchedule?.active_days || [0, 1, 2, 3, 4, 5, 6]}
                    onDepartmentPlan={(deptId) => navigate(`/PlanningTool?departmentId=${deptId}&weekStart=${format(currentWeekStart, 'yyyy-MM-dd')}&scheduleId=${currentSchedule.id}&returnTo=RoosterDashboard`)}
                    onDepartmentEdit={(deptId) => { const s = currentSchedule; handleOpenEdit(s); }}
                    onDepartmentDuplicate={(_deptId) => handleDuplicate(currentSchedule)}
                    onDepartmentArchive={(_deptId) => handleArchive(currentSchedule)}
                    onDepartmentClearShifts={(_deptId) => handleClearShifts(currentSchedule)}
                    onDepartmentDelete={(_deptId) => handleDelete(currentSchedule)}
                    onShiftClick={(shift) => {
                      if (!hasPermission('manage_schedules')) return;
                      setSelectedShift(shift);
                      setSelectedEmployeeId(shift.employeeId);
                      setSelectedDate(shift.date);
                      setSelectedDaypartId(shift.daypartId);
                      setCurrentScheduleId(currentSchedule.id);
                      setShiftDialogOpen(true);
                    }}
                    onShiftUpdate={() => queryClient.invalidateQueries(['all-shifts', companyId])}
                    onCellClick={(locationId, date, departmentId, startTime) => {
                      if (!hasPermission('manage_schedules')) return;
                      setSelectedShift(startTime ? { start_time: startTime } : null);
                      setSelectedEmployeeId(null);
                      setSelectedDate(format(date, 'yyyy-MM-dd'));
                      setSelectedDaypartId(null);
                      setCurrentScheduleId(currentSchedule.id);
                      setShiftDialogOpen(true);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* === SHIFT DIALOG === */}
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

      {/* === ROOSTER BEWERKEN/AANMAKEN DIALOG (POP-UP) === */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) { setEditDialogOpen(false); setEditingSchedule(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-primary)'
        }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--color-text-primary)' }}>
              {editingSchedule ? 'Rooster bewerken' : 'Nieuw rooster'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div>
              <Label style={{ color: 'var(--color-text-primary)' }}>Naam *</Label>
              <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>

            <div>
              <Label style={{ color: 'var(--color-text-primary)' }}>Beschrijving</Label>
              <Input value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label style={{ color: 'var(--color-text-primary)' }}>Startdatum *</Label>
                <Input type="date" value={formData.start_date || ''} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
              </div>
              <div>
                <Label style={{ color: 'var(--color-text-primary)' }}>Einddatum *</Label>
                <Input type="date" value={formData.end_date || ''} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required />
              </div>
            </div>

            {departments.length > 0 && (
              <div>
                <Label style={{ color: 'var(--color-text-primary)' }}>Afdelingen (leeg = alle)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {departments.map((dept) => (
                    <div key={dept.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dept-${dept.id}`}
                        checked={(formData.departmentIds || []).includes(dept.id)}
                        onCheckedChange={() => toggleDepartment(dept.id)}
                      />
                      <Label htmlFor={`dept-${dept.id}`} className="text-sm font-normal cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>{dept.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {locations.length > 0 && (
              <div>
                <Label style={{ color: 'var(--color-text-primary)' }}>Locaties (leeg = alle)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {locations.map((loc) => (
                    <div key={loc.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`loc-${loc.id}`}
                        checked={(formData.locationIds || []).includes(loc.id)}
                        onCheckedChange={() => toggleLocation(loc.id)}
                      />
                      <Label htmlFor={`loc-${loc.id}`} className="text-sm font-normal cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>{loc.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label style={{ color: 'var(--color-text-primary)' }}>Standaard weergave</Label>
              <Select value={formData.default_view_mode || 'dayparts'} onValueChange={(v) => setFormData({ ...formData, default_view_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dayparts">Dagdelen</SelectItem>
                  <SelectItem value="simple">Simpel</SelectItem>
                  <SelectItem value="timeline">Tijdlijn (Horizontaal)</SelectItem>
                  <SelectItem value="vertical-timeline">Tijdlijn (Verticaal)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label style={{ color: 'var(--color-text-primary)' }}>Actieve dagen</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'].map((dayName, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${index}`}
                      checked={(formData.active_days || []).includes(index)}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({
                          ...prev,
                          active_days: checked
                            ? [...(prev.active_days || []), index].sort((a, b) => a - b)
                            : (prev.active_days || []).filter(d => d !== index)
                        }));
                      }}
                    />
                    <Label htmlFor={`day-${index}`} className="text-sm font-normal cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>{dayName}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label style={{ color: 'var(--color-text-primary)' }}>Tijdlijn starttijd</Label>
                <Input type="time" value={formData.timeline_start_time || '07:00'} onChange={(e) => setFormData({ ...formData, timeline_start_time: e.target.value })} />
              </div>
              <div>
                <Label style={{ color: 'var(--color-text-primary)' }}>Tijdlijn eindtijd</Label>
                <Input type="time" value={formData.timeline_end_time || '17:00'} onChange={(e) => setFormData({ ...formData, timeline_end_time: e.target.value })} />
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>De tijdlijn toont alleen diensten tussen deze tijden</p>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setEditDialogOpen(false); setEditingSchedule(null); }} style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                Annuleren
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingSchedule ? 'Opslaan' : 'Aanmaken'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}