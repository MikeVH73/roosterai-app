import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Clock, Calendar, FileText } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, isWithinInterval, parseISO, isSameDay } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function MobileRoosterTab({ shifts = [], locations = [], departments = [], dayparts = [] }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    // Only trigger if horizontal swipe is dominant and > 50px
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > deltaY) {
      if (deltaX < 0) setWeekOffset(w => w + 1); // swipe left = next week
      else setWeekOffset(w => w - 1); // swipe right = previous week
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const currentWeekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });

  const tempDate = new Date(currentWeekStart.getTime());
  tempDate.setDate(tempDate.getDate() + 3);
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);

  const weekShifts = shifts.filter(shift => {
    try {
      return isWithinInterval(parseISO(shift.date), { start: currentWeekStart, end: currentWeekEnd });
    } catch { return false; }
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalHours = weekShifts.reduce((sum, s) => {
    if (!s.start_time || !s.end_time) return sum;
    const [sh, sm] = s.start_time.split(':').map(Number);
    const [eh, em] = s.end_time.split(':').map(Number);
    let hours = (eh + em / 60) - (sh + sm / 60);
    if (hours < 0) hours += 24;
    hours -= (s.break_duration || 0) / 60;
    return sum + Math.max(0, hours);
  }, 0);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(currentWeekStart);
    day.setDate(day.getDate() + i);
    days.push(day);
  }

  const getLocationName = (id) => locations.find(l => l.id === id)?.name || '';
  const getDepartmentName = (id) => departments.find(d => d.id === id)?.name || '';
  const getDaypartName = (id) => dayparts.find(dp => dp.id === id)?.name || '';

  return (
    <div className="px-4 pb-4">
      {/* Week navigator */}
      <div className="flex items-center justify-between py-3">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-lg active:scale-95 transition-transform"
          style={{ backgroundColor: 'var(--color-surface-light)' }}>
          <ChevronLeft className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
        </button>
        <div className="text-center">
          <p className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Week {weekNumber}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {format(currentWeekStart, 'd MMM', { locale: nl })} - {format(currentWeekEnd, 'd MMM', { locale: nl })}
          </p>
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-lg active:scale-95 transition-transform"
          style={{ backgroundColor: 'var(--color-surface-light)' }}>
          <ChevronRight className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
        </button>
      </div>

      {/* Today button */}
      {weekOffset !== 0 && (
        <div className="flex justify-center mb-3">
          <button onClick={() => setWeekOffset(0)} className="px-4 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>
            Vandaag
          </button>
        </div>
      )}

      {/* Week summary */}
      <div className="flex items-center justify-center gap-4 mb-4 py-2 rounded-lg"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>{weekShifts.length}</p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>diensten</p>
        </div>
        <div className="w-px h-8" style={{ backgroundColor: 'var(--color-border)' }} />
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>{totalHours.toFixed(1)}</p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>uren</p>
        </div>
      </div>

      {/* Day-by-day schedule */}
      {weekShifts.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
          <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Geen diensten</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Je hebt deze week geen diensten</p>
        </div>
      ) : (
        <div className="space-y-2">
          {days.map(day => {
            const dayShifts = weekShifts.filter(s => isSameDay(parseISO(s.date), day));
            const isToday = isSameDay(day, new Date());
            const isPast = day < new Date() && !isToday;

            if (dayShifts.length === 0) {
              return (
                <div key={day.toISOString()} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ opacity: isPast ? 0.5 : 0.7 }}>
                  <div className="w-11 text-center flex-shrink-0">
                    <p className="text-[10px] uppercase font-medium" style={{ color: 'var(--color-text-muted)' }}>
                      {format(day, 'EEE', { locale: nl })}
                    </p>
                    <p className="text-base font-bold" style={{ color: 'var(--color-text-muted)' }}>
                      {format(day, 'd')}
                    </p>
                  </div>
                  <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>Vrij</p>
                </div>
              );
            }

            return dayShifts.map((shift, idx) => (
              <div key={`${day.toISOString()}-${idx}`}
                className="flex items-center gap-3 p-3 rounded-xl transition-all"
                style={{
                  backgroundColor: isToday ? 'rgba(14,165,233,0.08)' : 'var(--color-surface)',
                  border: isToday ? '1px solid rgba(14,165,233,0.3)' : '1px solid var(--color-border)',
                  opacity: isPast ? 0.6 : 1,
                }}>
                <div className="w-11 text-center flex-shrink-0">
                  <p className="text-[10px] uppercase font-medium"
                    style={{ color: isToday ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                    {format(day, 'EEE', { locale: nl })}
                  </p>
                  <p className="text-lg font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                    {format(day, 'd')}
                  </p>
                  <p className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                    {format(day, 'MMM', { locale: nl })}
                  </p>
                </div>
                <div className="w-px h-10 flex-shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />
                <div className="flex-1 min-w-0">
                  {getLocationName(shift.locationId) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {getLocationName(shift.locationId)}
                      </span>
                    </div>
                  )}
                  {getDepartmentName(shift.departmentId) && (
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full mt-1"
                      style={{ backgroundColor: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                      {getDepartmentName(shift.departmentId)}
                    </span>
                  )}
                  {shift.notes && (
                    <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                      <FileText className="w-3 h-3" />{shift.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {shift.start_time}
                    <br />
                    {shift.end_time}
                  </span>
                </div>
              </div>
            ));
          })}
        </div>
      )}
    </div>
  );
}