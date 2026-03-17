import React, { useState } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import PlanningFilterCards from '@/components/planning/PlanningFilterCards';
import PlanningGrid from '@/components/planning/PlanningGrid';
import { Loader2 } from 'lucide-react';

export default function PlanningTool() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  const [selectedDepartmentId, setSelectedDepartmentId] = useState('all');
  const [selectedFunctionId, setSelectedFunctionId] = useState('all');

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

  // Filter employees based on selected department and function
  const filteredEmployees = employees.filter(emp => {
    const matchesDept = selectedDepartmentId === 'all' || emp.departmentIds?.includes(selectedDepartmentId);
    const matchesFunc = selectedFunctionId === 'all' || emp.functionId === selectedFunctionId;
    return matchesDept && matchesFunc;
  });

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
      <div className="p-6 space-y-6">
        <PlanningFilterCards
          departments={departments}
          functions={functions}
          employees={employees}
          selectedDepartmentId={selectedDepartmentId}
          selectedFunctionId={selectedFunctionId}
          onSelectDepartment={setSelectedDepartmentId}
          onSelectFunction={setSelectedFunctionId}
        />
        <PlanningGrid
          schedules={schedules}
          dayparts={dayparts}
          departments={departments}
          functions={functions}
          employees={filteredEmployees}
          allEmployees={employees}
          selectedDepartmentId={selectedDepartmentId}
          companyId={companyId}
        />
      </div>
    </div>
  );
}