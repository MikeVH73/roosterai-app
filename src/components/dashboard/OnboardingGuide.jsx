import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Building2, Briefcase, Users, Calendar, CheckCircle2, Circle, ArrowRight, Rocket } from 'lucide-react';

const STEPS = [
  {
    id: 'locations',
    label: 'Locaties & Afdelingen aanmaken',
    description: 'Stel je vestigingen en afdelingen in',
    icon: MapPin,
    link: '/Locations',
    checkFn: (data) => data.departments > 0 || data.locations > 0,
  },
  {
    id: 'functions',
    label: 'Functies & Vaardigheden aanmaken',
    description: 'Definieer functies en benodigde vaardigheden',
    icon: Briefcase,
    link: '/FunctionsSkills',
    checkFn: (data) => data.functions > 0,
  },
  {
    id: 'employees',
    label: 'Medewerkers toevoegen',
    description: 'Voeg je teamleden toe aan het systeem',
    icon: Users,
    link: '/Employees',
    checkFn: (data) => data.employees > 1, // 1 = de admin zelf
  },
  {
    id: 'schedules',
    label: 'Eerste rooster aanmaken',
    description: 'Maak je eerste weekrooster aan',
    icon: Calendar,
    link: '/Schedules',
    checkFn: (data) => data.schedules > 0,
  },
];

export default function OnboardingGuide({ departments, locations, employees, schedules, functions }) {
  const counts = {
    departments: departments?.length || 0,
    locations: locations?.length || 0,
    employees: employees?.length || 0,
    schedules: schedules?.length || 0,
    functions: functions?.length || 0,
  };

  const completedSteps = STEPS.filter(s => s.checkFn(counts)).length;
  const allDone = completedSteps === STEPS.length;

  // Don't show if everything is completed
  if (allDone) return null;

  const progress = Math.round((completedSteps / STEPS.length) * 100);

  return (
    <Card className="border-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)' }}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Welkom! Laten we beginnen
            </CardTitle>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Volg deze stappen om je roosterplanning op te zetten
            </p>
          </div>
          <span className="text-sm font-semibold" style={{ color: '#8b5cf6' }}>{completedSteps}/{STEPS.length}</span>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-light)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2">
          {STEPS.map((step, idx) => {
            const done = step.checkFn(counts);
            const Icon = step.icon;
            const isNext = !done && STEPS.slice(0, idx).every(s => s.checkFn(counts));
            return (
              <Link
                key={step.id}
                to={step.link}
                className="flex items-center gap-4 p-3 rounded-xl transition-all"
                style={{
                  backgroundColor: isNext ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                  opacity: done ? 0.6 : 1,
                }}
              >
                <div className="flex-shrink-0">
                  {done ? (
                    <CheckCircle2 className="w-6 h-6" style={{ color: '#4ade80' }} />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center" style={{ borderColor: isNext ? '#6366f1' : 'var(--color-border)' }}>
                      <span className="text-xs font-bold" style={{ color: isNext ? '#6366f1' : 'var(--color-text-muted)' }}>{idx + 1}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ 
                    color: done ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                    textDecoration: done ? 'line-through' : 'none'
                  }}>
                    {step.label}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{step.description}</p>
                </div>
                {!done && (
                  <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: isNext ? '#6366f1' : 'var(--color-text-muted)' }} />
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}