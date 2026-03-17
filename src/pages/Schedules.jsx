import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  CalendarDays,
  Copy,
  Send,
  Archive,
  Loader2,
  Eye,
  Eraser
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GlowCard } from "@/components/ui/glow-card";
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
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parseISO, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function Schedules() {
  const navigate = useNavigate();
  const { currentCompany, hasPermission } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    departmentIds: [],
    locationIds: [],
    status: 'draft',
    default_view_mode: 'dayparts'
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => base44.entities.Schedule.filter({ companyId }),
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

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', companyId],
    queryFn: () => base44.entities.Shift.filter({ companyId }),
    enabled: !!companyId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Schedule.create(data),
    onSuccess: (newSchedule) => {
      queryClient.invalidateQueries(['schedules', companyId]);
      handleCloseDialog();
      navigate(createPageUrl('ScheduleEditor') + `?id=${newSchedule.id}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Schedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules', companyId]);
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Schedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules', companyId]);
    }
  });

  const handleOpenDialog = (schedule = null) => {
    if (schedule) {
      setSelectedSchedule(schedule);
      setFormData({
        name: schedule.name || '',
        description: schedule.description || '',
        start_date: schedule.start_date || '',
        end_date: schedule.end_date || '',
        departmentIds: schedule.departmentIds || [],
        locationIds: schedule.locationIds || [],
        status: schedule.status || 'draft',
        default_view_mode: schedule.default_view_mode || 'dayparts',
        timeline_start_time: schedule.timeline_start_time || '06:00',
        timeline_end_time: schedule.timeline_end_time || '06:00',
        active_days: schedule.active_days || [0, 1, 2, 3, 4, 5, 6]
      });
    } else {
      setSelectedSchedule(null);
      // Default to next week
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
        timeline_start_time: '06:00',
        timeline_end_time: '06:00',
        active_days: [1, 2, 3, 4, 5]
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedSchedule(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = { ...formData, companyId };

    if (selectedSchedule) {
      await updateMutation.mutateAsync({ id: selectedSchedule.id, data: submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  const handleDelete = async (schedule) => {
    if (window.confirm(`Weet je zeker dat je "${schedule.name}" wilt verwijderen?`)) {
      await deleteMutation.mutateAsync(schedule.id);
    }
  };

  const handlePublish = async (schedule) => {
    await updateMutation.mutateAsync({
      id: schedule.id,
      data: { 
        status: 'published',
        published_at: new Date().toISOString()
      }
    });
  };

  const handleArchive = async (schedule) => {
    await updateMutation.mutateAsync({
      id: schedule.id,
      data: { status: 'archived' }
    });
  };

  const handleClearShifts = async (schedule) => {
    const shiftCount = getShiftCount(schedule.id);
    if (!window.confirm(`Weet je zeker dat je alle ${shiftCount} diensten van "${schedule.name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
    const scheduleShifts = shifts.filter(s => s.scheduleId === schedule.id);
    await Promise.all(scheduleShifts.map(s => base44.entities.Shift.delete(s.id)));
    queryClient.invalidateQueries(['shifts', companyId]);
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

  const toggleDepartment = (deptId) => {
    setFormData(prev => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter(id => id !== deptId)
        : [...prev.departmentIds, deptId]
    }));
  };

  const toggleLocation = (locId) => {
    setFormData(prev => ({
      ...prev,
      locationIds: prev.locationIds.includes(locId)
        ? prev.locationIds.filter(id => id !== locId)
        : [...prev.locationIds, locId]
    }));
  };

  const getShiftCount = (scheduleId) => {
    return shifts.filter(s => s.scheduleId === scheduleId).length;
  };

  const getDepartmentNames = (ids) => {
    if (!ids?.length) return 'Alle afdelingen';
    return ids.map(id => departments.find(d => d.id === id)?.name).filter(Boolean).join(', ');
  };

  const statusConfig = {
    draft: { label: 'Concept', color: 'bg-slate-100 text-slate-700' },
    published: { label: 'Gepubliceerd', color: 'bg-green-100 text-green-700' },
    archived: { label: 'Gearchiveerd', color: 'bg-gray-100 text-gray-500' }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Sort schedules: draft first, then published, then archived, by date descending
  const sortedSchedules = [...schedules].sort((a, b) => {
    const statusOrder = { draft: 0, published: 1, archived: 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return new Date(b.start_date) - new Date(a.start_date);
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopBar 
        title="Roosters" 
        subtitle={`${schedules.length} roosters`}
        actions={
          hasPermission('manage_schedules') && (
            <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nieuw rooster
            </Button>
          )
        }
      />

      <div className="p-6 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="border-0 shadow-sm animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : schedules.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-medium text-slate-900 mb-2">Nog geen roosters</h3>
              <p className="text-slate-500 text-sm mb-6">
                Maak je eerste rooster aan om diensten in te plannen.
              </p>
              {hasPermission('manage_schedules') && (
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Eerste rooster maken
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedSchedules.map((schedule) => {
              const days = differenceInDays(parseISO(schedule.end_date), parseISO(schedule.start_date)) + 1;
              const shiftCount = getShiftCount(schedule.id);
              
              return (
                <GlowCard key={schedule.id} glowColor="cyan">
                  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <CardContent className="p-6" style={{ backgroundColor: 'transparent' }}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(148, 163, 184, 0.1) 100%)' }}>
                            <CalendarDays className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
                          </div>
                          <div>
                            <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{schedule.name}</h3>
                          <Badge className={statusConfig[schedule.status].color}>
                            {statusConfig[schedule.status].label}
                          </Badge>
                        </div>
                      </div>
                      {hasPermission('manage_schedules') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-slate-400">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(createPageUrl('ScheduleEditor') + `?id=${schedule.id}`)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Openen
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenDialog(schedule)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Bewerken
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(schedule)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Dupliceren
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {schedule.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handlePublish(schedule)}>
                                <Send className="w-4 h-4 mr-2" />
                                Publiceren
                              </DropdownMenuItem>
                            )}
                            {schedule.status !== 'archived' && (
                              <DropdownMenuItem onClick={() => handleArchive(schedule)}>
                                <Archive className="w-4 h-4 mr-2" />
                                Archiveren
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(schedule)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Verwijderen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                      <div className="space-y-2 text-sm mb-4">
                        <p style={{ color: 'var(--color-text-secondary)' }}>
                          {format(parseISO(schedule.start_date), 'd MMM', { locale: nl })} - {format(parseISO(schedule.end_date), 'd MMM yyyy', { locale: nl })}
                          <span style={{ color: 'var(--color-text-muted)' }} className="ml-1">({days} dagen)</span>
                        </p>
                        <p style={{ color: 'var(--color-text-muted)' }}>{getDepartmentNames(schedule.departmentIds)}</p>
                      </div>

                      <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          {shiftCount} diensten
                        </span>
                        <Link to={createPageUrl('ScheduleEditor') + `?id=${schedule.id}`}>
                          <Button variant="ghost" size="sm" style={{ color: 'var(--color-accent)' }}>
                            Bekijken
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </GlowCard>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg" style={{ 
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-primary)'
        }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--color-text-primary)' }}>
              {selectedSchedule ? 'Rooster bewerken' : 'Nieuw rooster'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" style={{ color: 'var(--color-text-primary)' }}>Naam *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description" style={{ color: 'var(--color-text-primary)' }}>Beschrijving</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date" style={{ color: 'var(--color-text-primary)' }}>Startdatum *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_date" style={{ color: 'var(--color-text-primary)' }}>Einddatum *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            {departments.length > 0 && (
              <div>
                <Label style={{ color: 'var(--color-text-primary)' }}>Afdelingen (leeg = alle)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {departments.map((dept) => (
                    <div key={dept.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`sched-dept-${dept.id}`}
                        checked={formData.departmentIds.includes(dept.id)}
                        onCheckedChange={() => toggleDepartment(dept.id)}
                      />
                      <Label htmlFor={`sched-dept-${dept.id}`} className="text-sm font-normal cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>
                        {dept.name}
                      </Label>
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
                        id={`sched-loc-${loc.id}`}
                        checked={formData.locationIds.includes(loc.id)}
                        onCheckedChange={() => toggleLocation(loc.id)}
                      />
                      <Label htmlFor={`sched-loc-${loc.id}`} className="text-sm font-normal cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>
                        {loc.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="default_view_mode" style={{ color: 'var(--color-text-primary)' }}>Standaard weergave</Label>
              <Select 
                value={formData.default_view_mode} 
                onValueChange={(v) => setFormData({ ...formData, default_view_mode: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                      id={`active-day-${index}`}
                      checked={formData.active_days?.includes(index)}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({
                          ...prev,
                          active_days: checked
                            ? [...(prev.active_days || []), index].sort((a, b) => a - b)
                            : (prev.active_days || []).filter(day => day !== index)
                        }));
                      }}
                    />
                    <Label htmlFor={`active-day-${index}`} className="text-sm font-normal cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>
                      {dayName}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timeline_start_time" style={{ color: 'var(--color-text-primary)' }}>Tijdlijn starttijd</Label>
                <Input
                  id="timeline_start_time"
                  type="time"
                  value={formData.timeline_start_time}
                  onChange={(e) => setFormData({ ...formData, timeline_start_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="timeline_end_time" style={{ color: 'var(--color-text-primary)' }}>Tijdlijn eindtijd</Label>
                <Input
                  id="timeline_end_time"
                  type="time"
                  value={formData.timeline_end_time}
                  onChange={(e) => setFormData({ ...formData, timeline_end_time: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs -mt-2" style={{ color: 'var(--color-text-muted)' }}>
              De tijdlijn toont alleen diensten tussen deze tijden
            </p>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog} style={{ 
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)'
              }}>
                Annuleren
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {selectedSchedule ? 'Opslaan' : 'Aanmaken'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}