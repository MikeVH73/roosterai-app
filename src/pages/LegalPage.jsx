import React from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';

export default function LegalPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('doc') || 'privacy';

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['legal-documents'],
    queryFn: () => base44.entities.LegalDocument.filter({ published: true }),
  });

  const currentDoc = documents.find(d => d.slug === slug);
  const tabs = [
    { slug: 'privacy', label: 'Privacybeleid' },
    { slug: 'voorwaarden', label: 'Algemene Voorwaarden' },
    { slug: 'cookiebeleid', label: 'Cookiebeleid' },
  ];

  return (
    <div className="font-sans min-h-screen" style={{ fontFamily: "'Public Sans', sans-serif", background: '#1a0b16' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;900&display=swap');`}</style>

      {/* Header */}
      <header style={{ background: 'rgba(26,11,22,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between" style={{ height: '80px' }}>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold">
              <ArrowLeft size={16} />
              Terug
            </button>
            <h2 className="text-white text-2xl font-black tracking-tight italic uppercase cursor-pointer" onClick={() => navigate('/')}>RoosterAI</h2>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-10">
          {tabs.map(tab => (
            <button
              key={tab.slug}
              onClick={() => navigate(`/legal?doc=${tab.slug}`)}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
              style={{
                background: slug === tab.slug ? 'rgba(57,255,20,0.15)' : 'rgba(255,255,255,0.05)',
                color: slug === tab.slug ? '#39FF14' : '#94a3b8',
                border: `1px solid ${slug === tab.slug ? 'rgba(57,255,20,0.3)' : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#39FF14' }} />
          </div>
        ) : currentDoc ? (
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 rounded-xl" style={{ background: 'rgba(57,255,20,0.1)' }}>
                <FileText size={24} style={{ color: '#39FF14' }} />
              </div>
              <div>
                <h1 className="text-white text-3xl font-black">{currentDoc.title}</h1>
                <p className="text-slate-500 text-sm mt-1">
                  Versie {currentDoc.version || '1.0'} — Laatst bijgewerkt: {new Date(currentDoc.updated_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="rounded-2xl p-8 md:p-12" style={{ background: '#120a10', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="prose prose-invert prose-lg max-w-none
                prose-headings:text-white prose-headings:font-bold
                prose-p:text-slate-300 prose-p:leading-relaxed
                prose-li:text-slate-300
                prose-strong:text-white
                prose-a:text-[#39FF14] prose-a:no-underline hover:prose-a:underline
              ">
                <ReactMarkdown>{currentDoc.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-32">
            <FileText size={48} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.1)' }} />
            <h2 className="text-white text-xl font-bold mb-2">Document niet gevonden</h2>
            <p className="text-slate-400">Dit document is nog niet beschikbaar. Neem contact met ons op voor meer informatie.</p>
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '24px 0' }}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">© {new Date().getFullYear()} RoosterAI</p>
          <div className="flex gap-6 text-slate-500 text-xs font-bold">
            {tabs.map(tab => (
              <a key={tab.slug} href={`/legal?doc=${tab.slug}`} className="hover:text-white transition-colors">{tab.label}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}