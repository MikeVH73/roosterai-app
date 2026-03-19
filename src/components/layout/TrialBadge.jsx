import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { parseISO, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';

function getTimeRemaining(trialEndsAt) {
  if (!trialEndsAt) return null;
  const end = parseISO(trialEndsAt);
  const now = new Date();
  if (end <= now) return { expired: true, days: 0, hours: 0, minutes: 0 };
  return {
    expired: false,
    days: differenceInDays(end, now),
    hours: differenceInHours(end, now) % 24,
    minutes: differenceInMinutes(end, now) % 60,
  };
}

export default function TrialBadge({ company }) {
  const [time, setTime] = useState(() => getTimeRemaining(company?.trial_ends_at));

  useEffect(() => {
    if (!company?.trial_ends_at) return;
    const interval = setInterval(() => setTime(getTimeRemaining(company.trial_ends_at)), 60000);
    return () => clearInterval(interval);
  }, [company?.trial_ends_at]);

  if (company?.subscription_status !== 'trial' || !time) return null;

  const urgencyColor = time.days <= 3 ? '#ef4444' : time.days <= 7 ? '#f59e0b' : '#38bdf8';

  return (
    <Link
      to="/Abonnementen"
      className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
      style={{ backgroundColor: `${urgencyColor}15`, color: urgencyColor, border: `1px solid ${urgencyColor}30` }}
      title="Klik om een abonnement te kiezen"
    >
      <Crown className="w-3.5 h-3.5" />
      {time.expired ? (
        <span>Trial verlopen</span>
      ) : (
        <span>{time.days}d {time.hours}u {time.minutes}m</span>
      )}
    </Link>
  );
}