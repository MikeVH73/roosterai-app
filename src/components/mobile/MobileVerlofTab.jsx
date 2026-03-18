import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Calendar, Clock, CheckCircle2, XCircle, ChevronLeft, Loader2 } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';

const requestTypes = [
  { value: 'vacation', label: 'Vakantie' },
  { value: 'sick', label: 'Ziekte' },
  { value: 'personal', label: 'Persoonlijk' },
  { value: 'unpaid', label: 'Onbetaald verlof' },
  { value: 'parental', label: 'Ouderschapsverlof' },
  { value: 'other', label: 'Anders' },
];

const statusConfig = {
  pending: { label: 'In afwachting', color: '#fbbf24', icon: Clock },
  approved: { label: 'Goedgekeurd', color: '#22c55e', icon: CheckCircle2 },
  rejected: { label: 'Afgewezen', color: '#ef4444', icon: XCircle },
  cancelled: { label: 'Geannuleerd', color: '#94a3b8', icon: XCircle },
};

export default function MobileVerlofTab({ vacationRequests = [], myProfile, companyId, onBack }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formData, setFormData] = useState({ start_date: '', end_date: '', type: 'vacation', reason: '' });

  const myRequests = vacationRequests.filter(r => r.employeeId === myProfile?.id)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await base44.entities.VacationRequest.create({
      ...formData, companyId, employeeId: myProfile?.id,
    });
    queryClient.invalidateQueries(['vacation-requests']);
    setSubmitting(false);
    setDialogOpen(false);
    setFormData({ start_date: '', end_date: '', type: 'vacation', reason: '' });
  };

  // Detail view
  if (selectedRequest) {
    const r = selectedRequest;
    const StatusIcon = statusConfig[r.status]?.icon || Clock;
    const days = differenceInDays(parseISO(r.end_date), parseISO(r.start_date)) + 1;
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
            <Badge variant="outline">{requestTypes.find(t => t.value === r.type)?.label}</Badge>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Periode</p>
            <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {format(parseISO(r.start_date), 'd MMMM yyyy', { locale: nl })} - {format(parseISO(r.end_date), 'd MMMM yyyy', { locale: nl })}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{days} dag{days !== 1 ? 'en' : ''}</p>
          </div>
          {r.reason && (
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Reden</p>
              <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{r.reason}</p>
            </div>
          )}
          <div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Ingediend op</p>
            <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
              {format(new Date(r.created_date), 'd MMMM yyyy HH:mm', { locale: nl })}
            </p>
          </div>
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
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Verlofaanvragen</h2>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}
          style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))', color: 'white' }}>
          <Plus className="w-4 h-4 mr-1" />Nieuw
        </Button>
      </div>

      {myRequests.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-15" style={{ color: 'var(--color-text-muted)' }} />
          <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Geen verlofaanvragen</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Vraag je eerste verlof aan</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myRequests.map(r => {
            const StatusIcon = statusConfig[r.status]?.icon || Clock;
            const days = differenceInDays(parseISO(r.end_date), parseISO(r.start_date)) + 1;
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
                    {requestTypes.find(t => t.value === r.type)?.label}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {format(parseISO(r.start_date), 'd MMM', { locale: nl })} - {format(parseISO(r.end_date), 'd MMM', { locale: nl })} · {days}d
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
          <DialogHeader><DialogTitle>Verlof aanvragen</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Type verlof</Label>
              <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {requestTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Van</Label>
                <Input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} required />
              </div>
              <div>
                <Label>Tot</Label>
                <Input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} required />
              </div>
            </div>
            <div>
              <Label>Reden (optioneel)</Label>
              <Textarea value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Annuleren</Button>
              <Button type="submit" disabled={submitting} className="flex-1"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))', color: 'white' }}>
                {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Aanvragen
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}