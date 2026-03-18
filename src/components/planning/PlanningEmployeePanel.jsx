import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, Star, UserCheck, CheckCircle2 } from 'lucide-react';

function calcShiftHours(shift) {
  if (!shift.start_time || !shift.end_time) return 0;
  const [sh, sm] = shift.start_time.split(':').map(Number);
  const [eh, em] = shift.end_time.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  mins -= (shift.break_duration || 0);
  return Math.max(0, mins / 60);
}

function getInitials(first, last) {
  return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
}

const DAY_LABELS = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function EmployeeRow({ emp, isActive, isMatch, onSelect, getFuncName, neonGreen = '#39ff14', weekHours = 0 }) {
  const preferredDays = emp.preferences?.preferred_days || [];
  const activeDayIndices = DAY_KEYS
    .map((key, i) => preferredDays.includes(key) ? i : null)
    .filter(i => i !== null);

  const contractHours = emp.contract_hours || 0;
  const isFull = contractHours > 0 && weekHours >= contractHours;
  const isOver = contractHours > 0 && weekHours > contractHours;

  return (
    <button
      onClick={() => onSelect(emp)}
      className="w-full flex items-start gap-2 px-3 py-2.5 text-left transition-all"
      style={{
        backgroundColor: isActive
          ? 'rgba(99,102,241,0.18)'
          : isFull
          ? 'rgba(22,163,74,0.06)'
          : 'transparent',
        borderLeft: isActive
          ? '3px solid #6366f1'
          : isMatch
          ? `3px solid ${neonGreen}`
          : '3px solid transparent',
        opacity: isFull && !isActive ? 0.55 : isMatch ? 1 : 0.5,
        cursor: 'pointer',
      }}
    >
      <div className="relative flex-shrink-0 mt-0.5">
        <Avatar className="w-8 h-8" style={{
          boxShadow: isActive ? '0 0 0 2px #6366f1' : isFull ? '0 0 0 2px #16a34a' : 'none',
          filter: isFull && !isActive ? 'grayscale(60%)' : 'none',
        }}>
          <AvatarImage src={emp.avatar_url} />
          <AvatarFallback
            className="text-xs text-white"
            style={{ background: emp.color || 'linear-gradient(135deg, #38bdf8 0%, #94a3b8 100%)' }}
          >
            {getInitials(emp.first_name, emp.last_name)}
          </AvatarFallback>
        </Avatar>
        {isFull && (
          <div className="absolute -bottom-1 -right-1 rounded-full" style={{ backgroundColor: '#16a34a' }}>
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {emp.first_name} {emp.last_name}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isActive && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#6366f1', color: 'white' }}>
                ACTIEF
              </span>
            )}
            {!isActive && isFull && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: isOver ? 'rgba(239,68,68,0.15)' : 'rgba(22,163,74,0.15)', color: isOver ? '#ef4444' : '#16a34a' }}>
                {isOver ? 'OVER' : 'VOL'}
              </span>
            )}
            {!isActive && !isFull && isMatch && (
              <Star className="w-3 h-3" style={{ color: neonGreen, filter: `drop-shadow(0 0 4px ${neonGreen})` }} />
            )}
          </div>
        </div>
        <div className="text-xs truncate flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
          {getFuncName(emp.functionId) || '—'}
          {contractHours > 0 && (
            <span style={{ color: isFull ? (isOver ? '#ef4444' : '#16a34a') : 'var(--color-text-muted)' }}>
              · {weekHours.toFixed(1)}/{contractHours}u
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 mt-1 flex-wrap">
          {DAY_LABELS.map((label, i) => {
            const isPreferred = activeDayIndices.includes(i);
            return (
              <span
                key={i}
                className="text-[9px] font-bold px-1 py-0.5 rounded"
                style={{
                  backgroundColor: isPreferred
                    ? (isMatch ? `${neonGreen}25` : 'rgba(99,102,241,0.15)')
                    : 'var(--color-surface-light)',
                  color: isPreferred
                    ? (isMatch ? neonGreen : '#a5b4fc')
                    : 'var(--color-text-muted)',
                  opacity: isPreferred ? 1 : 0.4,
                }}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>
    </button>
  );
}

export default function PlanningEmployeePanel({
  allEmployees,
  filteredEmployees,
  functions,
  activeEmployee,
  onSelectEmployee,
  neonGreen = '#39ff14',
  weekShifts = [],
}) {
  const getFuncName = (id) => functions.find(f => f.id === id)?.name || '';

  const getWeekHours = (empId) =>
    weekShifts.filter(s => s.employeeId === empId).reduce((sum, s) => sum + calcShiftHours(s), 0);

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
      </div>

      {/* Instructie banner */}
      <div
        className="px-3 py-2 text-xs flex items-center gap-2 flex-shrink-0"
        style={{
          backgroundColor: activeEmployee ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
          borderBottom: '1px solid var(--color-border)',
          color: activeEmployee ? '#a5b4fc' : 'var(--color-text-muted)',
        }}
      >
        {activeEmployee ? (
          <>
            <UserCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#6366f1' }} />
            <span>
              <strong style={{ color: '#6366f1' }}>{activeEmployee.first_name}</strong> geselecteerd — klik op een cel om in te plannen
            </span>
          </>
        ) : (
          <>
            <span>👆</span>
            <span>Klik op een medewerker, daarna op een dag/cel</span>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {allEmployees.length === 0 ? (
          <div className="p-4 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
            Geen medewerkers gevonden
          </div>
        ) : (
          <>
            {showSections && matchingEmployees.length > 0 && (
              <div
                className="px-3 py-1 text-xs font-semibold uppercase tracking-wide flex items-center gap-1"
                style={{ backgroundColor: `${neonGreen}15`, color: neonGreen, textShadow: `0 0 8px ${neonGreen}66` }}
              >
                <Star className="w-3 h-3" /> Match ({matchingEmployees.length})
              </div>
            )}
            {matchingEmployees.map((emp) => (
              <EmployeeRow
                key={emp.id}
                emp={emp}
                isActive={activeEmployee?.id === emp.id}
                isMatch={true}
                onSelect={onSelectEmployee}
                getFuncName={getFuncName}
                neonGreen={neonGreen}
                weekHours={getWeekHours(emp.id)}
              />
            ))}

            {showSections && otherEmployees.length > 0 && (
              <div
                className="px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                style={{ backgroundColor: 'var(--color-surface-light)', color: 'var(--color-text-muted)' }}
              >
                Overige ({otherEmployees.length})
              </div>
            )}
            {otherEmployees.map((emp) => (
              <EmployeeRow
                key={emp.id}
                emp={emp}
                isActive={activeEmployee?.id === emp.id}
                isMatch={false}
                onSelect={onSelectEmployee}
                getFuncName={getFuncName}
                neonGreen={neonGreen}
                weekHours={getWeekHours(emp.id)}
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
          {activeEmployee
            ? `Klik op een cel om ${activeEmployee.first_name} in te plannen · Klik nogmaals om te deselecteren`
            : 'Klik op een medewerker om te selecteren'}
        </div>
      )}
    </div>
  );
}