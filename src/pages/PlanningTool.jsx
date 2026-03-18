import React, { useState, useRef, useEffect } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PlanningEmployeePanel from '@/components/planning/PlanningEmployeePanel.jsx';
import PlanningDaypartsPanel from '@/components/planning/PlanningDaypartsPanel.jsx';
import { Loader2, ChevronDown, Building2, Users, X, AlertCircle, ChevronLeft, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { getISOWeek } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SendNotifyDialog from '@/components/schedules/SendNotifyDialog';

// Compact dropdown filter component
function FilterDropdown({ icon: Icon, label, value, options, onSelect, accentColor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => o.id === value);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all"
        style={{
          backgroundColor: value !== 'all' ? `${accentColor}18` : 'var(--color-surface)',
          borderColor: value !== 'all' ? accentColor : 'var(--color-border)',
          color: value !== 'all' ? accentColor : 'var(--color-text-primary)',
        }}
      >
        {selected?.color && (
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color }} />
        )}
        {!selected?.color && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
        <span className="max-w-[140px] truncate">{selected?.name || label}</span>
        {value !== 'all' ? (
          <X
            className="w-3.5 h-3.5 flex-shrink-0 ml-0.5 opacity-60 hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); onSelect('all'); setOpen(false); }}
          />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
        )}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 rounded-xl border shadow-xl z-50 overflow-y-auto"
          style={{
            minWidth: 220,
            maxHeight: 320,
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { onSelect(opt.id); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:bg-white/5"
              style={{
                backgroundColor: value === opt.id ? `${accentColor}18` : 'transparent',
                color: value === opt.id ? accentColor : 'var(--color-text-primary)',
              }}
            >
              {opt.color && (
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
              )}
              <span className="flex-1 truncate">{opt.name}</span>
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                style={{
                  backgroundColor: value === opt.id ? `${accentColor}33` : 'var(--color-surface-light)',
                  color: value === opt.id ? accentColor : 'var(--color-text-muted)',
                }}
              >
                {opt.count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const DEPT_COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const FUNC_COLORS = ['#f97316', '#84cc16', '#06b6d4', '#a855f7', '#f43f5e', '#22c55e', '#eab308', '#3b82f6'];
const NEON_GREEN = '#39ff14';

export default function PlanningTool() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const navigate = useNavigate();

  // Lees URL-parameters bij laden (vanuit RoosterDashboard)
  const urlParams = new URLSearchParams(window.location.search);
  const urlDeptId = urlParams.get('departmentId');
  const urlWeekStart = urlParams.get('weekStart');
  const returnTo = urlParams.get('returnTo');

  const [selectedDepartmentId, setSelectedDepartmentId] = useState(urlDeptId || 'all');
  const [selectedFunctionId, setSelectedFunctionId] = useState('all');
  const [activeEmployee, setActiveEmployee] = useState(null);
  const [requiredHours, setRequiredHours] = useState(() => {
    try {
      const saved = localStorage.getItem('planningTool_requiredHours');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Persist requiredHours to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('planningTool_requiredHours', JSON.stringify(requiredHours));
  }, [requiredHours]);
  const [currentWeekMonday, setCurrentWeekMonday] = useState(() => {
    if (urlWeekStart) {
      const d = new Date(urlWeekStart);
      if (!isNaN(d)) { d.setHours(0, 0, 0, 0); return d; }
    }
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [sendNotifyOpen, setSendNotifyOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [pendingShiftData, setPendingShiftData] = useState(null);
  const [currentWeekShifts, setCurrentWeekShifts] = useState([]);
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => base44.entities.EmployeeProfile.filter({ companyId, status: 'active' }),
    enabled: !!companyId,
  });

  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ['departments', companyId],
    queryFn: () => base44.entities.Department.filter({ companyId, status: 'active' }),
    enabled: !!companyId,
  });

  const { data: functions = [], isLoading: loadingFunctions } = useQuery({
    queryKey: ['functions', companyId],
    queryFn: () => base44.entities.Function.filter({ companyId, status: 'active' }),
    enabled: !!companyId,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => base44.entities.Schedule.filter({ companyId }),
    enabled: !!companyId,
  });

  const { data: dayparts = [] } = useQuery({
    queryKey: ['dayparts', companyId],
    queryFn: () => base44.entities.DepartmentDaypart.filter({ companyId, status: 'active' }),
    enabled: !!companyId,
  });

  const isLoading = loadingEmployees || loadingDepts || loadingFunctions;

  // Determine which day-indices (0=MA..6=ZO) have required hours filled in
  const DAY_KEYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const activeDayIndices = (() => {
    const indices = new Set();
    Object.entries(requiredHours).forEach(([key, val]) => {
      if (parseFloat(val) > 0) {
        const dayIndex = parseInt(key.split('_').pop(), 10);
        if (!isNaN(dayIndex)) indices.add(dayIndex);
      }
    });
    return indices;
  })();

  const filteredEmployees = employees.filter(emp => {
    const matchesDept = selectedDepartmentId === 'all' || emp.departmentIds?.includes(selectedDepartmentId);
    const matchesFunc = selectedFunctionId === 'all' || emp.functionId === selectedFunctionId;
    if (!matchesDept || !matchesFunc) return false;

    // If hours are filled in for specific days, only match employees who prefer those days
    if (activeDayIndices.size > 0) {
      const preferredDays = emp.preferences?.preferred_days || [];
      const prefIndices = new Set(
        DAY_KEYS_ORDER.map((key, i) => preferredDays.includes(key) ? i : null).filter(i => i !== null)
      );
      // Employee matches if they have a preference for at least one of the active days
      // (or if they have no preferences set at all — treat as available any day)
      if (prefIndices.size > 0) {
        const hasOverlap = [...activeDayIndices].some(i => prefIndices.has(i));
        if (!hasOverlap) return false;
      }
    }

    return true;
  });



  const createShiftMutation = useMutation({
    mutationFn: (shiftData) => base44.entities.Shift.create(shiftData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shifts-all', variables.scheduleId] });
    },
  });

  const handleSelectEmployee = (emp) => {
    // Toggle: klik nogmaals om te deselecteren
    setActiveEmployee(prev => prev?.id === emp.id ? null : emp);
  };

  const handleCellClick = async (dp, dayIndex) => {
    if (!activeEmployee) return;

    const selectedSchedule = schedules.find(s => s.departmentIds?.includes(selectedDepartmentId));
    if (!selectedSchedule) {
      toast.error('Geen rooster gekoppeld aan deze afdeling.');
      return;
    }

    // Auto-fill uren van het dagdeel als het vakje nog leeg is
    const key = `${dp.id}_${dayIndex}`;
    if (!requiredHours[key] || parseFloat(requiredHours[key]) === 0) {
      const [sh, sm] = dp.startTime.split(':').map(Number);
      const [eh, em] = dp.endTime.split(':').map(Number);
      let mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins < 0) mins += 24 * 60;
      mins -= (dp.break_duration || 0);
      const hours = Math.max(0, mins / 60);
      setRequiredHours(prev => ({ ...prev, [key]: hours.toString() }));
    }

    const weekDate = addDays(currentWeekMonday, dayIndex);
    const date = format(weekDate, 'yyyy-MM-dd');

    // Check if employee has preferred days set
    const preferredDays = activeEmployee.preferences?.preferred_days || [];
    const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = DAY_NAMES[weekDate.getDay()];
    
    // If employee has preferred days AND this day is NOT in preferences, show warning
    if (preferredDays.length > 0 && !preferredDays.includes(dayName)) {
      setPendingShiftData({
        companyId,
        scheduleId: selectedSchedule.id,
        employeeId: activeEmployee.id,
        departmentId: dp.departmentId,
        daypartId: dp.id,
        functionId: activeEmployee.functionId,
        date,
        start_time: dp.startTime,
        end_time: dp.endTime,
        break_duration: dp.break_duration ?? 0,
        shift_type: 'regular',
        status: 'scheduled',
        weekDate,
      });
      setWarningOpen(true);
      return;
    }

    // No warning needed, proceed with shift creation
    await createShiftMutation.mutateAsync({
      companyId,
      scheduleId: selectedSchedule.id,
      employeeId: activeEmployee.id,
      departmentId: dp.departmentId,
      daypartId: dp.id,
      functionId: activeEmployee.functionId,
      date,
      start_time: dp.startTime,
      end_time: dp.endTime,
      break_duration: dp.break_duration ?? 0,
      shift_type: 'regular',
      status: 'scheduled',
    });
    toast.success(`${activeEmployee.first_name} ingepland op ${format(weekDate, 'd MMM')}`);
  };

  const handleConfirmWarning = async () => {
    if (!pendingShiftData) return;
    const { weekDate, ...shiftData } = pendingShiftData;
    await createShiftMutation.mutateAsync(shiftData);
    toast.success(`${activeEmployee.first_name} ingepland op ${format(weekDate, 'd MMM')}`);
    setWarningOpen(false);
    setPendingShiftData(null);
  };

  // Escape key om actieve selectie te annuleren
  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setActiveEmployee(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Build dropdown options
  const deptOptions = [
    { id: 'all', name: 'Alle afdelingen', count: employees.length, color: null },
    ...departments.map((d, i) => ({
      id: d.id,
      name: d.name,
      count: employees.filter(e => e.departmentIds?.includes(d.id)).length,
      color: d.color || DEPT_COLORS[i % DEPT_COLORS.length],
    })),
  ];

  const funcOptions = [
    { id: 'all', name: 'Alle functies', count: employees.length, color: null },
    ...functions.map((f, i) => ({
      id: f.id,
      name: f.name,
      count: employees.filter(e => e.functionId === f.id).length,
      color: f.color || FUNC_COLORS[i % FUNC_COLORS.length],
    })),
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: NEON_GREEN }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>

      {/* Header balk */}
      <header
        className="px-6 h-14 border-b flex items-center justify-between sticky top-0 z-20"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderColor: `${NEON_GREEN}33`,
          boxShadow: `0 1px 20px ${NEON_GREEN}18`,
        }}
      >
        <div className="flex items-center gap-3">
          {returnTo && (
            <button
              onClick={() => navigate(`/${returnTo}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Terug
            </button>
          )}
          <div>
            <h1 className="text-base font-bold" style={{ color: NEON_GREEN, textShadow: `0 0 12px ${NEON_GREEN}88` }}>
              Planningshulpmiddel
            </h1>
          </div>
          {/* Filters inline in header */}
          <div className="flex items-center gap-2 ml-4">
            <FilterDropdown
              icon={Building2}
              label="Afdeling"
              value={selectedDepartmentId}
              options={deptOptions}
              accentColor="#39ff14"
              onSelect={(id) => { setSelectedDepartmentId(id); setActiveEmployee(null); }}
            />
            <FilterDropdown
              icon={Users}
              label="Functie"
              value={selectedFunctionId}
              options={funcOptions}
              accentColor="#38bdf8"
              onSelect={(id) => { setSelectedFunctionId(id); setActiveEmployee(null); }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {activeEmployee && (
            <span
              className="px-2 py-1 rounded font-semibold"
              style={{ backgroundColor: 'rgba(99,102,241,0.25)', color: '#a5b4fc', border: '1px solid #6366f1' }}
            >
              ✦ {activeEmployee.first_name} {activeEmployee.last_name} — klik op een cel
            </span>
          )}
          <span>{filteredEmployees.length} / {employees.length} medewerkers</span>
        </div>
      </header>

      {/* Content: 2 kolommen */}
      <div className="p-4 flex gap-4" style={{ height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

        {/* Kolom 1: Medewerkers */}
        <div
          className="flex-shrink-0 rounded-xl border overflow-hidden flex flex-col"
          style={{ width: 300, backgroundColor: 'var(--color-surface)', borderColor: `${NEON_GREEN}33` }}
        >
          <PlanningEmployeePanel
           allEmployees={employees}
           filteredEmployees={filteredEmployees}
           functions={functions}
           activeEmployee={activeEmployee}
           onSelectEmployee={handleSelectEmployee}
           neonGreen={NEON_GREEN}
           weekShifts={currentWeekShifts}
          />
        </div>

        {/* Kolom 2: Dagdelen rooster */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <PlanningDaypartsPanel
           schedules={schedules}
           dayparts={dayparts}
           departments={departments}
           functions={functions}
           employees={employees}
           filteredEmployees={filteredEmployees}
           selectedDepartmentId={selectedDepartmentId}
           companyId={companyId}
           requiredHours={requiredHours}
           onRequiredHoursChange={setRequiredHours}
           activeEmployee={activeEmployee}
           onCellClick={handleCellClick}
           currentWeekMonday={currentWeekMonday}
           onWeekChange={setCurrentWeekMonday}
           onWeekShiftsChange={setCurrentWeekShifts}
           />
        </div>

      </div>

      {/* Warning dialog */}
      <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
        <DialogContent style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-primary)'
        }}>
          <DialogHeader>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-orange-500 mt-0.5" />
              <div>
                <DialogTitle>Medewerker buiten voorkeursdagen</DialogTitle>
                <DialogDescription className="mt-1.5">
                  {activeEmployee && pendingShiftData && (
                    <>
                      {activeEmployee.first_name} heeft voorkeursdagen ingesteld, maar de geselecteerde dag staat daar niet in.
                      <br />
                      <br />
                      <span className="font-medium text-orange-500">Wil je toch doorgaan?</span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setWarningOpen(false);
                setPendingShiftData(null);
              }}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            >
              Annuleren
            </Button>
            <Button 
              onClick={handleConfirmWarning}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Toch inplannen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}