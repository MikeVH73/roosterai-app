import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { GlowCard } from '@/components/ui/glow-card';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import TopBar from '@/components/layout/TopBar';
import {
  Users,
  Zap,
  MessageSquare,
  CheckCircle2,
  Crown,
  Rocket,
  Building2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 39,
    employeeLimit: 25,
    aiActions: 500,
    description: 'Perfect voor kleine teams die willen starten met slimme personeelsplanning.',
    icon: Rocket,
    glowColor: 'blue',
    accentColor: '#38bdf8',
    accentBg: 'rgba(56,189,248,0.1)',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    employeeLimit: 75,
    aiActions: 1500,
    description: 'Voor groeiende organisaties die maximaal profijt willen halen uit AI-planning.',
    icon: Crown,
    glowColor: 'purple',
    accentColor: '#a78bfa',
    accentBg: 'rgba(167,139,250,0.1)',
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 149,
    employeeLimit: 200,
    aiActions: 5000,
    description: 'Voor grote bedrijven met complexe planningsbehoeften en meerdere locaties.',
    icon: Building2,
    glowColor: 'green',
    accentColor: '#4ade80',
    accentBg: 'rgba(74,222,128,0.1)',
    popular: false,
  },
];

const FEATURES = [
  'Roosterplanning',
  'AI Assistent',
  'Vervangersuggesties',
  'Conflictdetectie',
  'WhatsApp notificaties',
  'Verlofaanvragen',
  'Dienstruilverzoeken',
  'Dashboard & rapportages',
  'Afdelingen & locaties',
  'Functies & vaardigheden',
];

