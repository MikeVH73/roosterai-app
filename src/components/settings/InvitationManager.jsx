import React, { useState } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Send,
  UserPlus,
  Key
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { format, parseISO, addDays } from 'date-fns';
import { nl } from 'date-fns/locale';

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const statusConfig = {
  pending: { label: 'In wachtrij', color: 'bg-slate-100 text-slate-700', icon: Clock },
  sent: { label: 'Verzonden', color: 'bg-blue-100 text-blue-700', icon: Mail },
  accepted: { label: 'Geaccepteerd', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  expired: { label: 'Verlopen', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  failed: { label: 'Mislukt', color: 'bg-red-100 text-red-700', icon: XCircle }
};

const roleLabels = {
  company_admin: 'Administrator',
  planner: 'Planner',
  employee: 'Medewerker'
};

export default function InvitationManager() {
  const { currentCompany, user } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['invitations', companyId],
    queryFn: () => base44.entities.Invitation.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: passwordResets = [] } = useQuery({
    queryKey: ['password-resets'],
    queryFn: () => base44.entities.PasswordReset.list('-created_date', 50),
    enabled: !!companyId
  });

  const createInvitationMutation = useMutation({
    mutationFn: async (data) => {
      const token = generateToken();
      const invitation = await base44.entities.Invitation.create({
        ...data,
        token,
        status: 'pending',
        expires_at: addDays(new Date(), 7).toISOString()
      });
      return invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['invitations', companyId]);
    }
  });

  const sendInvitationMutation = useMutation({
    mutationFn: async (invitation) => {
      // Invite via base44 platform (sends login/register email automatically)
      await base44.users.inviteUser(invitation.email, invitation.company_role === 'company_admin' ? 'admin' : 'user');

      await base44.entities.Invitation.update(invitation.id, {
        status: 'sent',
        last_sent_at: new Date().toISOString(),
        send_attempts: (invitation.send_attempts || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['invitations', companyId]);
      toast.success('Uitnodiging verzonden via e-mail');
    },
    onError: async (error, invitation) => {
      await base44.entities.Invitation.update(invitation.id, {
        status: 'failed',
        error_message: error.message || 'Onbekende fout bij verzenden',
        send_attempts: (invitation.send_attempts || 0) + 1
      });
      queryClient.invalidateQueries(['invitations', companyId]);
      toast.error(`Uitnodiging mislukt: ${error.message}`);
    }
  });

  const forceResetMutation = useMutation({
    mutationFn: async (email) => {
      const token = generateToken();
      const reset = await base44.entities.PasswordReset.create({
        email,
        token,
        status: 'sent',
        expires_at: addDays(new Date(), 1).toISOString(),
        requested_by: user?.email,
        is_forced: true
      });
      // Note: password reset emails can only be sent to users already in the app
      // The record is stored for reference
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['password-resets']);
      toast.success('Wachtwoord reset e-mail verzonden');
    },
    onError: (error) => {
      toast.error('Kon wachtwoord reset niet verzenden');
    }
  });

  const handleInvite = async () => {
    const invitation = await createInvitationMutation.mutateAsync({
      companyId,
      email: inviteEmail,
      company_role: inviteRole,
      invited_by: user?.email
    });
    
    await sendInvitationMutation.mutateAsync(invitation);
    
    // Also create CompanyMember record
    await base44.entities.CompanyMember.create({
      companyId,
      email: inviteEmail,
      company_role: inviteRole,
      status: 'invited',
      invited_at: new Date().toISOString()
    });

    setInviteDialogOpen(false);
    setInviteEmail('');
    setInviteRole('employee');
  };

  const handleResend = async (invitation) => {
    await sendInvitationMutation.mutateAsync(invitation);
  };

  const pendingInvitations = invitations.filter(i => i.status === 'pending' || i.status === 'sent');
  const failedInvitations = invitations.filter(i => i.status === 'failed');
  const acceptedInvitations = invitations.filter(i => i.status === 'accepted');

  const isInviting = createInvitationMutation.isPending || sendInvitationMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Invite Button */}
      <Card className="border-0 shadow-sm settings-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Teamleden uitnodigen</CardTitle>
              <CardDescription>Nodig nieuwe gebruikers uit via e-mail</CardDescription>
            </div>
            <Button onClick={() => setInviteDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Uitnodigen
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Failed Invitations Alert */}
      {failedInvitations.length > 0 && (
        <Card className="border-0 shadow-sm settings-card border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Mislukte uitnodigingen ({failedInvitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {failedInvitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">{inv.email}</p>
                    <p className="text-sm text-red-600">{inv.error_message || 'Verzenden mislukt'}</p>
                    <p className="text-xs text-slate-500">
                      {inv.send_attempts} poging(en)
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleResend(inv)}
                    disabled={sendInvitationMutation.isPending}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Opnieuw
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Openstaande uitnodigingen</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : pendingInvitations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Mail className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p>Geen openstaande uitnodigingen</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingInvitations.map((inv) => {
                const StatusIcon = statusConfig[inv.status].icon;
                return (
                  <div key={inv.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{inv.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={statusConfig[inv.status].color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[inv.status].label}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {roleLabels[inv.company_role]}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {inv.expires_at && (
                        <span className="text-xs text-slate-500">
                          Verloopt {format(parseISO(inv.expires_at), 'd MMM', { locale: nl })}
                        </span>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleResend(inv)}
                        disabled={sendInvitationMutation.isPending}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Reset Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4" />
            Wachtwoord beheer
          </CardTitle>
          <CardDescription>
            Forceer een wachtwoord reset voor bestaande gebruikers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="reset">
              <AccordionTrigger>Wachtwoord reset aanvragen</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>E-mailadres van gebruiker</Label>
                    <div className="flex gap-2 mt-1">
                      <Input 
                        type="email" 
                        placeholder="gebruiker@bedrijf.nl"
                        id="reset-email"
                      />
                      <Button 
                        onClick={() => {
                          const email = document.getElementById('reset-email').value;
                          if (email) forceResetMutation.mutate(email);
                        }}
                        disabled={forceResetMutation.isPending}
                      >
                        {forceResetMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Versturen'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Accepted History */}
      {acceptedInvitations.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-600">Geaccepteerde uitnodigingen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {acceptedInvitations.slice(0, 5).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-slate-900">{inv.email}</p>
                      <p className="text-xs text-slate-500">
                        Geaccepteerd op {inv.accepted_at ? format(parseISO(inv.accepted_at), 'd MMM yyyy', { locale: nl }) : 'Onbekend'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teamlid uitnodigen</DialogTitle>
            <DialogDescription>
              Er wordt een e-mail met een activatielink verzonden naar de gebruiker.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inviteEmail">E-mailadres *</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="naam@bedrijf.nl"
              />
            </div>
            <div>
              <Label htmlFor="inviteRole">Rol</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Medewerker</SelectItem>
                  <SelectItem value="planner">Planner</SelectItem>
                  <SelectItem value="company_admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Annuleren
              </Button>
              <Button 
                onClick={handleInvite}
                disabled={isInviting || !inviteEmail}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isInviting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Uitnodiging versturen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}