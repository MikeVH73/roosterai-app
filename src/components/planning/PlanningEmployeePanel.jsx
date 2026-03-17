import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, Star, GripVertical } from 'lucide-react';
import { Draggable, Droppable } from '@hello-pangea/dnd';


function getInitials(first, last) {
  return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
}

const DAY_LABELS = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function EmployeeRow({ emp, isSelected, isMatch, onToggle, getFuncName, neonGreen = '#39ff14', dragHandleProps }) {
  const preferredDays = emp.preferences?.preferred_days || [];

  // Map day strings to day indices
  const activeDayIndices = DAY_KEYS
    .map((key, i) => preferredDays.includes(key) ? i : null)
    .filter(i => i !== null);

  return (
    <button
      onClick={() => onToggle(emp.id)}
      className="w-full flex items-start gap-2 px-3 py-2.5 text-left transition-colors"
      style={{
        backgroundColor: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
        borderLeft: isSelected ? '3px solid #6366f1' : isMatch ? `3px solid ${neonGreen}` : '3px solid transparent',
        opacity: isMatch ? 1 : 0.5,
      }}
    >
      <div {...dragHandleProps} onClick={e => e.stopPropagation()} className="mt-1 flex-shrink-0 cursor-grab">
        <GripVertical className="w-3 h-3" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
      </div>
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
              <Star className="w-3 h-3" style={{ color: neonGreen, filter: `drop-shadow(0 0 4px ${neonGreen})` }} />
            )}
            {isSelected && (
              <Check className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
            )}
          </div>
        </div>
        <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
          {getFuncName(emp.functionId) || '—'}
          {emp.contract_hours ? ` · ${emp.contract_hours}u/wk` : ''}
        </div>
        {/* Preferred days pills */}
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
  departments,
  functions,
  selectedEmployeeIds,
  onToggleEmployee,
  neonGreen = '#39ff14',
}) {
  const getFuncName = (id) => functions.find(f => f.id === id)?.name || '';

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

      <Droppable droppableId="employee-list" isDropDisabled={true}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto divide-y"
            style={{ borderColor: 'var(--color-border)' }}
          >
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
                    style={{ backgroundColor: `${neonGreen}15`, color: neonGreen, textShadow: `0 0 8px ${neonGreen}66` }}
                  >
                    <Star className="w-3 h-3" /> Match ({matchingEmployees.length})
                  </div>
                )}
                {matchingEmployees.map((emp, index) => (
                  <Draggable key={emp.id} draggableId={emp.id} index={index}>
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        style={{
                          ...dragProvided.draggableProps.style,
                          opacity: dragSnapshot.isDragging ? 0.9 : 1,
                          width: dragSnapshot.isDragging ? '180px' : undefined,
                          boxShadow: dragSnapshot.isDragging ? '0 4px 16px rgba(0,0,0,0.4)' : undefined,
                          borderRadius: dragSnapshot.isDragging ? '8px' : undefined,
                          overflow: dragSnapshot.isDragging ? 'hidden' : undefined,
                        }}
                      >
                        <div className="flex items-center" {...dragProvided.dragHandleProps}>
                          <GripVertical className="w-3 h-3 ml-1 flex-shrink-0 cursor-grab" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
                        </div>
                        <EmployeeRow
                          emp={emp}
                          isSelected={selectedEmployeeIds.has(emp.id)}
                          isMatch={true}
                          onToggle={onToggleEmployee}
                          getFuncName={getFuncName}
                          neonGreen={neonGreen}
                          dragHandleProps={dragProvided.dragHandleProps}
                        />
                      </div>
                    )}
                  </Draggable>
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
                {otherEmployees.map((emp, index) => (
                  <Draggable key={emp.id} draggableId={emp.id} index={matchingEmployees.length + index}>
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        style={{
                          ...dragProvided.draggableProps.style,
                          opacity: dragSnapshot.isDragging ? 0.9 : 1,
                          width: dragSnapshot.isDragging ? '180px' : undefined,
                          boxShadow: dragSnapshot.isDragging ? '0 4px 16px rgba(0,0,0,0.4)' : undefined,
                          borderRadius: dragSnapshot.isDragging ? '8px' : undefined,
                          overflow: dragSnapshot.isDragging ? 'hidden' : undefined,
                        }}
                      >
                        <EmployeeRow
                          emp={emp}
                          isSelected={selectedEmployeeIds.has(emp.id)}
                          isMatch={false}
                          onToggle={onToggleEmployee}
                          getFuncName={getFuncName}
                          neonGreen={neonGreen}
                          dragHandleProps={dragProvided.dragHandleProps}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
              </>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

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