export default function Abonnementen() {
  const navigate = useNavigate();
  const { currentCompany, refreshCompany, hasPermission } = useCompany();
  const companyId = currentCompany?.id;

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => base44.entities.EmployeeProfile.filter({ companyId, status: 'active' }),
    enabled: !!companyId,
  });

  const currentPlan = currentCompany?.subscription_plan || 'starter';
  const employeeLimit = currentCompany?.max_users || 10;
  const aiUsed = currentCompany?.ai_actions_used || 0;
  const aiLimit = currentCompany?.ai_actions_limit || 300;

  const currentPlanData = PLANS.find(p => p.id === currentPlan);

  const [loading, setLoading] = React.useState(false);

  // Check for Stripe redirect result
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      toast.success('Betaling gelukt! Je abonnement wordt geactiveerd.');
      refreshCompany();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('checkout') === 'cancelled') {
      toast.info('Betaling geannuleerd.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleUpgrade = async (plan) => {
    if (!hasPermission('manage_billing')) {
      toast.error('Je hebt geen rechten om het abonnement te wijzigen.');
      return;
    }

    setLoading(true);
    const response = await base44.functions.invoke('createCheckoutSession', {
      planId: plan.id,
      companyId,
      returnUrl: window.location.origin + '/Abonnementen',
    });

    if (response.data?.url) {
      window.location.href = response.data.url;
    } else {
      toast.error('Kon betaalpagina niet openen. Probeer het opnieuw.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopBar
        title="Abonnementen"
        subtitle="Kies het plan dat bij jouw organisatie past"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-10">

        {/* Current Plan Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlowCard glowColor="blue" className="shadow-sm">
            <Card className="border-0 shadow-none" style={{ backgroundColor: 'var(--color-surface)' }}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Huidig plan</p>
                    <p className="text-2xl font-bold mt-1 capitalize" style={{ color: 'var(--color-text-primary)' }}>
                      {currentPlan}
                    </p>
                    <Badge className="mt-2" style={{ backgroundColor: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: 'none' }}>
                      {currentCompany?.subscription_status === 'trial' ? 'Proefperiode' : 'Actief'}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(56,189,248,0.15)' }}>
                    <Crown className="w-6 h-6" style={{ color: '#38bdf8' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </GlowCard>

          <GlowCard glowColor="green" className="shadow-sm">
            <Card className="border-0 shadow-none" style={{ backgroundColor: 'var(--color-surface)' }}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Medewerkers</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>
                      {employees.length} <span className="text-base font-normal" style={{ color: 'var(--color-text-muted)' }}>/ {employeeLimit}</span>
                    </p>
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-light)', width: '100%' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min((employees.length / employeeLimit) * 100, 100)}%`,
                          backgroundColor: employees.length >= employeeLimit ? '#f87171' : '#4ade80',
                        }}
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(74,222,128,0.15)' }}>
                    <Users className="w-6 h-6" style={{ color: '#4ade80' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </GlowCard>

          <GlowCard glowColor="purple" className="shadow-sm">
            <Card className="border-0 shadow-none" style={{ backgroundColor: 'var(--color-surface)' }}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>AI acties deze maand</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>
                      {aiUsed} <span className="text-base font-normal" style={{ color: 'var(--color-text-muted)' }}>/ {aiLimit}</span>
                    </p>
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-light)', width: '100%' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min((aiUsed / aiLimit) * 100, 100)}%`,
                          backgroundColor: aiUsed >= aiLimit ? '#f87171' : '#a78bfa',
                        }}
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(167,139,250,0.15)' }}>
                    <Zap className="w-6 h-6" style={{ color: '#a78bfa' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </GlowCard>
        </div>

        {/* Pricing Cards */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Beschikbare plannen</h2>
            <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>Alle plannen bevatten alle functies — alleen het aantal medewerkers verschilt.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const PlanIcon = plan.icon;
              const isCurrentPlan = currentPlan === plan.id;
              const isTrial = currentCompany?.subscription_status === 'trial';
              const isDisabled = isCurrentPlan && !isTrial;

              return (
                <GlowCard key={plan.id} glowColor={plan.glowColor} className="shadow-sm">
                  <Card
                    className="border-0 shadow-none h-full flex flex-col"
                    style={{ backgroundColor: 'var(--color-surface)' }}
                  >
                    <CardContent className="p-7 flex flex-col h-full">
                      {/* Plan Header */}
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl" style={{ backgroundColor: plan.accentBg }}>
                            <PlanIcon className="w-5 h-5" style={{ color: plan.accentColor }} />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{plan.name}</h3>
                            {plan.popular && (
                              <Badge className="text-xs mt-0.5" style={{ backgroundColor: plan.accentBg, color: plan.accentColor, border: 'none' }}>
                                Meest gekozen
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isCurrentPlan && (
                          <Badge style={{ backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80', border: 'none' }}>
                            Huidig plan
                          </Badge>
                        )}
                      </div>

                      {/* Price */}
                      <div className="mb-5">
                        <div className="flex items-end gap-1">
                          <span className="text-4xl font-black" style={{ color: 'var(--color-text-primary)' }}>€{plan.price}</span>
                          <span className="text-sm mb-1.5" style={{ color: 'var(--color-text-muted)' }}>/maand</span>
                        </div>
                        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{plan.description}</p>
                      </div>

                      {/* Key limits */}
                      <div className="space-y-3 mb-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-surface-light)' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            <Users className="w-4 h-4" style={{ color: plan.accentColor }} />
                            Medewerkers
                          </div>
                          <span className="font-bold text-sm" style={{ color: plan.accentColor }}>max. {plan.employeeLimit}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            <Zap className="w-4 h-4" style={{ color: plan.accentColor }} />
                            AI acties/maand
                          </div>
                          <span className="font-bold text-sm" style={{ color: plan.accentColor }}>{plan.aiActions.toLocaleString('nl')}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            <MessageSquare className="w-4 h-4" style={{ color: plan.accentColor }} />
                            WhatsApp notificaties
                          </div>
                          <CheckCircle2 className="w-4 h-4" style={{ color: '#4ade80' }} />
                        </div>
                      </div>

                      {/* Features included */}
                      <div className="space-y-2 mb-7 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>Alle functies inbegrepen:</p>
                        {FEATURES.slice(0, 6).map((f) => (
                          <div key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: plan.accentColor }} />
                            {f}
                          </div>
                        ))}
                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
                          + {FEATURES.length - 6} meer functies
                        </div>
                      </div>

                      {/* CTA Button */}
                      <Button
                        onClick={() => !isCurrentPlan && handleUpgrade(plan)}
                        disabled={isCurrentPlan || loading}
                        className="w-full font-semibold flex items-center justify-center gap-2"
                        style={isCurrentPlan
                          ? { backgroundColor: 'var(--color-surface-light)', color: 'var(--color-text-muted)', cursor: 'default' }
                          : { backgroundColor: plan.accentColor, color: '#0f172a' }
                        }
                      >
                        {isCurrentPlan ? 'Huidig plan' : loading ? (
                          'Even geduld...'
                        ) : (
                          <>
                            Upgrade naar {plan.name}
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </GlowCard>
              );
            })}
          </div>
        </div>

        {/* All features list */}
        <Card className="border-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)' }}>
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Alle functies inbegrepen in elk plan
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#4ade80' }} />
                  {f}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stripe note */}
        <div className="text-center py-4">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Veilig betalen via Stripe — creditcard, iDEAL en meer. Maandelijks opzegbaar.
          </p>
        </div>
      </div>
    </div>
  );
}