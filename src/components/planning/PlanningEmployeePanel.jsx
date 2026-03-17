import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check } from 'lucide-react';

function getInitials(first, last) {
  return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
}

export default function PlanningEmployeePanel({
  employees,
  departments,
  functions,
  selectedEmployeeIds,
  onToggleEmployee,
}) {
  const getFuncName = (id) => functions.find(f => f.id === id)?.name || '';
  const getPreferredDepts = (emp) =>
    (emp.preferred_departmentIds || [])
      .map(id => departments.find(d => d.id === id)?.name)
      .filter(Boolean);

  return (
    <div className="h-full flex flex-col">
      <div
        className="px-3 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-light)' }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Medewerkers
        </span>
        <span
          className="ml-2 text-xs px-1.5 py-0.5 rounded font-bold"
          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}
        >
          {employees.length}
        </span>
        {selectedEmployeeIds.size > 0 && (
          <span className="ml-2 text-xs" style={{ color: '#6366f1' }}>
            {selectedEmployeeIds.size} geselecteerd
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {employees.length === 0 ? (
          <div className="p-4 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
            Geen medewerkers gevonden
          </div>
        ) : (
          employees.map(emp => {
            const isSelected = selectedEmployeeIds.has(emp.id);
            const preferredDepts = getPreferredDepts(emp);

            return (
              <button
                key={emp.id}
                onClick={() => onToggleEmployee(emp.id)}
                className="w-full flex items-start gap-2 px-3 py-2.5 text-left transition-colors"
                style={{
                  backgroundColor: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
                  borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                }}
              >
                <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
                  <AvatarImage src={emp.avatar_url} />
                  <AvatarFallback
                    className="text-xs text-white"
                    style={{ background: emp.color || 'linear-gradient(135deg, #38bdf8 0%, #94a3b8 100%)' }}
                  >
                    {getInitials(emp.first_name, emp.last_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {emp.first_name} {emp.last_name}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#6366f1' }} />
                    )}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {getFuncName(emp.functionId) || '—'}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: 'var(--color-surface-light)', color: 'var(--color-text-secondary)' }}
                    >
                      {emp.contract_hours ? `${emp.contract_hours}u/wk` : '—'}
                    </span>
                    {preferredDepts.length > 0 && (
                      <span className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {preferredDepts[0]}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {employees.length > 0 && (
        <div
          className="px-3 py-2 border-t text-xs flex-shrink-0"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          Klik op een medewerker om te selecteren
        </div>
      )}
    </div>
  );
}