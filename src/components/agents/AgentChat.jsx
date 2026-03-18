import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/components/providers/CompanyProvider';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Plus, MessageCircle, Trash2 } from 'lucide-react';
import MessageBubble from './MessageBubble';

export default function AgentChat({ agentName = 'planning_assistent' }) {
  const { currentCompany, user } = useCompany();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!currentConversation) return;

    const unsubscribe = base44.agents.subscribeToConversation(currentConversation.id, (data) => {
      setMessages(data.messages || []);
    });

    return () => {
      unsubscribe();
    };
  }, [currentConversation]);

  const loadConversations = async () => {
    try {
      const convos = await base44.agents.listConversations({ agent_name: agentName });
      setConversations(convos || []);
      
      // Auto-select the most recent conversation
      if (convos && convos.length > 0) {
        const mostRecent = convos[0];
        await loadConversation(mostRecent.id);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadConversation = async (conversationId) => {
    try {
      const conversation = await base44.agents.getConversation(conversationId);
      setCurrentConversation(conversation);
      setMessages(conversation.messages || []);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const buildContextMessage = async () => {
    let employeeInfo = 'Onbekend';
    let employeeId = '';
    try {
      const profiles = await base44.entities.EmployeeProfile.filter({ companyId: currentCompany?.id, email: user?.email });
      if (profiles && profiles.length > 0) {
        const p = profiles[0];
        employeeInfo = `${p.first_name} ${p.last_name}`;
        employeeId = p.id;
      }
    } catch {}

    // Calculate current date and week info
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const dayNames = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
    const currentDay = dayNames[now.getDay()];
    
    // Calculate ISO week number
    const tempDate = new Date(now.getTime());
    tempDate.setHours(0, 0, 0, 0);
    tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
    const week1 = new Date(tempDate.getFullYear(), 0, 4);
    const weekNumber = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);

    // Calculate next week's date range (Monday to Sunday)
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const daysUntilNextMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilNextMonday);
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    const nextWeekStart = nextMonday.toISOString().split('T')[0];
    const nextWeekEnd = nextSunday.toISOString().split('T')[0];

    // This week range
    const thisMonday = new Date(now);
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    thisMonday.setDate(now.getDate() + diffToMonday);
    const thisSunday = new Date(thisMonday);
    thisSunday.setDate(thisMonday.getDate() + 6);
    const thisWeekStart = thisMonday.toISOString().split('T')[0];
    const thisWeekEnd = thisSunday.toISOString().split('T')[0];

    return `[SYSTEEMCONTEXT - GEBRUIK DEZE INFO DIRECT, VRAAG NOOIT OPNIEUW]
Bedrijf: ${currentCompany?.name || 'Onbekend'} (companyId: ${currentCompany?.id || 'Onbekend'})
Ingelogde gebruiker: ${user?.full_name || user?.email || 'Onbekend'} (email: ${user?.email || ''})
Medewerker: ${employeeInfo} (employeeId: ${employeeId})

DATUM CONTEXT (BELANGRIJK):
- Vandaag is: ${currentDay} ${currentDate}
- Huidige week: week ${weekNumber}
- Deze week: ${thisWeekStart} t/m ${thisWeekEnd}
- Volgende week (week ${weekNumber + 1}): ${nextWeekStart} t/m ${nextWeekEnd}

INSTRUCTIES:
- Gebruik companyId "${currentCompany?.id}" bij ALLE database queries.
- De gebruiker heet "${user?.full_name || employeeInfo}". VRAAG NOOIT naar hun naam of bedrijf.
- Als de gebruiker vraagt over "mijn" diensten/rooster, filter op employeeId "${employeeId}".
- Begroet de gebruiker bij naam en beantwoord direct hun vraag.
- DATUM FILTERING: Als de gebruiker vraagt over "volgende week", zoek shifts met date TUSSEN ${nextWeekStart} EN ${nextWeekEnd}. Gebruik GEEN scheduleId filter - zoek ALLE shifts voor de companyId en filter op datum. Haal ruim voldoende resultaten op.
- Zoek altijd in ALLE roosters/schedules van het bedrijf, niet alleen in één specifiek rooster.`;
  };

  const createNewConversation = async () => {
    if (creatingConversation) return;
    setCreatingConversation(true);
    try {
      const conversationTitle = `Nieuw gesprek`;
      const contextMessage = await buildContextMessage();

      const conversation = await base44.agents.createConversation({
        agent_name: agentName,
        metadata: {
          name: conversationTitle,
          description: 'Planning assistent gesprek'
        }
      });

      // Inject context as a hidden system message
      await base44.agents.addMessage(conversation, {
        role: 'system',
        content: contextMessage
      });
      setCurrentConversation(conversation);
      setMessages([]);
      setConversations(prev => [conversation, ...prev]);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setCreatingConversation(false);
    }
  };

  const deleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    try {
      await base44.agents.updateConversation(conversationId, {
        metadata: { name: '__deleted__', deleted: true }
      });
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      // Still remove from UI even if API fails
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentConversation || loading) return;

    const userMessage = inputMessage.trim();
    const isFirstMessage = messages.filter(m => m.role !== 'system').length === 0;
    
    setInputMessage('');
    setLoading(true);

    try {
      // If first real message, inject context first
      if (isFirstMessage) {
        const contextMessage = await buildContextMessage();
        await base44.agents.addMessage(currentConversation, {
          role: 'system',
          content: contextMessage
        });
      }

      await base44.agents.addMessage(currentConversation, {
        role: 'user',
        content: userMessage
      });

      // Update conversation title with first message summary
      if (isFirstMessage) {
        const shortTitle = userMessage.length > 50 
          ? userMessage.substring(0, 50) + '...' 
          : userMessage;
        
        try {
          await base44.agents.updateConversation(currentConversation.id, {
            metadata: {
              name: shortTitle,
              description: 'Planning assistent gesprek'
            }
          });
          
          // Update local state
          setConversations(prev => prev.map(c => 
            c.id === currentConversation.id 
              ? { ...c, metadata: { ...c.metadata, name: shortTitle } }
              : c
          ));
          setCurrentConversation(prev => ({
            ...prev,
            metadata: { ...prev.metadata, name: shortTitle }
          }));
        } catch (error) {
          console.error('Failed to update conversation title:', error);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setInputMessage(userMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingConversations) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  if (!currentConversation) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <MessageCircle className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Geen actief gesprek</h3>
        <p className="text-slate-600 mb-6">Start een nieuw gesprek met de Planning Assistent</p>
        <Button onClick={createNewConversation} disabled={creatingConversation} className="bg-blue-600 hover:bg-blue-700">
          {creatingConversation ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Nieuw gesprek starten
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] rounded-lg border" style={{ 
      backgroundColor: 'var(--color-surface)',
      borderColor: 'var(--color-border)'
    }}>
      {/* Conversations Sidebar */}
      <div className="w-64 border-r flex flex-col" style={{ borderColor: 'var(--color-border)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Button 
            onClick={createNewConversation}
            disabled={creatingConversation}
            style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)', color: 'white' }}
            size="sm"
            className="w-full"
          >
            {creatingConversation ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Nieuw gesprek
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((convo) => (
            <div
              key={convo.id}
              onClick={() => loadConversation(convo.id)}
              className={`group w-full text-left p-3 rounded-lg mb-2 transition-colors cursor-pointer relative ${
                currentConversation?.id === convo.id
                  ? 'border border-blue-400'
                  : 'border border-transparent'
              }`}
              style={currentConversation?.id === convo.id ? {
                backgroundColor: 'var(--color-surface-light)'
              } : {}}
              onMouseEnter={(e) => {
                if (currentConversation?.id !== convo.id) {
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-light)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentConversation?.id !== convo.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="text-sm font-medium truncate flex-1" style={{ color: 'var(--color-text-primary)' }}>
                  {convo.metadata?.name || 'Gesprek'}
                </p>
                <button
                  onClick={(e) => deleteConversation(convo.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100"
                  title="Verwijder gesprek"
                >
                  <Trash2 className="w-3 h-3" style={{ color: '#ef4444' }} />
                </button>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {new Date(convo.created_date).toLocaleDateString('nl-NL', { 
                  day: 'numeric', 
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Europe/Amsterdam'
                })}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-primary) 100%)' }}>
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Planning Assistent</h3>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Stel vragen over roosters en diensten</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.filter(m => m.role !== 'system').length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-600">Start het gesprek met een vraag</p>
            <p className="text-sm text-slate-500 mt-2">
              Bijvoorbeeld: "Wie werken er volgende week op locatie 't Dok?"
            </p>
          </div>
        ) : (
          messages.filter(m => m.role !== 'system').map((message, idx) => (
            <MessageBubble key={idx} message={message} />
          ))
        )}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5">
              <p className="text-sm text-slate-600">Agent denkt na...</p>
            </div>
          </div>
        )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Stel een vraag over roosters, diensten of medewerkers..."
            disabled={loading}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!inputMessage.trim() || loading}
            style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)', color: 'white' }}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        </form>
      </div>
    </div>
  );
}