import React from 'react';
import { Calendar, Sparkles, Users, Clock, ShieldCheck, BarChart3, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';

const features = [
  {
    icon: Sparkles,
    title: 'AI-gestuurde planning',
    description: 'Het systeem stelt automatisch een optimaal rooster voor op basis van beschikbaarheid, voorkeuren en bezettingsnormen.'
  },
  {
    icon: Users,
    title: 'Medewerkersbeheer',
    description: 'Beheer contracturen, vaardigheden, voorkeuren en afdelingen op één centrale plek.'
  },
  {
    icon: Clock,
    title: 'Realtime inzicht',
    description: 'Zie direct of je boven of onder de bezettingsnorm zit en stuur bij waar nodig.'
  },
  {
    icon: ShieldCheck,
    title: 'Regels & compliance',
    description: 'Automatische bewaking van rusttijden, maximale uren en CAO-regels.'
  },
  {
    icon: BarChart3,
    title: 'Rapportages',
    description: 'Overzichtelijke dashboards over gewerkte uren, kosten en bezettingsgraden.'
  },
  {
    icon: Calendar,
    title: 'Ruil & verlof',
    description: 'Medewerkers kunnen eenvoudig verlof aanvragen en diensten ruilen — jij keurt goed.'
  }
];

const benefits = [
  'Minder tijd kwijt aan handmatige roostering',
  'Medewerkers altijd op de juiste plek',
  'Automatische melding bij onderbezetting',
  'Volledige controle voor de planner',
  'Geschikt voor meerdere afdelingen en locaties',
  'WhatsApp-notificaties voor medewerkers'
];

export default function Landing() {
  const handleLogin = () => {
    base44.auth.redirectToLogin('/CompanySelect');
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1e1b2e 0%, #262344 50%, #2d2a3e 100%)' }}>

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)' }}>
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">RoosterAI</span>
        </div>
        <Button
          onClick={handleLogin}
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white', border: 'none' }}
          className="px-6"
        >
          Inloggen
        </Button>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 pt-20 pb-24 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-medium" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <Sparkles className="w-4 h-4" />
          Slimme personeelsplanning met AI
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Het rooster klopt.<br />
          <span style={{ background: 'linear-gradient(90deg, #818cf8, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Altijd.
          </span>
        </h1>
        <p className="text-xl mb-10" style={{ color: '#94a3b8' }}>
          RoosterAI helpt planners in de zorg en andere sectoren om snel, slim en compliant te roosteren. Minder handwerk, meer overzicht.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={handleLogin}
            size="lg"
            className="h-14 px-8 text-lg font-semibold"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white', border: 'none' }}
          >
            Aan de slag
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-white text-center mb-4">Alles wat je nodig hebt</h2>
        <p className="text-center mb-12" style={{ color: '#94a3b8' }}>Van bezettingsnormen tot AI-suggesties — RoosterAI regelt het.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="rounded-2xl p-6 border"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(56,189,248,0.3) 100%)' }}>
                <feature.icon className="w-5 h-5 text-indigo-300" />
              </div>
              <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm" style={{ color: '#94a3b8' }}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 pb-24 max-w-4xl mx-auto">
        <div
          className="rounded-3xl p-10 border"
          style={{ backgroundColor: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.25)' }}
        >
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Waarom RoosterAI?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#818cf8' }} />
                <span style={{ color: '#e2e8f0' }}>{benefit}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button
              onClick={handleLogin}
              size="lg"
              className="h-14 px-10 text-lg font-semibold"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white', border: 'none' }}
            >
              Nu beginnen
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center pb-10 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-sm mt-8" style={{ color: '#475569' }}>
          © {new Date().getFullYear()} RoosterAI · Slimme personeelsplanning
        </p>
      </footer>
    </div>
  );
}