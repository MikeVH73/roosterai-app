import React from 'react';
import { MessageCircle, Calendar, ArrowLeftRight, Clock, CheckCircle2, XCircle, Bell } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function MobileMeldingenTab({ messageLogs = [], vacationRequests = [], swapRequests = [], myProfile, shifts = [] }) {
  // Build a unified notification list
  const notifications = [];

  // Messages from planner
  messageLogs
    .filter(m => m.direction === 'outbound')
    .forEach(m => {
      notifications.push({
        id: `msg-${m.id}`,
        type: 'message',
        icon: MessageCircle,
        color: '#0ea5e9',
        title: 'Bericht van planner',
        description: m.message?.substring(0, 80) + (m.message?.length > 80 ? '...' : ''),
        date: m.created_date,
        read: m.read,
      });
    });

  // Vacation request updates
  vacationRequests
    .filter(r => r.employeeId === myProfile?.id && r.status !== 'pending')
    .forEach(r => {
      const isApproved = r.status === 'approved';
      notifications.push({
        id: `vac-${r.id}`,
        type: 'vacation',
        icon: isApproved ? CheckCircle2 : XCircle,
        color: isApproved ? '#22c55e' : '#ef4444',
        title: `Verlof ${isApproved ? 'goedgekeurd' : 'afgewezen'}`,
        description: `${format(parseISO(r.start_date), 'd MMM', { locale: nl })} - ${format(parseISO(r.end_date), 'd MMM', { locale: nl })}`,
        date: r.reviewed_at || r.updated_date,
      });
    });

  // Swap request updates
  swapRequests
    .filter(r => r.requesterId === myProfile?.id && r.status !== 'pending')
    .forEach(r => {
      const isApproved = r.status === 'approved';
      const shift = shifts.find(s => s.id === r.shiftId);
      notifications.push({
        id: `swap-${r.id}`,
        type: 'swap',
        icon: isApproved ? CheckCircle2 : XCircle,
        color: isApproved ? '#22c55e' : '#ef4444',
        title: `Ruilverzoek ${isApproved ? 'goedgekeurd' : r.status === 'rejected' ? 'afgewezen' : r.status}`,
        description: shift ? `${format(parseISO(shift.date), 'd MMM', { locale: nl })} ${shift.start_time} - ${shift.end_time}` : '',
        date: r.reviewed_at || r.updated_date,
      });
    });

  // Sort by date descending
  notifications.sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="px-4 pb-4">
      <div className="py-3">
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Meldingen</h2>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{notifications.length} meldingen</p>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-15" style={{ color: 'var(--color-text-muted)' }} />
          <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Geen meldingen</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Je bent helemaal bij!</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map(n => {
            const Icon = n.icon;
            return (
              <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl"
                style={{ backgroundColor: n.read === false ? 'rgba(14,165,233,0.05)' : 'transparent' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${n.color}15` }}>
                  <Icon className="w-4 h-4" style={{ color: n.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{n.title}</p>
                  {n.description && (
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{n.description}</p>
                  )}
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {n.date ? format(new Date(n.date), 'd MMM HH:mm', { locale: nl }) : ''}
                  </p>
                </div>
                {n.read === false && (
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: 'var(--color-accent)' }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}