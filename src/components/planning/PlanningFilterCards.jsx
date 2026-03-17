import React from 'react';
import { Users, Building2 } from 'lucide-react';

function FilterCard({ label, count, color, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start p-4 rounded-xl border transition-all cursor-pointer text-left"
      style={{
        backgroundColor: isActive ? color + '22' : 'var(--color-surface)',
        borderColor: isActive ? color : 'var(--color-border)',
        borderWidth: isActive ? '2px' : '1px',
        minWidth: '130px',
      }}
    >
      <span className="text-xs font-medium mb-1 truncate w-full" style={{ color: isActive ? color : 'var(--color-text-muted)' }}>
        {label}
      </span>
      <span className="text-2xl font-bold" style={{ color: isActive ? color : 'var(--color-text-primary)' }}>
        {count}
      </span>
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>medewerkers</span>
    </button>
  );
}

export default function PlanningFilterCards({
  departments,
  functions,
  employees,
  selectedDepartmentId,
  selectedFunctionId,
  onSelectDepartment,
  onSelectFunction,
}) {
  const deptColors = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
  const funcColors = ['#f97316', '#84cc16', '#06b6d4', '#a855f7', '#f43f5e', '#22c55e', '#eab308', '#3b82f6'];

  const countForDept = (deptId) =>
    deptId === 'all'
      ? employees.length
      : employees.filter(e => e.departmentIds?.includes(deptId)).length;

  const countForFunc = (funcId) =>
    funcId === 'all'
      ? employees.length
      : employees.filter(e => e.functionId === funcId).length;

  return (
    <div className="space-y-4">
      {/* Department filter */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            Filter op Afdeling
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <FilterCard
            label="Alle afdelingen"
            count={employees.length}
            color="#0ea5e9"
            isActive={selectedDepartmentId === 'all'}
            onClick={() => onSelectDepartment('all')}
          />
          {departments.map((dept, i) => (
            <FilterCard
              key={dept.id}
              label={dept.name}
              count={countForDept(dept.id)}
              color={dept.color || deptColors[i % deptColors.length]}
              isActive={selectedDepartmentId === dept.id}
              onClick={() => onSelectDepartment(dept.id)}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* Function filter */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            Filter op Functie
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <FilterCard
            label="Alle functies"
            count={employees.length}
            color="#6366f1"
            isActive={selectedFunctionId === 'all'}
            onClick={() => onSelectFunction('all')}
          />
          {functions.map((fn, i) => (
            <FilterCard
              key={fn.id}
              label={fn.name}
              count={countForFunc(fn.id)}
              color={fn.color || funcColors[i % funcColors.length]}
              isActive={selectedFunctionId === fn.id}
              onClick={() => onSelectFunction(fn.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}