import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, MapPin, Clock, Users, Building2, Briefcase } from 'lucide-react';

const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

function WeekNavigator({ weekMonday, onWeekChange }) {
  const weekEnd = addDays(weekMonday, 6);
  const prev = () => onWeekChange(addDays(weekMonday, -7));
  const next = () => onWeekChange(addDays(weekMonday, 7));

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <button onClick={prev} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-surface-light)' }}>
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {format(weekMonday, 'd MMM', { locale: nl })} – {format(weekEnd, 'd MMM yyyy', { locale: nl })}
      </span>
      <button onClick={next} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-surface-light)' }}>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function DaySelector({ weekMonday, selectedDay, onSelectDay }) {
  const today = new Date();
  return (
    <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto">
      {DAY_LABELS.map((label, i) => {
        const date = addDays(weekMonday, i);
        const isSelected = isSameDay(date, selectedDay);
        const isToday = isSameDay(date, today);
        return (
          <button
            key={i}
            onClick={() => onSelectDay(date)}
            className="flex flex-col items-center justify-center min-w-[44px] py-2 rounded-xl transition-all"
            style={{
              backgroundColor: isSelected ? 'var(--color-accent)' : isToday ? 'var(--color-surface-light)' : 'transparent',
              color: isSelected ? '#fff' : 'var(--color-text-primary)',
            }}
          >
            <span className="text-[10px] font-medium opacity-70">{label}</span>
            <span className="text-sm font-bold">{format(date, 'd')}</span>
          </button>
        );
      })}
    </div>
  );
}

function DeptFilterBar({ departments, selectedDeptId, onSelect }) {
  return (
    <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
      <button
        onClick={() => onSelect('all')}
        className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
        style={{
          backgroundColor: selectedDeptId === 'all' ? 'var(--color-accent)' : 'var(--color-surface)',
          color: selectedDeptId === 'all' ? '#fff' : 'var(--color-text-secondary)',
          borderColor: selectedDeptId === 'all' ? 'var(--color-accent)' : 'var(--color-border)',
        }}
      >
        Alle afdelingen
      </button>
      {departments.map(dept => (
        <button
          key={dept.id}
          onClick={() => onSelect(dept.id)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
          style={{
            backgroundColor: selectedDeptId === dept.id ? (dept.color || 'var(--color-accent)') : 'var(--color-surface)',
            color: selectedDeptId === dept.id ? '#fff' : 'var(--color-text-secondary)',
            borderColor: selectedDeptId === dept.id ? (dept.color || 'var(--color-accent)') : 'var(--color-border)',
          }}
        >
          {dept.color && selectedDeptId !== dept.id && (
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color }} />
          )}
          {dept.name}
        </button>
      ))}
    </div>
  );
}

function ColleagueShiftCard({ shift, employee, department, location, functionName }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
      style={{ borderColor: 'var(--color-border)' }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{
          backgroundColor: employee?.color || 'var(--color-accent)',
          color: '#fff',
        }}
      >
        {employee ? `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}` : '?'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
          {employee ? `${employee.first_name} ${employee.last_name}` : 'Onbekend'}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
          {functionName && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              <Briefcase className="w-3 h-3" /> {functionName}
            </span>
          )}
          {department && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              <Building2 className="w-3 h-3" /> {department.name}
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              <MapPin className="w-3 h-3" /> {location.name}
            </span>
          )}
        </div>
      </div>

      {/* Time */}
      <div className="flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--color-surface-light)' }}>
        <Clock className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {shift.start_time} – {shift.end_time}
        </span>
      </div>
    </div>
  );
}

