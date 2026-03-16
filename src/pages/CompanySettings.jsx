import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import {
  Building2,
  Settings,
  Bell,
  Sparkles,
  Clock,
  Save,
  Loader2,
  Users,
  Mail,
  UserPlus,
  Crown,
  ArrowRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";
import InvitationManager from '@/components/settings/InvitationManager';

export default function CompanySettings() {
  const { currentCompany, refreshCompany, hasPermission } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const [companyData, setCompanyData] = useState({
    name: '',
    address: '',
    phone: '',
    billing_email: ''
  });

  const [settingsData, setSettingsData] = useState({
    planning_rules: {
      min_rest_hours: 11,
      max_hours_per_week: 40,
      max_consecutive_days: 6,
      min_break_duration: 30
    },
    ai_preferences: {
      auto_suggest: true,
      prefer_fulltime_first: true,
      consider_travel_time: false,
      balance_workload: true
    },
    notification_settings: {
      email_new_schedule: true,
      email_shift_changes: true,
      email_vacation_updates: true
    }
  });

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings', companyId],
    queryFn: async () => {
      const settings = await base44.entities.CompanySettings.filter({ companyId });
      return settings[0];
    },
    enabled: !!companyId
  });



  useEffect(() => {
    if (currentCompany) {
      setCompanyData({
        name: currentCompany.name || '',
        address: currentCompany.address || '',
        phone: currentCompany.phone || '',
        billing_email: currentCompany.billing_email || ''
      });
    }
  }, [currentCompany]);

  useEffect(() => {
    if (companySettings) {
      setSettingsData({
        planning_rules: { ...settingsData.planning_rules, ...companySettings.planning_rules },
        ai_preferences: { ...settingsData.ai_preferences, ...companySettings.ai_preferences },
        notification_settings: { ...settingsData.notification_settings, ...companySettings.notification_settings }
      });
    }
  }, [companySettings]);

  const updateCompanyMutation = useMutation({
    mutationFn: (data) => base44.entities.Company.update(companyId, data),
    onSuccess: () => {
      refreshCompany();
      toast.success('Bedrijfsgegevens opgeslagen');
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (companySettings) {
        return base44.entities.CompanySettings.update(companySettings.id, data);
      } else {
        return base44.entities.CompanySettings.create({ ...data, companyId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['company-settings', companyId]);
      toast.success('Instellingen opgeslagen');
    }
  });

  const handleSaveCompany = () => {
    updateCompanyMutation.mutate(companyData);
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settingsData);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopBar 
        title="Instellingen" 
        subtitle={currentCompany?.name}
      />

      <style>{`
        .settings-container label,
        .settings-container [class*="CardTitle"] {
          color: var(--color-text-primary) !important;
        }
        .settings-container [class*="CardDescription"],
        .settings-container p.text-sm {
          color: var(--color-text-muted) !important;
        }
        .settings-container input {
          background-color: var(--color-surface) !important;
          color: var(--color-text-primary) !important;
          border-color: var(--color-border) !important;
        }
        .settings-container .settings-card {
          background-color: var(--color-surface) !important;
          border-color: var(--color-border) !important;
        }
      `}</style>

      <div className="p-6 max-w-4xl mx-auto settings-container">
        <Tabs defaultValue="company">
          <TabsList className="mb-6">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Bedrijf
            </TabsTrigger>
            <TabsTrigger value="planning" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Planning
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notificaties
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Abonnement
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <Card className="border-0 shadow-sm settings-card">
              <CardHeader>
                <CardTitle>Bedrijfsgegevens</CardTitle>
                <CardDescription>Basis informatie over je organisatie</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Bedrijfsnaam</Label>
                  <Input
                    id="name"
                    value={companyData.name}
                    onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Adres</Label>
                  <Input
                    id="address"
                    value={companyData.address}
                    onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Telefoonnummer</Label>
                    <Input
                      id="phone"
                      value={companyData.phone}
                      onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billing_email">Facturatie e-mail</Label>
                    <Input
                      id="billing_email"
                      type="email"
                      value={companyData.billing_email}
                      onChange={(e) => setCompanyData({ ...companyData, billing_email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <Button 
                    onClick={handleSaveCompany}
                    disabled={updateCompanyMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updateCompanyMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Opslaan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planning">
            <Card className="border-0 shadow-sm settings-card">
              <CardHeader>
                <CardTitle>Planning regels</CardTitle>
                <CardDescription>Stel regels in voor de roosterplanning</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="min_rest_hours">Minimale rust tussen diensten (uren)</Label>
                    <Input
                      id="min_rest_hours"
                      type="number"
                      value={settingsData.planning_rules.min_rest_hours}
                      onChange={(e) => setSettingsData({
                        ...settingsData,
                        planning_rules: { ...settingsData.planning_rules, min_rest_hours: parseInt(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_hours_per_week">Maximale uren per week</Label>
                    <Input
                      id="max_hours_per_week"
                      type="number"
                      value={settingsData.planning_rules.max_hours_per_week}
                      onChange={(e) => setSettingsData({
                        ...settingsData,
                        planning_rules: { ...settingsData.planning_rules, max_hours_per_week: parseInt(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_consecutive_days">Maximaal opeenvolgende werkdagen</Label>
                    <Input
                      id="max_consecutive_days"
                      type="number"
                      value={settingsData.planning_rules.max_consecutive_days}
                      onChange={(e) => setSettingsData({
                        ...settingsData,
                        planning_rules: { ...settingsData.planning_rules, max_consecutive_days: parseInt(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="min_break_duration">Minimale pauze (minuten)</Label>
                    <Input
                      id="min_break_duration"
                      type="number"
                      value={settingsData.planning_rules.min_break_duration}
                      onChange={(e) => setSettingsData({
                        ...settingsData,
                        planning_rules: { ...settingsData.planning_rules, min_break_duration: parseInt(e.target.value) }
                      })}
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <Button 
                    onClick={handleSaveSettings}
                    disabled={updateSettingsMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updateSettingsMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Opslaan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card className="border-0 shadow-sm settings-card">
              <CardHeader>
                <CardTitle>AI Voorkeuren</CardTitle>
                <CardDescription>Pas aan hoe de AI assistent werkt</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Automatisch suggesties geven</Label>
                    <p className="text-sm text-slate-500">De AI geeft proactief suggesties voor verbeteringen</p>
                  </div>
                  <Switch
                    checked={settingsData.ai_preferences.auto_suggest}
                    onCheckedChange={(checked) => setSettingsData({
                      ...settingsData,
                      ai_preferences: { ...settingsData.ai_preferences, auto_suggest: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Fulltime medewerkers eerst</Label>
                    <p className="text-sm text-slate-500">Geef voorrang aan fulltime medewerkers bij het invullen van diensten</p>
                  </div>
                  <Switch
                    checked={settingsData.ai_preferences.prefer_fulltime_first}
                    onCheckedChange={(checked) => setSettingsData({
                      ...settingsData,
                      ai_preferences: { ...settingsData.ai_preferences, prefer_fulltime_first: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Werklast balanceren</Label>
                    <p className="text-sm text-slate-500">Verdeel diensten gelijkmatig over medewerkers</p>
                  </div>
                  <Switch
                    checked={settingsData.ai_preferences.balance_workload}
                    onCheckedChange={(checked) => setSettingsData({
                      ...settingsData,
                      ai_preferences: { ...settingsData.ai_preferences, balance_workload: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Reistijd meenemen</Label>
                    <p className="text-sm text-slate-500">Houd rekening met reistijd tussen locaties</p>
                  </div>
                  <Switch
                    checked={settingsData.ai_preferences.consider_travel_time}
                    onCheckedChange={(checked) => setSettingsData({
                      ...settingsData,
                      ai_preferences: { ...settingsData.ai_preferences, consider_travel_time: checked }
                    })}
                  />
                </div>
                <div className="pt-4">
                  <Button 
                    onClick={handleSaveSettings}
                    disabled={updateSettingsMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updateSettingsMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Opslaan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="border-0 shadow-sm settings-card">
              <CardHeader>
                <CardTitle>Notificatie voorkeuren</CardTitle>
                <CardDescription>Bepaal welke e-mails medewerkers ontvangen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Nieuw rooster gepubliceerd</Label>
                    <p className="text-sm text-slate-500">Medewerkers krijgen een e-mail als een nieuw rooster gepubliceerd wordt</p>
                  </div>
                  <Switch
                    checked={settingsData.notification_settings.email_new_schedule}
                    onCheckedChange={(checked) => setSettingsData({
                      ...settingsData,
                      notification_settings: { ...settingsData.notification_settings, email_new_schedule: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Dienstwijzigingen</Label>
                    <p className="text-sm text-slate-500">Medewerkers krijgen een e-mail bij wijzigingen in hun diensten</p>
                  </div>
                  <Switch
                    checked={settingsData.notification_settings.email_shift_changes}
                    onCheckedChange={(checked) => setSettingsData({
                      ...settingsData,
                      notification_settings: { ...settingsData.notification_settings, email_shift_changes: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Verlofupdates</Label>
                    <p className="text-sm text-slate-500">Medewerkers krijgen een e-mail over de status van hun verlofaanvragen</p>
                  </div>
                  <Switch
                    checked={settingsData.notification_settings.email_vacation_updates}
                    onCheckedChange={(checked) => setSettingsData({
                      ...settingsData,
                      notification_settings: { ...settingsData.notification_settings, email_vacation_updates: checked }
                    })}
                  />
                </div>
                <div className="pt-4">
                  <Button 
                    onClick={handleSaveSettings}
                    disabled={updateSettingsMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updateSettingsMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Opslaan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <InvitationManager />
          </TabsContent>

          <TabsContent value="subscription">
            <Card className="border-0 shadow-sm settings-card">
              <CardHeader>
                <CardTitle>Abonnement</CardTitle>
                <CardDescription>Overzicht van je huidige abonnement en limieten</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'var(--color-surface-light)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Huidig plan</p>
                    <p className="text-xl font-bold capitalize mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{currentCompany?.subscription_plan || 'starter'}</p>
                  </div>
                  <Crown className="w-8 h-8" style={{ color: '#38bdf8' }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-surface-light)' }}>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Max. medewerkers</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>{currentCompany?.max_users || 10}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-surface-light)' }}>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>AI acties/maand</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>{currentCompany?.ai_actions_limit || 300}</p>
                  </div>
                </div>
                <Link to="/Abonnementen">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    Bekijk & upgrade abonnement
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}