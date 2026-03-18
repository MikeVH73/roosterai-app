import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin, Clock, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, isWithinInterval, parseISO, isSameDay } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function EmployeeWeekSchedule({ shifts = [], locations = [], departments = [], dayparts = [] }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const currentWeekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });

  // Get ISO week number
  const tempDate = new Date(currentWeekStart.getTime());
  tempDate.setDate(tempDate.getDate() + 3);
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);

  const weekShifts = shifts.filter(shift => {
    try {
      const shiftDate = parseISO(shift.date);
      return isWithinInterval(shiftDate, { start: currentWeekStart, end: currentWeekEnd });
    } catch {
      return false;
    }
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(currentWeekStart);
    day.setDate(day.getDate() + i);
    days.push(day);
  }

  const getLocationName = (id) => locations.find(l => l.id === id)?.name || '';
  const getDepartmentName = (id) => departments.find(d => d.id === id)?.name || '';
  const getDaypartName = (id) => dayparts.find(dp => dp.id === id)?.name || '';

  const totalHours = weekShifts.reduce((sum, s) => {
    if (!s.start_time || !s.end_time) return sum;
    const [sh, sm] = s.start_time.split(':').map(Number);
    const [eh, em] = s.end_time.split(':').map(Number);
    let hours = (eh + em / 60) - (sh + sm / 60);
    if (hours < 0) hours += 24;
    hours -= (s.break_duration || 0) / 60;
    return sum + Math.max(0, hours);
  }, 0);

  return (
    <Card className="border-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)' }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Mijn rooster
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[80px] text-center" style={{ color: 'var(--color-text-primary)' }}>
              Week {weekNumber}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            {weekOffset !== 0 && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setWeekOffset(0)}>
                Vandaag
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {format(currentWeekStart, 'd MMM', { locale: nl })} - {format(currentWeekEnd, 'd MMM yyyy', { locale: nl })}
          {' · '}
          <span style={{ color: 'var(--color-accent)' }}>{weekShifts.length} dienst{weekShifts.length !== 1 ? 'en' : ''} · {totalHours.toFixed(1)} uur</span>
        </p>
      </CardHeader>
      <CardContent>
        {weekShifts.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Geen diensten deze week</p>
          </div>
        ) : (
          <div className="space-y-2">
            {days.map(day => {
              const dayShifts = weekShifts.filter(s => isSameDay(parseISO(s.date), day));
              if (dayShifts.length === 0) return null;
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()}>
                  {dayShifts.map((shift, idx) => (
                    <div
                      key={shift.id || idx}
                      className="flex items-center gap-3 p-3 rounded-xl mb-1"
                      style={{
                        backgroundColor: isToday ? 'rgba(56,189,248,0.08)' : 'var(--color-surface-light)',
                        border: isToday ? '1px solid rgba(56,189,248,0.3)' : '1px solid transparent'
                      }}
                    >
                      {/* Day column */}
                      <div className="w-16 flex-shrink-0 text-center">
                        <p className="text-xs font-medium" style={{ color: isToday ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                          {format(day, 'EEE', { locale: nl })}
                        </p>
                        <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                          {format(day, 'd')}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                          {format(day, 'MMM', { locale: nl })}
                        </p>
                      </div>

                      {/* Divider */}
                      <div className="w-px h-10 self-center" style={{ backgroundColor: 'var(--color-border)' }} />

                      {/* Shift details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getLocationName(shift.locationId) && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
                              <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                                {getLocationName(shift.locationId)}
                              </span>
                            </div>
                          )}
                          {getDepartmentName(shift.departmentId) && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>
                              {getDepartmentName(shift.departmentId)}
                            </span>
                          )}
                        </div>
                        {getDaypartName(shift.daypartId) && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {getDaypartName(shift.daypartId)}
                          </p>
                        )}
                        {shift.notes && (
                          <p className="text-xs mt-0.5 italic" style={{ color: 'var(--color-text-muted)' }}>
                            {shift.notes}
                          </p>
                        )}
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {shift.start_time} - {shift.end_time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}