export default function MobileCollegaRoosterTab({
  companyId,
  myProfile,
  departments,
  locations,
  employees,
  functions,
}) {
  const [weekMonday, setWeekMonday] = useState(() => {
    const d = new Date();
    return startOfWeek(d, { weekStartsOn: 1 });
  });
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [selectedDeptId, setSelectedDeptId] = useState('all');

  // Fetch company settings to get visible departments
  const { data: companySettings } = useQuery({
    queryKey: ['company-settings', companyId],
    queryFn: async () => {
      const settings = await base44.entities.CompanySettings.filter({ companyId });
      return settings[0] || null;
    },
    enabled: !!companyId,
  });

  const rosterSettings = companySettings?.colleague_roster_settings || { enabled: false, visible_departmentIds: [] };
  const visibleDeptIds = rosterSettings.visible_departmentIds || [];

  // Filter departments to only visible ones
  const visibleDepartments = useMemo(
    () => departments.filter(d => visibleDeptIds.includes(d.id)),
    [departments, visibleDeptIds]
  );

  // Fetch all shifts for the selected week for visible departments
  const weekStart = format(weekMonday, 'yyyy-MM-dd');
  const weekEnd = format(addDays(weekMonday, 6), 'yyyy-MM-dd');

  const { data: allShifts = [], isLoading } = useQuery({
    queryKey: ['colleague-shifts', companyId, weekStart, weekEnd],
    queryFn: async () => {
      const shifts = await base44.entities.Shift.filter({ companyId });
      return shifts.filter(s => s.date >= weekStart && s.date <= weekEnd);
    },
    enabled: !!companyId && visibleDeptIds.length > 0,
  });

  // Filter shifts for selected day, visible departments, exclude own shifts
  const dateStr = format(selectedDay, 'yyyy-MM-dd');
  const filteredShifts = useMemo(() => {
    return allShifts.filter(s => {
      if (s.date !== dateStr) return false;
      if (s.employeeId === myProfile?.id) return false;
      if (!visibleDeptIds.includes(s.departmentId)) return false;
      if (selectedDeptId !== 'all' && s.departmentId !== selectedDeptId) return false;
      if (s.status === 'cancelled') return false;
      return true;
    }).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  }, [allShifts, dateStr, myProfile?.id, visibleDeptIds, selectedDeptId]);

  const empMap = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e])), [employees]);
  const deptMap = useMemo(() => Object.fromEntries(departments.map(d => [d.id, d])), [departments]);
  const locMap = useMemo(() => Object.fromEntries(locations.map(l => [l.id, l])), [locations]);
  const funcMap = useMemo(() => Object.fromEntries(functions.map(f => [f.id, f])), [functions]);

  if (!rosterSettings.enabled || visibleDeptIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center" style={{ minHeight: 300 }}>
        <Users className="w-12 h-12 mb-3" style={{ color: 'var(--color-text-muted)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Collega-rooster is niet beschikbaar
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          De beheerder heeft deze functie nog niet ingeschakeld
        </p>
      </div>
    );
  }

  return (
    <div>
      <WeekNavigator weekMonday={weekMonday} onWeekChange={(m) => { setWeekMonday(m); setSelectedDay(m); }} />
      <DaySelector weekMonday={weekMonday} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
      <DeptFilterBar departments={visibleDepartments} selectedDeptId={selectedDeptId} onSelect={setSelectedDeptId} />

      {/* Results */}
      <div className="mx-4 rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-light)' }}>
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            {format(selectedDay, 'EEEE d MMMM', { locale: nl })}
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(14,165,233,0.15)', color: '#0ea5e9' }}>
            {filteredShifts.length} collega{filteredShifts.length !== 1 ? "'s" : ''}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
          </div>
        ) : filteredShifts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Geen collega's ingepland</p>
          </div>
        ) : (
          filteredShifts.map(shift => (
            <ColleagueShiftCard
              key={shift.id}
              shift={shift}
              employee={empMap[shift.employeeId]}
              department={deptMap[shift.departmentId]}
              location={locMap[shift.locationId]}
              functionName={funcMap[shift.functionId]?.name}
            />
          ))
        )}
      </div>
    </div>
  );
}