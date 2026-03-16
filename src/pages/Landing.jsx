import React from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

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

  return (
    <div className="font-sans min-h-screen" style={{ fontFamily: "'Public Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;900&display=swap');
        .brand-accent { color: #39FF14; }
        .bg-brand-accent { background-color: #39FF14; }
        .bg-brand-deep { background-color: #1a0b16; }
        .bg-brand-muted { background-color: #361728; }
        .border-brand-accent { border-color: #39FF14; }
        .text-brand-deep { color: #1a0b16; }
        .neon-ping { animation: ping 1s cubic-bezier(0,0,0.2,1) infinite; }
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        .feature-card:hover { background: rgba(54, 23, 40, 0.5) !important; }
        .hover-gap:hover { gap: 1.25rem; }
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
              <a href="#pricing" className="text-slate-400 font-bold text-sm uppercase tracking-wider" style={{ transition: 'color 0.2s' }}
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
                  <button
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'white', height: '56px', padding: '0 40px', borderRadius: '12px', fontWeight: 700, fontSize: '18px', border: '1px solid rgba(255,255,255,0.1)', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
                    Bekijk Demo
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

        {/* Content Sections */}
        <div className="max-w-7xl mx-auto px-6 py-24 space-y-32" style={{ background: '#f8f6f6' }}>

          {/* Features */}
          <section id="features">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
              <div>
                <h2 className="bg-gray-700 text-lime-400 pl-6 text-4xl font-extrabold opacity-100" style={{ borderLeft: '4px solid #39FF14' }}>Krachtige Features</h2>
                <p className="text-gray-950 mt-4 max-w-xl">Ontdek hoe onze AI-gedreven tools uw workflow transformeren en uw team versterken.</p>
              </div>
              <button className="font-bold flex items-center gap-2" style={{ color: '#39FF14', transition: 'gap 0.2s' }}>
                Alle Features →
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
              { icon: '✦', title: 'AI-gestuurde Planning', desc: 'Laat onze algoritmes de perfecte match vinden tussen beschikbaarheid, vaardigheden en werkdruk voor een optimaal rooster.' },
              { icon: '👥', title: 'Medewerkersbeheer', desc: 'Een centraal dashboard voor alle contracten, verlofaanvragen en kwalificaties van je team, altijd up-to-date.' },
              { icon: '📊', title: 'Realtime Inzicht', desc: 'Directe, diepgaande rapportages over arbeidskosten, productiviteit en budgetoverschrijdingen in één oogopslag.' }].
              map((f, i) =>
              <div key={i} className="feature-card h-full flex flex-col gap-6 p-8 rounded-3xl transition-all"
              style={{ background: '#1a0b16', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center justify-center rounded-2xl text-3xl" style={{ width: '56px', height: '56px', background: 'rgba(57,255,20,0.1)', color: '#39FF14' }}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-white text-2xl font-bold mb-3">{f.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Product Preview */}
          <section className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="bg-cyan-900 text-slate-950 text-4xl font-black leading-tight">
                Ontworpen voor <span style={{ color: '#39FF14' }}>gebruiksgemak</span>
              </h2>
              <p className="text-gray-950 text-lg leading-relaxed">Geen complexe handleidingen nodig. Onze interface is intuïtief en reageert direct op veranderingen. Beheer uw team vanaf elk apparaat met hetzelfde gemak.

              </p>
              <ul className="space-y-4 pt-4">
                {[
                'Deel medewerkers in op voorkeurslocatie en back-up locatie',
                'Geautomatiseerde meldingen via WhatsApp',
                'Laat de AI Assistent het rooster voor volgende week maken'].
                map((item, i) =>
                <li key={i} className="flex items-center gap-3 font-medium text-slate-900">
                    <span style={{ color: '#39FF14', fontSize: '20px' }}>✓</span> {item}
                  </li>
                )}
              </ul>
            </div>

            {/* Demo Card */}
            <div className="rounded-3xl p-10 border relative" style={{ background: 'linear-gradient(135deg, #361728 0%, #1a0b16 100%)', borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
              <div className="absolute -top-4 -right-4 px-4 py-2 rounded-xl font-black text-sm italic shadow-xl" style={{ background: '#39FF14', color: '#1a0b16' }}>
                LIVE DEMO
              </div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="text-white text-2xl font-bold">Weekoverzicht</h4>
                  <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: '#39FF14' }}>Systeem Status: Optimaal</p>
                </div>
                <span style={{ color: '#39FF14', fontSize: '36px' }}>📅</span>
              </div>

              <div className="space-y-4">
                {[
                { name: 'Mark de Vries', shift: 'Ochtenddienst • 08:00 - 16:00', label: 'BEVESTIGD', labelBg: 'rgba(57,255,20,0.2)', labelColor: '#39FF14',
                  img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD2ELlfG6kOC7eP5drp0jTg23-5cVILJjV79otvr337bbz7ETb2OTLYtTCAHLMg87DnTPBcH5X1pQfnZNd4ITOzz89BAmQ-S_uqASccKK4Of3B7pejuk1a1-j8KE61LDayfU3n9BIb_AfojSZgNIborBsR1j2ehqKYk-fyprAjB6j6RhMFg9JACbKy7UCoTAkSHPAi50mU_5WG4UTED_mVZNJO0i7CP0uS3-phIzKoKLW_-lWWhdvLWEjZJZ6cIns8Sih5hRROa69s' },
                { name: 'Sophie Jansen', shift: 'Avonddienst • 16:00 - 00:00', label: 'NIEUW', labelBg: '#39FF14', labelColor: '#1a0b16',
                  img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDVWj_OJJzs2uLGVKV8dNUN686zSeacscZvio6_fEtz1JxQIXl8cuhJZ-QDAqqFQVPiZfhQNGQSimKmPGIM7OJLRcEQo9Pngc4EszjD69OILRD9X-1jp0FzZ74DkPUSMYNlq2vTWW70jazzhCjt3-VRbFTm8XtwdTaveBgch_fXsSSYODNXTv2qqRraO1tYxjk4yYfJpkG7xkdvdhaV0zkSJJaP3xfc7rFXld90Vw2N8d-LRhrUe7wh0bV0ThY7sNFxYal2t-YcCK0' }].
                map((emp, i) =>
                <div key={i} className="flex items-center gap-6 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="rounded-full overflow-hidden flex-shrink-0" style={{ width: '56px', height: '56px', ring: '2px solid rgba(57,255,20,0.2)' }}>
                      <img src={emp.img} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-lg font-bold">{emp.name}</p>
                      <p className="text-slate-400 italic text-sm">{emp.shift}</p>
                    </div>
                    <div className="px-4 py-2 rounded-lg" style={{ background: emp.labelBg }}>
                      <span className="text-xs font-black italic tracking-widest" style={{ color: emp.labelColor }}>{emp.label}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-10 pt-8 flex justify-center" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button onClick={handleLogin} className="font-bold flex items-center gap-3" style={{ color: '#39FF14', transition: 'gap 0.2s' }}>
                  Open Volledig Rooster Dashboard →
                </button>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section>
            <div className="rounded-3xl p-12 md:p-20 text-center relative overflow-hidden" style={{ background: '#39FF14', color: '#1a0b16' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '256px', height: '256px', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', marginRight: '-128px', marginTop: '-128px', filter: 'blur(40px)' }}></div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '256px', height: '256px', background: 'rgba(26,11,22,0.1)', borderRadius: '9999px', marginLeft: '-128px', marginBottom: '-128px', filter: 'blur(40px)' }}></div>
              <div className="relative max-w-3xl mx-auto space-y-8">
                <h2 className="font-black tracking-tight leading-none" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#1a0b16' }}>Klaar voor de toekomst?</h2>
                <p className="text-xl md:text-2xl font-bold max-w-2xl mx-auto" style={{ opacity: 0.8, color: '#1a0b16' }}>
                  Sluit je aan bij 500+ bedrijven die hun planning al hebben geoptimaliseerd met RoosterAI.
                </p>
                <div className="flex flex-col items-center gap-6 pt-4">
                  <button onClick={handleLogin}
                  style={{ background: '#1a0b16', color: 'white', padding: '20px 48px', borderRadius: '16px', fontWeight: 900, fontSize: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.4)', transition: 'transform 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    Start 14 Dagen Gratis Proef
                  </button>
                  <p className="text-sm font-bold italic" style={{ opacity: 0.6, color: '#1a0b16' }}>Geen creditcard nodig • In 5 minuten opgezet • Directe resultaten</p>
                </div>
              </div>
            </div>
          </section>
        </div>
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
          { title: 'Legal', links: ['Privacy', 'Voorwaarden', 'Cookiebeleid'] }].
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