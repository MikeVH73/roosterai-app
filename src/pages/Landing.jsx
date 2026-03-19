import React from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, Users, Zap, Clock, MessageSquare, TrendingUp, ChevronRight } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (isAuth) {
      navigate('/CompanySelect');
    } else {
      base44.auth.redirectToLogin('/CompanySelect');
    }
  };

  const timeData = [
    { label: 'Ma', voor: 6, na: 1 },
    { label: 'Di', voor: 5, na: 0.5 },
    { label: 'Wo', voor: 7, na: 1 },
    { label: 'Do', voor: 4, na: 0.5 },
    { label: 'Vr', voor: 8, na: 1.5 },
  ];

  const steps = [
    { num: '01', icon: <Users size={24} />, title: 'Voeg je team toe', desc: 'Importeer medewerkers met contracturen, functies en voorkeuren. Klaar in 5 minuten.' },
    { num: '02', icon: <Calendar size={24} />, title: 'Stel je rooster in', desc: 'Definieer dagdelen, bezettingsnormen en afdelingen. Eenmalig instellen, altijd profijt.' },
    { num: '03', icon: <Zap size={24} />, title: 'AI genereert het rooster', desc: 'Één klik en de AI plant iedereen in op basis van beschikbaarheid, vaardigheden en contracturen.' },
    { num: '04', icon: <MessageSquare size={24} />, title: 'Automatisch communiceren', desc: 'Medewerkers ontvangen hun diensten via WhatsApp. Geen e-mails, geen gebel.' },
  ];

  return (
    <div className="font-sans min-h-screen" style={{ fontFamily: "'Public Sans', sans-serif", background: '#1a0b16' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;900&display=swap');
        .neon-ping { animation: ping 1s cubic-bezier(0,0,0.2,1) infinite; }
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        .feature-card { transition: transform 0.2s, border-color 0.2s; }
        .feature-card:hover { transform: translateY(-4px); border-color: rgba(57,255,20,0.3) !important; }
        .step-card:hover { border-color: rgba(57,255,20,0.3) !important; }
      `}</style>

      {/* Navigation */}
      <header style={{ background: 'rgba(26,11,22,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between" style={{ height: '80px' }}>
          <div className="flex items-center gap-8">
            <h2 className="text-white text-2xl font-black tracking-tight italic uppercase">RoosterAI</h2>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#" className="text-white font-bold text-sm uppercase tracking-wider" style={{ transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.target.style.color = '#39FF14'} onMouseLeave={(e) => e.target.style.color = 'white'}>Home</a>
              <a href="#features" className="text-slate-400 font-bold text-sm uppercase tracking-wider" style={{ transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.target.style.color = '#39FF14'} onMouseLeave={(e) => e.target.style.color = ''}> Functies</a>
              <a href="/Abonnementen" className="text-slate-400 font-bold text-sm uppercase tracking-wider" style={{ transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.target.style.color = '#39FF14'} onMouseLeave={(e) => e.target.style.color = ''}>Prijzen</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleLogin} className="hidden md:block text-white font-bold text-sm"
            style={{ transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.target.style.color = '#39FF14'} onMouseLeave={(e) => e.target.style.color = 'white'}>
              Inloggen
            </button>
            <button onClick={handleLogin} style={{ background: '#39FF14', color: '#1a0b16', boxShadow: '0 4px 20px rgba(57,255,20,0.2)', transition: 'transform 0.2s' }}
            className="px-6 py-2 rounded-lg font-bold text-sm"
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              Gratis Starten
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section style={{ minHeight: '700px', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #1a0b16 0%, rgba(26,11,22,0.82) 50%, rgba(26,11,22,0.3) 100%)', zIndex: 1 }}></div>
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAoitrOH4zojRqkj4jkQUTdTPHX-IxzmlCNQsDmENWdqG2mY3_JQwdbUa1uv54P54uKfGLDOxzE6eJwkwb-3tFcy3aIpdRnAyWMQcI4QJlnJgjP3OxMXIBJKvyTsjP4JfM8mrhGSBV09hFwq4Jz2vHIkZmHzCKL08E_5faaz9KdUhI0m5cb8d8oohH3Hyhpp76SKZ82mlGfOGvt8Oc97XXFhD9pmlNqvZAtFL_icmMDLxyQQapr1_qvMMq7RdaCi9GWq_C9dGQ8PY"
              alt="Modern office with digital scheduling screens"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

          </div>
          <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
            <div className="max-w-7xl mx-auto px-6 py-24">
              <div className="max-w-2xl space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider"
                style={{ background: 'rgba(57,255,20,0.1)', border: '1px solid rgba(57,255,20,0.2)', color: '#39FF14' }}>
                  <span style={{ position: 'relative', display: 'flex', height: '8px', width: '8px' }}>
                    <span style={{ position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '9999px', background: '#39FF14', opacity: 0.75, animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }}></span>
                    <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '9999px', height: '8px', width: '8px', background: '#39FF14' }}></span>
                  </span>
                  Next-Gen Planning
                </div>

                <h1 className="text-white font-black leading-tight tracking-tight" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>
                  Optimaliseer je <br />
                  <span style={{ color: '#39FF14' }}>personeelsplanning</span> met AI
                </h1>

                <p className="text-xl font-medium leading-relaxed" style={{ color: '#cbd5e1', maxWidth: '32rem' }}>
                  Bespaar wekelijks 15+ uur aan administratie en verhoog de efficiëntie met de slimme algoritmes van RoosterAI.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button onClick={handleLogin}
                  style={{ background: '#39FF14', color: '#1a0b16', height: '56px', padding: '0 40px', borderRadius: '12px', fontWeight: 700, fontSize: '18px', boxShadow: '0 4px 20px rgba(57,255,20,0.2)', transition: 'transform 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    Start nu gratis
                  </button>
                  





                </div>

                <div className="grid grid-cols-3 gap-6 pt-12" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div>
                    <p className="font-black text-3xl" style={{ color: '#39FF14' }}>+40%</p>
                    <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Efficiëntie</p>
                  </div>
                  <div>
                    <p className="font-black text-3xl" style={{ color: '#39FF14' }}>25u</p>
                    <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Besparing</p>
                  </div>
                  <div>
                    <p className="font-black text-3xl" style={{ color: '#39FF14' }}>98%</p>
                    <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Focus</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" style={{ background: '#120a10', padding: '100px 0' }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6" style={{ background: 'rgba(57,255,20,0.1)', color: '#39FF14', border: '1px solid rgba(57,255,20,0.2)' }}>Functies</div>
              <h2 className="text-white font-black mb-4" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>Voor planners die het druk hebben</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">Je doet de planning er 'bij' — RoosterAI zorgt dat het toch perfect is.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: <Zap size={24} />, title: 'AI-gestuurde Planning', desc: 'Één klik en het rooster staat. De AI houdt rekening met contracturen, vaardigheden, voorkeuren en bezettingsnormen.' },
                { icon: <Users size={24} />, title: 'Medewerkersbeheer', desc: 'Alles over je team op één plek: contracten, verlof, functies en wie waar kan werken.' },
                { icon: <TrendingUp size={24} />, title: 'Realtime Inzicht', desc: 'Direct zien hoeveel uren er ingepland zijn, wat het kost en waar gaten zitten — zonder Excel.' },
              ].map((f, i) => (
                <div key={i} className="feature-card flex flex-col gap-5 p-8 rounded-2xl" style={{ background: '#1a0b16', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-center rounded-xl" style={{ width: '52px', height: '52px', background: 'rgba(57,255,20,0.1)', color: '#39FF14' }}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-white text-xl font-bold mb-2">{f.title}</h3>
                    <p className="text-slate-400 leading-relaxed text-sm">{f.desc}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-2 text-sm font-bold" style={{ color: '#39FF14' }}>
                    Meer weten <ChevronRight size={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Time Savings Chart Section */}
        <section style={{ background: '#1a0b16', padding: '100px 0' }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <div className="inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest" style={{ background: 'rgba(57,255,20,0.1)', color: '#39FF14', border: '1px solid rgba(57,255,20,0.2)' }}>Tijdswinst</div>
                <h2 className="text-white font-black" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.2 }}>
                  Van <span style={{ color: '#39FF14' }}>uren</span> naar<br />minuten per week
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed">
                  De gemiddelde planner besteedt 6–8 uur per week aan het maken en aanpassen van roosters. Met RoosterAI is dat nog geen uur.
                </p>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  {[
                    { label: 'Uur bespaard per week', value: '6–8u' },
                    { label: 'Minder planningsfouten', value: '–90%' },
                    { label: 'Sneller rooster klaar', value: '×10' },
                    { label: 'Tevredenheid medewerkers', value: '+35%' },
                  ].map((stat, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(57,255,20,0.05)', border: '1px solid rgba(57,255,20,0.1)' }}>
                      <p className="font-black text-2xl" style={{ color: '#39FF14' }}>{stat.value}</p>
                      <p className="text-slate-400 text-xs mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <div className="rounded-2xl p-8" style={{ background: '#120a10', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h4 className="text-white font-bold text-lg">Uren besteed aan planning</h4>
                    <p className="text-slate-500 text-sm mt-1">Per dag — voor en na RoosterAI</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1.5"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(148,163,184,0.4)', display: 'inline-block' }}></span><span className="text-slate-400">Zonder AI</span></span>
                    <span className="flex items-center gap-1.5"><span style={{ width: 10, height: 10, borderRadius: 2, background: '#39FF14', display: 'inline-block' }}></span><span style={{ color: '#39FF14' }}>Met RoosterAI</span></span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={timeData} barCategoryGap="30%" barGap={4}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}u`} />
                    <Tooltip
                      contentStyle={{ background: '#1a0b16', border: '1px solid rgba(57,255,20,0.2)', borderRadius: 8, color: 'white' }}
                      formatter={(value, name) => [`${value}u`, name === 'voor' ? 'Zonder AI' : 'Met RoosterAI']}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Bar dataKey="voor" radius={[4, 4, 0, 0]} fill="rgba(148,163,184,0.25)" />
                    <Bar dataKey="na" radius={[4, 4, 0, 0]} fill="#39FF14" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section style={{ background: '#120a10', padding: '100px 0' }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6" style={{ background: 'rgba(57,255,20,0.1)', color: '#39FF14', border: '1px solid rgba(57,255,20,0.2)' }}>Hoe het werkt</div>
              <h2 className="text-white font-black mb-4" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>In 4 stappen een perfect rooster</h2>
              <p className="text-slate-400 text-lg">Geen opleiding nodig. Gewoon doen.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, i) => (
                <div key={i} className="step-card rounded-2xl p-6 relative" style={{ background: '#1a0b16', border: '1px solid rgba(255,255,255,0.07)', transition: 'border-color 0.2s' }}>
                  <div className="text-5xl font-black mb-4" style={{ color: 'rgba(57,255,20,0.12)', lineHeight: 1 }}>{step.num}</div>
                  <div className="mb-4 flex items-center justify-center rounded-xl" style={{ width: '44px', height: '44px', background: 'rgba(57,255,20,0.1)', color: '#39FF14' }}>
                    {step.icon}
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10" style={{ color: 'rgba(57,255,20,0.3)' }}>
                      <ChevronRight size={20} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product Preview */}
        <section style={{ background: '#1a0b16', padding: '100px 0' }}>
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest" style={{ background: 'rgba(57,255,20,0.1)', color: '#39FF14', border: '1px solid rgba(57,255,20,0.2)' }}>Gebruiksgemak</div>
              <h2 className="text-white font-black" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.2 }}>
                Ontworpen voor <span style={{ color: '#39FF14' }}>planners</span><br />die het druk hebben
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                Geen ingewikkelde handleiding. Gewoon inloggen, en de AI helpt je direct verder. Werkt op je telefoon, tablet of laptop.
              </p>
              <ul className="space-y-4 pt-4">
                {[
                  'Medewerkers op voorkeurslocatie of back-up locatie inplannen',
                  'Automatische WhatsApp-berichten naar je team',
                  'AI maakt het rooster voor volgende week in één klik',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300 font-medium">
                    <span className="mt-0.5 flex-shrink-0 flex items-center justify-center rounded-full" style={{ width: 22, height: 22, background: 'rgba(57,255,20,0.15)', color: '#39FF14', fontSize: 12, fontWeight: 900 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={handleLogin} className="flex items-center gap-2 font-bold mt-4" style={{ color: '#39FF14' }}>
                Probeer zelf <ChevronRight size={16} />
              </button>
            </div>

            {/* Demo Card */}
            <div className="rounded-3xl p-8 border relative" style={{ background: 'linear-gradient(135deg, #361728 0%, #1a0b16 100%)', borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
              <div className="absolute -top-4 -right-4 px-4 py-2 rounded-xl font-black text-sm italic shadow-xl" style={{ background: '#39FF14', color: '#1a0b16' }}>
                LIVE DEMO
              </div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-white text-xl font-bold">Weekoverzicht</h4>
                  <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: '#39FF14' }}>Systeem Status: Optimaal</p>
                </div>
                <Calendar size={32} style={{ color: '#39FF14' }} />
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Mark de Vries', shift: 'Ochtenddienst • 08:00–16:00', label: 'BEVESTIGD', labelBg: 'rgba(57,255,20,0.15)', labelColor: '#39FF14', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD2ELlfG6kOC7eP5drp0jTg23-5cVILJjV79otvr337bbz7ETb2OTLYtTCAHLMg87DnTPBcH5X1pQfnZNd4ITOzz89BAmQ-S_uqASccKK4Of3B7pejuk1a1-j8KE61LDayfU3n9BIb_AfojSZgNIborBsR1j2ehqKYk-fyprAjB6j6RhMFg9JACbKy7UCoTAkSHPAi50mU_5WG4UTED_mVZNJO0i7CP0uS3-phIzKoKLW_-lWWhdvLWEjZJZ6cIns8Sih5hRROa69s' },
                  { name: 'Sophie Jansen', shift: 'Avonddienst • 16:00–00:00', label: 'NIEUW', labelBg: '#39FF14', labelColor: '#1a0b16', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDVWj_OJJzs2uLGVKV8dNUN686zSeacscZvio6_fEtz1JxQIXl8cuhJZ-QDAqqFQVPiZfhQNGQSimKmPGIM7OJLRcEQo9Pngc4EszjD69OILRD9X-1jp0FzZ74DkPUSMYNlq2vTWW70jazzhCjt3-VRbFTm8XtwdTaveBgch_fXsSSYODNXTv2qqRraO1tYxjk4yYfJpkG7xkdvdhaV0zkSJJaP3xfc7rFXld90Vw2N8d-LRhrUe7wh0bV0ThY7sNFxYal2t-YcCK0' },
                ].map((emp, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <img src={emp.img} alt={emp.name} className="rounded-full flex-shrink-0" style={{ width: 48, height: 48, objectFit: 'cover' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate">{emp.name}</p>
                      <p className="text-slate-400 text-sm">{emp.shift}</p>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background: emp.labelBg }}>
                      <span className="text-xs font-black tracking-widest" style={{ color: emp.labelColor }}>{emp.label}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 flex justify-center" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={handleLogin} className="flex items-center gap-2 font-bold" style={{ color: '#39FF14' }}>
                  Open Volledig Rooster Dashboard <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: '80px 24px' }}>
          <div className="max-w-4xl mx-auto rounded-3xl p-12 md:p-20 text-center relative overflow-hidden" style={{ background: '#39FF14' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '256px', height: '256px', background: 'rgba(255,255,255,0.15)', borderRadius: '9999px', marginRight: '-128px', marginTop: '-128px', filter: 'blur(40px)' }}></div>
            <div className="relative space-y-8">
              <h2 className="font-black tracking-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#1a0b16', lineHeight: 1.1 }}>Klaar voor de toekomst?</h2>
              <p className="text-xl font-bold" style={{ color: 'rgba(26,11,22,0.75)', maxWidth: '30rem', margin: '0 auto' }}>
                Sluit je aan bij 500+ bedrijven die hun planning al hebben geoptimaliseerd met RoosterAI.
              </p>
              <div className="flex flex-col items-center gap-4">
                <button onClick={handleLogin}
                  style={{ background: '#1a0b16', color: 'white', padding: '18px 48px', borderRadius: '14px', fontWeight: 900, fontSize: '18px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', transition: 'transform 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  Start 14 Dagen Gratis Proef
                </button>
                <p className="text-sm font-bold italic" style={{ color: 'rgba(26,11,22,0.55)' }}>Geen creditcard nodig • In 5 minuten opgezet • Directe resultaten</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ background: '#1a0b16', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '80px', paddingBottom: '40px' }}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-2 md:col-span-1 space-y-6">
            <h2 className="text-white text-2xl font-black tracking-tight uppercase italic">RoosterAI</h2>
            <p className="text-slate-400 text-sm leading-relaxed">De slimste manier om je personeel te managen en je bedrijf te laten groeien met de kracht van kunstmatige intelligentie.</p>
          </div>
          {[
          { title: 'Product', links: ['Features', 'Prijzen', 'Demo', 'Integraties'] },
          { title: 'Bedrijf', links: ['Over Ons', 'Blog', 'Contact', 'Vacatures'] },
          { title: 'Legal', links: [
            { label: 'Privacy', href: '/legal?doc=privacy' },
            { label: 'Voorwaarden', href: '/legal?doc=voorwaarden' },
            { label: 'Cookiebeleid', href: '/legal?doc=cookiebeleid' },
          ] }].
          map((col, i) =>
          <div key={i} className="space-y-6">
              <h4 className="text-white font-bold uppercase tracking-widest text-sm">{col.title}</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                {col.links.map((link, j) =>
              <li key={j}><a href="#" style={{ transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.target.style.color = '#39FF14'}
                onMouseLeave={(e) => e.target.style.color = ''}>{link}</a></li>
              )}
              </ul>
            </div>
          )}
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-10 flex flex-col md:flex-row justify-between items-center gap-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">© {new Date().getFullYear()} RoosterAI. Alle rechten voorbehouden.</p>
        </div>
      </footer>
    </div>);

}