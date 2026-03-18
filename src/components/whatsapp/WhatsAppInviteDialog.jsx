import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Check, Send, Users, ExternalLink, Copy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function getInitials(first, last) {
  return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
}

export default function WhatsAppInviteDialog({ open, onOpenChange, employees = [] }) {
  const [copiedId, setCopiedId] = useState(null);

  const agentWhatsAppUrl = base44.agents.getWhatsAppConnectURL('planning_assistent');

  const employeesWithPhone = employees.filter(e => e.phone && e.whatsapp_opt_in);
  const employeesWithoutOptIn = employees.filter(e => !e.whatsapp_opt_in);

  const handleCopyLink = async (emp) => {
    try {
      await navigator.clipboard.writeText(agentWhatsAppUrl);
      setCopiedId(emp.id);
      toast.success(`Link gekopieerd voor ${emp.first_name}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Kopiëren mislukt');
    }
  };

  const handleOpenWhatsApp = (emp) => {
    // Open WhatsApp with pre-filled message to employee
    if (!emp.phone) {
      toast.error(`${emp.first_name} heeft geen telefoonnummer`);
      return;
    }
    const phone = emp.phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `Hoi ${emp.first_name}! 👋\n\nJe kunt voortaan je rooster, dienstruilverzoeken en verlof regelen via WhatsApp met onze Planning Assistent.\n\nKlik op deze link om te verbinden:\n${agentWhatsAppUrl}`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handleInviteAll = () => {
    window.open(agentWhatsAppUrl, '_blank');
    toast.success('WhatsApp uitnodigingslink geopend — stuur deze door aan je medewerkers');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            WhatsApp Uitnodigingen
          </DialogTitle>
          <DialogDescription>
            Nodig medewerkers uit om via WhatsApp te chatten met de Planning Assistent. Ze kunnen dan hun rooster inzien, diensten ruilen en verlof aanvragen — rechtstreeks vanuit hun telefoon.
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="flex gap-3 py-2">
          <div className="flex-1 rounded-lg p-3 text-center" style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}>
            <div className="text-2xl font-bold text-green-600">{employeesWithPhone.length}</div>
            <div className="text-xs text-green-700">Verbonden</div>
          </div>
          <div className="flex-1 rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--color-surface-light)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{employeesWithoutOptIn.length}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Nog niet verbonden</div>
          </div>
          <div className="flex-1 rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--color-surface-light)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{employees.length}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Totaal</div>
          </div>
        </div>

        {/* Invite all button */}
        <div className="rounded-lg p-3 border flex items-center justify-between gap-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-light)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Iedereen tegelijk uitnodigen</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Kopieer de uitnodigingslink en deel hem zelf (bijv. in een groepschat)</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(agentWhatsAppUrl); toast.success('Link gekopieerd!'); }}>
              <Copy className="w-4 h-4 mr-1" /> Kopieer link
            </Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleInviteAll}>
              <Users className="w-4 h-4 mr-1" /> Open link
            </Button>
          </div>
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Individueel uitnodigen
          </p>
          {employees.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>Geen medewerkers gevonden</div>
          ) : (
            employees.map((emp) => {
              const isConnected = emp.whatsapp_opt_in;
              const hasPhone = !!emp.phone;
              return (
                <div
                  key={emp.id}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--color-surface-light)' }}
                >
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarImage src={emp.avatar_url} />
                    <AvatarFallback className="text-xs text-white" style={{ background: emp.color || 'linear-gradient(135deg, #38bdf8 0%, #94a3b8 100%)' }}>
                      {getInitials(emp.first_name, emp.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {emp.first_name} {emp.last_name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {hasPhone ? emp.phone : 'Geen telefoonnummer'}
                    </p>
                  </div>
                  {isConnected ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200 flex-shrink-0">
                      <Check className="w-3 h-3 mr-1" /> Verbonden
                    </Badge>
                  ) : (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyLink(emp)}
                      >
                        {copiedId === emp.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        size="sm"
                        disabled={!hasPhone}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleOpenWhatsApp(emp)}
                      >
                        <Send className="w-3.5 h-3.5 mr-1" /> Stuur uitnodiging
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="pt-3 border-t flex justify-between items-center" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Medewerkers chatten met de Planning Assistent via een apart WhatsApp-nummer van Base44
          </p>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Sluiten</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}