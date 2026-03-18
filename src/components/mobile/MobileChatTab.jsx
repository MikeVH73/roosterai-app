import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/components/providers/CompanyProvider';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Plus, MessageCircle, Trash2, ChevronLeft, Bot } from 'lucide-react';
import MessageBubble from '@/components/agents/MessageBubble';

export default function MobileChatTab({ agentName = 'planning_assistent' }) {
  const { currentCompany, user } = useCompany();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [showList, setShowList] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    if (!currentConversation) return;
    const unsubscribe = base44.agents.subscribeToConversation(currentConversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [currentConversation]);

  const loadConversations = async () => {
    try {
      const allConvos = await base44.agents.listConversations({ agent_name: agentName });
      // Only show conversations created from this mobile app (have our metadata marker)
      const convos = (allConvos || []).filter(c => !c.metadata?.deleted && c.metadata?.source === 'mobile_app');
      setConversations(convos);
      if (convos.length > 0) {
        await loadConversation(convos[0].id);
        setShowList(false);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadConversation = async (conversationId) => {
    const conversation = await base44.agents.getConversation(conversationId);
    setCurrentConversation(conversation);
    setMessages(conversation.messages || []);
    setShowList(false);
  };

  const buildContextMessage = async () => {
    let employeeInfo = 'Onbekend';
    let employeeId = '';
    try {
      const profiles = await base44.entities.EmployeeProfile.filter({ companyId: currentCompany?.id, email: user?.email });
      if (profiles?.length > 0) {
        employeeInfo = `${profiles[0].first_name} ${profiles[0].last_name}`;
        employeeId = profiles[0].id;
      }
    } catch {}

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const dayNames = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'];
    const tempD = new Date(now.getTime());
    tempD.setHours(0,0,0,0);
    tempD.setDate(tempD.getDate() + 3 - (tempD.getDay() + 6) % 7);
    const w1 = new Date(tempD.getFullYear(), 0, 4);
    const weekNumber = 1 + Math.round(((tempD.getTime() - w1.getTime()) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
    const dow = now.getDay();
    const diffMon = dow === 0 ? -6 : 1 - dow;
    const thisMon = new Date(now); thisMon.setDate(now.getDate() + diffMon);
    const thisSun = new Date(thisMon); thisSun.setDate(thisMon.getDate() + 6);
    const nextMon = new Date(now); nextMon.setDate(now.getDate() + (dow === 0 ? 1 : 8 - dow));
    const nextSun = new Date(nextMon); nextSun.setDate(nextMon.getDate() + 6);

    return `[SYSTEEMCONTEXT - GEBRUIK DEZE INFO DIRECT, VRAAG NOOIT OPNIEUW]
Bedrijf: ${currentCompany?.name || 'Onbekend'} (companyId: ${currentCompany?.id || 'Onbekend'})
Ingelogde gebruiker: ${user?.full_name || user?.email || 'Onbekend'} (email: ${user?.email || ''})
Medewerker: ${employeeInfo} (employeeId: ${employeeId})

DATUM CONTEXT (BELANGRIJK):
- Vandaag is: ${dayNames[dow]} ${currentDate}
- Huidige week: week ${weekNumber}
- Deze week: ${thisMon.toISOString().split('T')[0]} t/m ${thisSun.toISOString().split('T')[0]}
- Volgende week (week ${weekNumber + 1}): ${nextMon.toISOString().split('T')[0]} t/m ${nextSun.toISOString().split('T')[0]}

INSTRUCTIES:
- Gebruik companyId "${currentCompany?.id}" bij ALLE database queries.
- De gebruiker heet "${user?.full_name || employeeInfo}". VRAAG NOOIT naar hun naam of bedrijf.
- Als de gebruiker vraagt over "mijn" diensten/rooster, filter op employeeId "${employeeId}".
- Begroet de gebruiker bij naam en beantwoord direct hun vraag.
- DATUM FILTERING: Als de gebruiker vraagt over "volgende week", zoek shifts met date TUSSEN ${nextMon.toISOString().split('T')[0]} EN ${nextSun.toISOString().split('T')[0]}. Gebruik GEEN scheduleId filter - zoek ALLE shifts voor de companyId en filter op datum. Haal ruim voldoende resultaten op.
- Zoek altijd in ALLE roosters/schedules van het bedrijf, niet alleen in één specifiek rooster.`;
  };

  const createNewConversation = async () => {
    if (creatingConversation) return;
    setCreatingConversation(true);
    try {
      const conv = await base44.agents.createConversation({
        agent_name: agentName,
        metadata: { name: 'Nieuw gesprek', description: 'Planning assistent', source: 'mobile_app' }
      });
      setCurrentConversation(conv);
      setMessages([]);
      setConversations(prev => [conv, ...prev]);
      setShowList(false);
    } catch (error) {
      console.error(error);
    } finally {
      setCreatingConversation(false);
    }
  };

  const deleteConversation = async (id, e) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConversation?.id === id) { setCurrentConversation(null); setMessages([]); setShowList(true); }
    try {
      if (typeof base44.agents.updateConversation === 'function') {
        await base44.agents.updateConversation(id, { metadata: { deleted: true } });
      }
    } catch {}
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentConversation || loading) return;
    const msg = inputMessage.trim();
    const isFirst = messages.filter(m => m.role !== 'system').length === 0;
    setInputMessage('');
    setLoading(true);
    try {
      let fullMsg = msg;
      if (isFirst) {
        const ctx = await buildContextMessage();
        fullMsg = `[CONTEXT_START]${ctx}[CONTEXT_END]\n\n${msg}`;
      }
      await base44.agents.addMessage(currentConversation, { role: 'user', content: fullMsg });
      if (isFirst) {
        const title = msg.length > 40 ? msg.substring(0, 40) + '...' : msg;
        setConversations(prev => prev.map(c => c.id === currentConversation.id ? { ...c, metadata: { ...c.metadata, name: title } } : c));
      }
    } catch (error) {
      setInputMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingConversations) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  // Conversation list view
  if (showList || !currentConversation) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Gesprekken</h2>
          <Button size="sm" onClick={createNewConversation} disabled={creatingConversation}
            style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))', color: 'white' }}>
            {creatingConversation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Nieuw
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-8">
              <Bot className="w-12 h-12 mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
              <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Geen gesprekken</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Start een nieuw gesprek met de assistent</p>
            </div>
          ) : (
            conversations.map(conv => (
              <div key={conv.id} onClick={() => loadConversation(conv.id)}
                className="flex items-center gap-3 px-4 py-3 active:bg-opacity-80 cursor-pointer"
                style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--color-accent), #6366f1)' }}>
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {conv.metadata?.name || 'Gesprek'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(conv.created_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button onClick={(e) => deleteConversation(conv.id, e)} className="p-2 rounded-lg"
                  style={{ color: 'var(--color-text-muted)' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Chat view
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={() => setShowList(true)} className="p-1">
          <ChevronLeft className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, var(--color-accent), #6366f1)' }}>
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            Planning Assistent
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.filter(m => m.role !== 'system').length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-10 h-10 mb-2 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Stel een vraag over je rooster</p>
          </div>
        ) : (
          messages.filter(m => m.role !== 'system').map((msg, idx) => {
            // Hide context block from user messages
            const displayMsg = msg.role === 'user' && msg.content?.includes('[CONTEXT_START]')
              ? { ...msg, content: msg.content.replace(/\[CONTEXT_START\][\s\S]*?\[CONTEXT_END\]\s*/, '') }
              : msg;
            return <MessageBubble key={idx} message={displayMsg} />;
          })
        )}
        {loading && (
          <div className="flex items-start gap-2">
            <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-light)' }}>
              <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <div className="rounded-2xl px-3 py-2 text-xs" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
              Denkt na...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="px-4 py-3 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
        <Input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Stel een vraag..."
          disabled={loading}
          className="flex-1 text-sm"
        />
        <Button type="submit" size="icon" disabled={!inputMessage.trim() || loading}
          style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))', color: 'white' }}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}