import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Clock } from 'lucide-react';
import { parseISO, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';

function getTimeRemaining(trialEndsAt) {
  if (!trialEndsAt) return null;
  const end = parseISO(trialEndsAt);
  const now = new Date();
  if (end <= now) return { expired: true, days: 0, hours: 0, minutes: 0 };

  const days = differenceInDays(end, now);
  const hours = differenceInHours(end, now) % 24;
  const minutes = differenceInMinutes(end, now) % 60;
  return { expired: false, days, hours, minutes };
}

export default function TrialCountdown({ company, hasManageBilling }) {
  const [time, setTime] = useState(() => getTimeRemaining(company?.trial_ends_at));

  useEffect(() => {
    if (!company?.trial_ends_at) return;
    const interval = setInterval(() => {
      setTime(getTimeRemaining(company.trial_ends_at));
    }, 60000); // update every minute
    return () => clearInterval(interval);
  }, [company?.trial_ends_at]);

  if (company?.subscription_status !== 'trial' || !time) return null;

  const urgencyColor = time.days <= 3 ? '#ef4444' : time.days <= 7 ? '#f59e0b' : '#38bdf8';

  return (
    <Card className="border-0 shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--color-surface)' }}>
      <CardContent className="p-0">
        {/* Urgency bar */}
        <div className="h-1.5 w-full" style={{ backgroundColor: urgencyColor }} />
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5" style={{ color: urgencyColor }} />
              <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {time.expired ? 'Proefperiode verlopen' : 'Gratis proefperiode'}
              </span>
            </div>
            <Badge style={{ backgroundColor: `${urgencyColor}20`, color: urgencyColor, border: 'none' }}>
              {company?.subscription_plan?.charAt(0).toUpperCase() + company?.subscription_plan?.slice(1)}
            </Badge>
          </div>

          {time.expired ? (
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Je proefperiode is verlopen. Kies een abonnement om door te gaan.
            </p>
          ) : (
            <>
              {/* Countdown */}
              <div className="flex items-center gap-3 mb-4">
                {[
                  { value: time.days, label: 'dagen' },
                  { value: time.hours, label: 'uren' },
                  { value: time.minutes, label: 'min' },
                ].map((item) => (
                  <div key={item.label} className="flex-1 text-center p-3 rounded-xl" style={{ backgroundColor: 'var(--color-surface-light)' }}>
                    <div className="text-2xl font-bold" style={{ color: urgencyColor }}>{item.value}</div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                <Clock className="w-3.5 h-3.5" />
                <span>Je kunt op elk moment een abonnement kiezen</span>
              </div>
            </>
          )}

          {hasManageBilling && (
            <Link to="/Abonnementen">
              <Button className="w-full" size="sm" style={{ 
                background: `linear-gradient(135deg, ${urgencyColor}, ${urgencyColor}cc)`,
                color: 'white',
                border: 'none'
              }}>
                Abonnement kiezen
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}