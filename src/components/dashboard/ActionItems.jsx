import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CalendarOff, ArrowLeftRight, Sparkles, Zap } from 'lucide-react';

export default function ActionItems({ vacationRequests, swapRequests, aiSuggestions }) {
  const items = [
    vacationRequests.length > 0 && {
      icon: CalendarOff,
      label: `${vacationRequests.length} verlofverzoek${vacationRequests.length > 1 ? 'en' : ''} wacht${vacationRequests.length === 1 ? '' : 'en'} op goedkeuring`,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      link: createPageUrl('VacationRequests'),
      urgency: 'high'
    },
    swapRequests.length > 0 && {
      icon: ArrowLeftRight,
      label: `${swapRequests.length} ruilverzoek${swapRequests.length > 1 ? 'en' : ''} om te beoordelen`,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      link: createPageUrl('SwapRequests'),
      urgency: 'medium'
    },
    aiSuggestions.length > 0 && {
      icon: Sparkles,
      label: `${aiSuggestions.length} AI-suggestie${aiSuggestions.length > 1 ? 's' : ''} klaar voor beoordeling`,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      link: createPageUrl('AIAssistant'),
      urgency: 'low'
    },
  ].filter(Boolean);

  if (items.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 flex flex-col items-center justify-center gap-2 py-10">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-1">
            <Zap className="w-6 h-6 text-green-500" />
          </div>
          <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Alles is bijgewerkt!</p>
          <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>Geen openstaande acties. Goed bezig.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Te nemen acties
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, i) => (
          <Link key={i} to={item.link}>
            <div className="flex items-center justify-between p-3 rounded-xl hover:opacity-80 transition-opacity" style={{ backgroundColor: 'var(--color-surface-light)' }}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${item.bg}`}>
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.label}</span>
              </div>
              <ArrowRight className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}