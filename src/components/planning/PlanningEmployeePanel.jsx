import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, Star } from 'lucide-react';

function getInitials(first, last) {
  return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
}

function EmployeeRow({ emp, isSelected, isMatch, onToggle, getFuncName, getPreferredDepts }) {
  const preferredDepts = getPreferredDepts(emp);

  return (
    <button
      onClick={() => onToggle(emp.id)}
      className="w-full flex items-start gap-2 px-3 py-2.5 text-left transition-colors"
      style={{
        backgroundColor: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
        borderLeft: isSelected ? '3px solid #6366f1' : isMatch ? '3px solid #16a34a' : '3px solid transparent',
        opacity: isMatch ? 1 : 0.5,
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
          <div className="flex items-center gap-1 flex-shrink-0">
            {isMatch && !isSelected && (
              <Star className="w-3 h-3" style={{ color: '#16a34a' }} />
            )}
            {isSelected && (
              <Check className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
            )}
          </div>
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
}

export default function PlanningEmployeePanel({
  allEmployees,
  filteredEmployees,
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

  const matchIds = new Set(filteredEmployees.map(e => e.id));
  const matchingEmployees = allEmployees.filter(e => matchIds.has(e.id));
  const otherEmployees = allEmployees.filter(e => !matchIds.has(e.id));
  const showSections = otherEmployees.length > 0;

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
          {matchingEmployees.length}
          {showSections && ` / ${allEmployees.length}`}
        </span>
        {selectedEmployeeIds.size > 0 && (
          <span className="ml-2 text-xs" style={{ color: '#6366f1' }}>
            {selectedEmployeeIds.size} geselecteerd
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {allEmployees.length === 0 ? (
          <div className="p-4 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
            Geen medewerkers gevonden
          </div>
        ) : (
          <>
            {/* Matching employees */}
            {showSections && matchingEmployees.length > 0 && (
              <div
                className="px-3 py-1 text-xs font-semibold uppercase tracking-wide flex items-center gap-1"
                style={{ backgroundColor: 'rgba(22,163,74,0.08)', color: '#16a34a' }}
              >
                <Star className="w-3 h-3" /> Match ({matchingEmployees.length})
              </div>
            )}
            {matchingEmployees.map(emp => (
              <EmployeeRow
                key={emp.id}
                emp={emp}
                isSelected={selectedEmployeeIds.has(emp.id)}
                isMatch={true}
                onToggle={onToggleEmployee}
                getFuncName={getFuncName}
                getPreferredDepts={getPreferredDepts}
              />
            ))}

            {/* Other employees (dimmed) */}
            {showSections && otherEmployees.length > 0 && (
              <div
                className="px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                style={{ backgroundColor: 'var(--color-surface-light)', color: 'var(--color-text-muted)' }}
              >
                Overige ({otherEmployees.length})
              </div>
            )}
            {otherEmployees.map(emp => (
              <EmployeeRow
                key={emp.id}
                emp={emp}
                isSelected={selectedEmployeeIds.has(emp.id)}
                isMatch={false}
                onToggle={onToggleEmployee}
                getFuncName={getFuncName}
                getPreferredDepts={getPreferredDepts}
              />
            ))}
          </>
        )}
      </div>

      {allEmployees.length > 0 && (
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