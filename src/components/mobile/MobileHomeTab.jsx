import React from 'react';
import { Calendar, Clock, ArrowLeftRight, Bot, ChevronRight, Plus } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, isSameDay } from 'date-fns';
import { nl } from 'date-fns/locale';

function QuickStatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 p-4 rounded-xl w-full text-left transition-all active:scale-[0.98]"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
    </button>
  );
}

export default function MobileHomeTab({ 
  shifts = [], myProfile, vacationRequests = [], swapRequests = [], 
  locations = [], departments = [], dayparts = [],
  onNavigate 
}) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const myShiftsThisWeek = shifts.filter(s => {
    try {
      return isWithinInterval(parseISO(s.date), { start: weekStart, end: weekEnd });
    } catch { return false; }
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const myVacations = vacationRequests.filter(r => r.employeeId === myProfile?.id);
  const pendingVacations = myVacations.filter(r => r.status === 'pending');
  const mySwaps = swapRequests.filter(r => r.requesterId === myProfile?.id);
  const pendingSwaps = mySwaps.filter(r => r.status === 'pending');

  // Today's shifts
  const todayShifts = myShiftsThisWeek.filter(s => isSameDay(parseISO(s.date), now));

  const getLocationName = (id) => locations.find(l => l.id === id)?.name || '';
  const getDepartmentName = (id) => departments.find(d => d.id === id)?.name || '';

  return (
    <div className="px-4 pb-4 space-y-4">
      {/* Greeting */}
      <div className="pt-2">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {format(now, "EEEE d MMMM", { locale: nl })}
        </p>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Hoi {myProfile?.first_name || 'daar'} 👋
        </h2>
      </div>

      {/* Today's shift highlight */}
      {todayShifts.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)' }}>
          <p className="text-xs font-medium text-white/80 mb-1">Vandaag</p>
          {todayShifts.map((shift, i) => (
            <div key={i} className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{shift.start_time} - {shift.end_time}</p>
                <p className="text-white/80 text-sm">{getLocationName(shift.locationId)}</p>
                {getDepartmentName(shift.departmentId) && (
                  <p className="text-white/60 text-xs">{getDepartmentName(shift.departmentId)}</p>
                )}
              </div>
              <Calendar className="w-8 h-8 text-white/40" />
            </div>
          ))}
        </div>
      )}

      {todayShifts.length === 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            🎉 Je hebt vandaag geen dienst
          </p>
        </div>
      )}

      {/* Quick stats */}
      <div className="space-y-2">
        <QuickStatCard
          icon={Calendar}
          label="Diensten deze week"
          value={myShiftsThisWeek.length}
          color="#0ea5e9"
          onClick={() => onNavigate('rooster')}
        />
        <QuickStatCard
          icon={Clock}
          label="Verlofaanvragen"
          value={`${pendingVacations.length} openstaand`}
          color="#f59e0b"
          onClick={() => onNavigate('verlof')}
        />
        <QuickStatCard
          icon={ArrowLeftRight}
          label="Ruilverzoeken"
          value={`${pendingSwaps.length} openstaand`}
          color="#8b5cf6"
          onClick={() => onNavigate('ruil')}
        />
      </div>

      {/* Upcoming shifts preview */}
      {myShiftsThisWeek.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Komende diensten</h3>
            <button onClick={() => onNavigate('rooster')} className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
              Bekijk alles
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {myShiftsThisWeek.slice(0, 3).map((shift, i) => {
              const shiftDate = parseISO(shift.date);
              const isToday = isSameDay(shiftDate, now);
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-11 text-center flex-shrink-0">
                    <p className="text-[10px] uppercase font-medium" 
                      style={{ color: isToday ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                      {format(shiftDate, 'EEE', { locale: nl })}
                    </p>
                    <p className="text-lg font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                      {format(shiftDate, 'd')}
                    </p>
                  </div>
                  <div className="w-px h-8 flex-shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {getLocationName(shift.locationId) || 'Dienst'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {getDepartmentName(shift.departmentId)}
                    </p>
                  </div>
                  <span className="text-sm font-medium flex-shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                    {shift.start_time} - {shift.end_time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick actions: Verlof & Ruil aanvragen */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onNavigate('verlof')} className="rounded-xl p-3 flex items-center gap-2 text-left active:scale-[0.98] transition-transform"
          style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <Plus className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Verlof aanvragen</span>
        </button>
        <button onClick={() => onNavigate('ruil')} className="rounded-xl p-3 flex items-center gap-2 text-left active:scale-[0.98] transition-transform"
          style={{ backgroundColor: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}>
          <Plus className="w-4 h-4 flex-shrink-0" style={{ color: '#8b5cf6' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Dienst ruilen</span>
        </button>
      </div>

      {/* Planning Assistent CTA */}
      <button onClick={() => onNavigate('chat')} className="w-full rounded-xl p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #4338ca 100%)' }}>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">Planning Assistent</p>
          <p className="text-white/70 text-xs">Stel vragen over je rooster</p>
        </div>
        <ChevronRight className="w-4 h-4 text-white/50" />
      </button>
    </div>
  );
}