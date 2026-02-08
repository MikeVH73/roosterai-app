import React from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import TopBar from '@/components/layout/TopBar';
import {
  CreditCard,
  Check,
  Sparkles,
  Users,
  Zap,
  Clock,
  TrendingUp,
  Shield
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '€29',
    period: '/maand',
    description: 'Perfect voor kleine teams',
    features: [
      { text: 'Tot 10 medewerkers', icon: Users },
      { text: '300 AI-acties per maand', icon: Sparkles },
      { text: 'Basis roostering', icon: Clock },
      { text: 'E-mail notificaties', icon: Zap },
    ],
    highlight: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€79',
    period: '/maand',
    description: 'Voor groeiende organisaties',
    features: [
      { text: 'Tot 25 medewerkers', icon: Users },
      { text: '1.500 AI-acties per maand', icon: Sparkles },
      { text: 'Geavanceerde roostering', icon: Clock },
      { text: 'Uitgebreide rapporten', icon: TrendingUp },
      { text: 'Audit logging', icon: Shield },
    ],
    highlight: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '€199',
    period: '/maand',
    description: 'Voor grote organisaties',
    features: [
      { text: 'Onbeperkt medewerkers', icon: Users },
      { text: '5.000+ AI-acties per maand', icon: Sparkles },
      { text: 'AI scenario analyses', icon: Zap },
      { text: 'Prioriteit support', icon: Shield },
      { text: 'SLA garantie', icon: Check },
    ],
    highlight: false
  }
];

export default function Billing() {
  const { currentCompany, hasPermission } = useCompany();

  const currentPlan = plans.find(p => p.id === currentCompany?.subscription_plan) || plans[0];
  const aiUsagePercent = ((currentCompany?.ai_actions_used || 0) / (currentCompany?.ai_actions_limit || 300)) * 100;

  const statusConfig = {
    active: { label: 'Actief', color: 'bg-green-100 text-green-700' },
    trial: { label: 'Proefperiode', color: 'bg-amber-100 text-amber-700' },
    suspended: { label: 'Opgeschort', color: 'bg-red-100 text-red-700' },
    cancelled: { label: 'Geannuleerd', color: 'bg-slate-100 text-slate-500' }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar 
        title="Abonnement" 
        subtitle="Beheer je abonnement en facturatie"
      />

      <div className="p-6 max-w-6xl mx-auto">
        {/* Current Plan Overview */}
        <Card className="border-0 shadow-sm mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                  <CreditCard className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-slate-900">{currentPlan.name}</h2>
                    <Badge className={statusConfig[currentCompany?.subscription_status || 'trial'].color}>
                      {statusConfig[currentCompany?.subscription_status || 'trial'].label}
                    </Badge>
                  </div>
                  {currentCompany?.subscription_status === 'trial' && currentCompany?.trial_ends_at && (
                    <p className="text-slate-500">
                      Proefperiode eindigt op {format(parseISO(currentCompany.trial_ends_at), 'd MMMM yyyy', { locale: nl })}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-slate-900">
                  {currentPlan.price}
                  <span className="text-lg font-normal text-slate-500">{currentPlan.period}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">AI Acties</p>
                    <p className="text-sm text-slate-500">Deze maand gebruikt</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-slate-900">
                  {currentCompany?.ai_actions_used || 0}
                  <span className="text-sm font-normal text-slate-400">/{currentCompany?.ai_actions_limit || 300}</span>
                </span>
              </div>
              <Progress value={aiUsagePercent} className="h-2" />
              {aiUsagePercent >= 80 && (
                <p className="text-sm text-orange-600 mt-2">
                  Let op: Je nadert je limiet. Upgrade voor meer AI-acties.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Medewerkers</p>
                    <p className="text-sm text-slate-500">Actieve gebruikers</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-slate-900">
                  -
                  <span className="text-sm font-normal text-slate-400">/{currentCompany?.max_users || 10}</span>
                </span>
              </div>
              <Progress value={0} className="h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Plan Comparison */}
        <h3 className="text-xl font-bold text-slate-900 mb-6">Abonnementen vergelijken</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentCompany?.subscription_plan;
            return (
              <Card 
                key={plan.id} 
                className={`border-0 shadow-sm relative ${
                  plan.highlight ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white">Populair</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-4">
                    <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-500">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => {
                      const Icon = feature.icon;
                      return (
                        <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                          <Icon className="w-4 h-4 text-blue-600" />
                          {feature.text}
                        </li>
                      );
                    })}
                  </ul>
                  <Button 
                    className={`w-full ${
                      isCurrent 
                        ? 'bg-slate-100 text-slate-500 cursor-default' 
                        : plan.highlight 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : ''
                    }`}
                    variant={isCurrent ? 'secondary' : plan.highlight ? 'default' : 'outline'}
                    disabled={isCurrent}
                  >
                    {isCurrent ? 'Huidig plan' : 'Selecteren'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ or Contact */}
        <Card className="border-0 shadow-sm mt-8 bg-gradient-to-r from-slate-50 to-blue-50">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-slate-900 mb-2">Vragen over facturatie?</h3>
            <p className="text-slate-500 text-sm mb-4">
              Neem contact op met ons team voor hulp met je abonnement of facturatie.
            </p>
            <Button variant="outline">
              Contact opnemen
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}