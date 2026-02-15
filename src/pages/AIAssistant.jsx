import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import AgentChat from '@/components/agents/AgentChat';
import WhatsAppConfirmDialog from '@/components/ai/WhatsAppConfirmDialog';
import {
  Sparkles,
  UserX,
  Zap,
  AlertTriangle,
  GitBranch,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  ArrowRight,
  Info,
  MessageCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';

const aiActions = [
  {
    id: 'replacement',
    title: 'Vervanging zoeken',
    description: 'Vind een geschikte vervanger voor een uitgevallen medewerker',
    icon: UserX,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  {
    id: 'optimization',
    title: 'Rooster optimaliseren',
    description: 'Optimaliseer het rooster voor efficiëntie en werklast',
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'conflict_resolution',
    title: 'Conflicten detecteren',
    description: 'Identificeer en los planningsconflicten op',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  {
    id: 'alternative_schedule',
    title: 'Alternatieven genereren',
    description: 'Genereer alternatieve roosteropties',
    icon: GitBranch,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  }
];

export default function AIAssistant() {
  const { currentCompany, canUseAI, incrementAIUsage, hasPermission } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const preSelectedScheduleId = urlParams.get('scheduleId');

  const [activeTab, setActiveTab] = useState('chat');
  const [selectedAction, setSelectedAction] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionParams, setActionParams] = useState({
    scheduleId: preSelectedScheduleId || '',
    employeeId: '',
    date: '',
    notes: ''
  });
  const [whatsappDialog, setWhatsappDialog] = useState({
    open: false,
    employees: [],
    message: '',
    context: ''
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => base44.entities.Schedule.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => base44.entities.EmployeeProfile.filter({ companyId, status: 'active' }),
    enabled: !!companyId
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', companyId],
    queryFn: () => base44.entities.Shift.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ['ai-suggestions', companyId],
    queryFn: () => base44.entities.AISuggestion.filter({ companyId }),
    enabled: !!companyId
  });

  const createSuggestionMutation = useMutation({
    mutationFn: (data) => base44.entities.AISuggestion.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ai-suggestions', companyId]);
    }
  });

  const updateSuggestionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AISuggestion.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ai-suggestions', companyId]);
    }
  });

  const activeSchedules = schedules.filter(s => s.status !== 'archived');
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const historySuggestions = suggestions.filter(s => s.status !== 'pending');

  const openActionDialog = (action) => {
    setSelectedAction(action);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedAction(null);
    setActionParams({
      scheduleId: preSelectedScheduleId || '',
      employeeId: '',
      date: '',
      notes: ''
    });
  };

  const handleExecuteAction = async () => {
    if (!canUseAI()) {
      alert('Je hebt het limiet voor AI-acties bereikt deze maand.');
      return;
    }

    setIsProcessing(true);
    
    // Get context data
    const selectedSchedule = schedules.find(s => s.id === actionParams.scheduleId);
    const scheduleShifts = shifts.filter(s => s.scheduleId === actionParams.scheduleId);
    const selectedEmployee = employees.find(e => e.id === actionParams.employeeId);
    
    // Build context for AI
    const context = {
      action: selectedAction.id,
      schedule: selectedSchedule,
      shifts: scheduleShifts,
      employees: employees,
      targetEmployee: selectedEmployee,
      targetDate: actionParams.date,
      notes: actionParams.notes
    };

    const prompts = {
      replacement: `Je bent een roostering-assistent voor ${currentCompany?.name}. 
        Analyseer de situatie en suggereer de beste vervangers voor de uitgevallen medewerker.
        
        Uitgevallen medewerker: ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}
        Datum: ${actionParams.date}
        Extra informatie: ${actionParams.notes}
        
        Beschikbare medewerkers en hun contracten:
        ${employees.filter(e => e.id !== actionParams.employeeId).map(e => 
          `- ${e.first_name} ${e.last_name}: ${e.contract_hours || 'flex'}u/week, ${e.contract_type}`
        ).join('\n')}
        
        Geef 3 suggesties voor vervangers, met overwegingen voor elke keuze.`,
      
      optimization: `Je bent een roostering-assistent voor ${currentCompany?.name}.
        Analyseer het rooster en geef optimalisatiesuggesties.
        
        Rooster: ${selectedSchedule?.name}
        Periode: ${selectedSchedule?.start_date} tot ${selectedSchedule?.end_date}
        Aantal diensten: ${scheduleShifts.length}
        
        Analyseer de werklast verdeling en geef suggesties voor verbeteringen.`,
      
      conflict_resolution: `Je bent een roostering-assistent voor ${currentCompany?.name}.
        Detecteer mogelijke conflicten in het rooster.
        
        Rooster: ${selectedSchedule?.name}
        Check op: overuren, te weinig rust tussen diensten, onderbezetting.
        
        Geef een overzicht van gevonden problemen en oplossingen.`,
      
      alternative_schedule: `Je bent een roostering-assistent voor ${currentCompany?.name}.
        Genereer een alternatief roostervoorstel.
        
        Huidige rooster: ${selectedSchedule?.name}
        Wensen: ${actionParams.notes}
        
        Geef een alternatief roostervoorstel met onderbouwing.`
    };

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompts[selectedAction.id],
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string", description: "Korte samenvatting van de suggestie" },
            considerations: { 
              type: "array", 
              items: { type: "string" },
              description: "Lijst met overwegingen"
            },
            suggested_changes: {
              type: "object",
              description: "Voorgestelde wijzigingen als object",
              properties: {
                replacements: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      employeeId: { type: "string", description: "Employee ID" },
                      name: { type: "string" },
                      reasoning: { type: "string" }
                    }
                  }
                }
              }
            },
            impact_score: { type: "number", description: "Impact score van 0 tot 100" },
            confidence_score: { type: "number", description: "Betrouwbaarheid van 0 tot 100" }
          }
        }
      });

      // Create AI suggestion record with WhatsApp info
      const suggestionData = {
        companyId,
        scheduleId: actionParams.scheduleId,
        context_type: selectedAction.id,
        trigger: 'manual',
        description: response.description || `AI suggestie voor ${selectedAction.title}`,
        suggested_patch: response.suggested_changes || {},
        considerations: response.considerations || [],
        impact_score: response.impact_score || 50,
        confidence_score: response.confidence_score || 70,
        status: 'pending'
      };

      await createSuggestionMutation.mutateAsync(suggestionData);

      await incrementAIUsage();
      closeDialog();
    } catch (error) {
      console.error('AI error:', error);
      alert('Er ging iets mis bij het verwerken van je verzoek.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuggestionAction = async (suggestion, action) => {
    await updateSuggestionMutation.mutateAsync({
      id: suggestion.id,
      data: {
        status: action,
        processed_at: new Date().toISOString()
      }
    });
  };

  const getScheduleName = (id) => {
    return schedules.find(s => s.id === id)?.name || 'Onbekend rooster';
  };

  const contextTypeLabels = {
    replacement: 'Vervanging',
    optimization: 'Optimalisatie',
    conflict_resolution: 'Conflict',
    alternative_schedule: 'Alternatief'
  };

  const aiLimitReached = !canUseAI();

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar 
        title="AI Assistent" 
        subtitle="Slimme roosterondersteuning"
      />

      <div className="p-6 max-w-7xl mx-auto">
        {/* AI Usage Banner */}
        <Card className="mb-6 border-0 shadow-sm text-white" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 50%, var(--color-accent) 100%)' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">AI-gestuurde roostering</h3>
                  <p className="text-white/80 text-sm">
                    Laat AI je helpen met vervangers zoeken, conflicten oplossen en roosters optimaliseren.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/80">Acties deze maand</p>
                <p className="text-2xl font-bold">
                  {currentCompany?.ai_actions_used || 0} / {currentCompany?.ai_actions_limit || 300}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {aiLimitReached && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Je hebt het limiet voor AI-acties bereikt deze maand. Upgrade je abonnement voor meer acties.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-6 rounded-xl p-1" style={{ backgroundColor: 'var(--color-surface-light)' }}>
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('chat')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:opacity-80"
                style={activeTab === 'chat' ? {
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(56, 189, 248, 0.3)'
                } : {
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'transparent'
                }}
              >
                <MessageCircle className="w-4 h-4" />
                Agent Chat
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:opacity-80"
                style={activeTab === 'actions' ? {
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(56, 189, 248, 0.3)'
                } : {
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'transparent'
                }}
              >
                Acties
              </button>
              <button
                onClick={() => setActiveTab('suggestions')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:opacity-80"
                style={activeTab === 'suggestions' ? {
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(56, 189, 248, 0.3)'
                } : {
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'transparent'
                }}
              >
                Suggesties
                {pendingSuggestions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>
                    {pendingSuggestions.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:opacity-80"
                style={activeTab === 'history' ? {
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(56, 189, 248, 0.3)'
                } : {
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'transparent'
                }}
              >
                Geschiedenis
              </button>
            </div>
          </div>

          <TabsContent value="chat">
            <AgentChat agentName="planning_assistent" />
          </TabsContent>

          <TabsContent value="actions">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Card 
                    key={action.id} 
                    className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                    onClick={() => !aiLimitReached && openActionDialog(action)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl ${action.bgColor} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-6 h-6 ${action.color}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{action.title}</h3>
                          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{action.description}</p>
                        </div>
                        <ArrowRight className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="suggestions">
            {pendingSuggestions.length === 0 ? (
              <Card className="border-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <CardContent className="p-12 text-center">
                  <Sparkles className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
                  <h3 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Geen openstaande suggesties</h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Start een AI-actie om suggesties te ontvangen.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingSuggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="border-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <Badge variant="secondary" className="mb-2">
                            {contextTypeLabels[suggestion.context_type]}
                          </Badge>
                          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{suggestion.description}</h3>
                          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                            {getScheduleName(suggestion.scheduleId)} • {format(parseISO(suggestion.created_date), 'd MMM yyyy HH:mm', { locale: nl })}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Betrouwbaarheid</div>
                          <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{suggestion.confidence_score}%</div>
                        </div>
                      </div>

                      {suggestion.considerations?.length > 0 && (
                        <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: 'var(--color-surface-light)' }}>
                          <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                            <Info className="w-4 h-4" />
                            Overwegingen
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {suggestion.considerations.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex items-center gap-3 flex-wrap">
                        {suggestion.context_type === 'replacement' && suggestion.suggested_patch?.replacements?.length > 0 && (
                          <Button 
                            onClick={() => {
                              const replacementEmployees = suggestion.suggested_patch.replacements
                                .map(r => employees.find(e => e.id === r.employeeId))
                                .filter(e => e && e.phone);
                              
                              const selectedEmployee = employees.find(e => e.id === actionParams.employeeId);
                              const message = `Hoi,

Er is een vervangingsverzoek voor ${selectedEmployee?.first_name || 'een medewerker'} op ${actionParams.date || 'aankomende datum'}.

${suggestion.description}

Kun je deze dienst overnemen? Reageer met JA of NEE.

Bedankt!
${currentCompany?.name}`;
                              
                              setWhatsappDialog({
                                open: true,
                                employees: replacementEmployees,
                                message: message,
                                context: 'AI suggesties voor vervanging'
                              });
                            }}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Verstuur WhatsApp ({suggestion.suggested_patch.replacements.filter(r => employees.find(e => e.id === r.employeeId)?.phone).length})
                          </Button>
                        )}
                        <Button 
                          onClick={() => handleSuggestionAction(suggestion, 'accepted')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Accepteren
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleSuggestionAction(suggestion, 'rejected')}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Afwijzen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {historySuggestions.length === 0 ? (
              <Card className="border-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <CardContent className="p-12 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
                  <h3 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Geen geschiedenis</h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Verwerkte AI-suggesties verschijnen hier.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {historySuggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="border-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge 
                            className={suggestion.status === 'accepted' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                            }
                          >
                            {suggestion.status === 'accepted' ? 'Geaccepteerd' : 'Afgewezen'}
                          </Badge>
                          <div>
                            <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{suggestion.description}</p>
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                              {getScheduleName(suggestion.scheduleId)}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          {format(parseISO(suggestion.processed_at || suggestion.created_date), 'd MMM yyyy', { locale: nl })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedAction && (
                <>
                  <div className={`w-10 h-10 rounded-xl ${selectedAction.bgColor} flex items-center justify-center`}>
                    <selectedAction.icon className={`w-5 h-5 ${selectedAction.color}`} />
                  </div>
                  {selectedAction.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedAction?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="scheduleId">Rooster *</Label>
              <Select 
                value={actionParams.scheduleId} 
                onValueChange={(v) => setActionParams({ ...actionParams, scheduleId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer rooster" />
                </SelectTrigger>
                <SelectContent>
                  {activeSchedules.map((schedule) => (
                    <SelectItem key={schedule.id} value={schedule.id}>
                      {schedule.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAction?.id === 'replacement' && (
              <>
                <div>
                  <Label htmlFor="employeeId">Uitgevallen medewerker</Label>
                  <Select 
                    value={actionParams.employeeId} 
                    onValueChange={(v) => setActionParams({ ...actionParams, employeeId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer medewerker" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} - ID: {emp.employee_number || emp.id.substring(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Datum</Label>
                  <Input
                    id="date"
                    type="date"
                    value={actionParams.date}
                    onChange={(e) => setActionParams({ ...actionParams, date: e.target.value })}
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="notes">Extra informatie</Label>
              <Textarea
                id="notes"
                value={actionParams.notes}
                onChange={(e) => setActionParams({ ...actionParams, notes: e.target.value })}
                placeholder="Voeg eventuele extra context toe..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={closeDialog}>
                Annuleren
              </Button>
              <Button 
                onClick={handleExecuteAction}
                disabled={isProcessing || !actionParams.scheduleId}
                style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)', color: 'white' }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verwerken...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Uitvoeren
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Dialog */}
      <WhatsAppConfirmDialog
        open={whatsappDialog.open}
        onOpenChange={(open) => setWhatsappDialog({ ...whatsappDialog, open })}
        employees={whatsappDialog.employees}
        defaultMessage={whatsappDialog.message}
        context={whatsappDialog.context}
      />
    </div>
  );
}