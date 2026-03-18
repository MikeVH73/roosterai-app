import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, ArrowLeftRight, Clock, CheckCircle2, XCircle, ChevronLeft, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';

const swapTypes = [
  { value: 'swap', label: 'Ruilen' },
  { value: 'give_away', label: 'Weggeven' },
  { value: 'take_over', label: 'Overnemen' },
];

const statusConfig = {
  pending: { label: 'In afwachting', color: '#fbbf24', icon: Clock },
  accepted_by_colleague: { label: 'Geaccepteerd', color: '#0ea5e9', icon: CheckCircle2 },
  approved: { label: 'Goedgekeurd', color: '#22c55e', icon: CheckCircle2 },
  rejected: { label: 'Afgewezen', color: '#ef4444', icon: XCircle },
  cancelled: { label: 'Geannuleerd', color: '#94a3b8', icon: XCircle },
};

export default function MobileRuilTab({ swapRequests = [], myProfile, companyId, shifts = [], employees = [], onBack }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formData, setFormData] = useState({ shiftId: '', targetEmployeeId: '', swap_type: 'swap', reason: '' });

  const myRequests = swapRequests.filter(r => r.requesterId === myProfile?.id)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const myShifts = [...shifts.filter(s => s.employeeId === myProfile?.id)]
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const getShift = (id) => shifts.find(s => s.id === id);
  const getEmployee = (id) => employees.find(e => e.id === id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await base44.entities.SwapRequest.create({
      ...formData, companyId, requesterId: myProfile?.id,
      targetEmployeeId: formData.targetEmployeeId || null,
    });
    queryClient.invalidateQueries(['swap-requests']);
    setSubmitting(false);
    setDialogOpen(false);
    setFormData({ shiftId: '', targetEmployeeId: '', swap_type: 'swap', reason: '' });
  };

  // Detail view
  if (selectedRequest) {
    const r = selectedRequest;
    const shift = getShift(r.shiftId);
    const target = r.targetEmployeeId ? getEmployee(r.targetEmployeeId) : null;
    const StatusIcon = statusConfig[r.status]?.icon || Clock;
    return (
      <div className="px-4 pb-4">
        <button onClick={() => setSelectedRequest(null)} className="flex items-center gap-1 py-3 text-sm"
          style={{ color: 'var(--color-accent)' }}>
          <ChevronLeft className="w-4 h-4" />Terug
        </button>
        <div className="rounded-xl p-4 space-y-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Badge style={{ backgroundColor: `${statusConfig[r.status]?.color}20`, color: statusConfig[r.status]?.color }}>
              <StatusIcon className="w-3 h-3 mr-1" />{statusConfig[r.status]?.label}
            </Badge>
            <Badge variant="outline">{swapTypes.find(t => t.value === r.swap_type)?.label}</Badge>
          </div>
          {shift && (
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Dienst</p>
              <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {format(parseISO(shift.date), 'EEEE d MMMM yyyy', { locale: nl })}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{shift.start_time} - {shift.end_time}</p>
            </div>
          )}
          {target && (
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Met collega</p>
              <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{target.first_name} {target.last_name}</p>
            </div>
          )}
          {r.reason && (
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Reden</p>
              <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{r.reason}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack}><ChevronLeft className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} /></button>
          )}
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Ruilverzoeken</h2>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}
          style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))', color: 'white' }}>
          <Plus className="w-4 h-4 mr-1" />Nieuw
        </Button>
      </div>

      {myRequests.length === 0 ? (
        <div className="text-center py-12">
          <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-15" style={{ color: 'var(--color-text-muted)' }} />
          <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Geen ruilverzoeken</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Dien je eerste verzoek in</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myRequests.map(r => {
            const shift = getShift(r.shiftId);
            const StatusIcon = statusConfig[r.status]?.icon || Clock;
            return (
              <button key={r.id} onClick={() => setSelectedRequest(r)}
                className="w-full text-left p-3 rounded-xl flex items-center gap-3"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${statusConfig[r.status]?.color}15` }}>
                  <StatusIcon className="w-5 h-5" style={{ color: statusConfig[r.status]?.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {swapTypes.find(t => t.value === r.swap_type)?.label}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {shift ? `${format(parseISO(shift.date), 'd MMM', { locale: nl })} ${shift.start_time}-${shift.end_time}` : 'Dienst onbekend'}
                  </p>
                </div>
                <Badge className="text-[10px] flex-shrink-0"
                  style={{ backgroundColor: `${statusConfig[r.status]?.color}15`, color: statusConfig[r.status]?.color, border: 'none' }}>
                  {statusConfig[r.status]?.label}
                </Badge>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="mx-4 max-w-sm">
          <DialogHeader><DialogTitle>Ruilverzoek indienen</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Dienst</Label>
              <Select value={formData.shiftId} onValueChange={v => setFormData({ ...formData, shiftId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecteer dienst" /></SelectTrigger>
                <SelectContent>
                  {myShifts.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {format(parseISO(s.date), 'EEE d MMM', { locale: nl })} {s.start_time}-{s.end_time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={formData.swap_type} onValueChange={v => setFormData({ ...formData, swap_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {swapTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Met collega (optioneel)</Label>
              <Select value={formData.targetEmployeeId} onValueChange={v => setFormData({ ...formData, targetEmployeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Iedereen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Iedereen (open)</SelectItem>
                  {employees.filter(e => e.id !== myProfile?.id).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reden (optioneel)</Label>
              <Textarea value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Annuleren</Button>
              <Button type="submit" disabled={submitting || !formData.shiftId} className="flex-1"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))', color: 'white' }}>
                {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Indienen
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}