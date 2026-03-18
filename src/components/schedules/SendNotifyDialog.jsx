import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Check, MessageCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const NOTIFICATION_TYPES = [
  {
    id: 'rooster_gepubliceerd',
    label: '📋 Rooster gepubliceerd',
    description: 'Laat medewerkers weten dat er een nieuw rooster klaarstaat',
    periodLabel: (scheduleName) => `rooster "${scheduleName}"`,
    rosterUrl: 'Bekijk je rooster in de app of vraag de Planning Assistent.',
  },
  {
    id: 'dienst_herinnering',
    label: '⏰ Dienstherinnering',
    description: 'Herinner medewerkers aan hun dienst van morgen',
    periodLabel: (scheduleName) => `je dienst morgen (${scheduleName})`,
    rosterUrl: 'Controleer je dienst in de app of vraag de Planning Assistent.',
  },
  {
    id: 'rooster_gewijzigd',
    label: '🔄 Roosterwijziging',
    description: 'Informeer medewerkers over een wijziging in het rooster',
    periodLabel: (scheduleName) => `gewijzigd rooster "${scheduleName}"`,
    rosterUrl: 'Bekijk de wijzigingen in de app of vraag de Planning Assistent.',
  },
  {
    id: 'algemene_melding',
    label: '🔔 Algemene melding',
    description: 'Stuur een algemene update naar medewerkers',
    periodLabel: (scheduleName) => `update voor ${scheduleName}`,
    rosterUrl: 'Neem contact op met de planner voor meer info.',
  },
];

function getInitials(first, last) {
  return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
}

export default function SendNotifyDialog({ open, onOpenChange, employees = [], scheduleId, scheduleName = 'dit rooster', companyId }) {
  const [selected, setSelected] = useState([]);
  const [sending, setSending] = useState(false);
  const [notificationType, setNotificationType] = useState('algemene_melding');

  useEffect(() => {
    if (open) {
      setSelected([]);
      setNotificationType('algemene_melding');
    }
  }, [open]);

  const connectedEmployees = employees.filter(e => e.whatsapp_opt_in);
  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const selectAll = () => setSelected(connectedEmployees.map(e => e.id));
  const selectNone = () => setSelected([]);

  const handleSend = async () => {
    if (selected.length === 0) {
      onOpenChange(false);
      return;
    }

    setSending(true);
    const toNotify = employees.filter(e => selected.includes(e.id));
    let successCount = 0;
    const selectedType = NOTIFICATION_TYPES.find(t => t.id === notificationType) || NOTIFICATION_TYPES[3];

    for (const emp of toNotify) {
      try {
        await base44.functions.invoke('sendWhatsAppMessage', {
          phoneNumber: emp.phone,
          employeeName: `${emp.first_name} ${emp.last_name}`,
          periodLabel: selectedType.periodLabel(scheduleName),
          rosterUrl: selectedType.rosterUrl,
          companyId,
          scheduleId,
          subject: selectedType.label,
        });
        successCount++;
      } catch {
        // continue
      }
    }

    setSending(false);
    if (successCount > 0) toast.success(`${successCount} medewerker${successCount > 1 ? 's' : ''} genotificeerd via WhatsApp`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            WhatsApp bericht sturen
          </DialogTitle>
          <DialogDescription>
            Stuur een WhatsApp-bericht naar verbonden medewerkers voor dit rooster.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Notification type selector */}
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Type melding:</p>
            <div className="grid grid-cols-2 gap-2">
              {NOTIFICATION_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setNotificationType(type.id)}
                  className="text-left p-3 rounded-lg border-2 transition-all text-xs"
                  style={{
                    borderColor: notificationType === type.id ? '#38bdf8' : 'var(--color-border)',
                    backgroundColor: notificationType === type.id ? 'rgba(56,189,248,0.08)' : 'var(--color-surface-light)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {connectedEmployees.length === 0 ? (
            <div className="rounded-lg p-4 text-center" style={{ backgroundColor: 'var(--color-surface-light)' }}>
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Geen verbonden medewerkers</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Nodig medewerkers uit via de WhatsApp-knop om ze notificaties te kunnen sturen.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Stuur naar:
                </p>
                <div className="flex gap-2">
                  <button className="text-xs text-blue-500 hover:underline" onClick={selectAll}>Iedereen</button>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>·</span>
                  <button className="text-xs text-blue-500 hover:underline" onClick={selectNone}>Niemand</button>
                </div>
              </div>
              {connectedEmployees.map((emp) => {
                const isSelected = selected.includes(emp.id);
                return (
                  <div
                    key={emp.id}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
                    style={{
                      backgroundColor: isSelected ? 'rgba(22,163,74,0.1)' : 'var(--color-surface-light)',
                      border: `1px solid ${isSelected ? 'rgba(22,163,74,0.4)' : 'transparent'}`
                    }}
                    onClick={() => toggle(emp.id)}
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                      style={{
                        borderColor: isSelected ? '#16a34a' : 'var(--color-border)',
                        backgroundColor: isSelected ? '#16a34a' : 'transparent'
                      }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={emp.avatar_url} />
                      <AvatarFallback className="text-xs text-white" style={{ background: emp.color || 'linear-gradient(135deg, #38bdf8 0%, #94a3b8 100%)' }}>
                        {getInitials(emp.first_name, emp.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{emp.phone}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 text-xs flex-shrink-0">
                      <MessageCircle className="w-3 h-3 mr-1" /> Verbonden
                    </Badge>
                  </div>
                );
              })}
              {employees.filter(e => !e.whatsapp_opt_in).length > 0 && (
                <p className="text-xs pt-1" style={{ color: 'var(--color-text-muted)' }}>
                  + {employees.filter(e => !e.whatsapp_opt_in).length} medewerker(s) nog niet verbonden via WhatsApp
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="pt-4 border-t gap-2" style={{ borderColor: 'var(--color-border)' }}>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Annuleren
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || selected.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {sending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Bezig...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" />
                Stuur naar {selected.length} medewerker{selected.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}