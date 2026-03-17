import React, { useState } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import PlanningFilterCards from '@/components/planning/PlanningFilterCards';
import PlanningEmployeePanel from '@/components/planning/PlanningEmployeePanel.jsx';
import PlanningDaypartsPanel from '@/components/planning/PlanningDaypartsPanel.jsx';
import { Loader2 } from 'lucide-react';

export default function PlanningTool() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  const [selectedDepartmentId, setSelectedDepartmentId] = useState('all');
  const [selectedFunctionId, setSelectedFunctionId] = useState('all');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(new Set());

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

  const filteredEmployees = employees.filter(emp => {
    const matchesDept = selectedDepartmentId === 'all' || emp.departmentIds?.includes(selectedDepartmentId);
    const matchesFunc = selectedFunctionId === 'all' || emp.functionId === selectedFunctionId;
    return matchesDept && matchesFunc;
  });

  const toggleEmployee = (empId) => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopBar
        title="Planningshulpmiddel"
        subtitle="Stel een rooster samen en plan medewerkers in"
      />
      <div className="p-4 flex gap-4" style={{ height: 'calc(100vh - 80px)', overflow: 'hidden' }}>

        {/* Kolom 1: Filters */}
        <div
          className="flex-shrink-0 rounded-xl border p-3 overflow-y-auto"
          style={{ width: 220, backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <PlanningFilterCards
            departments={departments}
            functions={functions}
            employees={employees}
            selectedDepartmentId={selectedDepartmentId}
            selectedFunctionId={selectedFunctionId}
            onSelectDepartment={(id) => { setSelectedDepartmentId(id); setSelectedEmployeeIds(new Set()); }}
            onSelectFunction={(id) => { setSelectedFunctionId(id); setSelectedEmployeeIds(new Set()); }}
          />
        </div>

        {/* Kolom 2: Medewerkers */}
        <div
          className="flex-shrink-0 rounded-xl border overflow-y-auto"
          style={{ width: 260, backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <PlanningEmployeePanel
            allEmployees={employees}
            filteredEmployees={filteredEmployees}
            departments={departments}
            functions={functions}
            selectedEmployeeIds={selectedEmployeeIds}
            onToggleEmployee={toggleEmployee}
          />
        </div>

        {/* Kolom 3: Dagdelen rooster */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <PlanningDaypartsPanel
            schedules={schedules}
            dayparts={dayparts}
            departments={departments}
            functions={functions}
            employees={employees}
            filteredEmployees={filteredEmployees}
            selectedEmployeeIds={selectedEmployeeIds}
            selectedDepartmentId={selectedDepartmentId}
            companyId={companyId}
          />
        </div>

      </div>
    </div>
  );
}